// src/routes/(authenticated)/(dock)/state/new/schema.ts
import * as v from "valibot";

export const foundStateSchema = v.object({
	name: v.pipe(
		v.string("State name is required"),
		v.minLength(3, "State name must be at least 3 characters"),
		v.maxLength(100, "State name must be less than 100 characters"),
		v.trim()
	),
	regionId: v.pipe(v.string("Region is required"), v.uuid("Invalid region ID")),
	mapColor: v.pipe(
		v.string("Map color is required"),
		v.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #FF5733)")
	),
	logo: v.optional(v.pipe(v.string(), v.url("Logo must be a valid URL"))),
	description: v.optional(
		v.pipe(v.string(), v.maxLength(500, "Description must be less than 500 characters"), v.trim())
	)
});

export type FoundStateSchema = v.InferOutput<typeof foundStateSchema>;
