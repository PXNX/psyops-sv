// src/routes/(authenticated)/(fullscreen)/welcome/create/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/config/validation/schema-limits";

export const createProfileSchema = v.object({
	name: v.pipe(
		v.string("Name is required"),
		v.regex(/^[a-zA-Z0-9\s]+$/, "Name must contain only letters, numbers, and spaces"),
		v.minLength(2, "Name must be at least 2 characters"),
		v.maxLength(SCHEMA_LIMITS.USER_NAME_MAX, `Name must not exceed ${SCHEMA_LIMITS.USER_NAME_MAX} characters`)
	),
	bio: v.optional(v.pipe(v.string(), v.maxLength(SCHEMA_LIMITS.USER_BIO_MAX, `Bio must not exceed ${SCHEMA_LIMITS.USER_BIO_MAX} characters`))),
	logo: v.optional(
		v.pipe(
			v.file("Please upload an image file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Only image files are allowed"),
			v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `File size must not exceed ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
		)
	),
	// fixme: this should be a list of political views to select as dropdown
	politicalViews: v.optional(v.pipe(v.string(), v.maxLength(100, "Political views must not exceed 100 characters")))
});

export type CreateProfileSchema = typeof createProfileSchema;
