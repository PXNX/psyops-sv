// src/routes/(authenticated)/(dock)/settings/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const updateProfileSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(2, "Name must be at least 2 characters"),
		v.maxLength(SCHEMA_LIMITS.USER_NAME_MAX, `Name must be at most ${SCHEMA_LIMITS.USER_NAME_MAX} characters`)
	),
	bio: v.optional(v.pipe(v.string(), v.maxLength(SCHEMA_LIMITS.USER_BIO_MAX, `Bio must be at most ${SCHEMA_LIMITS.USER_BIO_MAX} characters`))),
	logo: v.optional(
		v.pipe(
			v.file("Logo must be a file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
			v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
		)
	)
});
