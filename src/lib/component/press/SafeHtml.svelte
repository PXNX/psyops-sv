<!-- src/lib/component/press/SafeHtml.svelte -->
<!-- Renders an article body as sanitised HTML. External links are held back
     behind a confirmation sheet, and the user's "load images" preference is
     respected. -->
<script lang="ts">
	import { settings } from "#lib/settings.svelte.js";
	import { sanitizeArticleHtml } from "#lib/utils/safe-html.js";
	import ExternalLinkWarning from "#lib/component/ExternalLinkWarning.svelte";

	interface Props {
		html: string;
		class?: string;
	}

	let { html, class: className = "" }: Props = $props();

	const safeHtml = $derived(sanitizeArticleHtml(html, { loadImages: settings.loadImages }));

	let pendingLink = $state<string | null>(null);
	let warningOpen = $state(false);

	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const anchor = target?.closest("a");
		if (!anchor) return;

		const href = anchor.getAttribute("href");
		if (!href) return;

		let url: URL;
		try {
			url = new URL(href, window.location.origin);
		} catch {
			return;
		}
		// Let the browser handle mailto:, tel:, in-page anchors and our own routes.
		if (url.protocol !== "http:" && url.protocol !== "https:") return;
		if (url.origin === window.location.origin) return;

		event.preventDefault();
		pendingLink = href;
		warningOpen = true;
	}

	// An action keeps the click handler off the declarative markup, which also
	// avoids a11y warnings for the {|@html} wrapper.
	function externalLinks(node: HTMLElement) {
		node.addEventListener("click", handleClick);
		return {
			destroy() {
				node.removeEventListener("click", handleClick);
			}
		};
	}
</script>

<div class={className} use:externalLinks>
	{@html safeHtml}
</div>

<ExternalLinkWarning bind:open={warningOpen} url={pendingLink ?? ""} />

<style>
	/* Inserted by the sanitizer when the reader has images turned off. */
	:global(.article-image-placeholder) {
		display: block;
		margin: 1.5rem 0;
		padding: 1.5rem;
		border: 1px dashed var(--color-line);
		border-radius: 0.25rem;
		background: var(--color-surface-4);
		color: var(--color-fg-muted);
		font-size: 0.85rem;
		font-family: var(--font-mono, monospace);
		text-align: center;
	}
</style>
