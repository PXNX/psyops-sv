// The deeper intrusion rules: exploit tiers, the trace meter, covering tracks,
// the five-host network, keys, camera access and the terminal parser.
import { describe, expect, it } from "@rstest/core";
import {
	EXPLOIT_TIERS,
	EXPLOIT_TIER_ORDER,
	TRACE,
	addTrace,
	coverTracks,
	emptyDeep,
	exploitChance,
	exploitsFor,
	hopChance,
	hopCheck,
	hostById,
	moveRng,
	networkFor,
	parseCommand,
	parseExploitArgs,
	payloadBonus,
	readDeep,
	resolveHost,
	resolveLoot,
	siteSystems,
	sitesForTarget,
	tracePenalty,
	traceLevel
} from "#lib/config/index.js";

// A power plant that runs every host (cameras, a file share and a door controller).
const site = Array.from({ length: 40 }, (_, i) => sitesForTarget(7, [{ id: i + 1, plantType: "coal" }])[0]!).find(
	(s) => {
		const sys = siteSystems(s);
		return sys.cameras.length > 0 && sys.hasFiles && sys.hasBadge;
	}
)!;
const asset = { access: 3, heat: 0 };

describe("exploit tiers", () => {
	it("trade odds for noise: quiet < standard < loud on both", () => {
		const [quiet, standard, loud] = EXPLOIT_TIER_ORDER.map((t) => EXPLOIT_TIERS[t]);
		expect(quiet!.chance).toBeLessThan(standard!.chance);
		expect(standard!.chance).toBeLessThan(loud!.chance);
		expect(quiet!.noise.ok).toBeLessThan(standard!.noise.ok);
		expect(standard!.noise.ok).toBeLessThan(loud!.noise.ok);
		for (const t of EXPLOIT_TIER_ORDER) expect(EXPLOIT_TIERS[t].noise.fail).toBeGreaterThan(EXPLOIT_TIERS[t].noise.ok);
		expect(quiet!.extraAccess).toBe(1);
	});

	it("names three exploits per port, stable per site and port", () => {
		const a = exploitsFor(site, { port: 22 });
		expect(a.map((e) => e.tier)).toEqual(["quiet", "standard", "loud"]);
		expect(exploitsFor(site, { port: 22 })).toEqual(a);
		for (const e of a) expect(e.name.length).toBeGreaterThan(3);
	});

	it("applies the tier edge and the trace penalty, clamped", () => {
		expect(exploitChance(0.6, "standard", 0)).toBe(0.6);
		expect(exploitChance(0.6, "loud", 0)).toBe(0.76);
		expect(exploitChance(0.6, "quiet", 0)).toBe(0.46);
		expect(exploitChance(0.6, "standard", 100)).toBe(0.4);
		expect(exploitChance(0.95, "loud", 0)).toBe(0.95);
		expect(exploitChance(0.1, "quiet", 100)).toBe(0.05);
	});
});

describe("trace meter", () => {
	it("clamps and reports a full meter as traced", () => {
		expect(addTrace(10, 5)).toEqual({ trace: 15, traced: false });
		expect(addTrace(10, -30)).toEqual({ trace: 0, traced: false });
		expect(addTrace(95, 20)).toEqual({ trace: TRACE.MAX, traced: true });
	});

	it("labels the meter", () => {
		expect(traceLevel(0)).toBe("quiet");
		expect(traceLevel(40)).toBe("noticed");
		expect(traceLevel(80)).toBe("hunted");
		expect(traceLevel(100)).toBe("traced");
		expect(tracePenalty(0)).toBe(0);
		expect(tracePenalty(50)).toBe(0.1);
	});

	it("makes each cover dearer and weaker, down to a floor", () => {
		const covers = [0, 1, 2, 3, 4, 5].map(coverTracks);
		for (let i = 1; i < covers.length; i++) {
			expect(covers[i]!.cost).toBeGreaterThan(covers[i - 1]!.cost);
			expect(covers[i]!.drop).toBeLessThanOrEqual(covers[i - 1]!.drop);
		}
		expect(covers[0]).toEqual({ cost: TRACE.COVER_BASE_COST, drop: TRACE.COVER_DROP });
		expect(covers.at(-1)!.drop).toBe(TRACE.COVER_DROP_MIN);
	});
});

