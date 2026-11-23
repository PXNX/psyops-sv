// Covert operations, part 3: the player-driven network underneath them.
//
// Instead of launching an operation straight away, a state's leadership can
// build a network inside a target, then use it to do the quiet work: probe a
// site, watch its security cameras, pull its sensitive files. Every action
// leaves heat on the asset; too much and it burns. Live footholds make the
// ordinary cyber/psyops operations in cyber.config.ts likelier to work and
// harder to trace — so the simulation feeds the rest of the game.
//
// Pure data and pure functions only: the browser imports this for the console,
// the server for rules and catalogues. No SvelteKit or DB imports here.

import { NETWORK_ASSET_BONUS } from "./cyber.config";
import { hash32, seededRandom } from "./recon.config";

export type AssetKind = "agent" | "implant" | "relay" | "insider" | "botnet";
export type InfiltrationActionKind = "probe" | "camera" | "files" | "cover";
export type SiteKind =
	| "powerplant"
	| "airbase"
	| "datacenter"
	| "telecom"
	| "lab"
	| "command"
	| "company"
	| "factory"
	| "party";

export interface AssetSpec {
	label: string;
	blurb: string;
	/** Treasury cost to plant it. */
	cost: number;
	/** 1-5. Higher access reaches harder sites. */
	access: number;
	/** Heat on the asset just for establishing it. */
	plantHeat: number;
}

export const INFILTRATION_ASSETS: Record<AssetKind, AssetSpec> = {
	relay: {
		label: "Dead-drop relay",
		blurb: "A rented mailbox and a cut-out. Cheap, expendable, gets you a first look at a site.",
		cost: 18_000,
		access: 1,
		plantHeat: 8
	},
	agent: {
		label: "Field agent",
		blurb: "A handler with a cover job near the target's infrastructure. Can reach most perimeter systems.",
		cost: 42_000,
		access: 2,
		plantHeat: 12
	},
	botnet: {
		label: "Botnet lease",
		blurb: "Borrowed machines inside the target's networks. Fast access, noisy footprint.",
		cost: 28_000,
		access: 2,
		plantHeat: 16
	},
	implant: {
		label: "Network implant",
		blurb: "A persistence kit in a maintenance subnet: cameras, file shares and control systems open up.",
		cost: 55_000,
		access: 3,
		plantHeat: 18
	},
	insider: {
		label: "Recruited insider",
		blurb: "Someone on the inside with real credentials. Reaches the sealed files — and is the hardest to keep.",
		cost: 80_000,
		access: 4,
		plantHeat: 24
	}
};

export const ASSET_KINDS = Object.keys(INFILTRATION_ASSETS) as AssetKind[];

export interface ActionSpec {
	label: string;
	blurb: string;
	cost: number;
	heat: number;
	/** Base chance before the asset's access, the site's security and heat. */
	baseChance: number;
}

export const INFILTRATION_ACTIONS: Record<InfiltrationActionKind, ActionSpec> = {
	probe: {
		label: "Probe site",
		blurb: "Map the perimeter and count the guards. Reveals the site's security rating and what may be taken.",
		cost: 1_000,
		heat: 4,
		baseChance: 0.95
	},
	camera: {
		label: "View cameras",
		blurb: "Tap the site's CCTV and watch the gates, runways and turbine halls in real time.",
		cost: 2_500,
		heat: 10,
		baseChance: 0.85
	},
	files: {
		label: "Pull files",
		blurb: "Reach the private systems and copy the sensitive files: manifests, rotas, grid loads, contingency plans.",
		cost: 6_000,
		heat: 20,
		baseChance: 0.7
	},
	cover: {
		label: "Cover tracks",
		blurb: "Scrub logs and rotate the cut-out. Always works, but it costs money and does not uncover anything.",
		cost: 9_000,
		heat: -35,
		baseChance: 1
	}
};

export const INFILTRATION_ACTION_KINDS = Object.keys(INFILTRATION_ACTIONS) as InfiltrationActionKind[];

