// src/routes/(authenticated)/(dock)/state/[id]/proposal/create/schema.ts
import * as v from "valibot";

export const createProposalSchema = v.object({
	title: v.pipe(v.string(), v.minLength(10, "Title must be at least 10 characters"), v.maxLength(200)),
	description: v.pipe(v.string(), v.minLength(50, "Description must be at least 50 characters"), v.maxLength(2000)),
	proposalType: v.picklist(
		["budget", "tax", "infrastructure", "education", "defense", "healthcare", "environment", "justice", "general"],
		"Please select a valid proposal type"
	),
	votingDays: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(30)), 7),
	requiredMajority: v.optional(v.pipe(v.number(), v.minValue(50), v.maxValue(100)), 50),

	// Tax-specific fields (only required if proposalType is "tax")
	taxType: v.optional(
		v.picklist(["mining", "production", "market_transaction", "income"], "Please select a valid tax type")
	),
	taxRate: v.optional(
		v.pipe(v.number(), v.minValue(1, "Tax rate must be at least 1%"), v.maxValue(50, "Tax rate cannot exceed 50%"))
	),
	taxName: v.optional(v.pipe(v.string(), v.minLength(5), v.maxLength(100)))
});

export type CreateProposalSchema = v.InferOutput<typeof createProposalSchema>;
