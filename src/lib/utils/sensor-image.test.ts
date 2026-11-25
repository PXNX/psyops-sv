// Procedural recon imagery: determinism, what weather and darkness do to each
// sensor, bounded output for big forces, and that the frame shows what the
// report says (planted decoys included), not the ground truth.
import { describe, expect, it } from "@rstest/core";
import { buildScene, waterAt, type ImageryFindings, type ImageryInput } from "./sensor-image";
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

	it("gives lakes, shores, fields and cities their own ground detail", () => {
		const sceneFor = (terrain: string) => buildScene(input("sat_eo", findings(), { terrain }));
		const plains = sceneFor("plains");
		const ground = (s: typeof plains) => JSON.stringify(s.ground);
		expect(ground(sceneFor("lake"))).not.toBe(ground(plains));
		expect(ground(sceneFor("shore"))).not.toBe(ground(plains));
		expect(ground(sceneFor("fields"))).not.toBe(ground(plains));
		// The shoreline and its reeds are drawn as vector features, not images.
		expect(sceneFor("shore").features.length).toBeGreaterThan(plains.features.length);
		// Denser settlement: more roofs in a city than a town.
		const roofs = (s: typeof plains) => s.features.filter((p) => p.k === "rect").length;
		expect(roofs(sceneFor("city"))).toBeGreaterThan(roofs(sceneFor("town")));
	});

	it("puts the sea off one edge of a coastal region, with beach, surf and roads that stop at the water", () => {
		const shore = buildScene(input("sat_eo", findings(), { terrain: "shore", infrastructure: 3 }));
		const fills = shore.features.filter((p) => p.k === "path" && p.fill && p.fill !== "none");
		// Shallows to deep water: four nested sea bands.
		expect(fills.length).toBeGreaterThanOrEqual(4);
		expect(shore.features.some((p) => p.k === "path" && p.dash)).toBe(true);
		// The same coast on every pass over the region, whatever the sensor.
		const sea = (s: typeof shore) =>
			s.features
				.filter((p) => p.k === "path" && p.fill?.startsWith("rgb") && p.d.endsWith("Z"))
				.map((p) => (p.k === "path" ? p.d : ""));
		const sar = buildScene(input("sat_sar", findings(), { terrain: "shore", infrastructure: 3, reportId: 77 }));
		expect(sea(sar)).toEqual(sea(shore));
		// Different regions put the sea on different sides.
		const sides = new Set(
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((regionId) => {
				const s = buildScene(input("sat_eo", findings(), { terrain: "shore", regionId }));
				return sea(s)[0]?.slice(0, 12);
			})
		);
		expect(sides.size).toBeGreaterThan(3);
	});

	it("builds up the ground with the region's infrastructure", () => {
		const roofs = (infrastructure: number) =>
			buildScene(input("sat_eo", findings({ buildings: null }), { terrain: "town", infrastructure })).features.filter(
				(p) => p.k === "rect"
			).length;
		expect(roofs(5)).toBeGreaterThan(roofs(0));
	});

	it("lights settlements at night, warms dawn and dusk and snows over the ground in winter", () => {
		const night = { weather: "clear", night: true, cover: "open" };
		const town = { terrain: "town", infrastructure: 4 };
		const dark = buildScene(input("sat_eo", findings({ conditions: night }), town));
		expect(dark.lights.length).toBeGreaterThan(10);
		expect(buildScene(input("sat_eo", findings(), town)).lights.length).toBe(0);
		// 07:00 local at lon 0 is golden hour; noon is not.
		const dawn = buildScene(input("sat_eo", findings(), { lon: 0, observedAt: "2026-06-19T07:00:00.000Z" }));
		expect(dawn.tone.tint).not.toBeNull();
		expect(buildScene(input("sat_eo", findings(), { lon: 0 })).tone.tint).toBeNull();
		// January at 60°N is snowy; July is not; the south has its winter in July.
		const jan = buildScene(input("sat_eo", findings(), { lat: 60, observedAt: "2026-01-15T12:00:00.000Z" }));
		const jul = buildScene(input("sat_eo", findings(), { lat: 60, observedAt: "2026-07-15T12:00:00.000Z" }));
		expect(jan.tone.snow).toBeGreaterThan(0.5);
		expect(jul.tone.snow).toBe(0);
		expect(
			buildScene(input("sat_eo", findings(), { lat: -60, observedAt: "2026-07-15T12:00:00.000Z" })).tone.snow
		).toBeGreaterThan(0.5);
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
		for (const sensor of ["sat_eo", "drone_ir", "sat_sar"]) {
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

	it("draws the air-defence radars the report saw, and nothing when it saw none", () => {
		const site = { infrastructure: 2, economy: 3, hospitals: 1, fortifications: 4, underConstruction: 0 };
		const seen = buildScene(input("sat_eo", findings({ buildings: { ...site, radar: 2 } })));
		const radar = seen.detections.filter((d) => d.icon === "radar");
		expect(radar).toHaveLength(1);
		expect(radar[0]!.label).toContain("×2");
		expect(radar[0]!.detail).toBe("RADAR L2");
		expect(buildScene(input("sat_eo", findings())).detections.some((d) => d.icon === "radar")).toBe(false);
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

	describe("land and water", () => {
		const force = (battle: boolean) =>
			findings({
				categories: [
					{ category: "vehicle", count: 14, estimated: false, confidence: 0.85 },
					{ category: "artillery", count: 6, estimated: false, confidence: 0.8 },
					{ category: "infantry", count: 20, estimated: true, confidence: 0.6 },
					{ category: "air", count: 6, estimated: false, confidence: 0.9 },
					{ category: "naval", count: 3, estimated: false, confidence: 0.9 }
				],
				unitTypes: [
					{ unitType: "armor", count: 6, estimated: false },
					{ unitType: "mechanized", count: 5, estimated: false },
					{ unitType: "air_defence", count: 3, estimated: false },
					{ unitType: "artillery", count: 6, estimated: false },
					{ unitType: "fighter_squadron", count: 3, estimated: false },
					{ unitType: "bomber_squadron", count: 3, estimated: false }
				],
				buildings: { infrastructure: 3, economy: 3, hospitals: 1, fortifications: 10, underConstruction: 2, radar: 2 },
				battle: battle ? { id: 1, phase: "active" } : null
			});
		const TERRAINS = ["shore", "lake", "plains", "fields", "town", "hills", "forest", "city"];
		const SENSORS = ["sat_eo", "drone_eo", "drone_ir", "sat_sar"];

		it("puts every vehicle, aircraft and building on land and every ship on water, across many seeds", () => {
			const wrong: string[] = [];
			let ships = 0;
			let ground = 0;
			for (const terrain of TERRAINS) {
				for (let regionId = 1; regionId <= 24; regionId++) {
					const wet = waterAt(regionId, terrain, 3);
					for (const sensor of SENSORS) {
						const s = buildScene(
							input(sensor, force(regionId % 2 === 0), {
								terrain,
								regionId,
								reportId: regionId * 31,
								infrastructure: 3
							})
						);
						for (const pl of s.placements ?? []) {
							if (pl.on === "water") ships++;
							else ground++;
							const bad = pl.foot.filter((q) => wet(q) !== (pl.on === "water"));
							if (bad.length) wrong.push(`${terrain} #${regionId} ${sensor}: ${pl.what} at ${JSON.stringify(bad[0])}`);
						}
					}
				}
			}
			expect(wrong).toEqual([]);
			expect(ground).toBeGreaterThan(5000);
			expect(ships).toBeGreaterThan(200);
		});

		it("draws ships only where there is water, warships only at sea, and says so when a landlocked frame has naval units", () => {
			for (let regionId = 1; regionId <= 12; regionId++) {
				const dry = buildScene(input("sat_eo", force(false), { terrain: "fields", regionId, infrastructure: 3 }));
				expect(dry.placements!.filter((p) => p.on === "water")).toHaveLength(0);
				expect(dry.detections.some((d) => d.icon === "ship")).toBe(false);
				expect(dry.notes).toContain("Naval units reported; no open sea in frame");
				// A lake gets boats, never warships.
				const lake = buildScene(input("sat_eo", force(false), { terrain: "lake", regionId, infrastructure: 3 }));
				expect(lake.placements!.some((p) => p.what === "warship")).toBe(false);
				expect(lake.notes).toContain("Naval units reported; no open sea in frame");
				const coast = buildScene(input("sat_eo", force(false), { terrain: "shore", regionId, infrastructure: 3 }));
				expect(coast.placements!.some((p) => p.what === "warship")).toBe(true);
				expect(coast.detections.some((d) => d.icon === "ship")).toBe(true);
			}
		});

		it("keeps the layout deterministic per report", () => {
			for (const terrain of ["shore", "lake"]) {
				const a = buildScene(input("drone_eo", force(true), { terrain, regionId: 5, infrastructure: 3 }));
				const b = buildScene(input("drone_eo", force(true), { terrain, regionId: 5, infrastructure: 3 }));
				expect(JSON.stringify(a)).toBe(JSON.stringify(b));
				expect(a.placements!.length).toBeGreaterThan(20);
			}
		});

		it("adds terrain detail without blowing up the node count", () => {
			for (const terrain of TERRAINS) {
				const s = buildScene(input("sat_eo", force(true), { terrain, regionId: 3, infrastructure: 3 }));
				const nodes = s.ground.length + s.features.length + s.objects.length + s.effects.length + s.atmosphere.length;
				expect(nodes).toBeLessThan(1500);
			}
		});
	});
});
