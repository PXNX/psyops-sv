// What a site actually runs, and how much of it the operator has earned.
//
// Every site gets its own mix of security cameras, data and internal hosts,
// drawn from its seed and fitted to the kind of site: an airbase watches its
// apron and keeps flight logs, a party office has a lobby camera and donor
// files. Some sites have no cameras at all, some only one, and some keep
// nothing worth reading. Nothing is visible up front: the camera feeds open
// once the operator holds the video recorder, the files once they reach the
// file share. All of it is fictional game content.
//
// Pure data and functions: the server decides what a session may see, the
// client only draws it.

import { hash32, seededRandom } from "./recon.config";
import type { Site, SiteKind } from "./infiltration.config";
import {
	fileSystemFor,
	type Classification,
	type FileSystem,
	type RecordKind,
	type SystemRecord
} from "./records.config";

// ── Cameras ─────────────────────────────────────────────────────────────────

export type CamScene =
	| "gate"
	| "perimeter"
	| "apron"
	| "hangar"
	| "turbine"
	| "control"
	| "yard"
	| "aisle"
	| "badge"
	| "corridor"
	| "switch"
	| "mast"
	| "cleanroom"
	| "ops"
	| "office"
	| "boardroom"
	| "lobby"
	| "line"
	| "dock"
	| "hall";

export const CAM_SCENES: Record<CamScene, { label: string; outdoor: boolean }> = {
	gate: { label: "Main gate", outdoor: true },
	perimeter: { label: "Perimeter fence", outdoor: true },
	apron: { label: "Apron", outdoor: true },
	hangar: { label: "Hangar 2", outdoor: false },
	turbine: { label: "Turbine hall", outdoor: false },
	control: { label: "Control room", outdoor: false },
	yard: { label: "Transformer yard", outdoor: true },
	aisle: { label: "Server aisle", outdoor: false },
	badge: { label: "Badge desk", outdoor: false },
	corridor: { label: "Service corridor", outdoor: false },
	switch: { label: "Switch room", outdoor: false },
	mast: { label: "Mast compound", outdoor: true },
	cleanroom: { label: "Cleanroom", outdoor: false },
	ops: { label: "Ops floor", outdoor: false },
	office: { label: "Office floor", outdoor: false },
	boardroom: { label: "Boardroom", outdoor: false },
	lobby: { label: "Lobby", outdoor: false },
	line: { label: "Line floor", outdoor: false },
	dock: { label: "Loading dock", outdoor: true },
	hall: { label: "Meeting hall", outdoor: false }
};

/** The cameras a kind of site might have, most typical first. */
export const CAMERA_POOL: Record<SiteKind, CamScene[]> = {
	powerplant: ["turbine", "control", "yard", "gate", "perimeter"],
	airbase: ["apron", "gate", "hangar", "perimeter"],
	datacenter: ["aisle", "badge", "corridor", "gate"],
	telecom: ["switch", "mast", "corridor", "gate"],
	lab: ["cleanroom", "corridor", "lobby", "dock"],
	command: ["ops", "gate", "corridor", "perimeter"],
	company: ["office", "boardroom", "lobby", "dock"],
	factory: ["line", "dock", "yard", "gate"],
	party: ["lobby", "hall", "office"]
};

export interface SiteCamera {
	/** Stable per site: `cam-<scene>`. */
	id: string;
	scene: CamScene;
	label: string;
	/** The number on the recorder's channel list, 1–16. */
	channel: number;
}

// ── Data ────────────────────────────────────────────────────────────────────

export interface DataSet {
	id: string;
	label: string;
	/** Folder on the file share. */
	dir: string;
	kind: RecordKind;
	classification: Classification;
	/** File name for the nth record. */
	name: (n: number) => string;
	/** Body lines; `{n}`, `{x}`, `{y}`, `{who}`, `{site}` and `{target}` are filled in. */
	lines: string[];
}

