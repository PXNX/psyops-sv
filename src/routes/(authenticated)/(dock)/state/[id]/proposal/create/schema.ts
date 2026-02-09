// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/schema.ts
import * as v from "valibot";

export const createProposalSchema = v.object({
	proposalType: v.picklist(
		["tax", "hospital", "school", "power_plant", "infrastructure", "fortifications", "border_control"],
		"Please select a valid proposal type"
	),

	// Tax-specific fields
	taxType: v.optional(
		v.picklist(["mining", "production", "market_transaction", "income"], "Please select a valid tax type")
	),
	taxRate: v.optional(
		v.pipe(v.number(), v.minValue(1, "Tax rate must be at least 1%"), v.maxValue(50, "Tax rate cannot exceed 50%"))
	),

	// Building construction fields (includes fortifications)
	regionId: v.optional(v.string("Please select a region")),
	buildingName: v.optional(v.pipe(v.string(), v.minLength(5), v.maxLength(100))),
	quantity: v.optional(
		v.pipe(v.number(), v.minValue(1, "Quantity must be at least 1"), v.maxValue(100, "Maximum 100 buildings at once"))
	),

	// Border control fields
	borderStatus: v.optional(v.picklist(["open", "closed"], "Please select a valid border status"))
});

export type CreateProposalSchema = v.InferOutput<typeof createProposalSchema>;
