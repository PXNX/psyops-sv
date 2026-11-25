<!-- src/routes/(authenticated)/(dock)/region/[id]/construction/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWrench20Filled from "~icons/fluent/wrench-20-filled";
	import FluentBuildingFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import ConstructionProgress from "#lib/component/ConstructionProgress.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { formatDate, getRegionName } from "#lib/utils/formatting.js";

	const { data } = $props();

	const regionName = $derived(getRegionName(data.region.id));
	const canOrderAny = $derived(data.buildings.some((b) => b.canOrder));
	const ROLE_LABELS: Record<string, string> = {
		president: "President",
		governor: "Governor",
		economy: "Economy Minister",
		defense: "Defense Minister"
	};

	let busy = $state<string | null>(null);
</script>

<PageContainer maxWidth="5xl">
	<PageHeader
		title="Construction"
		subtitle={data.roles.length ? `${regionName} · as ${data.roles.map((r) => ROLE_LABELS[r]).join(", ")}` : regionName}
		icon={FluentWrench20Filled}
		backHref="/region/{data.region.id}"
		backLabel={regionName}
	/>

	{#if !data.state}
		<div class="panel-muted rounded-sm p-4 text-sm text-[#c2cbe3]">
			Independent regions can't build. Once a state governs {regionName}, its leaders can build here.
		</div>
	{:else}
		<!-- What the state has to spend -->
		<div class="panel rounded-sm p-4">
			{#if data.isGovernor}
				<!-- The governor picks who pays the money; materials always come from the state. -->
				<div class="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Pay from">
					<span class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Pay from</span>
					<a
						href="?fund=treasury"
						data-sveltekit-noscroll
						aria-current={data.payFrom === "treasury" ? "true" : undefined}
						class="rounded-sm border px-2.5 py-1 text-xs {data.payFrom === 'treasury'
							? 'border-[#4fd88a]/50 bg-[#4fd88a]/12 text-[#aef3c9]'
							: 'border-[#8ea6e0]/20 text-[#c2cbe3] hover:border-[#8ea6e0]/40'}"
					>
						State treasury
					</a>
					<a
						href="?fund=region"
						data-sveltekit-noscroll
						aria-current={data.payFrom === "region" ? "true" : undefined}
						class="rounded-sm border px-2.5 py-1 text-xs {data.payFrom === 'region'
							? 'border-[#f5a524]/50 bg-[#f5a524]/12 text-[#ffcb6b]'
							: 'border-[#8ea6e0]/20 text-[#c2cbe3] hover:border-[#8ea6e0]/40'}"
					>
						Regional budget
					</a>
				</div>
			{/if}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					{#if data.payFrom === "region"}
						<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Regional budget of {regionName}</p>
						<p class="text-2xl font-bold font-mono text-[#ffcb6b]">${data.regionBudget.toLocaleString()}</p>
						<p class="text-xs text-[#8e9abb]">Materials still come from the state stockpile.</p>
					{:else}
						<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Treasury of {data.state.name}</p>
						<p class="text-2xl font-bold font-mono text-[#aef3c9]">${data.treasury.toLocaleString()}</p>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(data.stockpile).filter(([, q]) => q > 0) as [resource, quantity]}
						<span class="panel-muted rounded-sm px-2 py-1 text-xs text-[#dbe2f4] flex items-center gap-1">
							<ResourceIcon name={resource} class="size-4" />
							<span class="font-mono">{quantity.toLocaleString()}</span>
						</span>
					{:else}
						<span class="text-xs text-[#8e9abb]">The state stockpile is empty. Buy materials on the state market.</span>
					{/each}
				</div>
			</div>
			{#if !canOrderAny && data.canPropose}
				<p class="text-xs text-[#8e9abb] mt-3">
					Only the president, governor and responsible ministers build directly. You can
					<a href="/state/{data.state.id}/proposal/create" class="text-[#ffcb6b] hover:text-[#ffc857]">
						propose a building to parliament
					</a>.
				</p>
			{/if}
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each data.buildings as b (b.type)}
				{@const full = b.level >= b.maxLevel}
				<div
					id="building-{b.type}"
					class="panel rounded-sm p-4 flex flex-col gap-3 transition-colors {b.underway ? 'border-[#f5a524]/45' : ''}"
				>
					<div class="flex items-start gap-3">
						<div
							class="size-12 shrink-0 rounded-sm border flex items-center justify-center text-3xl {b.underway
								? 'bg-[#f5a524]/12 border-[#f5a524]/35'
								: 'bg-[#131c33] border-[#8ea6e0]/15'}"
							aria-hidden="true"
						>
							{b.icon}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<h2 class="font-bold text-[#eef2ff]">{b.name}</h2>
								<span class="font-mono text-sm text-[#eef2ff] shrink-0">
									<span class="text-[10px] text-[#8e9abb] uppercase tracking-wide font-sans">Lv</span>
									{b.level}<span class="text-[#8e9abb]">/{b.maxLevel}</span>
								</span>
							</div>
							<p class="text-sm text-[#8e9abb]">{b.description}</p>
						</div>
					</div>

					<!-- One pip per level: built, building, still to come -->
					<div class="flex gap-0.5" aria-label="{b.statLabel} level {b.level} of {b.maxLevel}">
						{#each Array(b.maxLevel) as _, i}
							<div
								class="h-2 flex-1 rounded-full transition-colors {i < b.level
									? 'bg-[#4fd88a]'
									: i === b.level && b.underway
										? 'bg-[#f5a524] animate-pulse'
										: 'bg-[#131c33]'}"
							></div>
						{/each}
					</div>

					{#if b.underway}
						<div class="panel-muted rounded-sm p-3">
							<ConstructionProgress
								startedAt={b.underway.startedAt}
								completesAt={b.underway.completesAt}
								toLevel={b.level + 1}
							/>
						</div>
					{/if}

					<ul class="text-sm text-[#c2cbe3] space-y-0.5">
						{#each b.benefits as benefit}
							<li>• {benefit}</li>
						{/each}
					</ul>

					{#if !b.underway && !full}
						<div class="flex flex-wrap gap-1.5">
							{#each b.costs as c}
								{@const short = c.available < c.needed}
								<span
									class="rounded-sm border px-2 py-0.5 text-xs flex items-center gap-1 {short
										? 'bg-red-600/10 border-red-500/30 text-red-300'
										: 'panel-muted text-[#dbe2f4]'}"
									title="{c.available.toLocaleString()} available"
								>
									{#if c.resource === "currency"}💰{:else}<ResourceIcon name={c.resource} class="size-3.5" />{/if}
									<span class="font-mono">{c.needed.toLocaleString()}</span>
								</span>
							{/each}
							<Badge tone="neutral">{b.days} days</Badge>
							{#if b.infrastructureRequired}
								<Badge tone={data.region.infrastructure >= b.infrastructureRequired ? "neutral" : "red"}>
									needs infrastructure {b.infrastructureRequired}
								</Badge>
							{/if}
						</div>
					{/if}

					<div class="mt-auto pt-1">
						{#if full}
							<Button variant="subtle" block disabled>Maximum level reached</Button>
						{:else if b.underway}
							<p class="text-xs text-[#8e9abb]">The next level can be ordered once this one is finished.</p>
						{:else if !b.canOrder}
							<p class="text-xs text-[#8e9abb]">{b.problems[0] ?? "Built by the state's government."}</p>
						{:else if b.problems.length}
							<p class="text-xs text-red-300">{b.problems.join(" ")}</p>
						{:else}
							<form
								method="POST"
								action="?/build"
								use:confirmSubmit={{
									title: `Build ${b.name.toLowerCase()} in ${regionName}?`,
									body: `It costs ${data.payFrom === "region" ? "the regional budget and the state stockpile" : "the state"} ${b.costs.map((c) => `${c.needed.toLocaleString()} ${c.resource === "currency" ? "money" : c.resource}`).join(", ")} and takes ${b.days} days.`,
									confirmLabel: "Build"
								}}
								use:enhance={() => {
									busy = b.type;
									return async ({ result, update }) => {
										await update();
										busy = null;
										if (result.type === "success") celebrate(document.getElementById(`building-${b.type}`));
										else toastResult(result);
									};
								}}
							>
								<input type="hidden" name="buildingType" value={b.type} />
								<input type="hidden" name="quantity" value="1" />
								<input type="hidden" name="payFrom" value={data.payFrom} />
								<Button
									type="submit"
									variant="soft-emerald"
									block
									icon={FluentWrench20Filled}
									loading={busy === b.type}
								>
									Build level {b.level + 1}
								</Button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		{#if data.finished.length}
			<SectionCard>
				<h2 class="section-title mb-3">Recently finished</h2>
				<ul class="divide-y divide-[#8ea6e0]/10">
					{#each data.finished as f (f.id)}
						<li class="py-2 flex items-center justify-between gap-3 text-sm">
							<span class="text-[#dbe2f4] truncate">{f.name}</span>
							<span class="text-xs text-[#8e9abb] shrink-0">{f.at ? formatDate(f.at) : ""}</span>
						</li>
					{/each}
				</ul>
			</SectionCard>
		{/if}
	{/if}
</PageContainer>
