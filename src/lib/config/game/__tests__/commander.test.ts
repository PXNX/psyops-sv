import { describe, expect, it } from "@rstest/core";
import {
	COMMANDER_MAX_LEVEL,
	commanderLevel,
	commanderModifiers,
	rollTraitCount,
	rollTraits
} from "../commander.config.js";

describe("commanders", () => {
	it("rolls between zero and three distinct traits", () => {
		for (let i = 0; i < 200; i++) {
			const traits = rollTraits();
			expect(traits.length).toBeGreaterThanOrEqual(0);
			expect(traits.length).toBeLessThanOrEqual(3);
			expect(new Set(traits).size).toBe(traits.length);
		}
		expect(rollTraitCount(() => 0)).toBe(0);
	});

	it("caps experience at ten levels and applies small bonuses", () => {
		expect(commanderLevel(0)).toBe(0);
		expect(commanderLevel(1000)).toBe(COMMANDER_MAX_LEVEL);
		const rookie = commanderModifiers([], 0);
		const veteran = commanderModifiers([], 1000);
		expect(veteran.attack).toBeGreaterThan(rookie.attack);
		expect(veteran.attack).toBeLessThan(1.2);
	});

	it("applies trait trade-offs, wounds and death", () => {
		const bold = commanderModifiers(["bold"]);
		expect(bold.attack).toBeGreaterThan(1);
		expect(bold.defense).toBeLessThan(1);
		const wounded = commanderModifiers(["bold"], 0, 30);
		expect(wounded.attack).toBeLessThan(bold.attack);
		const killed = commanderModifiers(["bold"], 0, 0, false);
		expect(killed).toEqual({ attack: 1, defense: 1, speed: 1, intel: 1 });
	});
});
