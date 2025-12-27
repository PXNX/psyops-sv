// src/routes/bloc/[id]/edit/schema.ts
import * as v from "valibot";

export const editBlocSchema = v.object({
	name: v.pipe(
		v.string("Bloc name is required"),
		v.minLength(3, "Bloc name must be at least 3 characters"),
		v.maxLength(100, "Bloc name must be at most 100 characters")
	),
	color: v.pipe(v.string("Color is required"), v.hexColor("Invalid color format - must be a hex color like #FF5733")),
	description: v.optional(v.string(), "")
});

export type EditBlocSchema = typeof editBlocSchema;
