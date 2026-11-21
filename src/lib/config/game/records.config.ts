// What an operator actually finds inside a compromised site: a file system
// with mail, logs, finance, personnel, legal, operational and backup records.
// The files are deterministic for a site and intentionally "partially
// compromising" — redacted names, clipped lines, half-deleted attachments and
// the mundane details that let an analyst piece a picture together.
//
// Pure data and functions: the explorer and the server use the same catalogue.

import { hash32, seededRandom } from "./recon.config";
import type { Site } from "./infiltration.config";

export type RecordKind =
	| "email"
	| "log"
	| "memo"
	| "invoice"
	| "roster"
	| "contract"
	| "report"
	| "config"
	| "transcript"
	| "ledger"
	| "note"
	| "medical";
export type Classification = "PUBLIC" | "INTERNAL" | "RESTRICTED" | "SECRET" | "TOP SECRET";

export const CONTENT_KIND_LABEL: Record<RecordKind, string> = {
	email: "Email",
	log: "System log",
	memo: "Memo",
	invoice: "Invoice",
	roster: "Personnel roster",
	contract: "Contract",
	report: "Report",
	config: "Configuration",
	transcript: "Call transcript",
	ledger: "Ledger",
	note: "Working note",
	medical: "Personnel health"
};

export const CLASSIFICATION_TONE: Record<Classification, "neutral" | "amber" | "orange" | "red" | "purple"> = {
	PUBLIC: "neutral",
	INTERNAL: "neutral",
	RESTRICTED: "amber",
	SECRET: "orange",
	"TOP SECRET": "red"
};

export interface SystemRecord {
	/** Stable id: its path without the leading slash. */
	id: string;
	path: string;
	name: string;
	kind: RecordKind;
	classification: Classification;
	author: string;
	date: string;
	size: number;
	/** Heat added to the asset when this file is copied out. */
	heat: number;
	body: string;
	excerpt: string;
}

export interface FileSystem {
	host: string;
	dirs: string[];
	files: SystemRecord[];
}

const FIRST = ["M", "A", "L", "J", "R", "K", "T", "S", "D", "N", "P", "E"];
const LAST = [
	"Holloway",
	"Vance",
	"Keller",
	"Okonkwo",
	"Marchetti",
	"Lindqvist",
	"Beaumont",
	"Rahman",
	"Sato",
	"Delacroix",
	"Novak",
	"Ferreira",
	"Whitlock",
	"Amari",
	"Petrov",
	"Bergstrom"
];
const DEPTS = [
	"operations",
	"procurement",
	"finance",
	"personnel",
	"security",
	"engineering",
	"compliance",
	"logistics"
];
const CODEWORDS = ["NORTHBOUND", "GLASSHOUSE", "QUIET FERRY", "LANTERN", "THIRD SHIFT", "PAPER TRAIN", "RED LEDGER"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type Rng = () => number;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]!;
const person = (rng: Rng) => `${pick(rng, FIRST)}. ${pick(rng, LAST)}`;
const date = (rng: Rng, year: number) =>
	`${String(Math.floor(rng() * 27) + 1).padStart(2, "0")} ${pick(rng, MONTHS)} ${year}`;

/** Blank out a few phrases so the file reads like a partially exposed record. */
function redact(text: string, rng: Rng, heavy: boolean): string {
	const secrets = [
		/[A-Z][a-z]+ [A-Z][a-z]+/g,
		/account \d{4,}/g,
		/[\w.-]+@[\w.-]+\.gov/g,
		/\+\d[\d -]{7,}/g,
		/[A-Z]{2,4}-\d{3,5}/g
	];
	let out = text;
	let scrubs = heavy ? 3 : 1;
	for (const re of secrets) {
		if (scrubs <= 0) break;
		out = out.replace(re, (m) => (rng() < 0.55 ? `[REDACTED]` : "▓".repeat(Math.min(12, m.length))));
		scrubs--;
	}
	if (heavy && rng() < 0.5) {
		const lines = out.split("\n");
		const at = Math.floor(rng() * Math.max(1, lines.length - 1));
		lines[at] = "\t[ 3 LINES REMOVED BY RETENTION POLICY ]";
		out = lines.join("\n");
	}
	return out;
}

