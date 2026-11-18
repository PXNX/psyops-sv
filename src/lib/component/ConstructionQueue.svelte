<!-- src/lib/component/ConstructionQueue.svelte -->
<!-- Buildings under construction across regions, each with live progress. -->
<script lang="ts">
	import { BUILDING_TEMPLATES, isBuildingType } from "#lib/config/index.js";
	import { regionCoatUrl } from "#lib/utils/formatting.js";
	import ConstructionProgress from "./ConstructionProgress.svelte";

	interface Item {
		id: number;
		name: string;
		type: string;
		startedAt: Date | string | null;
		completesAt: Date | string | null;
		toLevel?: number;
		regionId?: number;
		regionName?: string;
		builtByName?: string;
	}

	let { items }: { items: Item[] } = $props();
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each items as item (item.id)}
		{@const template = isBuildingType(item.type) ? BUILDING_TEMPLATES[item.type] : null}
		<li class="panel-muted rounded-sm p-3 space-y-3 animate-rise-in">
			<div class="flex items-center gap-3">
				<div
					class="size-11 shrink-0 rounded-sm bg-[#f5a524]/12 border border-[#f5a524]/35 flex items-center justify-center text-2xl"
					aria-hidden="true"
				>
					{template?.icon ?? "🏗️"}
				</div>
				<div class="min-w-0 flex-1">
					<p class="font-bold text-[#eef2ff] truncate">{template?.name ?? item.name}</p>
					<p class="text-xs text-[#8e9abb] truncate">
						{#if item.regionId && item.regionName}
							<a
								href="/region/{item.regionId}/construction"
								class="inline-flex items-center gap-1 text-[#c3dbff] hover:text-[#eef2ff]"
							>
								<img src={regionCoatUrl(item.regionId)} alt="" class="size-3.5" loading="lazy" />
								{item.regionName}
							</a>
						{/if}
						{#if item.builtByName}· by {item.builtByName}{/if}
					</p>
				</div>
			</div>
			<ConstructionProgress startedAt={item.startedAt} completesAt={item.completesAt} toLevel={item.toLevel} />
		</li>
	{/each}
</ul>
