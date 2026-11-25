// src/lib/server/mock-seed-arms.ts
// Demo data for the arms market in mock mode: stock for the admin, offers from
// every kind of seller (domestic, bloc partner, licensed foreign, unlicensed
// foreign), a licence request waiting for the admin, a week of trades for the
// price charts and two shipments on their way.
import type { PgDatabase } from "drizzle-orm/pg-core";
import { armsListings, armsSurplus, armsTrades, productInventory, states } from "./schema";

const HOUR = 3_600_000;

export async function seedArmsMarket(db: PgDatabase<any>) {
	const rows = await db.select({ id: states.id, name: states.name }).from(states);
	const id = (name: string) => rows.find((s) => s.name === name)?.id ?? null;
	const freedonia = id("Republic of Freedonia");
	const sylvania = id("Empire of Sylvania");
	const borduria = id("Kingdom of Borduria");
	if (!freedonia || !sylvania || !borduria) return;
	const now = Date.now();

	await db.insert(productInventory).values([
		{ userId: "user-1", productType: "rifles", quantity: 420 },
		{ userId: "user-1", productType: "ammunition", quantity: 6000 },
		{ userId: "user-1", productType: "artillery", quantity: 14 },
		{ userId: "user-1", productType: "vehicles", quantity: 4 },
		{ userId: "user-3", productType: "vehicles", quantity: 10 },
		{ userId: "user-4", productType: "explosives", quantity: 40 }
	] as never);
	// Part of Alice's rifles came through the market before.
	await db.insert(armsSurplus).values({ userId: "user-1", good: "rifles", quantity: 120, condition: 76 });

	await db.insert(armsListings).values([
		// Domestic offers Alice can buy straight away.
		{
			sellerId: "user-2",
			sellerStateId: freedonia,
			good: "rifles",
			quantity: 150,
			pricePerUnit: 104,
			approvedBy: "user-2",
			createdAt: new Date(now - 5 * HOUR)
		},
		{
			sellerId: "user-2",
			sellerStateId: freedonia,
			good: "ammunition",
			quantity: 8000,
			pricePerUnit: 5,
			approvedBy: "user-2",
			createdAt: new Date(now - 4 * HOUR)
		},
		{
			sellerId: "user-2",
			sellerStateId: freedonia,
			good: "artillery",
			quantity: 6,
			pricePerUnit: 430,
			condition: 64,
			approvedBy: "user-2",
			createdAt: new Date(now - 30 * HOUR)
		},
		// A Sylvanian dealer licensed to sell armour to Freedonia.
		{
			sellerId: "user-3",
			sellerStateId: sylvania,
			good: "vehicles",
			quantity: 8,
			pricePerUnit: 1180,
			targetStateId: freedonia,
			approvedBy: "user-3",
			createdAt: new Date(now - 10 * HOUR)
		},
		// An open Bordurian offer: foreign for Alice, so out of reach without a licence.
		{
			sellerId: "user-4",
			sellerStateId: borduria,
			good: "explosives",
			quantity: 25,
			pricePerUnit: 190,
			approvedBy: "user-4",
			createdAt: new Date(now - 2 * HOUR)
		},
		{
			sellerId: "user-4",
			sellerStateId: borduria,
			good: "rifles",
			quantity: 300,
			pricePerUnit: 88,
			condition: 52,
			approvedBy: "user-4",
			createdAt: new Date(now - 20 * HOUR)
		},
		// Bob wants to sell artillery to Borduria: Alice, as president, decides.
		{
			sellerId: "user-2",
			sellerStateId: freedonia,
			good: "artillery",
			quantity: 4,
			pricePerUnit: 520,
			targetStateId: borduria,
			createdAt: new Date(now - HOUR)
		}
	]);

	// A week of trades so the sparklines and the tape have something to show.
	const goods = [
		["rifles", 100, 60],
		["ammunition", 5, 2000],
		["artillery", 500, 3],
		["vehicles", 1000, 2],
		["explosives", 200, 10]
	] as const;
	const trades = [];
	for (let day = 6; day >= 0; day--) {
		for (const [g, base, size] of goods) {
			const wave = 1 + 0.12 * Math.sin(day * 1.3 + base) + (6 - day) * 0.015;
			const at = new Date(now - day * 24 * HOUR - ((base + day * 7) % 11) * HOUR);
			trades.push({
				good: g,
				quantity: Math.max(1, Math.round(size * (0.6 + ((day * 3 + base) % 5) / 5))),
				pricePerUnit: Math.max(1, Math.round(base * wave)),
				condition: day % 3 === 0 ? 70 : 100,
				sellerId: day % 2 ? "user-2" : "user-4",
				buyerId: day % 2 ? "user-4" : "user-3",
				sellerStateId: day % 2 ? freedonia : borduria,
				buyerStateId: day % 2 ? borduria : sylvania,
				route: "foreign",
				levy: 0,
				createdAt: at,
				arrivesAt: new Date(at.getTime() + 10 * HOUR),
				deliveredAt: new Date(at.getTime() + 10 * HOUR)
			});
		}
	}
	// Alice's own shipments: one about to land, one just ordered.
	trades.push(
		{
			good: "ammunition",
			quantity: 1500,
			pricePerUnit: 5,
			condition: 100,
			sellerId: "user-2",
			buyerId: "user-1",
			sellerStateId: freedonia,
			buyerStateId: freedonia,
			route: "domestic",
			levy: 0,
			createdAt: new Date(now - 3 * HOUR),
			arrivesAt: new Date(now + 1 * HOUR),
			deliveredAt: null
		},
		{
			good: "vehicles",
			quantity: 2,
			pricePerUnit: 1150,
			condition: 100,
			sellerId: "user-3",
			buyerId: "user-1",
			sellerStateId: sylvania,
			buyerStateId: freedonia,
			route: "foreign",
			levy: 115,
			createdAt: new Date(now - 2 * HOUR),
			arrivesAt: new Date(now + 8 * HOUR),
			deliveredAt: null
		}
	);
	await db.insert(armsTrades).values(trades);
}
