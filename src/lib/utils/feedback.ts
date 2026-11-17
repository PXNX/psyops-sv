// src/lib/utils/feedback.ts
// Sound + haptic feedback for success moments, following the words-sv pattern:
// soft notes synthesized with Web Audio (no asset downloads, works offline) and
// the device's vibration motor / Telegram Mini App haptics. Both channels can be
// muted in localStorage so a user on a quiet night shift can silence the war room.
export type FeedbackKind = "tap" | "success" | "win" | "error" | "coin";

const SOUND_NOTES: Record<FeedbackKind, number[]> = {
	tap: [660],
	success: [523.25, 783.99],
	win: [523.25, 659.25, 783.99, 1046.5],
	error: [329.63, 246.94],
	coin: [987.77, 1318.51]
};

// Vibration API patterns in milliseconds: buzz, pause, buzz, …
const HAPTIC_PATTERNS: Record<FeedbackKind, number | number[]> = {
	tap: 8,
	success: [16, 40, 22],
	win: [24, 28, 40, 28, 70],
	error: [55, 30, 35],
	coin: [12, 30, 12]
};

interface FeedbackPrefs {
	sound: boolean;
	haptics: boolean;
}

const STORAGE_KEY = "psyops:feedback";

function loadPrefs(): FeedbackPrefs {
	if (typeof localStorage === "undefined") return { sound: true, haptics: true };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { sound: true, haptics: true };
		const parsed = JSON.parse(raw) as Partial<FeedbackPrefs>;
		return { sound: parsed.sound !== false, haptics: parsed.haptics !== false };
	} catch {
		return { sound: true, haptics: true };
	}
}

let prefs = loadPrefs();

export function setFeedbackEnabled(channel: "sound" | "haptics", enabled: boolean): void {
	prefs = { ...prefs, [channel]: enabled };
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// Private mode: the preference just won't survive a reload.
	}
}

export function isFeedbackEnabled(channel: "sound" | "haptics"): boolean {
	return prefs[channel];
}

type TelegramHaptics = {
	impactOccurred: (style: "light" | "medium" | "heavy") => void;
	notificationOccurred: (type: "error" | "success" | "warning") => void;
};

function haptic(kind: FeedbackKind): void {
	if (!prefs.haptics || typeof window === "undefined") return;
	// Telegram Mini App haptics first, then the Vibration API.
	const telegram = (window as { Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptics } } }).Telegram?.WebApp
		?.HapticFeedback;
	if (telegram) {
		if (kind === "error") telegram.notificationOccurred("error");
		else if (kind === "success" || kind === "win") telegram.notificationOccurred("success");
		else telegram.impactOccurred("light");
		return;
	}
	try {
		navigator.vibrate?.(HAPTIC_PATTERNS[kind]);
	} catch {
		// Some browsers throw on vibration patterns; feedback stays optional.
	}
}

function playNotes(notes: number[]): void {
	const legacyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
	const AudioContextClass = window.AudioContext ?? legacyWindow.webkitAudioContext;
	if (!AudioContextClass) return;
	try {
		const context = new AudioContextClass();
		if (context.state === "suspended") void context.resume();
		const start = context.currentTime;
		notes.forEach((frequency, index) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = "triangle";
			oscillator.frequency.setValueAtTime(frequency, start + index * 0.075);
			gain.gain.setValueAtTime(0.0001, start + index * 0.075);
			gain.gain.exponentialRampToValueAtTime(0.06, start + index * 0.075 + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.075 + 0.16);
			oscillator.connect(gain).connect(context.destination);
			oscillator.start(start + index * 0.075);
			oscillator.stop(start + index * 0.075 + 0.18);
		});
		window.setTimeout(() => void context.close(), 430);
	} catch {
		// Audio is optional and must never break the action that triggered it.
	}
}

/** Play the haptic + sound for a moment. Both channels honour the stored prefs. */
export function feedback(kind: FeedbackKind): void {
	haptic(kind);
	if (!prefs.sound || typeof window === "undefined") return;
	playNotes(SOUND_NOTES[kind]);
}
