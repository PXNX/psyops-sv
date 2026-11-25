// src/lib/server/services/economy/armaments.ts
// The arms market. See armaments.config.ts for the rules: export licences for
// sales beyond the bloc, sanctions and embargoes, delivery times, guide prices
// from supply and demand, and the condition of second-hand hardware.
// No SvelteKit virtual modules here (tests import this file).
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	armsListings,
	armsSurplus,
	armsTrades,
	blocEmbargoes,
	ministers,
	presidents,
	productInventory,
	regions,
	residences,
	stateSanctions,
	stateTreasury,
	states,
	userProfiles,
	userWallets
} from "../../schema";
import {
	ARMAMENT_GOODS,
	ARMAMENTS,
	armamentValue,
	armsRoute,
	blendCondition,
	deliveryHours,
	guidePrice,
	isArmament,
	levyPercent,
	priceBand,
	wornCondition,
	type ArmsRoute
} from "#lib/config/index.js";

export class ArmsError extends Error {}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;
const HOUR = 3_600_000;

/** President or defence minister of a state. */
export async function armsAuthority(db: Db, userId: string, stateId: number) {
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
export async function residenceState(db: Db, userId: string): Promise<number | null> {
	const [row] = await db
		.select({ stateId: regions.stateId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, userId))
		.limit(1);
	return row?.stateId ?? null;
}

async function stateBloc(db: Db, stateId: number | null) {
	if (!stateId) return { stateId: null, blocId: null };
	const [row] = await db.select({ blocId: states.blocId }).from(states).where(eq(states.id, stateId)).limit(1);
	if (!row) throw new ArmsError("That state does not exist.");
	return { stateId, blocId: row.blocId ?? null };
}

/** Route between two states (domestic, inside the bloc or foreign). */
export async function routeBetween(
	db: Db,
	sellerStateId: number | null,
	buyerStateId: number | null
): Promise<ArmsRoute> {
	const [seller, buyer] = await Promise.all([stateBloc(db, sellerStateId), stateBloc(db, buyerStateId)]);
	return armsRoute(seller, buyer);
}

/** Whether a sale needs an export licence: only foreign routes do. */
export async function needsApproval(db: Db, sellerStateId: number | null, targetStateId: number | null) {
	if (!targetStateId) return false;
	return (await routeBetween(db, sellerStateId, targetStateId)) === "foreign";
}

/** Why trade between two states is blocked (sanction or bloc embargo), or null. */
export async function armsEmbargo(db: Db, a: number | null, b: number | null): Promise<string | null> {
	if (!a || !b || a === b) return null;
	const [sanction] = await db
		.select({ by: stateSanctions.sanctioningStateId })
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
	if (sanction) return "Sanctions between the two states block arms trade.";
	const blocs = await db
		.select({ id: states.id, blocId: states.blocId })
		.from(states)
		.where(inArray(states.id, [a, b]));
	const blocOf = (id: number) => blocs.find((s) => s.id === id)?.blocId ?? null;
	const clauses = [];
	const ba = blocOf(a);
	const bb = blocOf(b);
	if (ba) clauses.push(and(eq(blocEmbargoes.blocId, ba), eq(blocEmbargoes.targetStateId, b)));
	if (bb) clauses.push(and(eq(blocEmbargoes.blocId, bb), eq(blocEmbargoes.targetStateId, a)));
	if (!clauses.length) return null;
	const [embargo] = await db
		.select({ id: blocEmbargoes.id })
		.from(blocEmbargoes)
		.where(or(...clauses))
		.limit(1);
	return embargo ? "A bloc embargo between the two states blocks arms trade." : null;
}

/** Units on offer (licensed or cleared) and units traded in the demand window, per good. */
export async function marketPressure(db: Db, now = new Date()) {
	const since = new Date(now.getTime() - ARMAMENTS.DEMAND_WINDOW_HOURS * HOUR);
	const [supplyRows, demandRows] = await Promise.all([
		db
			.select({ good: armsListings.good, units: sql<number>`coalesce(sum(${armsListings.quantity}), 0)` })
			.from(armsListings)
			.where(and(eq(armsListings.rejected, false), isNotNull(armsListings.approvedBy)))
			.groupBy(armsListings.good),
		db
			.select({ good: armsTrades.good, units: sql<number>`coalesce(sum(${armsTrades.quantity}), 0)` })
			.from(armsTrades)
			.where(gte(armsTrades.createdAt, since))
			.groupBy(armsTrades.good)
	]);
	const supply = new Map(supplyRows.map((r) => [r.good, Number(r.units)]));
	const demand = new Map(demandRows.map((r) => [r.good, Number(r.units)]));
	return (good: string) => ({ supply: supply.get(good) ?? 0, demand: demand.get(good) ?? 0 });
}

/** A player's stock of one armament, split into factory-fresh and second-hand units. */
export async function armsHolding(db: Db, userId: string, good: string) {
	const [held] = await db
		.select({ id: productInventory.id, quantity: productInventory.quantity })
		.from(productInventory)
		.where(and(eq(productInventory.userId, userId), eq(productInventory.productType, good as never)))
		.limit(1);
	const [surplus] = await db
		.select()
		.from(armsSurplus)
		.where(and(eq(armsSurplus.userId, userId), eq(armsSurplus.good, good)))
		.limit(1);
	const total = held?.quantity ?? 0;
	// Stock used elsewhere is not tracked per batch: the second-hand share can
	// never exceed what is actually held.
	const used = Math.min(total, surplus?.quantity ?? 0);
	return {
		inventoryId: held?.id ?? null,
		total,
		fresh: total - used,
		used,
		usedCondition: surplus?.condition ?? ARMAMENTS.NEW_CONDITION
	};
}

/** Put units back into a player's stock, keeping the second-hand share and its condition. */
async function addStock(tx: Db, userId: string, good: string, quantity: number, condition: number) {
	await tx
		.insert(productInventory)
		.values({ userId, productType: good as never, quantity })
		.onConflictDoUpdate({
			target: [productInventory.userId, productInventory.productType],
			set: { quantity: sql`${productInventory.quantity} + ${quantity}` }
		});
	if (condition >= ARMAMENTS.NEW_CONDITION) return;
	const [row] = await tx
		.select()
		.from(armsSurplus)
		.where(and(eq(armsSurplus.userId, userId), eq(armsSurplus.good, good)))
		.limit(1);
	if (!row) {
		await tx.insert(armsSurplus).values({ userId, good, quantity, condition });
		return;
	}
	await tx
		.update(armsSurplus)
		.set({
			quantity: row.quantity + quantity,
			condition: blendCondition(row.quantity, row.condition, quantity, condition)
		})
		.where(eq(armsSurplus.id, row.id));
}

/** Book every shipment of `userId` that has arrived into their stock. Returns how many landed. */
export async function settleDeliveries(db: Database, userId: string, now = new Date()) {
	const due = await db
		.select()
		.from(armsTrades)
		.where(and(eq(armsTrades.buyerId, userId), isNull(armsTrades.deliveredAt), lte(armsTrades.arrivesAt, now)));
	let landed = 0;
	for (const trade of due) {
		await db.transaction(async (tx) => {
			const [claimed] = await tx
				.update(armsTrades)
				.set({ deliveredAt: now })
				.where(and(eq(armsTrades.id, trade.id), isNull(armsTrades.deliveredAt)))
				.returning({ id: armsTrades.id });
			if (!claimed) return;
			// Hardware that changed hands is second-hand from now on.
			await addStock(tx, userId, trade.good, trade.quantity, wornCondition(trade.condition));
			landed++;
		});
	}
	return landed;
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
		grade = "new",
		now = new Date()
	}: {
		userId: string;
		good: string;
		quantity: number;
		pricePerUnit: number;
		targetStateId?: number | null;
		/** Sell factory-fresh stock or second-hand surplus. */
		grade?: "new" | "used";
		now?: Date;
	}
) {
	if (!isArmament(good)) throw new ArmsError("That good is not an armament.");
	if (grade !== "new" && grade !== "used") throw new ArmsError("Choose new or second-hand stock.");
	if (!Number.isSafeInteger(quantity) || quantity < ARMAMENTS.MIN_QUANTITY || quantity > ARMAMENTS.MAX_QUANTITY) {
		throw new ArmsError("Invalid quantity.");
	}
	if (!Number.isSafeInteger(pricePerUnit) || pricePerUnit < 1) throw new ArmsError("Invalid price.");
	if (targetStateId !== null && (!Number.isSafeInteger(targetStateId) || targetStateId < 1)) {
		throw new ArmsError("That state does not exist.");
	}
	const sellerStateId = await residenceState(db, userId);
	if (!sellerStateId) throw new ArmsError("You need a residence to trade arms.");
	const external = await needsApproval(db, sellerStateId, targetStateId);
	if (targetStateId) {
		const blocked = await armsEmbargo(db, sellerStateId, targetStateId);
		if (blocked) throw new ArmsError(blocked);
	}

	const holding = await armsHolding(db, userId, good);
	const condition = grade === "new" ? ARMAMENTS.NEW_CONDITION : holding.usedCondition;
	const pressure = (await marketPressure(db, now))(good);
	const band = priceBand(guidePrice(good, pressure.demand, pressure.supply, condition));
	if (pricePerUnit < band.min || pricePerUnit > band.max) {
		throw new ArmsError(
			`Price must be between ${band.min.toLocaleString("en-US")} and ${band.max.toLocaleString("en-US")} per unit.`
		);
	}

	return db.transaction(async (tx) => {
		const fresh = await armsHolding(tx, userId, good);
		const available = grade === "new" ? fresh.fresh : fresh.used;
		if (!fresh.inventoryId || available < quantity) {
			throw new ArmsError(
				grade === "new"
					? "You do not hold enough new units of that armament."
					: "You do not hold enough second-hand units of that armament."
			);
		}
		const [taken] = await tx
			.update(productInventory)
			.set({ quantity: sql`${productInventory.quantity} - ${quantity}` })
			.where(and(eq(productInventory.id, fresh.inventoryId), gte(productInventory.quantity, quantity)))
			.returning({ id: productInventory.id });
		if (!taken) throw new ArmsError("Your stock has just changed.");
		if (grade === "used") {
			await tx
				.update(armsSurplus)
				.set({ quantity: fresh.used - quantity })
				.where(and(eq(armsSurplus.userId, userId), eq(armsSurplus.good, good)));
		}
		const [listing] = await tx
			.insert(armsListings)
			.values({
				sellerId: userId,
				sellerStateId,
				good,
				quantity,
				pricePerUnit,
				targetStateId,
				condition,
				approvedBy: external ? null : userId,
				createdAt: now
			})
			.returning();
		return listing!;
	});
}

