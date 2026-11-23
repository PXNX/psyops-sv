// Disease spread, mortality and the protection buildings provide.
import { describe, expect, it } from "@rstest/core";
import {
	DISEASES,
	diseaseDeaths,
	diseaseHarmFactor,
	diseaseRecoveries,
	diseaseSpread
} from "../diseases.config";

describe("disease protection", () => {
	it("lets more harm through when hospitals, water and nutrition fail", () => {
		const disease = DISEASES.cholera;
		const healthy = diseaseHarmFactor(disease, { hospital: 1, water: 1, nutrition: 1 });
		const broke = diseaseHarmFactor(disease, { hospital: 0, water: 0, nutrition: 0 });
		expect(healthy).toBeLessThan(broke);
		expect(broke).toBeGreaterThan(0);
	});

	it("weighs clean water more heavily for cholera than for influenza", () => {
		const protection = { hospital: 0, water: 1, nutrition: 0 };
		expect(diseaseHarmFactor(DISEASES.cholera, protection)).toBeLessThan(
			diseaseHarmFactor(DISEASES.influenza, protection)
		);
	});
});

describe("disease numbers", () => {
	it("spreads, kills and recovers proportionally to cases and harm", () => {
		const disease = DISEASES.influenza;
		expect(diseaseSpread(disease, 100, 1)).toBeGreaterThan(diseaseSpread(disease, 100, 0.2));
		expect(diseaseDeaths(disease, 1000, 1)).toBeGreaterThan(diseaseDeaths(disease, 1000, 0.2));
		expect(diseaseRecoveries(disease, 100)).toBeGreaterThan(0);
		expect(diseaseDeaths(disease, 0, 1)).toBe(0);
	});
});