export const INFILTRATION = {
	/** How many footholds one state may keep inside a single target. */
	MAX_ASSETS_PER_TARGET: 4,
	/** Heat at which an asset is burned and can no longer be used. */
	HEAT_MAX: 100,
	/** Heat an idle asset sheds per hour. */
	HEAT_DECAY_PER_HOUR: 3,
	/** A found file's body is capped so the ledger stays readable. */
	FILE_MAX_CHARS: 4_000,
	/** Number of operations ledger entries to keep in the console. */
	LOG_LIMIT: 30,
	/** Turning an enemy asset is expensive and very unlikely to work. */
	FLIP_COST: 120_000,
	FLIP_CHANCE: 0.03,
	FLIP_HEAT_ON_FAILURE: 22,
	/** Secrets a successful double agent hands over. */
	FLIP_SECRETS: 2
} as const;

/** Cap the visible odds factor at the same place the planner caps its bonus. */
export const networkFootholdCap = NETWORK_ASSET_BONUS.CAP;

// ── What a spy network reveals about another state ──────────────────────────

export type IntelVisibleField =
	| "unitCounts"
	| "unitTypes"
	| "installations"
	| "battleDetail"
	| "economy"
	| "resources"
	| "stances"
	| "treasury";

/** Each additional live foothold inside a state opens another layer of its file. */
export function visibleFields(depth: number): ReadonlySet<IntelVisibleField> {
	const d = Math.max(0, Math.floor(depth));
	const fields: IntelVisibleField[] = [];
	if (d >= 1) fields.push("unitCounts");
	if (d >= 2) fields.push("installations");
	if (d >= 3) fields.push("unitTypes", "battleDetail", "economy");
	if (d >= 4) fields.push("resources", "stances", "treasury");
	return new Set(fields);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pick = <T>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]!;

// ── Assets ──────────────────────────────────────────────────────────────────

const CODENAME_FIRST = [
	"Quiet",
	"Amber",
	"Hollow",
	"Copper",
	"Long",
	"Winter",
	"Broken",
	"Silver",
	"Silent",
	"Red",
	"Cold",
	"Paper",
	"Iron",
	"Velvet",
	"Blind",
	"Second",
	"Distant",
	"Bitter",
	"Open",
	"Dark"
];
const CODENAME_LAST = [
	"Lantern",
	"Ledger",
	"Falcon",
	"Harbour",
	"Compass",
	"Cipher",
	"Willow",
	"Reckoning",
	"Sparrow",
	"Threshold",
	"Mirror",
	"Keystone",
	"Orchard",
	"Signal",
	"Foreman",
	"Chapel",
	"Marigold",
	"Notary",
	"Anchor",
	"Bell"
];

/** Stable, evocative codename for the n-th asset a state plants in a target. */
export function assetCodename(stateId: number, targetId: number, index: number): string {
	const rng = seededRandom(hash32(stateId, targetId, index, 0x1f11a));
	return `${pick(rng, CODENAME_FIRST)} ${pick(rng, CODENAME_LAST)}`;
}

/** Heat after idle decay. Stored heat never changes; the clock does the work. */
export function effectiveHeat(asset: { heat: number; lastActionAt: string | Date }, now = new Date()): number {
	const last = new Date(asset.lastActionAt).getTime();
	const hours = Number.isFinite(last) ? Math.max(0, (now.getTime() - last) / 3600_000) : 0;
	return Math.round(clamp(asset.heat - hours * INFILTRATION.HEAT_DECAY_PER_HOUR, 0, INFILTRATION.HEAT_MAX));
}

