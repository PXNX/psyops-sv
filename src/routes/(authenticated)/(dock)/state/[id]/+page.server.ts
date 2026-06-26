// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	states,
	blocs,
	parliamentaryElections,
	residences,
	stateTaxes,
	stateEnergy,
	powerPlants,
	ministers,
	regions,
	presidents,
	userProfiles,
	parliamentMembers,
	stateSanctions,
	accounts,
	files,
	wars,
	stateVisaSettings,
	userVisas,
	userWallets,
	stateTreasury,
	visaApplications
} from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and, gte, sql, or } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getLogoUrl, getSignedDownloadUrl } from "$lib/server/backblaze";
import { getRegionName } from "$lib/utils/formatting";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = parseInt(params.id);

	// Get state with bloc information
	const [state] = await db
		.select({
			id: states.id,
			name: states.name,
			logo: states.logo,
			background: states.background,
			description: states.description,
			rating: states.rating,
			createdAt: states.createdAt,
			blocId: blocs.id,
			blocName: blocs.name,
			blocColor: blocs.color,
			blocDescription: blocs.description
		})
		.from(states)
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(eq(states.id, stateId))
		.limit(1);

	if (!state) {
		error(404, "State not found");
	}

	// Get president - manual join
	const [presidentData] = await db
		.select({
			userId: presidents.userId,
			electedAt: presidents.electedAt,
			term: presidents.term,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(presidents)
		.leftJoin(accounts, eq(presidents.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(presidents.stateId, stateId))
		.limit(1);

	// Get ministers - manual join
	const stateMinistersRaw = await db
		.select({
			userId: ministers.userId,
			ministry: ministers.ministry,
			appointedAt: ministers.appointedAt,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(ministers)
		.leftJoin(accounts, eq(ministers.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(ministers.stateId, stateId));

	// Get parliament members
	const parliamentMembersRaw = await db
		.select({
			userId: parliamentMembers.userId,
			partyAffiliation: parliamentMembers.partyAffiliation,
			electedAt: parliamentMembers.electedAt,
			term: parliamentMembers.term,
			profileName: userProfiles.name,
			profileLogo: userProfiles.logo
		})
		.from(parliamentMembers)
		.leftJoin(userProfiles, eq(parliamentMembers.userId, userProfiles.accountId))
		.where(eq(parliamentMembers.stateId, stateId))
		.limit(20);

	// Get regions with population count
	const stateRegions = await db
		.select({
			id: regions.id,
			stateId: regions.stateId,
			rating: regions.rating,
			population: sql<number>`count(${residences.id})::int`
		})
		.from(regions)
		.leftJoin(residences, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId))
		.groupBy(regions.id);

	// Calculate actual population from residences
	const populationResult = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId));

	const actualPopulation = populationResult[0]?.total || 0;

	// Get next or active election
	const now = new Date();
	const [nextElection] = await db
		.select()
		.from(parliamentaryElections)
		.where(and(eq(parliamentaryElections.stateId, stateId), gte(parliamentaryElections.endDate, now)))
		.orderBy(parliamentaryElections.startDate)
		.limit(1);

	// Get active taxes
	const activeTaxes = await db
		.select()
		.from(stateTaxes)
		.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.isActive, true)));

	// Get energy data
	const [energyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, stateId)).limit(1);

	// Get power plants
	const plants = await db.select().from(powerPlants).where(eq(powerPlants.stateId, stateId));

	// Check if current user is president of this state
	const isPresident = presidentData?.userId === locals.account?.id;

	// Check if current user is a foreign minister of another state
	let isForeignMinister = false;
	if (locals.account?.id) {
		const [foreignMinistry] = await db
			.select()
			.from(ministers)
			.where(and(eq(ministers.userId, locals.account.id), eq(ministers.ministry, "foreign_affairs")))
			.limit(1);

		isForeignMinister = !!foreignMinistry && foreignMinistry.stateId !== stateId;
	}

	// Check if current user is president of ANOTHER state
	let userPresidency = null;
	let canDeclareWar = false;
	if (locals.account?.id) {
		const [userPres] = await db
			.select({
				stateId: presidents.stateId,
				stateBlocId: states.blocId
			})
			.from(presidents)
			.leftJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, locals.account.id))
			.limit(1);

		if (userPres && userPres.stateId !== stateId) {
			userPresidency = userPres;
			// Can declare war if: not in same bloc (or either has no bloc)
			canDeclareWar = userPres.stateBlocId !== state.blocId || !userPres.stateBlocId || !state.blocId;
		}
	}

	// Get active wars involving this state
	const activeWarsRaw = await db
		.select({
			id: wars.id,
			attackerId: wars.attackerId,
			defenderId: wars.defenderId,
			declaredBy: wars.declaredBy,
			declaredAt: wars.declaredAt,
			status: wars.status,
			attackerName: sql<string>`attacker.name`,
			attackerLogo: sql<number>`attacker.logo`,
			defenderName: sql<string>`defender.name`,
			defenderLogo: sql<number>`defender.logo`,
			declarerName: userProfiles.name
		})
		.from(wars)
		.innerJoin(sql`states AS attacker`, sql`attacker.id = ${wars.attackerId}`)
		.innerJoin(sql`states AS defender`, sql`defender.id = ${wars.defenderId}`)
		.leftJoin(accounts, eq(wars.declaredBy, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(and(or(eq(wars.attackerId, stateId), eq(wars.defenderId, stateId)), eq(wars.status, "active")));

	const activeWars = await Promise.all(
		activeWarsRaw.map(async (war) => ({
			id: war.id,
			attackerId: war.attackerId,
			defenderId: war.defenderId,
			declaredBy: war.declaredBy,
			declaredAt: war.declaredAt,
			status: war.status,
			attacker: {
				id: war.attackerId,
				name: war.attackerName,
				logo: await getLogoUrl(war.attackerLogo)
			},
			defender: {
				id: war.defenderId,
				name: war.defenderName,
				logo: await getLogoUrl(war.defenderLogo)
			},
			declarer: {
				name: war.declarerName
			},
			isAttacker: war.attackerId === stateId
		}))
	);

	// Get visa settings for this state
	const visaSettings = await db.query.stateVisaSettings.findFirst({
		where: eq(stateVisaSettings.stateId, stateId)
	});

	// Check if user has active visa for this state
	let hasActiveVisa = false;
	let userActiveVisa = null;
	if (locals.account?.id) {
		userActiveVisa = await db.query.userVisas.findFirst({
			where: and(
				eq(userVisas.userId, locals.account.id),
				eq(userVisas.stateId, stateId),
				eq(userVisas.status, "active")
			)
		});
		hasActiveVisa = !!userActiveVisa && new Date(userActiveVisa.expiresAt) > new Date();
	}

	// Check if user is a resident of this state
	let isResident = false;
	let userResidenceBloc = null;
	if (locals.account?.id) {
		const userRes = await db.query.residences.findFirst({
			where: eq(residences.userId, locals.account.id),
			with: {
				region: {
					with: { state: { with: { bloc: true } } }
				}
			}
		});
		if (userRes) {
			isResident = userRes.region.stateId === stateId;
			userResidenceBloc = userRes.region.state?.bloc ?? null;
		}
	}

	// Check bloc visa-free override
	let blocVisaFree = false;
	if (!isResident && userResidenceBloc && state.blocId && userResidenceBloc.id === state.blocId && userResidenceBloc.visaFreeForMembers) {
		blocVisaFree = true;
	}

	// Check if visa is blocked by war or sanctions
	let visaBlockedReason: string | null = null;
	if (!isResident && locals.account?.id) {
		const userRes = await db.query.residences.findFirst({
			where: eq(residences.userId, locals.account.id),
			with: { region: { with: { state: true } } }
		});
		const userStateId = userRes?.region?.stateId;
		const userBlocId = userResidenceBloc?.id ?? null;

		if (userStateId && userStateId !== stateId) {
			// Check active wars
			const warBlock = await db.query.wars.findFirst({
				where: and(
					eq(wars.status, "active"),
					or(
						and(eq(wars.attackerId, userStateId), eq(wars.defenderId, stateId)),
						and(eq(wars.attackerId, stateId), eq(wars.defenderId, userStateId)),
						...(userBlocId
							? [
									and(eq(wars.attackerBlocId, userBlocId), eq(wars.defenderId, stateId)),
									and(eq(wars.attackerId, stateId), eq(wars.defenderBlocId, userBlocId))
								]
							: [])
					)
				)
			});

			if (warBlock) {
				visaBlockedReason = "Your state is at war with this state";
			}

			// Check sanctions
			if (!visaBlockedReason) {
				const sanctionBlock = await db.query.stateSanctions.findFirst({
					where: and(
						eq(stateSanctions.sanctioningStateId, stateId),
						eq(stateSanctions.targetStateId, userStateId),
						eq(stateSanctions.isActive, true)
					)
				});

				if (sanctionBlock) {
					visaBlockedReason = "This state has sanctioned your state";
				}
			}
		}
	}

	// Get wallet balance
	let walletBalance = 0;
	if (locals.account?.id) {
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, locals.account.id)
		});
		walletBalance = wallet ? Number(wallet.balance) : 0;
	}

	return {
		state: {
			id: state.id,
			name: state.name,
			logo: await getLogoUrl(state.logo),
			background: state.background,
			description: state.description,
			population: actualPopulation,
			rating: state.rating,
			createdAt: state.createdAt
		},
		walletBalance,
		visa: {
				isResident,
				visaRequired: visaSettings?.visaRequired ?? false,
				visaCost: visaSettings ? Number(visaSettings.visaCost) : 5000,
				visaTaxRate: visaSettings?.visaTaxRate ?? 20,
				autoApprove: visaSettings?.autoApprove ?? true,
				hasActiveVisa,
				activeVisa: userActiveVisa
					? {
							expiresAt: userActiveVisa.expiresAt.toISOString(),
							cost: Number(userActiveVisa.cost)
						}
					: null,
				blocVisaFree,
				blockedReason: visaBlockedReason
			},
		bloc: state.blocId
			? {
					id: state.blocId,
					name: state.blocName,
					color: state.blocColor,
					description: state.blocDescription
				}
			: null,
		president: presidentData
			? {
					userId: presidentData.userId,
					name: presidentData.profileName,
					logo: await getLogoUrl(presidentData.profileLogo),
					electedAt: presidentData.electedAt,
					term: presidentData.term
				}
			: null,
		ministers: await Promise.all(
			stateMinistersRaw.map(async (minister) => ({
				userId: minister.userId,
				name: minister.profileName,
				logo: await getLogoUrl(minister.profileLogo),
				ministry: minister.ministry,
				appointedAt: minister.appointedAt
			}))
		),
		parliamentMembers: await Promise.all(
			parliamentMembersRaw.map(async (member) => ({
				userId: member.userId,
				name: member.profileName,
				logo: await getLogoUrl(member.profileLogo),
				partyAffiliation: member.partyAffiliation,
				electedAt: member.electedAt,
				term: member.term
			}))
		),
		regions: stateRegions.map((region) => ({
			id: region.id,
			name: getRegionName(region.id),
			logo: "/coats/" + region.id + ".svg",
			rating: region.rating,
			population: region.population || 0
		})),
		nextElection: nextElection
			? {
					id: nextElection.id,
					startDate: nextElection.startDate,
					endDate: nextElection.endDate,
					status: nextElection.status,
					totalSeats: nextElection.totalSeats,
					isInaugural: nextElection.isInaugural
				}
			: null,
		taxes: activeTaxes.map((tax) => ({
			id: tax.id,
			taxType: tax.taxType,
			taxRate: tax.taxRate,
			implementedAt: tax.implementedAt
		})),
		energy: energyData
			? {
					totalProduction: energyData.totalProduction,
					usedProduction: energyData.usedProduction,
					available: energyData.totalProduction - energyData.usedProduction
				}
			: null,
		powerPlants: plants.length,
		isPresident,
		isForeignMinister,
		canDeclareWar,
		activeWars
	};
};

