// Price history for the exchange charts, read from market_price_history:
// every completed purchase (player or state) writes one row there with the
// unit price and quantity, so the charts show real trades only.
import { db } from "#lib/server/db.js";
import { marketPriceHistory } from "#lib/server/schema.js";
import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { Candle } from "./series";

const h = marketPriceHistory;

/** Trades since `since`, grouped per item into buckets of `bucketSeconds`. */
export async function loadCandles(since: Date, bucketSeconds: number, itemName?: string) {
	// The bucket size is inlined (not a bind parameter) so the GROUP BY
	// expression is textually identical to the selected one.
	const size = sql.raw(String(Math.floor(bucketSeconds)));
	const bucket = sql<number>`floor(extract(epoch from ${h.recordedAt}) / ${size})::bigint * ${size}`;
	const where: SQL[] = [gte(h.recordedAt, since)];
	if (itemName) where.push(eq(h.itemName, itemName));

	const rows = await db
		.select({
			itemName: h.itemName,
			bucket,
			open: sql<number>`(array_agg(${h.pricePerUnit} order by ${h.recordedAt}, ${h.id}))[1]`,
			close: sql<number>`(array_agg(${h.pricePerUnit} order by ${h.recordedAt} desc, ${h.id} desc))[1]`,
			low: sql<number>`min(${h.pricePerUnit})`,
			high: sql<number>`max(${h.pricePerUnit})`,
			volume: sql<number>`sum(${h.quantity})`
		})
		.from(h)
		.where(and(...where))
		.groupBy(h.itemName, bucket)
		.orderBy(h.itemName, bucket);

	const byItem = new Map<string, Candle[]>();
	for (const r of rows) {
		const list = byItem.get(r.itemName) ?? [];
		list.push({
			t: Number(r.bucket) * 1000,
			open: Number(r.open),
			close: Number(r.close),
			low: Number(r.low),
			high: Number(r.high),
			volume: Number(r.volume)
		});
		byItem.set(r.itemName, list);
	}
	return byItem;
}

/** The last traded price per item before `before` (the opening price of a chart window). */
export async function loadLastPricesBefore(before: Date, itemName?: string) {
	const where: SQL[] = [lt(h.recordedAt, before)];
	if (itemName) where.push(eq(h.itemName, itemName));
	const rows = await db
		.selectDistinctOn([h.itemName], { itemName: h.itemName, price: h.pricePerUnit })
		.from(h)
		.where(and(...where))
		.orderBy(h.itemName, desc(h.recordedAt), desc(h.id));
	return new Map(rows.map((r) => [r.itemName, Number(r.price)]));
}
