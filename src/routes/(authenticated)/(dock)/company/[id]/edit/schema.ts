// src/routes/company/[id]/edit/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const editCompanySchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Company name is required"),
			v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Company name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
			v.maxLength(SCHEMA_LIMITS.COMPANY_NAME_MAX, `Company name must be at most ${SCHEMA_LIMITS.COMPANY_NAME_MAX} characters`)
		),
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

export type EditCompanySchema = typeof editCompanySchema;
