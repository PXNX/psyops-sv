// src/lib/server/services/economy/armaments.ts
// The arms market. Hardware moved to a state outside the seller's bloc stays
// pending until the seller's defence minister (or president) approves it.
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	accounts,
	armsListings,
	presidents,
	ministers,
	productInventory,
	regions,
	residences,
	stateTreasury,
	states,
	userWallets
} from "../../schema";
import { ARMAMENTS, armamentValue, isArmament } from "#lib/config/index.js";

export class ArmsError extends Error {}

type EmbargoCheck = (stateId: number | null, userId: string) => Promise<string | null>;
const defaultEmbargoCheck: EmbargoCheck = async (stateId, userId) =>
	(await import("#lib/server/embargo.js")).getEmbargoReason(stateId, userId);

/** President or defence minister of the seller's state. */
export async function armsAuthority(db: Database, userId: string, stateId: number) {
	const [row] = await db
		.select({ id: presidents.id })
		.from(presidents)
		.where(and(eq(presidents.userId, userId), eq(presidents.stateId, stateId)))
		.limit(1);
	if (row) return "president" as const;
	const [ministry] = await db
		.select({ id: ministers.id })
		.from(ministers)
		.where(
			and(
				eq(ministers.userId, userId),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, ARMAMENTS.APPROVING_MINISTRY)
			)
		)
		.limit(1);
	return ministry ? ("defense" as const) : null;
}

/** State a player currently resides in. */
export async function residenceState(db: Database, userId: string): Promise<number | null> {
	const [row] = await db
		.select({ stateId: regions.stateId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, userId))
		.limit(1);
	return row?.stateId ?? null;
}

/** Whether a sale needs a minister's sign-off: outside the seller's bloc. */
export async function needsApproval(db: Database, sellerStateId: number | null, targetStateId: number | null) {
	if (!sellerStateId || !targetStateId || sellerStateId === targetStateId) return false;
	const rows = await db
		.select({ id: states.id, blocId: states.blocId })
		.from(states)
		.where(eq(states.id, sellerStateId));
	const [target] = await db
		.select({ blocId: states.blocId })
		.from(states)
		.where(eq(states.id, targetStateId))
		.limit(1);
	if (!target) throw new ArmsError("That state does not exist.");
	const seller = rows.find((r) => r.id === sellerStateId);
	return !(seller?.blocId && target.blocId && seller.blocId === target.blocId);
}

/** Open an arms offer; units leave the seller's stock into escrow. */
export async function listArms(
	db: Database,
	{
		userId,
		good,
		quantity,
		pricePerUnit,
		targetStateId = null,
		now = new Date()
	}: {
		userId: string;
		good: string;
		quantity: number;
		pricePerUnit: number;
		targetStateId?: number | null;
		now?: Date;
	}
) {
	if (!isArmament(good)) throw new ArmsError("That good is not an armament.");
	if (!Number.isSafeInteger(quantity) || quantity < ARMAMENTS.MIN_QUANTITY || quantity > ARMAMENTS.MAX_QUANTITY) {
		throw new ArmsError("Invalid quantity.");
	}
	if (!Number.isSafeInteger(pricePerUnit) || pricePerUnit < 1) throw new ArmsError("Invalid price.");
	const sellerStateId = await residenceState(db, userId);
	const external = await needsApproval(db, sellerStateId, targetStateId);

	return db.transaction(async (tx) => {
		const [held] = await tx
			.select()
			.from(productInventory)
			.where(and(eq(productInventory.userId, userId), eq(productInventory.productType, good as never)))
			.limit(1);
		if (!held || held.quantity < quantity) throw new ArmsError("You do not hold enough of that armament.");
		await tx
			.update(productInventory)
			.set({ quantity: sql`${productInventory.quantity} - ${quantity}` })
			.where(eq(productInventory.id, held.id));
		const [listing] = await tx
			.insert(armsListings)
			.values({
				sellerId: userId,
				sellerStateId,
				good,
				quantity,
				pricePerUnit,
				targetStateId,
				approvedBy: external ? null : userId,
				createdAt: now
			})
			.returning();
		return listing!;
	});
}

/** Sign off on an external arms sale. */
export async function approveArms(db: Database, userId: string, listingId: number) {
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing) throw new ArmsError("Offer not found.");
	if (!(await armsAuthority(db, userId, listing.sellerStateId ?? 0))) {
		throw new ArmsError("Only the seller's defence minister or president can approve arms sales.");
	}
	if (listing.rejected || listing.approvedBy) throw new ArmsError("That offer is already settled.");
	await db.update(armsListings).set({ approvedBy: userId }).where(eq(armsListings.id, listingId));
}

/** Refuse an external arms sale, returning the units to the seller. */
export async function rejectArms(db: Database, userId: string, listingId: number) {
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing) throw new ArmsError("Offer not found.");
	if (!(await armsAuthority(db, userId, listing.sellerStateId ?? 0))) {
		throw new ArmsError("Only the seller's defence minister or president can reject arms sales.");
	}
	if (listing.rejected || listing.approvedBy) throw new ArmsError("That offer is already settled.");
	await db.transaction(async (tx) => {
		await tx
			.insert(productInventory)
			.values({ userId: listing.sellerId, productType: listing.good as never, quantity: listing.quantity })
			.onConflictDoUpdate({
				target: [productInventory.userId, productInventory.productType],
				set: { quantity: sql`${productInventory.quantity} + ${listing.quantity}` }
			});
		await tx.update(armsListings).set({ rejected: true }).where(eq(armsListings.id, listingId));
	});
}

