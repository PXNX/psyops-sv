// Procedural recon imagery: determinism, what weather and darkness do to each
// sensor, bounded output for big forces, and that the frame shows what the
// report says (planted decoys included), not the ground truth.
import { describe, expect, it } from "@rstest/core";
import { buildScene, type ImageryFindings, type ImageryInput } from "./sensor-image";
import { scanRegion } from "../server/services/military/intel";

function findings(over: Partial<ImageryFindings> = {}): ImageryFindings {
	return {
		outcome: "ok",
		conditions: { weather: "clear", night: false, cover: "open" },
		airDefence: null,
		coverage: { infantry: 0.7, vehicle: 0.85, artillery: 0.8, air: 0.9 },
		categories: [
			{ category: "vehicle", count: 6, estimated: false, confidence: 0.85 },
			{ category: "artillery", count: 3, estimated: true, confidence: 0.8 }
		],
		unitTypes: [
			{ unitType: "armor", count: 6, estimated: false },
			{ unitType: "artillery", count: 3, estimated: true }
		],
		firingPositions: null,
		buildings: { infrastructure: 2, economy: 3, hospitals: 1, fortifications: 4, underConstruction: 0 },
		battle: null,
		...over
	};
}

function input(sensor: string, f: ImageryFindings, over: Partial<ImageryInput> = {}): ImageryInput {
	return {
		reportId: 42,
		regionId: 7,
		sensor,
		observedAt: "2026-11-19T12:00:00.000Z",
		lat: 50.1,
		lon: 14.4,
		terrain: "plains",
		strikes: [],
		findings: f,
		...over
	};
}

const units = (s: ReturnType<typeof buildScene>) => s.detections.filter((d) => d.kind === "unit" || d.kind === "track");
const countOf = (s: ReturnType<typeof buildScene>, label: string) =>
	s.detections
		.filter((d) => d.label === label)
		.reduce((n, d) => n + Number(/×~?(\d+)/.exec(d.detail ?? "")?.[1] ?? 0), 0);

