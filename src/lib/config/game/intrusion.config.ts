// The interactive side of cyber operations: an operator works through a site
// one step at a time — scan, pick an exposed service, take it, escalate,
// pivot into the right network segment, then run the action or deploy a
// payload. The artefacts (hosts, ports, banners, hashes, subnets) are
// deterministic and fictional; the rules are pure so both the console and the
// server use the same numbers.
//
// This is a game abstraction of hacking, not an instruction set: every step
// is a button in the UI and resolves to a die roll against the asset's access.

import { hash32, seededRandom } from "./recon.config";
import type { Site } from "./infiltration.config";

export type IntrusionStage = "scan" | "access" | "escalate" | "pivot";
export type LogTone = "info" | "ok" | "warn" | "bad";
export interface LogLine {
	t: string;
	line: string;
	tone: LogTone;
}
export interface ScanPort {
	port: number;
	service: string;
	version: string;
	/** Which attack vector this exposed service opens up. */
	vector?: string;
}

export interface ScanReport {
	host: string;
	ip: string;
	os: string;
	subnet: string;
	ports: ScanPort[];
	notes: string[];
}

export interface AttackVector {
	label: string;
	service: string;
	blurb: string;
	/** Minimum asset access to attempt it. */
	accessNeeded: number;
	/** Added to the access-vs-security roll. */
	bonus: number;
}

export const ATTACK_VECTORS: Record<string, AttackVector> = {
	default_creds: {
		label: "Default HMI credentials",
		service: "scada / modbus",
		blurb: "The control panel was shipped with a vendor password nobody changed.",
		accessNeeded: 1,
		bonus: 0.25
	},
	vpn_cve: {
		label: "Unpatched VPN gateway",
		service: "https / vpn",
		blurb: "A public exploit gives a shell on the gateway before it patches.",
		accessNeeded: 2,
		bonus: 0.1
	},
	phished_operator: {
		label: "Phished operator account",
		service: "ssh / smb",
		blurb: "A reused password from a leaked contractor mailbox gets a login.",
		accessNeeded: 1,
		bonus: 0.15
	},
	exposed_share: {
		label: "Exposed file share",
		service: "smb / rdp",
		blurb: "A writeable share lets a script drop onto a machine that trusts it.",
		accessNeeded: 2,
		bonus: 0.2
	},
	firmware_key: {
		label: "Leaked firmware signing key",
		service: "snmp / mqtt",
		blurb: "A stolen vendor key accepts a crafted update from the network.",
		accessNeeded: 3,
		bonus: 0.3
	}
};

export const INTRUSION = {
	SCAN_COST: 900,
	ACCESS_COST: 1_800,
	ESCALATE_COST: 1_500,
	PIVOT_COST: 2_200,
	SCAN_HEAT: 2,
	FAIL_HEAT: 10,
	SUCCESS_HEAT: 4,
	/** Chance the operator gets away with each step before access/security. */
	BASE: { access: 0.62, escalate: 0.68, pivot: 0.72 },
	/** How much a pivoted session improves a camera/file action. */
	PIVOT_ACTION_BONUS: 0.12,
	/** Extra footholds a deployed payload gets from an established session. */
	PAYLOAD_FOOTHOLDS: 1
} as const;

const pick = <T>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]!;
const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 14);

const HOSTS: Record<Site["kind"], string[]> = {
	powerplant: ["scada-01", "hmi-02", "plc-07", "grid-gw"],
	airbase: ["ops-01", "apron-cctv", "flight-desk", "gate-04"],
	datacenter: ["fs-02", "vault-db", "badge-srv", "backup-01"],
	telecom: ["switch-03", "intercept-gw", "diameter-01", "nms-02"],
	lab: ["test-rig", "eng-share", "cleanroom-01", "lab-db"],
	command: ["ops-floor", "comms-01", "sip-gw", "archive-srv"]
};
const OS = ["Ubuntu 22.04 LTS", "Debian 12", "Windows Server 2019", "CentOS 7", "VxWorks 7"];

/** Deterministic scan of one site: the ports it exposes and how it might be taken. */
export function scanFor(site: Site, target: string): ScanReport {
	const rng = seededRandom(hash32(site.seed, 0x5ca4));
	const host = `${pick(rng, HOSTS[site.kind])}.${slug(target) || "state"}.gov`;
	const ip = `198.51.100.${(site.seed % 200) + 20}`;
	const subnet = `10.${(site.seed % 40) + 10}.${site.seed % 250}.0/24`;
	const os = pick(rng, OS);
	const common: ScanPort[] = [
		{ port: 22, service: "ssh", version: "OpenSSH 8.9p1", vector: "phished_operator" },
		{ port: 443, service: "https", version: "nginx 1.24", vector: "vpn_cve" }
	];
	const byKind: Record<Site["kind"], ScanPort[]> = {
		powerplant: [
			{ port: 502, service: "modbus", version: "Schneider M340", vector: "default_creds" },
			{ port: 161, service: "snmp", version: "net-snmp 5.9", vector: "firmware_key" },
			{ port: 3389, service: "rdp", version: "MS-TDS", vector: "exposed_share" }
		],
		airbase: [
			{ port: 445, service: "smb", version: "Samba 4.15", vector: "exposed_share" },
			{ port: 5060, service: "sip", version: "Asterisk 20", vector: "phished_operator" },
			{ port: 5900, service: "vnc", version: "TightVNC 2.8", vector: "default_creds" }
		],
		datacenter: [
			{ port: 445, service: "smb", version: "Samba 4.17", vector: "exposed_share" },
			{ port: 5432, service: "postgresql", version: "PostgreSQL 15.3", vector: "phished_operator" },
			{ port: 8443, service: "https-alt", version: "Apache 2.4", vector: "vpn_cve" }
		],
		telecom: [
			{ port: 161, service: "snmp", version: "net-snmp 5.7", vector: "firmware_key" },
			{ port: 1883, service: "mqtt", version: "Mosquitto 2.0", vector: "default_creds" },
			{ port: 5060, service: "sip", version: "Asterisk 18", vector: "phished_operator" }
		],
		lab: [
			{ port: 445, service: "smb", version: "Samba 4.13", vector: "exposed_share" },
			{ port: 5432, service: "postgresql", version: "PostgreSQL 14.8", vector: "phished_operator" },
			{ port: 8080, service: "http-alt", version: "Tomcat 9.0", vector: "vpn_cve" }
		],
		command: [
			{ port: 445, service: "smb", version: "Samba 4.19", vector: "exposed_share" },
			{ port: 3389, service: "rdp", version: "MS-TDS", vector: "phished_operator" },
			{ port: 5060, service: "sip", version: "Asterisk 21", vector: "vpn_cve" }
		]
	};
	const ports = [...common, ...byKind[site.kind]].sort((a, b) => a.port - b.port);
	const notes = [
		`${ports.length} ports open; ${ports.filter((p) => p.vector).length} with a known way in`,
		`OS guess: ${os}`,
		`internal segment ${subnet} behind the gateway`
	];
	return { host, ip, os, subnet, ports, notes };
}

