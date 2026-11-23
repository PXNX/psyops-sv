import { describe, expect, it } from "@rstest/core";
import { buildSeaScene, type SeaImageryInput } from "./sea-image";

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
});
