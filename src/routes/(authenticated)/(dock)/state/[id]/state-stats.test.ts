// The state subpages fog foreign figures: what their loaders return for a
// foreign viewer must never carry the true numbers, while the state's own
// citizens still see them exactly.
import { describe, expect, it } from "@rstest/core";
import { stateIntelFrom, type IntelSignals, type StateIntel } from "#lib/utils/intel-estimate.js";
import { civiliansView, debtView, energyUsageView, powerView, residentsView } from "./state-stats";

const now = new Date("2026-11-25T12:00:00Z");
const VIEWER = 1;
const TARGET = 2;
const signals = (relation: IntelSignals["relation"]): IntelSignals => ({
	relation,
	sharedBorder: false,
	activeAssets: 0,
	files: [],
	recon: [],
	covertOps: []
});
// A stranger (barely any intel), a bloc partner (good intel, still short of
// confirmed) and the state itself.
const stranger = stateIntelFrom(VIEWER, TARGET, signals("foreign"), now);
const partner = stateIntelFrom(VIEWER, TARGET, signals("bloc"), now);
const own = stateIntelFrom(TARGET, TARGET, signals("self"), now);

// Distinctive true figures: none of them may reach a foreign viewer.
const SECRET = [987_653, 45_679, 3_217, 76_543, 12_347, 8_761, 654_321, 23_457];

function numbersIn(value: unknown, out: number[] = []): number[] {
	if (typeof value === "number") out.push(value);
	else if (Array.isArray(value)) for (const v of value) numbersIn(v, out);
	else if (value && typeof value === "object") for (const v of Object.values(value)) numbersIn(v, out);
	return out;
}
function kindsIn(value: unknown, out: string[] = []): string[] {
	if (Array.isArray(value)) for (const v of value) kindsIn(v, out);
	else if (value && typeof value === "object") {
		const o = value as Record<string, unknown>;
		if (typeof o.kind === "string" && "tier" in o) out.push(o.kind);
		for (const v of Object.values(o)) kindsIn(v, out);
	}
	return out;
}
const leaks = (view: unknown) => numbersIn(view).filter((n) => SECRET.includes(n));
const intelFor = (intel: StateIntel) => (id: number) =>
	id === TARGET
		? intel
		: stateIntelFrom(intel.viewerStateId, id, signals(id === intel.viewerStateId ? "self" : "foreign"), now);

const [A, B, C, D, E, F, G, H] = SECRET;

const power = (intel: StateIntel) =>
	powerView(
		intel,
		{
			score: A,
			storedRating: 7,
			components: [
				{ key: "territory", label: "Territory", value: 3, detail: "3 regions", weight: 10, points: 30 },
				{ key: "population", label: "Population", value: B, detail: `${B} civilians`, weight: 1, points: C },
				{ key: "military", label: "Armed forces", value: D, detail: `${D} points`, weight: 2, points: E }
			]
		},
		[
			{ id: TARGET, name: "Target", score: A, rating: 7, regions: 3, population: B },
			{ id: 3, name: "Third", score: F, rating: 1, regions: 2, population: G },
			{ id: VIEWER, name: "Viewer", score: 500, rating: 2, regions: 4, population: 900 }
		],
		intelFor(intel)
	);
const residents = (intel: StateIntel) =>
	residentsView(
		intel,
		[
			{ id: 10, name: "North", population: C },
			{ id: 11, name: "South", population: H }
		],
		[C, H]
	);
const debt = (intel: StateIntel) =>
	debtView(intel, {
		debt: A,
		gdp: { gdp: G, debtToGdp: 151, taxesAnnual: D, taxesBasis: E, taxRate: 0.12, consumption: F, population: B },
		creditors: { creditors: [{ userId: "u1", principal: A }], total: A },
		risk: {
			components: [{ key: "debt", label: "Debt pressure", detail: `${A} owed against ${H} in cash`, points: 12 }]
		}
	});
const civilians = (intel: StateIntel) =>
	civiliansView(intel, {
		civilians: B,
		trend: [B, H],
		regions: [{ id: 10, name: "North", logo: "", population: B, density: C, workforce: D, workforceShare: 0.61 }],
		demographics: {
			fertility: 0.0123,
			mortality: 0.0098,
			annualRate: 0.0042,
			netPerYear: E,
			contributions: [{ label: "Births", value: F }]
		},
		manpower: { underArms: G, perThousand: 17, regime: "Volunteer army", available: H },
		workforce: D,
		outbreaks: [{ id: 5, cases: E }]
	});
const energy = (intel: StateIntel) =>
	energyUsageView(
		intel,
		{
			production: G,
			used: F,
			perCapita: 31,
			components: [{ key: "civilian", label: "Homes", detail: "", mw: E, share: 47 }],
			fuel: { civilian: D, military: C, exported: H },
			factors: { fuel: 83, maintenance: 91 },
			plants: 13,
			plantOutput: B,
			gridLevels: 17,
			storageLevels: 19,
			regions: 3,
			lastTick: null
		},
		[
			{ id: TARGET, name: "Target", used: F, perCapita: 31, population: B },
			{ id: 3, name: "Third", used: A, perCapita: 29, population: G }
		],
		[{ at: now.toISOString(), power: G, usedPower: F }],
		intelFor(intel)
	);

const pages = { power, residents, debt, civilians, energy };

describe("state subpages under fog of war", () => {
	for (const [name, view] of Object.entries(pages)) {
		describe(name, () => {
			it("sends a stranger no true figure", () => {
				expect(leaks(view(stranger))).toEqual([]);
			});

			it("sends a bloc partner estimates, not true figures", () => {
				const v = view(partner);
				expect(leaks(v)).toEqual([]);
				expect(kindsIn(v)).toContain("range");
			});

			it("shows the state's own citizens the real figures", () => {
				// Other states in a ranking stay fogged even on one's own page.
				const { ranking: _ranking, ...v } = view(own) as Record<string, unknown>;
				expect(leaks(v).length).toBeGreaterThan(0);
				expect(kindsIn(v).every((k) => k === "exact")).toBe(true);
			});
		});
	}

	it("keeps only the viewer's own row exact in a ranking", () => {
		for (const intel of [partner, own]) {
			const exactIds = (rows: { id: number; e: { kind: string } }[]) =>
				rows.filter((r) => r.e.kind === "exact").map((r) => r.id);
			const mine = [intel.viewerStateId];
			expect(exactIds(power(intel).ranking.map((r) => ({ id: r.id, e: r.score })))).toEqual(mine);
			// The energy ranking here lists only the target and a third state.
			const energyExact = exactIds(energy(intel).ranking.map((r) => ({ id: r.id, e: r.used })));
			expect(energyExact).toEqual(intel === own ? [TARGET] : []);
		}
	});

	it("drops day-by-day series and the lender book for foreigners", () => {
		expect(residents(partner).history).toBeNull();
		expect(civilians(partner).trend).toBeNull();
		expect(energy(partner).history).toEqual([]);
		expect(debt(partner).creditors).toBeNull();
		expect(debt(partner).riskComponents[0]!.detail).not.toContain(String(A));
	});

	it("keeps public facts exact", () => {
		const p = power(stranger);
		expect(p.power!.storedRating).toBe(7);
		expect(p.power!.components[0]!.value).toMatchObject({ kind: "exact", value: 3 });
		expect(debt(stranger).gdp.taxRate).toBe(0.12);
		expect(civilians(stranger).manpower.regime).toBe("Volunteer army");
	});
});
