// src/lib/server/services/military/war-resolution.service.ts
//
// Finds ways to end active wars. Called by the war-resolution cron
// (/api/cron/wars) so no war drags on forever:
//
// 1. Surrender — a recorded war_surrenders row ends the war.
// 2. Capitulation — a side (or, in a bloc war, every state of its bloc) has
//    lost every region and can no longer fight.
// 3. Stalemate — no battle activity for WAR_CONFIG.STALEMATE_DAYS days.
// 4. Exhaustion — war weariness reached WAR_CONFIG.EXHAUSTION_LIMIT; the war
//    ends in a white peace with the borders unchanged.

import { db } from "#lib/server/db.js";
import { wars, battles, warSurrenders, states, regions, residences } from "#lib/server/schema.js";
import { and, count, desc, eq, max, sql } from "drizzle-orm";
import { accumulateExhaustion, hoursBetween, isWarExhausted, isWarStale } from "#lib/config/index.js";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";

export type WarEndReason = "exhaustion" | "stalemate" | "capitulation" | "surrender";

export const WAR_END_REASON_LABELS: Record<WarEndReason, string> = {
	exhaustion: "war exhaustion",
	stalemate: "stalemate",
	capitulation: "capitulation",
	surrender: "surrender"
};

export interface WarResolutionResult {
	processed: number;
	ended: number;
	byExhaustion: number;
	byStalemate: number;
	byCapitulation: number;
	bySurrender: number;
	failed: number;
}

export async function resolveWars(now: Date = new Date()): Promise<WarResolutionResult> {
	const result: WarResolutionResult = {
		processed: 0,
		ended: 0,
		byExhaustion: 0,
		byStalemate: 0,
		byCapitulation: 0,
		bySurrender: 0,
		failed: 0
	};

	const activeWars = await db.select().from(wars).where(eq(wars.status, "active"));

	for (const war of activeWars) {
		result.processed++;
		try {
			// Recompute from the declaration date every run, so the integer
			// column never loses (or overshoots) accrued weariness.
			const next = Math.floor(accumulateExhaustion(war.exhaustion, hoursBetween(war.declaredAt, now)));
			const outcome = await findWarEnd(war, now, next);

			if (outcome) {
				await endWar(war.id, outcome.reason, outcome.surrenderedBy, now);
				result.ended++;
				if (outcome.reason === "exhaustion") result.byExhaustion++;
				else if (outcome.reason === "stalemate") result.byStalemate++;
				else if (outcome.reason === "capitulation") result.byCapitulation++;
				else result.bySurrender++;
			} else if (next !== war.exhaustion) {
				// War goes on — bank the weariness accumulated since declaration.
				await db
					.update(wars)
					.set({ exhaustion: next })
					.where(and(eq(wars.id, war.id), eq(wars.status, "active")));
			}
		} catch (error) {
			result.failed++;
			console.error(`War resolution failed for war ${war.id}:`, error);
		}
	}

	return result;
}

/** Determines whether a war can be ended right now, and how. Null if it must go on. */
async function findWarEnd(
	war: typeof wars.$inferSelect,
	now: Date,
	nextExhaustion: number
): Promise<{ reason: WarEndReason; surrenderedBy: number | null } | null> {
	// 1. A recorded surrender ends the war.
	const [surrender] = await db
		.select()
		.from(warSurrenders)
		.where(eq(warSurrenders.warId, war.id))
		.orderBy(desc(warSurrenders.surrenderedAt))
		.limit(1);
	if (surrender) {
		return { reason: "surrender", surrenderedBy: surrender.stateId };
	}

	// 2. A side that has lost every region can no longer fight.
	if (await hasLostAllRegions(war.attackerId, war.attackerBlocId)) {
		return { reason: "capitulation", surrenderedBy: war.attackerId };
	}
	if (await hasLostAllRegions(war.defenderId, war.defenderBlocId)) {
		return { reason: "capitulation", surrenderedBy: war.defenderId };
	}

	// 3. No battle activity for STALEMATE_DAYS days — a frozen conflict.
	const lastActivity = await getLastBattleActivity(war.id);
	if (isWarStale(lastActivity ?? war.declaredAt, now)) {
		return { reason: "stalemate", surrenderedBy: null };
	}

	// 4. War weariness reached its limit — white peace, borders unchanged.
	if (isWarExhausted(nextExhaustion)) {
		return { reason: "exhaustion", surrenderedBy: null };
	}

	return null;
}

/** True when the state (or every state of its bloc) holds no regions. */
async function hasLostAllRegions(stateId: number, blocId: number | null): Promise<boolean> {
	if (blocId) {
		const blocStates = await db
			.select({
				stateId: states.id,
				regionCount: sql<number>`(SELECT COUNT(*) FROM ${regions} WHERE ${regions.stateId} = ${states.id})`
			})
			.from(states)
			.where(eq(states.blocId, blocId));
		return blocStates.length > 0 && blocStates.every((s) => Number(s.regionCount) === 0);
	}

	const [{ value }] = await db.select({ value: count() }).from(regions).where(eq(regions.stateId, stateId));
	return value === 0;
}

/** Most recent battle activity, or null when the war never saw a battle. */
async function getLastBattleActivity(warId: number): Promise<Date | null> {
	const [{ lastActivity }] = await db
		.select({
			lastActivity: max(sql<string>`coalesce(${battles.endedAt}, ${battles.startedAt})`)
		})
		.from(battles)
		.where(eq(battles.warId, warId));
	return lastActivity ? new Date(lastActivity) : null;
}

/** Marks the war ended, records why, and tells both sides' citizens. */
async function endWar(warId: number, reason: WarEndReason, surrenderedBy: number | null, now: Date): Promise<void> {
	await db
		.update(wars)
		.set({
			status: "ended",
			endedAt: now,
			endedReason: reason,
			...(surrenderedBy ? { surrenderedBy } : {})
		})
		.where(and(eq(wars.id, warId), eq(wars.status, "active")));

	console.log(`🏁 War ${warId} ended - ${WAR_END_REASON_LABELS[reason]}`);

	await notifyWarEnd(warId, reason, now);
}

async function notifyWarEnd(warId: number, reason: WarEndReason, now: Date): Promise<void> {
	const war = await db.query.wars.findFirst({
		where: eq(wars.id, warId),
		with: { attacker: true, defender: true }
	});
	if (!war) return;

	const payload = {
		title: "🕊️ War Ended",
		body: `${war.attacker.name} and ${war.defender.name} are no longer at war (${WAR_END_REASON_LABELS[reason]}).`,
		icon: "/favicon.png",
		badge: "/badge.png",
		data: { url: `/war/${warId}`, tag: `war-${warId}` }
	};

	for (const stateId of [war.attackerId, war.defenderId]) {
		const citizens = await db
			.select({ userId: residences.userId })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(regions.stateId, stateId));

		await Promise.allSettled(
			citizens.map((c) => sendNotificationIfEnabled(c.userId, "notifyWarDeclarations", payload))
		);
	}
}
