// Fog of war on foreign state statistics. A viewer state knows another state's
// figures only as well as its intelligence allows: an intel level from 0 to 1
// per stat group, built from dossier files, planted assets, recon, covert ops,
// alliances and shared borders. Every figure then goes out as an estimate and
// a [low, high] interval that always holds the true value and narrows as the
// level rises. The noise is seeded per (viewer, target, stat, day), so
// reloading the page shows the same numbers and can't be averaged away.
//
// Pure module: the server gathers the signals and calls these functions; the
// client only ever receives the resulting estimates.

export const INTEL_GROUPS = ["population", "economy", "military", "energy", "resources"] as const;
export type IntelGroup = (typeof INTEL_GROUPS)[number];

export const INTEL_GROUP_LABEL: Record<IntelGroup, string> = {
	population: "Population",
	economy: "Economy",
	military: "Military",
	energy: "Energy",
	resources: "Resources"
};

/** How the viewer relates to the target before any spying. */
export type IntelRelation = "self" | "bloc" | "foreign";

/** One copied document: its site decides which stat groups it sheds light on. */
export interface IntelFileSignal {
	siteId: string;
	classification: string;
	capturedAt: Date;
}

export interface IntelSignals {
	relation: IntelRelation;
	/** The viewer and the target have at least one region on a shared border. */
	sharedBorder: boolean;
	/** Active (unburned) network assets the viewer holds inside the target. */
	activeAssets: number;
	/** Documents copied from the target (the dossier). */
	files: IntelFileSignal[];
	/** Completed recon passes over the target's regions, with when they finished. */
	recon: Date[];
	/** Successful covert operations the viewer ran against the target. */
	covertOps: Date[];
}

/** Tunables. Contributions combine as 1 - Π(1 - c), so they saturate below 1. */
export const INTEL = {
	/** What anyone can glean from news and the map. */
	PUBLIC: 0.06,
	SHARED_BORDER: 0.12,
	/** Bloc partners exchange most of their figures. */
	BLOC: 0.88,
	PER_ASSET: 0.07,
	MAX_ASSETS: 4,
	/** A file's weight on its own groups, and the little it says about the rest. */
	FILE_GROUP: 0.16,
	FILE_GENERAL: 0.025,
	CLASSIFICATION_WEIGHT: { CONFIDENTIAL: 1, SECRET: 1.3, "TOP SECRET": 1.7 } as Record<string, number>,
	/** Intel goes stale: a source counts half after this many days. */
	HALF_LIFE_DAYS: 14,
	RECON_MILITARY: 0.08,
	RECON_POPULATION: 0.03,
	COVERT_OP: 0.04,
	/** At or above this level a figure is confirmed and shown exactly. */
	CONFIRMED: 0.97
} as const;

/** Which stat groups each site kind documents. */
const SITE_GROUPS: Record<string, IntelGroup[]> = {
	plant: ["energy"],
	powerplant: ["energy"],
	airbase: ["military"],
	command: ["military"],
	lab: ["military", "resources"],
	datacenter: ["economy", "population"],
	telecom: ["population"],
	company: ["economy"],
	factory: ["economy", "resources"],
	party: ["population"]
};

/** The stat groups a copied file narrows, from its site id (`airbase-3-0`, `plant-42`…). */
export function fileGroups(siteId: string): IntelGroup[] {
	const prefix = siteId.split("-")[0] ?? "";
	return SITE_GROUPS[prefix] ?? [];
}

/** Human description of what kind of document narrows a group, for hints. */
export const GROUP_SOURCES: Record<IntelGroup, string> = {
	population: "files from telecom hubs, data centres and party offices; recon passes",
	economy: "files from company offices, factories and data centres",
	military: "files from air bases, command centres and labs; recon passes",
	energy: "files from power plants",
	resources: "files from factories and research labs"
};

const DAY = 86_400_000;
const freshness = (at: Date, now: Date) =>
	Math.pow(0.5, Math.max(0, now.getTime() - at.getTime()) / DAY / INTEL.HALF_LIFE_DAYS);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface IntelSource {
	label: string;
	/** Contribution to the overall level, 0..1, for display. */
	amount: number;
}

export interface IntelLevel {
	/** Mean of the group levels. */
	overall: number;
	groups: Record<IntelGroup, number>;
	/** What feeds the level, strongest first. */
	sources: IntelSource[];
}

/** Combine independent contributions so they saturate: 1 - Π(1 - c). */
export function combine(parts: number[]): number {
	return clamp01(1 - parts.reduce((rest, c) => rest * (1 - clamp01(c)), 1));
}

