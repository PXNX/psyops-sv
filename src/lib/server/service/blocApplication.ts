// src/lib/server/service/blocApplication.ts
// Bloc membership applications: member-state presidents vote pro or contra on
// states that applied to join. An application passes as soon as more than half of
// the member states voted pro, and fails as soon as that is no longer possible.
// When the voting window expires, the cast votes decide (ties reject).

import { db } from "#lib/server/db.js";
import {
	blocActionCooldowns,
	blocApplications,
	blocApplicationVotes,
	blocs,
	inboxMessages,
	presidents,
	states
} from "#lib/server/schema.js";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";

export const BLOC_APPLICATION_DAYS = 3;

type Outcome = "pending" | "accepted" | "rejected" | "withdrawn";

/**
 * Current pro/contra tally of an application, counting only votes of states that
 * are still members of the bloc.
 */
export async function getBlocApplicationTally(applicationId: number, blocId: number) {
	const memberStates = await db.select({ id: states.id }).from(states).where(eq(states.blocId, blocId));
	const memberIds = memberStates.map((s) => s.id);

	const votes =
		memberIds.length > 0
			? await db
					.select({ inFavor: blocApplicationVotes.inFavor })
					.from(blocApplicationVotes)
					.where(
						and(
							eq(blocApplicationVotes.applicationId, applicationId),
							inArray(blocApplicationVotes.voterStateId, memberIds)
						)
					)
			: [];

	const pro = votes.filter((v) => v.inFavor).length;
	return { pro, contra: votes.length - pro, memberCount: memberIds.length };
}

/**
 * Create a pending application, or admit the state right away if the bloc has no
 * member states left to vote. Notifies the member-state presidents.
 */
export async function submitBlocApplication(params: { blocId: number; stateId: number; applicantId: string }) {
	const { blocId, stateId, applicantId } = params;
	const now = new Date();
	const expiresAt = new Date(now.getTime() + BLOC_APPLICATION_DAYS * 24 * 60 * 60 * 1000);

	const [application] = await db.transaction(async (tx) => {
		await tx
			.insert(blocActionCooldowns)
			.values({ userId: applicantId, lastActionAt: now })
			.onConflictDoUpdate({ target: blocActionCooldowns.userId, set: { lastActionAt: now } });

		return tx.insert(blocApplications).values({ blocId, stateId, appliedBy: applicantId, expiresAt }).returning();
	});

	const outcome = await resolveBlocApplication(application.id, applicantId);
	if (outcome !== "pending") return { application, outcome };

	const [[bloc], [state], memberPresidents] = await Promise.all([
		db.select({ name: blocs.name }).from(blocs).where(eq(blocs.id, blocId)).limit(1),
		db.select({ name: states.name }).from(states).where(eq(states.id, stateId)).limit(1),
		db
			.select({ userId: presidents.userId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(states.blocId, blocId))
	]);

	if (memberPresidents.length > 0) {
		await db.insert(inboxMessages).values(
			memberPresidents.map((p) => ({
				recipientId: p.userId,
				senderId: applicantId,
				messageType: "system" as const,
				stateId,
				subject: `🗳️ ${state.name} applied to join ${bloc.name}`,
				content: `${state.name} has applied to join ${bloc.name}. As president of a member state, cast your vote (pro or contra) on the bloc page: /bloc/${blocId}\n\nVoting closes in ${BLOC_APPLICATION_DAYS} days.`,
				isRead: false
			}))
		);
	}

	return { application, outcome };
}

/**
 * Validate and submit an application on behalf of the president `accountId`.
 */
export async function applyToBloc(
	accountId: string,
	blocId: number
): Promise<{ error: string; status: number } | { outcome: Outcome }> {
	const [[bloc], [presidency], [cooldown]] = await Promise.all([
		db.select({ id: blocs.id }).from(blocs).where(eq(blocs.id, blocId)).limit(1),
		db
			.select({ stateId: presidents.stateId, currentBlocId: states.blocId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, accountId))
			.limit(1),
		db.select().from(blocActionCooldowns).where(eq(blocActionCooldowns.userId, accountId)).limit(1)
	]);

	if (!bloc) return { error: "Bloc not found", status: 404 };
	if (!presidency) return { error: "Only state presidents can apply to join blocs", status: 403 };
	if (presidency.currentBlocId) {
		return { error: "Your state is already in a bloc. Leave your current bloc first.", status: 400 };
	}

	const [pending] = await db
		.select({ id: blocApplications.id })
		.from(blocApplications)
		.where(and(eq(blocApplications.stateId, presidency.stateId), eq(blocApplications.status, "pending")))
		.limit(1);
	if (pending) {
		return { error: "Your state already has a pending bloc application. Withdraw it first.", status: 400 };
	}

	const now = new Date();
	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastActionAt.getTime() + 24 * 60 * 60 * 1000);
		if (now < cooldownEnd) {
			const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
			return { error: `Wait ${hoursLeft}h before applying to or leaving a bloc`, status: 429 };
		}
	}

	const { outcome } = await submitBlocApplication({ blocId, stateId: presidency.stateId, applicantId: accountId });
	return { outcome };
}

