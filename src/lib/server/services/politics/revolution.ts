// src/lib/server/services/politics/revolution.ts
// A region whose civilians have stopped supporting the state can rise. The
// uprising starts with one resident and needs three conspirators before its
// single fight for freedom. The rising fights from its home ground: its
// conspirators' units in the region plus civilian anger against the loyalist
// units still there and the state's garrison. A win or a draw frees the region.

import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	accounts,
	militaryUnits,
	productInventory,
	regions,
	residences,
	revolutionMembers,
	revolutions,
	userProfiles,
	userWallets
} from "../../schema";
import {
	MILITARY_UNIT_TEMPLATES,
	REVOLUTION_CONFIG,
	canStartRevolution,
	getExperienceCombatModifier,
	resolveFight,
	unitSupplyModifier,
	winsIndependence,
	type RevolutionOutcome
} from "#lib/config/index.js";
import { regionOpinion } from "./civic.service";
import { takeUserItem } from "../economy/inventory";
import { debitWallet } from "../../money";

export class RevolutionError extends Error {}

/** Turn a racing unique-index conflict into the same friendly error as the pre-check. */
function rethrowConflict(err: unknown, message: string): never {
	if (err instanceof Error && (err as { code?: string }).code === "23505") throw new RevolutionError(message);
	throw err;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const isLive = (status: string) => status === "organizing" || status === "fighting";

/** The one live uprising in a region, if any. */
export async function liveRevolution(db: Db, regionId: number) {
	const [row] = await db
		.select()
		.from(revolutions)
		.where(and(eq(revolutions.regionId, regionId), inArray(revolutions.status, ["organizing", "fighting"])))
		.limit(1);
	return row ?? null;
}

async function residenceRegionId(db: Database, userId: string): Promise<number | null> {
	const [row] = await db
		.select({ regionId: residences.regionId })
		.from(residences)
		.where(eq(residences.userId, userId))
		.limit(1);
	return row?.regionId ?? null;
}

/** Everything the region page needs to render the uprising panel. */
export async function revolutionView(db: Database, regionId: number, userId: string, now = new Date()) {
	const [region] = await db
		.select({ stateId: regions.stateId, fortifications: regions.fortifications })
		.from(regions)
		.where(eq(regions.id, regionId))
		.limit(1);
	if (!region?.stateId) return null;

	const [support, revolution, homeRegionId, rifleRows, walletRows] = await Promise.all([
		regionOpinion(db, regionId, now),
		liveRevolution(db, regionId),
		residenceRegionId(db, userId),
		db
			.select({ quantity: productInventory.quantity })
			.from(productInventory)
			.where(and(eq(productInventory.userId, userId), eq(productInventory.productType, "rifles")))
			.limit(1),
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, userId)).limit(1)
	]);

	let members: Array<{ userId: string; name: string | null }> = [];
	if (revolution) {
		const rows = await db
			.select({ userId: accounts.id, name: userProfiles.name })
			.from(revolutionMembers)
			.innerJoin(accounts, eq(revolutionMembers.userId, accounts.id))
			.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
			.where(eq(revolutionMembers.revolutionId, revolution.id))
			.orderBy(revolutionMembers.joinedAt);
		members = rows;
	}

	const isMember = !!revolution && members.some((m) => m.userId === userId);
	const livesHere = homeRegionId === regionId;
	const ready = members.length >= REVOLUTION_CONFIG.MIN_MEMBERS;
	const riflesOwned = rifleRows[0]?.quantity ?? 0;
	const moneyOwned = Number(walletRows[0]?.balance ?? 0);
	const canAfford =
		riflesOwned >= REVOLUTION_CONFIG.RIFLE_COST && moneyOwned >= REVOLUTION_CONFIG.MONEY_COST;

	return {
		support,
		threshold: REVOLUTION_CONFIG.MAX_SUPPORT,
		minMembers: REVOLUTION_CONFIG.MIN_MEMBERS,
		cost: { rifles: REVOLUTION_CONFIG.RIFLE_COST, money: REVOLUTION_CONFIG.MONEY_COST, riflesOwned, moneyOwned, canAfford },
		livesHere,
		revolution: revolution
			? {
					id: revolution.id,
					status: revolution.status,
					outcome: revolution.outcome,
					startedBy: revolution.startedBy,
					opinionAtStart: revolution.opinionAtStart,
					rebelPower: revolution.rebelPower,
					governmentPower: revolution.governmentPower,
					startedAt: revolution.startedAt,
					resolvedAt: revolution.resolvedAt,
					members
				}
			: null,
		canStart: !revolution && livesHere && canStartRevolution(support) && canAfford,
		canJoin: !!revolution && revolution.status === "organizing" && livesHere && !isMember,
		canFight: !!revolution && revolution.status === "organizing" && isMember && ready,
		ready
	};
}

