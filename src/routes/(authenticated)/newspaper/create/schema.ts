import { FILETYPE_PATTERN } from "$lib/util";
import { config, maxLength, minLength, object, optional, pipe, regex, string, url } from "valibot";

export const newspaperSchema = config(
	object({
		name: pipe(string(), minLength(3), maxLength(40)),
		avatar: pipe(string(), url(), regex(FILETYPE_PATTERN)),
		background: optional(pipe(string(), url(), regex(FILETYPE_PATTERN, "Invalid URL: Has to end on .jpg")))
	}),
	{ abortPipeEarly: true }
);
export type NewspaperSchema = typeof newspaperSchema;