const DATA_POOL: Record<SiteKind, DataSet[]> = {
	powerplant: [
		{
			id: "scada",
			label: "SCADA screen captures",
			dir: "/srv/scada/screens",
			kind: "report",
			classification: "RESTRICTED",
			name: (n) => `hmi_capture_${String(n).padStart(3, "0")}.txt`,
			lines: [
				"HMI SNAPSHOT · {site} · unit {n}",
				"Boiler drum level ......... {x}%",
				"Turbine speed ............. 3{y}0 rpm",
				"Feed pump B ............... STANDBY (maintenance tag by {who})",
				"Alarm list: 2 acknowledged, 0 active"
			]
		},
		{
			id: "handover",
			label: "Shift handover logs",
			dir: "/srv/scada/handover",
			kind: "log",
			classification: "INTERNAL",
			name: (n) => `handover_wk${n}.log`,
			lines: [
				"Shift handover, week {n}",
				"Outgoing: {who}. Incoming: night crew.",
				"Unit {y} derated to {x}% pending inspection.",
				"Reminder: the yard camera still points at the car park."
			]
		},
		{
			id: "outage",
			label: "Planned outage calendar",
			dir: "/srv/scada/planning",
			kind: "memo",
			classification: "SECRET",
			name: (n) => `outage_plan_{y}{n}.txt`,
			lines: [
				"PLANNED OUTAGE WINDOW · {target}",
				"Unit {n} offline for {x} hours from day {y}.",
				"Grid operator informed. Press release held back.",
				"Owner: {who}"
			]
		}
	],
	airbase: [
		{
			id: "flightlog",
			label: "Flight logs",
			dir: "/srv/flightdesk/logs",
			kind: "log",
			classification: "SECRET",
			name: (n) => `flightlog_{y}{n}.csv`,
			lines: [
				"date,callsign,type,dep,arr,remarks",
				"D{n},HAWK{x},trainer,1{y}04,1{y}51,local circuit",
				"D{n},MULE{y},transport,0{y}30,1{x}10,cargo for {target} northern depot",
				"D{n},GHOST{x},recon,0{y}12,—,DEPARTURE NOT LOGGED (see {who})"
			]
		},
		{
			id: "fuel",
			label: "Fuel manifests",
			dir: "/srv/flightdesk/fuel",
			kind: "invoice",
			classification: "RESTRICTED",
			name: (n) => `fuel_manifest_{n}.txt`,
			lines: [
				"FUEL MANIFEST {n}",
				"Bowser 3 · {x}0 000 litres issued",
				"Signed off: {who}",
				"Variance against meter: {y}.{x}% (under review)"
			]
		},
		{
			id: "duty",
			label: "Duty rosters",
			dir: "/srv/flightdesk/rosters",
			kind: "roster",
			classification: "INTERNAL",
			name: (n) => `duty_week{n}.txt`,
			lines: ["DUTY ROSTER · week {n}", "Tower: {who}", "QRA crews: {x}", "Gate 04 guard: two posts, night shift short"]
		}
	],
	datacenter: [
		{
			id: "badgelog",
			label: "Badge log",
			dir: "/srv/mantrap/badges",
			kind: "log",
			classification: "RESTRICTED",
			name: (n) => `badge_{y}{n}.log`,
			lines: [
				"{y}{n}:0{x}:12 MANTRAP-A GRANT {who}",
				"{y}{n}:0{x}:40 HALL-2    GRANT {who}",
				"{y}{n}:2{x}:03 CAGE-7    DENY  unknown card",
				"{y}{n}:2{x}:05 CAGE-7    GRANT visitor badge V-{x}{y}"
			]
		},
		{
			id: "racks",
			label: "Customer rack list",
			dir: "/srv/cold-archive/racks",
			kind: "report",
			classification: "SECRET",
			name: (n) => `racks_hall{n}.txt`,
			lines: [
				"HALL {n} · CAGE ALLOCATION",
				"Cage {x}: {target} interior ministry (do not label)",
				"Cage {y}: tax office mirror",
				"Contact on call: {who}"
			]
		},
		{
			id: "changes",
			label: "Change tickets",
			dir: "/srv/cold-archive/changes",
			kind: "note",
			classification: "INTERNAL",
			name: (n) => `CHG-{y}{x}{n}.txt`,
			lines: ["CHANGE {y}{x}{n}", "Swap PSU in rack {x}", "Window: Sunday 02:00", "Approver: {who}"]
		}
	],
	telecom: [
		{
			id: "routing",
			label: "Call routing tables",
			dir: "/srv/switch/routing",
			kind: "config",
			classification: "SECRET",
			name: (n) => `route_table_{n}.cfg`,
			lines: [
				"# routing table {n}",
				"prefix 0{x}{y} -> trunk {n}",
				"prefix 0{y}{x} -> trunk {x} # mirrored for 'lawful review'",
				"# last edited by {who}"
			]
		},
		{
			id: "billing",
			label: "Billing extracts",
			dir: "/srv/billing-share",
			kind: "ledger",
			classification: "RESTRICTED",
			name: (n) => `billing_extract_{y}{n}.csv`,
			lines: ["account,plan,balance", "{x}{y}{n},gov-fleet,{x}{y}0", "{y}{x}{n},ministry,{y}{x}0", "exported by {who}"]
		},
		{
			id: "towers",
			label: "Tower maintenance plan",
			dir: "/srv/switch/field",
			kind: "memo",
			classification: "INTERNAL",
			name: (n) => `tower_visits_{n}.txt`,
			lines: ["Tower visits, round {n}", "Mast {x}: aviation light out", "Mast {y}: climber booked", "Lead: {who}"]
		}
	],
	lab: [
		{
			id: "protocols",
			label: "Test protocols",
			dir: "/srv/eng-share/protocols",
			kind: "report",
			classification: "SECRET",
			name: (n) => `protocol_TP{y}{n}.txt`,
			lines: [
				"TEST PROTOCOL TP-{y}{n}",
				"Article: prototype {x}",
				"Result: within tolerance on {x} of {y}{x} runs",
				"Witness: {who}"
			]
		},
		{
			id: "samples",
			label: "Sample registry",
			dir: "/srv/eng-share/samples",
			kind: "ledger",
			classification: "RESTRICTED",
			name: (n) => `samples_{n}.csv`,
			lines: ["id,location,owner", "S-{x}{n},freezer {y},{who}", "S-{y}{n},cleanroom bench {x},{who}"]
		},
		{
			id: "grants",
			label: "Grant reports",
			dir: "/srv/eng-share/grants",
			kind: "memo",
			classification: "INTERNAL",
			name: (n) => `grant_report_{n}.txt`,
			lines: ["Grant report {n} for the {target} research council", "Spent: {x}{y}%", "Delays: supplier"]
		}
	],
	command: [
		{
			id: "orders",
			label: "Duty orders",
			dir: "/srv/orders-share/orders",
			kind: "memo",
			classification: "TOP SECRET",
			name: (n) => `order_{y}{x}{n}.txt`,
			lines: ["ORDER {y}{x}{n}", "Readiness raised to level {x} in sector {y}.", "Issued by {who}"]
		},
		{
			id: "readiness",
			label: "Readiness reports",
			dir: "/srv/orders-share/readiness",
			kind: "report",
			classification: "SECRET",
			name: (n) => `readiness_{n}.txt`,
			lines: ["READINESS · week {n}", "Units at strength: {x}{y}%", "Vehicles deadlined: {x}"]
		},
		{
			id: "comms",
			label: "Comms schedule",
			dir: "/srv/orders-share/comms",
			kind: "config",
			classification: "SECRET",
			name: (n) => `comms_plan_{n}.txt`,
			lines: ["Net {n}: check-in every {x} hours", "Fallback channel {y}", "Signals officer: {who}"]
		}
	],
	company: [
		{
			id: "minutes",
			label: "Board minutes",
			dir: "/srv/ledger-share/board",
			kind: "memo",
			classification: "SECRET",
			name: (n) => `board_minutes_q{n}.txt`,
			lines: [
				"BOARD MINUTES · Q{n}",
				"Item {x}: the {target} contract renewal",
				"Item {y}: 'consultancy' payment approved",
				"Minuted by {who}"
			]
		},
		{
			id: "payroll",
			label: "Payroll export",
			dir: "/srv/ledger-share/payroll",
			kind: "ledger",
			classification: "RESTRICTED",
			name: (n) => `payroll_{y}{n}.csv`,
			lines: ["employee,grade,net", "{who},{x},{y}{x}00", "{who},{y},{x}{y}00"]
		},
		{
			id: "suppliers",
			label: "Supplier contracts",
			dir: "/srv/ledger-share/contracts",
			kind: "contract",
			classification: "INTERNAL",
			name: (n) => `supplier_{n}.txt`,
			lines: ["SUPPLY AGREEMENT {n}", "Term: {x} years", "Signed for the supplier by {who}"]
		}
	],
	factory: [
		{
			id: "schedule",
			label: "Production schedule",
			dir: "/srv/stores-share/production",
			kind: "report",
			classification: "RESTRICTED",
			name: (n) => `schedule_wk{n}.txt`,
			lines: ["PRODUCTION · week {n}", "Line {x}: {y}{x}0 units", "Line {y}: retooling", "Planner: {who}"]
		},
		{
			id: "shipping",
			label: "Shipping manifests",
			dir: "/srv/stores-share/shipping",
			kind: "invoice",
			classification: "INTERNAL",
			name: (n) => `manifest_{y}{n}.txt`,
			lines: ["MANIFEST {y}{n}", "{x} pallets to the {target} ministry depot", "Driver: {who}"]
		},
		{
			id: "qa",
			label: "QA reports",
			dir: "/srv/stores-share/qa",
			kind: "report",
			classification: "INTERNAL",
			name: (n) => `qa_batch_{n}.txt`,
			lines: ["QA batch {n}", "Rejects: {x}.{y}%", "Signed off anyway by {who}"]
		}
	],
	party: [
		{
			id: "donors",
			label: "Donor files",
			dir: "/srv/donor-share/donors",
			kind: "ledger",
			classification: "SECRET",
			name: (n) => `donors_{y}{n}.csv`,
			lines: [
				"donor,amount,note",
				"{who},{x}{y}000,via a holding company",
				"{who},{y}{x}000,'do not publish'",
				"Treasurer's note: split the big one into smaller gifts"
			]
		},
		{
			id: "members",
			label: "Membership list",
			dir: "/srv/member-share",
			kind: "roster",
			classification: "RESTRICTED",
			name: (n) => `members_branch{n}.csv`,
			lines: ["branch {n} · {x}{y} members", "chair: {who}", "lapsed: {y}{x}"]
		},
		{
			id: "campaign",
			label: "Campaign plans",
			dir: "/srv/donor-share/campaign",
			kind: "memo",
			classification: "INTERNAL",
			name: (n) => `campaign_{n}.txt`,
			lines: ["CAMPAIGN PLAN {n}", "Target districts: {x} and {y}", "Message lead: {who}"]
		}
	]
};