/** The viewer's intel level on the target, per stat group and overall. */
export function intelLevel(signals: IntelSignals, now = new Date()): IntelLevel {
	if (signals.relation === "self") {
		const groups = Object.fromEntries(INTEL_GROUPS.map((g) => [g, 1])) as Record<IntelGroup, number>;
		return { overall: 1, groups, sources: [{ label: "Your own state", amount: 1 }] };
	}

	// Contributions shared by every group, then the group-specific ones.
	const general: number[] = [INTEL.PUBLIC];
	const perGroup = Object.fromEntries(INTEL_GROUPS.map((g) => [g, [] as number[]])) as Record<IntelGroup, number[]>;
	const sources: IntelSource[] = [{ label: "Public reporting", amount: INTEL.PUBLIC }];

	if (signals.relation === "bloc") {
		general.push(INTEL.BLOC);
		sources.push({ label: "Bloc intelligence sharing", amount: INTEL.BLOC });
	}
	if (signals.sharedBorder) {
		general.push(INTEL.SHARED_BORDER);
		sources.push({ label: "Shared border", amount: INTEL.SHARED_BORDER });
	}

	const assets = Math.min(INTEL.MAX_ASSETS, Math.max(0, signals.activeAssets));
	if (assets > 0) {
		for (let i = 0; i < assets; i++) general.push(INTEL.PER_ASSET);
		sources.push({
			label: `${assets} active asset${assets === 1 ? "" : "s"}`,
			amount: combine(Array(assets).fill(INTEL.PER_ASSET))
		});
	}

	if (signals.files.length) {
		const fileParts: number[] = [];
		for (const file of signals.files) {
			const weight = (INTEL.CLASSIFICATION_WEIGHT[file.classification] ?? 1) * freshness(file.capturedAt, now);
			general.push(INTEL.FILE_GENERAL * weight);
			fileParts.push(INTEL.FILE_GENERAL * weight);
			for (const g of fileGroups(file.siteId)) {
				perGroup[g].push(INTEL.FILE_GROUP * weight);
				fileParts.push((INTEL.FILE_GROUP * weight) / INTEL_GROUPS.length);
			}
		}
		const n = signals.files.length;
		sources.push({ label: `${n} dossier file${n === 1 ? "" : "s"}`, amount: combine(fileParts) });
	}

	if (signals.recon.length) {
		const parts: number[] = [];
		for (const at of signals.recon) {
			const f = freshness(at, now);
			perGroup.military.push(INTEL.RECON_MILITARY * f);
			perGroup.population.push(INTEL.RECON_POPULATION * f);
			parts.push((INTEL.RECON_MILITARY * f + INTEL.RECON_POPULATION * f) / INTEL_GROUPS.length);
		}
		const n = signals.recon.length;
		sources.push({ label: `${n} recon pass${n === 1 ? "" : "es"}`, amount: combine(parts) });
	}

	if (signals.covertOps.length) {
		const parts = signals.covertOps.map((at) => INTEL.COVERT_OP * freshness(at, now));
		general.push(...parts);
		const n = signals.covertOps.length;
		sources.push({ label: `${n} successful covert op${n === 1 ? "" : "s"}`, amount: combine(parts) });
	}

	const groups = Object.fromEntries(
		INTEL_GROUPS.map((g) => [g, round3(combine([...general, ...perGroup[g]]))])
	) as Record<IntelGroup, number>;
	const overall = round3(INTEL_GROUPS.reduce((s, g) => s + groups[g], 0) / INTEL_GROUPS.length);
	sources.sort((a, b) => b.amount - a.amount);
	return { overall, groups, sources: sources.map((s) => ({ ...s, amount: round3(s.amount) })) };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ── Confidence ──────────────────────────────────────────────────────────────

export type IntelTier = "unknown" | "vague" | "rough" | "solid" | "confirmed";

export const TIER_LABEL: Record<IntelTier, string> = {
	unknown: "Unknown",
	vague: "Vague",
	rough: "Rough",
	solid: "Solid",
	confirmed: "Confirmed"
};

export function intelTier(level: number): IntelTier {
	if (level >= INTEL.CONFIRMED) return "confirmed";
	if (level >= 0.75) return "solid";
	if (level >= 0.4) return "rough";
	if (level >= 0.15) return "vague";
	return "unknown";
}

/**
 * Relative half-width of the interval at a given level: about ±150% with no
 * intel, ±5% just below confirmation, exact once confirmed.
 */
export function halfWidth(level: number): number {
	if (level >= INTEL.CONFIRMED) return 0;
	const gap = 1 - clamp01(level);
	return 0.05 + 1.45 * gap * gap;
}

// ── Estimates ───────────────────────────────────────────────────────────────

export interface StatSpec {
	group: IntelGroup;
	/** Below this group level the figure stays fully hidden. */
	hideBelow?: number;
	/** Typical magnitude, so a true value near zero still gets a real interval. */
	scale?: number;
	/** Values can't go below zero (counts, money). Default true. */
	nonNegative?: boolean;
}

export type Estimate =
	| { kind: "exact"; value: number; low: number; high: number; tier: "confirmed"; level: number; group: IntelGroup }
	| { kind: "range"; value: number; low: number; high: number; tier: IntelTier; level: number; group: IntelGroup }
	| { kind: "hidden"; value: null; low: null; high: null; tier: IntelTier; level: number; group: IntelGroup };

/** FNV-1a over a string: a stable 32-bit seed. */
export function hashSeed(key: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Mulberry32: a small seeded PRNG, uniform in [0, 1). */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A rounding step one decade below the interval's half-width (at least 1). */
function roundingStep(span: number): number {
	return span >= 10 ? Math.pow(10, Math.floor(Math.log10(span)) - 1) : 1;
}

function roundTo(n: number, step: number, mode: "floor" | "ceil" | "round"): number {
	return Math[mode](n / step) * step;
}

export interface EstimateKey {
	viewerStateId: number | null;
	targetStateId: number;
	stat: string;
	now?: Date;
}

/**
 * Turn a true figure into what the viewer may see. The interval always holds
 * the true value; the estimate is its noisy centre.
 */
export function estimateStat(trueValue: number, level: number, spec: StatSpec, key: EstimateKey): Estimate {
	const tier = intelTier(level);
	const group = spec.group;
	if (tier === "confirmed") {
		return { kind: "exact", value: trueValue, low: trueValue, high: trueValue, tier, level, group };
	}
	if (level < (spec.hideBelow ?? 0)) {
		return { kind: "hidden", value: null, low: null, high: null, tier, level, group };
	}

	const day = Math.floor((key.now ?? new Date()).getTime() / DAY);
	const rng = seededRandom(hashSeed(`${key.viewerStateId ?? 0}:${key.targetStateId}:${key.stat}:${day}`));
	const w = halfWidth(level);
	const span = w * Math.max(Math.abs(trueValue), spec.scale ?? 0);
	// The centre wanders up to 85% of the half-width, so the truth stays inside.
	const offset = (rng() * 2 - 1) * 0.85 * span;
	const centre = trueValue + offset;
	let low = centre - span;
	let high = centre + span;
	if (spec.nonNegative !== false) low = Math.max(0, low);

	// Round outward so rounding never pushes the true value out.
	const step = roundingStep(span);
	low = Math.min(roundTo(low, step, "floor"), Math.floor(trueValue));
	high = Math.max(roundTo(high, step, "ceil"), Math.ceil(trueValue));
	const value = Math.min(high, Math.max(low, roundTo(centre, step, "round")));
	return { kind: "range", value, low, high, tier, level, group };
}

/** The exact figure, for the viewer's own state (or with no fog at all). */
export function exactStat(value: number, group: IntelGroup): Estimate {
	return { kind: "exact", value, low: value, high: value, tier: "confirmed", level: 1, group };
}

/** Compact number for display: 1.2M, 340k, 87. */
export function compactNumber(n: number): string {
	const abs = Math.abs(n);
	const fmt = (v: number, suffix: string) => `${Number(v.toFixed(v < 10 ? 1 : 0))}${suffix}`;
	if (abs >= 1e9) return fmt(n / 1e9, "B");
	if (abs >= 1e6) return fmt(n / 1e6, "M");
	if (abs >= 1e4) return fmt(n / 1e3, "k");
	return Math.round(n).toLocaleString("en-US");
}

/**
 * `~1.2M (0.9–1.5M)` for a range, the plain number when exact, `—` when
 * hidden. `unit` is appended (e.g. "%", " MW").
 */
export function formatEstimate(e: Estimate, unit = ""): string {
	if (e.kind === "hidden") return "—";
	if (e.kind === "exact") return `${e.value.toLocaleString("en-US")}${unit}`;
	return `~${compactNumber(e.value)}${unit} (${compactNumber(e.low)}–${compactNumber(e.high)}${unit})`;
}

/** How to sharpen a figure in this group, for tooltips. */
export function improveHint(e: Estimate): string {
	if (e.kind === "exact") return "Confirmed figure.";
	const what = e.kind === "hidden" ? "Not known" : `${TIER_LABEL[e.tier]} estimate`;
	return `${what} (${INTEL_GROUP_LABEL[e.group].toLowerCase()} intel ${Math.round(e.level * 100)}%). Sharpen it with ${GROUP_SOURCES[e.group]}.`;
}

// ── Bound estimator ─────────────────────────────────────────────────────────

/** An estimator bound to one viewer and target: true figure in, estimate out. */
export interface StateIntel {
	viewerStateId: number | null;
	targetStateId: number;
	relation: IntelRelation;
	level: IntelLevel;
	/** True when figures are shown as they are (the viewer's own state). */
	exact: boolean;
	estimate: (stat: string, value: number, spec: StatSpec) => Estimate;
}

/** Bind the signals the server gathered to an estimator for one viewer and target. */
export function stateIntelFrom(
	viewerStateId: number | null,
	targetStateId: number,
	signals: IntelSignals,
	now = new Date()
): StateIntel {
	const level = intelLevel(signals, now);
	const self = signals.relation === "self";
	return {
		viewerStateId,
		targetStateId,
		relation: signals.relation,
		level,
		exact: self,
		estimate: (stat, value, spec) =>
			self
				? exactStat(value, spec.group)
				: estimateStat(value, level.groups[spec.group], spec, { viewerStateId, targetStateId, stat, now })
	};
}

/** Sort key for an estimate: its shown value, hidden figures last. */
export function estimateRank(e: Estimate): number {
	return e.kind === "hidden" ? -Infinity : e.value;
}
