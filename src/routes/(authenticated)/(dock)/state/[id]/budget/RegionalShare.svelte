<!-- src/routes/(authenticated)/(dock)/state/[id]/budget/RegionalShare.svelte -->
<!-- How the tax raised in each region is split: the state's default share for
     regional budgets, per-region overrides, and every region's balance. The
     president and the economy minister can change it; everyone else reads. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowSplit20Filled from "~icons/fluent/arrow-split-20-filled";
	import { Button, SearchSelect } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { getRegionName } from "#lib/utils/formatting.js";

	interface Props {
		split: {
			share: number;
			min: number;
			max: number;
			canEdit: boolean;
			regions: { id: number; balance: number; override: number | null; effective: number }[];
		};
	}

	const { split }: Props = $props();

	let share = $state(0);
	$effect.pre(() => {
		share = split.share;
	});
	let overrideRegion = $state<string | undefined>(undefined);
	let overrideShare = $state("");
	let busy = $state<string | null>(null);

	const regionItems = $derived(split.regions.map((r) => ({ id: r.id, name: getRegionName(r.id) })));
	const overrides = $derived(split.regions.filter((r) => r.override !== null));
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

	const submit = (key: string) => () => {
		busy = key;
		return async ({ result, update }: { result: Parameters<typeof toastResult>[0]; update: () => Promise<void> }) => {
			await update();
			busy = null;
			toastResult(result);
		};
	};
</script>

<section class="panel rounded-sm p-4 sm:p-5 space-y-4" id="regional-share" aria-labelledby="regional-share-title">
	<header>
		<h2 id="regional-share-title" class="section-title flex items-center gap-2">
			<FluentArrowSplit20Filled class="size-4 text-warning" />
			Regional share of local tax
		</h2>
		<p class="text-sm text-fg-muted mt-1">
			Of every tax raised in a region, this share goes to that region's budget for its governor to spend. The rest comes
			to the treasury.
			{#if !split.canEdit}Set by the president or the economy minister.{/if}
		</p>
	</header>

	{#if split.canEdit}
		<form
			method="POST"
			action="?/setRegionalShare"
			class="space-y-2"
			use:enhance={submit("share")}
			data-testid="regional-share-form"
		>
			<label for="regional-share-input" class="flex items-baseline justify-between gap-3 text-sm">
				<span>Regions keep</span>
				<span class="font-mono font-bold text-warning">{share}%</span>
			</label>
			<input
				id="regional-share-input"
				type="range"
				name="share"
				min={split.min}
				max={split.max}
				step="1"
				bind:value={share}
				class="w-full accent-[var(--color-warning)]"
			/>
			<div class="flex justify-between text-xs text-fg-muted font-mono">
				<span>{split.min}%</span>
				<span>Treasury gets {100 - share}%</span>
				<span>{split.max}%</span>
			</div>
			<Button type="submit" size="sm" loading={busy === "share"} disabled={share === split.share}>Set share</Button>
		</form>
	{:else}
		<p class="text-sm">
			Regions keep <span class="font-mono font-bold text-warning">{split.share}%</span>, the treasury gets
			<span class="font-mono">{100 - split.share}%</span>.
		</p>
	{/if}

	<!-- Per-region overrides -->
	{#if split.canEdit && regionItems.length}
		<form
			method="POST"
			action="?/setRegionOverride"
			class="grid gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-end"
			use:enhance={submit("override")}
		>
			<div class="min-w-0">
				<label class="text-xs text-fg-muted" for="override-region">Override for one region</label>
				<SearchSelect
					id="override-region"
					name="regionId"
					items={regionItems}
					bind:value={overrideRegion}
					showId
					placeholder="Pick a region"
				/>
			</div>
			<div>
				<label class="text-xs text-fg-muted" for="override-share">Share %</label>
				<input
					id="override-share"
					name="share"
					type="number"
					inputmode="numeric"
					min={split.min}
					max={split.max}
					placeholder="state"
					bind:value={overrideShare}
					class="input w-full"
				/>
			</div>
			<Button type="submit" size="sm" variant="secondary" loading={busy === "override"} disabled={!overrideRegion}>
				{overrideShare === "" || overrideShare === null ? "Clear override" : "Set override"}
			</Button>
		</form>
	{/if}

	<div>
		<h3 class="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted mb-1">Regional budgets</h3>
		<ul class="divide-y divide-line text-sm">
			{#each split.regions as r (r.id)}
				<li class="flex items-center justify-between gap-3 py-1.5 min-w-0">
					<a href="/region/{r.id}#region-budget" class="truncate hover:text-primary-hover">{getRegionName(r.id)}</a>
					<span class="flex items-center gap-3 shrink-0">
						<span class="font-mono text-xs {r.override !== null ? 'text-warning' : 'text-fg-muted'}">
							{r.effective}%{r.override !== null ? " override" : ""}
						</span>
						<span class="font-mono">{money(r.balance)}</span>
					</span>
				</li>
			{:else}
				<li class="py-1.5 text-fg-muted">This state holds no regions.</li>
			{/each}
		</ul>
		{#if overrides.length && split.canEdit}
			<p class="text-xs text-fg-muted mt-1">To clear an override, pick the region and leave the share empty.</p>
		{/if}
	</div>
</section>
