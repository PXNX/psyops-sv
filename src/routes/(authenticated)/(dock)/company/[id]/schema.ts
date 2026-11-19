// src/routes/(authenticated)/(dock)/company/[id]/schema.ts
import * as v from "valibot";
import { SCHEMA_LIMITS } from "#lib/config/validation/schema-limits.js";

export const editCompanySchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string("Company name is required"),
			v.minLength(
				SCHEMA_LIMITS.MIN_NAME_LENGTH,
				`Company name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`
			),
			v.maxLength(
				SCHEMA_LIMITS.COMPANY_NAME_MAX,
				`Company name must be at most ${SCHEMA_LIMITS.COMPANY_NAME_MAX} characters`
			)
		),
		description: v.optional(v.string(), ""),
		logo: v.optional(
			v.pipe(
				v.file("Logo must be a file"),
				v.mimeType(["image/jpeg", "image/png", "image/webp", "image/gif"], "Logo must be an image"),
				v.maxSize(
					SCHEMA_LIMITS.LOGO_MAX_SIZE_MB * 1024 * 1024,
					`Logo must be less than ${SCHEMA_LIMITS.LOGO_MAX_SIZE_MB}MB`
				)
			)
		)
	})
);

export type EditCompanySchema = typeof editCompanySchema;

// Declare a dividend: whole currency per share, paid from the company budget.
export const declareDividendSchema = v.object({
	perShare: v.pipe(
		v.number("Enter an amount per share"),
		v.integer("Dividends are paid in whole currency per share"),
		v.minValue(1, "At least $1 per share"),
		v.maxValue(1_000_000_000, "That's more than any budget holds")
	)
});

// Automatic dividend policy: pay ratio% of the budget above the reserve each cycle.
export const dividendPolicySchema = v.object({
	ratioPercent: v.pipe(
		v.number("Enter a payout ratio"),
		v.integer("Whole percent only"),
		v.minValue(0, "0% to 100%"),
		v.maxValue(100, "0% to 100%")
	),
	reserve: v.pipe(
		v.number("Enter a reserve"),
		v.integer("Whole currency only"),
		v.minValue(0, "The reserve can't be negative")
	)
});
