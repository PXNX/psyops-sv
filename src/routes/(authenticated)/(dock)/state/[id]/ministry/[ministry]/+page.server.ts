// A single ministry's desk: who holds the office and the live figures it owns.
// Reading is limited to the president and the minister of the covering
// portfolio — the same authority the game uses for state decisions.
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import {
	civilianStances,
	closedZones,
	fleetShips,
	fleets,
	militaryUnits,
	ministers,
	regions,
	residences,
	stateEnergy,
	stateResearch,
	stateTreasury,
	states,
	tradeLanes,
	userProfiles
} from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { MINISTRIES, MINISTRY_META, roleLabel, type Ministry } from "#lib/config/index.js";
import { canManagePortfolio, stateRoles } from "#lib/server/services/government/authority.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = Number(params.id);
	const ministry = params.ministry as Ministry;
	if (!Number.isInteger(stateId) || !MINISTRIES.includes(ministry)) error(404, "Ministry not found");

	const [state] = await db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, stateId)).limit(1);
	if (!state) error(404, "State not found");

	const roles = await stateRoles(db, locals.account!.id);
	if (!canManagePortfolio(roles, stateId, MINISTRY_META[ministry].portfolio)) {
		error(403, "Only this state's president or portfolio minister can open the ministry desk.");
	}

	const [holderRow] = await db
		.select({
			userId: ministers.userId,
			name: userProfiles.name,
			logo: userProfiles.logo,
			appointedAt: ministers.appointedAt
		})
		.from(ministers)
		.innerJoin(userProfiles, eq(userProfiles.accountId, ministers.userId))
		.where(and(eq(ministers.stateId, stateId), eq(ministers.ministry, ministry)))
		.limit(1);

	// Figures are deliberately small and cheap: each ministry shows the
	// handful of numbers its holder actually acts on.
	let metrics: { label: string; value: string }[] = [];
	if (ministry === "economy") {
		const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);
		metrics = [
			{ label: "Treasury balance", value: Number(treasury?.balance ?? 0).toLocaleString() },
			{ label: "Outstanding debt", value: Number(treasury?.debt ?? 0).toLocaleString() },
			{ label: "Total collected", value: Number(treasury?.totalCollected ?? 0).toLocaleString() }
		];
	} else if (ministry === "energy") {
		const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)).limit(1);
		const produced = Number(energy?.totalProduction ?? 0);
		const used = Number(energy?.usedProduction ?? 0);
		metrics = [
			{ label: "Grid output", value: produced.toLocaleString() },
			{ label: "Power used", value: used.toLocaleString() },
			{ label: "Utilisation", value: produced > 0 ? `${Math.round((used / produced) * 100)}%` : "—" },
			{ label: "Fuel factor", value: `${energy?.fuelFactor ?? 100}%` }
		];
	} else if (ministry === "trade") {
		const lanes = await db.select({ id: tradeLanes.id }).from(tradeLanes).where(eq(tradeLanes.stateId, stateId));
		const zones = await db.select({ id: closedZones.id }).from(closedZones).where(eq(closedZones.stateId, stateId));
		metrics = [
			{ label: "Open lanes", value: String(lanes.length) },
			{ label: "Declared closures", value: String(zones.length) }
		];
	} else if (ministry === "foreign_affairs") {
		const stances = await db
			.select({ id: civilianStances.id })
			.from(civilianStances)
			.where(eq(civilianStances.observerStateId, stateId));
		metrics = [{ label: "Bilateral stances tracked", value: String(stances.length) }];
	} else if (ministry === "defense") {
		const [units, ships, nationalFleets] = await Promise.all([
			db.select({ id: militaryUnits.id }).from(militaryUnits).where(eq(militaryUnits.stateId, stateId)),
			db.select({ id: fleetShips.id }).from(fleetShips).where(eq(fleetShips.stateId, stateId)),
			db.select({ id: fleets.id }).from(fleets).where(eq(fleets.stateId, stateId))
		]);
		metrics = [
			{ label: "Units", value: String(units.length) },
			{ label: "Ships", value: String(ships.length) },
			{ label: "Fleets", value: String(nationalFleets.length) }
		];
	} else if (ministry === "interior") {
		const [regionRows, residentRows] = await Promise.all([
			db.select({ hospitals: regions.hospitals, infrastructure: regions.infrastructure }).from(regions).where(eq(regions.stateId, stateId)),
			db
				.select({ regionId: residences.regionId })
				.from(residences)
				.innerJoin(regions, eq(residences.regionId, regions.id))
				.where(eq(regions.stateId, stateId))
		]);
		metrics = [
			{ label: "Regions", value: String(regionRows.length) },
			{ label: "Residents", value: String(residentRows.length) },
			{ label: "Hospital levels", value: String(regionRows.reduce((n, r) => n + (r.hospitals ?? 0), 0)) },
			{ label: "Infrastructure levels", value: String(regionRows.reduce((n, r) => n + (r.infrastructure ?? 0), 0)) }
		];
	} else if (ministry === "science") {
		const research = await db.select({ level: stateResearch.level }).from(stateResearch).where(eq(stateResearch.stateId, stateId));
		metrics = [
			{ label: "Research areas", value: String(research.length) },
			{ label: "Total levels", value: String(research.reduce((n, r) => n + r.level, 0)) }
		];
	} else {
		const regionRows = await db
			.select({ hospitals: regions.hospitals })
			.from(regions)
			.where(eq(regions.stateId, stateId));
		metrics = [{ label: "Hospital levels", value: String(regionRows.reduce((n, r) => n + (r.hospitals ?? 0), 0)) }];
	}

	return {
		state,
		ministry,
		spec: MINISTRY_META[ministry],
		portfolioLabel: roleLabel(MINISTRY_META[ministry].portfolio),
		holder: holderRow?.userId
			? {
					id: holderRow.userId,
					name: holderRow.name,
					avatar: await getLogoUrl(holderRow.logo),
					appointedAt: holderRow.appointedAt.toISOString()
				}
			: null,
		metrics,
		tools: MINISTRY_META[ministry].tools.map((t) => ({ ...t, href: t.href.replace("{id}", String(stateId)) }))
	};
};
