// The deeper layer of an intrusion. Each exposed port offers a few exploits
// that trade noise for odds. Once the operator is through the gateway, the
// target network opens up as five fictional hosts: some hold keys that open
// the next host without a fight, some hold loot. Every noisy move feeds a
// trace meter, and when it fills the target's security team cuts the line:
// the session is over and the asset takes heat. Covering tracks buys some of
// the meter back, but each cover costs more and removes less.
//
// Everything here is a game abstraction resolved by dice rolls. The exploit
// names, hosts and software are invented. The rules are pure and seeded, so
// the console, the full-screen terminal and the server agree on every number.

import { hash32, seededRandom } from "./recon.config";
import type { Site } from "./infiltration.config";
import type { ScanPort } from "./intrusion.config";

// ── Trace meter ─────────────────────────────────────────────────────────────

export const TRACE = {
	MAX: 100,
	/** Trace added by each move. Failures are louder than successes. */
	SCAN: 4,
	ESCALATE: { ok: 6, fail: 14 },
	PIVOT: { ok: 6, fail: 14 },
	/** Hopping with the right key in hand is nearly silent. */
	HOP_KEYED: 3,
	HOP: { ok: 12, fail: 20 },
	LOOT: 3,
	/** Heat the asset takes when a session is traced to the end. */
	BURN_HEAT: 12,
	/** Cover tracks: each use costs more and buys back less. */
	COVER_BASE_COST: 700,
	COVER_DROP: 30,
	COVER_DROP_STEP: 6,
	COVER_DROP_MIN: 10,
	HOP_COST: 600
} as const;

/** Add (or remove) trace, clamped; `traced` once the meter is full. */
export function addTrace(trace: number, delta: number): { trace: number; traced: boolean } {
	const next = Math.max(0, Math.min(TRACE.MAX, Math.round(trace + delta)));
	return { trace: next, traced: next >= TRACE.MAX };
}

/** What the n-th cover-tracks move (0-based) costs and how much trace it removes. */
export function coverTracks(covers: number): { cost: number; drop: number } {
	return {
		cost: TRACE.COVER_BASE_COST * (covers + 1),
		drop: Math.max(TRACE.COVER_DROP_MIN, TRACE.COVER_DROP - covers * TRACE.COVER_DROP_STEP)
	};
}

/** The trace makes every roll harder: at a full meter, about −20 points. */
export const tracePenalty = (trace: number) => Math.round((Math.max(0, trace) / TRACE.MAX) * 20) / 100;

/** A coarse label for the meter. */
export function traceLevel(trace: number): "quiet" | "noticed" | "hunted" | "traced" {
	if (trace >= TRACE.MAX) return "traced";
	if (trace >= 70) return "hunted";
	if (trace >= 35) return "noticed";
	return "quiet";
}

// ── Exploits per port ───────────────────────────────────────────────────────

export type ExploitTier = "quiet" | "standard" | "loud";
export const EXPLOIT_TIER_ORDER: ExploitTier[] = ["quiet", "standard", "loud"];

export interface NetExploit {
	tier: ExploitTier;
	name: string;
	blurb: string;
	/** Added to the access chance. */
	chance: number;
	/** Trace on success / on failure. */
	noise: { ok: number; fail: number };
	/** Extra access level needed on top of the vector's own requirement. */
	extraAccess: number;
}

export const EXPLOIT_TIERS: Record<ExploitTier, Omit<NetExploit, "name" | "tier">> = {
	quiet: {
		blurb: "Slow and patient. Hard to spot, easy to fumble.",
		chance: -0.14,
		noise: { ok: 4, fail: 9 },
		extraAccess: 1
	},
	standard: {
		blurb: "The usual trick for this service.",
		chance: 0,
		noise: { ok: 9, fail: 18 },
		extraAccess: 0
	},
	loud: {
		blurb: "Throws everything at the door at once. It usually opens, and everyone hears it.",
		chance: 0.16,
		noise: { ok: 20, fail: 30 },
		extraAccess: 0
	}
};

const EXPLOIT_NAMES: Record<ExploitTier, string[]> = {
	quiet: ["Velvet Knock", "Mothwing Replay", "Paper Lantern", "Whisper Handshake", "Snowfall Drift"],
	standard: ["BlueMoon Overflow", "Copperhead Splice", "Tin Soldier Fuzz", "Lanternfish Relay", "Gingerbread Swap"],
	loud: ["Hammerdown Spray", "Thunderclap Flood", "Brass Band Rush", "Foghorn Cascade", "Stampede Loop"]
};

