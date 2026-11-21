// Sanitises the HTML that makes up an article body before it is stored or
// rendered. Article bodies come from a rich-text editor, but the publish
// actions accept raw form data, so we can't trust the markup we get back.
//
// Runs both on the server (isomorphic-dompurify uses a DOM shim there) and in
// the browser (native DOMParser), so the same rules apply everywhere.

import DOMPurify from "isomorphic-dompurify";
import { isSafeHttpUrl, isSafeLinkUrl } from "./url-safety.js";

export { isSafeHttpUrl, isSafeLinkUrl } from "./url-safety.js";

// Tags the editor can produce. Anything else (script, iframe, svg, form, …)
// is dropped by the allowlist rather than by a fragile blocklist.
const ALLOWED_TAGS = [
	"p",
	"br",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"strong",
	"b",
	"em",
	"i",
	"s",
	"del",
	"u",
	"code",
	"pre",
	"blockquote",
	"ul",
	"ol",
	"li",
	"hr",
	"table",
	"thead",
	"tbody",
	"tfoot",
	"tr",
	"th",
	"td",
	"a",
	"img",
	"span",
	"div"
];

const ALLOWED_ATTR = [
	"href",
	"src",
	"alt",
	"title",
	"width",
	"height",
	"class",
	"colspan",
	"rowspan",
	"colwidth",
	"target",
	"rel",
	"loading",
	"decoding",
	"referrerpolicy",
	"data-external-link"
];

/** An absolute web link points outside the app (in-app links are relative). */
function isExternalLink(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

let hookInstalled = false;
function installHook() {
	if (hookInstalled) return;
	hookInstalled = true;

	DOMPurify.addHook("afterSanitizeAttributes", (node) => {
		const el = node as Element;
		if (typeof el.getAttribute !== "function") return;

		if (el.tagName === "IMG") {
			// Images are only ever loaded from an external http(s) URL.
			const src = el.getAttribute("src");
			if (!src || !isSafeHttpUrl(src)) {
				el.removeAttribute("src");
			} else {
				el.setAttribute("referrerpolicy", "no-referrer");
				el.setAttribute("loading", "lazy");
				el.setAttribute("decoding", "async");
			}
			el.removeAttribute("srcset");
			el.removeAttribute("onerror");
		}

		if (el.tagName === "A") {
			const href = el.getAttribute("href");
			if (!href || !isSafeLinkUrl(href)) {
				el.removeAttribute("href");
			} else if (isExternalLink(href)) {
				el.setAttribute("target", "_blank");
				el.setAttribute("rel", "noopener noreferrer");
				el.setAttribute("data-external-link", "true");
			}
		}
	});
}

export interface SanitizeOptions {
	/** When false, images are replaced with a placeholder instead of loaded. */
	loadImages?: boolean;
}

export function sanitizeArticleHtml(html: string | null | undefined, options: SanitizeOptions = {}): string {
	installHook();
	const clean = DOMPurify.sanitize(html ?? "", {
		ALLOWED_TAGS,
		ALLOWED_ATTR
	});

	if (options.loadImages === false) {
		// The string is already sanitised, so matching complete <img> tags here
		// is safe. Keeping a placeholder preserves the flow of the article.
		return clean.replace(
			/<img\b[^>]*>/gi,
			'<span class="article-image-placeholder">🖼 Image hidden — enable images in your settings to view it.</span>'
		);
	}
	return clean;
}
