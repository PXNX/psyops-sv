// src/lib/component/tactical/colors.ts
// Affiliation colours for tactical symbols (APP-6: blue friend, red hostile,
// amber unknown), taken from the daisyUI theme. They are CSS values, so set
// them with style (style:fill / style:stroke), not SVG presentation attributes.
const tint = (v: string, pct: number) => `color-mix(in oklab, ${v} ${pct}%, transparent)`;

export const TACTICAL = {
	friend: {
		fill: tint("var(--color-secondary)", 28),
		stroke: "var(--color-secondary)",
		icon: "var(--color-friendly-hi)",
		text: "var(--color-friendly-fg)"
	},
	hostile: {
		fill: tint("var(--color-error)", 25),
		stroke: "var(--color-error)",
		icon: "var(--color-hostile-fg)",
		text: "var(--color-hostile-fg)"
	},
	unknown: {
		fill: tint("var(--color-warning)", 18),
		stroke: "var(--color-warning)",
		icon: "var(--color-warning)",
		text: "var(--color-warning)"
	}
} as const;

export const RECON_BLUE = "var(--color-primary)";
export const HOSTILE_RED = "var(--color-error)";
/*
 * Line widths in RangeRing, AttackArrow and ReconSector are multiplied by the
 * CSS variable --k (map units per screen pixel; set it on the parent <svg>),
 * because vector-effect="non-scaling-stroke" ignores CSS transforms such as
 * panzoom's. Without --k they draw at 1×.
 */

/** Dark halo behind labels so they read on any fill. */
export const HALO = "var(--color-surface-0)";
