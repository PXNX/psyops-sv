// src/routes/(authenticated)/(dock)/state/[id]/edit/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/config/validation/schema-limits";

export const editStateSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
		v.maxLength(SCHEMA_LIMITS.STATE_NAME_MAX, `Name must be less than ${SCHEMA_LIMITS.STATE_NAME_MAX} characters`)
	),
	background: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")),
	logo: v.optional(
		v.pipe(
			v.file("Logo must be a file"),
			v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
			v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
		)
	)
});

export type EditStateSchema = typeof editStateSchema;
