// A governor trades raw materials on the player market for their region:
// buying pays from the regional budget into the regional stockpile, selling
// lists stockpile units whose proceeds go to the budget.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@rstest/core";
import { and, desc, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	governors,
	marketListings,
	regionBudgetLedger,
	regionBudgets,
	regionResourceInventory,
	userWallets
} from "../schema";
import { closeTrade, paySeller, takeListingStock } from "../services/economy/market-trade";
import {
	RegionalMarketError,
	buyListingForRegion,
	governedRegions,
	listForRegion,
	regionTradeDesk,
	withdrawRegionListing
} from "../services/politics/regional-market";
import { regionStockpile } from "../services/politics/regional-stockpile";

let handle: MockDbHandle;
let regionId: number;
const governorId = "user-2";
const sellerId = "user-1";

const setBudget = (balance: number) =>
	handle.db
		.insert(regionBudgets)
		.values({ regionId, balance })
		.onConflictDoUpdate({ target: regionBudgets.regionId, set: { balance } });
const budget = async () =>
	(await handle.db.select().from(regionBudgets).where(eq(regionBudgets.regionId, regionId)))[0]!.balance;
const stock = async (resource: string) => (await regionStockpile(handle.db, regionId))[resource] ?? 0;
const wallet = async (userId: string) =>
	(await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]!.balance;
const lastLedger = async () =>
	(
		await handle.db
			.select()
			.from(regionBudgetLedger)
			.where(eq(regionBudgetLedger.regionId, regionId))
			.orderBy(desc(regionBudgetLedger.id))
			.limit(1)
	)[0]!;
const offer = async (quantity: number, pricePerUnit: number) =>
	(
		await handle.db
			.insert(marketListings)
			.values({ sellerId, itemType: "resource", itemName: "iron", quantity, pricePerUnit })
			.returning()
	)[0]!;

