<!-- src/lib/component/tactical/ReconSector.svelte -->
<!-- Recon coverage over a region (SVG group): a translucent blue circle with a
     dashed observation sector and an age label. -->
<svelte:options namespace="svg" />

<script lang="ts">
	import { RECON_BLUE } from "./colors";

	interface Props {
		x: number;
		y: number;
		/** Radius in map units. */
		r: number;
		/** Short label, e.g. "4h". */
		label?: string;
		/** 0-1: fades the fill with age/confidence. */
		strength?: number;
		/** Size of the label in map units (pass a zoom-compensated value). */
		fontSize?: number;
		/** Draw only a dashed outline (mission still in flight). */
		pending?: boolean;
	}

	let { x, y, r, label = "", strength = 1, fontSize = 8, pending = false }: Props = $props();

	// A 100° sector opening to the upper right, like a sensor footprint.
	const sector = $derived.by(() => {
		const a0 = (-80 * Math.PI) / 180;
		const a1 = (20 * Math.PI) / 180;
		const R = r * 1.15;
		return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
	});
</script>

<g transform="translate({x} {y})" class="recon-sector">
	{#if pending}
		<circle
			{r}
			fill="none"
			stroke={RECON_BLUE}
			stroke-width="1.2"
			stroke-dasharray="4 3"
			vector-effect="non-scaling-stroke"
		/>
	{:else}
		<circle
			{r}
			fill={RECON_BLUE}
			fill-opacity={0.06 + 0.12 * strength}
			stroke={RECON_BLUE}
			stroke-opacity={0.35 + 0.5 * strength}
			stroke-width="1"
			vector-effect="non-scaling-stroke"
		/>
		<path d={sector} fill={RECON_BLUE} fill-opacity={0.08 + 0.14 * strength} stroke="none" />
	{/if}
	{#if label}
		<text
			x={r * 0.72}
			y={-r * 0.72}
			font-size={fontSize}
			font-family="ui-monospace, SFMono-Regular, monospace"
			font-weight="700"
			fill="#9cc7ff"
			paint-order="stroke"
			stroke="#05080f"
			stroke-width={fontSize * 0.3}>{label}</text
		>
	{/if}
</g>
