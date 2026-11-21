// Shared display labels for moderation data (safe to import in Svelte components).
export const ACTION_LABELS: Record<string, string> = {
	message_delete: "Message removed",
	warning: "Warning issued",
	restriction: "Chat restricted",
	report_action: "Report resolved",
	content_flag: "Content flagged"
};

export const ACTION_TONES: Record<string, "red" | "amber" | "green" | "blue" | "purple" | "neutral"> = {
	message_delete: "red",
	warning: "amber",
	restriction: "red",
	report_action: "green",
	content_flag: "purple"
};

export const VIOLATION_LABELS: Record<string, string> = {
	insult: "Insults / harassment",
	spam: "Spam",
	pornography: "Pornographic content",
	hate_speech: "Hate speech / illegal symbols",
	graphic_violence: "Graphic violence",
	privacy_violation: "Privacy violation",
	other: "Other"
};

export const REPORT_ACTION_LABELS: Record<string, string> = {
	warning: "Warning issued",
	message_delete: "Message removed",
	restriction: "Chat restricted",
	ban: "User banned",
	name_reset: "Name reset",
	logo_reset: "Logo reset"
};

export function humanize(value: string | null | undefined): string {
	if (!value) return "—";
	return value
		.replace(/[_-]/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}
