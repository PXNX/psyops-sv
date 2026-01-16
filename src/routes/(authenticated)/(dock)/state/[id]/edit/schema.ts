// src/routes/(authenticated)/(dock)/state/[id]/edit/schema.ts
import * as v from "valibot";

export const editStateSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(3, "Name must be at least 3 characters"),
		v.maxLength(100, "Name must be less than 100 characters")
	),
	background: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"))
});
