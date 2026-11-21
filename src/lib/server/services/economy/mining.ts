// src/lib/server/services/economy/mining.ts
// Extracting resources from a region's deposit for one mine shift.
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { regionDeposits, regions, states } from "../../schema";
import {
	DEFAULT_EXPLOITATION_POLICY,
	mineYield,
	type ExploitationPolicy,
	type MineableResource
} from "#lib/config/index.js";

type Executor = Pick<Database, "select" | "update">;

export interface Extraction {
	produced: number;
	depleted: number;
	/** What is left in the deposit after this shift (0 when there is none). */
	remaining: number;
	capacity: number;
	policy: ExploitationPolicy;
}

/** The exploitation law in force where a region lies (standard when no state owns it). */
export async function regionPolicy(db: Executor, regionId: number): Promise<ExploitationPolicy> {
	const [row] = await db
		.select({ policy: states.exploitationPolicy })
		.from(regions)
		.leftJoin(states, eq(regions.stateId, states.id))
		.where(eq(regions.id, regionId));
	return row?.policy ?? DEFAULT_EXPLOITATION_POLICY;
}

/**
 * Mine one shift's worth from the region's deposit. Pass the open transaction:
 * the deposit row is locked, so concurrent shifts in the same region queue up
 * instead of over-drawing it.
 */
export async function extractFromDeposit(
	tx: Executor,
	regionId: number,
	resource: MineableResource,
	baseRate: number
): Promise<Extraction> {
	const policy = await regionPolicy(tx, regionId);
	const [deposit] = await tx
		.select()
		.from(regionDeposits)
		.where(and(eq(regionDeposits.regionId, regionId), eq(regionDeposits.resourceType, resource)))
		.for("update");
	if (!deposit) return { produced: 0, depleted: 0, remaining: 0, capacity: 0, policy };

	const { produced, depleted } = mineYield(baseRate, policy, deposit.capacity, deposit.remaining);
	if (depleted <= 0)
		return { produced: 0, depleted: 0, remaining: deposit.remaining, capacity: deposit.capacity, policy };

	const [after] = await tx
		.update(regionDeposits)
		.set({ remaining: sql`${regionDeposits.remaining} - ${depleted}`, updatedAt: new Date() })
		.where(and(eq(regionDeposits.id, deposit.id), gte(regionDeposits.remaining, depleted)))
		.returning({ remaining: regionDeposits.remaining });
	if (!after) return { produced: 0, depleted: 0, remaining: deposit.remaining, capacity: deposit.capacity, policy };

	return { produced, depleted, remaining: after.remaining, capacity: deposit.capacity, policy };
}

export const isMineable = (r: string | null | undefined): r is MineableResource =>
	r === "iron" ||
	r === "copper" ||
	r === "coal" ||
	r === "wood" ||
	r === "oil" ||
	r === "gas" ||
	r === "uranium" ||
	r === "rare_earth" ||
	r === "silicon";
