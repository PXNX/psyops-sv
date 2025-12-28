// src/routes/(authenticated)/admin/giftcode/+page.server.ts
import { db } from "$lib/server/db";
import { giftCodes, giftCodeResources, accounts } from "$lib/server/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get all gift codes
	const allCodes = await db.query.giftCodes.findMany({
		with: {
			resources: true,
			creator: {
				columns: {
					email: true
				}
			}
		},
		orderBy: (giftCodes, { desc }) => [desc(giftCodes.createdAt)]
	});

	return {
		giftCodes: allCodes
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const code = formData.get("code")?.toString()?.trim().toUpperCase();
		const description = formData.get("description")?.toString()?.trim();
		const currencyAmount = parseInt(formData.get("currencyAmount")?.toString() || "0");
		const maxRedemptions = formData.get("maxRedemptions")?.toString();
		const expiresAt = formData.get("expiresAt")?.toString();

		if (!code) {
			return fail(400, { error: "Code is required" });
		}

		// Parse resources
		const resourcesJson = formData.get("resources")?.toString();
		let resources: Array<{ type: string; quantity: number }> = [];
		if (resourcesJson) {
			try {
				resources = JSON.parse(resourcesJson);
			} catch (e) {
				return fail(400, { error: "Invalid resources format" });
			}
		}

		try {
			await db.transaction(async (tx) => {
				// Create gift code - only set expiresAt if a date was provided
				const [newCode] = await tx
					.insert(giftCodes)
					.values({
						code,
						description: description || null,
						currencyAmount: currencyAmount || 0,
						maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
						expiresAt: expiresAt && expiresAt.trim() !== "" ? new Date(expiresAt) : null,
						createdBy: account.id,
						isActive: true
					})
					.returning();

				// Add resources
				if (resources.length > 0) {
					await tx.insert(giftCodeResources).values(
						resources.map((r) => ({
							giftCodeId: newCode.id,
							resourceType: r.type as any,
							quantity: r.quantity
						}))
					);
				}
			});

			return { success: true, message: "Gift code created successfully" };
		} catch (error: any) {
			console.error("Gift code creation error:", error);
			if (error?.constraint === "gift_codes_code_unique") {
				return fail(400, { error: "This code already exists" });
			}
			return fail(500, { error: "Failed to create gift code" });
		}
	},

	toggle: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const codeId = parseInt(formData.get("codeId"));

		if (!codeId) {
			return fail(400, { error: "Code ID is required" });
		}

		try {
			const code = await db.query.giftCodes.findFirst({
				where: eq(giftCodes.id, codeId)
			});

			if (!code) {
				return fail(404, { error: "Gift code not found" });
			}

			await db
				.update(giftCodes)
				.set({
					isActive: code.isActive
				})
				.where(eq(giftCodes.id, codeId));

			return { success: true };
		} catch (error) {
			console.error("Toggle error:", error);
			return fail(500, { error: "Failed to toggle gift code" });
		}
	},

	delete: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const codeId = formData.get("codeId")?.toString();

		if (!codeId) {
			return fail(400, { error: "Code ID is required" });
		}

		try {
			await db.delete(giftCodes).where(eq(giftCodes.id, codeId));
			return { success: true, message: "Gift code deleted successfully" };
		} catch (error) {
			console.error("Delete error:", error);
			return fail(500, { error: "Failed to delete gift code" });
		}
	}
};
