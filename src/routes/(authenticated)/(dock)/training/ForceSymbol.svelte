<!-- A friendly APP-6-style frame for any unit type on the Forces page. Land
     and squadron types use the shared tactical symbol; ships, marines and the
     newer aircraft get their icon drawn here so nothing renders as an empty box. -->
<script lang="ts">
	import UnitSymbol from "#lib/component/tactical/UnitSymbol.svelte";
	import { TACTICAL } from "#lib/component/tactical/colors.js";

	interface Props {
		unitType: string | null;
		/** Height in px. */
		size?: number;
		/** Echelon marker above the frame (II battalion, XX division…). */
		echelon?: string;
		dashed?: boolean;
		title?: string;
		class?: string;
	}
	let { unitType, size = 22, echelon, dashed = false, title, class: className = "" }: Props = $props();

	const SHARED = new Set([
		"infantry",
		"armor",
		"mechanized",
		"artillery",
		"air_defence",
		"fighter_squadron",
		"bomber_squadron"
	]);
	const ALIAS: Record<string, string> = { fighterjet: "fighter_squadron", bomber: "bomber_squadron" };
	// Fixed-wing types that share the air glyph, told apart by a letter.
	const AIR_LETTER: Record<string, string> = {
		transport_aircraft: "C",
		tanker_aircraft: "K",
		close_air_support: "A",
		naval_bomber: "P"
	};

	const base = $derived(unitType ? (ALIAS[unitType] ?? unitType) : null);
	const shared = $derived(base && SHARED.has(base) ? base : base && AIR_LETTER[base] ? "air" : null);
	const c = TACTICAL.friend;
	const top = $derived(echelon ? -22 : -14);
	const height = $derived(echelon ? 36 : 28);
</script>

<svg
	viewBox="-14 {top} 28 {height}"
	height={(size * height) / 28}
	width={size}
	class="inline-block shrink-0 align-middle {className}"
	role="img"
	aria-label={title ?? unitType ?? "formation"}
>
	{#if title}<title>{title}</title>{/if}
	<UnitSymbol affiliation="friend" unitType={shared} {dashed} />
	{#if echelon}
		<text
			y="-10"
			text-anchor="middle"
			font-size="7"
			font-weight="700"
			letter-spacing="0.5"
			font-family="ui-monospace, monospace"
			style:fill={c.text}
		>
			{echelon}
		</text>
	{/if}
	<g style:stroke={c.icon} fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
		{#if base && AIR_LETTER[base]}
			<text
				y="6.4"
				text-anchor="middle"
				font-size="5.5"
				font-weight="700"
				font-family="ui-monospace, monospace"
				style:fill={c.icon}
				style:stroke="none"
			>
				{AIR_LETTER[base]}
			</text>
		{:else if base === "marine"}
			<path d="M-7 -5 L7 5 M-7 5 L7 -5" />
			<path d="M-3 3.5 Q0 6.5 3 3.5 M0 1 L0 6" stroke-width="1" />
		{:else if base === "helicopter"}
			<path d="M-8 -4 L8 4 L8 -4 L-8 4 Z" />
		{:else if base === "frigate"}
			<path d="M-8 0 L8 0 L6 4 L-6 4 Z M0 0 L0 -5 M-3 -3 L3 -3" />
		{:else if base === "carrier"}
			<path d="M-9 0 L9 0 L7 4 L-7 4 Z" />
			<rect x="3" y="-4" width="3" height="4" />
		{:else if base === "landing_ship"}
			<path d="M-8 0 L6 0 L8 -3 M-8 0 L-6 4 L6 4 L8 0" />
		{:else if base === "submarine"}
			<ellipse rx="8" ry="2.6" cy="1.5" />
			<path d="M-1 -1 L-1 -4.5 L2.5 -4.5 L2.5 -1" />
		{/if}
	</g>
</svg>