export const actions: Actions = {
	sanction: async ({ params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Verify user is a foreign minister
		const [foreignMinistry] = await db
			.select()
			.from(ministers)
			.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "foreign_affairs")))
			.limit(1);

		if (!foreignMinistry) {
			return fail(403, { message: "Only foreign ministers can impose sanctions" });
		}

		// Can't sanction own state
		if (foreignMinistry.stateId === stateId) {
			return fail(400, { message: "Cannot sanction your own state" });
		}

		// Check if sanction already exists and is active
		const [existingSanction] = await db
			.select()
			.from(stateSanctions)
			.where(
				and(
					eq(stateSanctions.targetStateId, stateId),
					eq(stateSanctions.sanctioningStateId, foreignMinistry.stateId),
					eq(stateSanctions.isActive, true)
				)
			)
			.limit(1);

		if (existingSanction) {
			return fail(400, { message: "This state is already sanctioned by your state" });
		}

		// Apply sanction
		await db.insert(stateSanctions).values({
			targetStateId: stateId,
			sanctioningStateId: foreignMinistry.stateId,
			sanctionedBy: account.id,
			reason: "Diplomatic sanction imposed",
			isActive: true
		});

		return { success: true, message: "Sanction applied successfully" };
	},

	declareWar: async ({ params, locals }) => {
		const account = locals.account!;
		const targetStateId = parseInt(params.id);

		// Verify user is a president
		const [presidency] = await db
			.select({
				stateId: presidents.stateId,
				stateBlocId: states.blocId
			})
			.from(presidents)
			.leftJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return fail(403, { message: "Only presidents can declare war" });
		}

		// Can't declare war on own state
		if (presidency.stateId === targetStateId) {
			return fail(400, { message: "Cannot declare war on your own state" });
		}

		// Get target state bloc info
		const [targetState] = await db
			.select({
				blocId: states.blocId
			})
			.from(states)
			.where(eq(states.id, targetStateId))
			.limit(1);

		if (!targetState) {
			return fail(404, { message: "Target state not found" });
		}

		// Can't declare war on bloc members
		if (presidency.stateBlocId && targetState.blocId === presidency.stateBlocId) {
			return fail(400, { message: "Cannot declare war on a state in your own bloc" });
		}

		// Check if war already exists between these states
		const [existingWar] = await db
			.select()
			.from(wars)
			.where(
				and(
					eq(wars.status, "active"),
					sql`(
						(${wars.attackerId} = ${presidency.stateId} AND ${wars.defenderId} = ${targetStateId}) OR
						(${wars.attackerId} = ${targetStateId} AND ${wars.defenderId} = ${presidency.stateId})
					)`
				)
			)
			.limit(1);

		if (existingWar) {
			return fail(400, { message: "A war already exists between these states" });
		}

		// Create the war
		const [newWar] = await db
			.insert(wars)
			.values({
				attackerId: presidency.stateId,
				defenderId: targetStateId,
				attackerBlocId: presidency.stateBlocId,
				defenderBlocId: targetState.blocId,
				declaredBy: account.id,
				status: "active"
			})
			.returning();

		const [attackerState] = await db.select({ name: states.name }).from(states).where(eq(states.id, presidency.stateId)).limit(1);
		const [defenderStateInfo] = await db.select({ name: states.name }).from(states).where(eq(states.id, targetStateId)).limit(1);

		for (const sId of [presidency.stateId, targetStateId]) {
			const citizens = await db
				.select({ userId: residences.userId })
				.from(residences)
				.innerJoin(regions, eq(residences.regionId, regions.id))
				.where(eq(regions.stateId, sId));

			const isAttacker = sId === presidency.stateId;
			const payload = {
				title: "⚔️ War Declared!",
				body: isAttacker
					? `Your state declared war on ${defenderStateInfo?.name ?? "an enemy"}!`
					: `${attackerState?.name ?? "An enemy"} has declared war on your state!`,
				icon: "/favicon.png",
				badge: "/badge.png",
				data: { url: `/war/${newWar.id}`, tag: `war-${newWar.id}` }
			};

			Promise.allSettled(
				citizens.map((c) => sendNotificationIfEnabled(c.userId, "notifyWarDeclarations", payload))
			).catch((err) => console.error("War declaration notification error:", err));
		}

		return {
			success: true,
			message: `War declared successfully!`,
			warId: newWar.id
		};
		},

		purchaseVisa: async ({ params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		const residence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: {
				region: {
					with: { state: { with: { bloc: true } } }
				}
			}
		});

		if (residence?.region.stateId === stateId) {
			return fail(400, { error: "You are already a resident of this state" });
		}

		// Block visa if at war or sanctioned
		if (residence?.region.stateId) {
			const userStateId = residence.region.stateId;
			const userBlocId = residence.region.state?.blocId ?? null;

			const warBlock = await db.query.wars.findFirst({
				where: and(
					eq(wars.status, "active"),
					or(
						and(eq(wars.attackerId, userStateId), eq(wars.defenderId, stateId)),
						and(eq(wars.attackerId, stateId), eq(wars.defenderId, userStateId)),
						...(userBlocId
							? [
									and(eq(wars.attackerBlocId, userBlocId), eq(wars.defenderId, stateId)),
									and(eq(wars.attackerId, stateId), eq(wars.defenderBlocId, userBlocId))
								]
							: [])
					)
				)
			});

			if (warBlock) {
				return fail(400, { error: "Cannot apply for visa — your state is at war with this state" });
			}

			const sanctionBlock = await db.query.stateSanctions.findFirst({
				where: and(
					eq(stateSanctions.sanctioningStateId, stateId),
					eq(stateSanctions.targetStateId, userStateId),
					eq(stateSanctions.isActive, true)
				)
			});

			if (sanctionBlock) {
				return fail(400, { error: "Cannot apply for visa — this state has sanctioned your state" });
			}
		}

		let visaSettingsData = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		if (!visaSettingsData) {
			[visaSettingsData] = await db
				.insert(stateVisaSettings)
				.values({
					stateId,
					visaRequired: false,
					visaCost: 5000,
					visaTaxRate: 20,
					autoApprove: true
				})
				.returning();
		}

		if (!visaSettingsData.visaRequired) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 14);

			await db.insert(userVisas).values({
				userId: account.id,
				stateId,
				status: "active",
				expiresAt,
				cost: 0,
				taxPaid: 0,
				approvedAt: new Date()
			});

			return { success: true, message: "Free visa granted for open borders state" };
		}

		const existingVisa = await db.query.userVisas.findFirst({
			where: and(eq(userVisas.userId, account.id), eq(userVisas.stateId, stateId), eq(userVisas.status, "active"))
		});

		if (existingVisa && new Date(existingVisa.expiresAt) > new Date()) {
			return fail(400, { error: "You already have an active visa for this state" });
		}

		const pendingApp = await db.query.visaApplications.findFirst({
			where: and(
				eq(visaApplications.userId, account.id),
				eq(visaApplications.stateId, stateId),
				eq(visaApplications.status, "pending")
			)
		});

		if (pendingApp) {
			return fail(400, { error: "You already have a pending visa application" });
		}

		if (!visaSettingsData.autoApprove) {
			await db.insert(visaApplications).values({
				userId: account.id,
				stateId,
				status: "pending",
				purpose: "Visit and work"
			});

			return { success: true, message: "Visa application submitted for review by Foreign Minister" };
		}

		const visaCost = Number(visaSettingsData.visaCost);
		const taxRate = visaSettingsData.visaTaxRate;
		const taxAmount = Math.floor(visaCost * (taxRate / 100));

		let wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!wallet) {
			[wallet] = await db
				.insert(userWallets)
				.values({ userId: account.id, balance: 10000 })
				.returning();
		}

		const walletBal = Number(wallet.balance);

		if (walletBal < visaCost) {
			return fail(400, {
				error: `Insufficient funds. Need $${visaCost.toLocaleString()}, have $${walletBal.toLocaleString()}`
			});
		}

		await db
			.update(userWallets)
			.set({ balance: walletBal - visaCost, updatedAt: new Date() })
			.where(eq(userWallets.userId, account.id));

		let treasury = await db.query.stateTreasury.findFirst({
			where: eq(stateTreasury.stateId, stateId)
		});

		if (!treasury) {
			[treasury] = await db
				.insert(stateTreasury)
				.values({ stateId, balance: 0, totalCollected: 0, totalSpent: 0 })
				.returning();
		}

		await db
			.update(stateTreasury)
			.set({
				balance: Number(treasury.balance) + taxAmount,
				totalCollected: Number(treasury.totalCollected) + taxAmount,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 14);

		await db.insert(userVisas).values({
			userId: account.id,
			stateId,
			status: "active",
			expiresAt,
			cost: visaCost,
			taxPaid: taxAmount,
			approvedAt: new Date()
		});

		return {
			success: true,
			message: `Visa purchased for $${visaCost.toLocaleString()} (tax: $${taxAmount.toLocaleString()})`
		};
		}
		};
