// Two pressures once the operator is inside a target network:
//
// - A countdown. The moment the pivot lands, the target's monitoring starts
//   closing in: the operator has 60–120 seconds (less at better-guarded
//   sites). Noisy moves shave time off, covering tracks buys a little back,
//   and at zero the line is cut exactly as if the trace meter had filled.
// - Password locks. Some hosts and some files on the share sit behind a
//   password, chosen per site from its seed. Cracking one is a small
//   code-breaking puzzle: guess a four-symbol code, learn how many symbols are
//   right and in the right place, how many are right but elsewhere. Each wrong
//   guess costs trace and time; too many lock the account for the session.
//
// Purely game rules. The codes themselves are never computed here: the server
// derives them from its own salt, so the browser can't work them out.

import { hash32, seededRandom } from "./recon.config";
import type { Site } from "./infiltration.config";

// ── The countdown ───────────────────────────────────────────────────────────

export const CLOCK = {
	/** Seconds before security level is taken off. */
	BASE: 135,
	PER_SECURITY: 15,
	MIN: 60,
	MAX: 120,
	/** Seconds lost forcing a host (on top of the roll). */
	FORCE: 8,
	/** Extra seconds lost when the force fails. */
	FORCE_FAIL: 7,
	/** Seconds lost per wrong password guess. */
	GUESS: 8,
	/** Seconds bought back by covering tracks. */
	COVER: 12
} as const;

/** How long the operator has inside: 120s at the softest sites, 60s at the hardest. */
export const windowSeconds = (security: number) =>
	Math.min(CLOCK.MAX, Math.max(CLOCK.MIN, CLOCK.BASE - security * CLOCK.PER_SECURITY));

/** Milliseconds left on the clock, or null when no clock is running. */
export function remainingMs(deadline: string | null | undefined, now: Date): number | null {
	if (!deadline) return null;
	const at = Date.parse(deadline);
	if (!Number.isFinite(at)) return null;
	return Math.max(0, at - now.getTime());
}

export const isExpired = (deadline: string | null | undefined, now: Date) => remainingMs(deadline, now) === 0;

/**
 * Move a deadline by some seconds (negative takes time away). Time added can't
 * push it further out than a fresh window from now.
 */
export function shiftDeadline(deadline: string, seconds: number, now: Date, security: number): string {
	const at = Date.parse(deadline) + seconds * 1000;
	const cap = now.getTime() + windowSeconds(security) * 1000;
	return new Date(Math.min(at, Math.max(cap, Date.parse(deadline)))).toISOString();
}

/** `1:07` style. */
export function formatClock(ms: number): string {
	const s = Math.ceil(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── Password locks ──────────────────────────────────────────────────────────

export const CRACK = {
	LENGTH: 4,
	SYMBOLS: "ABCDEF",
	ATTEMPTS: 6,
	/** Trace added per wrong guess. */
	TRACE: 4
} as const;

export interface CrackGuess {
	guess: string;
	/** Right symbol, right place. */
	exact: number;
	/** Right symbol, wrong place. */
	near: number;
}

export interface CrackState {
	guesses: CrackGuess[];
	open: boolean;
	/** Out of attempts: the account is locked for the rest of the session. */
	jammed: boolean;
}

export const hostLock = (hostId: string) => `host:${hostId}`;
export const fileLock = (recordId: string) => `file:${recordId}`;

/** A string's stable number, for seeding. */
export function strHash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
	return h >>> 0;
}

/**
 * Which hosts and files of a site are behind a password. The gateway is where
 * the operator came in and the core has its own key lock, so only the hosts in
 * between can be password-protected; on the share, only classified files.
 */
export function locksFor(
	site: Pick<Site, "seed">,
	hostIds: string[],
	files: { id: string; classification: string }[]
): { hosts: string[]; files: string[] } {
	const rng = seededRandom(hash32(site.seed, 0x10c4));
	const hosts = hostIds.filter((id) => id !== "gw" && id !== "core").filter(() => rng() < 0.4);
	const secret = files.filter((f) => f.classification === "SECRET" || f.classification === "TOP SECRET");
	const locked = secret.filter(() => rng() < 0.45).slice(0, 3);
	return { hosts, files: locked.map((f) => f.id) };
}

/** Upper-case a typed guess and check it; null when it isn't a valid code. */
export function normalizeGuess(raw: string): string | null {
	const g = raw.toUpperCase().replace(/[\s,·-]+/g, "");
	if (g.length !== CRACK.LENGTH) return null;
	for (const ch of g) if (!CRACK.SYMBOLS.includes(ch)) return null;
	return g;
}

/** Mastermind scoring: exact matches, then symbols in the code but elsewhere. */
export function scoreGuess(code: string, guess: string): { exact: number; near: number } {
	let exact = 0;
	const left: Record<string, number> = {};
	const rest: string[] = [];
	for (let i = 0; i < code.length; i++) {
		if (guess[i] === code[i]) exact++;
		else {
			left[code[i]!] = (left[code[i]!] ?? 0) + 1;
			rest.push(guess[i]!);
		}
	}
	let near = 0;
	for (const ch of rest)
		if ((left[ch] ?? 0) > 0) {
			near++;
			left[ch]!--;
		}
	return { exact, near };
}

/** Build a code from a seed. The server passes its own salted seed. */
export function codeFromSeed(seed: number): string {
	const rng = seededRandom(seed);
	let code = "";
	for (let i = 0; i < CRACK.LENGTH; i++) code += CRACK.SYMBOLS[Math.floor(rng() * CRACK.SYMBOLS.length)]!;
	return code;
}

export const attemptsLeft = (state: CrackState | undefined) => CRACK.ATTEMPTS - (state?.guesses.length ?? 0);

/** A stored crack map (possibly missing or malformed) as a clean one. */
export function readCracks(raw: unknown): Record<string, CrackState> {
	if (!raw || typeof raw !== "object") return {};
	const out: Record<string, CrackState> = {};
	for (const [k, v] of Object.entries(raw as Record<string, Partial<CrackState>>)) {
		if (!v || typeof v !== "object") continue;
		out[k] = {
			guesses: Array.isArray(v.guesses) ? v.guesses.slice(0, CRACK.ATTEMPTS) : [],
			open: !!v.open,
			jammed: !!v.jammed
		};
	}
	return out;
}
