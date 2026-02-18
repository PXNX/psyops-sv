// /src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

// TODO: make it possible to send title and content optionally, so that only what has actually changed has to be updated. this may save a ton of network bandwidth when updating only title?
export const editArticleSchema = v.object({
	title: v.pipe(
		v.string("Title is required"),
		v.minLength(SCHEMA_LIMITS.MIN_TITLE_LENGTH, "Title cannot be empty"),
		v.maxLength(SCHEMA_LIMITS.ARTICLE_TITLE_MAX, `Title must be ${SCHEMA_LIMITS.ARTICLE_TITLE_MAX} characters or less`)
	),
	content: v.pipe(
		v.string("Content is required"),
		v.minLength(SCHEMA_LIMITS.MIN_CONTENT_LENGTH, `Please write at least ${SCHEMA_LIMITS.MIN_CONTENT_LENGTH} characters of content`),
		v.maxLength(SCHEMA_LIMITS.ARTICLE_CONTENT_MAX, `Content must be ${SCHEMA_LIMITS.ARTICLE_CONTENT_MAX} characters or less`)
	)
});

export type EditArticleSchema = v.InferOutput<typeof editArticleSchema>;
