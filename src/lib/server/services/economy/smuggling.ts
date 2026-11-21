// src/lib/server/services/economy/smuggling.ts
// Shadow trade against the database: opening a smuggling route as a state,
// running cargo along it as a citizen, and the odds/payouts in between.
//
// A route is a state-to-state arrangement. Citizens of either state move
// goods they already own along it; every run risks interception by customs,
// an enemy blockade or AI-assisted detection. Delivered cargo pays a premium;
// a seized run loses the cargo and pays a fine.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	presidents,
	productInventory,
	resourceInventory,
	residences,
	regions,
	smugglingRoutes,
	smugglingRuns,
	stateSanctions,
	stateTreasury,
	states,
	transactionHistory,
	userWallets,
	type SmugglingRoute
} from "../../schema";
import {
	SMUGGLING,
	SMUGGLING_GOODS,
	maxCargo,
	smuggleFine,
	smuggleInterceptChance,
	smugglePayout,
	type SmugglingGood
} from "#lib/config/index.js";
import { blockadeStrengthOn, seaControlOf } from "../military/naval";
import { aiLevel } from "../military/ai";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

export class SmugglingError extends Error {}

export type SmugglingRole = "president" | "foreign_affairs";
export const SMUGGLING_ROLE_LABEL: Record<SmugglingRole, string> = {
	president: "President",
	foreign_affairs: "Foreign Minister"
};

export async function smugglingAuthority(db: Db, userId: string): Promise<{ stateId: number; role: SmugglingRole } | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId })
		.from(ministers)
		.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "foreign_affairs")))
		.limit(1);
	return minister ? { stateId: minister.stateId, role: "foreign_affairs" } : null;
}

/** Whether either state sanctions the other (which makes the route profitable). */
export async function sanctionsBetween(db: Db, a: number, b: number): Promise<boolean> {
	const [row] = await db
		.select({ id: stateSanctions.id })
		.from(stateSanctions)
		.where(
			and(
				eq(stateSanctions.isActive, true),
				or(
					and(eq(stateSanctions.sanctioningStateId, a), eq(stateSanctions.targetStateId, b)),
					and(eq(stateSanctions.sanctioningStateId, b), eq(stateSanctions.targetStateId, a))
				)
			)
		)
		.limit(1);
	return !!row;
}

export interface OpenRouteInput {
	stateId: number;
	openedBy: string;
	targetStateId: number;
	good: SmugglingGood;
}

export interface OpenRouteResult {
	routeId: number;
	risk: number;
	premium: number;
}

/**
 * Open a smuggling route from the state to another. Costs treasury; the risk
 * is fixed at opening from the destination's enforcement, AI and any
 * blockade, so the planner can show it before the player commits.
 */
export async function openSmugglingRoute(db: Database, input: OpenRouteInput): Promise<OpenRouteResult> {
	if (input.stateId === input.targetStateId) throw new SmugglingError("A state can't smuggle to itself.");
	if (!SMUGGLING_GOODS[input.good]) throw new SmugglingError("Unknown good.");
	return db.transaction(async (tx) => {
		const [[origin], [target]] = await Promise.all([
			tx.select({ name: states.name }).from(states).where(eq(states.id, input.stateId)),
			tx.select({ name: states.name }).from(states).where(eq(states.id, input.targetStateId))
		]);
		if (!origin || !target) throw new SmugglingError("That state doesn't exist.");

		const [existing] = await tx
			.select({ id: smugglingRoutes.id })
			.from(smugglingRoutes)
			.where(
				and(
					eq(smugglingRoutes.originStateId, input.stateId),
					eq(smugglingRoutes.targetStateId, input.targetStateId),
					eq(smugglingRoutes.good, input.good as never),
					eq(smugglingRoutes.active, true)
				)
			)
			.limit(1);
		if (existing) throw new SmugglingError("That route is already open.");

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < SMUGGLING.ROUTE_COST)
			throw new SmugglingError(`The treasury needs ${SMUGGLING.ROUTE_COST.toLocaleString()} to open a route.`);

		const sanctioned = await sanctionsBetween(tx, input.stateId, input.targetStateId);
		const blockaded = (await blockadeStrengthOn(tx, input.targetStateId)) > 0;
		const enforcement = await aiLevel(tx, input.targetStateId);
		const seaControl = await seaControlOf(tx, input.targetStateId);
		const risk = smuggleInterceptChance({
			bulk: SMUGGLING_GOODS[input.good].bulk,
			sanctioned,
			blockaded,
			enforcement,
			aiLevel: enforcement,
			seaControl
		});

		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${SMUGGLING.ROUTE_COST}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${SMUGGLING.ROUTE_COST}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, input.stateId));

		const [route] = await tx
			.insert(smugglingRoutes)
			.values({
				originStateId: input.stateId,
				targetStateId: input.targetStateId,
				good: input.good as never,
				risk: Math.round(risk * 100),
				openedBy: input.openedBy
			})
			.returning({ id: smugglingRoutes.id });

		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "smuggling_route",
			amount: SMUGGLING.ROUTE_COST,
			balanceAfter: Number(treasury.balance) - SMUGGLING.ROUTE_COST,
			description: `Opened a smuggling route for ${SMUGGLING_GOODS[input.good].label.toLowerCase()} to ${target.name}`,
			authorizedBy: input.openedBy
		});

		const premium = smugglePayout(input.good, 1, sanctioned, blockaded);
		return { routeId: route.id, risk: Math.round(risk * 100), premium };
	});
}

