import { describe, expect, it } from "@rstest/core";
import { buildSeaScene, seaLandAt, type SeaImageryInput } from "./sea-image";

const frame = (over: Partial<SeaImageryInput> = {}): SeaImageryInput => ({
	seed: 1234,
	sensor: "sonar",
	observedAt: "2026-11-22T12:00:00.000Z",
	night: false,
	weather: "clear",
	coastal: false,
	contacts: { surface: 2, sub: 1, mine: 3 },
	confidence: 0.8,
	...over
});

describe("sea imagery", () => {
	it("is deterministic for the same pass", () => {
		const a = buildSeaScene(frame());
		const b = buildSeaScene(frame());
		expect(JSON.stringify(a.detections)).toBe(JSON.stringify(b.detections));
		expect(JSON.stringify(a.objects)).toBe(JSON.stringify(b.objects));
	});

	it("draws the contacts the report found", () => {
		const scene = buildSeaScene(frame());
		const labels = scene.detections.map((d) => d.label);
		expect(labels).toContain("SURFACE CONTACT");
		expect(labels).toContain("SUBSURFACE CONTACT");
		expect(labels).toContain("MINEFIELD");
		expect(scene.sprites).toBe(6);
	});

	it("adds a shoreline and port for coastal regions", () => {
		const open = buildSeaScene(frame());
		const coast = buildSeaScene(frame({ coastal: true, port: true }));
		expect(coast.features.length).toBeGreaterThan(open.features.length);
		expect(coast.detections.some((d) => d.label === "PORT")).toBe(true);
		expect(coast.notes.some((n) => n.includes("Shoreline"))).toBe(true);
	});

	it("looks different in EO and SAR", () => {
		const eo = buildSeaScene(frame({ sensor: "sat_eo" }));
		const sar = buildSeaScene(frame({ sensor: "sat_sar" }));
		expect(eo.mode).toBe("eo");
		expect(sar.mode).toBe("sar");
		expect(eo.base).not.toBe(sar.base);
		expect(sar.tone.speckle).toBeGreaterThan(eo.tone.speckle);
	});

	it("keeps every hull and mine off the land, synthetic shore or real outline", () => {
		// A blobby island outline, as the world map would give it.
		const outline = Array.from({ length: 30 }, (_, k) => {
			const a = (k / 30) * Math.PI * 2;
			const r = 40 + Math.sin(a * 3) * 8;
			return { x: 100 + Math.cos(a) * r * 1.4, y: 80 + Math.sin(a) * r };
		});
		const wrong: string[] = [];
		let hulls = 0;
		for (let seed = 1; seed <= 80; seed++) {
			for (const coastline of [undefined, outline]) {
				const f = frame({
					seed,
					coastal: true,
					port: seed % 2 === 0,
					coastline,
					contacts: { surface: 5, sub: 2, mine: 6 }
				});
				const land = seaLandAt(f);
				for (const p of buildSeaScene(f).placements ?? []) {
					hulls++;
					const bad = p.foot.find((q) => land(q));
					if (bad) wrong.push(`#${seed} ${p.what} at ${bad.map(Math.round).join(",")}`);
				}
			}
		}
		expect(wrong).toEqual([]);
		expect(hulls).toBeGreaterThan(1000);
	});
});