interface Content {
	kind: RecordKind;
	classification: Classification;
	name: (n: number, rng: Rng) => string;
	body: (v: Vars) => string;
}
interface Vars {
	target: string;
	site: Site;
	code: string;
	n: number;
	year: number;
	who: string;
	dept: string;
	word: string;
}

const CONTENT: Content[] = [
	{
		kind: "email",
		classification: "RESTRICTED",
		name: (n, rng) => `RE_ ${pick(rng, ["delivery", "access", "handover", "exception", "vendor"])}${n}.eml`,
		body: (v) =>
			`From: ${v.who} <${v.dept}@${v.site.code.toLowerCase()}.gov>\nTo: operations@${v.target.toLowerCase().replace(/[^a-z]/g, "")}.gov\nSubject: ${v.word} — follow up\n\nThe ${v.word} shipment is still on the old schedule. Please do not circulate the revised annex beyond this list.\n\nI have attached the signed copy; the second page lists contacts we agreed not to keep in the shared drive. If procurement asks, refer them to account 4471-${v.n * 31}.\n\nRegards,\n${v.who}`
	},
	{
		kind: "log",
		classification: "INTERNAL",
		name: (n) => `auth${n}.log`,
		body: (v) =>
			`${v.dateLine()} 08:14:02 sshd[${1000 + v.n * 7}]: Accepted publickey for svc_${v.dept} from 198.51.100.${20 + v.n}\n${v.dateLine()} 08:39:41 sudo: svc_${v.dept} : TTY=pts/${v.n} ; PWD=/opt ; COMMAND=/usr/bin/tail -f ${v.dept}.log\n${v.dateLine()} 09:02:17 kernel: USB device 1-${v.n}:2: new device detected, vendor "unknown"\n${v.dateLine()} 11:48:05 sshd[${2000 + v.n}]: Failed password for ${v.who} from 203.0.113.${40 + v.n} port ${40000 + v.n * 11}\n${v.dateLine()} 23:57:51 cron: session opened for root by (unknown)`
	},
	{
		kind: "memo",
		classification: "SECRET",
		name: (n, rng) => `${pick(rng, ["brief", "note", "directive", "circular"])}${n}.txt`,
		body: (v) =>
			`MEMORANDUM — ${v.dept.toUpperCase()}\nRef: ${v.code}/07/${v.n}\nDate: ${v.dateLine()}\n\n1. The ${v.word} arrangement continues until further notice.\n2. Staff are reminded that the annex is not to be filed with the public record.\n3. ${v.who} will hold the only signed copy.\n\nThis note has been marked for retention. Distribution: ${v.dept}, security.`
	},
	{
		kind: "invoice",
		classification: "RESTRICTED",
		name: (n) => `INV-${4000 + n * 17}-${vYear(n)}.pdf.idx`,
		body: (v) =>
			`INVOICE ${v.code}-${v.n}\nSupplier: ${pick(rngLocal(v.n), ["Northgate Logistics", "Ashford Consulting", "Meridian Supply", "Blue Harbour Ltd"])}\nDescription: ${v.dept} services, ${v.word}\nAmount: $${(v.n * 18400).toLocaleString("en-US")}\nPaid: ${v.dateLine()}\n\nNote: invoice matched to purchase order ${v.n * 91} but no goods receipt on file. Approval signature: ________`
	},
	{
		kind: "roster",
		classification: "SECRET",
		name: (n) => `roster_w${n}.csv`,
		body: (v) =>
			`name,role,clearance,shift,contact\n${v.who},${v.dept} lead,TOP SECRET,night,${v.n * 771}\n${person(rngLocal(v.n + 3))},technician,SECRET,day,${v.n * 772}\n${person(rngLocal(v.n + 9))},guard,INTERNAL,night,${v.n * 773}\n[REDACTED], contractor, RESTRICTED, rotating, [REDACTED]\n\nShift handover at 06:00. Badge office keeps the original.`
	},
	{
		kind: "contract",
		classification: "TOP SECRET",
		name: (n, rng) => `${pick(rng, ["framework", "service", "supply", "maintenance"])}_${n}_signed.txt`,
		body: (v) =>
			`AGREEMENT ${v.code}/${v.n} — PARTIAL COPY\n\nThe supplier shall provide ${v.word} to ${v.site.name} under the terms of annex B.\n\nAnnex B (extract): delivery windows, contact points and the names of the two officers authorised to approve exceptions have been removed from this copy. The original is held by ${v.dept}.\n\nSigned: ${v.who}  Date: ${v.dateLine()}`
	},
	{
		kind: "report",
		classification: "SECRET",
		name: (n, rng) => `${pick(rng, ["incident", "audit", "inspection", "postmortem"])}_${n}.md`,
		body: (v) =>
			`# ${v.word} — ${v.dept} report\n\nOn ${v.dateLine()} an anomaly was recorded in the ${v.site.code} ${v.dept} systems.\n\nFindings: access logs show an unauthorised session from a maintenance account. The responsible officer was ${v.who}. Three pages detail which records were touched; those pages are withheld pending review.\n\nRecommendation: rotate credentials and brief ${v.dept} only.`
	},
	{
		kind: "config",
		classification: "RESTRICTED",
		name: (n, rng) => `${pick(rng, ["gateway", "hmi", "switch", "Collector", "agent"])}${n}.ini`,
		body: (v) =>
			`[service]\nhost = ${v.site.code.toLowerCase()}-${v.n}.${v.target.toLowerCase().replace(/[^a-z]/g, "")}.gov\nport = ${502 + v.n}\nuser = svc_${v.dept}\npassword = ▓▓▓▓▓▓▓▓  (stored in plain text)\n\n[remote]\nenabled = true\nallowed = 198.51.100.0/24, 203.0.113.0/24\n\n[logging]\nforward = syslog.${v.dept}.gov\nretention = 7d`
	},
	{
		kind: "transcript",
		classification: "TOP SECRET",
		name: (n) => `call_${String(n).padStart(3, "0")}.txt`,
		body: (v) =>
			`TRANSCRIPT — line ${v.word}, ${v.dateLine()}\n\nA: Is the second consignment still on the books?\nB: Only in ${v.dept}. The public manifest shows the first one.\nA: And the names?\nB: [REDACTED] took them out of the system on ${v.dateLine()}.\nA: Keep it that way. ${v.word} does not leave this room.\n\nEnd of extract. ` +
			`Remaining ${v.n * 3} minutes withheld.`
	},
	{
		kind: "ledger",
		classification: "SECRET",
		name: (n) => `ledger_${n}.csv`,
		body: (v) =>
			`date,reference,description,debit,credit\n${v.dateLine()},${v.code}-${v.n},"${v.word} — ${v.dept}",${v.n * 32000},0\n${v.dateLine()},${v.code}-${v.n + 1},"consultancy",0,${v.n * 24000}\n${v.dateLine()},[REDACTED],"off-book adjustment",${v.n * 9000},0\n\nReconciled by ${v.who}; second signature missing.`
	},
	{
		kind: "note",
		classification: "INTERNAL",
		name: (n, rng) => `${pick(rng, ["todo", "handover", "readme", "scratch"])}${n}.txt`,
		body: (v) =>
			`- ask ${v.who} about ${v.word}\n- the old password still works on the ${v.dept} terminal\n- do not forget: annex goes to the safe, not the shared drive\n- ${v.code} — check before ${v.dateLine()}\n\n[personal note scratched out]`
	},
	{
		kind: "medical",
		classification: "RESTRICTED",
		name: (n) => `health_${n}.idx`,
		body: (v) =>
			`PERSONNEL HEALTH INDEX — ${v.dept}\n${v.who}: cleared / restricted duties since ${v.dateLine()}\n[REDACTED]: referred off-site, reason withheld\n\nAccess to full records limited to medical officer. This index was left on a shared drive.`
	}
];

