// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/schema.ts
import * as v from "valibot";

export const createProposalSchema = v.object({
	description: v.pipe(v.string(), v.minLength(50, "Description must be at least 50 characters"), v.maxLength(2000)),
	proposalType: v.picklist(
		["tax", "hospital", "school", "power_plant", "road", "bridge"],
		"Please select a valid proposal type"
	),

	// Tax-specific fields
	taxType: v.optional(
		v.picklist(["mining", "production", "market_transaction", "income"], "Please select a valid tax type")
	),
	taxRate: v.optional(
		v.pipe(v.number(), v.minValue(1, "Tax rate must be at least 1%"), v.maxValue(50, "Tax rate cannot exceed 50%"))
	),
	taxName: v.optional(v.pipe(v.string(), v.minLength(5), v.maxLength(100))),

	// Building construction fields
	buildingType: v.optional(
		v.picklist(["hospital", "school", "power_plant", "road", "bridge"], "Please select a valid building type")
	),
	regionId: v.optional(v.string("Please select a region")),
	buildingName: v.optional(v.pipe(v.string(), v.minLength(5), v.maxLength(100))),
	estimatedCost: v.optional(v.pipe(v.number(), v.minValue(1000, "Cost must be at least 1,000 currency")))
});

export type CreateProposalSchema = v.InferOutput<typeof createProposalSchema>;
