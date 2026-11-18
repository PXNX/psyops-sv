// Turns bucketed trades into an evenly spaced price series for the charts.
// Shared by the server loads and the chart components (no server imports).

/** Trades of one item inside one time bucket. `t` is the bucket start in ms. */
export type Candle = { t: number; open: number; close: number; low: number; high: number; volume: number };

/** One step of a chart: the price at the end of the bucket and the units traded in it. */
export type SeriesPoint = { t: number; price: number; low: number; high: number; volume: number };

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/**
 * Re-buckets `candles` (sorted, finer or equal to `bucketMs`) into fixed
 * buckets from `start` to `end`. A bucket without trades keeps the previous
 * price; buckets before the first known price are left out. `opening` is the
 * last price traded before the earliest candle, if any; candles before
 * `start` only move the opening price.
 */
export function buildSeries(
	candles: Candle[],
	opening: number | null,
	start: number,
	end: number,
	bucketMs: number
): SeriesPoint[] {
	const first = Math.floor(start / bucketMs) * bucketMs;
	const count = Math.max(1, Math.floor((end - first) / bucketMs) + 1);
	const merged: (Candle | null)[] = Array.from({ length: count }, () => null);

	let price = opening;
	for (const c of candles) {
		// Trades before the window only set the opening price.
		if (c.t < first) {
			price = c.close;
			continue;
		}
		if (c.t > end) continue;
		const i = Math.min(count - 1, Math.floor((c.t - first) / bucketMs));
		const m = merged[i];
		if (!m) merged[i] = { ...c, t: first + i * bucketMs };
		else {
			m.close = c.close;
			m.low = Math.min(m.low, c.low);
			m.high = Math.max(m.high, c.high);
			m.volume += c.volume;
		}
	}

	const points: SeriesPoint[] = [];
	for (let i = 0; i < count; i++) {
		const m = merged[i];
		if (m) price = m.close;
		if (price === null) continue;
		points.push({
			t: Math.max(start, first + i * bucketMs),
			price,
			low: m?.low ?? price,
			high: m?.high ?? price,
			volume: m?.volume ?? 0
		});
	}
	return points;
}

/** Percentage move from the first to the last point, or null without two prices. */
export function changePct(points: { price: number }[]): number | null {
	if (points.length < 2) return null;
	const from = points[0].price;
	const to = points[points.length - 1].price;
	return from > 0 ? ((to - from) / from) * 100 : null;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
