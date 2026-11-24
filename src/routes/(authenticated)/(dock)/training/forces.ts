// Shared helpers for the Forces page: proper unit names, form plumbing and
// the little time maths the roster and drill yard both need.
import type { SubmitFunction } from "$app/forms";
import * as m from "#lib/paraglide/messages.js";
import { AIRCRAFT } from "#lib/config/index.js";
import { toastResult } from "#lib/ui/toast.svelte.js";
import { celebrate } from "#lib/utils/celebrate.js";

// Unit types without a translated message still need a proper name.
const EXTRA_LABELS: Record<string, string> = {
	marine: "Marines",
	frigate: "Frigate",
	submarine: "Submarine",
	carrier: "Aircraft Carrier",
	landing_ship: "Landing Ship"
};

/** "Fighter Jet", "Marines" — never a raw enum value. */
export function unitLabel(unitType: string): string {
	const msg = (m as unknown as Record<string, (() => string) | undefined>)[unitType];
	if (typeof msg === "function") return msg();
	return (
		EXTRA_LABELS[unitType] ??
		(AIRCRAFT as Record<string, { label: string } | undefined>)[unitType]?.label ??
		unitType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

export type Service = "army" | "navy" | "aviation";
export const SERVICE_DOMAIN = { army: "land", navy: "sea", aviation: "air" } as const;

/**
 * Form enhance: busy flag while in flight, failures as a toast, a quiet
 * celebration on success (no success toasts).
 */
export function act(
	opts: {
		busy?: (v: boolean) => void;
		glow?: () => HTMLElement | undefined | null;
		/** Runs after a successful submit. */ after?: () => void;
	} = {}
): SubmitFunction {
	return () => {
		opts.busy?.(true);
		return async ({ update, result }) => {
			await update();
			opts.busy?.(false);
			if (result.type === "success") {
				opts.after?.();
				celebrate(opts.glow?.());
			} else toastResult(result);
		};
	};
}

export function progressBetween(now: number, start: Date | string | null, end: Date | string | null): number {
	if (!start || !end) return 0;
	const s = new Date(start).getTime();
	const e = new Date(end).getTime();
	return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
}

export function timeLeft(now: number, end: Date | string | null): string {
	if (!end) return "";
	const diff = new Date(end).getTime() - now;
	if (diff <= 0) return "Ready";
	const hours = Math.floor(diff / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);
	return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
