// src/routes/(authenticated)/(dock)/intel/+page.server.ts
// The intelligence archive: every report the viewer's side (state + bloc) has
// filed, newest first, the current fused picture per region, and the recon
// passes still in flight.
import { and, eq, inArray } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { reconMissions, regions, states, userProfiles } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	isFresh,
	picturesByRegion,
	resolveReconMissions,
	sideReports,
	viewerSide
} from "#lib/server/services/military/recon.js";
import { imageryContexts } from "#lib/server/services/military/imagery.js";
import { getRegionName } from "#lib/utils/formatting.js";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	// File any passes that have landed since the last visit.
	await resolveReconMissions(db).catch((err) => console.error("Recon resolve failed:", err));

	const side = await viewerSide(db, account.id);
	if (!side) return { side: null, reports: [], pictures: [], inFlight: [] };

	const now = new Date();
	const [reports, pictures, inFlight] = await Promise.all([
		sideReports(db, side.stateIds, { limit: 100 }),
		picturesByRegion(db, side.stateIds, { now }),
		db
			.select()
			.from(reconMissions)
			.where(and(inArray(reconMissions.stateId, side.stateIds), eq(reconMissions.status, "in_progress")))
			.orderBy(reconMissions.completesAt)
	]);

	const regionIds = [
		...new Set([...reports.map((r) => r.regionId), ...pictures.keys(), ...inFlight.map((m) => m.targetRegionId)])
	];
	const userIds = [
		...new Set([...reports.map((r) => r.filedBy), ...inFlight.map((m) => m.launchedBy)].filter(Boolean))
	] as string[];
	const [regionRows, stateRows, profiles, imagery] = await Promise.all([
		regionIds.length
			? db
					.select({ id: regions.id, lat: regions.latitude, lon: regions.longitude, stateId: regions.stateId })
					.from(regions)
					.where(inArray(regions.id, regionIds))
			: [],
		db.select({ id: states.id, name: states.name }).from(states),
		userIds.length
			? db
					.select({ id: userProfiles.accountId, name: userProfiles.name, logo: userProfiles.logo })
					.from(userProfiles)
					.where(inArray(userProfiles.accountId, userIds))
			: [],
		imageryContexts(db, reports)
	]);
	const regionById = new Map(regionRows.map((r) => [r.id, r]));
	const stateName = new Map(stateRows.map((s) => [s.id, s.name]));
	const people = new Map(
		await Promise.all(profiles.map(async (p) => [p.id, { name: p.name, avatar: await getLogoUrl(p.logo) }] as const))
	);
	const where = (regionId: number) => {
		const r = regionById.get(regionId);
		return {
			id: regionId,
			name: getRegionName(regionId),
			lat: r ? Number(r.lat) : null,
			lon: r ? Number(r.lon) : null,
			ownerName: r?.stateId ? (stateName.get(r.stateId) ?? null) : null
		};
	};

	return {
		side: { stateId: side.stateId, stateName: stateName.get(side.stateId) ?? null, partners: side.stateIds.length - 1 },
		reports: reports.map((r) => ({
			id: r.id,
			sensor: r.sensor,
			region: where(r.regionId),
			ownState: stateName.get(r.stateId) ?? null,
			filedBy: r.filedBy ? { id: r.filedBy, ...(people.get(r.filedBy) ?? { name: null, avatar: null }) } : null,
			findings: r.findings,
			imagery: imagery.get(r.id)!,
			observedAt: r.observedAt.toISOString(),
			expiresAt: r.expiresAt.toISOString(),
			fresh: isFresh(r, now)
		})),
		pictures: [...pictures].map(([regionId, p]) => ({ region: where(regionId), picture: p })),
		inFlight: inFlight.map((m) => ({
			id: m.id,
			sensor: m.sensor,
			region: where(m.targetRegionId),
			launchedBy: { id: m.launchedBy, ...(people.get(m.launchedBy) ?? { name: null, avatar: null }) },
			completesAt: m.completesAt.toISOString()
		}))
	};
};
