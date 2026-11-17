import { describe, expect, it } from "@rstest/core";
import { EXPLOITATION_POLICY_KEYS, estimatedShiftsLeft, mineYield } from "../../../config/game/resources.config";

describe("mineYield", () => {
	it("gives full output from a full deposit at the standard law", () => {
		expect(mineYield(10, "standard", 1000, 1000)).toEqual({ produced: 10, depleted: 10, richness: 1 });
	});

	it("yields less as the deposit runs low", () => {
		const full = mineYield(100, "standard", 1000, 1000).produced;
		const half = mineYield(100, "standard", 1000, 500).produced;
		const low = mineYield(100, "standard", 1000, 50).produced;
		expect(full).toBeGreaterThan(half);
		expect(half).toBeGreaterThan(low);
		expect(low).toBeGreaterThanOrEqual(25); // never below the 25% floor while something is left
	});

	it("produces nothing from an empty deposit or a region without one", () => {
		expect(mineYield(10, "unrestricted", 1000, 0).produced).toBe(0);
		expect(mineYield(10, "standard", 0, 0).produced).toBe(0);
	});

	it("never takes more than is left", () => {
		const y = mineYield(100, "unrestricted", 1000, 7);
		expect(y.depleted).toBeLessThanOrEqual(7);
		expect(y.produced).toBeGreaterThan(0);
	});

	it("orders the laws: more output and faster depletion the harder the law", () => {
		const yields = EXPLOITATION_POLICY_KEYS.map((p) => mineYield(100, p, 10_000, 10_000));
		for (let i = 1; i < yields.length; i++) {
			expect(yields[i]!.produced).toBeGreaterThan(yields[i - 1]!.produced);
			expect(yields[i]!.depleted / yields[i]!.produced).toBeGreaterThanOrEqual(
				yields[i - 1]!.depleted / yields[i - 1]!.produced
			);
		}
	});

	it("makes conservation get more out of a deposit in total, unrestricted less", () => {
		const total = (policy: (typeof EXPLOITATION_POLICY_KEYS)[number]) => {
			let left = 5000;
			let got = 0;
			for (let i = 0; i < 10_000 && left > 0; i++) {
				const y = mineYield(10, policy, 5000, left);
				if (!y.depleted) break;
				got += y.produced;
				left -= y.depleted;
			}
			return got;
		};
		expect(total("conservation")).toBeGreaterThan(total("standard"));
		expect(total("standard")).toBeGreaterThan(total("unrestricted"));
	});
});

describe("estimatedShiftsLeft", () => {
	it("is shorter under harsher laws", () => {
		expect(estimatedShiftsLeft(10, "conservation", 5000, 5000)).toBeGreaterThan(
			estimatedShiftsLeft(10, "unrestricted", 5000, 5000)
		);
	});
});
