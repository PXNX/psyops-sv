// src/routes/market/+page.server.ts

import { db } from "$lib/server/db";
import {
	marketListings,
	resourceInventory,
	productInventory,
	userWallets,
	residences,
	regions,
	states,
	marketListingCooldowns,
	stateTreasury,
	stateSanctions
} from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { calculateAndCollectTax, type TaxCalculation } from "$lib/server/taxes";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's residence to determine their state (isPrimary removed)
	const [residence] = await db
		.select({
			regionId: residences.regionId,
			stateId: regions.stateId
		})
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, account.id))
		.limit(1);

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	if (!wallet) {
		await db.insert(userWallets).values({
			userId: account.id,
			balance: 10000
		});
	}

	// Get user's resources
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));

	// Get user's products
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));

	// Get all market listings with seller state and sanction info
	const listings = await db
		.select({
			id: marketListings.id,
			sellerId: marketListings.sellerId,
			itemType: marketListings.itemType,
			itemName: marketListings.itemName,
			quantity: marketListings.quantity,
			pricePerUnit: marketListings.pricePerUnit,
			createdAt: marketListings.createdAt,
			sellerStateId: regions.stateId
		})
		.from(marketListings)
		.leftJoin(residences, eq(marketListings.sellerId, residences.userId))
		.leftJoin(regions, eq(residences.regionId, regions.id))
		.orderBy(desc(marketListings.createdAt));

	// Get active sanctions to check if listings are from sanctioned states
	const activeSanctions = await db
		.select({
			targetStateId: stateSanctions.targetStateId,
			sanctioningStateId: stateSanctions.sanctioningStateId
		})
		.from(stateSanctions)
		.where(eq(stateSanctions.isActive, true));

	// Check if each listing is from a sanctioned state (from user's perspective)
	const listingsWithSanctions = listings.map((listing) => {
		const isSanctioned = activeSanctions.some(
			(s) => s.targetStateId === listing.sellerStateId && s.sanctioningStateId === residence?.stateId
		);
		return {
			...listing,
			isStateSanctioned: isSanctioned
		};
	});

	// Check cooldown
	const [cooldown] = await db
		.select()
		.from(marketListingCooldowns)
		.where(eq(marketListingCooldowns.userId, account.id));

	let cooldownRemaining = 0;
	if (cooldown) {
		const hourInMs = 60 * 60 * 1000;
		const timeSinceRemoval = Date.now() - new Date(cooldown.lastRemovedAt).getTime();
		cooldownRemaining = Math.max(0, hourInMs - timeSinceRemoval);
	}

	return {
		wallet: wallet || { balance: 10000, userId: account.id },
		resources,
		products,
		marketListings: listingsWithSanctions,
		userStateId: residence?.stateId || null,
		cooldownRemaining
	};
};

