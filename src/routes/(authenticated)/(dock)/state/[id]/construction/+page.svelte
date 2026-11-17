<!-- src/routes/(authenticated)/(dock)/state/[id]/construction/+page.svelte -->
<script lang="ts">
	import FluentBuildingFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import ConstructionQueue from "#lib/component/ConstructionQueue.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { BUILDING_TEMPLATES, VALID_BUILDING_TYPES } from "#lib/config/index.js";
	import { regionCoatUrl } from "#lib/utils/formatting.js";

	const { data } = $props();
	const columns = VALID_BUILDING_TYPES.map((t) => BUILDING_TEMPLATES[t]);
</script>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Construction"
		subtitle="Public buildings across {data.state.name}"
		icon={FluentBuildingFactory20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	>
		{#snippet actions()}
			{#if data.canPropose}
				<Button href="/state/{data.state.id}/proposal/create" variant="secondary">Propose a building</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<SectionCard>
		<h2 class="section-title mb-3">Under construction</h2>
		{#if data.pendingConstructions.length}
			<ConstructionQueue items={data.pendingConstructions} />
		{:else}
			<EmptyState
				icon={FluentBuildingFactory20Filled}
				title="Nothing is being built"
				subtitle="The government and parliament start buildings in a region."
			/>
		{/if}
	</SectionCard>

	<SectionCard>
		<h2 class="section-title mb-3">Regions</h2>
		{#if data.regions.length === 0}
			<p class="text-sm text-[#a8a083]">This state has no regions.</p>
		{:else}
			<div class="overflow-x-auto -mx-1">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-[10px] text-[#a8a083] uppercase tracking-wide text-left">
							<th class="px-1 py-2 font-normal">Region</th>
							{#each columns as c (c.type)}
								<th class="px-1 py-2 font-normal text-center" title={c.statLabel}>
									<span aria-hidden="true">{c.icon}</span><span class="sr-only">{c.statLabel}</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-[#c8b47a]/10">
						{#each data.regions as r (r.id)}
							<tr class="hover:bg-[#2e3524]/60">
								<td class="px-1 py-1.5">
									<a href="/region/{r.id}/construction" class="flex items-center gap-2 min-w-0 group">
										<img src={regionCoatUrl(r.id)} alt="" class="size-6 shrink-0" loading="lazy" />
										<span class="truncate text-[#e6ddbf] group-hover:text-[#ffcf47]">{r.name}</span>
									</a>
								</td>
								{#each columns as c (c.type)}
									<td class="px-1 py-1.5 text-center font-mono {r[c.stat] ? 'text-[#f5efd8]' : 'text-[#a8a083]/60'}">
										{r[c.stat] ?? 0}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</SectionCard>
</PageContainer>
