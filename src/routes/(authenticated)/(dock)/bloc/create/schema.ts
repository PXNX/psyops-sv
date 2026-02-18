// src/routes/(authenticated)/(dock)/bloc/create/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const createBlocSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
		v.maxLength(SCHEMA_LIMITS.BLOC_NAME_MAX, `Name must be less than ${SCHEMA_LIMITS.BLOC_NAME_MAX} characters`)
	),
	color: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")),
	description: v.optional(v.pipe(v.string(), v.maxLength(SCHEMA_LIMITS.BLOC_DESCRIPTION_MAX, `Description must be less than ${SCHEMA_LIMITS.BLOC_DESCRIPTION_MAX} characters`)), ""),
	logo: v.optional(
		v.pipe(
			v.file("Logo must be a file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
			v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
		)
	)
});

export type CreateBlocSchema = typeof createBlocSchema;
