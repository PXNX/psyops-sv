<!-- Renders a Mermaid diagram inside an mdsvex documentation page. Loaded on
     the client only so the docs still prerender without a DOM. -->
<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
		chart: string;
		label?: string;
	}
	let { chart, label }: Props = $props();

	let html = $state("");
	let failed = $state(false);

	onMount(async () => {
		try {
			const { default: mermaid } = await import("mermaid");
			mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
			const id = `psyops-mermaid-${Math.random().toString(36).slice(2, 10)}`;
			const result = await mermaid.render(id, chart);
			html = result.svg;
		} catch (error) {
			console.error("Mermaid render failed:", error);
			failed = true;
		}
	});
</script>

<figure class="mermaid-figure">
	{#if html}
		<div class="mermaid-svg">{@html html}</div>
	{:else if failed}
		<pre class="mermaid-fallback">{chart}</pre>
	{:else}
		<div class="mermaid-loading">Diagramm wird geladen …</div>
	{/if}
	{#if label}<figcaption>{label}</figcaption>{/if}
</figure>

<style>
	@reference "../../app.css";

	.mermaid-figure {
		@apply my-6 overflow-x-auto rounded-sm border border-line/20 bg-surface-1 p-3;
	}
	.mermaid-svg :global(svg) {
		@apply mx-auto block max-w-full;
	}
	.mermaid-figure figcaption {
		@apply mt-2 text-center text-xs text-fg-muted;
	}
	.mermaid-fallback,
	.mermaid-loading {
		@apply p-3 text-xs text-fg-muted;
	}
</style>
