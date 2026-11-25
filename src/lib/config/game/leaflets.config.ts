// Psyops leaflets: pre-written propaganda instead of free text. Each template
// is filled with the target state's name; "random" lets the print shop pick
// one. Players never type the text, so nothing user-written reaches the
// target's residents.
//
// Pure data and pure functions only (client and server).

export interface LeafletTemplate {
	id: string;
	/** Short label for the picker. */
	label: string;
	/** `{target}` is replaced with the target state's name. */
	text: string;
}

export const LEAFLET_TEMPLATES = [
	{
		id: "abandoned",
		label: "Your leaders abandoned you",
		text: "Citizens of {target}: your leaders eat well tonight. Ask yourself who is paying for it."
	},
	{
		id: "lay_down",
		label: "Lay down your arms",
		text: "Soldiers of {target}, no one will remember why you died. Lay down your arms and go home."
	},
	{
		id: "empty_shelves",
		label: "Empty shelves",
		text: "Empty shelves in {target}, full bank accounts abroad. Your government has already packed its bags."
	},
	{
		id: "lies",
		label: "They are lying to you",
		text: "Everything the radio in {target} told you this week was a lie. Count the coffins, not the slogans."
	},
	{
		id: "winter",
		label: "Winter is coming",
		text: "The power in {target} will fail again this winter. Your leaders have generators. Do you?"
	},
	{
		id: "conscription",
		label: "Next is your son",
		text: "Next month {target} calls up your sons. Hide them, or bury them."
	},
	{
		id: "peace",
		label: "Peace is one signature away",
		text: "Peace is one signature away. The only one refusing to sign sits in the capital of {target}."
	},
	{
		id: "rise",
		label: "Rise up",
		text: "People of {target}, they fear you more than they fear us. Take back your streets."
	}
] as const satisfies readonly LeafletTemplate[];

export type LeafletTemplateId = (typeof LEAFLET_TEMPLATES)[number]["id"];

/** Picker value: let the print shop choose a template at launch. */
export const LEAFLET_RANDOM = "random";

export const isLeafletTemplate = (id: string): id is LeafletTemplateId => LEAFLET_TEMPLATES.some((t) => t.id === id);

/** A template's text for one target. */
export function fillLeaflet(id: LeafletTemplateId, targetName: string): string {
	const t = LEAFLET_TEMPLATES.find((x) => x.id === id) ?? LEAFLET_TEMPLATES[0];
	return t.text.replaceAll("{target}", targetName);
}

/**
 * Resolve a picker value to a template id: a known id is kept, "random" (or
 * nothing) draws one with `rng`. Anything else is rejected (null), so a forged
 * form can't smuggle in custom text.
 */
export function resolveLeaflet(choice: string | null | undefined, rng: () => number): LeafletTemplateId | null {
	if (!choice || choice === LEAFLET_RANDOM) {
		const i = Math.min(LEAFLET_TEMPLATES.length - 1, Math.floor(rng() * LEAFLET_TEMPLATES.length));
		return LEAFLET_TEMPLATES[i].id;
	}
	return isLeafletTemplate(choice) ? choice : null;
}