// ── What one site runs ──────────────────────────────────────────────────────

export interface SiteSystems {
	cameras: SiteCamera[];
	/** The site keeps a file share worth reading. */
	hasFiles: boolean;
	/** Kind-specific data on the file share (empty without a share). */
	dataSets: Pick<DataSet, "id" | "label" | "dir">[];
	/** A separate door controller sits between the outer hosts and the core. */
	hasBadge: boolean;
}

const fullDataSets = (site: Pick<Site, "seed" | "kind">): DataSet[] => {
	const ids = new Set(siteSystems(site).dataSets.map((d) => d.id));
	return (DATA_POOL[site.kind] ?? DATA_POOL.command).filter((d) => ids.has(d.id));
};

/** The cameras, data and hosts of one site: random per site, stable forever. */
export function siteSystems(site: Pick<Site, "seed" | "kind">): SiteSystems {
	const rng = seededRandom(hash32(site.seed, 0x5157));
	const pool = CAMERA_POOL[site.kind] ?? CAMERA_POOL.command;

	// About one site in seven has no cameras at all, one in five only a single one.
	const roll = rng();
	const count = roll < 0.14 ? 0 : roll < 0.36 ? 1 : 2 + Math.floor(rng() * (pool.length - 1));
	// The most typical camera usually makes the cut; the rest are shuffled.
	const rest = pool
		.slice(1)
		.sort((a, b) => hash32(site.seed, a.length, a.charCodeAt(1)) - hash32(site.seed, b.length, b.charCodeAt(1)));
	const order = rng() < 0.7 ? [pool[0]!, ...rest] : [...rest, pool[0]!];
	const base = hash32(site.seed, 0xca) % 9;
	const cameras = order.slice(0, Math.min(count, pool.length)).map((scene, i) => ({
		id: `cam-${scene}`,
		scene,
		label: CAM_SCENES[scene].label,
		channel: ((base + i * 3) % 16) + 1
	}));

	const hasFiles = rng() >= 0.15;
	const data = DATA_POOL[site.kind] ?? DATA_POOL.command;
	const want = hasFiles ? 1 + Math.floor(rng() * data.length) : 0;
	const dataSets = data
		.filter(() => rng() < 0.75)
		.concat(data)
		.filter((d, i, a) => a.indexOf(d) === i)
		.slice(0, want)
		.map(({ id, label, dir }) => ({ id, label, dir }));

	// Without cameras or a file share, the door controller is the only way to the core.
	const hasBadge = rng() < 0.7 || (cameras.length === 0 && !hasFiles);
	return { cameras, hasFiles, dataSets, hasBadge };
}

