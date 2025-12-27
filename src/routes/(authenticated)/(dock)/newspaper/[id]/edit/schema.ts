// src/routes/(authenticated)/(dock)/newspaper/create/schema.ts
import * as v from "valibot";

export const newspaperSchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Newspaper name is required"),
			v.minLength(3, "Newspaper name must be at least 3 characters"),
			v.maxLength(40, "Newspaper name must be at most 40 characters")
		),
		background: v.optional(v.string(), ""),
		logo: v.optional(
			v.pipe(
				v.file("Logo must be a file"),
				v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
				v.maxSize(5 * 1024 * 1024, "Logo must be less than 5MB")
			)
		)
	})
);

export type NewspaperSchema = typeof newspaperSchema;