async function pendingListing(db: Db, userId: string, listingId: number, verb: string) {
	if (!Number.isSafeInteger(listingId)) throw new ArmsError("Offer not found.");
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing || listing.rejected) throw new ArmsError("Offer not found.");
	if (!(await armsAuthority(db, userId, listing.sellerStateId ?? 0))) {
		throw new ArmsError(`Only the seller's defence minister or president can ${verb} export licences.`);
	}
	if (listing.approvedBy) throw new ArmsError("That offer is already settled.");
	return listing;
}

/** Grant the export licence for a foreign sale. */
export async function approveArms(db: Database, userId: string, listingId: number) {
	const listing = await pendingListing(db, userId, listingId, "grant");
	const blocked = await armsEmbargo(db, listing.sellerStateId, listing.targetStateId);
	if (blocked) throw new ArmsError(blocked);
	const [done] = await db
		.update(armsListings)
		.set({ approvedBy: userId })
		.where(and(eq(armsListings.id, listingId), isNull(armsListings.approvedBy), eq(armsListings.rejected, false)))
		.returning({ id: armsListings.id });
	if (!done) throw new ArmsError("That offer is already settled.");
}

/** Refuse the export licence, returning the units to the seller. */
export async function rejectArms(db: Database, userId: string, listingId: number) {
	const listing = await pendingListing(db, userId, listingId, "refuse");
	await db.transaction(async (tx) => {
		const [done] = await tx
			.update(armsListings)
			.set({ rejected: true })
			.where(and(eq(armsListings.id, listingId), isNull(armsListings.approvedBy), eq(armsListings.rejected, false)))
			.returning({ id: armsListings.id });
		if (!done) throw new ArmsError("That offer is already settled.");
		await addStock(tx, listing.sellerId, listing.good, listing.quantity, listing.condition);
	});
}

