<!-- Renders a Mermaid diagram inside an mdsvex documentation page. Loaded on
     the client only so the docs still prerender without a DOM. The palette is
     read from the active theme, so diagrams follow light/dark mode. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";
	import { settings } from "#lib/settings.svelte.js";
	import { mermaidThemeVariables } from "#lib/utils/mermaid-theme.js";
	import FluentDiagram20Filled from "~icons/fluent/diagram-20-filled";

	interface Props {
		chart: string;
		label?: string;
	}
	let { chart, label }: Props = $props();

	let html = $state("");
	let failed = $state(false);
	let renderCount = 0;

	async function draw() {
		if (!browser) return;
		try {
			const { default: mermaid } = await import("mermaid");
			mermaid.initialize({
				startOnLoad: false,
				theme: "base",
				securityLevel: "strict",
				themeVariables: mermaidThemeVariables(),
				flowchart: { curve: "basis", nodeSpacing: 36, rankSpacing: 44 },
				sequence: { actorMargin: 48, messageMargin: 32 }
			});
			const id = `psyops-mermaid-${renderCount++}-${Math.random().toString(36).slice(2, 8)}`;
			const result = await mermaid.render(id, chart);
			html = result.svg;
			failed = false;
		} catch (error) {
			console.error("Mermaid render failed:", error);
			failed = true;
		}
	}

	onMount(() => {
		void draw();
	});

	// Re-render with the new palette when the player switches theme.
	$effect(() => {
		const theme = settings.theme;
		if (browser && renderCount > 0) void draw();
		void theme;
	});
</script>

<figure class="mermaid-figure">
	<div class="mermaid-head">
		<span class="mermaid-mark"><FluentDiagram20Filled class="size-4" /></span>
		<span class="section-title text-xs uppercase tracking-[0.18em]">Diagram</span>
		{#if label}<span class="ml-auto text-[11px] text-fg-muted">{label}</span>{/if}
	</div>
	{#if html}
		<div class="mermaid-svg">{@html html}</div>
	{:else if failed}
		<pre class="mermaid-fallback">{chart}</pre>
	{:else}
		<div class="mermaid-loading">Loading diagram …</div>
	{/if}
	{#if label}<figcaption>{label}</figcaption>{/if}
</figure>

<style>
	@reference "../../app.css";

	.mermaid-figure {
		@apply my-6 overflow-hidden rounded-sm border border-line/20 bg-surface-2/60 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)];
		background-image: radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 45%);
	}
	.mermaid-head {
		@apply flex items-center gap-2 border-b border-line/15 px-4 py-2;
	}
	.mermaid-mark {
		@apply flex size-7 items-center justify-center rounded-sm border border-primary/30 bg-primary/12 text-primary-fg;
	}
	.mermaid-svg {
		@apply overflow-x-auto px-4 py-5;
	}
	.mermaid-svg :global(svg) {
		@apply mx-auto block max-w-full;
		filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.22));
	}
	.mermaid-svg :global(svg .node rect),
	.mermaid-svg :global(svg .node polygon) {
		rx: 8px;
	}
	.mermaid-figure figcaption {
		@apply border-t border-line/15 px-4 py-2 text-center text-xs text-fg-muted;
	}
	.mermaid-fallback,
	.mermaid-loading {
		@apply whitespace-pre-wrap p-4 font-mono text-xs text-fg-muted;
	}
</style>