export const actions: Actions = {
	createListing: async ({ request, locals }) => {
		const account = locals.account!;

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
					message: `You must wait ${remainingMinutes} more minutes before creating a new listing`,
					cooldownRemaining: hourInMs - timeSinceRemoval
				});
			}
		}

		const formData = await request.formData();

		const itemType = formData.get("itemType") as string;
		const itemName = formData.get("itemName") as string;
		const quantity = parseInt(formData.get("quantity") as string);
		const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

		if (!itemType || !itemName || quantity < 1 || pricePerUnit < 100) {
			return fail(400, { message: "Invalid listing data" });
		}

		if (itemType === "resource") {
			const [resource] = await db
				.select()
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));

			if (!resource || resource.quantity < quantity) {
				return fail(400, { message: "Insufficient resources" });
			}

			await db
				.update(resourceInventory)
				.set({
					quantity: resource.quantity - quantity,
					updatedAt: new Date()
				})
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));
		} else if (itemType === "product") {
			const [product] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));

			if (!product || product.quantity < quantity) {
				return fail(400, { message: "Insufficient products" });
			}

			await db
				.update(productInventory)
				.set({
					quantity: product.quantity - quantity,
					updatedAt: new Date()
				})
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
		}

		await db.insert(marketListings).values({
			sellerId: account.id,
			itemType,
			itemName,
			quantity,
			pricePerUnit
		});

		return { success: true, message: "Listing created successfully" };
	},

	buyListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = parseInt(formData.get("listingId") as string);
		const quantity = parseInt(formData.get("quantity") as string);

		const [listingData] = await db
			.select({
				listing: marketListings,
				sellerStateId: regions.stateId
			})
			.from(marketListings)
			.leftJoin(residences, eq(marketListings.sellerId, residences.userId))
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(marketListings.id, listingId));

		if (!listingData || !listingData.listing) {
			return fail(404, { message: "Listing not found" });
		}

		const listing = listingData.listing;

		if (listing.sellerId === account.id) {
			return fail(400, { message: "Cannot buy your own listing" });
		}

		if (quantity < 1 || quantity > listing.quantity) {
			return fail(400, { message: "Invalid quantity" });
		}

		const [buyerResidence] = await db
			.select({
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, account.id))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		let taxCalculation: TaxCalculation = {
			grossAmount,
			taxAmount: 0,
			netAmount: grossAmount,
			applicableTaxes: []
		};

		if (buyerResidence?.stateId) {
			taxCalculation = await calculateAndCollectTax(
				buyerResidence.stateId,
				"market_transaction",
				grossAmount,
				account.id
			);
		}

		const totalCost = taxCalculation.netAmount + taxCalculation.taxAmount;

		const [buyerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!buyerWallet || buyerWallet.balance < totalCost) {
			return fail(400, {
				message: "Insufficient funds",
				details: {
					required: totalCost,
					available: buyerWallet?.balance || 0,
					tax: taxCalculation.taxAmount
				}
			});
		}

		const [sellerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));

		if (!sellerWallet) {
			throw fail(500, { message: "Seller wallet not found" });
		}

		await db
			.update(userWallets)
			.set({
				balance: buyerWallet.balance - totalCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		await db
			.update(userWallets)
			.set({
				balance: sellerWallet.balance + taxCalculation.netAmount,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, listing.sellerId));

		if (listing.itemType === "resource") {
			const [existing] = await db
				.select()
				.from(resourceInventory)
				.where(
					and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
				);

			if (existing) {
				await db
					.update(resourceInventory)
					.set({
						quantity: existing.quantity + quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
			} else {
				await db.insert(resourceInventory).values({
					userId: account.id,
					resourceType: listing.itemName as any,
					quantity
				});
			}
		} else if (listing.itemType === "product") {
			const [existing] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));

			if (existing) {
				await db
					.update(productInventory)
					.set({
						quantity: existing.quantity + quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);
			} else {
				await db.insert(productInventory).values({
					userId: account.id,
					productType: listing.itemName as any,
					quantity
				});
			}
		}

		if (quantity === listing.quantity) {
			await db.delete(marketListings).where(eq(marketListings.id, listingId));
		} else {
			await db
				.update(marketListings)
				.set({
					quantity: listing.quantity - quantity
				})
				.where(eq(marketListings.id, listingId));
		}

		return {
			success: true,
			message: "Purchase successful",
			taxPaid: taxCalculation.taxAmount
		};
	},

	removeListing: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const listingId = parseInt(formData.get("listingId") as string);

		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));

		if (!listing) {
			return fail(404, { message: "Listing not found" });
		}

		if (listing.sellerId !== account.id) {
			return fail(403, { message: "Not your listing" });
		}

		if (listing.itemType === "resource") {
			const [existing] = await db
				.select()
				.from(resourceInventory)
				.where(
					and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
				);

			if (existing) {
				await db
					.update(resourceInventory)
					.set({
						quantity: existing.quantity + listing.quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.itemName as any))
					);
			} else {
				await db.insert(resourceInventory).values({
					userId: account.id,
					resourceType: listing.itemName as any,
					quantity: listing.quantity
				});
			}
		} else if (listing.itemType === "product") {
			const [existing] = await db
				.select()
				.from(productInventory)
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any)));

			if (existing) {
				await db
					.update(productInventory)
					.set({
						quantity: existing.quantity + listing.quantity,
						updatedAt: new Date()
					})
					.where(
						and(eq(productInventory.userId, account.id), eq(productInventory.productType, listing.itemName as any))
					);
			} else {
				await db.insert(productInventory).values({
					userId: account.id,
					productType: listing.itemName as any,
					quantity: listing.quantity
				});
			}
		}

		await db.delete(marketListings).where(eq(marketListings.id, listingId));

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
			await db.insert(marketListingCooldowns).values({
				userId: account.id,
				lastRemovedAt: new Date()
			});
		}

		return {
			success: true,
			message: "Listing removed. You must wait 1 hour before creating a new listing."
		};
	}
};