export const isExploitTier = (s: string): s is ExploitTier => (EXPLOIT_TIER_ORDER as string[]).includes(s);

/** The exploits on offer for one open port of one site, always in tier order. */
export function exploitsFor(site: Pick<Site, "seed">, port: Pick<ScanPort, "port">): NetExploit[] {
	return EXPLOIT_TIER_ORDER.map((tier, i) => {
		const names = EXPLOIT_NAMES[tier];
		const name = names[hash32(site.seed, port.port, i + 1) % names.length]!;
		return { tier, name, ...EXPLOIT_TIERS[tier] };
	});
}

/** Access chance for one exploit: the base chance plus its tier's edge, minus trace. */
export function exploitChance(base: number, tier: ExploitTier, trace: number): number {
	const raw = base + EXPLOIT_TIERS[tier].chance - tracePenalty(trace);
	return round2(clamp(raw, 0.05, 0.95));
}

// ── The target network ──────────────────────────────────────────────────────

export type HostRole = "gateway" | "cameras" | "files" | "badge" | "core";
export type LootKind = "key" | "cash" | "ghost";

export interface NetLoot {
	id: string;
	label: string;
	kind: LootKind;
	blurb: string;
	/** Treasury gain for cash loot, trace removed for ghost loot. */
	amount?: number;
}

export interface NetHost {
	id: string;
	role: HostRole;
	name: string;
	ip: string;
	/** Hosts reachable from this one. */
	links: string[];
	/** Key ids that open this host without a roll (any one is enough). */
	keys: string[];
	/** Locked hosts can't be forced: you need one of the keys. */
	locked: boolean;
	/** Makes forcing the host harder. */
	defence: number;
	loot: NetLoot[];
	blurb: string;
}

export interface TargetNetwork {
	hosts: NetHost[];
}

/** The keys a player can carry; their labels show in the terminal. */
export const KEY_LABEL: Record<string, string> = {
	"svc-password": "service password",
	"badge-clone": "cloned keycard",
	"admin-token": "admin token",
	"vault-pin": "vault PIN",
	"master-key": "master override key"
};

const ROLE_PREFIX: Record<Site["kind"], Record<Exclude<HostRole, "gateway">, string>> = {
	powerplant: { cameras: "turbine-cam", files: "shift-share", badge: "turnstile", core: "grid-control" },
	airbase: { cameras: "apron-cam", files: "flightdesk", badge: "gatehouse", core: "tower-ops" },
	datacenter: { cameras: "aisle-cam", files: "cold-archive", badge: "mantrap", core: "vault-core" },
	telecom: { cameras: "mast-cam", files: "billing-share", badge: "keybox", core: "switch-core" },
	lab: { cameras: "cleanroom-cam", files: "eng-share", badge: "airlock", core: "test-rig" },
	command: { cameras: "gatehouse-cam", files: "orders-share", badge: "blastdoor", core: "ops-core" },
	company: { cameras: "lobby-cam", files: "ledger-share", badge: "reception", core: "board-vault" },
	factory: { cameras: "line-cam", files: "stores-share", badge: "timeclock", core: "line-control" },
	party: { cameras: "hall-cam", files: "donor-share", badge: "frontdesk", core: "member-vault" }
};

const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 14) || "state";

/**
 * The internal network behind a site's gateway. Five hosts in a small graph:
 * the gateway leads to the cameras and the file share; the file share opens
 * with the service password from the gateway (or a roll); the badge server
 * leads on to the core, which only opens with a keycard, a token or a PIN.
 */
