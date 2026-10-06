// src/routes/(authenticated)/(dock)/newspaper/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	journalists,
	newspapers,
	userProfiles,
	articles,
	newspaperSubscriptions,
	files,
	userWallets
} from "#lib/server/schema.js";
import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq, desc, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getLogoUrl, uploadFileFromForm } from "#lib/server/backblaze.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { newspaperSchema } from "./schema";

// Cost to edit a newspaper's details (name/background/logo). Charged on each successful edit.
const EDIT_COST = 2500;

export const load: PageServerLoad = async ({ params, locals }) => {
	const newspaperId = parseInt(params.id);
	const account = locals.account;

	// Get newspaper with owner information
	const newspaper = await db.query.newspapers.findFirst({
		where: eq(newspapers.id, newspaperId),
		with: {
			journalists: {
				where: eq(journalists.rank, "owner"),
				with: {
					user: {
						with: {
							profile: true
						}
					}
				},
				limit: 1
			}
		}
	});

	if (!newspaper) {
		throw error(404, "Newspaper not found");
	}

	const owner = newspaper.journalists[0];
	if (!owner) {
		throw error(500, "Newspaper has no owner");
	}

	// Everything below only depends on the newspaper, so fetch it in parallel
	const [logoUrl, ownerLogoUrl, articlesWithLogos, allStaff, subscriptions, membership, subscription] =
		await Promise.all([
			// Get logo URL if exists
			getLogoUrl(newspaper.logo),
			// Get owner profile logo
			getLogoUrl(owner.user.profile?.logo),
			// Get recent articles with author logos
			(async () => {
				const recentArticles = await db.query.articles.findMany({
					where: eq(articles.newspaperId, newspaperId),
					orderBy: [desc(articles.createdAt)],
					limit: 10,
					with: {
						author: {
							with: {
								profile: true
							}
						},
						upvotes: true
					}
				});
				return Promise.all(
					recentArticles.map(async (article) => ({
						...article,
						authorLogoUrl: await getLogoUrl(article.author.profile?.logo)
					}))
				);
			})(),
			// Get staff count
			db.query.journalists.findMany({
				where: eq(journalists.newspaperId, newspaperId)
			}),
			// Get subscriber count
			db.query.newspaperSubscriptions.findMany({
				where: eq(newspaperSubscriptions.newspaperId, newspaperId)
			}),
			// Check if current user is a journalist
			account
				? db.query.journalists.findFirst({
						where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
					})
				: undefined,
			// Check if user is subscribed
			account
				? db.query.newspaperSubscriptions.findFirst({
						where: and(
							eq(newspaperSubscriptions.userId, account.id),
							eq(newspaperSubscriptions.newspaperId, newspaperId)
						)
					})
				: undefined
		]);

	const staffCount = allStaff.length;
	const subscriberCount = subscriptions.length;
	const userRole: "owner" | "editor" | "author" | null = membership?.rank ?? null;
	const isSubscribed = !!subscription;

	// Data for the "Edit Newspaper" bottom sheet — only needed when viewing as the owner.
	let editForm: Awaited<ReturnType<typeof superValidate<typeof newspaperSchema>>> | null = null;
	let userBalance = 0;
	let canAffordEdit = false;

	if (account && userRole === "owner") {
		const [wallet, form] = await Promise.all([
			db.query.userWallets.findFirst({
				where: eq(userWallets.userId, account.id)
			}),
			superValidate(
				{
					name: newspaper.name,
					background: newspaper.background ?? ""
				},
				valibot(newspaperSchema)
			)
		]);
		editForm = form;
		userBalance = wallet?.balance ?? 0;
		canAffordEdit = userBalance >= EDIT_COST;
	}

	return {
		newspaper: {
			id: newspaper.id,
			name: newspaper.name,
			logoUrl,
			background: newspaper.background,
			createdAt: newspaper.createdAt
		},
		owner: {
			id: owner.userId,
			name: owner.user.profile?.name ?? "Unknown",
			logoUrl: ownerLogoUrl
		},
		articles: articlesWithLogos.map((article) => ({
			id: article.id,
			title: article.title,
			publishDate: article.createdAt,
			upvoteCount: article.upvotes.length,
			authorName: article.author.profile?.name ?? "Unknown",
			authorLogo: article.authorLogoUrl
		})),
		userRole,
		isSubscribed,
		staffCount,
		subscriberCount,
		editForm,
		editCost: EDIT_COST,
		userBalance,
		canAffordEdit
	};
};

