// src/lib/server/services/economy/stock-market.ts
// The tradeable side of public companies. Listings live in the share order
// book; buying one moves cash between wallets and shares between holdings in
// a single transaction. Both the company page and the market board use these
// operations so the rules cannot drift apart.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, gt, gte, isNotNull, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	companies,
	companyShares,
	marketPriceHistory,
	regions,
	shareHoldings,
	shareListings,
	shareTransactions,
	transactionHistory,
	userWallets
} from "../../schema";
import { ECONOMY_CONFIG, STOCKS } from "#lib/config/index.js";
import { sharePrices } from "./dividends.js";

/** A share operation the user should see as a validation error. */
export class StockError extends Error {}

// These two helpers live in SvelteKit-aware modules (they import $app/env), so
// they are resolved lazily and can be stubbed in tests that import this file.
type EmbargoCheck = (companyStateId: number | null, userId: string) => Promise<string | null>;
type EmbargoMapCheck = (companyStateIds: Array<number | null>, userId: string) => Promise<Map<number, string>>;
type SaleNotifier = (userId: string, kind: string, payload: Record<string, unknown>) => Promise<unknown>;

const defaultEmbargoCheck: EmbargoCheck = async (stateId, userId) =>
	(await import("#lib/server/embargo.js")).getEmbargoReason(stateId, userId);
const defaultEmbargoMapCheck: EmbargoMapCheck = async (stateIds, userId) =>
	(await import("#lib/server/embargo.js")).getEmbargoReasons(stateIds, userId);
const defaultNotifier: SaleNotifier = async (userId, kind, payload) =>
	(await import("#lib/server/services/push-notification.service.js")).sendNotificationIfEnabled(
		userId,
		kind as never,
		payload as never
	);

/** Every listed company with its current quote, the viewer's holding, and
 * whether an embargo blocks the viewer from buying in. Only the cheapest open
 * offer is quoted: the rest of the book is not shown. */
export async function stockBoard(
	db: Database,
	userId: string,
	{ checkEmbargoes = defaultEmbargoMapCheck }: { checkEmbargoes?: EmbargoMapCheck } = {}
) {
	const publicShares = await db
		.select({
			companyId: companyShares.companyId,
			name: companies.name,
			ipoPrice: companyShares.ipoPrice,
			listedAt: companyShares.listedAt,
			founderLockedShares: companyShares.founderLockedShares,
			stateId: regions.stateId
		})
		.from(companyShares)
		.innerJoin(companies, eq(companies.id, companyShares.companyId))
		.leftJoin(regions, eq(companies.regionId, regions.id))
		.where(isNotNull(companyShares.listedAt))
		.orderBy(companies.name);
	if (!publicShares.length) return [];

	const companyIds = publicShares.map((s) => s.companyId);
	const [openAsks, holdings, prices] = await Promise.all([
		db
			.select({
				id: shareListings.id,
				companyId: shareListings.companyId,
				pricePerUnit: shareListings.pricePerUnit,
				quantity: shareListings.quantity
			})
			.from(shareListings)
			.where(gt(shareListings.quantity, 0))
			.orderBy(shareListings.companyId, shareListings.pricePerUnit, shareListings.id),
		db
			.select({ companyId: shareHoldings.companyId, quantity: shareHoldings.quantity })
			.from(shareHoldings)
			.where(eq(shareHoldings.userId, userId)),
		sharePrices(db, companyIds)
	]);
	// Ordered cheapest first, so the first ask per company is the only one quoted.
	const askByCompany = new Map<number, { id: number; price: number; units: number }>();
	for (const ask of openAsks) {
		if (askByCompany.has(ask.companyId)) continue;
		askByCompany.set(ask.companyId, {
			id: ask.id,
			price: Number(ask.pricePerUnit),
			units: ask.quantity
		});
	}
	const heldByCompany = new Map(holdings.map((h) => [h.companyId, h.quantity]));
	const embargoReasons = await checkEmbargoes(
		publicShares.map((s) => s.stateId),
		userId
	);

	return publicShares.map((s) => {
		const ask = askByCompany.get(s.companyId);
		return {
			companyId: s.companyId,
			name: s.name,
			ipoPrice: Number(s.ipoPrice),
			price: prices.get(s.companyId) ?? Number(s.ipoPrice),
			ask: ask?.price ?? null,
			bestAskId: ask?.id ?? null,
			unitsOnOffer: ask?.units ?? 0,
			held: heldByCompany.get(s.companyId) ?? 0,
			founderLockedShares: s.founderLockedShares,
			embargoReason: (s.stateId !== null ? embargoReasons.get(s.stateId) : null) ?? null
		};
	});
}