const rngLocal = (seed: number) => seededRandom(hash32(seed, 0x8e1));
const vYear = (n: number) => 2024 + (n % 3);

/** Folders and how many records each holds. The mix is what makes it feel lived-in. */
const LAYOUT: { dir: string; count: number; kinds: RecordKind[] }[] = [
	{ dir: "/home/operator", count: 4, kinds: ["note", "email", "log", "memo"] },
	{ dir: "/var/log", count: 5, kinds: ["log", "log", "log", "log", "report"] },
	{ dir: "/srv/shared", count: 3, kinds: ["memo", "note", "report"] },
	{ dir: "/srv/shared/finance", count: 4, kinds: ["invoice", "ledger", "invoice", "memo"] },
	{ dir: "/srv/shared/hr", count: 4, kinds: ["roster", "medical", "memo", "email"] },
	{ dir: "/srv/shared/legal", count: 3, kinds: ["contract", "email", "memo"] },
	{ dir: "/srv/shared/ops", count: 4, kinds: ["report", "transcript", "config", "roster"] },
	{ dir: "/opt/system", count: 4, kinds: ["config", "log", "note", "report"] },
	{ dir: "/mail", count: 5, kinds: ["email", "email", "email", "transcript", "email"] },
	{ dir: "/backup", count: 2, kinds: ["ledger", "roster"] }
];

