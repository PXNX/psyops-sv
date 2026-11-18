import { db } from "#lib/server/db.js";
import { marketListings, resourceInventory, productInventory, userWallets } from "#lib/server/schema.js";
import { eq, min, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { loadCandles, loadLastPricesBefore } from "./price-history.server";
import { buildSeries, changePct, DAY, HOUR, type SeriesPoint } from "./series";

const RESOURCES = ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as const;
const PRODUCTS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as const;

export type Quote = {
	name: string;
	/** Last traded price, or null if it never traded. */
	last: number | null;
	/** Cheapest ask on the board right now. */
	ask: number | null;
	unitsOnOffer: number;
	held: number;
	change24h: number | null;
	change7d: number | null;
	volume24h: number;
	/** 6-hour steps over the last 7 days. */
	week: SeriesPoint[];
};

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const now = Date.now();
	const dayAgo = new Date(now - DAY);
	const weekAgo = new Date(now - 7 * DAY);

	const [[wallet], resources, products, asks, weekCandles, dayCandles, openWeek, openDay, lastEver] =
		await Promise.all([
			db.select().from(userWallets).where(eq(userWallets.userId, account.id)),
			db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id)),
			db.select().from(productInventory).where(eq(productInventory.userId, account.id)),
			db
				.select({
					itemName: marketListings.itemName,
					lowestPrice: min(marketListings.pricePerUnit).as("lowest_price"),
					totalQuantity: sql<number>`sum(${marketListings.quantity})`.as("total_quantity")
				})
				.from(marketListings)
				.groupBy(marketListings.itemName),
			loadCandles(weekAgo, 6 * 3600),
			loadCandles(dayAgo, 3600),
			loadLastPricesBefore(weekAgo),
			loadLastPricesBefore(dayAgo),
			loadLastPricesBefore(new Date(now + 60_000))
		]);

	const askMap = new Map(asks.map((a) => [a.itemName, a]));
	const held = new Map<string, number>([
		...resources.map((r) => [r.resourceType, r.quantity] as [string, number]),
		...products.map((p) => [p.productType, p.quantity] as [string, number])
	]);

	const quote = (name: string): Quote => {
		const week = buildSeries(weekCandles.get(name) ?? [], openWeek.get(name) ?? null, +weekAgo, now, 6 * HOUR);
		const day = buildSeries(dayCandles.get(name) ?? [], openDay.get(name) ?? null, +dayAgo, now, HOUR);
		const ask = askMap.get(name);
		return {
			name,
			last: lastEver.get(name) ?? null,
			ask: ask ? Number(ask.lowestPrice) : null,
			unitsOnOffer: ask ? Number(ask.totalQuantity) : 0,
			held: held.get(name) ?? 0,
			change24h: changePct(day),
			change7d: changePct(week),
			volume24h: day.reduce((s, p) => s + p.volume, 0),
			week
		};
	};

	return {
		now,
		wallet: wallet || { balance: 10000, userId: account.id },
		groups: [
			{ title: "Raw materials", quotes: RESOURCES.map(quote) },
			{ title: "Goods", quotes: PRODUCTS.map(quote) }
		]
	};
};
