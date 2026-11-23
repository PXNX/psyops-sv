// src/lib/server/services/military/ai.ts
// A state's artificial-intelligence capability against the database: raising
// the level (paid in treasury, chips, rare earths, and — at the top tiers —
// server hardware and datacenters) and the bonuses other systems read from it.
//
// Level 0 means no programme. Every level makes cyber operations, intel
// fusion, factory output and customs detection a little better; the numbers
// live in config/game/ai.config.ts.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	presidents,
	stateAi,
	stateBuildings,
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
	aiUpgradeCost,
	datacenterCyberBonus,
	datacenterOperational,
	datacenterResearch
} from "#lib/config/index.js";
import { regionsCivilianNeeds } from "../civilians/supply.js";

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

/** Loose hardware plus built datacenter sites that still have power and water. */
export async function datacenterStocks(
	db: Db,
	stateId: number | null
): Promise<{ hardware: number; datacenters: number }> {
	if (stateId == null) return { hardware: 0, datacenters: 0 };
	const [rows, sites] = await Promise.all([
		db
			.select({ quantity: stateProductInventory.quantity })
			.from(stateProductInventory)
			.where(
				and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, "hardware"))
			),
		db
			.select({ regionId: stateBuildings.regionId })
			.from(stateBuildings)
			.where(
				and(
					eq(stateBuildings.stateId, stateId),
					eq(stateBuildings.buildingType, "datacenter"),
					eq(stateBuildings.isUnderConstruction, false)
				)
			)
	]);
	const needs = await regionsCivilianNeeds(db, sites.map((s) => s.regionId));
	const powered = sites.filter((s) => {
		const need = needs.get(s.regionId);
		return !need || datacenterOperational(need.electricity.sufficiency, need.water.sufficiency);
	}).length;
	return { hardware: rows[0]?.quantity ?? 0, datacenters: powered };
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
	/** Stocked computing base behind the cyber and research figures. */
	hardware: number;
	datacenters: number;
}

export async function aiBonuses(db: Db, stateId: number): Promise<AiBonuses> {
	const level = await aiLevel(db, stateId);
	const stocks = await datacenterStocks(db, stateId);
	const cyber = datacenterCyberBonus(stocks.hardware, stocks.datacenters);
	return {
		level,
		label: aiLevelSpec(level).label,
		production: aiProductionFactor(level),
		recon: aiReconBonus(level),
		cyberOffence: aiCyberOffence(level) + cyber.offence,
		cyberDefence: aiCyberDefence(level) + cyber.defence,
		detection: aiDetectionBonus(level),
		researchPerDay: aiLevelSpec(level).researchPerDay + datacenterResearch(stocks.hardware, stocks.datacenters),
		hardware: stocks.hardware,
		datacenters: stocks.datacenters
	};
}

export interface AiUpgradeResult {
	level: number;
	label: string;
	cost: number;
	chips: number;
	rareEarth: number;
	hardware: number;
	datacenters: number;
}

/**
 * Raise the state's AI capability one level. Paid from the treasury and the
 * state's stockpiles; from level three the computing chain is required too —
 * server hardware, and whole datacenters at the top tiers. Throws AiError with
 * a readable reason when it isn't possible.
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

		// The upper tiers run on real computing hardware, not just formulas.
		const [hardware] = await tx
			.select({ quantity: stateProductInventory.quantity })
			.from(stateProductInventory)
			.where(and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "hardware")))
			.for("update");
		if ((hardware?.quantity ?? 0) < next.hardware)
			throw new AiError(
				`The state needs ${next.hardware} server hardware in its stockpile. Build a fabrication line making hardware first.`
			);
		if (next.datacenters > 0) {
			const sites = await tx
				.select({ id: stateBuildings.id })
				.from(stateBuildings)
				.where(
					and(
						eq(stateBuildings.stateId, authority.stateId),
						eq(stateBuildings.buildingType, "datacenter"),
						eq(stateBuildings.isUnderConstruction, false)
					)
				);
			if (sites.length < next.datacenters)
				throw new AiError(
					`The state needs ${next.datacenters} built datacenter${next.datacenters === 1 ? "" : "s"}. Datacenters are constructed by law from server hardware, not traded.`
				);
		}

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
		if (next.hardware > 0) {
			await tx
				.update(stateProductInventory)
				.set({ quantity: sql`${stateProductInventory.quantity} - ${next.hardware}`, updatedAt: new Date() })
				.where(and(eq(stateProductInventory.stateId, authority.stateId), eq(stateProductInventory.productType, "hardware")));
		}
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
