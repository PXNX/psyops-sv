// src/routes/market/[item]/+page.server.ts

import { db } from "#lib/server/db.js";
import {
	marketListings,
	marketPriceHistory,
	marketStatistics,
	resourceInventory,
	productInventory,
	stateResourceInventory,
	stateProductInventory,
	stateTreasury,
	governmentBudgetTransactions,
	resourceTypeEnum,
	productTypeEnum,
	userWallets,
	residences,
	regions,
	stateTaxes,
	marketListingCooldowns,
	presidents,
	ministers,
	states,
	transactionHistory,
	userProfiles
} from "#lib/server/schema.js";
import { eq, and, gt, gte, isNull, sql } from "drizzle-orm";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { error, fail } from "@sveltejs/kit";
import { calculateAndCollectTax } from "#lib/server/taxes.js";
import type { Actions, PageServerLoad } from "./$types";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
import { addStateItem, addUserItem, takeUserItem } from "#lib/server/services/economy/inventory.js";
import { loadCandles, loadLastPricesBefore } from "../price-history.server";
import {
	closeTrade,
	MarketTradeError as PurchaseError,
	paySeller,
	takeListingStock
} from "#lib/server/services/economy/market-trade.js";
import { isGovernorOf } from "#lib/server/services/politics/regional-budget.js";
import {
	RegionalMarketError,
	buyListingForRegion,
	governedRegions,
	listForRegion,
	regionTradeDesk,
	withdrawRegionListing
} from "#lib/server/services/politics/regional-market.js";

const isCount = (n: number) => Number.isInteger(n) && n >= 1 && n <= 1_000_000_000;

