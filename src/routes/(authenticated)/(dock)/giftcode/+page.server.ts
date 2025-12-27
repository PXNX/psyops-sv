// src/routes/(authenticated)/(dock)/giftcode/+page.server.ts
import { db } from "$lib/server/db";
import {
	giftCodes,
	giftCodeResources,
	giftCodeRedemptions,
	userWallets,
	resourceInventory,
	productInventory
} from "$lib/server/schema";
import { fail } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's redemption history
	const redemptions = await db
		.select({
			redemptionId: giftCodeRedemptions.id,
			currencyReceived: giftCodeRedemptions.currencyReceived,
			redeemedAt: giftCodeRedemptions.redeemedAt,
			code: giftCodes.code,
			description: giftCodes.description
		})
		.from(giftCodeRedemptions)
		.innerJoin(giftCodes, eq(giftCodeRedemptions.giftCodeId, giftCodes.id))
		.where(eq(giftCodeRedemptions.userId, account.id))
		.orderBy(sql`${giftCodeRedemptions.redeemedAt} DESC`);

	// Get resources for each redemption
	const formattedRedemptions = await Promise.all(
		redemptions.map(async (redemption) => {
			const resources = await db
				.select({
					type: giftCodeResources.resourceType,
					quantity: giftCodeResources.quantity
				})
				.from(giftCodeResources)
				.innerJoin(giftCodes, eq(giftCodeResources.giftCodeId, giftCodes.id))
				.innerJoin(giftCodeRedemptions, eq(giftCodeRedemptions.giftCodeId, giftCodes.id))
				.where(eq(giftCodeRedemptions.id, redemption.redemptionId));

			return {
				id: redemption.redemptionId,
				code: redemption.code,
				description: redemption.description,
				currencyReceived: redemption.currencyReceived,
				redeemedAt: redemption.redeemedAt,
				resources
			};
		})
	);

	return {
		redemptions: formattedRedemptions
	};
};

export const actions: Actions = {
	redeem: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const code = formData.get("code")?.toString()?.trim().toUpperCase();

		if (!code) {
			return fail(400, { error: "Please enter a gift code" });
		}

		try {
			// Find the gift code
			const giftCode = await db.query.giftCodes.findFirst({
				where: eq(giftCodes.code, code),
				with: {
					resources: true
				}
			});

			if (!giftCode) {
				return fail(400, { error: "Invalid gift code" });
			}

			// Check if code is active
			if (!giftCode.isActive) {
				return fail(400, { error: "This gift code is no longer active" });
			}

			// Check if expired - only if expiresAt is set
			if (giftCode.expiresAt !== null && new Date(giftCode.expiresAt) < new Date()) {
				return fail(400, { error: "This gift code has expired" });
			}

			// Check if max redemptions reached
			if (giftCode.maxRedemptions !== null && giftCode.currentRedemptions >= giftCode.maxRedemptions) {
				return fail(400, { error: "This gift code has reached its redemption limit" });
			}

			// Check if user already redeemed this code
			const existingRedemption = await db.query.giftCodeRedemptions.findFirst({
				where: and(eq(giftCodeRedemptions.giftCodeId, giftCode.id), eq(giftCodeRedemptions.userId, account.id))
			});

			if (existingRedemption) {
				return fail(400, { error: "You have already redeemed this gift code" });
			}

			// Redeem the code in a transaction
			await db.transaction(async (tx) => {
				// Create redemption record
				await tx.insert(giftCodeRedemptions).values({
					giftCodeId: giftCode.id,
					userId: account.id,
					currencyReceived: giftCode.currencyAmount
				});

				// Add currency to wallet if applicable
				if (giftCode.currencyAmount > 0) {
					const existingWallet = await tx.query.userWallets.findFirst({
						where: eq(userWallets.userId, account.id)
					});

					if (existingWallet) {
						await tx
							.update(userWallets)
							.set({
								balance: sql`${userWallets.balance} + ${giftCode.currencyAmount}`,
								updatedAt: new Date()
							})
							.where(eq(userWallets.userId, account.id));
					} else {
						await tx.insert(userWallets).values({
							userId: account.id,
							balance: 10000 + giftCode.currencyAmount // Default + gift
						});
					}
				}

				// Add resources to inventory
				for (const resource of giftCode.resources) {
					// Determine if it's a resource or product based on type
					const isProduct = ["rifles", "ammunition", "artillery", "vehicles", "explosives"].includes(
						resource.resourceType
					);

					if (isProduct) {
						// Add to product inventory
						const existing = await tx.query.productInventory.findFirst({
							where: and(
								eq(productInventory.userId, account.id),
								eq(productInventory.productType, resource.resourceType as any)
							)
						});

						if (existing) {
							await tx
								.update(productInventory)
								.set({
									quantity: sql`${productInventory.quantity} + ${resource.quantity}`,
									updatedAt: new Date()
								})
								.where(
									and(
										eq(productInventory.userId, account.id),
										eq(productInventory.productType, resource.resourceType as any)
									)
								);
						} else {
							await tx.insert(productInventory).values({
								userId: account.id,
								productType: resource.resourceType as any,
								quantity: resource.quantity
							});
						}
					} else {
						// Add to resource inventory
						const existing = await tx.query.resourceInventory.findFirst({
							where: and(
								eq(resourceInventory.userId, account.id),
								eq(resourceInventory.resourceType, resource.resourceType as any)
							)
						});

						if (existing) {
							await tx
								.update(resourceInventory)
								.set({
									quantity: sql`${resourceInventory.quantity} + ${resource.quantity}`,
									updatedAt: new Date()
								})
								.where(
									and(
										eq(resourceInventory.userId, account.id),
										eq(resourceInventory.resourceType, resource.resourceType as any)
									)
								);
						} else {
							await tx.insert(resourceInventory).values({
								userId: account.id,
								resourceType: resource.resourceType as any,
								quantity: resource.quantity
							});
						}
					}
				}

				// Increment redemption count
				await tx
					.update(giftCodes)
					.set({
						currentRedemptions: sql`${giftCodes.currentRedemptions} + 1`
					})
					.where(eq(giftCodes.id, giftCode.id));
			});

			return {
				success: true,
				rewards: {
					currency: giftCode.currencyAmount,
					resources: giftCode.resources.map((r) => ({
						type: r.resourceType,
						quantity: r.quantity
					}))
				}
			};
		} catch (error) {
			console.error("Gift code redemption error:", error);
			return fail(500, { error: "Failed to redeem gift code" });
		}
	}
};
