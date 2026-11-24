// src/routes/(authenticated)/(dock)/domains/shared.ts
// Small helpers shared by the domain panels: the planner type, the form
// submit handler (toast on failure, confetti on success) and number formats.
import type { SubmitFunction } from "$app/forms";
import { toastResult } from "#lib/ui/toast.svelte.js";
import { celebrate } from "#lib/utils/celebrate.js";
import type { BadgeTone } from "#lib/component/ui/index.js";
import type { PageData } from "./$types";

export type Planner = NonNullable<PageData["planner"]>;
export type StateOption = { id: number; name: string };

/** Enhance handler for every order form on the page. */
export const submitOrder: SubmitFunction = ({ formElement }) => {
	return async ({ result, update }) => {
		await update({ reset: false });
		toastResult(result);
		if (result.type === "success") celebrate(formElement);
	};
};

export const pct = (v: number | null | undefined, fallback = 0) => Math.round((v ?? fallback) * 100);
export const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

/** "landing_ship" → "Landing ship" for enum values without a config label. */
export const humanize = (v: string) => {
	const s = v.replace(/_/g, " ");
	return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Badge tone for an operation / convoy / run outcome. */
export function outcomeTone(outcome: string): BadgeTone {
	if (outcome === "success" || outcome === "delivered" || outcome === "operational") return "green";
	if (outcome === "partial" || outcome === "damaged") return "amber";
	return "red";
}

/** Meter tone for a 0–1 health/flow value. */
export const levelTone = (v: number) => (v >= 0.85 ? "bg-positive" : v >= 0.5 ? "bg-warning" : "bg-error");

/** Hours until a timestamp, rounded up (0 when past). */
export const hoursLeft = (to: Date | string) =>
	Math.max(0, Math.ceil((new Date(to).getTime() - Date.now()) / 3_600_000));

export type DomainStatus = "ok" | "degraded" | "idle";