/**
 * Evaluate a pending application and close it if a decision has been reached
 * (majority reached, majority impossible, or voting window expired).
 * Safe to call repeatedly; returns the application's resulting status.
 */
export async function resolveBlocApplication(applicationId: number, triggeredBy?: string): Promise<Outcome> {
	const [application] = await db.select().from(blocApplications).where(eq(blocApplications.id, applicationId)).limit(1);
	if (!application) return "withdrawn";
	if (application.status !== "pending") return application.status;

	const { pro, contra, memberCount } = await getBlocApplicationTally(application.id, application.blocId);
	const now = new Date();
	const expired = application.expiresAt <= now;

	let decision: "accepted" | "rejected" | null = null;
	if (memberCount === 0 || pro * 2 > memberCount) decision = "accepted";
	else if (contra * 2 >= memberCount) decision = "rejected";
	else if (expired) decision = pro > contra ? "accepted" : "rejected";

	if (!decision) return "pending";

	const result = await db.transaction(async (tx) => {
		// Conditional update so concurrent resolutions only apply once
		const [closed] = await tx
			.update(blocApplications)
			.set({ status: decision, resolvedAt: now })
			.where(and(eq(blocApplications.id, application.id), eq(blocApplications.status, "pending")))
			.returning();
		if (!closed) return null;

		if (decision !== "accepted") return "rejected" as const;

		const [joined] = await tx
			.update(states)
			.set({ blocId: application.blocId })
			.where(and(eq(states.id, application.stateId), isNull(states.blocId)))
			.returning({ id: states.id });

		// The state ended up in another bloc in the meantime
		if (!joined) {
			await tx.update(blocApplications).set({ status: "withdrawn" }).where(eq(blocApplications.id, application.id));
			return "withdrawn" as const;
		}

		if (application.appliedBy) {
			await tx
				.insert(blocActionCooldowns)
				.values({ userId: application.appliedBy, lastActionAt: now })
				.onConflictDoUpdate({ target: blocActionCooldowns.userId, set: { lastActionAt: now } });
		}
		return "accepted" as const;
	});

	if (!result) {
		const [current] = await db
			.select({ status: blocApplications.status })
			.from(blocApplications)
			.where(eq(blocApplications.id, application.id))
			.limit(1);
		return current?.status ?? "withdrawn";
	}

	if (result !== "withdrawn") {
		await notifyApplicant(application, result, { pro, contra }, triggeredBy);
	}

	return result;
}

/**
 * Close every pending application whose voting window has expired.
 */
export async function resolveExpiredBlocApplications(blocId?: number) {
	const expired = await db
		.select({ id: blocApplications.id })
		.from(blocApplications)
		.where(
			and(
				eq(blocApplications.status, "pending"),
				lte(blocApplications.expiresAt, new Date()),
				blocId ? eq(blocApplications.blocId, blocId) : undefined
			)
		);

	for (const application of expired) {
		await resolveBlocApplication(application.id);
	}
	return expired.length;
}

async function notifyApplicant(
	application: typeof blocApplications.$inferSelect,
	result: "accepted" | "rejected",
	tally: { pro: number; contra: number },
	triggeredBy?: string
) {
	// Notify whoever currently leads the applying state
	const [[president], [bloc]] = await Promise.all([
		db
			.select({ userId: presidents.userId })
			.from(presidents)
			.where(eq(presidents.stateId, application.stateId))
			.limit(1),
		db.select({ name: blocs.name }).from(blocs).where(eq(blocs.id, application.blocId)).limit(1)
	]);
	// Skip when the president's own action decided it (e.g. applying to an empty bloc)
	if (!president || !bloc || president.userId === triggeredBy) return;

	await db.insert(inboxMessages).values({
		recipientId: president.userId,
		senderId: triggeredBy ?? application.appliedBy ?? president.userId,
		messageType: "system",
		stateId: application.stateId,
		subject:
			result === "accepted"
				? `✅ Your state was admitted to ${bloc.name}`
				: `❌ Your application to ${bloc.name} was rejected`,
		content:
			result === "accepted"
				? `The member states of ${bloc.name} voted to admit your state (${tally.pro} pro, ${tally.contra} contra). Welcome to the alliance!`
				: `The member states of ${bloc.name} rejected your state's application (${tally.pro} pro, ${tally.contra} contra).`,
		isRead: false
	});
}
