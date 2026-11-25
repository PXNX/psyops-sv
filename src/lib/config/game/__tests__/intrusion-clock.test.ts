// The countdown inside a target network and the code-breaking password locks.
import { describe, expect, it } from "@rstest/core";
import {
	CLOCK,
	CRACK,
	attemptsLeft,
	codeFromSeed,
	formatClock,
	isExpired,
	locksFor,
	networkFor,
	normalizeGuess,
	readCracks,
	remainingMs,
	scoreGuess,
	shiftDeadline,
	siteRecords,
	sitesForTarget,
	windowSeconds
} from "#lib/config/index.js";

const T0 = new Date("2026-11-21T12:00:00Z");
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const iso = (s: number) => at(s).toISOString();

describe("the countdown", () => {
	it("gives 60 to 120 seconds, less at better-guarded sites", () => {
		expect(windowSeconds(0)).toBe(CLOCK.MAX);
		expect(windowSeconds(10)).toBe(CLOCK.MIN);
		for (let s = 0; s < 6; s++) expect(windowSeconds(s + 1)).toBeLessThanOrEqual(windowSeconds(s));
	});

	it("counts down to zero and then stays expired", () => {
		expect(remainingMs(null, T0)).toBeNull();
		expect(remainingMs("not a date", T0)).toBeNull();
		expect(remainingMs(iso(90), T0)).toBe(90_000);
		expect(remainingMs(iso(90), at(89.5))).toBe(500);
		expect(remainingMs(iso(90), at(200))).toBe(0);
		expect(isExpired(iso(90), at(89))).toBe(false);
		expect(isExpired(iso(90), at(90))).toBe(true);
		expect(isExpired(null, at(9999))).toBe(false);
	});

	it("takes time off for noise and gives a little back, never past a fresh window", () => {
		expect(shiftDeadline(iso(60), -CLOCK.FORCE, T0, 3)).toBe(iso(60 - CLOCK.FORCE));
		expect(shiftDeadline(iso(60), CLOCK.COVER, T0, 3)).toBe(iso(60 + CLOCK.COVER));
		const full = windowSeconds(3);
		expect(shiftDeadline(iso(full - 2), CLOCK.COVER, T0, 3)).toBe(iso(full));
		// A deadline already past the cap isn't pulled in by adding time.
		expect(shiftDeadline(iso(full + 30), CLOCK.COVER, T0, 3)).toBe(iso(full + 30));
	});

	it("reads like a clock", () => {
		expect(formatClock(67_000)).toBe("1:07");
		expect(formatClock(120_000)).toBe("2:00");
		expect(formatClock(400)).toBe("0:01");
		expect(formatClock(0)).toBe("0:00");
	});
});

describe("checking a guess", () => {
	it("scores right-place and wrong-place symbols", () => {
		expect(scoreGuess("ABCD", "ABCD")).toEqual({ exact: 4, near: 0 });
		expect(scoreGuess("ABCD", "DCBA")).toEqual({ exact: 0, near: 4 });
		expect(scoreGuess("ABCD", "EEEE")).toEqual({ exact: 0, near: 0 });
		expect(scoreGuess("ABCD", "ABDC")).toEqual({ exact: 2, near: 2 });
	});

	it("counts repeated symbols only as often as the code has them", () => {
		expect(scoreGuess("AABB", "AAAA")).toEqual({ exact: 2, near: 0 });
		expect(scoreGuess("ABCA", "AAAA")).toEqual({ exact: 2, near: 0 });
		expect(scoreGuess("AABC", "CAAA")).toEqual({ exact: 1, near: 2 });
		expect(scoreGuess("FEDC", "FFFF")).toEqual({ exact: 1, near: 0 });
	});

	it("accepts loose typing and rejects anything that isn't a code", () => {
		expect(normalizeGuess("abcd")).toBe("ABCD");
		expect(normalizeGuess("a b-c,d")).toBe("ABCD");
		expect(normalizeGuess("ABC")).toBeNull();
		expect(normalizeGuess("ABCDE")).toBeNull();
		expect(normalizeGuess("ABCZ")).toBeNull();
	});

	it("builds valid codes from a seed, the same each time", () => {
		const codes = Array.from({ length: 40 }, (_, i) => codeFromSeed(i * 7919 + 1));
		for (const c of codes) expect(normalizeGuess(c)).toBe(c);
		expect(codeFromSeed(42)).toBe(codeFromSeed(42));
		expect(new Set(codes).size).toBeGreaterThan(20);
	});

	it("tracks the tries left and cleans up stored state", () => {
		expect(attemptsLeft(undefined)).toBe(CRACK.ATTEMPTS);
		const state = { guesses: [{ guess: "ABCD", exact: 1, near: 1 }], open: false, jammed: false };
		expect(attemptsLeft(state)).toBe(CRACK.ATTEMPTS - 1);
		expect(readCracks(null)).toEqual({});
		expect(readCracks({ "host:cams": { guesses: "nope", open: 1 }, bad: null })).toEqual({
			"host:cams": { guesses: [], open: true, jammed: false }
		});
	});
});

describe("which things are password-locked", () => {
	const sites = Array.from({ length: 40 }, (_, i) => sitesForTarget(i + 1, [{ id: 1, plantType: "coal" }])).flat();
	const locksOf = (site: (typeof sites)[number]) => {
		const ids = networkFor(site, "Testland").hosts.map((h) => h.id);
		return locksFor(site, ids, siteRecords(site, "Testland").files);
	};

	it("never locks the gateway or the core, and only classified files", () => {
		for (const site of sites) {
			const locks = locksOf(site);
			expect(locks.hosts).not.toContain("gw");
			expect(locks.hosts).not.toContain("core");
			expect(locks.files.length).toBeLessThanOrEqual(3);
			const files = siteRecords(site, "Testland").files;
			for (const id of locks.files)
				expect(["SECRET", "TOP SECRET"]).toContain(files.find((f) => f.id === id)!.classification);
		}
	});

	it("varies per site and stays the same for the same site", () => {
		const all = sites.map(locksOf);
		expect(all.some((l) => l.hosts.length === 0)).toBe(true);
		expect(all.some((l) => l.hosts.length > 0)).toBe(true);
		expect(all.some((l) => l.files.length > 0)).toBe(true);
		for (const site of sites.slice(0, 10)) expect(locksOf({ ...site })).toEqual(locksOf(site));
	});
});