describe("sensor imagery", () => {
	it("is deterministic per report", () => {
		const a = buildScene(input("sat_eo", findings()));
		const b = buildScene(input("sat_eo", findings()));
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
		const other = buildScene(input("sat_eo", findings(), { reportId: 43, regionId: 8 }));
		expect(JSON.stringify(other)).not.toBe(JSON.stringify(a));
	});

	it("keeps a region's terrain across passes", () => {
		const a = buildScene(input("sat_eo", findings()));
		const b = buildScene(input("sat_sar", findings(), { reportId: 99 }));
		const shapes = (s: typeof a) =>
			s.ground
				.filter((p) => p.k === "path" && !p.fill?.startsWith("pat:furrow"))
				.map((p) => (p.k === "path" ? p.d : ""));
		expect(shapes(a)).toEqual(shapes(b));
	});

	it("clouds occlude EO but not SAR", () => {
		const cloudy = { weather: "cloudy", night: false, cover: "open" };
		const eo = buildScene(input("sat_eo", findings({ outcome: "obscured", conditions: cloudy, categories: [] })));
		const sar = buildScene(input("sat_sar", findings({ conditions: cloudy })));
		const sarClear = buildScene(input("sat_sar", findings()));
		expect(eo.visibility).toBeLessThan(0.25);
		expect(eo.atmosphere.length).toBeGreaterThan(10);
		expect(sar.visibility).toBe(1);
		expect(sar.atmosphere.length).toBe(0);
		expect(sar.visibility).toBe(sarClear.visibility);
		// IR gets partly through.
		const ir = buildScene(input("sat_ir", findings({ conditions: cloudy })));
		expect(ir.visibility).toBeGreaterThan(eo.visibility);
		expect(ir.visibility).toBeLessThan(1);
	});

	it("night darkens EO but not IR or SAR", () => {
		const night = { weather: "clear", night: true, cover: "open" };
		const eoDay = buildScene(input("drone_eo", findings()));
		const eoNight = buildScene(input("drone_eo", findings({ conditions: night })));
		const irDay = buildScene(input("drone_ir", findings()));
		const irNight = buildScene(input("drone_ir", findings({ conditions: night })));
		expect(eoNight.tone.darkness).toBeGreaterThan(0.7);
		expect(eoNight.brightness).toBeLessThan(eoDay.brightness * 0.3);
		expect(irNight.tone.darkness).toBe(0);
		expect(irNight.brightness).toBeGreaterThan(irDay.brightness * 0.6);
		expect(buildScene(input("sat_sar", findings({ conditions: night }))).tone.darkness).toBe(0);
	});

	it("draws a bounded number of sprites and boxes for a large force, with labels summing to the count", () => {
		const big = findings({
			categories: [
				{ category: "vehicle", count: 40, estimated: true, confidence: 0.9 },
				{ category: "infantry", count: 120, estimated: true, confidence: 0.6 },
				{ category: "artillery", count: 25, estimated: false, confidence: 0.8 },
				{ category: "air", count: 18, estimated: false, confidence: 0.9 }
			],
			unitTypes: null
		});
		for (const sensor of ["sat_eo", "drone_ir", "sat_sar", "ground_radar"]) {
			const s = buildScene(input(sensor, big));
			expect(s.sprites).toBeLessThanOrEqual(70);
			expect(s.detections.length).toBeLessThanOrEqual(12);
			const prims = s.ground.length + s.features.length + s.objects.length + s.effects.length + s.atmosphere.length;
			expect(prims).toBeLessThan(1200);
		}
		expect(countOf(buildScene(input("sat_eo", big)), "VEHICLES")).toBe(40);
	});

	it("shows no units on an obscured or intercepted pass", () => {
		const lost = buildScene(
			input("drone_eo", findings({ outcome: "intercepted", airDefence: { units: 3 }, categories: [], unitTypes: null }))
		);
		expect(units(lost)).toHaveLength(0);
		expect(lost.tone.static).toBeGreaterThan(0);
		expect(lost.detections.some((d) => d.label === "SAM SITE")).toBe(true);
	});

	it("moving units in a battle leave dust and tracks; static ones dig in", () => {
		const still = buildScene(input("drone_eo", findings()));
		const moving = buildScene(input("drone_eo", findings({ battle: { id: 1, phase: "active" } })));
		expect(moving.detections.some((d) => d.label === "CONTACT AREA")).toBe(true);
		expect(moving.effects.length).toBeGreaterThan(still.effects.length);
	});

	it("shows strike damage from before the pass, fires only while fresh", () => {
		const strike = (hoursBefore: number) => [
			{ id: 5, target: "fortifications", weapon: "guided_bomb", outcome: "hit", hoursBefore }
		];
		const fresh = buildScene(input("sat_eo", findings(), { strikes: strike(2) }));
		const old = buildScene(input("sat_eo", findings(), { strikes: strike(30) }));
		const none = buildScene(input("sat_eo", findings(), { strikes: [] }));
		expect(fresh.detections.some((d) => d.icon === "fire")).toBe(true);
		expect(old.detections.some((d) => d.label === "IMPACT CRATERS")).toBe(true);
		expect(none.detections.some((d) => d.kind === "damage")).toBe(false);
	});

	it("renders what a deceived report says, decoys included", () => {
		const rng = () => 0.5;
		const scan = (deception: { magnitude: number; roll: number } | null) =>
			scanRegion({
				sensor: "sat_eo",
				conditions: { weather: "clear", night: false, cover: "open" },
				hostileUnitTypes: ["armor", "armor"],
				recentlyFired: 0,
				airDefenceUnits: 0,
				owner: { id: 2, name: "B" },
				buildings: null,
				battle: null,
				rng,
				deception
			});
		const honest = scan(null);
		const fooled = scan({ magnitude: 100, roll: 0.99 });
		const armour = (f: typeof honest) => f.unitTypes?.find((t) => t.unitType === "armor")?.count ?? 0;
		expect(armour(fooled)).toBeGreaterThan(armour(honest));
		const a = buildScene(input("sat_eo", honest));
		const b = buildScene(input("sat_eo", fooled));
		expect(countOf(b, "ARMOR")).toBe(armour(fooled));
		expect(b.sprites).toBeGreaterThan(a.sprites);
	});
});
