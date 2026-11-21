// src/lib/utils/military.ts
// Formatting for the situational-awareness screens: date-time groups,
// coordinates, ages, and the world map's projection (map units ↔ lat/lon).

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");

// The canonical NATO DTG ("12 NOV 2026, 13:44") lives in dtg.ts so every
// screen uses the same UTC format. Re-exported here for tactical screens.
export { dtg, dtgCompact } from "./dtg.js";

/** "48.86°N 2.35°E" */
export function formatLatLon(lat: number, lon: number, digits = 2): string {
	return `${Math.abs(lat).toFixed(digits)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(digits)}°${lon >= 0 ? "E" : "W"}`;
}

/** Compact age: "now", "12m", "5h", "2d". */
export function ageLabel(from: Date | string, now: Date = new Date()): string {
	const ms = Math.max(0, now.getTime() - new Date(from).getTime());
	const m = Math.floor(ms / 60_000);
	if (m < 1) return "now";
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 48) return `${h}h`;
	return `${Math.floor(h / 24)}d`;
}

/** Time left until a moment: "12m", "1h 05m", or null when it has passed. */
export function countdown(to: Date | string, now: Date = new Date()): string | null {
	const ms = new Date(to).getTime() - now.getTime();
	if (ms <= 0) return null;
	const m = Math.ceil(ms / 60_000);
	return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

// ── Projection ──────────────────────────────────────────────────────────────
// The 1400×600 world map is calibrated to lat/lon by a cubic fit; these are
// the coefficients from tools/map/projection.json (median error ~90 km).
const LAT_COEF = [
	8.962071035660786, 15.427299392579329, -78.2385635467371, -17.573492876665235, 8.271909808707889, -4.293895353693208,
	3.953163579716789, -3.149663926362136, -8.890291597456994, 11.35978753150718
];
const LON_COEF = [
	0.31873489890149936, 179.65759300410315, -0.7089006231907651, 0.34747497977898456, -0.43785387113674207,
	2.1279894758577913, 0.486943994223143, 2.0076657854331112, -3.3686926637179724, 3.381498745170287
];

function terms(x: number, y: number) {
	const u = (x - 700) / 700;
	const v = (y - 300) / 300;
	return [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
}

/** Map units (SVG viewBox) → latitude/longitude. */
export function mapToLatLon(x: number, y: number): { lat: number; lon: number } {
	const t = terms(x, y);
	const dot = (c: number[]) => c.reduce((s, k, i) => s + k * t[i]!, 0);
	const lon = ((((dot(LON_COEF) + 180) % 360) + 360) % 360) - 180;
	return { lat: Math.max(-89.9, Math.min(89.9, dot(LAT_COEF))), lon };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const a =
		Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
	return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Kilometres covered by one map unit horizontally around (x, y). */
export function kmPerMapUnit(x: number, y: number): number {
	const a = mapToLatLon(x - 0.5, y);
	const b = mapToLatLon(x + 0.5, y);
	return haversineKm(a.lat, a.lon, b.lat, b.lon);
}

/** A round scale-bar length (1, 2, 5 × 10ⁿ km) no longer than `maxKm`. */
export function niceKm(maxKm: number): number {
	if (maxKm <= 0) return 0;
	const p = 10 ** Math.floor(Math.log10(maxKm));
	for (const f of [5, 2, 1]) if (f * p <= maxKm) return f * p;
	return p;
}