// ── The files on the share ──────────────────────────────────────────────────

/** Folders that can be missing from a share; the rest are always there. */
const OPTIONAL_DIRS = [
	"/srv/shared/finance",
	"/srv/shared/hr",
	"/srv/shared/legal",
	"/srv/shared/ops",
	"/backup",
	"/mail"
];

const fill = (line: string, v: Record<string, string>) => line.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

/**
 * The file share of a site: the generic office clutter (with some folders
 * missing, so no two shares look alike) plus the site's own kind of data.
 * A site without a share has nothing here at all.
 */
export function siteRecords(site: Site, target: string): FileSystem {
	const systems = siteSystems(site);
	const base = fileSystemFor(site, target);
	if (!systems.hasFiles) return { host: base.host, dirs: ["/"], files: [] };
	const rng = seededRandom(hash32(site.seed, 0xd17));
	const dropped = new Set(OPTIONAL_DIRS.filter(() => rng() < 0.3));
	const inDropped = (path: string) => [...dropped].some((d) => path === d || path.startsWith(`${d}/`));
	const files: SystemRecord[] = base.files.filter((f) => !inDropped(f.path));

	const names = ["M. Holloway", "A. Keller", "R. Sato", "J. Novak", "K. Amari", "T. Beaumont"];
	for (const set of fullDataSets(site)) {
		const count = 2 + Math.floor(rng() * 3);
		for (let i = 1; i <= count; i++) {
			const v = {
				n: String(i),
				x: String(1 + Math.floor(rng() * 9)),
				y: String(1 + Math.floor(rng() * 9)),
				who: names[Math.floor(rng() * names.length)]!,
				site: site.name,
				target
			};
			const name = fill(set.name(i), v);
			const path = `${set.dir}/${name}`;
			const body = set.lines.map((l) => fill(l, v)).join("\n");
			files.push({
				id: path.slice(1),
				path,
				name,
				kind: set.kind,
				classification: set.classification,
				author: v.who,
				date: `${String(1 + Math.floor(rng() * 27)).padStart(2, "0")} ${["MAR", "JUN", "SEP", "NOV"][i % 4]} ${2024 + (site.seed % 3)}`,
				size: 400 + Math.floor(rng() * 12_000),
				heat:
					set.classification === "TOP SECRET"
						? 9
						: set.classification === "SECRET"
							? 7
							: set.classification === "RESTRICTED"
								? 5
								: 3,
				body,
				excerpt: body.split("\n")[0]!.slice(0, 110)
			});
		}
	}
	// Every parent folder of every remaining file, so the tree walks cleanly.
	const dirs = new Set<string>(["/"]);
	for (const f of files) {
		const parts = f.path.split("/").slice(1, -1);
		for (let i = 1; i <= parts.length; i++) dirs.add(`/${parts.slice(0, i).join("/")}`);
	}
	return { host: base.host, dirs: [...dirs].sort(), files };
}