/** Withdraw your own offer before it sells. A licensed foreign offer stays committed. */
export async function cancelArms(db: Database, userId: string, listingId: number) {
	if (!Number.isSafeInteger(listingId)) throw new ArmsError("Offer not found.");
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing || listing.rejected) throw new ArmsError("Offer not found.");
	if (listing.sellerId !== userId) throw new ArmsError("Not your offer.");
	if (listing.approvedBy && listing.approvedBy !== userId) {
		throw new ArmsError("This offer holds an export licence and cannot be withdrawn.");
	}
	await db.transaction(async (tx) => {
		const [gone] = await tx
			.delete(armsListings)
			.where(and(eq(armsListings.id, listingId), eq(armsListings.quantity, listing.quantity)))
			.returning({ id: armsListings.id });
		if (!gone) throw new ArmsError("That offer has just changed.");
		await addStock(tx, userId, listing.good, listing.quantity, listing.condition);
	});
}

/** Why `buyer` (in `buyerStateId`) may not buy `listing`, or null when they can. Pure check, no embargo. */
export function buyBlocker(
	listing: { sellerId: string; approvedBy: string | null; rejected: boolean; targetStateId: number | null },
	buyerId: string,
	buyerStateId: number | null,
	route: ArmsRoute
): string | null {
	if (listing.rejected) return "Offer not found.";
	if (listing.sellerId === buyerId) return "Cannot buy your own offer.";
	if (!listing.approvedBy) return "This sale is waiting for its export licence.";
	if (!buyerStateId) return "You need a residence to buy arms.";
	if (listing.targetStateId && listing.targetStateId !== buyerStateId)
		return "This offer is reserved for another state.";
	if (route === "foreign" && listing.targetStateId !== buyerStateId) {
		return "Foreign buyers need an offer licensed for their state.";
	}
	return null;
}

