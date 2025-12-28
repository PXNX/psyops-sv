// src/routes/(authenticated)/(fullscreen)/welcome/create/schema.ts
import * as v from "valibot";

export const createProfileSchema = v.object({
	name: v.pipe(
		v.string("Name is required"),
		v.regex(/^[a-zA-Z0-9\s]+$/, "Name must contain only letters, numbers, and spaces"),
		v.minLength(2, "Name must be at least 2 characters"),
		v.maxLength(50, "Name must not exceed 50 characters")
	),
	bio: v.optional(v.pipe(v.string(), v.maxLength(500, "Bio must not exceed 500 characters"))),
	logo: v.optional(
		v.pipe(
			v.file("Please upload an image file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Only image files are allowed"),
			v.maxSize(5 * 1024 * 1024, "File size must not exceed 5MB")
		)
	),
	// fixme: this should be a list of political views to select as dropdown
	politicalViews: v.optional(v.pipe(v.string(), v.maxLength(100, "Political views must not exceed 100 characters")))
});

export type CreateProfileSchema = typeof createProfileSchema;
