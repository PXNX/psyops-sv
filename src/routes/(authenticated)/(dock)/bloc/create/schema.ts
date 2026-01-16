// src/routes/(authenticated)/(dock)/bloc/create/schema.ts
import * as v from "valibot";

export const createBlocSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(3, "Name must be at least 3 characters"),
		v.maxLength(100, "Name must be less than 100 characters")
	),
	color: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")),
	description: v.optional(v.pipe(v.string(), v.maxLength(1000, "Description must be less than 1000 characters")), "")
});
