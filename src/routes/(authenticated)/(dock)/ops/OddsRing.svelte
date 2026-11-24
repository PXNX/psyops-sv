<!-- src/routes/(authenticated)/(dock)/ops/OddsRing.svelte -->
<!-- A small donut gauge for a 0-1 chance (or a level out of `segments`).
     The centre shows the children, or the rounded percentage. -->
<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		/** 0-1. */
		value: number;
		size?: number;
		/** CSS colour of the filled arc. Defaults to a tone picked from the value. */
		color?: string;
		/** Optional 0-1 marker, e.g. the base chance before modifiers. */
		base?: number | null;
		/** Split the track into this many segments (for levels). */
		segments?: number;
		dim?: boolean;
		label: string;
		/** Text size class for the default centre label. */
		textClass?: string;
		children?: Snippet;
	};
	let {
		value,
		size = 40,
		color,
		base = null,
		segments = 0,
		dim = false,
		label,
		textClass = "text-[11px]",
		children
	}: Props = $props();

	const v = $derived(Math.max(0, Math.min(1, value)));
	const tone = $derived(
		color ?? (v >= 0.6 ? "var(--color-positive)" : v >= 0.35 ? "var(--color-warning)" : "var(--color-hostile)")
	);
	const GAP = 3;
	const segLen = $derived(segments ? 100 / segments - GAP : 0);
	const filled = $derived(segments ? Math.round(v * segments) : 0);
</script>

<span
	class="relative inline-grid shrink-0 place-items-center transition-opacity"
	class:opacity-50={dim}
	style:width="{size}px"
	style:height="{size}px"
	role="img"
	aria-label="{label}: {segments ? `${filled} of ${segments}` : `${Math.round(v * 100)}%`}"
>
	<svg viewBox="0 0 36 36" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
		{#if segments}
			{#each Array(segments) as _, i (i)}
				<circle
					cx="18"
					cy="18"
					r="15"
					fill="none"
					pathLength="100"
					stroke-width="3.5"
					stroke-dasharray="{segLen} {100 - segLen}"
					stroke-dashoffset={-(i * (100 / segments)) - GAP / 2}
					style="stroke: {i < filled ? tone : 'var(--color-surface-8)'}; transition: stroke 400ms ease"
				/>
			{/each}
		{:else}
			<circle cx="18" cy="18" r="15" fill="none" stroke-width="3.5" style="stroke: var(--color-surface-8)" />
			<circle
				cx="18"
				cy="18"
				r="15"
				fill="none"
				pathLength="100"
				stroke-width="3.5"
				stroke-linecap="round"
				stroke-dasharray="{v * 100} 100"
				style="stroke: {tone}; transition: stroke-dasharray 400ms ease, stroke 400ms ease"
			/>
			{#if base !== null}
				<circle
					cx="18"
					cy="18"
					r="15"
					fill="none"
					pathLength="100"
					stroke-width="6"
					stroke-dasharray="0.8 99.2"
					stroke-dashoffset={-base * 100}
					style="stroke: var(--color-fg-soft)"
				/>
			{/if}
		{/if}
	</svg>
	<span class="data relative leading-none text-fg {textClass}">
		{#if children}{@render children()}{:else}{Math.round(v * 100)}<span class="text-[0.7em] text-fg-muted">%</span>{/if}
	</span>
</span>
