// /src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/schema.ts
import * as v from "valibot";

// TODO: make it possible to send title and content optionally, so that only what has actually changed has to be updated. this may save a ton of network bandwidth when updating only title?
export const editArticleSchema = v.object({
	title: v.pipe(
		v.string("Title is required"),
		v.minLength(1, "Title cannot be empty"),
		v.maxLength(50, "Title must be 200 characters or less")
	),
	content: v.pipe(
		v.string("Content is required"),
		v.minLength(50, "Please write at least 50 characters of content"),
		v.maxLength(5000, "Content must be 5000 characters or less")
	)
});

export type EditArticleSchema = v.InferOutput<typeof editArticleSchema>;
