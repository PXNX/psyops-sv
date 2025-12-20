// src/routes/(authenticated)/(dock)/settings/schema.ts
import * as v from "valibot";

export const updateProfileSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(2, "Name must be at least 2 characters"),
		v.maxLength(50, "Name must be at most 50 characters")
	),
	bio: v.optional(v.pipe(v.string(), v.maxLength(500, "Bio must be at most 500 characters"))),
	avatar: v.optional(
		v.pipe(
			v.file("Logo must be a file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
			v.maxSize(5 * 1024 * 1024, "Logo must be less than 5MB")
		)
	)
});