/** The full file system of one site, stable across visits. */
export function fileSystemFor(site: Site, target: string): FileSystem {
	const rng = seededRandom(hash32(site.seed, 0xf11e5));
	const year = 2024 + (site.seed % 3);
	const files: SystemRecord[] = [];

	for (const folder of LAYOUT) {
		const dir = folder.dir === "/opt/system" ? `/opt/${site.kind === "powerplant" ? "scada" : site.kind}` : folder.dir;
		for (let i = 0; i < folder.count; i++) {
			const kind = folder.kinds[i % folder.kinds.length]!;
			const template =
				CONTENT.filter((c) => c.kind === kind)[
					Math.floor(rng() * 3) % Math.max(1, CONTENT.filter((c) => c.kind === kind).length)
				] ?? CONTENT[0]!;
			const vars: Vars = {
				target,
				site,
				code: site.code.replace(/[^A-Z0-9]/g, "").slice(0, 6),
				n: i + 1 + (site.seed % 5),
				year,
				who: person(rng),
				dept: pick(rng, DEPTS),
				word: pick(rng, CODEWORDS),
				dateLine: () => date(rng, year)
			};
			const name = dir === "/mail" ? `msg_${String(vars.n).padStart(3, "0")}.eml` : template.name(vars.n, rng);
			const path = `${dir}/${name}`;
			const raw = template
				.body(vars)
				.replace(/\{target\}/g, target)
				.replace(/\{site\}/g, site.name);
			const classification = rng() < 0.18 ? "TOP SECRET" : template.classification;
			const body = redact(raw, rng, classification === "TOP SECRET" || classification === "SECRET");
			files.push({
				id: path.slice(1),
				path,
				name,
				kind,
				classification,
				author: vars.who,
				date: vars.dateLine(),
				size: 800 + Math.floor(rng() * 38_000),
				heat:
					classification === "TOP SECRET"
						? 9
						: classification === "SECRET"
							? 7
							: classification === "RESTRICTED"
								? 5
								: 3,
				body,
				excerpt:
					body
						.split("\n")
						.find((l) => l.trim().length > 12)
						?.trim()
						.slice(0, 110) ?? ""
			});
		}
	}
	const dirs = [...new Set([...LAYOUT.map((l) => l.dir), "/", "/srv", "/srv/shared", "/var", "/opt", "/home"])].sort();
	return { host: `${site.code.toLowerCase()}-fs`, dirs, files };
}

/** Directory listing at a path: immediate child folders and files. */
export function listDirectory(fs: FileSystem, path: string) {
	const normal = path.replace(/\/+$/, "") || "/";
	const prefix = normal === "/" ? "/" : `${normal}/`;
	const childDirs = fs.dirs
		.filter((d) => d.startsWith(prefix) && d !== normal)
		.map((d) => {
			const rest = d.slice(prefix.length).split("/")[0]!;
			return `${prefix}${rest}`;
		})
		.filter((d, i, a) => a.indexOf(d) === i)
		.sort();
	const files = fs.files
		.filter((f) => f.path.startsWith(prefix) && !f.path.slice(prefix.length).includes("/"))
		.sort((a, b) => a.name.localeCompare(b.name));
	return { path: normal, dirs: childDirs, files };
}

/** Keyword search across the file system, with one matching line per hit. */
export function findRecords(fs: FileSystem, query: string): { record: SystemRecord; match: string }[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return fs.files
		.map((record) => {
			const line = record.body.split("\n").find((l) => l.toLowerCase().includes(q));
			return line ? { record, match: line.trim().slice(0, 140) } : null;
		})
		.filter((r): r is { record: SystemRecord; match: string } => !!r)
		.slice(0, 12);
}
