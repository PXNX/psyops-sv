import { describe, expect, it } from "@rstest/core";
import { sanitizeArticleHtml } from "../safe-html.js";

describe("sanitizeArticleHtml", () => {
	it("drops scripts and inline event handlers", () => {
		const html = '<p onclick="alert(1)">Hello<script>alert(2)</script></p>';
		const clean = sanitizeArticleHtml(html);
		expect(clean).not.toContain("script");
		expect(clean).not.toContain("onclick");
		expect(clean).toContain("Hello");
	});

	it("keeps http(s) images but hardens how they load", () => {
		const clean = sanitizeArticleHtml('<img src="https://example.com/photo.jpg">');
		expect(clean).toContain('src="https://example.com/photo.jpg"');
		expect(clean).toContain('referrerpolicy="no-referrer"');
		expect(clean).toContain('loading="lazy"');
	});

	it("removes unsafe image and link URLs", () => {
		const clean = sanitizeArticleHtml(
			'<img src="javascript:alert(1)"><a href="javascript:alert(2)">bad</a><img src="data:image/svg+xml,<svg/>">'
		);
		expect(clean).not.toContain("javascript:");
		expect(clean).not.toContain("data:");
	});

	it("marks external links to open safely and leaves in-app links alone", () => {
		const clean = sanitizeArticleHtml('<a href="https://other.test/x">out</a><a href="/posts/1">in</a>');
		expect(clean).toContain('data-external-link="true"');
		expect(clean).toContain('rel="noopener noreferrer"');
		expect(clean).toContain('href="/posts/1"');
		expect(clean).not.toMatch(/href="\/posts\/1"[^>]*data-external-link/);
	});

	it("replaces images with a placeholder when images are disabled", () => {
		const clean = sanitizeArticleHtml('<p>A<img src="https://example.com/x.png">B</p>', {
			loadImages: false
		});
		expect(clean).not.toContain("<img");
		expect(clean).toContain("article-image-placeholder");
		expect(clean).toContain("A");
		expect(clean).toContain("B");
	});
});
