// src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import { articles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editArticleSchema } from "./schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const articleId = parseInt(params.id);

	const [article] = await db
		.select({
			id: articles.id,
			title: articles.title,
			content: articles.content,
			createdAt: articles.createdAt,
			authorId: articles.authorId,
			newspaperId: articles.newspaperId
		})
		.from(articles)
		.where(eq(articles.id, articleId))
		.limit(1);

	if (!article) {
		throw redirect(303, "/posts");
	}

	// TODO: also check if user is an owner or editor for the newspaper, if the article was published in a newspaper
	if (account.id !== article.authorId) {
		throw redirect(303, "/posts");
	}

	// Initialize the form with existing article data
	const form = await superValidate(
		{
			title: article.title,
			content: article.content
		},
		valibot(editArticleSchema)
	);

	return {
		form,
		articleId: article.id
	};
};

export const actions: Actions = {
	publish: async ({ locals, request, params }) => {
		const account = locals.account!;
		const articleId = parseInt(params.id);

		const form = await superValidate(request, valibot(editArticleSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Verify ownership
		const [existingArticle] = await db
			.select({
				authorId: articles.authorId
			})
			.from(articles)
			.where(eq(articles.id, articleId))
			.limit(1);

		if (!existingArticle) {
			return fail(404, { form });
		}

		// TODO: also check if user is an owner or editor for the newspaper
		if (existingArticle.authorId !== account.id) {
			return fail(403, { form });
		}

		// TODO: make it possible to send title and content optionally, so that only what has actually changed has to be updated. this may save a ton of network bandwidth when updating only title?

		try {
			const [updatedArticle] = await db
				.update(articles)
				.set({
					title: form.data.title,
					content: form.data.content
				})
				.where(eq(articles.id, articleId))
				.returning();

			throw redirect(303, `/posts/${updatedArticle.id}`);
		} catch (error) {
			console.error("Failed to edit article:", error);
			return fail(500, { form });
		}
	}
};
