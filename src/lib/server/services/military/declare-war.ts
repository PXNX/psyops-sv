// Declaring war: shared by the president's button on a state page and by a
// passed parliament proposal. Throws WarDeclarationError with a reason the
// player should see.
import { and, eq, or } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { regions, residences, states, wars } from "#lib/server/schema.js";

export class WarDeclarationError extends Error {}

/** Why `attackerStateId` can't declare war on `targetStateId` right now, or null. */
export async function warBlockedReason(db: Database, attackerStateId: number, targetStateId: number) {
	if (attackerStateId === targetStateId) return "A state can't declare war on itself.";
	const [[attacker], [target]] = await Promise.all([
		db.select({ blocId: states.blocId }).from(states).where(eq(states.id, attackerStateId)),
		db.select({ blocId: states.blocId }).from(states).where(eq(states.id, targetStateId))
	]);
	if (!attacker || !target) return "That state doesn't exist.";
	if (attacker.blocId && attacker.blocId === target.blocId) return "You can't declare war on a state in your own bloc.";
	const [existing] = await db
		.select({ id: wars.id })
		.from(wars)
		.where(
			and(
				eq(wars.status, "active"),
				or(
					and(eq(wars.attackerId, attackerStateId), eq(wars.defenderId, targetStateId)),
					and(eq(wars.attackerId, targetStateId), eq(wars.defenderId, attackerStateId))
				)
			)
		)
		.limit(1);
	if (existing) return "These states are already at war.";
	return null;
}

export async function declareWar(
	db: Database,
	input: { attackerStateId: number; targetStateId: number; declaredBy: string; notify?: boolean }
): Promise<{ warId: number }> {
	const blocked = await warBlockedReason(db, input.attackerStateId, input.targetStateId);
	if (blocked) throw new WarDeclarationError(blocked);

	const [[attacker], [defender]] = await Promise.all([
		db.select({ name: states.name, blocId: states.blocId }).from(states).where(eq(states.id, input.attackerStateId)),
		db.select({ name: states.name, blocId: states.blocId }).from(states).where(eq(states.id, input.targetStateId))
	]);

	const [war] = await db
		.insert(wars)
		.values({
			attackerId: input.attackerStateId,
			defenderId: input.targetStateId,
			attackerBlocId: attacker!.blocId,
			defenderBlocId: defender!.blocId,
			declaredBy: input.declaredBy,
			status: "active"
		})
		.returning({ id: wars.id });

	// Tell everyone living in either state, without holding up the request.
	if (input.notify === false) return { warId: war.id };
	void (async () => {
		const { sendNotificationIfEnabled } = await import("#lib/server/services/push-notification.service.js");
		for (const stateId of [input.attackerStateId, input.targetStateId]) {
			const people = await db
				.select({ userId: residences.userId })
				.from(residences)
				.innerJoin(regions, eq(residences.regionId, regions.id))
				.where(eq(regions.stateId, stateId));
			const ours = stateId === input.attackerStateId;
			const payload = {
				title: "⚔️ War Declared!",
				body: ours
					? `Your state declared war on ${defender!.name}!`
					: `${attacker!.name} has declared war on your state!`,
				icon: "/favicon.png",
				badge: "/badge.png",
				data: { url: `/war/${war.id}`, tag: `war-${war.id}` }
			};
			await Promise.allSettled(
				people.map((p) => sendNotificationIfEnabled(p.userId, "notifyWarDeclarations", payload))
			);
		}
	})().catch((err) => console.error("War declaration notification error:", err));

	return { warId: war.id };
}