export const actions: Actions = {
	subscribe: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const newspaperId = parseInt(params.id);

		// Check if already subscribed
		const existing = await db.query.newspaperSubscriptions.findFirst({
			where: and(eq(newspaperSubscriptions.userId, account.id), eq(newspaperSubscriptions.newspaperId, newspaperId))
		});

		if (existing) {
			return fail(400, { error: "Already subscribed" });
		}

		// Create subscription
		await db.insert(newspaperSubscriptions).values({
			userId: account.id,
			newspaperId
		});

		return { success: true };
	},

	unsubscribe: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const newspaperId = parseInt(params.id);

		// Delete subscription
		await db
			.delete(newspaperSubscriptions)
			.where(and(eq(newspaperSubscriptions.userId, account.id), eq(newspaperSubscriptions.newspaperId, newspaperId)));

		return { success: true };
	},

	// Powers the "Edit Newspaper" bottom sheet (EditNewspaperSheet.svelte).
	updateNewspaper: async ({ request, params, locals }) => {
		const account = locals.account!;
		const newspaperId = parseInt(params.id);
		const form = await superValidate(request, valibot(newspaperSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, background, logo } = form.data;

		// Get newspaper and verify ownership
		const newspaper = await db.query.newspapers.findFirst({
			where: eq(newspapers.id, newspaperId)
		});

		if (!newspaper) {
			return message(form, "Newspaper not found", { status: 404 });
		}

		const ownership = await db.query.journalists.findFirst({
			where: and(
				eq(journalists.userId, account.id),
				eq(journalists.newspaperId, newspaperId),
				eq(journalists.rank, "owner")
			)
		});

		if (!ownership) {
			return message(form, "Only the newspaper owner can edit it", { status: 403 });
		}

		// Check user has sufficient funds
		const userWallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!userWallet || userWallet.balance < EDIT_COST) {
			return message(form, "Insufficient funds to edit newspaper", { status: 400 });
		}

		// Check if new name conflicts with another newspaper
		if (name !== newspaper.name) {
			const existingNewspaper = await db.query.newspapers.findFirst({
				where: eq(newspapers.name, name)
			});

			if (existingNewspaper) {
				return message(form, "A newspaper with this name already exists", { status: 400 });
			}
		}

		try {
			let logoFileId: number | null = newspaper.logo;

			// Upload new logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					return message(form, "Failed to upload logo", { status: 500 });
				}

				// Create file record in database
				const [fileRecord] = await db
					.insert(files)
					.values({
						key: logoUploadResult.key,
						fileName: logo.name,
						contentType: "image/webp",
						sizeBytes: logo.size,
						uploadedBy: account.id
					})
					.returning();
				logoFileId = fileRecord.id;
			}

			// Deduct cost from user's wallet
			await db
				.update(userWallets)
				.set({
					balance: sql`${userWallets.balance} - ${EDIT_COST}`,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Update newspaper
			await db
				.update(newspapers)
				.set({
					name,
					logo: logoFileId,
					background: background || null
				})
				.where(eq(newspapers.id, newspaperId));

			return message(form, "Newspaper updated successfully!");
		} catch (err) {
			console.error("Update newspaper error:", err);
			return message(form, "Failed to update newspaper", { status: 500 });
		}
	},

	// Powers the "Delete Newspaper" confirmation inside EditNewspaperSheet.svelte.
	deleteNewspaper: async ({ params, locals }) => {
		const account = locals.account!;
		const newspaperId = parseInt(params.id);

		try {
			// Get newspaper details
			const newspaper = await db.query.newspapers.findFirst({
				where: eq(newspapers.id, newspaperId)
			});

			if (!newspaper) {
				return fail(404, { error: "Newspaper not found" });
			}

			// Check if user is the owner
			const ownership = await db.query.journalists.findFirst({
				where: and(
					eq(journalists.userId, account.id),
					eq(journalists.newspaperId, newspaperId),
					eq(journalists.rank, "owner")
				)
			});

			if (!ownership) {
				return fail(403, { error: "Only the newspaper owner can delete it" });
			}

			// Delete newspaper (cascade will handle journalists and articles)
			await db.delete(newspapers).where(eq(newspapers.id, newspaperId));
		} catch (err) {
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Delete newspaper error:", err);
			return fail(500, { error: "Failed to delete newspaper" });
		}

		redirect(303, "/newspaper");
	}
};
