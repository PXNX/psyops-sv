// Generated people behind network assets: names, faces and rare traits.
import { describe, expect, it } from "@rstest/core";
import {
	INFILTRATION,
	RARE_SPY_TRAIT_CHANCE,
	RARE_SPY_TRAIT_IDS,
	SPY_TRAITS,
	effectiveHeat,
	rollSpyTraits,
	spyName,
	spyPortrait,
	spyTraitModifiers
} from "#lib/config/index.js";

/** Small deterministic PRNG so the roll statistics are stable. */
function lcg(seed: number) {
	let s = seed >>> 0;
	return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

describe("spy names and faces", () => {
	it("are deterministic and varied", () => {
		expect(spyName(12345)).toBe(spyName(12345));
		const names = new Set(Array.from({ length: 2000 }, (_, i) => spyName(i * 2654435761)));
		expect(names.size).toBeGreaterThan(1500);
		const portraits = new Set(Array.from({ length: 500 }, (_, i) => spyPortrait(i * 2654435761)));
		expect(portraits.size).toBeGreaterThan(450);
	});
});

describe("rare traits", () => {
	it("exist, are flagged and roll at roughly the configured rate", () => {
		expect(RARE_SPY_TRAIT_IDS.length).toBeGreaterThanOrEqual(5);
		const rng = lcg(7);
		let rare = 0;
		const runs = 20_000;
		for (let i = 0; i < runs; i++) {
			const traits = rollSpyTraits(rng);
			expect(new Set(traits).size).toBe(traits.length);
			const rares = traits.filter((id) => SPY_TRAITS[id].rare);
			expect(rares.length).toBeLessThanOrEqual(1);
			rare += rares.length;
		}
		expect(rare / runs).toBeGreaterThan(RARE_SPY_TRAIT_CHANCE * 0.8);
		expect(rare / runs).toBeLessThan(RARE_SPY_TRAIT_CHANCE * 1.2);
	});

	it("have real effects: faster cooling and immunity to turning", () => {
		expect(spyTraitModifiers(["ideologue"]).flip).toBe(0);
		expect(spyTraitModifiers(["cabinet_confidant"]).access).toBe(1);
		const lastActionAt = new Date("2026-01-01T00:00:00Z");
		const later = new Date(lastActionAt.getTime() + 10 * 3600_000);
		const plain = effectiveHeat({ heat: 80, lastActionAt }, later);
		const sleeper = effectiveHeat({ heat: 80, lastActionAt, traitIds: ["sleeper"] }, later);
		expect(plain).toBe(80 - 10 * INFILTRATION.HEAT_DECAY_PER_HOUR);
		expect(sleeper).toBeLessThan(plain);
	});
});
