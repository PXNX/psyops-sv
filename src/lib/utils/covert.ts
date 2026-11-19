// src/lib/utils/covert.ts
// Wording for covert-operation effects, shared by the Ops page and state
// pages. Numbers come from config/game/{cyber,psyops}.config.ts.
import type { BadgeTone } from "#lib/component/ui/styles.js";
import type { StateEffectKind } from "#lib/config/index.js";

export function effectLabel(kind: StateEffectKind | string, magnitude: number, region?: string | null): string {
	switch (kind) {
		case "grid_degraded":
			return `Power grid degraded −${magnitude}%`;
		case "c2_degraded":
			return `Sensors & command links jammed −${magnitude}%`;
		case "morale_shaken":
			return `Morale shaken −${magnitude}%`;
		case "deception":
			return `Planted intel over ${region ?? "a region"} (${magnitude > 0 ? "inflated" : "concealed"} counts)`;
		case "morale_boost":
			return `Counter-propaganda: morale +${magnitude}%`;
		case "casus_belli":
			return "Casus belli";
		default:
			return kind.replace(/_/g, " ");
	}
}

export const EFFECT_TONE: Record<StateEffectKind, BadgeTone> = {
	grid_degraded: "amber",
	c2_degraded: "cyan",
	morale_shaken: "red",
	deception: "purple",
	morale_boost: "green",
	casus_belli: "orange"
};
