<!-- src/routes/(authenticated)/(dock)/domains/ShadowPanel.svelte -->
<!-- The shadow economy: smuggling routes our state runs, cargo runs by the
     player, and opening new routes for leaders. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentIncognito20Regular from "~icons/fluent/incognito-20-regular";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { SMUGGLING, SMUGGLING_GOODS, SMUGGLING_GOOD_IDS, type SmugglingGood } from "#lib/config/index.js";
	import { humanize, money, outcomeTone, submitOrder, type Planner, type StateOption } from "./shared";
	import type { PageData } from "./$types";

	let {
		p,
		civilian,
		targets
	}: { p: Planner | null; civilian: NonNullable<PageData["civilian"]>; targets: StateOption[] } = $props();

	let good = $state<SmugglingGood>("chips");
	let partner = $state("");

	const goodName = (g: string) => SMUGGLING_GOODS[g as SmugglingGood]?.label ?? humanize(g);
	const held = (g: string) => civilian.resources[g] ?? civilian.products[g] ?? 0;
	const routes = $derived(p?.routes ?? []);
</script>

<section id="shadow" class="panel scroll-mt-20 p-4" aria-labelledby="shadow-title">
	<header class="mb-3 flex items-center justify-between gap-2">
		<h2 id="shadow-title" class="section-title"><FluentIncognito20Regular class="size-4" />Shadow economy</h2>
		<span class="text-xs text-fg-muted" title="Your wallet">
			<span class="data text-fg">{money(civilian.wallet)}</span>
		</span>
	</header>

	<div class="divide-y divide-line/15">
		{#if routes.length}
			<ul class="space-y-0 divide-y divide-line/10 pb-3">
				{#each routes as r (r.id)}
					<li class="py-2">
						<form method="POST" action="?/runRoute" use:enhance={submitOrder} class="flex flex-wrap items-center gap-2">
							<input type="hidden" name="routeId" value={r.id} />
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs text-fg-soft">{r.origin} → {r.target}</p>
								<p class="text-xs text-fg-faint">
									{goodName(r.good)} · <span class="data {r.risk >= 40 ? 'text-warning' : ''}">{r.risk}%</span> risk ·
									you hold <span class="data">{held(r.good)}</span>
								</p>
							</div>
							<input
								class="field-control data h-7 w-16 px-2 text-xs"
								type="number"
								name="quantity"
								value="10"
								min="1"
								aria-label="Quantity"
							/>
							<Button type="submit" size="xs" variant="secondary">Run</Button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="pb-3 text-xs text-fg-muted">No smuggling routes open{p?.roles.smuggler ? " — open one below." : "."}</p>
		{/if}

		{#if p?.roles.smuggler}
			<form method="POST" action="?/openRoute" use:enhance={submitOrder} class="space-y-2 py-3">
				<h3 class="text-sm font-medium text-fg">Open a route</h3>
				<label class="sr-only" for="smuggle-good">Cargo</label>
				<select id="smuggle-good" class="field-control h-8 w-full px-2 text-sm" name="good" bind:value={good}>
					{#each SMUGGLING_GOOD_IDS as g (g)}
						<option value={g}>{SMUGGLING_GOODS[g].label}</option>
					{/each}
				</select>
				<SearchSelect
					name="targetStateId"
					items={targets}
					bind:value={partner}
					showId
					placeholder="Partner state…"
					searchPlaceholder="Search states…"
				/>
				<div class="flex items-center justify-between gap-3">
					<ResourceRequirements inline costs={{ cost: SMUGGLING.ROUTE_COST }} available={{}} />
					<Button type="submit" size="sm" variant="secondary" disabled={!partner}>Open route</Button>
				</div>
			</form>
		{/if}

		{#if civilian.runs.length}
			<div class="pt-3">
				<h3 class="section-title mb-1.5">Your runs</h3>
				<ul class="space-y-1 text-xs">
					{#each civilian.runs.slice(0, 5) as run (run.id)}
						<li class="flex items-center justify-between gap-2">
							<span class="truncate text-fg-soft">
								{goodName(run.good)} <span class="data text-fg-faint">×{run.quantity}</span>
							</span>
							<span class="flex items-center gap-2">
								{#if run.payout}<span class="data text-positive-fg">+{money(run.payout)}</span>{/if}
								{#if run.fine}<span class="data text-error">−{money(run.fine)}</span>{/if}
								<Badge tone={outcomeTone(run.outcome)} size="xs">{humanize(run.outcome)}</Badge>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>
