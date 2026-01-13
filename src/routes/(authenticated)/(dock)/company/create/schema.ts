// src/routes/company/create/schema.ts
import * as v from "valibot";

export const createCompanySchema = v.object({
	name: v.pipe(
		v.string("Company name is required"),
		v.minLength(3, "Company name must be at least 3 characters"),
		v.maxLength(50, "Company name must be at most 50 characters")
	),
	description: v.optional(
		v.pipe(
			v.string(),
			v.maxLength(500, "Description must be at most 500 characters")
		),
		""
	),
	logo: v.optional(
		v.pipe(
			v.file("Logo must be a file"),
			v.mimeType(
				["image/jpeg", "image/png", "image/webp", "image/gif"],
				"Logo must be an image"
			),
			v.maxSize(5 * 1024 * 1024, "Logo must be less than 5MB")
		)
	)
});

export type CreateCompanySchema = typeof createCompanySchema;