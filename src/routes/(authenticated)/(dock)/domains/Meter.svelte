<!-- src/routes/(authenticated)/(dock)/domains/Meter.svelte -->
<!-- A labelled thin bar for a 0–1 figure (supply, flow, health, bonuses). -->
<script lang="ts">
	import { levelTone } from "./shared";

	interface Props {
		label: string;
		/** 0–1 */
		value: number;
		/** Text on the right; defaults to the value as a percentage. */
		display?: string;
		/** Bar colour class; defaults to green/amber/red by level. */
		tone?: string;
		title?: string;
	}

	let { label, value, display, tone, title }: Props = $props();
	const clamped = $derived(Math.max(0, Math.min(1, value)));
</script>

<div class="min-w-0" {title}>
	<div class="flex items-baseline justify-between gap-2 text-xs">
		<span class="truncate text-fg-muted">{label}</span>
		<span class="data text-fg">{display ?? `${Math.round(value * 100)}%`}</span>
	</div>
	<div
		class="mt-1 h-1 overflow-hidden rounded-full bg-surface-8"
		role="meter"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(clamped * 100)}
	>
		<div
			class="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none {tone ??
				levelTone(clamped)}"
			style="width: {clamped * 100}%"
		></div>
	</div>
</div>
