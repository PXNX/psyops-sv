// Deeper cyber effects and the interactive intrusion: pure rules shared by the
// planner, the console and the server.
import { describe, expect, it } from "@rstest/core";
import {
	ATTACK_VECTORS,
	COVERT_OPS,
	CYBER,
	INTRUSION,
	blindedRadar,
	covertOdds,
	intrusionChance,
	scanFor,
	signalBonus,
	sitesForTarget,
	stageLines,
	supplyFactor
} from "#lib/config/index.js";

const site = sitesForTarget(7, [{ id: 3, name: "Ashfield Coal Station", plantType: "coal" }]).find(
	(s) => s.kind === "command"
)!;

describe("deeper cyber effects", () => {
	it("exposes new cyber operations with real effects and cooldowns", () => {
		for (const kind of ["comms_intercept", "air_defence_spoof", "supply_chain"] as const) {
			const spec = COVERT_OPS[kind];
			expect(spec.domain).toBe("cyber");
			expect(spec.effect).not.toBeNull();
			expect(spec.cost).toBeGreaterThan(0);
			expect(spec.durationHours).toBeGreaterThan(0);
			expect(spec.cooldownHours).toBeGreaterThan(0);
		}
		expect(COVERT_OPS.comms_intercept.effect).toBe("comms_intercept");
		expect(COVERT_OPS.air_defence_spoof.effect).toBe("defence_blinded");
		expect(COVERT_OPS.supply_chain.effect).toBe("supply_disrupted");
	});

	it("turns intercepted traffic into bounded detection support", () => {
		expect(signalBonus(0)).toBe(0);
		expect(signalBonus(20)).toBeCloseTo((20 / 100) * CYBER.SIGNAL_DETECTION_SHARE);
		expect(signalBonus(1000)).toBe(CYBER.SIGNAL_BONUS_CAP);
	});

	it("blinds radar levels and throttles factory output", () => {
		expect(blindedRadar(3)).toBe(3);
		expect(blindedRadar(-2)).toBe(0);
		expect(supplyFactor(0)).toBe(1);
		expect(supplyFactor(20)).toBeCloseTo(0.8);
		expect(supplyFactor(200)).toBe(0);
	});

	it("keeps foothold bonuses available to the new operations", () => {
		const base = { defenceLevel: 0, atWar: false, recentOps: 0, targetResilient: false };
		for (const kind of ["comms_intercept", "air_defence_spoof", "supply_chain"] as const) {
			const plain = covertOdds(kind, base);
			const helped = covertOdds(kind, { ...base, networkAssets: 2 });
			expect(helped.success).toBeGreaterThan(plain.success);
			expect(helped.attribution).toBeLessThan(plain.attribution);
		}
	});
});

describe("intrusion artefacts", () => {
	it("scans a site deterministically with exploitable services", () => {
		const a = scanFor(site, "Empire of Sylvania");
		expect(scanFor(site, "Empire of Sylvania")).toEqual(a);
		expect(a.ports.length).toBeGreaterThan(2);
		expect(a.ports.every((p) => p.port > 0 && p.service.length > 0)).toBe(true);
		expect(a.ports.some((p) => p.vector && ATTACK_VECTORS[p.vector])).toBe(true);
		expect(a.ip).toMatch(/^198\.51\.100\.\d+$/);
		expect(a.subnet).toMatch(/^10\.\d+\.\d+\.0\/24$/);
	});

	it("prints a plausible nmap-style transcript for the scan", () => {
		const report = scanFor(site, "Empire of Sylvania");
		const lines = stageLines("scan", report, undefined, true, "Empire of Sylvania", "21 NOV 2026 12:00");
		expect(lines.some((l) => l.line.startsWith("$ nmap -sV"))).toBe(true);
		expect(lines.some((l) => l.line.includes("/tcp open"))).toBe(true);
		expect(lines.every((l) => l.t === "21 NOV 2026 12:00")).toBe(true);
	});

	it("makes each step likelier with better access and less heat", () => {
		const vector = Object.keys(ATTACK_VECTORS)[0]!;
		expect(intrusionChance("access", { access: 4, heat: 0 }, site, vector)).toBeGreaterThan(
			intrusionChance("access", { access: 1, heat: 0 }, site, vector)
		);
		expect(intrusionChance("escalate", { access: 4, heat: 60 }, site)).toBeLessThan(
			intrusionChance("escalate", { access: 4, heat: 0 }, site)
		);
		for (const step of ["access", "escalate", "pivot"] as const) {
			const c = intrusionChance(step, { access: 5, heat: 0 }, site, vector);
			expect(c).toBeGreaterThanOrEqual(0.1);
			expect(c).toBeLessThanOrEqual(0.95);
		}
	});

	it("keeps payload and pivot costs meaningful", () => {
		expect(INTRUSION.PAYLOAD_FOOTHOLDS).toBeGreaterThan(0);
		expect(INTRUSION.PIVOT_ACTION_BONUS).toBeGreaterThan(0);
		expect(INTRUSION.PIVOT_ACTION_BONUS).toBeLessThan(0.3);
	});
});
