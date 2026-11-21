// Small URL guards shared by the post editor and the article sanitizer.
// Deliberately dependency-free so it can be imported into the browser editor
// without pulling in a DOM shim.

/** Absolute http(s) URL only — never javascript:, data:, vbscript:, file:, etc. */
export function isSafeHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

/** Links may also be relative in-app paths, fragments or mailto. */
export function isSafeLinkUrl(value: string): boolean {
	if (/^(mailto:)/i.test(value)) return true;
	if (/^(\/|#|\?)/.test(value)) return true;
	return isSafeHttpUrl(value);
}