/** Start an uprising. Only a resident of the region, and only with low local support. */
export async function startRevolution(
	db: Database,
	{ userId, regionId, now = new Date(), opinion }: { userId: string; regionId: number; now?: Date; opinion?: number }
) {
	const [region] = await db.select({ stateId: regions.stateId }).from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region?.stateId) throw new RevolutionError("An independent region has no state to rise against.");
	if ((await residenceRegionId(db, userId)) !== regionId) {
		throw new RevolutionError("Only residents can start a revolution here.");
	}
	if (await liveRevolution(db, regionId)) {
		throw new RevolutionError("This region already has a live revolution.");
	}
	const support = opinion ?? (await regionOpinion(db, regionId, now));
	if (!canStartRevolution(support)) {
		throw new RevolutionError(
			`Civilians still support the state (${support}/100). Support must be ${REVOLUTION_CONFIG.MAX_SUPPORT}/100 or lower.`
		);
	}

	return db.transaction(async (tx) => {
		try {
			// The organizer arms the rising: guns and cash are spent up front and
			// come back to nobody if the rising fails.
			if (!(await takeUserItem(tx, userId, "product", "rifles", REVOLUTION_CONFIG.RIFLE_COST))) {
				throw new RevolutionError(`You need ${REVOLUTION_CONFIG.RIFLE_COST.toLocaleString()} rifles to start a revolution.`);
			}
			await debitWallet(tx, userId, REVOLUTION_CONFIG.MONEY_COST);
			const [created] = await tx
				.insert(revolutions)
				.values({ regionId, stateId: region.stateId!, startedBy: userId, opinionAtStart: support, startedAt: now })
				.returning();
			await tx.insert(revolutionMembers).values({ revolutionId: created!.id, userId, joinedAt: now });
			return created!;
		} catch (err) {
			rethrowConflict(err, "This region already has a live revolution.");
		}
	});
}

/** Join an organizing uprising in your home region. */
export async function joinRevolution(db: Database, { userId, revolutionId }: { userId: string; revolutionId: number }) {
	const [revolution] = await db.select().from(revolutions).where(eq(revolutions.id, revolutionId)).limit(1);
	if (!revolution || revolution.status !== "organizing") {
		throw new RevolutionError("That revolution is no longer gathering conspirators.");
	}
	if ((await residenceRegionId(db, userId)) !== revolution.regionId) {
		throw new RevolutionError("Only residents can join this revolution.");
	}
	const [existing] = await db
		.select({ id: revolutionMembers.id })
		.from(revolutionMembers)
		.where(and(eq(revolutionMembers.revolutionId, revolutionId), eq(revolutionMembers.userId, userId)))
		.limit(1);
	if (existing) throw new RevolutionError("You already joined this revolution.");

	try {
		await db.insert(revolutionMembers).values({ revolutionId, userId });
	} catch (err) {
		rethrowConflict(err, "You already joined this revolution.");
	}
	return { memberCount: (await membersOf(db, revolutionId)).length };
}

async function membersOf(db: Db, revolutionId: number) {
	return db
		.select({ userId: revolutionMembers.userId })
		.from(revolutionMembers)
		.where(eq(revolutionMembers.revolutionId, revolutionId));
}

/** Combat power of one unit: its average combat stat, condition and experience. */
function unitPower(unit: {
	unitType: keyof typeof MILITARY_UNIT_TEMPLATES;
	health: number;
	experience: number | null;
	supplyLevel: number | null;
}): number {
	const template = MILITARY_UNIT_TEMPLATES[unit.unitType];
	if (!template) return 0;
	return Math.max(
		0,
		Math.floor(
			((template.baseAttack + template.baseDefense) / 2) *
				(Math.max(0, unit.health) / 100) *
				getExperienceCombatModifier(unit.experience ?? 0) *
				unitSupplyModifier(unit.supplyLevel ?? 100, 1)
		)
	);
}