/** Chance that a step works: asset access versus site security, plus the vector's edge. */
export function intrusionChance(
	step: "access" | "escalate" | "pivot",
	asset: { access: number; heat: number },
	site: Site,
	vectorId?: string
): number {
	const base = INTRUSION.BASE[step];
	const vector = vectorId ? ATTACK_VECTORS[vectorId] : undefined;
	const edge = (asset.access - site.security) * 0.09 + (vector?.bonus ?? 0);
	return round2(clamp(base + edge - asset.heat / 600, 0.1, 0.95));
}

/** Human-readable transcript lines for a stage, with a DTG stamp supplied by the caller. */
export function stageLines(
	stage: "scan" | "access" | "escalate" | "pivot",
	report: ScanReport,
	vectorId: string | undefined,
	success: boolean,
	target: string,
	t: string
): LogLine[] {
	const line = (text: string, tone: LogTone = "info"): LogLine => ({ t, line: text, tone });
	if (stage === "scan") {
		return [
			line(`$ nmap -sV -Pn ${report.ip}`),
			line(`Starting Nmap 7.94 at ${t}`, "info"),
			line(`Nmap scan report for ${report.host} (${report.ip})`, "ok"),
			...report.ports.map((p) =>
				line(`${String(p.port).padEnd(5)}/tcp open  ${p.service.padEnd(11)} ${p.version}`, "ok")
			),
			line(`MAC Address: ${mac(report.ip)} (unknown)`, "info"),
			line(`Device type: general purpose · Running: ${report.os}`, "info"),
			line(
				`Found ${report.ports.filter((p) => p.vector).length} possible entry points on ${target}'s ${report.subnet}.`,
				"warn"
			)
		];
	}
	if (stage === "access") {
		const v = vectorId ? ATTACK_VECTORS[vectorId] : undefined;
		return success
			? [
					line(`$ exploit --target ${report.ip} --vector ${vectorId ?? "unknown"}`),
					line(`> ${v?.label ?? "Unknown vector"} (${v?.service ?? "service"})`, "info"),
					line("> handshake accepted · banner grabbed", "ok"),
					line(`[+] shell ${report.host} as svc_${slug(report.host).split("-")[0] || "operator"}`, "ok"),
					line(`[+] ${report.subnet} reachable from this host`, "ok")
				]
			: [
					line(`$ exploit --target ${report.ip} --vector ${vectorId ?? "unknown"}`),
					line(`> ${v?.label ?? "Unknown vector"} rejected by ${report.os}`, "warn"),
					line("[-] connection reset · source logged by target SOC", "bad"),
					line("> pull the relay before the trace completes", "warn")
				];
	}
	if (stage === "escalate") {
		return success
			? [
					line("$ whoami && sudo -l"),
					line("svc_account · (ALL : ALL) NOPASSWD: /usr/bin/systemctl", "ok"),
					line("> dumping credential store: 412 hashes, 3 reused", "info"),
					line("[+] token impersonation · privileges SYSTEM", "ok"),
					line("[+] root key fingerprint 9f:2c:...:a1 cached", "ok")
				]
			: [
					line("$ whoami && sudo -l"),
					line("svc_account · not in sudoers", "warn"),
					line("[-] privilege escalation blocked; auditd forwarded the event", "bad")
				];
	}
	return success
		? [
				line("$ ip route && arp -a"),
				line(`[+] camera VLAN 10.${(report.ip.charCodeAt(report.ip.length - 1) % 40) + 20}.7.0/24`, "ok"),
				line("[+] file server FS-02 visible · SMB signing disabled", "ok"),
				line("[+] control network reachable through jump host", "ok"),
				line("> pivot established · ready to run the payload", "ok")
			]
		: [
				line("$ ip route && arp -a"),
				line("[-] segmentation blocked the hop; firewall logged our MAC", "bad"),
				line("> try a different vector or cover tracks", "warn")
			];
}

const mac = (ip: string) =>
	Array.from({ length: 6 }, (_, i) =>
		((ip.charCodeAt(i % ip.length) + i * 37) % 256).toString(16).padStart(2, "0")
	).join(":");

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
