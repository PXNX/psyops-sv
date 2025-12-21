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
	stateExportListings,
	stateTreasury,
	stateResourceInventory
} from "$lib/server/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { calculateAndCollectTax } from "$lib/server/taxes";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's primary residence to determine their state
	const [residence] = await db
		.select({
			regionId: residences.regionId,
			stateId: regions.stateId
		})
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)))
		.limit(1);

	// Get user's wallet
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	if (!wallet) {
		// Create wallet if doesn't exist
		await db.insert(userWallets).values({
			userId: account.id,
			balance: 10000
		});
	}

	// Get user's resources
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, account.id));

	// Get user's products
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, account.id));

	// Get all market listings with seller state info
	const listings = await db
		.select({
			id: marketListings.id,
			sellerId: marketListings.sellerId,
			itemType: marketListings.itemType,
			itemName: marketListings.itemName,
			quantity: marketListings.quantity,
			pricePerUnit: marketListings.pricePerUnit,
			createdAt: marketListings.createdAt,
			sellerStateId: regions.stateId,
			// fixme: sanctionsshould only block purchases for normal users
			isStateSanctioned: states.isSanctioned
		})
		.from(marketListings)
		.leftJoin(residences, and(eq(marketListings.sellerId, residences.userId), eq(residences.isPrimary, 1)))
		.leftJoin(regions, eq(residences.regionId, regions.id))
		.leftJoin(states, eq(regions.stateId, states.id))
		.orderBy(desc(marketListings.createdAt));

	// Get state export listings (resources only)
	const stateExportListingsData = await db
		.select({
			id: stateExportListings.id,
			stateId: stateExportListings.stateId,
			resourceType: stateExportListings.resourceType,
			quantity: stateExportListings.quantity,
			pricePerUnit: stateExportListings.pricePerUnit,
			createdAt: stateExportListings.createdAt,
			stateName: states.name
		})
		.from(stateExportListings)
		.innerJoin(states, eq(stateExportListings.stateId, states.id))
		.orderBy(desc(stateExportListings.createdAt));

	// Check if user has listing cooldown
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
		marketListings: listings,
		stateExports: stateExportListingsData,
		userStateId: residence?.stateId || null,
		cooldownRemaining
	};
};