beforeAll(async () => {
	handle = await createMockDb();
	const [g] = await handle.db.select().from(governors).where(eq(governors.userId, governorId));
	regionId = g!.regionId;
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

beforeEach(async () => {
	await handle.db.delete(marketListings).where(eq(marketListings.itemName, "iron"));
	await handle.db
		.delete(regionResourceInventory)
		.where(and(eq(regionResourceInventory.regionId, regionId), eq(regionResourceInventory.resourceType, "iron")));
});

describe("buying for the region", () => {
	it("lists the regions a player governs", async () => {
		expect((await governedRegions(handle.db, governorId)).map((r) => r.id)).toContain(regionId);
		expect((await governedRegions(handle.db, "user-3")).map((r) => r.id)).not.toContain(regionId);
	});

	it("pays from the budget, fills the stockpile, pays the seller and writes the ledger", async () => {
		await setBudget(10_000);
		const listing = await offer(50, 40);
		const sellerBefore = await wallet(sellerId);
		const governorBefore = await wallet(governorId);

		const result = await buyListingForRegion(handle.db, {
			regionId,
			userId: governorId,
			listingId: listing.id,
			quantity: 30
		});

		expect(result.total).toBe(1_200);
		expect(await budget()).toBe(8_800);
		expect(await stock("iron")).toBe(30);
		expect(await wallet(sellerId)).toBe(sellerBefore + 1_200);
		expect(await wallet(governorId)).toBe(governorBefore);
		const [left] = await handle.db.select().from(marketListings).where(eq(marketListings.id, listing.id));
		expect(left!.quantity).toBe(20);
		const entry = await lastLedger();
		expect(entry.kind).toBe("market_buy");
		expect(entry.amount).toBe(-1_200);
		expect(entry.balanceAfter).toBe(8_800);
	});

	it("refuses when the budget can't cover it, and changes nothing", async () => {
		await setBudget(100);
		const listing = await offer(10, 40);
		await expect(
			buyListingForRegion(handle.db, { regionId, userId: governorId, listingId: listing.id, quantity: 5 })
		).rejects.toThrow(RegionalMarketError);
		expect(await budget()).toBe(100);
		expect(await stock("iron")).toBe(0);
		const [left] = await handle.db.select().from(marketListings).where(eq(marketListings.id, listing.id));
		expect(left!.quantity).toBe(10);
	});

	it("refuses anyone but the governor", async () => {
		await setBudget(10_000);
		const listing = await offer(10, 40);
		await expect(
			buyListingForRegion(handle.db, { regionId, userId: "user-3", listingId: listing.id, quantity: 1 })
		).rejects.toThrow(/governor/);
	});

	it("can't spend the same money twice on two concurrent buys", async () => {
		await setBudget(1_000);
		const listing = await offer(100, 40);
		const buy = () =>
			buyListingForRegion(handle.db, { regionId, userId: governorId, listingId: listing.id, quantity: 20 });
		const results = await Promise.allSettled([buy(), buy()]);
		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(await budget()).toBe(200);
		expect(await stock("iron")).toBe(20);
	});

	it("won't let the governor buy their own listing with the region's money", async () => {
		await setBudget(10_000);
		const [own] = await handle.db
			.insert(marketListings)
			.values({ sellerId: governorId, itemType: "resource", itemName: "iron", quantity: 5, pricePerUnit: 40 })
			.returning();
		await expect(
			buyListingForRegion(handle.db, { regionId, userId: governorId, listingId: own!.id, quantity: 1 })
		).rejects.toThrow(/your own listing/);
	});
});

describe("selling from the regional stockpile", () => {
	it("lists stockpile units, credits the budget on a sale and returns the rest on withdrawal", async () => {
		await setBudget(0);
		await handle.db.insert(regionResourceInventory).values({ regionId, resourceType: "iron", quantity: 50 });

		const { listingId } = await listForRegion(handle.db, {
			regionId,
			userId: governorId,
			resource: "iron",
			quantity: 30,
			pricePerUnit: 25
		});
		expect(await stock("iron")).toBe(20);
		const desk = await regionTradeDesk(handle.db, { id: regionId, name: "R" }, "iron", governorId);
		expect(desk.listing).toEqual({ id: listingId, quantity: 30, pricePerUnit: 25 });

		// A player buys 10 through the shared purchase steps.
		await handle.db.transaction(async (tx) => {
			const [listing] = await tx.select().from(marketListings).where(eq(marketListings.id, listingId));
			const { remaining } = await takeListingStock(tx, listingId, 10);
			await paySeller(tx, listing!, 10, 250, { userId: "user-3" });
			await closeTrade(tx, listing!, 10, remaining);
		});
		expect(await budget()).toBe(250);
		const entry = await lastLedger();
		expect(entry.kind).toBe("market_sale");
		expect(entry.amount).toBe(250);

		const back = await withdrawRegionListing(handle.db, { regionId, userId: governorId, listingId });
		expect(back.quantity).toBe(20);
		expect(await stock("iron")).toBe(40);
		await expect(withdrawRegionListing(handle.db, { regionId, userId: governorId, listingId })).rejects.toThrow(/gone/);
		expect(await stock("iron")).toBe(40);
	});

	it("refuses to list more than the stockpile holds", async () => {
		await handle.db.insert(regionResourceInventory).values({ regionId, resourceType: "iron", quantity: 5 });
		await expect(
			listForRegion(handle.db, { regionId, userId: governorId, resource: "iron", quantity: 6, pricePerUnit: 10 })
		).rejects.toThrow(/stockpile/);
		expect(await stock("iron")).toBe(5);
	});

	it("refuses a non-governor and anything that isn't a raw material", async () => {
		await handle.db.insert(regionResourceInventory).values({ regionId, resourceType: "iron", quantity: 5 });
		await expect(
			listForRegion(handle.db, { regionId, userId: "user-3", resource: "iron", quantity: 1, pricePerUnit: 10 })
		).rejects.toThrow(/governor/);
		await expect(
			listForRegion(handle.db, { regionId, userId: governorId, resource: "rifle", quantity: 1, pricePerUnit: 10 })
		).rejects.toThrow(/raw materials/);
	});
});
