// Arms market against the seeded mock world: Freedonia (Alice president, Bob)
// and Sylvania (Charlie president) sit in rival blocs; Borduria (Diana) has none.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	armsListings,
	armsSurplus,
	armsTrades,
	productInventory,
	stateSanctions,
	stateTreasury,
	states,
	userWallets
} from "../schema";
import { ARMAMENTS, wornCondition } from "#lib/config/index.js";
import {
	approveArms,
	armsBoard,
	armsHolding,
	buyArms,
	cancelArms,
	listArms,
	rejectArms,
	settleDeliveries
} from "../services/economy/armaments";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let borduria: number;
const HOUR = 3_600_000;

beforeAll(async () => {
	handle = await createMockDb();
	const rows = await handle.db.select({ id: states.id, name: states.name }).from(states);
	const id = (n: string) => rows.find((s) => s.name === n)!.id;
	freedonia = id("Republic of Freedonia");
	sylvania = id("Empire of Sylvania");
	borduria = id("Kingdom of Borduria");
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

const wallet = async (userId: string) =>
	Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, userId)))[0]?.balance ?? 0);
const stock = async (userId: string, good: string) =>
	(
		await handle.db
			.select()
			.from(productInventory)
			.where(and(eq(productInventory.userId, userId), eq(productInventory.productType, good as never)))
	)[0]?.quantity ?? 0;
const treasury = async (stateId: number) =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]?.balance ?? 0);
const listingOf = async (sellerId: string, good: string) =>
	(
		await handle.db
			.select()
			.from(armsListings)
			.where(and(eq(armsListings.sellerId, sellerId), eq(armsListings.good, good)))
	)[0]!;