export const actions: Actions = {
	createListing: async ({ request, locals }) => {
		const account = locals.account!;

		// Check for cooldown
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

		// Validate inputs
		if (!itemType || !itemName || quantity < 1 || pricePerUnit < 100) {
			return fail(400, { message: "Invalid listing data" });
		}

		// Check if user has enough items
		if (itemType === "resource") {
			const [resource] = await db
				.select()
				.from(resourceInventory)
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, itemName as any)));

			if (!resource || resource.quantity < quantity) {
				return fail(400, { message: "Insufficient resources" });
			}

			// Deduct from inventory
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

			// Deduct from inventory
			await db
				.update(productInventory)
				.set({
					quantity: product.quantity - quantity,
					updatedAt: new Date()
				})
				.where(and(eq(productInventory.userId, account.id), eq(productInventory.productType, itemName as any)));
		}

		// Create listing
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

		const listingId = formData.get("listingId") as string;
		const quantity = parseInt(formData.get("quantity") as string);

		// Get listing with seller's state info
		const [listingData] = await db
			.select({
				listing: marketListings,
				sellerStateId: regions.stateId
			})
			.from(marketListings)
			.leftJoin(residences, and(eq(marketListings.sellerId, residences.userId), eq(residences.isPrimary, 1)))
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(marketListings.id, listingId));

		if (!listingData || !listingData.listing) {
			return fail(404, { message: "Listing not found" });
		}

		const listing = listingData.listing;

		// Note: Sanctions no longer block purchases

		if (listing.sellerId === account.id) {
			return fail(400, { message: "Cannot buy your own listing" });
		}

		if (quantity < 1 || quantity > listing.quantity) {
			return fail(400, { message: "Invalid quantity" });
		}

		// Get buyer's residence to determine state for taxes
		const [buyerResidence] = await db
			.select({
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		// Calculate and collect market transaction tax (buyer pays)
		let taxCalculation = {
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

		const totalCost = taxCalculation.netAmount + taxCalculation.taxAmount; // Full cost including tax

		// Check buyer's wallet
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

		// Get seller's wallet
		const [sellerWallet] = await db.select().from(userWallets).where(eq(userWallets.userId, listing.sellerId));

		if (!sellerWallet) {
			return fail(500, { message: "Seller wallet not found" });
		}

		// Process transaction
		// Deduct from buyer (including tax)
		await db
			.update(userWallets)
			.set({
				balance: buyerWallet.balance - totalCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		// Pay seller (net amount only, tax already collected)
		await db
			.update(userWallets)
			.set({
				balance: sellerWallet.balance + taxCalculation.netAmount,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, listing.sellerId));

		// Add items to buyer's inventory
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

		// Update or remove listing
		if (quantity === listing.quantity) {
			// Remove listing completely
			await db.delete(marketListings).where(eq(marketListings.id, listingId));
		} else {
			// Update remaining quantity
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
		const listingId = formData.get("listingId") as string;

		// Get listing
		const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, listingId));

		if (!listing) {
			return fail(404, { message: "Listing not found" });
		}

		if (listing.sellerId !== account.id) {
			return fail(403, { message: "Not your listing" });
		}

		// Return items to inventory
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
				.where(and(eq(productInventory.userId, userId), eq(productInventory.productType, listing.itemName as any)));

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

		// Delete listing
		await db.delete(marketListings).where(eq(marketListings.id, listingId));

		// Set cooldown
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
	},

	buyStateExport: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const listingId = formData.get("listingId") as string;
		const quantity = parseInt(formData.get("quantity") as string);

		// Get state export listing
		const [listing] = await db.select().from(stateExportListings).where(eq(stateExportListings.id, listingId));

		if (!listing) {
			return fail(404, { message: "Export listing not found" });
		}

		if (quantity < 1 || quantity > listing.quantity) {
			return fail(400, { message: "Invalid quantity" });
		}

		// Get buyer's residence to determine state for taxes
		const [buyerResidence] = await db
			.select({
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(and(eq(residences.userId, account.id), eq(residences.isPrimary, 1)))
			.limit(1);

		const grossAmount = listing.pricePerUnit * quantity;

		// Calculate and collect market transaction tax (buyer pays)
		let taxCalculation = {
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

		// Check buyer's wallet
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

		// Get selling state's treasury
		const [stateTreasuryRecord] = await db
			.select()
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, listing.stateId));

		if (!stateTreasuryRecord) {
			return fail(500, { message: "State treasury not found" });
		}

		// Process transaction
		// Deduct from buyer (including tax)
		await db
			.update(userWallets)
			.set({
				balance: buyerWallet.balance - totalCost,
				updatedAt: new Date()
			})
			.where(eq(userWallets.userId, account.id));

		// Pay to state treasury (net amount)
		await db
			.update(stateTreasury)
			.set({
				balance: stateTreasuryRecord.balance + taxCalculation.netAmount,
				totalCollected: stateTreasuryRecord.totalCollected + taxCalculation.netAmount,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, listing.stateId));

		// Add resource to buyer's inventory
		const [existing] = await db
			.select()
			.from(resourceInventory)
			.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.resourceType)));

		if (existing) {
			await db
				.update(resourceInventory)
				.set({
					quantity: existing.quantity + quantity,
					updatedAt: new Date()
				})
				.where(and(eq(resourceInventory.userId, account.id), eq(resourceInventory.resourceType, listing.resourceType)));
		} else {
			await db.insert(resourceInventory).values({
				userId: account.id,
				resourceType: listing.resourceType,
				quantity
			});
		}

		// Update or remove listing
		if (quantity === listing.quantity) {
			await db.delete(stateExportListings).where(eq(stateExportListings.id, listingId));
		} else {
			await db
				.update(stateExportListings)
				.set({
					quantity: listing.quantity - quantity
				})
				.where(eq(stateExportListings.id, listingId));
		}

		return {
			success: true,
			message: "State export purchased successfully",
			taxPaid: taxCalculation.taxAmount
		};
	}
};
