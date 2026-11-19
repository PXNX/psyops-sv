<!-- An APP-6-style unit symbol as an SVG group, centred on (x, y):
     friendly = blue rectangle, hostile = red diamond, unknown = amber
     diamond with "?". The unit type is drawn inside the frame, the count
     beside it. Use inside an <svg>; for HTML use <UnitBadge>. -->
<svelte:options namespace="svg" />

<script lang="ts">
	import { HALO, TACTICAL } from "./colors";

	interface Props {
		affiliation: "friend" | "hostile" | "unknown";
		/** Unit type (infantry, armor, …) or a sensor category (vehicle, air). Omit for a mixed force. */
		unitType?: string | null;
		count?: number | null;
		/** Mark the count as an estimate ("~"). */
		estimated?: boolean;
		x?: number;
		y?: number;
		/** Scale factor: 1 = a 24×16 frame. */
		scale?: number;
		/** Draw the frame dashed (planned / unconfirmed). */
		dashed?: boolean;
	}

	let {
		affiliation,
		unitType = null,
		count = null,
		estimated = false,
		x = 0,
		y = 0,
		scale = 1,
		dashed = false
	}: Props = $props();

	const color = $derived(TACTICAL[affiliation]);
	const isFriend = $derived(affiliation === "friend");
	// Inner icon box: the rectangle is wider than the diamond's interior.
	const w = $derived(isFriend ? 10 : 6);
	const h = $derived(isFriend ? 6 : 5);
	const label = $derived(count == null ? "" : `${estimated ? "~" : ""}${count}`);
</script>

<!-- src/lib/component/tactical/UnitSymbol.svelte -->

<g transform="translate({x} {y}) scale({scale})" class="unit-symbol">
	{#if isFriend}
		<rect
			x="-12"
			y="-8"
			width="24"
			height="16"
			style:fill={color.fill}
			style:stroke={color.stroke}
			stroke-width="1.4"
			stroke-dasharray={dashed ? "3 2" : undefined}
		/>
	{:else}
		<polygon
			points="0,-12 12,0 0,12 -12,0"
			style:fill={color.fill}
			style:stroke={color.stroke}
			stroke-width="1.4"
			stroke-dasharray={dashed ? "3 2" : undefined}
		/>
	{/if}

	<g style:stroke={color.icon} fill="none" stroke-width="1.2" stroke-linecap="round">
		{#if affiliation === "unknown"}
			<text
				y="4.2"
				text-anchor="middle"
				font-size="12"
				font-weight="700"
				font-family="ui-monospace, monospace"
				style:fill={color.icon}
				style:stroke="none">?</text
			>
		{:else if unitType === "infantry"}
			<path d="M{-w} {-h} L{w} {h} M{-w} {h} L{w} {-h}" />
		{:else if unitType === "armor" || unitType === "vehicle"}
			<rect x={-w * 0.75} y={-h * 0.6} width={w * 1.5} height={h * 1.2} rx={h * 0.6} />
		{:else if unitType === "mechanized"}
			<path d="M{-w} {-h} L{w} {h} M{-w} {h} L{w} {-h}" />
			<rect x={-w * 0.75} y={-h * 0.6} width={w * 1.5} height={h * 1.2} rx={h * 0.6} />
		{:else if unitType === "artillery"}
			<circle r="2.2" style:fill={color.icon} style:stroke="none" />
		{:else if unitType === "air_defence"}
			<path d="M{-w * 0.8} {h} A {w * 0.8} {h * 1.4} 0 0 1 {w * 0.8} {h}" />
		{:else if unitType === "fighter_squadron" || unitType === "bomber_squadron" || unitType === "air"}
			<path d="M{-w} 0 Q{-w / 2} {-h} 0 0 Q{w / 2} {-h} {w} 0" />
			{#if unitType === "bomber_squadron"}<path d="M{-w / 2} {h * 0.6} L{w / 2} {h * 0.6}" />{/if}
		{/if}
	</g>

	{#if label}
		<text
			x={isFriend ? 15 : 14}
			y="3.5"
			font-size="10"
			font-weight="700"
			font-family="ui-monospace, SFMono-Regular, monospace"
			style:fill={color.text}
			style:stroke={HALO}
			paint-order="stroke"
			stroke-width="3">{label}</text
		>
	{/if}
</g>
