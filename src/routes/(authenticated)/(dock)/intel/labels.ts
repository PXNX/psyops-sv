// src/routes/(authenticated)/(dock)/intel/labels.ts
// Display labels shared by the intel page's pieces.
import type { BadgeTone } from "#lib/component/ui/index.js";

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const reportNo = (id: number) => `INTREP ${String(id).padStart(5, "0")}`;

export const LEVEL_LABEL = { none: "Blind", low: "Low", medium: "Medium", high: "High" } as const;
export const LEVEL_TONE: Record<keyof typeof LEVEL_LABEL, BadgeTone> = {
	none: "neutral",
	low: "amber",
	medium: "blue",
	high: "green"
};

/** Recon groups units by signature; these are the four groups. */
export const CATEGORY_LABEL: Record<string, string> = {
	infantry: "Infantry",
	vehicle: "Vehicles",
	artillery: "Artillery",
	air: "Aircraft"
};

/** Exact unit types a visual pass (or a deep network) can tell apart. */
const TYPE_LABEL: Record<string, string> = {
	...CATEGORY_LABEL,
	marine: "Marines",
	armor: "Armour",
	mechanized: "Mechanised",
	air_defence: "Air defence",
	fighter_squadron: "Fighters",
	bomber_squadron: "Bombers"
};
export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
