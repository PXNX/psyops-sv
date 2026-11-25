import { describe, expect, it } from "@rstest/core";
import { REVOLUTION_CONFIG, canStartRevolution, resolveFight, winsIndependence } from "../revolution.config";

describe("revolution rules", () => {
	it("only lets low civilian support start a rising", () => {
		expect(canStartRevolution(REVOLUTION_CONFIG.MAX_SUPPORT)).toBe(true);
		expect(canStartRevolution(REVOLUTION_CONFIG.MAX_SUPPORT - 1)).toBe(true);
		expect(canStartRevolution(REVOLUTION_CONFIG.MAX_SUPPORT + 1)).toBe(false);
	});

	it("needs at least three conspirators", () => {
		expect(REVOLUTION_CONFIG.MIN_MEMBERS).toBe(3);
	});

	it("treats a close fight as a draw and a clear loss as a defeat", () => {
		expect(resolveFight(120, 100)).toBe("victory");
		expect(resolveFight(100, 100)).toBe("draw");
		expect(resolveFight(95, 100)).toBe("draw");
		expect(resolveFight(60, 100)).toBe("defeat");
		expect(resolveFight(0, 0)).toBe("draw");
	});

	it("frees the region on a win or a draw, but not a defeat", () => {
		expect(winsIndependence("victory")).toBe(true);
		expect(winsIndependence("draw")).toBe(true);
		expect(winsIndependence("defeat")).toBe(false);
	});
});
