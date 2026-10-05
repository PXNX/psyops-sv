import { docs } from "#lib/docs/index.js";

// Docs are static content and can be prerendered.
export const prerender = true;

export function load() {
	return { docs };
}
