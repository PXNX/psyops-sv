// src/lib/server/services/military/ai.ts
// A state's artificial-intelligence capability against the database: raising
// the level (paid in treasury, chips and rare earths) and the bonuses other
// systems read from it.
//
// Level 0 means no programme. Every level makes cyber operations, intel
// fusion, factory output and customs detection a little better; the numbers
// live in config/game/ai.config.ts.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	presidents,
	stateAi,
	stateProductInventory,
	stateResourceInventory,
	stateTreasury,
	states
} from "../../schema";
import {
	AI_MAX_LEVEL,
	aiCyberDefence,
	aiCyberOffence,
	aiDetectionBonus,
	aiLevelSpec,
	aiProductionFactor,
	aiReconBonus,
	aiUpgradeCost
} from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export class AiError extends Error {}

export type AiRole = "president" | "economy";
export const AI_ROLE_LABEL: Record<AiRole, string> = {
	president: "President",
	economy: "Minister of the Economy"
};

export async function aiAuthority(db: Db, userId: string): Promise<{ stateId: number; role: AiRole } | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId })
		.from(ministers)
		.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "economy")))
		.limit(1);
	return minister ? { stateId: minister.stateId, role: "economy" } : null;
}

export async function aiLevel(db: Db, stateId: number | null): Promise<number> {
	if (stateId == null) return 0;
	const [row] = await db.select({ level: stateAi.level }).from(stateAi).where(eq(stateAi.stateId, stateId));
	return row?.level ?? 0;
}

export interface AiBonuses {
	level: number;
	label: string;
	production: number;
	recon: number;
	cyberOffence: number;
	cyberDefence: number;
	detection: number;
	researchPerDay: number;
}

export async function aiBonuses(db: Db, stateId: number): Promise<AiBonuses> {
	const level = await aiLevel(db, stateId);
	return {
		level,
		label: aiLevelSpec(level).label,
		production: aiProductionFactor(level),
		recon: aiReconBonus(level),
		cyberOffence: aiCyberOffence(level),
		cyberDefence: aiCyberDefence(level),
		detection: aiDetectionBonus(level),
		researchPerDay: aiLevelSpec(level).researchPerDay
	};
}

export interface AiUpgradeResult {
	level: number;
	label: string;
	cost: number;
	chips: number;
	rareEarth: number;
}

/**
 * Raise the state's AI capability one level. Paid from the treasury and the
 * state's chip and rare-earth stockpiles. Throws AiError with a readable
 * reason when it isn't possible.
 */
export async function upgradeAi(db: Database, userId: string): Promise<AiUpgradeResult> {
	const authority = await aiAuthority(db, userId);
	if (!authority) throw new AiError("Only the president or economy minister can fund an AI programme.");
	return db.transaction(async (tx) => {
		const level = await aiLevel(tx, authority.stateId);
		const next = aiUpgradeCost(level);
		if (!next) throw new AiError(`AI capability is already at level ${AI_MAX_LEVEL}.`);
		const [state] = await tx.select({ id: states.id }).from(states).where(eq(states.id, authority.stateId));
		if (!state) throw new AiError("That state doesn't exist.");

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < next.cost)
			throw new AiError(`The treasury needs ${next.cost.toLocaleString()} for this level.`);

		const [chips] = await tx
			.select({ quantity: stateProductInventory.quantity })
			.from(stateProductInventory)
			.where(and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "chips")))
			.for("update");
		if ((chips?.quantity ?? 0) < next.chips)
			throw new AiError(`The state needs ${next.chips} chips in its stockpile. Build a fabrication plant first.`);

		const [rare] = await tx
			.select({ quantity: stateResourceInventory.quantity })
			.from(stateResourceInventory)
			.where(and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "rare_earth")))
			.for("update");
		if ((rare?.quantity ?? 0) < next.rareEarth)
			throw new AiError(`The state needs ${next.rareEarth} rare earths in its stockpile.`);

		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${next.cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${next.cost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, authority.stateId));
		await tx
			.update(stateProductInventory)
			.set({ quantity: sql`${stateProductInventory.quantity} - ${next.chips}`, updatedAt: new Date() })
			.where(and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "chips")));
		await tx
			.update(stateResourceInventory)
			.set({ quantity: sql`${stateResourceInventory.quantity} - ${next.rareEarth}`, updatedAt: new Date() })
			.where(
				and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "rare_earth"))
			);

		if (level === 0) {
			await tx.insert(stateAi).values({ stateId: authority.stateId, level: 1, upgradedBy: userId });
		} else {
			await tx
				.update(stateAi)
				.set({ level: sql`${stateAi.level} + 1`, upgradedBy: userId, updatedAt: new Date() })
				.where(eq(stateAi.stateId, authority.stateId));
		}

		await tx.insert(governmentBudgetTransactions).values({
			stateId: authority.stateId,
			transactionType: "ai_research",
			amount: next.cost,
			balanceAfter: Number(treasury.balance) - next.cost,
			description: `AI programme raised to level ${level + 1}`,
			authorizedBy: userId
		});

		return { level: level + 1, label: aiLevelSpec(level + 1).label, ...next };
	});
}
