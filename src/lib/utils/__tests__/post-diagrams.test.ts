import { describe, expect, it } from "@rstest/core";
import { splitDiagrams } from "../post-diagrams.js";

describe("post diagrams", () => {
	it("keeps ordinary post HTML in one segment", () => {
		const html = "<p>Hello <strong>world</strong></p>";
		expect(splitDiagrams(html)).toEqual([{ kind: "html", html }]);
	});

	it("extracts mermaid code blocks and decodes entities", () => {
		const html = '<p>Intro</p><pre class="p-4"><code class="language-mermaid">graph TD\n    A--&gt;B</code></pre><p>Outro</p>';
		const segments = splitDiagrams(html);
		expect(segments.map((s) => s.kind)).toEqual(["html", "mermaid", "html"]);
		expect(segments[1]).toEqual({ kind: "mermaid", chart: "graph TD\n    A-->B" });
		expect(segments[2]).toEqual({ kind: "html", html: "<p>Outro</p>" });
	});

	it("leaves other languages as plain HTML", () => {
		const html = '<pre><code class="language-js">const a = 1;</code></pre>';
		expect(splitDiagrams(html)).toEqual([{ kind: "html", html }]);
	});

	it("turns YouTube watch links into safe player segments", () => {
		const html = '<p>Watch</p><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">video</a>';
		const segments = splitDiagrams(html);
		expect(segments[1]).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ" });
	});

	it("ignores non-YouTube links and invalid ids", () => {
		const html = '<a href="https://evil.test/watch?v=dQw4w9WgXcQ">x</a>';
		expect(splitDiagrams(html)).toEqual([{ kind: "html", html }]);
	});
});
