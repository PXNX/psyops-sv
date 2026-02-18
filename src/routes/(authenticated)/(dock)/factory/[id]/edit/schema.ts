// src/routes/factory/[id]/edit/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const editFactorySchema = v.object({
	name: v.pipe(
		v.string("Factory name is required"),
		v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, `Factory name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
		v.maxLength(SCHEMA_LIMITS.FACTORY_NAME_MAX, `Factory name must be at most ${SCHEMA_LIMITS.FACTORY_NAME_MAX} characters`)
	),
	workerWage: v.pipe(
		v.number("Wage must be a number"),
		v.minValue(100, "Minimum wage is 100 currency"),
		v.maxValue(1000000, "Maximum wage is 1,000,000 currency")
	)
});

export type EditFactorySchema = typeof editFactorySchema;
