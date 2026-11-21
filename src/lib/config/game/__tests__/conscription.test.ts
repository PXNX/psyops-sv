// Conscription is a band, and the band reaches workforce, births and deaths.
import { describe, expect, it } from "@rstest/core";
import {
	CONSCRIPTION_BANDS,
	conscriptionBand,
	conscriptionPressure,
	conscriptionWorkforce
} from "../conscription.config";

describe("conscription pressure", () => {
	it("counts soldiers against civilians plus soldiers", () => {
		expect(conscriptionPressure(0, 100_000)).toBe(0);
		expect(conscriptionPressure(10_000, 190_000)).toBe(50);
	});

	it("maps pressure to the right band at each boundary", () => {
		expect(conscriptionBand(0).key).toBe("volunteer");
		expect(conscriptionBand(9.9).key).toBe("volunteer");
		expect(conscriptionBand(10).key).toBe("limited");
		expect(conscriptionBand(30).key).toBe("general");
		expect(conscriptionBand(80).key).toBe("total");
	});

	it("shrinks the workforce, births and welfare as the draft deepens", () => {
		const factors = CONSCRIPTION_BANDS.map((b) => b);
		for (let i = 1; i < factors.length; i++) {
			expect(factors[i]!.workforceFactor).toBeLessThan(factors[i - 1]!.workforceFactor);
			expect(factors[i]!.replicationFactor).toBeLessThan(factors[i - 1]!.replicationFactor);
			expect(factors[i]!.mortalityAdd).toBeGreaterThan(factors[i - 1]!.mortalityAdd);
			expect(factors[i]!.stability).toBeLessThan(factors[i - 1]!.stability);
		}
		expect(conscriptionWorkforce(0)).toBe(1);
		expect(conscriptionWorkforce(100)).toBeLessThan(1);
	});
});
