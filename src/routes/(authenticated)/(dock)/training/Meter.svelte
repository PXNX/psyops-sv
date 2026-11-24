<!-- One thin condition meter for the roster: value on top, 3px bar below.
     Low values (ORG/STR/SUP/FUEL) turn amber, then red. -->
<script lang="ts">
	interface Props {
		label: string;
		title: string;
		value: number;
		/** Tailwind background class for the bar. */
		bar: string;
		/** Warn when low (not for experience). */
		warnLow?: boolean;
	}
	let { label, title, value, bar, warnLow = true }: Props = $props();
	const pct = $derived(Math.max(0, Math.min(100, value)));
	const tone = $derived(!warnLow ? "" : pct < 25 ? "text-error" : pct < 50 ? "text-warning" : "");
	const fill = $derived(!warnLow ? bar : pct < 25 ? "bg-error" : pct < 50 ? "bg-warning" : bar);
</script>

<div class="min-w-0" title="{title} {pct}%">
	<div class="flex items-baseline justify-between gap-1 text-[10px] leading-none">
		<span class="text-fg-faint tracking-wide md:sr-only">{label}</span>
		<span class="data text-[11px] {tone || 'text-fg-soft'}">{pct}</span>
	</div>
	<div class="mt-1 h-[3px] overflow-hidden rounded-full bg-surface-0/80">
		<div
			class="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none {fill}"
			style:width="{pct}%"
		></div>
	</div>
</div>