describe("the target network", () => {
	const net = networkFor(site, "Empire of Sylvania", "switch-03.empire.gov");

	it("has five linked hosts on fictional addresses, stable per site", () => {
		expect(net.hosts.map((h) => h.id)).toEqual(["gw", "cams", "files", "badge", "core"]);
		expect(networkFor(site, "Empire of Sylvania", "switch-03.empire.gov")).toEqual(net);
		expect(hostById(net, "gw")!.name).toBe("switch-03.empire.gov");
		for (const h of net.hosts) {
			expect(h.ip.startsWith("10.")).toBe(true);
			for (const l of h.links) expect(hostById(net, l)).toBeDefined();
		}
		expect(hostById(net, "core")!.locked).toBe(true);
	});

	it("hands out valid private addresses even for large seeds", () => {
		const big = networkFor({ ...site, seed: 2_672_537_654 }, "Empire of Sylvania");
		for (const h of big.hosts) {
			const octets = h.ip.split(".").map(Number);
			expect(octets).toHaveLength(4);
			for (const o of octets) expect(o >= 0 && o <= 255).toBe(true);
		}
	});

	it("finds hosts and loot by loose names", () => {
		expect(resolveHost(net, "cams")?.id).toBe("cams");
		expect(resolveHost(net, net.hosts[2]!.name.split(".")[0]!)?.id).toBe("files");
		expect(resolveHost(net, hostById(net, "badge")!.ip.split(".").at(-1)!)?.id).toBe("badge");
		expect(resolveHost(net, "nowhere")).toBeUndefined();
		const files = hostById(net, "files")!;
		expect(resolveLoot(files, "1")?.id).toBe("admin-token");
		expect(resolveLoot(files, "cash")?.id).toBe("files-cash");
		expect(resolveLoot(files, "9")).toBeUndefined();
	});

	it("only lets the operator reach linked hosts, with keys opening doors", () => {
		const deep = { ...emptyDeep(), owned: ["gw"] };
		expect(hopCheck(net, deep, "core", asset)).toMatchObject({ ok: false });
		expect(hopCheck(net, deep, "gw", asset)).toMatchObject({ ok: false });
		const forced = hopCheck(net, deep, "files", asset);
		expect(forced).toMatchObject({ ok: true, keyed: false });
		const keyed = hopCheck(net, { ...deep, keys: ["svc-password"] }, "files", asset);
		expect(keyed).toMatchObject({ ok: true, keyed: true, key: "svc-password", chance: 1 });
	});

	it("keeps the core locked without a key, even when it's reachable", () => {
		const deep = { ...emptyDeep(), owned: ["gw", "cams", "badge"], at: "badge" };
		const locked = hopCheck(net, deep, "core", asset);
		expect(locked.ok).toBe(false);
		if (!locked.ok) expect(locked.reason).toMatch(/locked/);
		expect(hopCheck(net, { ...deep, keys: ["vault-pin"] }, "core", asset)).toMatchObject({ ok: true, keyed: true });
	});

	it("moves freely between owned hosts", () => {
		const deep = { ...emptyDeep(), owned: ["gw", "cams"], at: "cams" };
		expect(hopCheck(net, deep, "gw", asset)).toMatchObject({ ok: true, already: true });
	});

	it("makes forcing harder with defence and trace", () => {
		const cams = hostById(net, "cams")!;
		const badge = hostById(net, "badge")!;
		expect(hopChance(badge, { trace: 0 }, asset)).toBeLessThan(hopChance(cams, { trace: 0 }, asset));
		expect(hopChance(cams, { trace: 90 }, asset)).toBeLessThan(hopChance(cams, { trace: 0 }, asset));
	});
});

describe("session state", () => {
	it("reads old or partial rows as a full state", () => {
		expect(readDeep(null)).toEqual(emptyDeep());
		expect(readDeep({ trace: 40, keys: ["x"] })).toMatchObject({ trace: 40, keys: ["x"], owned: [], moves: 0 });
	});

	it("gives payloads an extra foothold with the master key", () => {
		expect(payloadBonus(null)).toBe(0);
		expect(payloadBonus({ keys: ["master-key"] })).toBe(1);
	});

	it("rolls the same dice for the same move in the same hour", () => {
		const now = new Date("2026-11-25T10:15:00Z");
		expect(moveRng(1, 2, 3, now)()).toBe(moveRng(1, 2, 3, new Date("2026-11-25T10:55:00Z"))());
		expect(moveRng(1, 2, 3, now)()).not.toBe(moveRng(1, 2, 4, now)());
	});
});

describe("terminal parser", () => {
	it("splits commands", () => {
		expect(parseCommand("  HOP   cams ")).toEqual({ cmd: "hop", args: ["cams"] });
		expect(parseCommand("")).toEqual({ cmd: "", args: [] });
	});

	it("reads exploit arguments in either order", () => {
		expect(parseExploitArgs(["22"])).toEqual({ port: 22, tier: "standard", bad: null });
		expect(parseExploitArgs(["loud", ":443"])).toEqual({ port: 443, tier: "loud", bad: null });
		expect(parseExploitArgs([])).toEqual({ port: null, tier: "standard", bad: null });
		expect(parseExploitArgs(["22", "sneaky"]).bad).toBe("sneaky");
	});
});