/** Withdraw your own offer before it sells. */
export async function cancelArms(db: Database, userId: string, listingId: number) {
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing) throw new ArmsError("Offer not found.");
	if (listing.sellerId !== userId) throw new ArmsError("Not your offer.");
	if (listing.approvedBy && listing.approvedBy !== userId) throw new ArmsError("This offer has been approved and cannot be withdrawn.");
	await db.transaction(async (tx) => {
		await tx
			.insert(productInventory)
			.values({ userId, productType: listing.good as never, quantity: listing.quantity })
			.onConflictDoUpdate({
				target: [productInventory.userId, productInventory.productType],
				set: { quantity: sql`${productInventory.quantity} + ${listing.quantity}` }
			});
		await tx.delete(armsListings).where(eq(armsListings.id, listingId));
	});
}

/** Buy an offer. An external sale can only proceed once approved. */
export async function buyArms(
	db: Database,
	{
		userId,
		listingId,
		quantity,
		checkEmbargo = defaultEmbargoCheck
	}: { userId: string; listingId: number; quantity: number; checkEmbargo?: EmbargoCheck }
) {
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing || listing.rejected) throw new ArmsError("Offer not found.");
	if (listing.sellerId === userId) throw new ArmsError("Cannot buy your own offer.");
	if (!listing.approvedBy) throw new ArmsError("This sale is awaiting ministerial approval.");
	if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > listing.quantity) throw new ArmsError("Invalid quantity.");
	const external = await needsApproval(db, listing.sellerStateId, listing.targetStateId);
	if (external && listing.targetStateId) {
		const buyerState = await residenceState(db, userId);
		if (buyerState !== listing.targetStateId) throw new ArmsError("This offer is reserved for its target state.");
	}
	const reason = await checkEmbargo(listing.sellerStateId, userId);
	if (reason) throw new ArmsError(reason);

	const total = quantity * listing.pricePerUnit;
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId));
	if (!wallet || Number(wallet.balance) < total) throw new ArmsError("Insufficient funds.");

	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(armsListings)
			.set({ quantity: listing.quantity - quantity })
			.where(and(eq(armsListings.id, listingId), eq(armsListings.quantity, listing.quantity)))
			.returning({ id: armsListings.id });
		if (!claimed) throw new ArmsError("That offer has just changed.");

		await tx
			.update(userWallets)
			.set({ balance: Number(wallet.balance) - total, updatedAt: new Date() })
			.where(eq(userWallets.userId, userId));
		await tx
			.insert(userWallets)
			.values({ userId: listing.sellerId, balance: total })
			.onConflictDoUpdate({
				target: userWallets.userId,
				set: { balance: sql`${userWallets.balance} + ${total}`, updatedAt: new Date() }
			});
		await tx
			.insert(productInventory)
			.values({ userId, productType: listing.good as never, quantity })
			.onConflictDoUpdate({
				target: [productInventory.userId, productInventory.productType],
				set: { quantity: sql`${productInventory.quantity} + ${quantity}` }
			});

		// An approved external sale pays an export levy to the seller's state.
		if (external && listing.sellerStateId) {
			const tax = Math.floor((total * ARMAMENTS.EXPORT_TAX_PERCENT) / 100);
			if (tax > 0) {
				await tx
					.insert(stateTreasury)
					.values({ stateId: listing.sellerStateId, balance: tax, totalCollected: tax, totalSpent: 0 })
					.onConflictDoUpdate({
						target: stateTreasury.stateId,
						set: {
							balance: sql`${stateTreasury.balance} + ${tax}`,
							totalCollected: sql`${stateTreasury.totalCollected} + ${tax}`
						}
					});
			}
		}
		if (quantity === listing.quantity) await tx.delete(armsListings).where(eq(armsListings.id, listingId));
		return { total, tax: external ? Math.floor((total * ARMAMENTS.EXPORT_TAX_PERCENT) / 100) : 0 };
	});
}

/** Board data: all live offers plus pending approvals for the local minister. */
export async function armsBoard(db: Database, userId: string, stateId: number | null) {
	const offers = await db
		.select({
			id: armsListings.id,
			sellerId: armsListings.sellerId,
			sellerName: accounts.email,
			good: armsListings.good,
			quantity: armsListings.quantity,
			pricePerUnit: armsListings.pricePerUnit,
			targetStateId: armsListings.targetStateId,
			approvedBy: armsListings.approvedBy,
			createdAt: armsListings.createdAt
		})
		.from(armsListings)
		.leftJoin(accounts, eq(armsListings.sellerId, accounts.id))
		.where(isNull(armsListings.rejected))
		.orderBy(armsListings.createdAt);
	const names = new Map(
		(await db.select({ id: states.id, name: states.name, blocId: states.blocId }).from(states)).map((s) => [s.id, s])
	);
	const authority = stateId ? await armsAuthority(db, userId, stateId) : null;
	const held = new Map(
		(await db.select().from(productInventory).where(eq(productInventory.userId, userId))).map((p) => [p.productType, p.quantity])
	);
	return {
		viewerId: userId,
		offers: offers.map((o) => ({
			...o,
			targetName: o.targetStateId ? (names.get(o.targetStateId)?.name ?? "—") : "Anyone",
			external: !!o.targetStateId && o.targetStateId !== stateId,
			pending: !o.approvedBy,
			held: held.get(o.good as never) ?? 0,
			value: armamentValue(o.good)
		})),
		canApprove: authority === "defense" || authority === "president",
		authority
	};
}
