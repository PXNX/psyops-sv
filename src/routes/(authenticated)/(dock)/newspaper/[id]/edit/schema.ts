// src/routes/(authenticated)/(dock)/newspaper/create/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const newspaperSchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Newspaper name is required"),
			v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Newspaper name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
			v.maxLength(SCHEMA_LIMITS.NEWSPAPER_NAME_MAX, `Newspaper name must be at most ${SCHEMA_LIMITS.NEWSPAPER_NAME_MAX} characters`)
		),
		background: v.optional(v.string(), ""),
		logo: v.optional(
			v.pipe(
				v.file("Logo must be a file"),
				v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
				v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
			)
		)
	})
);

export type NewspaperSchema = typeof newspaperSchema;
