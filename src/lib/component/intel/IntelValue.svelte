<!-- One figure as the viewer knows it: exact, an estimate with its interval and
     a small range bar, or hidden. The tooltip says how to sharpen it. -->
<script lang="ts">
	import { compactNumber, improveHint, type Estimate } from "#lib/utils/intel-estimate.js";
	import IntelBadge from "./IntelBadge.svelte";

	interface Props {
		estimate: Estimate;
		/** Appended to numbers, e.g. "%" or " MW". */
		unit?: string;
		/** "block" for stat cards (bar + badge), "inline" for compact rows. */
		variant?: "block" | "inline";
		/** Inline only: let the interval break onto its own line in narrow cells. */
		wrap?: boolean;
		class?: string;
	}
	let { estimate: e, unit = "", variant = "inline", wrap = false, class: className = "" }: Props = $props();

	const hint = $derived(improveHint(e));
	// Bar domain runs from zero to a little past the top of the interval, so a
	// wide interval visibly fills most of the track.
	const bar = $derived.by(() => {
		if (e.kind !== "range") return null;
		const top = Math.max(e.high * 1.1, 1);
		return {
			left: (e.low / top) * 100,
			width: Math.max(2, ((e.high - e.low) / top) * 100),
			tick: (e.value / top) * 100
		};
	});
</script>

{#if variant === "block"}
	<span class="block min-w-0 {className}" title={e.kind === "exact" ? undefined : hint}>
		<span class="flex min-w-0 items-baseline gap-1.5">
			<span class="truncate font-mono text-lg font-bold text-fg sm:text-xl">
				{#if e.kind === "hidden"}—{:else if e.kind === "exact"}{e.value.toLocaleString()}{unit}{:else}~{compactNumber(
						e.value
					)}{unit}{/if}
			</span>
		</span>
		{#if e.kind === "range" && bar}
			<span class="mt-0.5 block truncate font-mono text-[11px] text-fg-muted">
				{compactNumber(e.low)}–{compactNumber(e.high)}{unit}
			</span>
			<span class="relative mt-1 block h-1 rounded-full bg-surface-7" aria-hidden="true">
				<span class="absolute inset-y-0 rounded-full bg-primary/45" style="left: {bar.left}%; width: {bar.width}%"
				></span>
				<span class="absolute -top-0.5 h-2 w-0.5 rounded-full bg-fg" style="left: {bar.tick}%"></span>
			</span>
		{/if}
		{#if e.kind !== "exact"}
			<IntelBadge tier={e.tier} class="mt-1.5" />
		{/if}
	</span>
{:else}
	<span class="inline-flex min-w-0 items-center gap-1 {className}" title={e.kind === "exact" ? undefined : hint}>
		{#if e.kind === "hidden"}
			<span class="font-mono">—</span>
		{:else if e.kind === "exact"}
			<span class="font-mono">{e.value.toLocaleString()}{unit}</span>
		{:else}
			<span class="font-mono {wrap ? 'max-w-full' : 'truncate'}">
				~{compactNumber(e.value)}{unit}
				<span class="font-normal text-fg-muted {wrap ? 'block sm:inline' : ''}">
					({compactNumber(e.low)}–{compactNumber(e.high)}{unit})
				</span>
			</span>
		{/if}
	</span>
{/if}