export function networkFor(site: Pick<Site, "seed" | "kind">, target: string, gatewayHost?: string): TargetNetwork {
	const rng = seededRandom(hash32(site.seed, 0xde3b));
	const domain = `${slug(target)}.gov`;
	const names = ROLE_PREFIX[site.kind] ?? ROLE_PREFIX.command;
	const net = `10.${(site.seed % 40) + 10}.${(site.seed >>> 3) % 250}`;
	const ip = (n: number) => `${net}.${n}`;
	const cash = (lo: number, hi: number) => Math.round((lo + rng() * (hi - lo)) / 50) * 50;
	const hosts: NetHost[] = [
		{
			id: "gw",
			role: "gateway",
			name: gatewayHost ?? `gateway.${domain}`,
			ip: ip(1),
			links: ["cams", "files"],
			keys: [],
			locked: false,
			defence: 0,
			blurb: "Where you came in. Somebody left their command history behind.",
			loot: [
				{
					id: "svc-password",
					label: "Service password in an old command history",
					kind: "key",
					blurb: "Opens the file share without a fight."
				}
			]
		},
		{
			id: "cams",
			role: "cameras",
			name: `${names.cameras}.${domain}`,
			ip: ip(20 + Math.floor(rng() * 20)),
			links: ["gw", "badge"],
			keys: [],
			locked: false,
			defence: 1,
			blurb: "The video recorder. Own it to see the lobby and the server room.",
			loot: [
				{
					id: "badge-clone",
					label: "Keycard snapshot from the lobby reader",
					kind: "key",
					blurb: "A cloned keycard. The badge server and the core trust it."
				},
				{
					id: "cams-ghost",
					label: "Loop of an empty corridor",
					kind: "ghost",
					blurb: "Play it back to the guards. Removes some trace.",
					amount: 15
				}
			]
		},
		{
			id: "files",
			role: "files",
			name: `${names.files}.${domain}`,
			ip: ip(40 + Math.floor(rng() * 20)),
			links: ["gw", "badge"],
			keys: ["svc-password"],
			locked: false,
			defence: 2,
			blurb: "The shared drive everyone dumps their work on.",
			loot: [
				{
					id: "admin-token",
					label: "Admin token in a forgotten script",
					kind: "key",
					blurb: "Opens the badge server and the core."
				},
				{
					id: "files-cash",
					label: "Petty-cash sheet with live account details",
					kind: "cash",
					blurb: "Quietly skim it into the treasury.",
					amount: cash(500, 1400)
				}
			]
		},
		{
			id: "badge",
			role: "badge",
			name: `${names.badge}.${domain}`,
			ip: ip(60 + Math.floor(rng() * 20)),
			links: ["cams", "files", "core"],
			keys: ["admin-token", "badge-clone"],
			locked: false,
			defence: 3,
			blurb: "The door controller. Every badge swipe passes through here.",
			loot: [
				{
					id: "vault-pin",
					label: "Vault PIN in the door log",
					kind: "key",
					blurb: "Another way through the core's door."
				},
				{
					id: "badge-ghost",
					label: "Forged night-shift badge",
					kind: "ghost",
					blurb: "Makes your activity look like a contractor's. Removes some trace.",
					amount: 20
				}
			]
		},
		{
			id: "core",
			role: "core",
			name: `${names.core}.${domain}`,
			ip: ip(200 + Math.floor(rng() * 50)),
			links: ["badge"],
			keys: ["badge-clone", "admin-token", "vault-pin"],
			locked: true,
			defence: 4,
			blurb: "The crown jewel. A payload launched from here lands harder.",
			loot: [
				{
					id: "master-key",
					label: "Master override key",
					kind: "key",
					blurb: "Payloads from this site get an extra foothold."
				},
				{
					id: "core-cash",
					label: "Discretionary fund ledger",
					kind: "cash",
					blurb: "Skim the fund into the treasury.",
					amount: cash(1500, 3500)
				}
			]
		}
	];
	return { hosts };
}

export const hostById = (net: TargetNetwork, id: string) => net.hosts.find((h) => h.id === id);

/** Find a host by its id, its full name, its short name or its last IP octet. */
export function resolveHost(net: TargetNetwork, query: string): NetHost | undefined {
	const q = query.trim().toLowerCase();
	if (!q) return undefined;
	return (
		net.hosts.find((h) => h.id === q || h.name === q || h.ip === q) ??
		net.hosts.find((h) => h.name.split(".")[0] === q || h.ip.endsWith(`.${q}`)) ??
		net.hosts.find((h) => h.name.startsWith(q) || h.role.startsWith(q))
	);
}

/** Find loot on a host by its id, its 1-based position or the start of its label. */
export function resolveLoot(host: NetHost, query: string): NetLoot | undefined {
	const q = query.trim().toLowerCase();
	if (!q) return undefined;
	const n = Number(q);
	if (Number.isInteger(n) && n >= 1) return host.loot[n - 1];
	return host.loot.find((l) => l.id === q || l.label.toLowerCase().startsWith(q) || l.kind === q);
}

// ── Session state kept on the server ────────────────────────────────────────

export interface DeepState {
	trace: number;
	/** True once the trace filled: the session is dead until reset. */
	traced: boolean;
	/** The host the operator is on. */
	at: string;
	/** Hosts with a shell. */
	owned: string[];
	keys: string[];
	/** Loot ids taken. */
	loot: string[];
	covers: number;
	/** Moves made; seeds the dice. */
	moves: number;
}

export const emptyDeep = (): DeepState => ({
	trace: 0,
	traced: false,
	at: "gw",
	owned: [],
	keys: [],
	loot: [],
	covers: 0,
	moves: 0
});