const RESOURCES: readonly string[] = resourceTypeEnum.enumValues;
const PRODUCTS: readonly string[] = productTypeEnum.enumValues;

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const account = locals.account!;
	const itemName = params.item;

	let itemType: "resource" | "product";
	if (RESOURCES.includes(itemName)) itemType = "resource";
	else if (PRODUCTS.includes(itemName)) itemType = "product";
	else throw error(404, "Item not found");

	const now = Date.now();
	const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

	// Everything below only depends on the account / item, so it all runs concurrently.
	// Dependent lookups (tax rate, government state) are chained onto their inputs.
	const [
		taxRate,
		wallet,
		userItemQuantity,
		[statistics],
		candles,
		openingPrice,
		allListings,
		[cooldown],
		governmentState,
		myRegions
	] = await Promise.all([
		db
			.select({ regionId: residences.regionId, stateId: regions.stateId })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1)
			.then(async ([residence]) => {
				if (!residence?.stateId) return 0;
				const [stateTax] = await db
					.select({ taxRate: stateTaxes.taxRate })
					.from(stateTaxes)
					.where(
						and(
							eq(stateTaxes.stateId, residence.stateId),
							eq(stateTaxes.taxType, "market_transaction"),
							eq(stateTaxes.isActive, true)
						)
					)
					.limit(1);
				return stateTax?.taxRate || 0;
			}),
		(async () => {
			let [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
			if (!wallet) {
				await db.insert(userWallets).values({ userId: account.id, balance: 10000 });
				[wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
			}
			return wallet;
		})(),
		// User's inventory for this item
		(async () => {
			if (itemType === "resource") {
				const [inv] = await db
					.select()
					.from(resourceInventory)
					.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));
				return inv?.quantity ?? 0;
			} else {
				const [inv] = await db
					.select()
					.from(productInventory)
					.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
				return inv?.quantity ?? 0;
			}
		})(),
		db
			.select()
			.from(marketStatistics)
			.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)))
			.limit(1),
		loadCandles(thirtyDaysAgo, 3600, itemName).then((m) => m.get(itemName) ?? []),
		loadLastPricesBefore(thirtyDaysAgo, itemName).then((m) => m.get(itemName) ?? null),
		// Live listings ordered by price; only the cheapest one is shown.
		db
			.select()
			.from(marketListings)
			.where(
				and(
					eq(marketListings.itemType, itemType),
					eq(marketListings.itemName, itemName),
					gt(marketListings.quantity, 0)
				)
			)
			.orderBy(marketListings.pricePerUnit, marketListings.id),
		db.select().from(marketListingCooldowns).where(eq(marketListingCooldowns.userId, account.id)),
		// Check if user is president or minister of economy of any state
		Promise.all([
			db.select({ stateId: presidents.stateId }).from(presidents).where(eq(presidents.userId, account.id)).limit(1),
			db
				.select({ stateId: ministers.stateId })
				.from(ministers)
				.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "economy")))
				.limit(1)
		]).then(async ([[presidency], [economyMinistry]]) => {
			let governmentState: { id: number; name: string; treasuryBalance: number } | null = null;
			const govStateId = presidency?.stateId ?? economyMinistry?.stateId ?? null;
			if (govStateId) {
				const [[state], [treasury]] = await Promise.all([
					db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, govStateId)).limit(1),
					db
						.select({ balance: stateTreasury.balance })
						.from(stateTreasury)
						.where(eq(stateTreasury.stateId, govStateId))
						.limit(1)
				]);
				if (state) {
					governmentState = {
						id: state.id,
						name: state.name,
						treasuryBalance: Number(treasury?.balance ?? 0)
					};
				}
			}
			return governmentState;
		}),
		// Regions this player governs: they can trade raw materials for them.
		itemType === "resource" ? governedRegions(db, account.id) : Promise.resolve([])
	]);

	// "Trade for: Me / Region X" (?for=<regionId>), only for a region the player governs.
	const forParam = Number(url.searchParams.get("for"));
	const tradeRegion = myRegions.find((r) => r.id === forParam) ?? null;
	const regionDesk = tradeRegion ? await regionTradeDesk(db, tradeRegion, itemName, account.id) : null;

	const myRegionIds = myRegions.map((r) => r.id);
	const isMine = (l: (typeof allListings)[number]) =>
		(l.sellerId === account.id && !l.sellerRegionId) || (!!l.sellerRegionId && myRegionIds.includes(l.sellerRegionId));
	const myListing = allListings.find((l) => l.sellerId === account.id && !l.sellerRegionId) ?? null;

	// Only the cheapest offer you can buy is shown: the rest of the book stays hidden.
	const bestListing = allListings.find((l) => !isMine(l)) ?? null;
	let bestOffer:
		| ((typeof allListings)[number] & {
				sellerName: string | null;
				sellerAvatar: string | null;
		  })
		| null = null;
	if (bestListing) {
		let sellerName: string | null = null;
		let sellerAvatar: string | null = null;
		if (!bestListing.sellerRegionId) {
			const [profile] = await db
				.select({ name: userProfiles.name, logo: userProfiles.logo })
				.from(userProfiles)
				.where(eq(userProfiles.accountId, bestListing.sellerId))
				.limit(1);
			sellerName = profile?.name ?? null;
			sellerAvatar = await getLogoUrl(profile?.logo ?? null);
		}
		bestOffer = { ...bestListing, sellerName, sellerAvatar };
	}

	let cooldownRemaining = 0;
	if (cooldown) {
		const hourInMs = 60 * 60 * 1000;
		const timeSinceRemoval = Date.now() - new Date(cooldown.lastRemovedAt).getTime();
		cooldownRemaining = Math.max(0, hourInMs - timeSinceRemoval);
	}

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		itemName,
		itemType,
		statistics,
		now,
		candles,
		openingPrice,
		myListing,
		bestOffer,
		taxRate,
		userItemQuantity,
		cooldownRemaining,
		governmentState,
		governedRegions: myRegions,
		regionDesk
	};
};