/** Chance a given action works: access versus security, minus accumulated heat. */
export function actionChance(
	kind: InfiltrationActionKind,
	asset: { access: number; heat: number },
	site: { security: number }
): number {
	const spec = INFILTRATION_ACTIONS[kind];
	if (kind === "cover") return 1;
	const edge = (asset.access - site.security) * 0.1;
	return round2(clamp(spec.baseChance + edge - asset.heat / 500, 0.15, 0.98));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Target sites ────────────────────────────────────────────────────────────

export interface SiteSpec {
	label: string;
	blurb: string;
	security: number;
	accessRequired: number;
	/** What the camera sees, used by the feed's caption. */
	camera: string;
}

export const SITE_TYPES: Record<SiteKind, SiteSpec> = {
	powerplant: {
		label: "Power plant",
		blurb: "Turbine halls, cooling towers and the control room that keeps the lights on.",
		security: 3,
		accessRequired: 2,
		camera: "TURBINE HALL / PERIMETER"
	},
	airbase: {
		label: "Air base",
		blurb: "Runway, hangars and dispersal pans. The cameras watch the apron and the gate.",
		security: 4,
		accessRequired: 3,
		camera: "APRON / GATE 04"
	},
	datacenter: {
		label: "Data centre",
		blurb: "Rows of servers holding payroll, correspondence and things nobody put in the newspaper.",
		security: 4,
		accessRequired: 3,
		camera: "SERVER FLOOR / BADGE READER"
	},
	telecom: {
		label: "Telecom hub",
		blurb: "The switch that carries the state's calls and traffic. Private data passes through here.",
		security: 2,
		accessRequired: 1,
		camera: "SWITCH HALL / LOADING BAY"
	},
	lab: {
		label: "Research lab",
		blurb: "Civil labs with military contracts: prototypes, test logs and procurement records.",
		security: 3,
		accessRequired: 2,
		camera: "CLEAN ROOM / SERVICE CORRIDOR"
	},
	command: {
		label: "Command centre",
		blurb: "A regional headquarters. Sealed files, duty rosters and the contingency plans.",
		security: 5,
		accessRequired: 4,
		camera: "OPS FLOOR / ACCESS CONTROL"
	},
	company: {
		label: "Company office",
		blurb: "A firm's head office in the region: contracts, payroll and the correspondence of its owner.",
		security: 3,
		accessRequired: 2,
		camera: "FRONT DESK / BOARDROOM"
	},
	factory: {
		label: "Factory floor",
		blurb: "Production lines, shift rotas and the books that show what the plant really makes.",
		security: 2,
		accessRequired: 1,
		camera: "ASSEMBLY HALL / TIME CLOCK"
	},
	party: {
		label: "Party office",
		blurb: "A local party bureau: membership lists, donations and the machinery behind the campaign.",
		security: 3,
		accessRequired: 2,
		camera: "CANVASS DESK / MAIL ROOM"
	}
};

export interface Site {
	/** Stable key, e.g. `airbase-3-0` or `plant-42`. */
	id: string;
	kind: SiteKind;
	name: string;
	code: string;
	region: string;
	security: number;
	accessRequired: number;
	blurb: string;
	camera: string;
	seed: number;
}

const SITE_NAMES: Record<SiteKind, string[]> = {
	powerplant: ["Northbank", "Ashfield", "Vale", "Highbridge", "Redwater", "Southgate"],
	airbase: ["Falcon", "Ironside", "Kestrel", "Vanguard", "Skyward", "Rampart"],
	datacenter: ["Archive", "Vault", "Ledger", "Cipher", "Ledger House", "Coldstore"],
	telecom: ["Exchange", "Crossroads", "Relay", "Switchyard", "Junction", "Beacon"],
	lab: ["Apollo", "Foundry", "Helix", "Aurora", "Forge", "Meridian"],
	command: ["Citadel", "Bastion", "Keystone", "Garrison", "Watchtower", "Bulwark"],
	company: ["Meridian", "Northbank", "Ashfield", "Vale", "Harbour", "Redwater"],
	factory: ["Ashfield", "Highbridge", "Southgate", "Riverside", "Forge", "Foundry"],
	party: ["Citadel", "Crossroads", "Beacon", "Junction", "Marigold", "Ledger"]
};

const SITE_SUFFIX: Record<SiteKind, string> = {
	powerplant: "Power Station",
	airbase: "Air Base",
	datacenter: "Data Centre",
	telecom: "Telecom Exchange",
	lab: "Research Institute",
	command: "Regional Command",
	company: "Company Office",
	factory: "Works",
	party: "Party Bureau"
};

const PLANT_LABEL: Record<string, string> = {
	coal: "Coal Plant",
	gas: "Gas Plant",
	nuclear: "Nuclear Plant",
	hydro: "Hydro Plant",
	solar: "Solar Farm",
	wind: "Wind Farm",
	oil: "Oil Plant",
	biofuel: "Biofuel Plant",
	geothermal: "Geothermal Plant"
};

/**
 * The site catalogue for a target: its real power plants, plus a handful of
 * deterministic installations of every other kind. Stable for a given state,
 * so a site's codename, security and camera view never change between visits.
 */
export interface SiteEntity {
	id: number;
	name: string;
	region?: string;
}

export interface SiteEntities {
	companies?: SiteEntity[];
	factories?: SiteEntity[];
	parties?: SiteEntity[];
}

export function sitesForTarget(
	stateId: number,
	plants: { id: number; plantType: string; name?: string; region?: string }[] = [],
	entities: SiteEntities = {}
): Site[] {
	const rng = seededRandom(hash32(stateId, 0x5717e));
	const sites: Site[] = plants.map((p, i) => {
		const spec = SITE_TYPES.powerplant;
		const label = PLANT_LABEL[p.plantType] ?? "Power Station";
		return {
			id: `plant-${p.id}`,
			kind: "powerplant",
			name: p.name || `${pick(rng, SITE_NAMES.powerplant)} ${label}`,
			code: `PWR-${String(p.id).padStart(3, "0")}`,
			region: p.region || "unknown district",
			security: clamp(spec.security + (i % 2), 1, 5),
			accessRequired: spec.accessRequired,
			blurb: spec.blurb,
			camera: spec.camera,
			seed: hash32(stateId, p.id, 0x5a1)
		};
	});
	// Real organisations in the target's regions are just as hackable as its
	// infrastructure. Their names and region come from the database; the
	// security profile comes from the site type.
	const entityKinds: { kind: SiteKind; rows: SiteEntity[] | undefined; prefix: string }[] = [
		{ kind: "company", rows: entities.companies, prefix: "CO" },
		{ kind: "factory", rows: entities.factories, prefix: "FA" },
		{ kind: "party", rows: entities.parties, prefix: "PA" }
	];
	for (const { kind, rows, prefix } of entityKinds) {
		const spec = SITE_TYPES[kind];
		for (const entity of rows ?? []) {
			const seed = hash32(stateId, kind.length, entity.id, 0x9e1);
			sites.push({
				id: `${kind}-${entity.id}`,
				kind,
				name: entity.name,
				code: `${prefix}-${String(entity.id).padStart(3, "0")}`,
				region: entity.region || "unknown district",
				security: clamp(spec.security + (entity.id % 2), 1, 5),
				accessRequired: spec.accessRequired,
				blurb: spec.blurb,
				camera: spec.camera,
				seed
			});
		}
	}

	const kinds: SiteKind[] = ["airbase", "datacenter", "telecom", "lab", "command"];
	const DISTRICTS = ["Northern", "Eastern", "Southern", "Western", "Central", "Riverside"];
	kinds.forEach((kind, i) => {
		const spec = SITE_TYPES[kind];
		const jitter = i < 2 ? 1 : i > 3 ? -1 : 0;
		const seed = hash32(stateId, i, 0x7c3);
		sites.push({
			id: `${kind}-${stateId}-${i}`,
			kind,
			name: `${pick(rng, SITE_NAMES[kind])} ${SITE_SUFFIX[kind]}`,
			code: `${kind.slice(0, 3).toUpperCase()}-${String((hash32(stateId, i) % 900) + 100)}`,
			region: `${pick(seededRandom(seed), DISTRICTS)} district`,
			security: clamp(spec.security + jitter, 1, 5),
			accessRequired: spec.accessRequired + Math.max(0, jitter),
			blurb: spec.blurb,
			camera: spec.camera,
			seed
		});
	});
	return sites;
}

// ── Sensitive files ─────────────────────────────────────────────────────────

interface FileTemplate {
	title: string;
	classification: string;
	body: (v: Vars) => string;
}
interface Vars {
	state: string;
	site: Site;
	code: string;
	n: number;
	day: string;
}

const FILE_TEMPLATES: Record<SiteKind, FileTemplate[]> = {
	powerplant: [
		{
			title: "Grid load and outage contingency",
			classification: "RESTRICTED",
			body: (v) =>
				`${v.site.name} is running at ${v.n}% of rated output. Two of the ${(v.n % 5) + 3} turbine units are on forced outage, with a return-to-service estimate of ${(v.n % 9) + 2} days.\n\nThe attached load-shedding schedule prioritises military and hospital circuits in the ${v.site.region} district. Control-room shifts are rostered at ${(v.n % 3) + 2} operators per watch; the night watch is routinely one short.\n\nNote: the remote maintenance terminal still uses the vendor's default credentials. This was raised ${(v.n % 7) + 1} months ago and remains open.`
		},
		{
			title: "Fuel delivery manifest",
			classification: "INTERNAL",
			body: (v) =>
				`Deliveries to ${v.code} over the last quarter: ${v.n} consignments, of which ${Math.max(0, v.n - 4)} arrived late. The stockpile covers ${(v.n % 10) + 4} days at current burn.\n\nThe haulier's subcontractor changed in ${v.day}; background checks on the new drivers are listed as pending. Gate logs show an unregistered vehicle at the service entrance on ${(v.n % 20) + 1} occasions.`
		}
	],
	airbase: [
		{
			title: "Apron and dispersal plan",
			classification: "SECRET",
			body: (v) =>
				`${v.site.name} currently holds ${(v.n % 8) + 4} aircraft on the apron, with ${(v.n % 5) + 2} in hardened revetments. The western dispersal pan is unoccupied and unlit.\n\nGround crew rosters, munitions handling sequences and the refuelling plan are attached. Fuel trucks move between the depot and the apron on an unchanged schedule every morning.\n\nThe perimeter camera covering Gate 04 has been out of service for ${(v.n % 12) + 2} days; patrols have been asked to "observe informally".`
		},
		{
			title: "Airfield service order",
			classification: "RESTRICTED",
			body: (v) =>
				`Priority maintenance at ${v.code}: runway lights on the northern threshold, and a fault in the apron floodlighting. Contractors from ${v.state} are expected on ${v.day}.\n\nThe duty officer's report notes that the secondary gate lacks a badge reader and that after-hours access is logged manually in a paper book.`
		}
	],
	datacenter: [
		{
			title: "Private correspondence archive",
			classification: "SECRET",
			body: (v) =>
				`The archive at ${v.site.name} holds ${(v.n * 137).toLocaleString("en-US")} items of ministerial correspondence, including ${(v.n % 20) + 5} flagged for retention beyond the public schedule.\n\nAccess is granted by badge and a second factor held by the duty supervisor. An audit from ${v.day} records ${v.n} after-hours reads that have not been reconciled with any travel or leave record.\n\nBackups are mirrored off-site; the transfer runs nightly at 02:00 over an unencrypted link.`
		},
		{
			title: "Personnel and clearance extract",
			classification: "RESTRICTED",
			body: (v) =>
				`Extract from the personnel file at ${v.code}: ${v.n} staff hold active clearances, ${(v.n % 6) + 1} of which are due for review. Three accounts belonging to departed employees remain enabled.\n\nA note from the security officer warns that the building's visitor log is kept in a spreadsheet on a shared drive.`
		}
	],
	telecom: [
		{
			title: "Traffic intercept and subscriber list",
			classification: "SECRET",
			body: (v) =>
				`${v.site.name} routes ${v.n * 40} circuits through the ${v.site.region} exchange. A maintenance port in the switch hall gives access to the subscriber database and to the lawful-intercept mirror.\n\nThe intercept log for ${v.day} lists ${(v.n % 15) + 3} numbers of interest, including two registered to government offices. Retention is set to ${(v.n % 30) + 30} days.\n\nPhysical security is a single guard and a camera over the loading bay.`
		}
	],
	lab: [
		{
			title: "Prototype test log",
			classification: "SECRET",
			body: (v) =>
				`Test series ${v.n}-A at ${v.site.name} completed ${(v.n % 9) + 4} firings last quarter. Two were recorded as anomalies; the raw telemetry is stored on an unsecured engineering share.\n\nProcurement records show ${v.n} components bought through a shell supplier based outside ${v.state}. The clean-room access list has not been updated since ${v.day}.`
		}
	],
	command: [
		{
			title: "Regional contingency plan",
			classification: "TOP SECRET",
			body: (v) =>
				`${v.site.name} is the alternate seat of command for the ${v.site.region} district. The plan names ${(v.n % 5) + 3} relocation sites and a succession order that has not been briefed to the public.\n\nCommunication procedures rely on the telecom hub and a satellite terminal whose keys are stored in the same safe as the paper copies of this plan. Duty rosters for the operations floor are attached.\n\nAn annex from ${v.day} records a failed access-control test: the alarm was acknowledged but never investigated.`
		}
	],
	company: [
		{
			title: "Client ledger and contracts",
			classification: "RESTRICTED",
			body: (v) =>
				`The ${v.site.region} office of ${v.site.name} keeps ${(v.n % 6) + 2} active supply contracts in this drawer. Two of them name ${v.state} ministries as the end buyer.\n\nPayments are routed through an account that does not appear in the public filing. The memo from ${v.day} asks the bookkeeper to describe the same line as "consultancy" in the next statement.`
		}
	],
	factory: [
		{
			title: "Shift book and output returns",
			classification: "RESTRICTED",
			body: (v) =>
				`${v.site.name} reports ${(v.n % 9) + 3} lines running at full shift, but the maintenance log shows only ${(v.n % 4) + 1} crews certified for the night watch.\n\nA sealed return from ${v.day} records output above the declared capacity. The spare stock is signed for by a forwarding agent, not by the plant manager.`
		}
	],
	party: [
		{
			title: "Membership and canvass returns",
			classification: "INTERNAL",
			body: (v) =>
				`The ${v.site.region} bureau of ${v.site.name} lists ${(v.n % 40) + 20} paid members and a canvass plan for the next election cycle.\n\nA confidential annex from ${v.day} notes which donors asked for their names to be left off the public filing, and who signed the receipts instead.`
		}
	]
};

/** Pick and fill a dossier for a successful file pull. */
export function fileFor(
	site: Site,
	stateName: string,
	nonce: number,
	now = new Date()
): { title: string; classification: string; body: string } {
	const rng = seededRandom(hash32(site.seed, nonce, 0xf11e));
	const templates = FILE_TEMPLATES[site.kind];
	const t = pick(rng, templates);
	const vars: Vars = {
		state: stateName,
		site,
		code: site.code,
		n: Math.floor(rng() * 12) + 1,
		day: `${String(Math.floor(rng() * 27) + 1).padStart(2, "0")} ${pick(rng, ["JAN", "MAR", "MAY", "JUL", "SEP", "NOV"])} ${now.getUTCFullYear()}`
	};
	return {
		title: t.title,
		classification: t.classification,
		body: t.body(vars).slice(0, INFILTRATION.FILE_MAX_CHARS)
	};
}
