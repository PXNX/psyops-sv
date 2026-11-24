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
import { intelDepth } from "#lib/server/services/military/infiltration.js";
import { redactFindings, redactPicture } from "#lib/server/services/military/intel.js";
import { visibleFields, type IntelVisibleField } from "#lib/config/index.js";
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
	// A deeper spy network reveals more of what reconnaissance actually saw.
	const targetIds = [
		...new Set([
			...reports.map((r) => r.targetStateId).filter((id): id is number => id != null),
			...regionRows.map((r) => r.stateId).filter((id): id is number => id != null)
		])
	];
	const depths = new Map<number, number>();
	await Promise.all(targetIds.map(async (id) => depths.set(id, await intelDepth(db, account.id, id))));
	const depthFor = (regionId: number) => {
		const r = regionById.get(regionId);
		return r?.stateId ? (depths.get(r.stateId) ?? 0) : 0;
	};
	// What the viewer may read of a pass over a region. The sensor's own unit
	// counts are always shown (that is what the pass was flown for); a spy
	// network inside the owner adds installations, exact types and battle
	// detail on top. Passes over the viewer's own side are never redacted.
	const fieldsFor = (regionId: number): ReadonlySet<IntelVisibleField> => {
		const owner = regionById.get(regionId)?.stateId;
		if (owner != null && side.stateIds.includes(owner)) return visibleFields(Number.MAX_SAFE_INTEGER);
		return new Set<IntelVisibleField>(["unitCounts", ...visibleFields(depthFor(regionId))]);
	};

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
			findings: redactFindings(r.findings, fieldsFor(r.regionId)),
			imagery: imagery.get(r.id)!,
			observedAt: r.observedAt.toISOString(),
			expiresAt: r.expiresAt.toISOString(),
			fresh: isFresh(r, now)
		})),
		pictures: [...pictures].map(([regionId, p]) => {
			const depth = depthFor(regionId);
			const owner = regionById.get(regionId)?.stateId;
			const own = owner != null && side.stateIds.includes(owner);
			return { region: where(regionId), depth, own, picture: redactPicture(p, fieldsFor(regionId)) };
		}),
		inFlight: inFlight.map((m) => ({
			id: m.id,
			sensor: m.sensor,
			region: where(m.targetRegionId),
			launchedBy: { id: m.launchedBy, ...(people.get(m.launchedBy) ?? { name: null, avatar: null }) },
			completesAt: m.completesAt.toISOString()
		}))
	};
};