describe("arms market", () => {
	it("ships a domestic purchase and books it as second-hand on arrival", async () => {
		const offer = await listingOf("user-2", "rifles");
		const now = new Date();
		const [aliceBefore, bobBefore, rifles] = await Promise.all([
			wallet("user-1"),
			wallet("user-2"),
			stock("user-1", "rifles")
		]);
		const res = await buyArms(handle.db, { userId: "user-1", listingId: offer.id, quantity: 10, now });
		expect(res.route).toBe("domestic");
		expect(res.tax).toBe(0);
		expect(res.hours).toBe(ARMAMENTS.DELIVERY_HOURS.domestic + 1);
		expect(await wallet("user-1")).toBe(aliceBefore - 10 * offer.pricePerUnit);
		expect(await wallet("user-2")).toBe(bobBefore + 10 * offer.pricePerUnit);

		// Still on the road.
		expect(await settleDeliveries(handle.db, "user-1", new Date(now.getTime() + HOUR / 2))).toBe(0);
		expect(await stock("user-1", "rifles")).toBe(rifles);
		// Landed.
		expect(await settleDeliveries(handle.db, "user-1", new Date(now.getTime() + 3 * HOUR))).toBeGreaterThanOrEqual(1);
		expect(await stock("user-1", "rifles")).toBe(rifles + 10);
		const holding = await armsHolding(handle.db, "user-1", "rifles");
		expect(holding.used).toBe(130);
		expect(holding.usedCondition).toBeLessThan(wornCondition(100) + 1);
	});

	it("keeps foreign buyers away from offers without a licence for their state", async () => {
		const open = await listingOf("user-4", "explosives");
		await expect(buyArms(handle.db, { userId: "user-1", listingId: open.id, quantity: 1 })).rejects.toThrow(/licensed/);
	});

	it("takes the export levy for a licensed foreign sale out of the seller's proceeds", async () => {
		const offer = await listingOf("user-3", "vehicles");
		const [charlie, treasuryBefore] = await Promise.all([wallet("user-3"), treasury(sylvania)]);
		const res = await buyArms(handle.db, { userId: "user-1", listingId: offer.id, quantity: 1 });
		const total = offer.pricePerUnit;
		expect(res.route).toBe("foreign");
		expect(res.tax).toBe(Math.floor((total * ARMAMENTS.EXPORT_TAX_PERCENT) / 100));
		expect(await wallet("user-3")).toBe(charlie + total - res.tax);
		expect(await treasury(sylvania)).toBe(treasuryBefore + res.tax);
		const [trade] = await handle.db.select().from(armsTrades).where(eq(armsTrades.id, res.tradeId));
		expect(trade!.arrivesAt.getTime()).toBeGreaterThan(Date.now() + 9 * HOUR);
	});

	it("needs the licence before a foreign sale and lets only the target state buy", async () => {
		const pending = (
			await handle.db
				.select()
				.from(armsListings)
				.where(and(eq(armsListings.sellerId, "user-2"), eq(armsListings.targetStateId, borduria)))
		)[0]!;
		await expect(buyArms(handle.db, { userId: "user-4", listingId: pending.id, quantity: 1 })).rejects.toThrow(
			/licence/
		);
		await expect(approveArms(handle.db, "user-2", pending.id)).rejects.toThrow(/defence minister or president/);
		await approveArms(handle.db, "user-1", pending.id);
		await expect(buyArms(handle.db, { userId: "user-3", listingId: pending.id, quantity: 1 })).rejects.toThrow(
			/reserved/
		);
		const res = await buyArms(handle.db, { userId: "user-4", listingId: pending.id, quantity: 1 });
		expect(res.route).toBe("foreign");
		await expect(cancelArms(handle.db, "user-2", pending.id)).rejects.toThrow(/export licence/);
	});

	it("blocks listings, licences and purchases across sanctions", async () => {
		await handle.db.insert(stateSanctions).values({
			sanctioningStateId: freedonia,
			targetStateId: borduria,
			sanctionedBy: "user-1",
			reason: "test"
		});
		await expect(
			listArms(handle.db, { userId: "user-1", good: "rifles", quantity: 5, pricePerUnit: 100, targetStateId: borduria })
		).rejects.toThrow(/Sanctions/);
		const bob = await listingOf("user-2", "ammunition");
		await expect(buyArms(handle.db, { userId: "user-4", listingId: bob.id, quantity: 1 })).rejects.toThrow();
		await handle.db.delete(stateSanctions).where(eq(stateSanctions.reason, "test"));
	});

	it("holds offers to the price band and to the right stock grade", async () => {
		await expect(
			listArms(handle.db, { userId: "user-1", good: "rifles", quantity: 5, pricePerUnit: 5_000 })
		).rejects.toThrow(/Price must be between/);
		const holding = await armsHolding(handle.db, "user-1", "rifles");
		await expect(
			listArms(handle.db, { userId: "user-1", good: "rifles", quantity: holding.fresh + 1, pricePerUnit: 100 })
		).rejects.toThrow(/new units/);
		const used = await listArms(handle.db, {
			userId: "user-1",
			good: "rifles",
			quantity: 30,
			pricePerUnit: 80,
			grade: "used"
		});
		expect(used.condition).toBe(holding.usedCondition);
		expect((await armsHolding(handle.db, "user-1", "rifles")).used).toBe(holding.used - 30);

		// Withdrawing returns the units with their condition.
		await cancelArms(handle.db, "user-1", used.id);
		const after = await armsHolding(handle.db, "user-1", "rifles");
		expect(after.used).toBe(holding.used);
		expect(after.total).toBe(holding.total);
	});

	it("returns refused licence requests to the seller", async () => {
		await handle.db
			.insert(productInventory)
			.values({ userId: "user-2", productType: "ammunition" as never, quantity: 50 });
		const listing = await listArms(handle.db, {
			userId: "user-2",
			good: "ammunition",
			quantity: 10,
			pricePerUnit: 5,
			targetStateId: sylvania
		});
		expect(listing.approvedBy).toBeNull();
		const before = await stock("user-2", "ammunition");
		await rejectArms(handle.db, "user-1", listing.id);
		expect(await stock("user-2", "ammunition")).toBe(before + listing.quantity);
		await expect(rejectArms(handle.db, "user-1", listing.id)).rejects.toThrow();
	});

	it("builds the board with guide prices, trends and the viewer's shipments", async () => {
		const board = await armsBoard(handle.db, "user-1");
		expect(board.goods).toHaveLength(5);
		for (const g of board.goods) {
			expect(g.trend).toHaveLength(7);
			expect(g.band.min).toBeLessThanOrEqual(g.guide);
			expect(g.band.max).toBeGreaterThanOrEqual(g.guide);
		}
		expect(board.offers.every((o) => o.licensed)).toBe(true);
		expect(board.offers.find((o) => o.good === "explosives")?.blocker).toMatch(/licensed/);
		expect(board.deliveries.length).toBeGreaterThan(0);
		expect(board.authority).toBe("president");
		const surplus = await handle.db.select().from(armsSurplus).where(eq(armsSurplus.userId, "user-1"));
		expect(surplus.length).toBeGreaterThan(0);
	});
});
