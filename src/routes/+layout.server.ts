import type { LayoutServerLoad } from "./$types";

//TODO: Add your own language detection logic, so that when HL is detected, it's set as cookie and used for translation
const langParam = "hl"; // or maybe better to let user set it and have en default

export const load = (async (event) => {
	return event.data;
}) satisfies LayoutServerLoad;