/** Open sell orders for one company, cheapest first. */
export async function stockOffers(db: Database, companyId: number) {
	return db
		.select({
			id: shareListings.id,
			sellerId: shareListings.sellerId,
			quantity: shareListings.quantity,
			pricePerUnit: shareListings.pricePerUnit
		})
		.from(shareListings)
		.where(and(eq(shareListings.companyId, companyId), sql`${shareListings.quantity} > 0`))
		.orderBy(shareListings.pricePerUnit, shareListings.id);
}

/** Offer shares for sale. The founder can never list below their locked block. */
export async function listShares(
	db: Database,
	{
		userId,
		companyId,
		quantity,
		pricePerUnit
	}: { userId: string; companyId: number; quantity: number; pricePerUnit: number }
) {
	if (
		!Number.isSafeInteger(quantity) ||
		quantity < 1 ||
		!Number.isSafeInteger(pricePerUnit) ||
		pricePerUnit < ECONOMY_CONFIG.MIN_SHARE_PRICE
	) {
		throw new StockError("Invalid listing data.");
	}
	const [company] = await db.select({ ownerId: companies.ownerId }).from(companies).where(eq(companies.id, companyId));
	if (!company) throw new StockError("Company not found.");

	const [shares] = await db.select().from(companyShares).where(eq(companyShares.companyId, companyId));
	if (!shares) throw new StockError("Company is not public.");
	if (shares.listedAt === null) {
		throw new StockError(`Shares list in ${STOCKS.LISTING_HOURS} hours; trading is not open yet.`);
	}

	const [holding] = await db
		.select()
		.from(shareHoldings)
		.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, userId)));
	if (!holding || holding.quantity < quantity) throw new StockError("You don't own enough shares.");
	if (userId === company.ownerId && holding.quantity - quantity < shares.founderLockedShares) {
		throw new StockError(
			`As the founder you must keep at least ${shares.founderLockedShares.toLocaleString()} locked shares.`
		);
	}

	await db.transaction(async (tx) => {
		await tx
			.update(shareHoldings)
			.set({ quantity: holding.quantity - quantity, updatedAt: new Date() })
			.where(and(eq(shareHoldings.companyId, companyId), eq(shareHoldings.userId, userId)));
		await tx.insert(shareListings).values({ companyId, sellerId: userId, quantity, pricePerUnit });
	});
}

/** Withdraw a sell order, returning the shares to the owner's holding. */
export async function cancelShareListing(db: Database, { userId, listingId }: { userId: string; listingId: number }) {
	const [listing] = await db.select().from(shareListings).where(eq(shareListings.id, listingId));
	if (!listing) throw new StockError("Listing not found.");
	if (listing.sellerId !== userId) throw new StockError("Not your listing.");

	await db.transaction(async (tx) => {
		const [holding] = await tx
			.select()
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, userId)));
		if (holding) {
			await tx
				.update(shareHoldings)
				.set({ quantity: holding.quantity + listing.quantity, updatedAt: new Date() })
				.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, userId)));
		} else {
			await tx.insert(shareHoldings).values({ companyId: listing.companyId, userId, quantity: listing.quantity });
		}
		await tx.delete(shareListings).where(eq(shareListings.id, listingId));
	});
}

