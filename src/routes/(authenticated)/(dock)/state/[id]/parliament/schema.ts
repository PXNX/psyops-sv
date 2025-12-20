// src/routes/(authenticated)/(dock)/state/[id]/parliament/schema.ts
import * as v from "valibot";

export const createProposalSchema = v.object({
	title: v.pipe(
		v.string(),
		v.minLength(5, "Title must be at least 5 characters"),
		v.maxLength(200, "Title must be less than 200 characters")
	),
	description: v.pipe(
		v.string(),
		v.minLength(20, "Description must be at least 20 characters"),
		v.maxLength(2000, "Description must be less than 2000 characters")
	),
	proposalType: v.picklist([
		"budget",
		"tax",
		"infrastructure",
		"education",
		"defense",
		"healthcare",
		"environment",
		"justice",
		"general"
	]),
	votingDays: v.pipe(
		v.number(),
		v.minValue(1, "Voting period must be at least 1 day"),
		v.maxValue(30, "Voting period cannot exceed 30 days")
	),
	requiredMajority: v.pipe(
		v.number(),
		v.minValue(50, "Required majority must be at least 50%"),
		v.maxValue(100, "Required majority cannot exceed 100%")
	)
});