// ── What the operator may see ───────────────────────────────────────────────

export type FileAccess = "unknown" | "none" | "locked" | "open";

export interface SystemsView {
	/** The operator has mapped the network (pivoted in) and knows what's there. */
	mapped: boolean;
	/** How many cameras the site has; null until mapped. */
	cameraCount: number | null;
	/** Cameras the operator can watch: only once the video recorder is theirs. */
	cameras: SiteCamera[];
	files: FileAccess;
	dataSets: string[];
}

/**
 * What one session has earned. Computed on the server and sent as is: the
 * camera list stays empty until the recorder host is owned, the file share
 * stays shut until the operator is on it.
 */
export function systemsView(
	site: Pick<Site, "seed" | "kind">,
	session: { stage: string; deep: { owned: string[]; traced?: boolean } | null } | null
): SystemsView {
	const mapped = !!session && session.stage === "pivot" && !session.deep?.traced;
	if (!mapped) return { mapped: false, cameraCount: null, cameras: [], files: "unknown", dataSets: [] };
	const systems = siteSystems(site);
	const owned = session!.deep?.owned ?? [];
	const filesOpen = systems.hasFiles && owned.includes("files");
	return {
		mapped: true,
		cameraCount: systems.cameras.length,
		cameras: owned.includes("cams") ? systems.cameras : [],
		files: !systems.hasFiles ? "none" : filesOpen ? "open" : "locked",
		dataSets: filesOpen ? systems.dataSets.map((d) => d.label) : []
	};
}

/** Local hour at the site (sites sit a few time zones apart), for day/night feeds. */
export const siteHour = (site: Pick<Site, "seed">, now: Date) => (now.getUTCHours() + (site.seed % 7) - 3 + 24) % 24;
export const isNightAt = (site: Pick<Site, "seed">, now: Date) => {
	const h = siteHour(site, now);
	return h < 6 || h >= 20;
};
