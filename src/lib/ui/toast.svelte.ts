// src/lib/ui/toast.svelte.ts
// App-wide toast notifications: short, non-blocking messages that slide in
// above the dock and dismiss themselves. Replaces window.alert(), which blocks
// the whole page and looks like a browser error rather than part of the game.
//
//   import { toast } from "#lib/ui/toast.svelte.js";
//   toast.success("Visa purchased");
//   toast.error("Insufficient funds");
import { feedback, type FeedbackKind } from "#lib/utils/feedback.js";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface Toast {
	id: number;
	tone: ToastTone;
	message: string;
	/** Milliseconds before it hides itself; 0 keeps it until dismissed. */
	duration: number;
}

interface ToastOptions {
	duration?: number;
	/** Play the matching sound/haptic. Defaults to true for success and error. */
	feedback?: boolean;
}

const DEFAULT_DURATION: Record<ToastTone, number> = {
	success: 3200,
	info: 3600,
	warning: 5000,
	error: 5500
};

const FEEDBACK: Partial<Record<ToastTone, FeedbackKind>> = { success: "success", error: "error" };

/** Never show more than this many at once; the oldest give way. */
export const MAX_TOASTS = 3;

class ToastStore {
	items = $state<Toast[]>([]);
	#nextId = 1;
	#timers = new Map<number, ReturnType<typeof setTimeout>>();
	/** When each running timer fires, and time left for held ones. */
	#deadlines = new Map<number, number>();
	#remaining = new Map<number, number>();

	show(tone: ToastTone, message: string, options: ToastOptions = {}): number {
		const text = message.trim();
		if (!text) return -1;

		// The same message again (double submit, retry) replaces the visible one
		// rather than stacking a duplicate, so its timer and fuse start over.
		const existing = this.items.find((t) => t.tone === tone && t.message === text);
		if (existing) this.dismiss(existing.id);

		const duration = options.duration ?? DEFAULT_DURATION[tone];
		const id = this.#nextId++;
		const next = [...this.items, { id, tone, message: text, duration }];
		for (const dropped of next.slice(0, -MAX_TOASTS)) this.dismiss(dropped.id);
		this.items = next.slice(-MAX_TOASTS);
		this.#schedule(id, duration);

		const kind = FEEDBACK[tone];
		if (kind && options.feedback !== false && typeof window !== "undefined") feedback(kind);
		return id;
	}

	success = (message: string, options?: ToastOptions) => this.show("success", message, options);
	error = (message: string, options?: ToastOptions) => this.show("error", message, options);
	info = (message: string, options?: ToastOptions) => this.show("info", message, options);
	warning = (message: string, options?: ToastOptions) => this.show("warning", message, options);

	dismiss = (id: number) => {
		clearTimeout(this.#timers.get(id));
		this.#timers.delete(id);
		this.#deadlines.delete(id);
		this.#remaining.delete(id);
		this.items = this.items.filter((t) => t.id !== id);
	};

	/** Pause auto-dismiss while the user is hovering or touching a toast. */
	hold = (id: number) => {
		const deadline = this.#deadlines.get(id);
		if (deadline === undefined) return;
		clearTimeout(this.#timers.get(id));
		this.#timers.delete(id);
		this.#deadlines.delete(id);
		this.#remaining.set(id, Math.max(0, deadline - Date.now()));
	};

	/** Resume after hold() with exactly the time that was left (the fuse resumes too). */
	release = (id: number) => {
		const left = this.#remaining.get(id);
		if (left === undefined) return;
		this.#remaining.delete(id);
		this.#schedule(id, Math.max(left, 600));
	};

	clear = () => {
		for (const timer of this.#timers.values()) clearTimeout(timer);
		this.#timers.clear();
		this.#deadlines.clear();
		this.#remaining.clear();
		this.items = [];
	};

	#schedule(id: number, duration: number) {
		clearTimeout(this.#timers.get(id));
		if (duration <= 0) return;
		this.#deadlines.set(id, Date.now() + duration);
		this.#timers.set(
			id,
			setTimeout(() => this.dismiss(id), duration)
		);
	}
}

export const toast = new ToastStore();

/**
 * Toast the `message` / `error` a form action returned. Pass it the result
 * inside a `use:enhance` callback:
 *
 *   use:enhance={() => async ({ result, update }) => { await update(); toastResult(result); }}
 */
export function toastResult(result: { type: string; data?: unknown; error?: unknown }) {
	const data = (result.data ?? {}) as { message?: unknown; error?: unknown };
	if (result.type === "success") {
		if (typeof data.message === "string") toast.success(data.message);
	} else if (result.type === "failure") {
		const text = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : null;
		toast.error(text ?? "That didn't work. Please try again.");
	} else if (result.type === "error") {
		toast.error("Something went wrong on our side. Please try again.");
	}
}
