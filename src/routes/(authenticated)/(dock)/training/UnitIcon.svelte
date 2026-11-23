<!-- A unit glyph that always renders: the olive silhouette where one exists,
     otherwise an APP-6 friendly tactical symbol for that unit type. -->
<script lang="ts">
	import UnitBadge from "#lib/component/tactical/UnitBadge.svelte";

	interface Props {
		unitType: string;
		/** Height in px. */
		size?: number;
		/** Tailwind filter that tints the silhouette; ignored by the fallback. */
		ink?: string;
		class?: string;
	}
	let { unitType, size = 24, ink = "", class: className = "" }: Props = $props();

	const INK =
		"[filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]";
	let failed = $state(false);
	const hasSilhouette = $derived(!failed && SILHOUETTES.has(unitType));
	const SILHOUETTES = new Set([
		"infantry",
		"armor",
		"mechanized",
		"artillery",
		"air_defence",
		"fighter_squadron",
		"bomber_squadron"
	]);
</script>

{#if hasSilhouette}
	<img
		src="/units/{unitType}.svg"
		alt=""
		class="inline-block shrink-0 object-contain {ink || INK} {className}"
		style="height:{size}px;width:{size}px"
		onerror={() => (failed = true)}
	/>
{:else}
	<UnitBadge affiliation="friend" {unitType} {size} class={className} />
{/if}
