import { db } from "#lib/server/db.js";
import {
	marketListings,
	resourceInventory,
	productInventory,
	userWallets,
	resourceTypeEnum,
	productTypeEnum
} from "#lib/server/schema.js";
import { eq, min, sql } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { loadCandles, loadLastPricesBefore } from "./price-history.server";
import { buildSeries, changePct, DAY, HOUR, type SeriesPoint } from "./series";
import { earningsPulse } from "#lib/server/services/economy/earnings.js";
import { StockError, buyShares, listShares, stockBoard } from "#lib/server/services/economy/stock-market.js";

// Every tradeable good, not just the starter set: the enums are the single
// source of truth for what can appear on the market.
const RESOURCES = resourceTypeEnum.enumValues;
const PRODUCTS = productTypeEnum.enumValues;

export type Quote = {
	name: string;
	/** Display name (company name for stocks). */
	label?: string;
	/** Where the row links; goods link to their item page, stocks to the company. */
	href?: string;
	kind?: "resource" | "product" | "stock";
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

	const [[wallet], resources, products, asks, weekCandles, dayCandles, openWeek, openDay, lastEver, stocks] = await Promise.all(
		[
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
			loadLastPricesBefore(new Date(now + 60_000)),
			stockBoard(db, account.id)
		]
	);

	const askMap = new Map(asks.map((a) => [a.itemName, a]));
	const held = new Map<string, number>([
		...resources.map((r) => [r.resourceType, r.quantity] as [string, number]),
		...products.map((p) => [p.productType, p.quantity] as [string, number])
	]);

	const quote = (
		name: string,
		overrides: Partial<Pick<Quote, "label" | "href" | "kind" | "ask" | "unitsOnOffer" | "held" | "last">> = {}
	): Quote => {
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
			week,
			...overrides
		};
	};

	const stockQuotes: Quote[] = stocks.map((s) =>
		quote(`stock:${s.companyId}`, {
			label: s.name,
			href: `/company/${s.companyId}`,
			kind: "stock",
			ask: s.ask,
			unitsOnOffer: s.unitsOnOffer,
			held: s.held,
			last: s.price
		})
	);

	return {
		now,
		earnings: await earningsPulse(db),
		stocks: await stockBoard(db, account.id),
		wallet: wallet || { balance: 10000, userId: account.id },
		groups: [
			{ title: "Raw materials", quotes: RESOURCES.map((r) => quote(r)) },
			{ title: "Goods", quotes: PRODUCTS.map((p) => quote(p)) },
			{ title: "Company stocks", quotes: stockQuotes }
		]
	};
};

export const actions: Actions = {
	// Buy a slice of a company's cheapest sell order.
	buyStock: async ({ locals, request }) => {
		const form = await request.formData();
		try {
			return await buyShares(db, {
				userId: locals.account!.id,
				listingId: Number(form.get("listingId")),
				quantity: Number(form.get("quantity"))
			});
		} catch (err) {
			if (err instanceof StockError) return fail(400, { error: err.message });
			throw err;
		}
	},

	// Offer shares you hold for sale on the market.
	listStock: async ({ locals, request }) => {
		const form = await request.formData();
		try {
			await listShares(db, {
				userId: locals.account!.id,
				companyId: Number(form.get("companyId")),
				quantity: Number(form.get("quantity")),
				pricePerUnit: Number(form.get("pricePerUnit"))
			});
			return { success: true, message: "Shares listed on the market." };
		} catch (err) {
			if (err instanceof StockError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
