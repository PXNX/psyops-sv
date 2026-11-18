// Client helpers shared by the chat list and the conversation views.

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

const pad = (n: number) => String(n).padStart(2, "0");

export const clockTime = (iso: string) => {
	const d = new Date(iso);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const dayKey = (iso: string) => {
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function daysAgo(d: Date) {
	const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	return Math.round((start(new Date()) - start(d)) / 86_400_000);
}

/** Day separator in a conversation: Today, Yesterday, Monday, 3 March, 3 March 2024. */
export function dayLabel(iso: string) {
	const d = new Date(iso);
	const ago = daysAgo(d);
	if (ago === 0) return "Today";
	if (ago === 1) return "Yesterday";
	if (ago > 1 && ago < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
	const sameYear = d.getFullYear() === new Date().getFullYear();
	return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: sameYear ? undefined : "numeric" });
}

/** Time in the conversation list: 14:05, Yesterday, Mon, 03.03.24. */
export function listTime(iso: string) {
	const d = new Date(iso);
	const ago = daysAgo(d);
	if (ago === 0) return clockTime(iso);
	if (ago === 1) return "Yesterday";
	if (ago > 1 && ago < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
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