/**
 * Launch the one fight for freedom. Draw or victory makes the region
 * independent; only a defeat leaves it in the state.
 */
export async function fightForFreedom(
	db: Database,
	{
		userId,
		revolutionId,
		now = new Date(),
		opinion
	}: { userId: string; revolutionId: number; now?: Date; opinion?: number }
) {
	const [initial] = await db.select().from(revolutions).where(eq(revolutions.id, revolutionId)).limit(1);
	if (!initial) throw new RevolutionError("That revolution no longer exists.");
	// Read support outside the transaction: the opinion helpers use the plain DB.
	const support = opinion ?? (await regionOpinion(db, initial.regionId, now));

	return db.transaction(async (tx) => {
		const [locked] = await tx
			.select({ status: revolutions.status })
			.from(revolutions)
			.where(eq(revolutions.id, revolutionId))
			.for("update");
		if (!locked) throw new RevolutionError("That revolution no longer exists.");
		if (locked.status !== "organizing") throw new RevolutionError("The fight for freedom has already begun.");

		const [revolution] = await tx.select().from(revolutions).where(eq(revolutions.id, revolutionId));
		const members = await membersOf(tx, revolutionId);
		if (!members.some((m) => m.userId === userId)) throw new RevolutionError("Only a conspirator can call the fight.");
		if (members.length < REVOLUTION_CONFIG.MIN_MEMBERS) {
			throw new RevolutionError(`At least ${REVOLUTION_CONFIG.MIN_MEMBERS} players must join the revolution.`);
		}

		const [region] = await tx
			.select({ stateId: regions.stateId, fortifications: regions.fortifications })
			.from(regions)
			.where(eq(regions.id, revolution!.regionId));
		if (!region?.stateId || region.stateId !== revolution!.stateId) {
			throw new RevolutionError("The region is no longer part of that state.");
		}

		const memberIds = new Set(members.map((m) => m.userId));
		const units = await tx
			.select({
				ownerId: militaryUnits.ownerId,
				stateId: militaryUnits.stateId,
				unitType: militaryUnits.unitType,
				health: militaryUnits.health,
				experience: militaryUnits.experience,
				supplyLevel: militaryUnits.supplyLevel
			})
			.from(militaryUnits)
			.where(eq(militaryUnits.regionId, revolution!.regionId));

		const uprising =
			Math.max(0, REVOLUTION_CONFIG.NEUTRAL_OPINION - support) * REVOLUTION_CONFIG.UPRISING_PER_LOST_POINT;
		const rebelPower =
			uprising + units.filter((u) => memberIds.has(u.ownerId)).reduce((sum, u) => sum + unitPower(u), 0);
		const garrison =
			REVOLUTION_CONFIG.BASE_GARRISON +
			Math.max(0, region.fortifications ?? 0) * REVOLUTION_CONFIG.GARRISON_PER_FORTIFICATION;
		const governmentPower =
			garrison +
			units
				.filter((u) => u.stateId === revolution!.stateId && !memberIds.has(u.ownerId))
				.reduce((sum, u) => sum + unitPower(u), 0);

		const outcome: RevolutionOutcome = resolveFight(rebelPower, governmentPower);
		const independent = winsIndependence(outcome);
		if (independent) {
			await tx.update(regions).set({ stateId: null }).where(eq(regions.id, revolution!.regionId));
		}
		await tx
			.update(revolutions)
			.set({
				status: independent ? "independent" : "crushed",
				outcome,
				rebelPower,
				governmentPower,
				foughtAt: now,
				resolvedAt: now
			})
			.where(eq(revolutions.id, revolutionId));

		return { outcome, independent, rebelPower, governmentPower, memberCount: members.length };
	});
}

/**
 * Historical uprisings for a region, newest first.
 */
export async function revolutionHistory(db: Database, regionId: number) {
	return db
		.select({
			id: revolutions.id,
			status: revolutions.status,
			outcome: revolutions.outcome,
			startedAt: revolutions.startedAt,
			resolvedAt: revolutions.resolvedAt
		})
		.from(revolutions)
		.where(eq(revolutions.regionId, regionId))
		.orderBy(sql`${revolutions.startedAt} desc`)
		.limit(10);
}
