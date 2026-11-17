// Integration tests: the real services against a real (in-memory) Postgres.
// Each suite boots its own seeded PGlite instance, so tests never touch a
// developer's database and need no network or Docker.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { marketListings, marketTransactions, stateTreasury, userWallets } from "../schema";
import { creditTreasury, debitWallet, InsufficientFundsError } from "../money";
import { WalletService } from "../services/economy/wallet.service";
import { MarketService } from "../services/economy/market.service";

let handle: MockDbHandle;
let wallets: WalletService;
let market: MarketService;

const balanceOf = async (userId: string) =>
	(await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]?.balance;

beforeAll(async () => {
	handle = await createMockDb();
	wallets = new WalletService(handle.db);
	market = new MarketService(handle.db);
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("mock database", () => {
	it("is seeded with the demo world", async () => {
		const accounts = await handle.db.query.accounts.findMany();
		expect(accounts.map((a) => a.id)).toContain("user-1");
		expect(await balanceOf("user-1")).toBe(50000);
	});
});

describe("WalletService", () => {
	it("credits and debits atomically and reports the new balance", async () => {
		const start = (await balanceOf("user-2"))!;
		expect(await wallets.addFunds("user-2", 500)).toBe(start + 500);
		expect(await wallets.deductFunds("user-2", 200)).toBe(start + 300);
		expect(await balanceOf("user-2")).toBe(start + 300);
	});

	it("refuses to overdraw and leaves the balance untouched", async () => {
		const start = (await balanceOf("user-3"))!;
		await expect(wallets.deductFunds("user-3", start + 1)).rejects.toThrow("Insufficient funds");
		expect(await balanceOf("user-3")).toBe(start);
	});

	it("rejects zero, negative and fractional amounts", async () => {
		await expect(wallets.addFunds("user-3", 0)).rejects.toThrow("Invalid amount");
		await expect(wallets.addFunds("user-3", -5)).rejects.toThrow("Invalid amount");
		await expect(wallets.deductFunds("user-3", 1.5)).rejects.toThrow("Invalid amount");
	});

	it("never loses money when concurrent credits race", async () => {
		const start = (await balanceOf("user-4"))!;
		await Promise.all(Array.from({ length: 20 }, () => wallets.addFunds("user-4", 10)));
		expect(await balanceOf("user-4")).toBe(start + 200);
	});

	it("transfers both legs together", async () => {
		const [from, to] = [(await balanceOf("user-5"))!, (await balanceOf("user-1"))!];
		await wallets.transfer("user-5", "user-1", 1000);
		expect(await balanceOf("user-5")).toBe(from - 1000);
		expect(await balanceOf("user-1")).toBe(to + 1000);
	});

	it("rolls a failed transfer back completely", async () => {
		const [from, to] = [(await balanceOf("user-3"))!, (await balanceOf("user-1"))!];
		await expect(wallets.transfer("user-3", "user-1", from + 1)).rejects.toThrow("Insufficient funds");
		expect(await balanceOf("user-3")).toBe(from);
		expect(await balanceOf("user-1")).toBe(to);
	});

	it("creates a starter wallet on first use", async () => {
		await handle.db.delete(userWallets).where(eq(userWallets.userId, "user-2"));
		expect(await wallets.getBalance("user-2")).toBe(0);
		expect(await wallets.addFunds("user-2", 1)).toBe(10001);
	});
});

describe("MarketService.buyListing", () => {
	const ironListing = async () =>
		(await handle.db.select().from(marketListings).where(eq(marketListings.itemName, "iron")))[0];

	it("records the sale and reduces stock", async () => {
		const listing = (await ironListing())!;
		const tx = await market.buyListing(listing.id, "user-2", 5);
		expect(tx).toMatchObject({ buyerId: "user-2", sellerId: "user-1", quantity: 5, totalPrice: 5 * 12 });
		expect((await ironListing())!.quantity).toBe(listing.quantity - 5);
	});

	it("never sells more than is in stock", async () => {
		const listing = (await ironListing())!;
		await expect(market.buyListing(listing.id, "user-2", listing.quantity + 1)).rejects.toThrow(
			"Not enough stock left"
		);
		expect((await ironListing())!.quantity).toBe(listing.quantity);
	});

	it("does not let a seller buy their own listing", async () => {
		const listing = (await ironListing())!;
		await expect(market.buyListing(listing.id, "user-1", 1)).rejects.toThrow("Cannot buy your own listing");
		expect((await ironListing())!.quantity).toBe(listing.quantity);
	});

	it("rejects invalid quantities and unknown listings", async () => {
		await expect(market.buyListing(1, "user-2", 0)).rejects.toThrow("Invalid quantity");
		await expect(market.buyListing(999_999, "user-2", 1)).rejects.toThrow("Listing not found");
	});

	it("only one of two racing buyers gets the last units", async () => {
		const listing = (await ironListing())!;
		const results = await Promise.allSettled([
			market.buyListing(listing.id, "user-2", listing.quantity),
			market.buyListing(listing.id, "user-3", listing.quantity)
		]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect((await ironListing())!.quantity).toBe(0);
		expect(await market.getListings("resource", "iron")).toEqual([]); // sold out → hidden
	});

	it("keeps every sale recorded, including the one that sold it out", async () => {
		const sales = await handle.db.select().from(marketTransactions);
		expect(sales).toHaveLength(2);
	});
});

describe("money helpers", () => {
	it("debitWallet throws a typed error and changes nothing when short", async () => {
		const start = (await balanceOf("user-3"))!;
		await expect(debitWallet(handle.db, "user-3", start + 1)).rejects.toBeInstanceOf(InsufficientFundsError);
		expect(await balanceOf("user-3")).toBe(start);
	});

	it("debitWallet inside a failed transaction is rolled back", async () => {
		const start = (await balanceOf("user-5"))!;
		await expect(
			handle.db.transaction(async (tx) => {
				await debitWallet(tx, "user-5", 100);
				throw new Error("later step failed");
			})
		).rejects.toThrow("later step failed");
		expect(await balanceOf("user-5")).toBe(start);
	});

	it("creditTreasury creates a missing treasury and adds to an existing one", async () => {
		const state = (await handle.db.query.states.findFirst())!;
		await handle.db.delete(stateTreasury).where(eq(stateTreasury.stateId, state.id));
		expect(await creditTreasury(handle.db, state.id, 250)).toBe(250);
		expect(await creditTreasury(handle.db, state.id, 50)).toBe(300);
		const [row] = await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, state.id));
		expect(row!.totalCollected).toBe(300);
	});
});
