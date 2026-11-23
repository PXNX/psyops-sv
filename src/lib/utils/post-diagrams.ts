// Splits sanitized article HTML into plain HTML and Mermaid code blocks so
// the shared Mermaid component can render diagrams inline in posts.
// Pure (no DOM) so it runs identically during SSR and in the browser.

export type PostSegment =
	| { kind: "html"; html: string }
	| { kind: "mermaid"; chart: string }
	| { kind: "youtube"; id: string }
	| { kind: "link"; html: string; href: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INTERNAL_LINK = /^\/(posts|user|region|state|bloc|party)\//;

/** Only plain YouTube watch/share links become players; arbitrary iframes are
 *  never accepted from user content. */
export function youtubeId(href: string): string | null {
	try {
		const url = new URL(href);
		const host = url.hostname.replace(/^www\./, "");
		if (host === "youtu.be") {
			const id = url.pathname.slice(1);
			return YOUTUBE_ID.test(id) ? id : null;
		}
		if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "www.youtube.com") return null;
		if (url.pathname !== "/watch") return null;
		const id = url.searchParams.get("v") ?? "";
		return YOUTUBE_ID.test(id) ? id : null;
	} catch {
		return null;
	}
}

const NAMED: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " "
};

function decodeEntities(value: string): string {
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
		if (entity[0] === "#") {
			const numeric = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
			return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : whole;
		}
		return NAMED[entity.toLowerCase()] ?? whole;
	});
}

/** `language-mermaid` survives sanitization, so Tiptap code blocks are enough.
 *  YouTube watch links are upgraded to privacy-friendly players as well. */
export function splitDiagrams(safeHtml: string): PostSegment[] {
	const segments: PostSegment[] = [];
	const block = /<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>|<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = block.exec(safeHtml))) {
		let segment: PostSegment | null = null;
		if (match[1] !== undefined && /language-mermaid\b/i.test(match[1])) {
			segment = { kind: "mermaid", chart: decodeEntities(match[2] ?? "").trim() };
		} else if (match[3] !== undefined) {
			const href = decodeEntities(match[3]);
			const id = youtubeId(href);
			if (id) segment = { kind: "youtube", id };
			else if (INTERNAL_LINK.test(href)) segment = { kind: "link", html: match[0], href };
		}
		if (!segment) continue;
		segments.push({ kind: "html", html: safeHtml.slice(last, match.index) });
		segments.push(segment);
		last = match.index + match[0].length;
	}
	if (last < safeHtml.length) segments.push({ kind: "html", html: safeHtml.slice(last) });
	return segments;
}
