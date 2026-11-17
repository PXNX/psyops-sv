<!-- src/lib/component/ConstructionQueue.svelte -->
<!-- Buildings under construction, each with a live progress bar. Reloads the
     page data once one of them is due, so it moves to the finished list. -->
<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { BUILDING_TEMPLATES, isBuildingType } from "#lib/config/index.js";
	import { formatDateTime } from "#lib/utils/formatting.js";

	interface Item {
		id: number;
		name: string;
		type: string;
		startedAt: Date | string | null;
		completesAt: Date | string | null;
		regionId?: number;
		regionName?: string;
		builtByName?: string;
	}

	let { items }: { items: Item[] } = $props();

	let now = $state(Date.now());
	$effect(() => {
		if (items.length === 0) return;
		const timer = setInterval(() => {
			now = Date.now();
			if (items.some((i) => i.completesAt && new Date(i.completesAt).getTime() <= now)) invalidateAll();
		}, 30_000);
		return () => clearInterval(timer);
	});

	const progress = (item: Item) => {
		if (!item.startedAt || !item.completesAt) return 100;
		const start = new Date(item.startedAt).getTime();
		const total = new Date(item.completesAt).getTime() - start;
		return total <= 0 ? 100 : Math.min(100, Math.max(0, ((now - start) / total) * 100));
	};

	const remaining = (item: Item) => {
		if (!item.completesAt) return "";
		const ms = new Date(item.completesAt).getTime() - now;
		if (ms <= 0) return "Finishing…";
		const d = Math.floor(ms / 86_400_000);
		const h = Math.floor((ms % 86_400_000) / 3_600_000);
		const m = Math.floor((ms % 3_600_000) / 60_000);
		return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
	};
</script>

<ul class="space-y-2">
	{#each items as item (item.id)}
		<li class="panel-muted rounded-sm p-3">
			<div class="flex items-center gap-3">
				<span class="text-2xl shrink-0" aria-hidden="true">
					{isBuildingType(item.type) ? BUILDING_TEMPLATES[item.type].icon : "🏗️"}
				</span>
				<div class="min-w-0 flex-1">
					<p class="font-bold text-[#f5efd8] truncate">{item.name}</p>
					<p class="text-xs text-[#a8a083] truncate">
						{#if item.regionId && item.regionName}
							<a href="/region/{item.regionId}" class="text-[#b3dcff] hover:text-[#f5efd8]">{item.regionName}</a> ·
						{/if}
						{#if item.builtByName}by {item.builtByName} ·{/if}
						done {item.completesAt ? formatDateTime(item.completesAt) : "soon"}
					</p>
				</div>
				<span class="font-mono text-sm font-bold text-[#ffd35c] shrink-0">{remaining(item)}</span>
			</div>
			<div class="mt-2 h-1.5 bg-[#1a1f15] rounded-full overflow-hidden">
				<div
					class="h-full bg-[#f2b01e] rounded-full transition-[width] duration-700"
					style="width: {progress(item)}%"
				></div>
			</div>
		</li>
	{/each}
</ul>