/** Active routes a player's state can use, with the names resolved by the caller. */
export async function routesForState(db: Db, stateId: number): Promise<SmugglingRoute[]> {
	return db
		.select()
		.from(smugglingRoutes)
		.where(and(eq(smugglingRoutes.active, true), or(eq(smugglingRoutes.originStateId, stateId), eq(smugglingRoutes.targetStateId, stateId))))
		.orderBy(desc(smugglingRoutes.createdAt));
}

export interface RunInput {
	userId: string;
	routeId: number;
	quantity: number;
	rng?: () => number;
	now?: Date;
}

export interface RunResult {
	runId: number;
	outcome: "delivered" | "seized" | "lost";
	payout: number;
	fine: number;
	risk: number;
	message: string;
}

/**
 * Run cargo along a route: take the goods from the player's inventory, roll
 * interception, pay or fine them, and log the run. Throws SmugglingError when
 * the run isn't possible.
 */
export async function runSmuggling(db: Database, input: RunInput): Promise<RunResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const quantity = Math.floor(input.quantity);
	if (!Number.isInteger(quantity) || quantity <= 0) throw new SmugglingError("Choose a positive quantity.");

	return db.transaction(async (tx) => {
		const [route] = await tx
			.select()
			.from(smugglingRoutes)
			.where(and(eq(smugglingRoutes.id, input.routeId), eq(smugglingRoutes.active, true)))
			.for("update");
		if (!route) throw new SmugglingError("That route is closed.");

		// The runner must live in one of the two states.
		const [home] = await tx
			.select({ stateId: regions.stateId })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, input.userId))
			.limit(1);
		const stateId = home?.stateId ?? null;
		if (!stateId || (stateId !== route.originStateId && stateId !== route.targetStateId))
			throw new SmugglingError("You must live in one of the two states to run this route.");

		const good = route.good as SmugglingGood;
		const spec = SMUGGLING_GOODS[good];
		if (!spec) throw new SmugglingError("Unknown good on this route.");
		const cap = maxCargo(good);
		if (quantity > cap) throw new SmugglingError(`This route moves at most ${cap} units of ${spec.label.toLowerCase()} per run.`);

		// Cooldown.
		const [recent] = await tx
			.select({ id: smugglingRuns.id })
			.from(smugglingRuns)
			.where(
				and(
					eq(smugglingRuns.userId, input.userId),
					eq(smugglingRuns.routeId, route.id),
					gt(smugglingRuns.createdAt, new Date(now.getTime() - SMUGGLING.RUN_COOLDOWN_HOURS * HOUR))
				)
			)
			.limit(1);
		if (recent) throw new SmugglingError("You ran this route too recently. Wait a couple of hours.");

		// Take the goods.
		if (spec.kind === "resource") {
			const [inv] = await tx
				.select({ quantity: resourceInventory.quantity })
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, input.userId), eq(resourceInventory.resourceType, good as never)))
				.for("update");
			if ((inv?.quantity ?? 0) < quantity)
				throw new SmugglingError(`You only have ${inv?.quantity ?? 0} ${spec.label.toLowerCase()}.`);
			await tx
				.update(resourceInventory)
				.set({ quantity: sql`${resourceInventory.quantity} - ${quantity}`, updatedAt: now })
				.where(and(eq(resourceInventory.userId, input.userId), eq(resourceInventory.resourceType, good as never)));
		} else {
			const [inv] = await tx
				.select({ quantity: productInventory.quantity })
				.from(productInventory)
				.where(and(eq(productInventory.userId, input.userId), eq(productInventory.productType, good as never)))
				.for("update");
			if ((inv?.quantity ?? 0) < quantity)
				throw new SmugglingError(`You only have ${inv?.quantity ?? 0} ${spec.label.toLowerCase()}.`);
			await tx
				.update(productInventory)
				.set({ quantity: sql`${productInventory.quantity} - ${quantity}`, updatedAt: now })
				.where(and(eq(productInventory.userId, input.userId), eq(productInventory.productType, good as never)));
		}

		const sanctioned = await sanctionsBetween(tx, route.originStateId, route.targetStateId);
		const blockaded = (await blockadeStrengthOn(tx, route.targetStateId, now)) > 0;
		const enforcement = await aiLevel(tx, route.targetStateId);
		const seaControl = await seaControlOf(tx, route.targetStateId);
		const risk = smuggleInterceptChance({
			bulk: spec.bulk,
			sanctioned,
			blockaded,
			enforcement,
			aiLevel: enforcement,
			seaControl
		});

		const intercepted = rng() < risk;
		// A caught run may still vanish rather than be seized, depending on the navy.
		const outcome: RunResult["outcome"] = intercepted ? (rng() < 0.6 ? "seized" : "lost") : "delivered";
		let payout = 0;
		let fine = 0;
		let message: string;
		if (outcome === "delivered") {
			payout = smugglePayout(good, quantity, sanctioned, blockaded);
			await tx
				.insert(userWallets)
				.values({ userId: input.userId, balance: payout })
				.onConflictDoUpdate({
					target: userWallets.userId,
					set: { balance: sql`${userWallets.balance} + ${payout}`, updatedAt: now }
				});
			message = `Delivered ${quantity} ${spec.label.toLowerCase()} for ${payout.toLocaleString()}.`;
		} else if (outcome === "seized") {
			fine = smuggleFine(good, quantity);
			await tx
				.update(userWallets)
				.set({ balance: sql`greatest(0, ${userWallets.balance} - ${fine})`, updatedAt: now })
				.where(eq(userWallets.userId, input.userId));
			message = `Cargo seized: the ${quantity} ${spec.label.toLowerCase()} are gone and the fine is ${fine.toLocaleString()}.`;
		} else {
			message = `The cargo vanished at sea: ${quantity} ${spec.label.toLowerCase()} lost, no fine.`;
		}

		const [wallet] = await tx.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, input.userId));
		await tx.insert(transactionHistory).values({
			userId: input.userId,
			transactionType: outcome === "seized" ? "smuggling_fine" : "smuggling_run",
			amount: outcome === "seized" ? -fine : payout,
			balanceAfter: Number(wallet?.balance ?? 0),
			description: `Smuggling ${quantity} ${spec.label.toLowerCase()} (${outcome})`,
			relatedEntityType: "smuggling_route",
			relatedEntityId: route.id
		});

		const [run] = await tx
			.insert(smugglingRuns)
			.values({
				routeId: route.id,
				userId: input.userId,
				good: good as never,
				quantity,
				outcome,
				payout,
				fine,
				risk: Math.round(risk * 100),
				createdAt: now
			})
			.returning({ id: smugglingRuns.id });

		return { runId: run.id, outcome, payout, fine, risk: Math.round(risk * 100), message };
	});
}

/** A player's recent runs. */
export async function runsByUser(db: Db, userId: string, limit = 30) {
	return db
		.select()
		.from(smugglingRuns)
		.where(eq(smugglingRuns.userId, userId))
		.orderBy(desc(smugglingRuns.createdAt))
		.limit(limit);
}
