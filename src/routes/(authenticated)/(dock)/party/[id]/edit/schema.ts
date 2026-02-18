// src/routes/party/create/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const createPartySchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Party name is required"),
			v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Party name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
			v.maxLength(SCHEMA_LIMITS.PARTY_NAME_MAX, `Party name must be at most ${SCHEMA_LIMITS.PARTY_NAME_MAX} characters`)
		),
		abbreviation: v.optional(
			v.pipe(
				v.string(),
				v.regex(/^[a-zA-Z0-9]*$/, "Abbreviation must be alphanumeric only"),
				v.maxLength(SCHEMA_LIMITS.PARTY_ABBREVIATION_MAX, `Abbreviation must be ${SCHEMA_LIMITS.PARTY_ABBREVIATION_MAX} characters or less`)
			),
			""
		),
		color: v.pipe(v.string(), v.hexColor("Invalid color format - must be a hex color like #FF5733")),
		ideology: v.pipe(v.string("Ideology is required"), v.minLength(1, "Please select an ideology")),
		description: v.optional(v.string(), ""),
		logo: v.optional(
			v.pipe(
				v.file("Logo must be a file"),
				v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
				v.maxSize(SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024, `Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`)
			)
		)
	})
);

export type CreatePartySchema = typeof createPartySchema;
