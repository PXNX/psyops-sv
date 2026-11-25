// Shares trading on the market board against a real (in-memory) Postgres:
// quotes, buying from an order, posting an offer and withdrawing it.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq, isNotNull } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	companies,
	companyShares,
	regions,
	shareHoldings,
	shareListings,
	shareTransactions,
	userWallets
} from "../schema";
import { StockError, buyShares, cancelShareListing, listShares, stockBoard } from "../services/economy/stock-market";

let handle: MockDbHandle;
let companyId: number;
let firstListingId: number;

const wallet = async (userId: string) =>
	Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]?.balance ?? 0);
const holding = async (userId: string) =>
	(
		await handle.db
			.select()
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, userId)))
	)[0]?.quantity ?? 0;

beforeAll(async () => {
	handle = await createMockDb();
	const [company] = await handle.db.select().from(companies).where(eq(companies.name, "Freedonia Mining Corp"));
	companyId = company!.id;
	// listAt/listedAt default to now, so this company is already tradeable.
	await handle.db
		.insert(companyShares)
		.values({ companyId, totalShares: 1000, founderLockedShares: 510, ipoPrice: 50 });
	await handle.db.insert(shareHoldings).values([
		{ companyId, userId: "user-1", quantity: 600 },
		{ companyId, userId: "user-2", quantity: 300 }
	]);
	const [listing] = await handle.db
		.insert(shareListings)
		.values({ companyId, sellerId: "user-1", quantity: 10, pricePerUnit: 60 })
		.returning();
	firstListingId = listing!.id;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("stock market", () => {
	it("shows each public company with its quote, best ask and the viewer's holding", async () => {
		const board = await stockBoard(handle.db, "user-2", { checkEmbargoes: async () => new Map() });
		const row = board.find((s) => s.companyId === companyId)!;
		expect(row.name).toBe("Freedonia Mining Corp");
		expect(row.ask).toBe(60);
		expect(row.bestAskId).toBe(firstListingId);
		expect(row.unitsOnOffer).toBe(10);
		expect(row.held).toBe(300);
		expect(row.embargoReason).toBeNull();
	});

	it("quotes only the cheapest offer and the units available at it", async () => {
		await handle.db.insert(shareListings).values({ companyId, sellerId: "user-1", quantity: 7, pricePerUnit: 80 });
		const board = await stockBoard(handle.db, "user-2", { checkEmbargoes: async () => new Map() });
		const row = board.find((s) => s.companyId === companyId)!;
		expect(row.ask).toBe(60);
		expect(row.unitsOnOffer).toBe(10);
		await handle.db
			.delete(shareListings)
			.where(and(eq(shareListings.companyId, companyId), eq(shareListings.pricePerUnit, 80)));
	});

	it("flags a company whose headquarters state is embargoed for the viewer", async () => {
		// Give the company a headquarters in a state so the embargo check has one.
		const [region] = await handle.db
			.select({ id: regions.id })
			.from(regions)
			.where(isNotNull(regions.stateId))
			.limit(1);
		await handle.db.update(companies).set({ regionId: region!.id }).where(eq(companies.id, companyId));

		const board = await stockBoard(handle.db, "user-2", {
			checkEmbargoes: async (stateIds) =>
				new Map(stateIds.filter((id): id is number => id !== null).map((id) => [id, "Embargoed"] as const))
		});
		const row = board.find((s) => s.companyId === companyId)!;
		expect(row.embargoReason).toBe("Embargoed");
	});

	it("refuses to buy shares when an embargo applies", async () => {
		const buyerBefore = await wallet("user-2");
		await expect(
			buyShares(handle.db, {
				userId: "user-2",
				listingId: firstListingId,
				quantity: 1,
				checkEmbargo: async () => "Trade is blocked by an embargo.",
				notify: async () => undefined
			})
		).rejects.toThrow(/embargo/);
		expect(await wallet("user-2")).toBe(buyerBefore);
	});

	it("moves cash and shares when buying, and records the trade", async () => {
		const buyerBefore = await wallet("user-2");
		const sellerBefore = await wallet("user-1");
		await buyShares(handle.db, {
			userId: "user-2",
			listingId: firstListingId,
			quantity: 4,
			checkEmbargo: async () => null,
			notify: async () => undefined
		});
		expect(await wallet("user-2")).toBe(buyerBefore - 240);
		expect(await wallet("user-1")).toBe(sellerBefore + 240);
		expect(await holding("user-2")).toBe(304);
		const [listing] = await handle.db.select().from(shareListings).where(eq(shareListings.id, firstListingId));
		expect(listing!.quantity).toBe(6);
		const trades = await handle.db.select().from(shareTransactions).where(eq(shareTransactions.companyId, companyId));
		expect(trades).toHaveLength(1);
		expect(trades[0]!.totalPrice).toBe(240);
	});

	it("rejects buying your own offer", async () => {
		await expect(
			buyShares(handle.db, {
				userId: "user-1",
				listingId: firstListingId,
				quantity: 1,
				checkEmbargo: async () => null,
				notify: async () => undefined
			})
		).rejects.toThrow(StockError);
	});

	it("lists and withdraws shares, and protects the founder's locked block", async () => {
		await expect(
			listShares(handle.db, { userId: "user-1", companyId, quantity: 100, pricePerUnit: 70 })
		).rejects.toThrow(/locked shares/);

		await listShares(handle.db, { userId: "user-2", companyId, quantity: 5, pricePerUnit: 70 });
		expect(await holding("user-2")).toBe(299);
		const [offer] = await handle.db
			.select()
			.from(shareListings)
			.where(and(eq(shareListings.sellerId, "user-2"), eq(shareListings.pricePerUnit, 70)));
		expect(offer!.quantity).toBe(5);

		await cancelShareListing(handle.db, { userId: "user-2", listingId: offer!.id });
		expect(await holding("user-2")).toBe(304);
	});
});
