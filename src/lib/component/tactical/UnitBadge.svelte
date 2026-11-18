<!-- src/lib/component/tactical/UnitBadge.svelte -->
<!-- A unit symbol for HTML: a small inline <svg> around <UnitSymbol>. -->
<script lang="ts">
	import UnitSymbol from "./UnitSymbol.svelte";

	interface Props {
		affiliation: "friend" | "hostile" | "unknown";
		unitType?: string | null;
		count?: number | null;
		estimated?: boolean;
		/** Rendered height in px. */
		size?: number;
		title?: string;
		class?: string;
	}

	let { affiliation, unitType = null, count = null, estimated = false, size = 20, title, class: className = "" }: Props =
		$props();

	const hasLabel = $derived(count != null);
	// Room for the frame (±13) plus the count to its right.
	const width = $derived(hasLabel ? 50 : 28);
</script>

<svg
	viewBox="-14 -14 {width} 28"
	height={size}
	width={(size * width) / 28}
	class="inline-block shrink-0 align-middle {className}"
	role="img"
	aria-label={title ?? `${affiliation} ${unitType ?? "force"}${count != null ? `, ${count}` : ""}`}
>
	{#if title}<title>{title}</title>{/if}
	<UnitSymbol {affiliation} {unitType} {count} {estimated} />
</svg>
