// Who runs a state, and who speaks for a bloc.
//
// A state has a president and four ministers. Each minister owns a portfolio
// that pairs two related ministries, so a small state can be run by a handful
// of people without leaving a portfolio unmanned:
//   - Science & Health: science, health
//   - Economy & Energy: economy, energy
//   - Foreign & Trade: foreign_affairs, trade
//   - Defence & Interior: defense, interior
//
// A bloc mirrors those portfolios with High Representatives, on top of its
// leader. Offices are not exclusive: one person may hold several ministries,
// several high-representative portfolios, or both state and bloc offices.
//
// Pure data and pure functions only: the client renders role badges from this,
// the server derives authority from the same table.

export const PRESIDENT_ROLE = "president" as const;
export const BLOC_LEADER_ROLE = "bloc_leader" as const;

export const MINISTER_ROLES = ["science_health", "economy_energy", "foreign_trade", "defence_interior"] as const;
export type MinisterRole = (typeof MINISTER_ROLES)[number];

export const HIGH_REPRESENTATIVE_ROLES = [
	"high_rep_science_health",
	"high_rep_economy_energy",
	"high_rep_foreign_trade",
	"high_rep_defence_interior"
] as const;
export type HighRepresentativeRole = (typeof HIGH_REPRESENTATIVE_ROLES)[number];

export type StateRole = typeof PRESIDENT_ROLE | MinisterRole;
export type BlocRole = typeof BLOC_LEADER_ROLE | HighRepresentativeRole;
export type GovernmentRole = StateRole | BlocRole;

/** The eight ministries stored in the `ministers` table. */
export type Ministry =
	"science" | "health" | "economy" | "energy" | "foreign_affairs" | "trade" | "defense" | "interior";

export const MINISTRIES: readonly Ministry[] = [
	"science",
	"health",
	"economy",
	"energy",
	"foreign_affairs",
	"trade",
	"defense",
	"interior"
];

export interface PortfolioSpec {
	label: string;
	blurb: string;
	/** Ministries this portfolio covers. */
	ministries: readonly Ministry[];
	/** Title of the state minister. */
	minister: string;
	/** Title of the bloc's High Representative. */
	highRepresentative: string;
}

export const PORTFOLIOS: Record<MinisterRole, PortfolioSpec> = {
	science_health: {
		label: "Science & Health",
		blurb: "Research, hospitals, epidemics and bio-defence.",
		ministries: ["science", "health"],
		minister: "Minister of Science & Health",
		highRepresentative: "High Representative for Science & Health"
	},
	economy_energy: {
		label: "Economy & Energy",
		blurb: "Industry, trade finance, power and efficiency.",
		ministries: ["economy", "energy"],
		minister: "Minister of Economy & Energy",
		highRepresentative: "High Representative for Economy & Energy"
	},
	foreign_trade: {
		label: "Foreign & Trade",
		blurb: "Diplomacy, lanes, closures and customs.",
		ministries: ["foreign_affairs", "trade"],
		minister: "Minister of Foreign Affairs & Trade",
		highRepresentative: "High Representative for Foreign Affairs & Trade"
	},
	defence_interior: {
		label: "Defence & Interior",
		blurb: "Armed forces, space, cyber and domestic security.",
		ministries: ["defense", "interior"],
		minister: "Minister of Defence & Interior",
		highRepresentative: "High Representative for Defence & Interior"
	}
};

/** Map every ministry to the cabinet portfolio that owns it. */
export const MINISTRY_PORTFOLIO: Record<Ministry, MinisterRole> = {
	science: "science_health",
	health: "science_health",
	economy: "economy_energy",
	energy: "economy_energy",
	foreign_affairs: "foreign_trade",
	trade: "foreign_trade",
	defense: "defence_interior",
	interior: "defence_interior"
};

export const ROLE_LABELS: Record<GovernmentRole, string> = {
	president: "President",
	bloc_leader: "Bloc Leader",
	science_health: PORTFOLIOS.science_health.minister,
	economy_energy: PORTFOLIOS.economy_energy.minister,
	foreign_trade: PORTFOLIOS.foreign_trade.minister,
	defence_interior: PORTFOLIOS.defence_interior.minister,
	high_rep_science_health: PORTFOLIOS.science_health.highRepresentative,
	high_rep_economy_energy: PORTFOLIOS.economy_energy.highRepresentative,
	high_rep_foreign_trade: PORTFOLIOS.foreign_trade.highRepresentative,
	high_rep_defence_interior: PORTFOLIOS.defence_interior.highRepresentative
};

export const ALL_GOVERNMENT_ROLES: readonly GovernmentRole[] = [
	PRESIDENT_ROLE,
	BLOC_LEADER_ROLE,
	...MINISTER_ROLES,
	...HIGH_REPRESENTATIVE_ROLES
];

/** Portfolio a ministry belongs to. */
export function portfolioOfMinistry(ministry: Ministry): MinisterRole {
	return MINISTRY_PORTFOLIO[ministry];
}

/** Ministries covered by a cabinet portfolio. */
export function ministriesOfPortfolio(portfolio: MinisterRole): readonly Ministry[] {
	return PORTFOLIOS[portfolio].ministries;
}

/** Human-readable title of any state or bloc office. */
export function roleLabel(role: GovernmentRole): string {
	return ROLE_LABELS[role];
}

export function isMinisterRole(role: string): role is MinisterRole {
	return (MINISTER_ROLES as readonly string[]).includes(role);
}

export function isHighRepresentativeRole(role: string): role is HighRepresentativeRole {
	return (HIGH_REPRESENTATIVE_ROLES as readonly string[]).includes(role);
}

export function isStateRole(role: string): role is StateRole {
	return role === PRESIDENT_ROLE || isMinisterRole(role);
}

export function isBlocRole(role: string): role is BlocRole {
	return role === BLOC_LEADER_ROLE || isHighRepresentativeRole(role);
}

/** The bloc office that mirrors a state portfolio. */
export function highRepresentativeRole(portfolio: MinisterRole): HighRepresentativeRole {
	return `high_rep_${portfolio}`;
}

/** Portfolio a high-representative office speaks for. */
export function portfolioOfHighRepresentative(role: HighRepresentativeRole): MinisterRole {
	return role.slice("high_rep_".length) as MinisterRole;
}

/** Offices are not exclusive: a person may hold more than one at a time. */
export const MULTIPLE_ROLES_ALLOWED = true;

/** Deduplicate a list of offices, preserving the order in which they were held. */
export function uniqueRoles(roles: readonly GovernmentRole[]): GovernmentRole[] {
	return [...new Set(roles)];
}
