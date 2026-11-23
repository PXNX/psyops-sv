// src/lib/server/services/military/intel.ts
// The pure half of reconnaissance: what one sensor pass sees, how passes fuse
// into one intel picture, and what that picture is worth in battle. No
// database access, so it is easy to test and reason about; recon.ts feeds it.
import {
	AIR_STRIKE_TYPES,
	AD_DRONE_EVASION_PENALTY,
	COMBAT_INTEL,
	DETECTION_THRESHOLD,
	ESTIMATE_ERROR,
	INDIRECT_FIRE_TYPES,
	INTEL_AGE_DECAY,
	INTEL_VALID_HOURS,
	SENSORS,
	UNIT_CATEGORIES,
	UNIT_CATEGORY,
	airDefenceStrength,
	airStrikeFactor,
	confidenceLevel,
	deceivedCount,
	detectionChance,
	droneInterceptChance,
	seesThrough,
	signalBonus,
	PSYOPS,
	type Deception,
	type SensorId,
	type UnitCategory,
	type ViewConditions,
	visibleFields,
	type IntelVisibleField
} from "#lib/config/index.js";
import type { IntelFindings } from "../../schema";

/** Strip what the viewer's network has not yet reached from a fused picture. */
export function redactPicture(
	picture: IntelPicture,
	fields: ReadonlySet<IntelVisibleField> = visibleFields(Number.MAX_SAFE_INTEGER)
): IntelPicture {
	const out: IntelPicture = { ...picture };
	if (!fields.has("unitCounts")) {
		// Keep every category present but unobserved. Consumers index all of
		// UNIT_CATEGORIES (the intel table renders one badge per category), so
		// an empty object here makes the page throw on `cat.coverage`.
		out.categories = Object.fromEntries(
			UNIT_CATEGORIES.map((c) => [c, { coverage: 0, count: null, estimated: false }])
		) as IntelPicture["categories"];
		out.knownUnits = 0;
		out.confidence = 0;
		out.level = "none";
	}
	if (!fields.has("unitTypes")) out.unitTypes = null;
	if (!fields.has("installations")) {
		out.buildings = null;
		out.firingPositions = null;
	}
	if (!fields.has("battleDetail")) out.battle = null;
	return out;
}

