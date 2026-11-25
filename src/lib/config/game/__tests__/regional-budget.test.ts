import { describe, expect, it } from "@rstest/core";
import {
	MAX_PROGRAMME_OPINION,
	REGIONAL_PROGRAMMES,
	REGIONAL_SHARE,
	checkProgramme,
	clampRegionalShare,
	effectiveRegionalShare,
	programmeOpinion,
	splitTax
} from "../regional-budget.config";

describe("splitTax", () => {
	it("gives the region its share and the state the rest", () => {
		expect(splitTax(1000, 20)).toEqual({ regional: 200, state: 800 });
		expect(splitTax(1000, 0)).toEqual({ regional: 0, state: 1000 });
	});

	it("rounds the region down so the parts always add up", () => {
		const { regional, state } = splitTax(999, 33);
		expect(regional).toBe(329);
		expect(regional + state).toBe(999);
	});

	it("never hands out more than the maximum share", () => {
		expect(splitTax(1000, 90)).toEqual({ regional: 500, state: 500 });
		expect(splitTax(1000, -10)).toEqual({ regional: 0, state: 1000 });
	});

	it("treats junk amounts as nothing", () => {
		expect(splitTax(Number.NaN, 20)).toEqual({ regional: 0, state: 0 });
		expect(splitTax(-50, 20)).toEqual({ regional: 0, state: 0 });
	});
});

describe("shares", () => {
	it("clamps to 0-50 and rounds", () => {
		expect(clampRegionalShare(75)).toBe(REGIONAL_SHARE.MAX);
		expect(clampRegionalShare(-1)).toBe(0);
		expect(clampRegionalShare(12.6)).toBe(13);
		expect(clampRegionalShare(Number.NaN)).toBe(REGIONAL_SHARE.DEFAULT);
	});

	it("a region override beats the state share, including an override of 0", () => {
		expect(effectiveRegionalShare(20, null)).toBe(20);
		expect(effectiveRegionalShare(20, 35)).toBe(35);
		expect(effectiveRegionalShare(20, 0)).toBe(0);
		expect(effectiveRegionalShare(null, undefined)).toBe(REGIONAL_SHARE.DEFAULT);
	});
});

describe("checkProgramme", () => {
	const festival = REGIONAL_PROGRAMMES.festival;

	it("lets the governor fund a programme the budget covers", () => {
		expect(checkProgramme({ kind: "festival", balance: festival.cost, running: [], isGovernor: true })).toEqual({
			ok: true,
			problems: []
		});
	});

	it("refuses anyone but the governor", () => {
		const r = checkProgramme({ kind: "festival", balance: 1e9, running: [], isGovernor: false });
		expect(r.ok).toBe(false);
		expect(r.problems[0]).toMatch(/governor/);
	});

	it("refuses when the budget is short, and says by how much", () => {
		const r = checkProgramme({ kind: "festival", balance: festival.cost - 1, running: [], isGovernor: true });
		expect(r.ok).toBe(false);
		expect(r.problems.join(" ")).toContain("$1 short");
	});

	it("refuses a second programme of the same kind while one runs", () => {
		const r = checkProgramme({ kind: "festival", balance: 1e9, running: ["festival"], isGovernor: true });
		expect(r.ok).toBe(false);
		expect(checkProgramme({ kind: "relief", balance: 1e9, running: ["festival"], isGovernor: true }).ok).toBe(true);
	});

	it("refuses unknown kinds and junk balances", () => {
		expect(checkProgramme({ kind: "rave", balance: 1e9, running: [], isGovernor: true }).ok).toBe(false);
		expect(checkProgramme({ kind: "festival", balance: Number.NaN, running: [], isGovernor: true }).ok).toBe(false);
	});

	it("caps the opinion running programmes add together", () => {
		const all = Object.values(REGIONAL_PROGRAMMES);
		expect(programmeOpinion(all)).toBe(
			Math.min(
				MAX_PROGRAMME_OPINION,
				all.reduce((s, p) => s + p.opinion, 0)
			)
		);
		expect(programmeOpinion([])).toBe(0);
	});
});