/** A stored value (possibly from before the deep layer existed) as a full state. */
export function readDeep(raw: Partial<DeepState> | null | undefined): DeepState {
	const base = emptyDeep();
	if (!raw || typeof raw !== "object") return base;
	return {
		trace: Number.isFinite(raw.trace) ? Number(raw.trace) : base.trace,
		traced: !!raw.traced,
		at: typeof raw.at === "string" ? raw.at : base.at,
		owned: Array.isArray(raw.owned) ? [...raw.owned] : base.owned,
		keys: Array.isArray(raw.keys) ? [...raw.keys] : base.keys,
		loot: Array.isArray(raw.loot) ? [...raw.loot] : base.loot,
		covers: Number.isFinite(raw.covers) ? Number(raw.covers) : base.covers,
		moves: Number.isFinite(raw.moves) ? Number(raw.moves) : base.moves
	};
}

export type HopCheck =
	{ ok: false; reason: string } | { ok: true; keyed: boolean; key?: string; chance: number; already: boolean };

/**
 * Can the operator hop to this host from where they are, and at what odds?
 * Owned hosts are free to move between. A matching key opens a host outright;
 * otherwise the operator rolls against its defence, unless it's locked.
 */
export function hopCheck(
	net: TargetNetwork,
	deep: DeepState,
	targetId: string,
	asset: { access: number; heat: number }
): HopCheck {
	const target = hostById(net, targetId);
	if (!target) return { ok: false, reason: "No such host on this network." };
	if (deep.at === target.id) return { ok: false, reason: `You're already on ${target.name}.` };
	if (deep.owned.includes(target.id)) return { ok: true, keyed: true, chance: 1, already: true };
	const reachable = deep.owned.some((id) => hostById(net, id)?.links.includes(target.id));
	if (!reachable) return { ok: false, reason: `${target.name} isn't reachable from the hosts you hold.` };
	const key = target.keys.find((k) => deep.keys.includes(k));
	if (key) return { ok: true, keyed: true, key, chance: 1, already: false };
	if (target.locked) {
		const needs = target.keys.map((k) => KEY_LABEL[k] ?? k).join(" or ");
		return { ok: false, reason: `${target.name} is locked. You need a ${needs}.` };
	}
	return { ok: true, keyed: false, chance: hopChance(target, deep, asset), already: false };
}

/** Odds of forcing an unkeyed host. */
export function hopChance(host: NetHost, deep: Pick<DeepState, "trace">, asset: { access: number; heat: number }) {
	const raw = 0.62 + (asset.access - host.defence) * 0.08 - tracePenalty(deep.trace) - asset.heat / 800;
	return round2(clamp(raw, 0.08, 0.92));
}

/** The dice for one move: deterministic for a given session, hour and move count. */
export function moveRng(seed: number, assetId: number, moves: number, now: Date): () => number {
	return seededRandom(hash32(seed, assetId, moves + 1, Math.floor(now.getTime() / 3_600_000)));
}

// ── Cameras ─────────────────────────────────────────────────────────────────

/** Feeds that need the video recorder host; the outside ones come with any tap. */
export const INSIDE_CAMERAS = ["lobby", "server"] as const;

/** Whether one camera view is available, given the session's deep state. */
export function cameraAccess(view: string, deep: Pick<DeepState, "owned"> | null | undefined): boolean {
	if (!(INSIDE_CAMERAS as readonly string[]).includes(view)) return true;
	return !!deep?.owned.includes("cams");
}

/** Extra footholds a payload gets from this session's loot. */
export const payloadBonus = (deep: Pick<DeepState, "keys"> | null | undefined) =>
	deep?.keys.includes("master-key") ? 1 : 0;

// ── Terminal input ──────────────────────────────────────────────────────────

/** Split a typed line into a lowercase command and its arguments. */
export function parseCommand(input: string): { cmd: string; args: string[] } {
	const parts = input.trim().split(/\s+/).filter(Boolean);
	return { cmd: (parts[0] ?? "").toLowerCase(), args: parts.slice(1) };
}

/** `exploit <port> [quiet|standard|loud]`, in either order; the tier defaults to standard. */
export function parseExploitArgs(args: string[]): { port: number | null; tier: ExploitTier; bad: string | null } {
	let port: number | null = null;
	let tier: ExploitTier = "standard";
	let bad: string | null = null;
	for (const raw of args) {
		const a = raw.toLowerCase().replace(/^:/, "");
		if (/^\d+$/.test(a)) port = Number(a);
		else if (isExploitTier(a)) tier = a;
		else bad ??= raw;
	}
	return { port, tier, bad };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