/** Strip what the viewer's network has not yet reached. */
export function redactFindings(
	findings: IntelFindings,
	fields: ReadonlySet<IntelVisibleField> = visibleFields(Number.MAX_SAFE_INTEGER)
): IntelFindings {
	const out: IntelFindings = { ...findings };
	if (!fields.has("unitCounts")) {
		out.coverage = {};
		out.categories = [];
	}
	if (!fields.has("unitTypes")) out.unitTypes = null;
	if (!fields.has("installations")) {
		out.buildings = null;
		out.airDefence = null;
		out.firingPositions = null;
	}
	if (!fields.has("battleDetail")) out.battle = null;
	return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A count as a sensor with detection chance `p` would report it. */
function estimate(n: number, p: number, rng: () => number) {
	const spread = ESTIMATE_ERROR * (1 - p);
	const count = Math.max(1, Math.round(n * (1 + (rng() * 2 - 1) * spread)));
	return { count, estimated: spread * n >= 0.5 };
}

export interface ScanInput {
	sensor: SensorId;
	conditions: ViewConditions;
	/** Hostile units in the region (stationed there or fighting there), by type. */
	hostileUnitTypes: string[];
	/** Hostile artillery that fired recently (thermal signature). */
	recentlyFired: number;
	/** Enemy air-defence units that can engage a drone. */
	airDefenceUnits: number;
	/** Enemy radar coverage levels in the region (they cue the air defence). */
	radarLevels?: number;
	owner: { id: number | null; name: string | null };
	buildings: IntelFindings["buildings"];
	battle: IntelFindings["battle"];
	/** Random source in [0, 1); seeded per mission so a pass is reproducible. */
	rng: () => number;
	/** C2 disruption on the observer: share (0-1) of detection lost to jammed sensor links. */
	degradation?: number;
	/** Comms intercept on the target: adds detection and tightens the estimates. */
	signalIntel?: number;
	/** Disinformation planted for the observer over this region (psyops.config.ts). */
	deception?: Deception | null;
}

/** One sensor pass over a region. */
export function scanRegion(input: ScanInput): IntelFindings {
	const s = SENSORS[input.sensor];
	const coverage = Object.fromEntries(UNIT_CATEGORIES.map((c) => [c, 0])) as Record<UnitCategory, number>;
	const base: IntelFindings = {
		sensor: input.sensor,
		outcome: "ok",
		conditions: { ...input.conditions },
		ownerStateId: input.owner.id,
		ownerStateName: input.owner.name,
		airDefence: null,
		coverage,
		categories: [],
		unitTypes: null,
		firingPositions: null,
		buildings: null,
		battle: null
	};

	// Drones can be shot down; satellites can't. Radar cueing counts towards
	// the interception chance, so SEAD on the radars opens the airspace.
	let evasion = 1;
	if (s.platform === "drone") {
		const interceptChance = droneInterceptChance(airDefenceStrength(input.airDefenceUnits, input.radarLevels ?? 0));
		base.airDefence = {
			units: input.airDefenceUnits,
			radar: input.radarLevels ?? 0,
			interceptChance: round2(interceptChance)
		};
		if (input.rng() < interceptChance) return { ...base, outcome: "intercepted" };
		evasion = 1 - interceptChance * AD_DRONE_EVASION_PENALTY;
	}

	// Intercepted traffic gives the analyst a second source: detection rises
	// and, through `estimate`, the count error narrows with it.
	const intercepted = signalBonus(input.signalIntel ?? 0);
	for (const c of UNIT_CATEGORIES) {
		const p = Math.min(
			1,
			detectionChance(input.sensor, c, input.conditions) * evasion * (1 - (input.degradation ?? 0)) + intercepted
		);
		coverage[c] = p >= DETECTION_THRESHOLD ? round2(p) : 0;
	}
	if (UNIT_CATEGORIES.every((c) => coverage[c] === 0)) return { ...base, outcome: "obscured" };

	const byType = new Map<string, number>();
	for (const t of input.hostileUnitTypes) byType.set(t, (byType.get(t) ?? 0) + 1);
	const byCategory = new Map<UnitCategory, number>();
	for (const [t, n] of byType) {
		const c = UNIT_CATEGORY[t] ?? "infantry";
		byCategory.set(c, (byCategory.get(c) ?? 0) + n);
	}

	// Planted intel: categories the pass doesn't see through come out inflated
	// (plus decoy vehicles) or thinned out. The coverage stays honest, so the
	// sharpest pass in the fused picture usually carries the truth.
	if (input.deception) {
		const fooled = (c: UnitCategory) => coverage[c] > 0 && !seesThrough(input.deception!, coverage[c]);
		for (const [t, n] of byType) {
			if (fooled(UNIT_CATEGORY[t] ?? "infantry")) byType.set(t, deceivedCount(n, input.deception.magnitude));
		}
		if (input.deception.magnitude > 0 && fooled("vehicle")) {
			byType.set("armor", (byType.get("armor") ?? 0) + PSYOPS.DECOY_VEHICLES);
		}
		for (const [t, n] of [...byType]) if (n <= 0) byType.delete(t);
		byCategory.clear();
		for (const [t, n] of byType) {
			const c = UNIT_CATEGORY[t] ?? "infantry";
			byCategory.set(c, (byCategory.get(c) ?? 0) + n);
		}
	}

	for (const c of UNIT_CATEGORIES) {
		const n = byCategory.get(c) ?? 0;
		if (!coverage[c] || !n) continue;
		base.categories.push({ category: c, ...estimate(n, coverage[c], input.rng), confidence: coverage[c] });
	}
	if (s.identifiesTypes) {
		base.unitTypes = [...byType]
			.filter(([t]) => coverage[UNIT_CATEGORY[t] ?? "infantry"] > 0)
			.map(([unitType, n]) => ({
				unitType,
				...estimate(n, coverage[UNIT_CATEGORY[unitType] ?? "infantry"], input.rng)
			}));
	}
	if (s.detectsFiring && coverage.artillery > 0) {
		base.firingPositions = {
			count: input.recentlyFired ? estimate(input.recentlyFired, coverage.artillery, input.rng).count : 0,
			confidence: coverage.artillery
		};
	}
	if (s.seesBuildings) base.buildings = input.buildings;
	base.battle = input.battle;
	return base;
}

// ── Fusion ──────────────────────────────────────────────────────────────────

export interface ReportLike {
	id: number;
	sensor: string;
	findings: IntelFindings;
	observedAt: Date | string;
	expiresAt: Date | string;
}

export interface IntelPicture {
	/** 0-1: how much of the enemy's order of battle the passes could have seen. */
	confidence: number;
	level: "none" | "low" | "medium" | "high";
	categories: Record<UnitCategory, { coverage: number; count: number | null; estimated: boolean }>;
	unitTypes: { unitType: string; count: number; estimated: boolean }[] | null;
	/** Units seen across all observed categories (unknown categories excluded). */
	knownUnits: number;
	firingPositions: { count: number; confidence: number } | null;
	buildings: IntelFindings["buildings"];
	battle: IntelFindings["battle"];
	sensors: {
		reportId: number;
		sensor: string;
		outcome: IntelFindings["outcome"];
		observedAt: string;
		/** How much this pass still counts (1 = brand new, falls with age). */
		weight: number;
		/** Mean detection chance of the pass. */
		confidence: number;
	}[];
	latestObservedAt: string | null;
	expiresAt: string | null;
}

export const isFresh = (r: { expiresAt: Date | string }, now = new Date()) =>
	new Date(r.expiresAt).getTime() > now.getTime();

/** How much a report still counts: 1 when new, down to 1-INTEL_AGE_DECAY when it goes stale. */
export function reportWeight(observedAt: Date | string, now = new Date()) {
	const ageH = Math.max(0, (now.getTime() - new Date(observedAt).getTime()) / 3600_000);
	return Math.max(0, 1 - INTEL_AGE_DECAY * Math.min(1, ageH / INTEL_VALID_HOURS));
}

/**
 * Best fresh UAV (drone) spotting over a region, 0-1. Only passes that returned
 * imagery count, and their value decays with age exactly like picture weight.
 * Satellites don't spot for the guns: they can't hand over targets in time.
 */
export function uavCoverage(picture: Pick<IntelPicture, "sensors"> | null): number {
	if (!picture) return 0;
	let best = 0;
	for (const pass of picture.sensors) {
		if (pass.outcome !== "ok") continue;
		if (!SENSORS[pass.sensor as SensorId] || SENSORS[pass.sensor as SensorId]!.platform !== "drone") continue;
		best = Math.max(best, Math.max(0, Math.min(1, pass.weight)));
	}
	return round2(best);
}

/** Fuse a side's fresh passes over one region into one picture. */
export function fuseIntel(reports: ReportLike[], now = new Date()): IntelPicture {
	const fresh = reports
		.filter((r) => isFresh(r, now))
		.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());

	const categories = Object.fromEntries(
		UNIT_CATEGORIES.map((c) => [c, { coverage: 0, count: null, estimated: false }])
	) as IntelPicture["categories"];

	for (const c of UNIT_CATEGORIES) {
		let miss = 1;
		let best = 0;
		for (const r of fresh) {
			const p = (r.findings.coverage?.[c] ?? 0) * reportWeight(r.observedAt, now);
			if (!p) continue;
			miss *= 1 - p;
			if (p > best) {
				best = p;
				const seen = r.findings.categories.find((x) => x.category === c);
				categories[c].count = seen?.count ?? 0;
				categories[c].estimated = seen?.estimated ?? false;
			}
		}
		categories[c].coverage = round2(1 - miss);
	}

	const firstWith = <K extends keyof IntelFindings>(key: K) =>
		fresh.find((r) => r.findings.outcome === "ok" && r.findings[key] != null);
	const firing = firstWith("firingPositions");
	const confidence = round2(UNIT_CATEGORIES.reduce((s, c) => s + categories[c].coverage, 0) / UNIT_CATEGORIES.length);

	return {
		confidence,
		level: confidenceLevel(confidence),
		categories,
		unitTypes: firstWith("unitTypes")?.findings.unitTypes ?? null,
		knownUnits: UNIT_CATEGORIES.reduce((s, c) => s + (categories[c].count ?? 0), 0),
		firingPositions: firing
			? {
					count: firing.findings.firingPositions!.count,
					confidence: round2(firing.findings.firingPositions!.confidence * reportWeight(firing.observedAt, now))
				}
			: null,
		buildings: firstWith("buildings")?.findings.buildings ?? null,
		battle: firstWith("battle")?.findings.battle ?? null,
		sensors: fresh.map((r) => ({
			reportId: r.id,
			sensor: r.sensor,
			outcome: r.findings.outcome,
			observedAt: new Date(r.observedAt).toISOString(),
			weight: round2(reportWeight(r.observedAt, now)),
			confidence: round2(
				UNIT_CATEGORIES.reduce((s, c) => s + (r.findings.coverage?.[c] ?? 0), 0) / UNIT_CATEGORIES.length
			)
		})),
		latestObservedAt: fresh[0] ? new Date(fresh[0].observedAt).toISOString() : null,
		expiresAt: fresh.length
			? new Date(Math.max(...fresh.map((r) => new Date(r.expiresAt).getTime()))).toISOString()
			: null
	};
}

