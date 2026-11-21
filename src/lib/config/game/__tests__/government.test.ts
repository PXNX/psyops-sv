// Cabinet portfolios and bloc high representatives: four paired offices, a
// president and a bloc leader above them, and no rule that keeps one person
// from holding several at once.
import { describe, expect, it } from "@rstest/core";
import {
	ALL_GOVERNMENT_ROLES,
	HIGH_REPRESENTATIVE_ROLES,
	MINISTER_ROLES,
	MINISTRY_PORTFOLIO,
	MULTIPLE_ROLES_ALLOWED,
	ROLE_LABELS,
	highRepresentativeRole,
	isBlocRole,
	isHighRepresentativeRole,
	isMinisterRole,
	isStateRole,
	ministriesOfPortfolio,
	portfolioOfHighRepresentative,
	portfolioOfMinistry,
	roleLabel,
	uniqueRoles
} from "../government.config";

describe("state leadership", () => {
	it("has a president and four paired minister portfolios", () => {
		expect(MINISTER_ROLES).toEqual(["science_health", "economy_energy", "foreign_trade", "defence_interior"]);
		expect(ROLE_LABELS.president).toBe("President");
		for (const role of MINISTER_ROLES) expect(roleLabel(role)).toContain("Minister");
	});

	it("maps every ministry to exactly one portfolio", () => {
		for (const [ministry, portfolio] of Object.entries(MINISTRY_PORTFOLIO)) {
			expect(ministriesOfPortfolio(portfolio)).toContain(ministry as never);
		}
		expect(portfolioOfMinistry("science")).toBe("science_health");
		expect(portfolioOfMinistry("health")).toBe("science_health");
		expect(portfolioOfMinistry("economy")).toBe("economy_energy");
		expect(portfolioOfMinistry("energy")).toBe("economy_energy");
		expect(portfolioOfMinistry("foreign_affairs")).toBe("foreign_trade");
		expect(portfolioOfMinistry("trade")).toBe("foreign_trade");
		expect(portfolioOfMinistry("defense")).toBe("defence_interior");
		expect(portfolioOfMinistry("interior")).toBe("defence_interior");
	});
});

describe("bloc leadership", () => {
	it("mirrors each minister portfolio with a high representative", () => {
		expect(HIGH_REPRESENTATIVE_ROLES).toHaveLength(MINISTER_ROLES.length);
		for (const role of HIGH_REPRESENTATIVE_ROLES) {
			expect(roleLabel(role)).toContain("High Representative");
			expect(portfolioOfHighRepresentative(role)).toBe(role.replace("high_rep_", ""));
		}
		for (const portfolio of MINISTER_ROLES) {
			expect(highRepresentativeRole(portfolio)).toBe(`high_rep_${portfolio}`);
		}
	});

	it("classifies state and bloc offices without overlap", () => {
		expect(isStateRole("president")).toBe(true);
		expect(isStateRole("defence_interior")).toBe(true);
		expect(isStateRole("bloc_leader")).toBe(false);
		expect(isBlocRole("bloc_leader")).toBe(true);
		expect(isBlocRole("high_rep_trade" as never)).toBe(false);
		expect(isMinisterRole("economy_energy")).toBe(true);
		expect(isHighRepresentativeRole("high_rep_economy_energy")).toBe(true);
		expect(new Set(ALL_GOVERNMENT_ROLES).size).toBe(ALL_GOVERNMENT_ROLES.length);
		for (const role of ALL_GOVERNMENT_ROLES) expect(roleLabel(role)).toBeTruthy();
	});
});

describe("multiple roles", () => {
	it("lets one person hold several offices", () => {
		expect(MULTIPLE_ROLES_ALLOWED).toBe(true);
		const roles = uniqueRoles([
			"defence_interior",
			"president",
			"defence_interior",
			"high_rep_defence_interior"
		] as never[]);
		expect(roles).toEqual(["defence_interior", "president", "high_rep_defence_interior"]);
	});
});
