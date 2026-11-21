// Client helpers shared by the chat list and the conversation views.
import { dtgDate, dtgDayKey, dtgDaysAgo, dtgTime } from "#lib/utils/dtg.js";

export interface ChatMessage {
	id: number;
	content: string;
	sentAt: string;
	senderId: string;
	senderName: string;
	senderLogo?: string | null;
	senderPartyAbbreviation?: string | null;
	senderPartyColor?: string | null;
	isFromCurrentUser: boolean;
	isLeader?: boolean;
}

export const clockTime = (iso: string) => dtgTime(iso);

export const dayKey = (iso: string) => dtgDayKey(iso);

/** Day separator in a conversation: Today, Yesterday, weekday, or a NATO date. */
export function dayLabel(iso: string) {
	const ago = dtgDaysAgo(iso);
	if (ago === 0) return "Today";
	if (ago === 1) return "Yesterday";
	if (ago > 1 && ago < 7) return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
	return dtgDate(iso);
}

/** Time in the conversation list: 14:05, Yesterday, Mon, or 03 NOV 2026. */
export function listTime(iso: string) {
	const ago = dtgDaysAgo(iso);
	if (ago === 0) return dtgTime(iso);
	if (ago === 1) return "Yesterday";
	if (ago > 1 && ago < 7) return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
	return dtgDate(iso);
}

/** Splits text into plain runs and http(s) links. */
export function linkify(content: string) {
	return content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => ({ link: i % 2 === 1, text: part }));
}

export const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);

const EMOJI_ONLY =
	/^(?:\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]*(?:‍\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]*)*\s*){1,3}$/u;

/** One to three emoji and nothing else: shown large, without a bubble. */
export const isEmojiOnly = (content: string) => EMOJI_ONLY.test(content.trim());

// Last-seen times per conversation, kept in this browser. There is no
// server-side read state, so this drives the unread dots in the list.
const SEEN_KEY = "psyops.chat.seen";

export function readSeen(): Record<string, string> {
	try {
		return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") ?? {};
	} catch {
		return {};
	}
}

export function markSeen(conversation: string, iso: string) {
	try {
		const seen = readSeen();
		if (seen[conversation] && seen[conversation] >= iso) return;
		seen[conversation] = iso;
		localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
	} catch {
		// Storage blocked: unread dots just stay off.
	}
}
