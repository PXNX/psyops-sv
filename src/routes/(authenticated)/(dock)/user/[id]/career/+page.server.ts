// src/routes/(authenticated)/(dock)/user/[id]/career/+page.server.ts
import { db } from "#lib/server/db.js";
import { accounts, journalists, userMedals, presidents, ministers, partyMembers } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { error } from "@sveltejs/kit";
import { desc, eq, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;

	// Query account with all career-related data
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true,
			journalists: {
				with: {
					newspaper: true
				},
				orderBy: [desc(journalists.id)]
			}
		}
	});

	if (!user) {
		error(404, "User not found");
	}

	// Everything below only depends on the user, so fetch it in parallel
	const [
		medals,
		logoUrl,
		newspaperLogoEntries,
		currentPartyMemberships,
		currentPresidencies,
		currentMinistries,
		canAwardMedal,
		hasAwardedThisMonth
	] = await Promise.all([
		// Get user medals
		db.query.userMedals.findMany({
			where: eq(userMedals.userId, params.id),
			with: {
				awardedByUser: {
					with: {
						profile: true
					}
				},
				state: true
			},
			orderBy: [desc(userMedals.awardedAt)]
		}),
		// Get user profile logo if exists
		getLogoUrl(user.profile?.logo),
		// Get newspaper logos
		Promise.all(
			user.journalists.map(
				async (journalist) => [journalist.newspaper.id, await getLogoUrl(journalist.newspaper.logo)] as const
			)
		),
		// Get current party memberships
		db.query.partyMembers.findMany({
			where: eq(partyMembers.userId, params.id),
			with: {
				party: {
					with: { state: true }
				}
			},
			orderBy: [desc(partyMembers.joinedAt)]
		}),
		// Get current state positions (president)
		db.query.presidents.findMany({
			where: eq(presidents.userId, params.id),
			with: { state: true },
			orderBy: [desc(presidents.electedAt)]
		}),
		// Get current state positions (minister)
		db.query.ministers.findMany({
			where: eq(ministers.userId, params.id),
			with: { state: true },
			orderBy: [desc(ministers.appointedAt)]
		}),
		// Check if current user can award medals
		(async () => {
			if (!account) return false;
			const presidency = await db.query.presidents.findFirst({
				where: eq(presidents.userId, account.id)
			});
			return !!presidency;
		})(),
		(async () => {
			if (!account) return false;
			// Check if already awarded this month
			const startOfMonth = new Date();
			startOfMonth.setDate(1);
			startOfMonth.setHours(0, 0, 0, 0);

			const thisMonthAwards = await db.query.userMedals.findFirst({
				where: and(
					eq(userMedals.awardedBy, account.id)
					// Add date comparison here if needed
				)
			});

			return !!thisMonthAwards && new Date(thisMonthAwards.awardedAt) >= startOfMonth;
		})()
	]);

	const newspaperLogos = new Map<number, string>();
	for (const [newspaperId, logo] of newspaperLogoEntries) {
		if (logo) newspaperLogos.set(newspaperId, logo);
	}

	// Calculate career statistics
	const newspaperCount = user.journalists.length;

	// Group journalists by newspaper with their positions
	const newspaperPositions = user.journalists.reduce(
		(acc, j) => {
			const existing = acc.find((n) => n.newspaperId === j.newspaper.id);
			if (existing) {
				existing.positions.push({
					rank: j.rank
				});
			} else {
				acc.push({
					newspaperId: j.newspaper.id,
					newspaperName: j.newspaper.name,
					newspaperLogo: newspaperLogos.get(j.newspaper.id) || null,
					newspaperBackground: j.newspaper.background,
					positions: [
						{
							rank: j.rank
						}
					]
				});
			}
			return acc;
		},
		[] as Array<{
			newspaperId: number;
			newspaperName: string;
			newspaperLogo: string | null;
			newspaperBackground: string | null;
			positions: Array<{ rank: string }>;
		}>
	);

	return {
		user: {
			id: user.id,
			name: user.profile?.name,
			logo: logoUrl,
			bio: user.profile?.bio,
			createdAt: user.createdAt
		},
		career: {
			newspaperPositions,
			partyMemberships: currentPartyMemberships.map((pm) => ({
				partyId: pm.partyId,
				partyName: pm.party.name,
				partyColor: pm.party.color,
				partyAbbreviation: pm.party.abbreviation,
				stateName: pm.party.state.name,
				stateId: pm.party.state.id,
				role: pm.role,
				joinedAt: pm.joinedAt
			})),
			statePositions: [
				...currentPresidencies.map((p) => ({
					type: "president" as const,
					stateId: p.stateId,
					stateName: p.state.name,
					title: "President",
					term: p.term,
					appointedAt: p.electedAt
				})),
				...currentMinistries.map((m) => ({
					type: "minister" as const,
					stateId: m.stateId,
					stateName: m.state.name,
					title: `Minister of ${m.ministry.charAt(0).toUpperCase() + m.ministry.slice(1)}`,
					term: null,
					appointedAt: m.appointedAt
				}))
			].sort((a, b) => new Date(b.appointedAt).getTime() - new Date(a.appointedAt).getTime()),
			medals: medals.map((m) => ({
				id: m.id,
				medalType: m.medalType,
				reason: m.reason,
				awardedAt: m.awardedAt,
				awardedBy: {
					name: m.awardedByUser.profile?.name || "Unknown",
					logo: null // Can be enhanced later
				},
				stateName: m.state.name
			})),
			stats: {
				newspaperCount,
				medalCount: medals.length
			}
		},
		canAwardMedal: canAwardMedal && !hasAwardedThisMonth && account?.id !== params.id,
		isOwnProfile: account?.id === params.id
	};
};
