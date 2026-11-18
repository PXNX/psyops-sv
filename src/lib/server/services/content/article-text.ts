// Plain-text views of an article's HTML body for cards and front pages:
// a short excerpt, the first image (if any) as a cover, and a reading time.

const ENTITIES: Record<string, string> = {
	"&nbsp;": " ",
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'"
};

/** The article body as one line of plain text. */
export function plainText(html: string | null | undefined): string {
	return (html ?? "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m)
		.replace(/\s+/g, " ")
		.trim();
}

/** First words of the body, cut at a word boundary. */
export function excerpt(html: string | null | undefined, max = 220): string {
	const text = plainText(html);
	return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
}

/** The first http(s) image in the body, used as the card's cover. */
export function coverImage(html: string | null | undefined): string | null {
	const src = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(html ?? "")?.[1];
	return src && /^https?:\/\//i.test(src) ? src : null;
}

/** Minutes to read at ~220 words a minute, at least one. */
export function readingMinutes(html: string | null | undefined): number {
	const words = plainText(html).split(" ").filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}
