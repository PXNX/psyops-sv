// src/routes/factory/[id]/edit/schema.ts
import * as v from "valibot";

export const editFactorySchema = v.object({
	name: v.pipe(
		v.string("Factory name is required"),
		v.minLength(3, "Factory name must be at least 3 characters"),
		v.maxLength(100, "Factory name must be at most 100 characters")
	),
	workerWage: v.pipe(
		v.number("Wage must be a number"),
		v.minValue(100, "Minimum wage is 100 currency"),
		v.maxValue(1000000, "Maximum wage is 1,000,000 currency")
	)
});

export type EditFactorySchema = typeof editFactorySchema;
