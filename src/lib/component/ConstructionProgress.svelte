<!-- src/lib/component/ConstructionProgress.svelte -->
<!-- One building going up: level transition, a live striped progress bar,
     percentage and a ticking countdown. Reloads the page data when it's done. -->
<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { formatDateTime } from "#lib/utils/formatting.js";

	interface Props {
		startedAt: Date | string | null;
		completesAt: Date | string | null;
		/** Level the building reaches when finished. */
		toLevel?: number;
		compact?: boolean;
	}

	let { startedAt, completesAt, toLevel, compact = false }: Props = $props();

	let now = $state(Date.now());
	let reloaded = false;
	$effect(() => {
		const timer = setInterval(() => {
			now = Date.now();
			if (!reloaded && end && now >= end) {
				reloaded = true;
				invalidateAll();
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	const start = $derived(startedAt ? new Date(startedAt).getTime() : 0);
	const end = $derived(completesAt ? new Date(completesAt).getTime() : 0);
	const pct = $derived(end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100);
	const left = $derived(Math.max(0, end - now));

	const pad = (n: number) => String(n).padStart(2, "0");
	const countdown = $derived.by(() => {
		if (left <= 0) return "Finishing…";
		const s = Math.floor(left / 1000);
		const d = Math.floor(s / 86400);
		const h = Math.floor((s % 86400) / 3600);
		const m = Math.floor((s % 3600) / 60);
		return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
	});
</script>

<div class="space-y-1.5" role="group" aria-label="Construction progress">
	<div class="flex items-baseline justify-between gap-2 text-xs">
		<span class="text-[#ffcb6b] font-semibold flex items-center gap-1.5">
			<span class="inline-block animate-bounce" aria-hidden="true">🏗️</span>
			{#if toLevel}Building level {toLevel}{:else}Under construction{/if}
		</span>
		<span class="font-mono text-[#eef2ff] tabular-nums">{pct.toFixed(pct < 10 ? 1 : 0)}%</span>
	</div>
	<div
		class="relative {compact ? 'h-2' : 'h-3'} bg-[#131c33] rounded-full overflow-hidden border border-[#8ea6e0]/15"
		role="progressbar"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(pct)}
	>
		<div class="stripes h-full rounded-full transition-[width] duration-1000 ease-linear" style="width: {pct}%"></div>
	</div>
	<div class="flex items-baseline justify-between gap-2 text-xs">
		<span class="font-mono font-bold text-[#ffcb6b] tabular-nums">{countdown}</span>
		{#if !compact && completesAt}
			<span class="text-[#8e9abb] truncate">done {formatDateTime(completesAt)}</span>
		{/if}
	</div>
</div>

<style>
	.stripes {
		background-color: #f5a524;
		background-image: repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.22) 0 8px, transparent 8px 16px);
		background-size: 22.6px 22.6px;
		box-shadow: 0 0 10px rgb(245 165 36 / 0.45);
		animation: march 1s linear infinite;
	}
	@keyframes march {
		to {
			background-position: 22.6px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stripes {
			animation: none;
		}
	}
</style>
