<!-- A threat range ring (SVG group): a red circle with a pulsing outer ring. -->
<svelte:options namespace="svg" />

<script lang="ts">
	import { HOSTILE_RED } from "./colors";

	interface Props {
		x: number;
		y: number;
		/** Radius in map units. */
		r: number;
		color?: string;
		pulse?: boolean;
	}

	let { x, y, r, color = HOSTILE_RED, pulse = true }: Props = $props();
</script>

<!-- src/lib/component/tactical/RangeRing.svelte -->

<g class="range-ring" transform="translate({x} {y})">
	<circle
		{r}
		style:fill={color}
		style:stroke={color}
		fill-opacity="0.07"
		style:stroke-width="calc(var(--k, 1) * 1.2px)"
	/>
	<circle
		r={r * 0.55}
		fill="none"
		style:stroke={color}
		stroke-opacity="0.5"
		style:stroke-width="calc(var(--k, 1) * 1px)"
		style:stroke-dasharray="calc(var(--k, 1) * 3px) calc(var(--k, 1) * 3px)"
	/>
	{#if pulse}
		<circle {r} fill="none" style:stroke={color} style:stroke-width="calc(var(--k, 1) * 1.5px)" class="ring-pulse" />
	{/if}
</g>

<style>
	.ring-pulse {
		transform-box: fill-box;
		transform-origin: center;
		animation: ring-pulse 2.4s ease-out infinite;
	}
	@keyframes ring-pulse {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(1.8);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ring-pulse {
			animation: none;
			opacity: 0;
		}
	}
</style>
