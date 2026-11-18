// src/routes/(authenticated)/(dock)/war/[id]/+page.server.ts
// A war at a glance: both coalitions, the front line, every battle, and for
// the presidents of the warring states, surrendering.
import { error, fail } from "@sveltejs/kit";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import {
	battles,
	blocs,
	presidents,
	regionBorders,
	regions,
	states,
	userProfiles,
	warSurrenders,
	wars
} from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	surrenderWar,
	WAR_END_REASON_LABELS,
	type WarEndReason
} from "#lib/server/services/military/war-resolution.service.js";
import { WAR_CONFIG, exhaustionAt } from "#lib/config/index.js";

type Side = "attacker" | "defender";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const warId = Number(params.id);
	if (!Number.isInteger(warId)) error(400, "Invalid war ID");

	const war = await db.query.wars.findFirst({ where: eq(wars.id, warId) });
	if (!war) error(404, "War not found");

	// Each side is a single state, or every member state of its bloc.
	const sideStates = async (stateId: number, blocId: number | null) =>
		db
			.select()
			.from(states)
			.where(blocId ? eq(states.blocId, blocId) : eq(states.id, stateId));

	const [attackerStates, defenderStates, attackerBloc, defenderBloc, warBattles, surrenders, declarer, myPresidency] =
		await Promise.all([
			sideStates(war.attackerId, war.attackerBlocId),
			sideStates(war.defenderId, war.defenderBlocId),
			war.attackerBlocId ? db.query.blocs.findFirst({ where: eq(blocs.id, war.attackerBlocId) }) : null,
			war.defenderBlocId ? db.query.blocs.findFirst({ where: eq(blocs.id, war.defenderBlocId) }) : null,
			db.select().from(battles).where(eq(battles.warId, warId)).orderBy(desc(battles.startedAt)),
			db
				.select({
					stateId: warSurrenders.stateId,
					stateName: states.name,
					at: warSurrenders.surrenderedAt,
					reason: warSurrenders.reason
				})
				.from(warSurrenders)
				.innerJoin(states, eq(warSurrenders.stateId, states.id))
				.where(eq(warSurrenders.warId, warId))
				.orderBy(desc(warSurrenders.surrenderedAt)),
			war.declaredBy ? db.query.userProfiles.findFirst({ where: eq(userProfiles.accountId, war.declaredBy) }) : null,
			db.query.presidents.findFirst({ where: eq(presidents.userId, account.id) })
		]);

	// Main belligerents first, then other coalition members.
	const order = (list: typeof attackerStates, mainId: number) =>
		[...list].sort((a, b) => (a.id === mainId ? -1 : b.id === mainId ? 1 : a.name.localeCompare(b.name)));
	const attackerIds = attackerStates.map((s) => s.id);
	const defenderIds = defenderStates.map((s) => s.id);
	const allIds = [...attackerIds, ...defenderIds];

	const regionCounts = allIds.length
		? await db
				.select({ stateId: regions.stateId, n: sql<number>`count(*)::int` })
				.from(regions)
				.where(inArray(regions.stateId, allIds))
				.groupBy(regions.stateId)
		: [];
	const regionsOf = (ids: number[]) =>
		regionCounts.filter((r) => ids.includes(r.stateId!)).reduce((s, r) => s + r.n, 0);

	// Front line: defender regions that border an attacker region. That's
	// where battles can be started (from the attacker's side of the border).
	const target = alias(regions, "target");
	const origin = alias(regions, "origin");
	const frontLine =
		war.status === "active" && attackerIds.length && defenderIds.length
			? await db
					.selectDistinct({ regionId: target.id, stateId: target.stateId })
					.from(target)
					.innerJoin(regionBorders, or(eq(regionBorders.regionId, target.id), eq(regionBorders.neighborId, target.id)))
					.innerJoin(
						origin,
						sql`${origin.id} = CASE WHEN ${regionBorders.regionId} = ${target.id} THEN ${regionBorders.neighborId} ELSE ${regionBorders.regionId} END`
					)
					.where(and(inArray(target.stateId, defenderIds), inArray(origin.stateId, attackerIds)))
					.orderBy(target.id)
					.limit(40)
			: [];
	const ongoingByRegion = new Map(warBattles.filter((b) => b.status === "ongoing").map((b) => [b.regionId, b.id]));

	const describeSide = async (side: Side, list: typeof attackerStates, mainId: number, bloc: typeof attackerBloc) => {
		const ids = list.map((s) => s.id);
		return {
			bloc: bloc ? { id: bloc.id, name: bloc.name, color: bloc.color } : null,
			states: await Promise.all(
				order(list, mainId).map(async (s) => ({
					id: s.id,
					name: s.name,
					logo: await getLogoUrl(s.logo),
					capitulated: s.capitulated,
					isMain: s.id === mainId
				}))
			),
			regionsHeld: regionsOf(ids),
			battlesWon: warBattles.filter((b) => b.status === (side === "attacker" ? "attacker_won" : "defender_won")).length
		};
	};
	const [attacker, defender] = await Promise.all([
		describeSide("attacker", attackerStates, war.attackerId, attackerBloc ?? null),
		describeSide("defender", defenderStates, war.defenderId, defenderBloc ?? null)
	]);
	const nameOf = new Map([...attackerStates, ...defenderStates].map((s) => [s.id, s.name]));
	const declarerAvatar = declarer?.logo ? await getLogoUrl(declarer.logo) : null;

	// Which side the viewer's state is on, and whether they may surrender for it.
	const myStateId = myPresidency?.stateId ?? null;
	const mySide: Side | null =
		myStateId === war.attackerId ? "attacker" : myStateId === war.defenderId ? "defender" : null;

	return {
		war: {
			id: war.id,
			status: war.status,
			declaredAt: war.declaredAt,
			endedAt: war.endedAt,
			endedReason: war.endedReason ? WAR_END_REASON_LABELS[war.endedReason as WarEndReason] : null,
			surrenderedByName: war.surrenderedBy ? (nameOf.get(war.surrenderedBy) ?? null) : null,
			// Shown live from the declaration date, like the hourly job computes it.
			exhaustion: war.status === "active" ? exhaustionAt(war.declaredAt, new Date()) : war.exhaustion,
			exhaustionLimit: WAR_CONFIG.EXHAUSTION_LIMIT,
			stalemateDays: WAR_CONFIG.STALEMATE_DAYS,
			declaredBy: war.declaredBy
				? { id: war.declaredBy, name: declarer?.name ?? "Unknown", avatar: declarerAvatar }
				: null
		},
		attacker,
		defender,
		battles: warBattles.map((b) => ({
			id: b.id,
			regionId: b.regionId,
			status: b.status,
			phase: b.phase,
			startedAt: b.startedAt,
			endedAt: b.endedAt,
			attackerName: nameOf.get(b.attackerStateId) ?? "Unknown",
			defenderName: nameOf.get(b.defenderStateId) ?? "Unknown"
		})),
		frontLine: frontLine.map((r) => ({
			regionId: r.regionId,
			stateName: nameOf.get(r.stateId!) ?? "Unknown",
			battleId: ongoingByRegion.get(r.regionId) ?? null
		})),
		surrenders,
		me: {
			side: mySide,
			canSurrender: war.status === "active" && mySide !== null,
			canAttack: war.status === "active" && mySide === "attacker"
		}
	};
};

export const actions: Actions = {
	surrender: async ({ request, params, locals }) => {
		const account = locals.account!;
		const warId = Number(params.id);
		const reason =
			String((await request.formData()).get("reason") ?? "")
				.trim()
				.slice(0, 300) || null;

		const war = await db.query.wars.findFirst({ where: eq(wars.id, warId) });
		if (!war || war.status !== "active") return fail(400, { error: "This war is already over." });

		const presidency = await db.query.presidents.findFirst({ where: eq(presidents.userId, account.id) });
		const stateId = presidency?.stateId;
		if (!stateId || (stateId !== war.attackerId && stateId !== war.defenderId)) {
			return fail(403, { error: "Only the president of a warring state can surrender." });
		}

		const ended = await surrenderWar(warId, stateId, account.id, reason);
		if (!ended) return fail(400, { error: "This war is already over." });
		return { success: true, message: "Your state has surrendered. The war is over." };
	}
};
