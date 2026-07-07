import { describe, it, expect } from "@rstest/core";
import {
	EXERCISE_CONFIG,
	getExperienceLevel,
	getExperienceCombatModifier,
	calculateExerciseExperienceGain,
	calculateCombatExperienceLoss
} from "../../../config/game/exercise.config";

describe("Experience - Levels", () => {
	it("classifies recruit at the bottom of the range", () => {
		expect(getExperienceLevel(0).key).toBe("recruit");
		expect(getExperienceLevel(19).key).toBe("recruit");
	});

	it("classifies trained/regular/veteran/elite at their thresholds", () => {
		expect(getExperienceLevel(20).key).toBe("trained");
		expect(getExperienceLevel(40).key).toBe("regular");
		expect(getExperienceLevel(60).key).toBe("veteran");
		expect(getExperienceLevel(80).key).toBe("elite");
		expect(getExperienceLevel(100).key).toBe("elite");
	});
});

describe("Experience - Combat modifier", () => {
	it("gives no bonus to recruits", () => {
		expect(getExperienceCombatModifier(0)).toBe(1);
	});

	it("scales up with higher levels", () => {
		expect(getExperienceCombatModifier(40)).toBeCloseTo(1.1);
		expect(getExperienceCombatModifier(80)).toBeCloseTo(1.2);
	});
});

describe("Exercise - Experience gain", () => {
	it("adds the configured gain", () => {
		expect(calculateExerciseExperienceGain(0)).toBe(EXERCISE_CONFIG.EXPERIENCE_GAIN);
	});

	it("caps at MAX_EXPERIENCE", () => {
		expect(calculateExerciseExperienceGain(EXERCISE_CONFIG.MAX_EXPERIENCE - 5)).toBe(EXERCISE_CONFIG.MAX_EXPERIENCE);
	});

	it("does not gain when already at or above the cap", () => {
		expect(calculateExerciseExperienceGain(EXERCISE_CONFIG.MAX_EXPERIENCE)).toBe(EXERCISE_CONFIG.MAX_EXPERIENCE);
		expect(calculateExerciseExperienceGain(90)).toBe(90);
	});
});

describe("Exercise - Combat experience loss", () => {
	it("returns 0 with no experience or no casualties", () => {
		expect(calculateCombatExperienceLoss(0, 50)).toBe(0);
		expect(calculateCombatExperienceLoss(50, 0)).toBe(0);
	});

	it("loses experience proportional to casualties", () => {
		// 50 exp, 50 strength lost -> 50 * 0.5 * 0.8 = 20
		expect(calculateCombatExperienceLoss(50, 50)).toBe(20);
	});

	it("never loses more than the current experience", () => {
		expect(calculateCombatExperienceLoss(10, 100)).toBeLessThanOrEqual(10);
	});

	it("treats casualties above full strength as total loss fraction", () => {
		// strengthLost clamps at 100% -> 60 * 1 * 0.8 = 48
		expect(calculateCombatExperienceLoss(60, 150)).toBe(48);
	});
});