/** Buy from an offer. Money moves now; the hardware ships and arrives later. */
export async function buyArms(
	db: Database,
	{ userId, listingId, quantity, now = new Date() }: { userId: string; listingId: number; quantity: number; now?: Date }
) {
	if (!Number.isSafeInteger(listingId)) throw new ArmsError("Offer not found.");
	const [listing] = await db.select().from(armsListings).where(eq(armsListings.id, listingId));
	if (!listing) throw new ArmsError("Offer not found.");
	if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > listing.quantity)
		throw new ArmsError("Invalid quantity.");
	const buyerStateId = await residenceState(db, userId);
	const route = await routeBetween(db, listing.sellerStateId, buyerStateId);
	const blocker = buyBlocker(listing, userId, buyerStateId, route);
	if (blocker) throw new ArmsError(blocker);
	const blocked = await armsEmbargo(db, listing.sellerStateId, buyerStateId);
	if (blocked) throw new ArmsError(blocked);

	const total = quantity * Number(listing.pricePerUnit);
	if (!Number.isSafeInteger(total) || total < 0) throw new ArmsError("Invalid trade total.");
	const tax = Math.floor((total * levyPercent(route)) / 100);
	const hours = deliveryHours(route, quantity);
	const arrivesAt = new Date(now.getTime() + hours * HOUR);

	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(armsListings)
			.set({ quantity: listing.quantity - quantity })
			.where(and(eq(armsListings.id, listingId), eq(armsListings.quantity, listing.quantity)))
			.returning({ id: armsListings.id });
		if (!claimed) throw new ArmsError("That offer has just changed.");

		const [paid] = await tx
			.update(userWallets)
			.set({ balance: sql`${userWallets.balance} - ${total}`, updatedAt: now })
			.where(and(eq(userWallets.userId, userId), gte(userWallets.balance, total)))
			.returning({ id: userWallets.id });
		if (!paid) throw new ArmsError("Insufficient funds.");
		// The levy comes out of the seller's proceeds.
		const proceeds = total - tax;
		await tx
			.insert(userWallets)
			.values({ userId: listing.sellerId, balance: proceeds })
			.onConflictDoUpdate({
				target: userWallets.userId,
				set: { balance: sql`${userWallets.balance} + ${proceeds}`, updatedAt: now }
			});
		if (tax > 0 && listing.sellerStateId) {
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
		const [trade] = await tx
			.insert(armsTrades)
			.values({
				good: listing.good,
				quantity,
				pricePerUnit: listing.pricePerUnit,
				condition: listing.condition,
				sellerId: listing.sellerId,
				buyerId: userId,
				sellerStateId: listing.sellerStateId,
				buyerStateId,
				route,
				levy: tax,
				createdAt: now,
				arrivesAt
			})
			.returning({ id: armsTrades.id });
		if (quantity === listing.quantity) await tx.delete(armsListings).where(eq(armsListings.id, listingId));
		return { total, tax, route, hours, arrivesAt, tradeId: trade!.id };
	});
}

