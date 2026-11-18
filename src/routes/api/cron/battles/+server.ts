// src/routes/api/cron/battles/+server.ts
// Hourly: move battles out of preparation, then fight one round of every
// active battle (rules in services/military/battle-engine.ts). Finished recon
// passes are filed first, so the round fights with the latest intel.

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { PREPARATION_HOURS, processCombatRound } from "#lib/server/services/military/battle-engine.js";
import { resolveReconMissions } from "#lib/server/services/military/recon.js";
import { db } from "#lib/server/db.js";
import { battles, regions, states, residences } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let phasesTransitioned = 0;
		let roundsProcessed = 0;
		let battlesEnded = 0;
		let failed = 0;
		let reconReportsFiled = 0;

		// 0. File intel reports for recon passes that are done (pages also do
		// this lazily on read; this keeps battles current without visitors).
		try {
			reconReportsFiled = (await resolveReconMissions(db)).length;
		} catch (error) {
			failed++;
			console.error("❌ Failed to resolve recon missions:", error);
		}

		// 1. Find preparation phase battles that should transition to active
		const preparationBattles = await db.query.battles.findMany({
			where: eq(battles.phase, "preparation")
		});

		for (const battle of preparationBattles) {
			try {
				const preparationEndsAt = new Date(battle.startedAt);
				preparationEndsAt.setHours(preparationEndsAt.getHours() + PREPARATION_HOURS);

				if (now >= preparationEndsAt) {
					await db.update(battles).set({ phase: "active" }).where(eq(battles.id, battle.id));
					phasesTransitioned++;
					console.log(`✅ Transitioned battle ${battle.id} to active phase`);
				}
			} catch (error) {
				failed++;
				console.error(`❌ Failed to transition battle ${battle.id}:`, error);
			}
		}

		// 2. Process active battles - execute combat rounds
		const activeBattles = await db.query.battles.findMany({
			where: eq(battles.phase, "active")
		});

		for (const battle of activeBattles) {
			try {
				const result = await processCombatRound(db, battle.id);
				if (!result) continue; // ended or moved on since we listed it
				if (result.battleEnded) {
					battlesEnded++;
					console.log(`🏁 Battle ${battle.id} ended - Winner: ${result.winner}`);

					notifyBattleResult({ ...battle, buildingsDestroyed: result.buildingsDestroyed }, result.winner!).catch(
						(err) => console.error("Battle notification error:", err)
					);
				} else {
					roundsProcessed++;
					console.log(`⚔️ Processed combat round ${result.roundNumber} for battle ${battle.id}`);
				}
			} catch (error) {
				failed++;
				console.error(`❌ Failed to process combat round for battle ${battle.id}:`, error);
			}
		}

		return cronResponse(
			"battles",
			{
				phasesTransitioned,
				roundsProcessed,
				battlesEnded,
				reconReportsFiled,
				totalProcessed: phasesTransitioned + roundsProcessed
			},
			failed
		);
	} catch (error) {
		return cronCrash("battles", error);
	}
};

async function notifyBattleResult(battle: any, winner: "attacker" | "defender") {
	const attackerStateName = await db
		.select({ name: states.name })
		.from(states)
		.where(eq(states.id, battle.attackerStateId))
		.then((r) => r[0]?.name ?? "Unknown");

	const defenderStateName = await db
		.select({ name: states.name })
		.from(states)
		.where(eq(states.id, battle.defenderStateId))
		.then((r) => r[0]?.name ?? "Unknown");

	const winnerName = winner === "attacker" ? attackerStateName : defenderStateName;
	const loserName = winner === "attacker" ? defenderStateName : attackerStateName;

	const payload = {
		title: "🏁 Battle Ended",
		body:
			`${winnerName} defeated ${loserName} in battle!` +
			(battle.buildingsDestroyed ? " The fighting destroyed buildings in the region." : ""),
		icon: "/favicon.png",
		badge: "/badge.png",
		data: { url: `/battle/${battle.id}`, tag: `battle-${battle.id}` }
	};

	for (const stateId of [battle.attackerStateId, battle.defenderStateId]) {
		const citizens = await db
			.select({ userId: residences.userId })
			.from(residences)
			.innerJoin(regions, eq(residences.homeRegionId, regions.id))
			.where(eq(regions.stateId, stateId));

		await Promise.allSettled(citizens.map((c) => sendNotificationIfEnabled(c.userId, "notifyBattleResults", payload)));
	}
}