// ── Intel in combat ─────────────────────────────────────────────────────────

export interface SideModifiers {
	/** Picture confidence on the enemy (0-1). */
	confidence: number;
	/** Multiplier on every unit's output. */
	general: number;
	/** Extra multiplier on artillery and air strikes (targeting). */
	indirect: number;
	/** Share of this side's air strikes that get through enemy air defence. */
	airStrike: number;
	/** Share this side knocks off the enemy's artillery by counter-battery fire. */
	counterBattery: number;
	enemyAirDefence: number;
}

/** What a side's intel on the enemy (and the enemy's air defence) is worth this round. */
export function sideModifiers(input: {
	picture: Pick<IntelPicture, "confidence" | "firingPositions"> | null;
	ownArtilleryEngaged: boolean;
	enemyAirDefenceUnits: number;
	/** Best fresh drone pass over the target (0-1). */
	uavCoverage?: number;
	/** Drone spotting only reaches the guns near the front line. */
	nearFront?: boolean;
}): SideModifiers {
	const conf = Math.max(0, Math.min(1, input.picture?.confidence ?? 0));
	const fp = input.picture?.firingPositions;
	// UAV calls for fire are a bonus on top of the picture, and only when the
	// region is next to the front: deep in enemy territory the link is gone.
	const spot = input.nearFront ? Math.max(0, Math.min(1, input.uavCoverage ?? 0)) : 0;
	const indirect = COMBAT_INTEL.INDIRECT_FIRE_BLIND + (1 - COMBAT_INTEL.INDIRECT_FIRE_BLIND) * conf;
	return {
		confidence: conf,
		general: round2(COMBAT_INTEL.GENERAL_BLIND + (COMBAT_INTEL.GENERAL_FULL - COMBAT_INTEL.GENERAL_BLIND) * conf),
		indirect: round2(Math.min(COMBAT_INTEL.INDIRECT_FIRE_MAX, indirect * (1 + COMBAT_INTEL.UAV_SPOTTING_BONUS * spot))),
		airStrike: round2(airStrikeFactor(input.enemyAirDefenceUnits)),
		counterBattery:
			input.ownArtilleryEngaged && fp && fp.count > 0 ? round2(COMBAT_INTEL.COUNTER_BATTERY_MAX * fp.confidence) : 0,
		enemyAirDefence: input.enemyAirDefenceUnits
	};
}

/** Output multiplier for one unit, given its side's modifiers and the enemy's. */
export function unitIntelFactor(unitType: string, own: SideModifiers, enemy: SideModifiers): number {
	let f = own.general;
	if ((INDIRECT_FIRE_TYPES as readonly string[]).includes(unitType)) f *= own.indirect;
	if ((AIR_STRIKE_TYPES as readonly string[]).includes(unitType)) f *= own.airStrike;
	if (unitType === "artillery") f *= 1 - enemy.counterBattery;
	return f;
}

/** Neutral modifiers (no intel either way, no air defence): used where intel is unavailable. */
export const NEUTRAL_MODIFIERS: SideModifiers = sideModifiers({
	picture: null,
	ownArtilleryEngaged: false,
	enemyAirDefenceUnits: 0
});
