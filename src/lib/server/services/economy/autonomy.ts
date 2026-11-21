// src/lib/server/services/economy/autonomy.ts
// Where a state's factories get their inputs, and how much that dependence
// costs. Domestic production and stockpiles are best; bloc partners next;
// paid trade lanes next (and they suffer when a blockade or closure throttles
// the route); goods nobody can supply leave a line running far below capacity.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import {
	factories,
	stateProductInventory,
	stateResourceInventory,
	regions,
	states,
	tradeLanes
} from "../../schema";
import {
	SOURCING,
	STRATEGIC_INPUTS,
	autonomyScore,
	combinedSourcingFactor,
	sourcingFactor,
	type SourcingTier,
	type StrategicInput
} from "#lib/config/index.js";
import { tradeFactors } from "./trade";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const RESOURCE_INPUTS = ["steel", "gunpowder", "coal", "iron", "copper", "wood", "oil", "gas", "uranium", "rare_earth", "silicon", "fuel", "enriched_uranium"];
const PRODUCT_INPUTS = ["rifles", "ammunition", "artillery", "vehicles", "explosives", "chips", "electronics", "machine_tools", "fab_equipment"];
const isResourceInput = (input: string) => RESOURCE_INPUTS.includes(input);
const isKnownInput = (input: string) => isResourceInput(input) || PRODUCT_INPUTS.includes(input);

/** Stock of one input in a state's strategic stockpile. */
export async function stateStockOf(db: Db, stateId: number, input: string): Promise<number> {
	if (!isKnownInput(input)) return 0;
	const isResource = isResourceInput(input);
	const rows = isResource
		? await db
				.select({ quantity: stateResourceInventory.quantity })
				.from(stateResourceInventory)
				.where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, input as never)))
		: await db
				.select({ quantity: stateProductInventory.quantity })
				.from(stateProductInventory)
				.where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, input as never)));
	return rows[0]?.quantity ?? 0;
}

/** States whose stockpiles count as bloc support. */
export async function blocPartnersOf(db: Db, stateId: number): Promise<number[]> {
	const [state] = await db.select({ blocId: states.blocId }).from(states).where(eq(states.id, stateId));
	if (!state?.blocId) return [];
	const partners = await db.select({ id: states.id }).from(states).where(eq(states.blocId, state.blocId));
	return partners.map((p) => p.id).filter((id) => id !== stateId);
}

/** Partner states with an active trade lane. */
export async function lanePartnersOf(db: Db, stateId: number): Promise<number[]> {
	const lanes = await db.select({ partnerStateId: tradeLanes.partnerStateId }).from(tradeLanes).where(and(eq(tradeLanes.stateId, stateId), eq(tradeLanes.active, true)));
	return [...new Set(lanes.map((l) => l.partnerStateId))];
}

/** Does the state itself produce this input? */
export async function producesInput(db: Db, stateId: number, input: string): Promise<boolean> {
	if (!isKnownInput(input)) return false;
	if (isResourceInput(input)) {
		const [row] = await db
			.select({ id: factories.id })
			.from(factories)
			.innerJoin(regions, eq(factories.regionId, regions.id))
			.where(and(eq(regions.stateId, stateId), eq(factories.resourceOutput, input as never)))
			.limit(1);
		return !!row;
	}
	const [row] = await db
		.select({ id: factories.id })
		.from(factories)
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.where(and(eq(regions.stateId, stateId), eq(factories.productOutput, input as never)))
		.limit(1);
	return !!row;
}

export interface InputSource {
	input: string;
	tier: SourcingTier;
	factor: number;
}

export interface FactorySourcing {
	sources: InputSource[];
	factor: number;
	missing: string[];
	label: string;
}

/**
 * Work out how a factory's recipe inputs are sourced, and the resulting
 * output multiplier. Trade-tier inputs inherit the current air/sea trade flow,
 * so a blockade or closure is felt immediately on the shop floor.
 */
export async function factorySourcing(db: Db, stateId: number, inputs: string[], now = new Date()): Promise<FactorySourcing> {
	if (!inputs.length) return { sources: [], factor: 1, missing: [], label: "No external inputs" };
	const [bloc, lanes, flow] = await Promise.all([
		blocPartnersOf(db, stateId),
		lanePartnersOf(db, stateId),
		tradeFactors(db, stateId, now)
	]);
	const tradeFlow = Math.min(flow.air, flow.sea);
	const sources: InputSource[] = [];
	for (const input of inputs) {
		const own = await stateStockOf(db, stateId, input);
		const domestic = own > 0 || (await producesInput(db, stateId, input));
		let tier: SourcingTier = "shortage";
		if (domestic) tier = "domestic";
		else {
			const blocStock = await Promise.all(bloc.map((id) => stateStockOf(db, id, input)));
			if (blocStock.some((n) => n > 0)) tier = "bloc";
			else {
				const laneStock = await Promise.all(lanes.map((id) => stateStockOf(db, id, input)));
				if (laneStock.some((n) => n > 0)) tier = "trade";
			}
		}
		sources.push({ input, tier, factor: sourcingFactor(tier, tradeFlow) });
	}
	const factor = combinedSourcingFactor(sources.map((s) => s.factor));
	const missing = sources.filter((s) => s.tier === "shortage").map((s) => s.input);
	const worst = sources.reduce((a, b) => (a.factor <= b.factor ? a : b));
	return { sources, factor, missing, label: SOURCING[worst.tier].label };
}

/** How autonomous is a state's strategic input base? */
export async function stateAutonomy(db: Db, stateId: number) {
	const inputs: StrategicInput[] = [...STRATEGIC_INPUTS];
	const [bloc, lanes] = await Promise.all([blocPartnersOf(db, stateId), lanePartnersOf(db, stateId)]);
	let domestic = 0;
	let blocCount = 0;
	let tradeCount = 0;
	for (const input of inputs) {
		const own = await stateStockOf(db, stateId, input);
		if (own > 0 || (await producesInput(db, stateId, input))) {
			domestic++;
			continue;
		}
		const partners = await Promise.all(bloc.map((id) => stateStockOf(db, id, input)));
		if (partners.some((n) => n > 0)) {
			blocCount++;
			continue;
		}
		const laneStock = await Promise.all(lanes.map((id) => stateStockOf(db, id, input)));
		if (laneStock.some((n) => n > 0)) tradeCount++;
	}
	return {
		score: autonomyScore(domestic, inputs.length),
		domestic,
		bloc: blocCount,
		trade: tradeCount,
		shortage: inputs.length - domestic - blocCount - tradeCount,
		total: inputs.length
	};
}
