// One place to answer "what offices does this person hold?".
//
// Older services each query presidents and one or two ministries on their own.
// This module derives every office at once — president, any of the four
// minister portfolios, bloc leader, any of the four high-representative
// portfolios — so nothing has to assume a person holds only one role. A state
// minister holding both ministries of a portfolio still counts once, and a
// person may hold state and bloc offices simultaneously.

import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { blocHighRepresentatives, blocLeaders, ministers, presidents } from "../../schema";
import {
	BLOC_LEADER_ROLE,
	PRESIDENT_ROLE,
	highRepresentativeRole,
	isMinisterRole,
	portfolioOfMinistry,
	type BlocRole,
	type GovernmentRole,
	type MinisterRole,
	type StateRole
} from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export interface StateAuthority {
	stateId: number;
	role: StateRole;
}

export interface BlocAuthority {
	blocId: number;
	role: BlocRole;
}

/** Every state office held by `userId`, with the state it belongs to. */
export async function stateRoles(db: Db, userId: string): Promise<StateAuthority[]> {
	const roles: StateAuthority[] = [];
	const presidencies = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId));
	for (const presidency of presidencies) roles.push({ stateId: presidency.stateId, role: PRESIDENT_ROLE });

	const ministryRows = await db
		.select({ stateId: ministers.stateId, ministry: ministers.ministry })
		.from(ministers)
		.where(eq(ministers.userId, userId));
	const seen = new Set(roles.map((r) => `${r.stateId}:${r.role}`));
	for (const row of ministryRows) {
		const portfolio = portfolioOfMinistry(row.ministry as Parameters<typeof portfolioOfMinistry>[0]);
		if (!portfolio) continue;
		const key = `${row.stateId}:${portfolio}`;
		if (seen.has(key)) continue;
		seen.add(key);
		roles.push({ stateId: row.stateId, role: portfolio });
	}
	return roles;
}

/** Every bloc office held by `userId`. */
export async function blocRoles(db: Db, userId: string): Promise<BlocAuthority[]> {
	const roles: BlocAuthority[] = [];
	const leaderships = await db
		.select({ blocId: blocLeaders.blocId })
		.from(blocLeaders)
		.where(eq(blocLeaders.userId, userId));
	for (const leadership of leaderships) roles.push({ blocId: leadership.blocId, role: BLOC_LEADER_ROLE });

	const representativeRows = await db
		.select({ blocId: blocHighRepresentatives.blocId, portfolio: blocHighRepresentatives.portfolio })
		.from(blocHighRepresentatives)
		.where(eq(blocHighRepresentatives.userId, userId));
	const seen = new Set(roles.map((r) => `${r.blocId}:${r.role}`));
	for (const row of representativeRows) {
		if (!isMinisterRole(row.portfolio)) continue;
		const role = highRepresentativeRole(row.portfolio as MinisterRole);
		const key = `${row.blocId}:${role}`;
		if (seen.has(key)) continue;
		seen.add(key);
		roles.push({ blocId: row.blocId, role });
	}
	return roles;
}

export interface AnyAuthority {
	role: GovernmentRole;
	stateId?: number;
	blocId?: number;
}

/** State and bloc offices together, tagged with the entity they govern. */
export async function governmentRoles(db: Db, userId: string): Promise<AnyAuthority[]> {
	const [states, blocs] = await Promise.all([stateRoles(db, userId), blocRoles(db, userId)]);
	return [
		...states.map((a) => ({ stateId: a.stateId, role: a.role as GovernmentRole })),
		...blocs.map((a) => ({ blocId: a.blocId, role: a.role as GovernmentRole }))
	];
}

export function holdsStateRole(roles: readonly StateAuthority[], stateId: number, role: StateRole): boolean {
	return roles.some((r) => r.stateId === stateId && r.role === role);
}

export function holdsBlocRole(roles: readonly BlocAuthority[], blocId: number, role: BlocRole): boolean {
	return roles.some((r) => r.blocId === blocId && r.role === role);
}

/** President or the minister whose portfolio owns `portfolio` may act. */
export function canManagePortfolio(
	roles: readonly StateAuthority[],
	stateId: number,
	portfolio: MinisterRole
): boolean {
	return holdsStateRole(roles, stateId, PRESIDENT_ROLE) || holdsStateRole(roles, stateId, portfolio);
}

/** Bloc leader or the matching High Representative may speak for a bloc. */
export function canSpeakForPortfolio(
	roles: readonly BlocAuthority[],
	blocId: number,
	portfolio: MinisterRole
): boolean {
	return (
		holdsBlocRole(roles, blocId, BLOC_LEADER_ROLE) || holdsBlocRole(roles, blocId, highRepresentativeRole(portfolio))
	);
}