export const actions: Actions = {
	createListing: async ({ request, locals, params }) => {
		const account = locals.account!;
		const itemName = params.item;

		let itemType: "resource" | "product";
		if (RESOURCES.includes(itemName)) itemType = "resource";
		else if (PRODUCTS.includes(itemName)) itemType = "product";
		else return fail(400, { message: "Invalid item" });

		// Enforce one listing per user per item
		const [existingListing] = await db
			.select()
			.from(marketListings)
			.where(
				and(
					eq(marketListings.sellerId, account.id),
					isNull(marketListings.sellerRegionId),
					eq(marketListings.itemType, itemType),
					eq(marketListings.itemName, itemName)
				)
			);

		if (existingListing) {
			return fail(400, { message: "You already have an active listing for this item." });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(marketListingCooldowns)
			.where(eq(marketListingCooldowns.userId, account.id));

		if (cooldown) {
			const hourInMs = 60 * 60 * 1000;
			const timeSinceRemoval = Date.now() - new Date(cooldown.lastRemovedAt).getTime();
			if (timeSinceRemoval < hourInMs) {
				const remainingMinutes = Math.ceil((hourInMs - timeSinceRemoval) / 60000);
				return fail(429, {
					message: `Wait ${remainingMinutes} more minutes before creating a new listing`,
					cooldownRemaining: hourInMs - timeSinceRemoval
				});
			}
		}

		const formData = await request.formData();
		const quantity = parseInt(formData.get("quantity") as string);
		const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

		if (!isCount(quantity) || !isCount(pricePerUnit)) {
			return fail(400, { message: "Invalid listing data" });
		}

		const listed = await db.transaction(async (tx) => {
			if (!(await takeUserItem(tx, account.id, itemType, itemName, quantity))) return false;
			await tx.insert(marketListings).values({ sellerId: account.id, itemType, itemName, quantity, pricePerUnit });
			return true;
		});
		if (!listed) return fail(400, { message: `You don't have ${quantity} ${itemName}.` });
		await updateMarketStatistics(itemType, itemName);
		return { success: true, message: "Listing created" };
	},

	updateListing: async ({ request, locals, params }) => {
		const account = locals.account!;
		const itemName = params.item;

		let itemType: "resource" | "product";
		if (RESOURCES.includes(itemName)) itemType = "resource";
		else if (PRODUCTS.includes(itemName)) itemType = "product";
		else return fail(400, { message: "Invalid item" });

		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);
		const newQuantity = parseInt(formData.get("quantity") as string);
		const newPrice = parseInt(formData.get("pricePerUnit") as string);

		if (!isCount(newQuantity) || !isCount(newPrice)) return fail(400, { message: "Invalid data" });

		// Lock the listing, then move only the difference between inventory and
		// listing, so the total never changes and a sale can't slip in between.
		const problem = await db.transaction(async (tx) => {
			const [listing] = await tx.select().from(marketListings).where(eq(marketListings.id, listingId)).for("update");
			// A region's listing is withdrawn and relisted by its governor, never amended into their own stock.
			if (!listing || listing.sellerId !== account.id || listing.sellerRegionId) return "Not your listing";
			const diff = newQuantity - listing.quantity;
			if (diff > 0 && !(await takeUserItem(tx, account.id, itemType, itemName, diff))) {
				return "Insufficient items in inventory";
			}
			if (diff < 0) await addUserItem(tx, account.id, itemType, itemName, -diff);
			await tx
				.update(marketListings)
				.set({ quantity: newQuantity, pricePerUnit: newPrice })
				.where(eq(marketListings.id, listingId));
			return null;
		});
		if (problem) return fail(400, { message: problem });

		await updateMarketStatistics(itemType, itemName);
		return { success: true, message: "Listing updated" };
	},

	buyListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing) return fail(404, { message: "Listing not found" });
		if (listing.sellerId === account.id) return fail(400, { message: "Cannot buy your own listing" });
		if (!isCount(quantity) || quantity > listing.quantity) return fail(400, { message: "Invalid quantity" });
		// A governor can't sell their region's stock to themselves.
		if (listing.sellerRegionId && (await isGovernorOf(db, account.id, listing.sellerRegionId))) {
			return fail(400, { message: "You can't buy from the region you govern." });
		}

		const [buyerResidence] = await db
			.select({ stateId: regions.stateId, regionId: regions.id })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		let result: { taxAmount: number };
		try {
			result = await db.transaction(async (tx) => {
				// Take the stock first: if another buyer got there first, nothing else happens.
				const { remaining } = await takeListingStock(tx, listingId, quantity);

				let taxCalculation = { grossAmount, taxAmount: 0, netAmount: grossAmount, applicableTaxes: [] as any[] };

				if (buyerResidence?.stateId) {
					taxCalculation = await calculateAndCollectTax(
						buyerResidence.stateId,
						"market_transaction",
						grossAmount,
						account.id,
						tx,
						buyerResidence.regionId
					);
				}

				const totalCost = taxCalculation.netAmount + taxCalculation.taxAmount;
				// Debit and credit inside the UPDATEs themselves so concurrent purchases
				// can't overwrite each other's balance, and the buyer can't go negative.
				const [buyerWallet] = await tx
					.update(userWallets)
					.set({ balance: sql`${userWallets.balance} - ${totalCost}`, updatedAt: new Date() })
					.where(and(eq(userWallets.userId, account.id), gte(userWallets.balance, totalCost)))
					.returning({ balance: userWallets.balance });
				if (!buyerWallet) throw new PurchaseError("Insufficient funds");

				// A player's wallet, or the regional budget for a region's listing.
				await paySeller(tx, listing, quantity, taxCalculation.netAmount, { userId: account.id });
				await addUserItem(tx, account.id, listing.itemType, listing.itemName, quantity);

				// Record transaction history for buyer
				await tx.insert(transactionHistory).values({
					userId: account.id,
					transactionType: "market_purchase",
					amount: -totalCost,
					balanceAfter: buyerWallet.balance,
					description: `Purchased ${quantity}x ${listing.itemName} at $${listing.pricePerUnit}/ea`,
					relatedUserId: listing.sellerId,
					relatedEntityType: "listing",
					relatedEntityId: listing.id
				});

				await closeTrade(tx, listing, quantity, remaining);

				return { taxAmount: taxCalculation.taxAmount };
			});
		} catch (err) {
			// Expected outcomes (sold out, not enough money) become a form message
			// instead of the 500 page; anything else is a real error.
			if (err instanceof PurchaseError) return fail(409, { message: err.message });
			throw err;
		}

		await updateMarketStatistics(listing.itemType, listing.itemName);

		sendNotificationIfEnabled(listing.sellerId, "notifyMarketSales", {
			title: "💰 Market Sale",
			body: `Someone purchased ${quantity}x ${listing.itemName} from your listing for $${(listing.pricePerUnit * quantity).toLocaleString()}.`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: `/market/${listing.itemName}`,
				tag: `market-sale-${listing.id}`
			}
		}).catch((err) => console.error("Failed to send market sale notification:", err));

		return { success: true, message: "Purchase successful", taxPaid: result.taxAmount };
	},

	buyListingAsState: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		// Verify the user is president or minister of economy
		const [presidency] = await db
			.select({ stateId: presidents.stateId })
			.from(presidents)
			.where(eq(presidents.userId, account.id))
			.limit(1);

		const [economyMinistry] = await db
			.select({ stateId: ministers.stateId })
			.from(ministers)
			.where(and(eq(ministers.userId, account.id), eq(ministers.ministry, "economy")))
			.limit(1);

		const stateId = presidency?.stateId ?? economyMinistry?.stateId ?? null;
		if (!stateId) return fail(403, { message: "Only the president or minister of economy can buy for the state" });

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));
		if (!listing) return fail(404, { message: "Listing not found" });
		// Leaders can't pay themselves out of the treasury.
		if (listing.sellerId === account.id) return fail(400, { message: "The state can't buy your own listing" });
		if (!isCount(quantity) || quantity > listing.quantity) return fail(400, { message: "Invalid quantity" });

		const totalCost = listing.pricePerUnit * quantity;

		try {
			await db.transaction(async (tx) => {
				const { remaining } = await takeListingStock(tx, listingId, quantity);

				const [treasury] = await tx
					.update(stateTreasury)
					.set({
						balance: sql`${stateTreasury.balance} - ${totalCost}`,
						totalSpent: sql`${stateTreasury.totalSpent} + ${totalCost}`,
						updatedAt: new Date()
					})
					.where(and(eq(stateTreasury.stateId, stateId), gte(stateTreasury.balance, totalCost)))
					.returning({ balance: stateTreasury.balance });
				if (!treasury) throw new PurchaseError("Insufficient treasury funds");

				await paySeller(tx, listing, quantity, totalCost, { userId: account.id, label: "the state" });

				await addStateItem(tx, stateId, listing.itemType, listing.itemName, quantity);

				await tx.insert(governmentBudgetTransactions).values({
					stateId,
					transactionType: "resource_purchase",
					amount: -totalCost,
					balanceAfter: treasury.balance,
					description: `Purchased ${quantity}x ${listing.itemName} from market`,
					authorizedBy: account.id,
					itemType: listing.itemType,
					itemName: listing.itemName,
					quantity,
					pricePerUnit: listing.pricePerUnit
				});

				await closeTrade(tx, listing, quantity, remaining);
			});
		} catch (err) {
			if (err instanceof PurchaseError) return fail(409, { message: err.message });
			throw err;
		}

		await updateMarketStatistics(listing.itemType, listing.itemName);
		return {
			success: true,
			message: `State purchased ${quantity}x ${listing.itemName} for $${totalCost.toLocaleString()}`
		};
	},

	// The governor buys for the region: regional budget pays, regional stockpile receives.
	buyListingAsRegion: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const { total, itemName } = await buyListingForRegion(db, {
				regionId: Number(form.get("regionId")),
				userId: locals.account!.id,
				listingId: Number(form.get("listingId")),
				quantity: Number(form.get("quantity"))
			});
			await updateMarketStatistics("resource", itemName);
			return { success: true, message: `Bought for the region for $${total.toLocaleString()}.` };
		} catch (err) {
			if (err instanceof RegionalMarketError) return fail(400, { message: err.message });
			throw err;
		}
	},

	// The governor lists units from the regional stockpile; sales pay into the regional budget.
	createRegionListing: async ({ request, locals, params }) => {
		const form = await request.formData();
		try {
			await listForRegion(db, {
				regionId: Number(form.get("regionId")),
				userId: locals.account!.id,
				resource: params.item,
				quantity: Number(form.get("quantity")),
				pricePerUnit: Number(form.get("pricePerUnit"))
			});
			await updateMarketStatistics("resource", params.item);
			return { success: true, message: "Region listing posted." };
		} catch (err) {
			if (err instanceof RegionalMarketError) return fail(400, { message: err.message });
			throw err;
		}
	},

	withdrawRegionListing: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const { itemName, quantity } = await withdrawRegionListing(db, {
				regionId: Number(form.get("regionId")),
				userId: locals.account!.id,
				listingId: Number(form.get("listingId"))
			});
			await updateMarketStatistics("resource", itemName);
			return { success: true, message: `${quantity} ${itemName} back in the regional stockpile.` };
		} catch (err) {
			if (err instanceof RegionalMarketError) return fail(400, { message: err.message });
			throw err;
		}
	},

	removeListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);

		// Deleting the listing is the claim: only the request that removes it
		// gets the items back, so a double click can't refund twice.
		const listing = await db.transaction(async (tx) => {
			const [removed] = await tx
				.delete(marketListings)
				.where(
					and(
						eq(marketListings.id, listingId),
						eq(marketListings.sellerId, account.id),
						isNull(marketListings.sellerRegionId)
					)
				)
				.returning();
			if (removed) await addUserItem(tx, account.id, removed.itemType, removed.itemName, removed.quantity);
			return removed;
		});
		if (!listing) return fail(404, { message: "Listing not found" });

		const [existingCooldown] = await db
			.select()
			.from(marketListingCooldowns)
			.where(eq(marketListingCooldowns.userId, account.id));
		if (existingCooldown) {
			await db
				.update(marketListingCooldowns)
				.set({ lastRemovedAt: new Date() })
				.where(eq(marketListingCooldowns.userId, account.id));
		} else {
			await db.insert(marketListingCooldowns).values({ userId: account.id, lastRemovedAt: new Date() });
		}

		await updateMarketStatistics(listing.itemType, listing.itemName);
		return { success: true, message: "Listing removed. Wait 1 hour before creating a new listing." };
	}
};

async function updateMarketStatistics(itemType: string, itemName: string) {
	const listings = await db
		.select()
		.from(marketListings)
		.where(and(eq(marketListings.itemType, itemType), eq(marketListings.itemName, itemName)));

	if (listings.length === 0) {
		await db
			.delete(marketStatistics)
			.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));
		return;
	}

	const prices = listings.map((l) => l.pricePerUnit);
	const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length);
	const lowestPrice = Math.min(...prices);
	const highestPrice = Math.max(...prices);
	const totalVolume = listings.reduce((sum, l) => sum + l.quantity, 0);

	const [existing] = await db
		.select()
		.from(marketStatistics)
		.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));

	if (existing) {
		await db
			.update(marketStatistics)
			.set({
				currentAvgPrice: avgPrice,
				lowestPrice,
				highestPrice,
				totalVolume,
				activeListings: listings.length,
				lastUpdated: new Date()
			})
			.where(and(eq(marketStatistics.itemType, itemType), eq(marketStatistics.itemName, itemName)));
	} else {
		await db.insert(marketStatistics).values({
			itemType,
			itemName,
			currentAvgPrice: avgPrice,
			lowestPrice,
			highestPrice,
			totalVolume,
			activeListings: listings.length
		});
	}
}