/** Daily average prices over the last `days` days, oldest first; days without trades repeat the last price. */
function trendOf(
	trades: { createdAt: Date; pricePerUnit: number; quantity: number }[],
	days: number,
	now: Date,
	start: number
) {
	const dayMs = 24 * HOUR;
	const buckets = Array.from({ length: days }, () => ({ value: 0, units: 0 }));
	for (const t of trades) {
		const i = days - 1 - Math.floor((now.getTime() - t.createdAt.getTime()) / dayMs);
		if (i < 0 || i >= days) continue;
		buckets[i]!.value += Number(t.pricePerUnit) * t.quantity;
		buckets[i]!.units += t.quantity;
	}
	let last = start;
	return buckets.map((b) => (last = b.units ? Math.round(b.value / b.units) : last));
}

/** Everything the market page shows. */
export async function armsBoard(db: Database, userId: string, now = new Date()) {
	await settleDeliveries(db, userId, now);
	const stateId = await residenceState(db, userId);
	const stateRows = await db
		.select({ id: states.id, name: states.name, blocId: states.blocId })
		.from(states)
		.orderBy(states.name);
	const stateMap = new Map(stateRows.map((s) => [s.id, s]));
	const me = { stateId, blocId: stateId ? (stateMap.get(stateId)?.blocId ?? null) : null };
	const routeTo = (sellerStateId: number | null) =>
		armsRoute(
			{ stateId: sellerStateId, blocId: sellerStateId ? (stateMap.get(sellerStateId)?.blocId ?? null) : null },
			me
		);

	const since = new Date(now.getTime() - ARMAMENTS.DEMAND_WINDOW_HOURS * HOUR);
	const [listings, recent, mine, pressure, authority, inventory, surplus, wallet] = await Promise.all([
		db.select().from(armsListings).where(eq(armsListings.rejected, false)).orderBy(armsListings.pricePerUnit),
		db.select().from(armsTrades).where(gte(armsTrades.createdAt, since)).orderBy(desc(armsTrades.createdAt)),
		db
			.select()
			.from(armsTrades)
			.where(
				and(
					eq(armsTrades.buyerId, userId),
					or(isNull(armsTrades.deliveredAt), gte(armsTrades.deliveredAt, new Date(now.getTime() - 48 * HOUR)))
				)
			)
			.orderBy(armsTrades.arrivesAt),
		marketPressure(db, now),
		stateId ? armsAuthority(db, userId, stateId) : Promise.resolve(null),
		db.select().from(productInventory).where(eq(productInventory.userId, userId)),
		db.select().from(armsSurplus).where(eq(armsSurplus.userId, userId)),
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, userId)).limit(1)
	]);
	const people = [
		...new Set([...listings.map((l) => l.sellerId), ...mine.map((t) => t.sellerId)].filter((v): v is string => !!v))
	];
	const profiles = people.length
		? await db
				.select({ id: userProfiles.accountId, name: userProfiles.name })
				.from(userProfiles)
				.where(inArray(userProfiles.accountId, people))
		: [];
	const names = new Map(profiles.map((p) => [p.id, p.name]));
	const stateName = (id: number | null) => (id ? (stateMap.get(id)?.name ?? "—") : "Stateless");

	// Embargo per seller state, checked once.
	const embargoes = new Map<number, string | null>();
	for (const s of new Set(listings.map((l) => l.sellerStateId).filter((v): v is number => !!v))) {
		embargoes.set(s, await armsEmbargo(db, s, stateId));
	}

	const goods = ARMAMENT_GOODS.map((good) => {
		const p = pressure(good);
		const guide = guidePrice(good, p.demand, p.supply);
		const trades = recent.filter((t) => t.good === good);
		const held = inventory.find((i) => i.productType === good)?.quantity ?? 0;
		const sur = surplus.find((s) => s.good === good);
		const used = Math.min(held, sur?.quantity ?? 0);
		const oldest = trades[trades.length - 1];
		const trend = trendOf(trades, 7, now, oldest ? Number(oldest.pricePerUnit) : guide);
		const usedCondition = sur?.condition ?? ARMAMENTS.NEW_CONDITION;
		return {
			good,
			value: armamentValue(good),
			guide,
			band: priceBand(guide),
			usedGuide: guidePrice(good, p.demand, p.supply, usedCondition),
			usedBand: priceBand(guidePrice(good, p.demand, p.supply, usedCondition)),
			supply: p.supply,
			demand: p.demand,
			trend,
			lastPrice: trades[0] ? Number(trades[0].pricePerUnit) : null,
			held,
			fresh: held - used,
			used,
			usedCondition
		};
	});

	const offers = listings.map((l) => {
		const route = routeTo(l.sellerStateId);
		const blocker =
			buyBlocker(l, userId, stateId, route) ?? (l.sellerStateId ? (embargoes.get(l.sellerStateId) ?? null) : null);
		return {
			id: l.id,
			good: l.good,
			quantity: l.quantity,
			pricePerUnit: Number(l.pricePerUnit),
			condition: l.condition,
			sellerId: l.sellerId,
			sellerName: names.get(l.sellerId) ?? "Unknown dealer",
			sellerStateId: l.sellerStateId,
			sellerStateName: stateName(l.sellerStateId),
			targetStateId: l.targetStateId,
			targetName: l.targetStateId ? stateName(l.targetStateId) : null,
			licensed: !!l.approvedBy,
			exportLicence:
				!!l.targetStateId &&
				armsRoute(
					{
						stateId: l.sellerStateId,
						blocId: l.sellerStateId ? (stateMap.get(l.sellerStateId)?.blocId ?? null) : null
					},
					{ stateId: l.targetStateId, blocId: stateMap.get(l.targetStateId)?.blocId ?? null }
				) === "foreign",
			mine: l.sellerId === userId,
			route,
			etaHours: deliveryHours(route, 1),
			levyPercent: levyPercent(route),
			blocker: l.sellerId === userId ? null : blocker,
			createdAt: l.createdAt
		};
	});

	return {
		viewerId: userId,
		state: stateId ? { id: stateId, name: stateName(stateId), blocId: me.blocId } : null,
		states: stateRows.map((s) => ({
			id: s.id,
			name: s.name,
			route: armsRoute(me, { stateId: s.id, blocId: s.blocId })
		})),
		wallet: Number(wallet[0]?.balance ?? 0),
		goods,
		offers: offers.filter((o) => o.licensed),
		myOffers: offers.filter((o) => o.mine),
		licenceQueue: authority && stateId ? offers.filter((o) => !o.licensed && o.sellerStateId === stateId) : [],
		authority,
		trades: recent.slice(0, 40).map((t) => ({
			id: t.id,
			good: t.good,
			quantity: t.quantity,
			pricePerUnit: Number(t.pricePerUnit),
			condition: t.condition,
			route: t.route,
			from: stateName(t.sellerStateId),
			to: stateName(t.buyerStateId),
			createdAt: t.createdAt
		})),
		deliveries: mine.map((t) => ({
			id: t.id,
			good: t.good,
			quantity: t.quantity,
			condition: t.condition,
			route: t.route,
			from: stateName(t.sellerStateId),
			sellerName: t.sellerId ? (names.get(t.sellerId) ?? "Unknown dealer") : "Unknown dealer",
			total: t.quantity * Number(t.pricePerUnit),
			createdAt: t.createdAt,
			arrivesAt: t.arrivesAt,
			deliveredAt: t.deliveredAt
		}))
	};
}
