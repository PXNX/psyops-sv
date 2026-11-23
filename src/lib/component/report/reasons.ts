/** The one canonical set of report reasons. Chat messages, player profiles
 *  and comments all offer exactly this selection, and the values match the
 *  `violation_reason` enum in the database. */
export const REPORT_REASONS = [
	{ value: "insult", label: "Insults or harassment" },
	{ value: "spam", label: "Spam or advertising" },
	{ value: "hate_speech", label: "Hate speech" },
	{ value: "pornography", label: "Pornography or sexual content" },
	{ value: "graphic_violence", label: "Graphic violence" },
	{ value: "privacy_violation", label: "Privacy violation" },
	{ value: "other", label: "Other" }
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
