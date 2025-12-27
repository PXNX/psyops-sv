// src/routes/party/create/schema.ts
import * as v from "valibot";

export const createPartySchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Party name is required"),
			v.minLength(3, "Party name must be at least 3 characters"),
			v.maxLength(100, "Party name must be at most 100 characters")
		),
		abbreviation: v.optional(
			v.pipe(
				v.string(),
				v.regex(/^[a-zA-Z0-9]*$/, "Abbreviation must be alphanumeric only"),
				v.maxLength(5, "Abbreviation must be 5 characters or less")
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
				v.maxSize(5 * 1024 * 1024, "Logo must be less than 5MB")
			)
		)
	})
);

export type CreatePartySchema = typeof createPartySchema;