/** Buy a slice of a sell order: wallets and holdings move atomically. */
export async function buyShares(
	db: Database,
	{
		userId,
		listingId,
		quantity,
		now = new Date(),
		checkEmbargo = defaultEmbargoCheck,
		notify = defaultNotifier
	}: {
		userId: string;
		listingId: number;
		quantity: number;
		now?: Date;
		checkEmbargo?: EmbargoCheck;
		notify?: SaleNotifier;
	}
) {
	const [listing] = await db.select().from(shareListings).where(eq(shareListings.id, listingId));
	if (!listing) throw new StockError("Listing not found.");
	if (listing.sellerId === userId) throw new StockError("Cannot buy your own listing.");
	if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > listing.quantity) {
		throw new StockError("Invalid quantity.");
	}

	const [company] = await db
		.select({ stateId: regions.stateId })
		.from(companies)
		.leftJoin(regions, eq(companies.regionId, regions.id))
		.where(eq(companies.id, listing.companyId));
	const embargoReason = await checkEmbargo(company?.stateId ?? null, userId);
	if (embargoReason) throw new StockError(embargoReason);

	const totalPrice = Number(listing.pricePerUnit) * quantity;
	if (!Number.isSafeInteger(totalPrice) || totalPrice < 0) throw new StockError("Invalid trade total.");
	const [buyerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId));
	if (!buyerWallet || Number(buyerWallet.balance) < totalPrice) throw new StockError("Insufficient funds.");

	await db.transaction(async (tx) => {
		const [sellerWallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));
		// Claim the buyer's funds with a guarded decrement: a concurrent spend
		// cannot overdraw the wallet between the earlier read and this update.
		const [paid] = await tx
			.update(userWallets)
			.set({ balance: sql`${userWallets.balance} - ${totalPrice}`, updatedAt: new Date() })
			.where(and(eq(userWallets.userId, userId), gte(userWallets.balance, totalPrice)))
			.returning({ balance: userWallets.balance });
		if (!paid) throw new StockError("Insufficient funds.");
		const buyerBalanceAfter = Number(paid.balance);
		const sellerBalanceAfter = Number(sellerWallet?.balance ?? 0) + totalPrice;

		if (sellerWallet) {
			await tx
				.update(userWallets)
				.set({ balance: sql`${userWallets.balance} + ${totalPrice}`, updatedAt: new Date() })
				.where(eq(userWallets.userId, listing.sellerId));
		}

		const [buyerHolding] = await tx
			.select()
			.from(shareHoldings)
			.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, userId)));
		if (buyerHolding) {
			await tx
				.update(shareHoldings)
				.set({ quantity: buyerHolding.quantity + quantity, updatedAt: new Date() })
				.where(and(eq(shareHoldings.companyId, listing.companyId), eq(shareHoldings.userId, userId)));
		} else {
			await tx.insert(shareHoldings).values({ companyId: listing.companyId, userId, quantity });
		}

		if (quantity === listing.quantity) {
			await tx.delete(shareListings).where(eq(shareListings.id, listing.id));
		} else {
			await tx
				.update(shareListings)
				.set({ quantity: listing.quantity - quantity })
				.where(eq(shareListings.id, listing.id));
		}

		await tx.insert(shareTransactions).values({
			companyId: listing.companyId,
			listingId: listing.id,
			buyerId: userId,
			sellerId: listing.sellerId,
			quantity,
			totalPrice
		});
		await tx.insert(transactionHistory).values({
			userId,
			transactionType: "share_purchase",
			amount: -totalPrice,
			balanceAfter: buyerBalanceAfter,
			description: `Bought ${quantity.toLocaleString()} share${quantity > 1 ? "s" : ""} for $${totalPrice.toLocaleString()}`,
			relatedUserId: listing.sellerId,
			relatedEntityType: "company",
			relatedEntityId: listing.companyId
		});
		// Share trades feed the same price-history table as goods, under a
		// `stock:<companyId>` key, so the market charts can plot them.
		await tx.insert(marketPriceHistory).values({
			itemType: "stock",
			itemName: `stock:${listing.companyId}`,
			pricePerUnit: Number(listing.pricePerUnit),
			quantity,
			transactionType: "sale",
			recordedAt: now
		});
		await tx.insert(transactionHistory).values({
			userId: listing.sellerId,
			transactionType: "share_sale",
			amount: totalPrice,
			balanceAfter: sellerBalanceAfter,
			description: `Sold ${quantity.toLocaleString()} share${quantity > 1 ? "s" : ""} for $${totalPrice.toLocaleString()}`,
			relatedUserId: userId,
			relatedEntityType: "company",
			relatedEntityId: listing.companyId
		});
	});

	notify(listing.sellerId, "notifyMarketSales", {
		title: "📈 Shares Sold",
		body: `Someone bought ${quantity.toLocaleString()} of your shares for $${totalPrice.toLocaleString()}.`,
		icon: "/favicon.png",
		badge: "/badge.png",
		data: { url: `/company/${listing.companyId}`, tag: `share-sale-${listing.id}` }
	}).catch((err) => console.error("Failed to send share sale notification:", err));

	return { success: true, message: "Purchase successful" };
}
