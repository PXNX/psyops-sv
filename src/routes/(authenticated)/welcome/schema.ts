import { FILETYPE_PATTERN } from "$lib/util";
import { config, maxLength, minLength, object, pipe, regex, string, url, type InferInput } from "valibot";

export const welcomeSchema = config(
	object({
		name: pipe(string(), minLength(3), maxLength(40)),
		avatar: pipe(string(), url(), regex(FILETYPE_PATTERN))
	}),
	{ abortPipeEarly: true }
);
export type WelcomeSchema = InferInput<typeof welcomeSchema>;
