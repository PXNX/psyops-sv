<!-- src/routes/(authenticated)/(dock)/region/[id]/RegionBudget.svelte -->
<!-- The region's own purse: its balance, what the tax share brought in over
     the last day, the split with the state, recent ledger lines, and for the
     governor the ways to spend it (programmes here, public works on the
     construction page). Everyone else sees it read-only. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { countdown } from "#lib/utils/military.js";
	import { REGIONAL_PROGRAMMES, REGIONAL_PROGRAMME_KINDS, MAX_PROGRAMME_OPINION } from "#lib/config/index.js";

	interface Props {
		regionId: number;
		budget: {
			balance: number;
			totalCollected: number;
			totalSpent: number;
			incomeLastDay: number;
			share: number;
			stateShare: number;
			override: number | null;
			isGovernor: boolean;
			ledger: { id: number; kind: string; amount: number; description: string; at: string }[];
			programmes: { id: number; kind: string; opinion: number; endsAt: string }[];
			programmeOpinion: number;
		};
	}

	const { regionId, budget }: Props = $props();

	let pending = $state<string | null>(null);

	const money = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
	const running = $derived(new Set(budget.programmes.map((p) => p.kind)));
	const when = (iso: string) =>
		new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
</script>

<section class="panel rounded-sm p-4 sm:p-5 space-y-4" id="region-budget" aria-labelledby="region-budget-title">
	<header class="flex flex-wrap items-center justify-between gap-2">
		<h2 id="region-budget-title" class="section-title flex items-center gap-2">
			<FluentWallet20Filled class="size-4 text-warning" />
			Regional budget
		</h2>
		{#if budget.isGovernor}
			<Badge tone="green">You govern here</Badge>
		{/if}
	</header>

	<dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
		<div class="rounded-sm bg-surface-2/60 px-3 py-2 min-w-0">
			<dt class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Balance</dt>
			<dd class="font-mono text-lg font-bold text-fg truncate" data-testid="region-budget-balance">
				{money(budget.balance)}
			</dd>
		</div>
		<div class="rounded-sm bg-surface-2/60 px-3 py-2 min-w-0">
			<dt class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Last 24 h</dt>
			<dd class="font-mono text-lg text-positive-fg truncate">+{money(budget.incomeLastDay)}</dd>
		</div>
		<div class="rounded-sm bg-surface-2/60 px-3 py-2 min-w-0 col-span-2 sm:col-span-1">
			<dt class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Split of local tax</dt>
			<dd class="text-sm">
				<span class="font-mono font-bold">{budget.share}%</span> region ·
				<span class="font-mono">{100 - budget.share}%</span> state
				{#if budget.override !== null}
					<span class="block text-xs text-fg-muted">override (state default {budget.stateShare}%)</span>
				{/if}
			</dd>
		</div>
	</dl>

	<!-- Split bar -->
	<div class="h-1.5 rounded-full bg-surface-3 overflow-hidden flex" aria-hidden="true">
		<div class="bg-warning" style="width: {budget.share}%"></div>
		<div class="bg-friendly/60 flex-1"></div>
	</div>

	{#if budget.programmes.length}
		<div class="flex flex-wrap gap-2">
			{#each budget.programmes as p (p.id)}
				{@const def = REGIONAL_PROGRAMMES[p.kind as keyof typeof REGIONAL_PROGRAMMES]}
				<span class="rounded-sm bg-positive-bg/18 border border-positive/30 px-2 py-1 text-xs text-positive-fg">
					{def?.icon}
					{def?.name ?? p.kind} · +{p.opinion} opinion · {countdown(p.endsAt) ?? "ending"}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Spending -->
	<div class="space-y-2">
		<h3 class="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">
			{budget.isGovernor ? "Spend" : "What the governor can fund"}
		</h3>
		<ul class="grid gap-2 sm:grid-cols-3">
			{#each REGIONAL_PROGRAMME_KINDS as kind (kind)}
				{@const p = REGIONAL_PROGRAMMES[kind]}
				{@const isRunning = running.has(kind)}
				{@const short = budget.balance < p.cost}
				<li class="rounded-sm border border-line p-3 flex flex-col gap-2 min-w-0">
					<div class="min-w-0">
						<p class="text-sm font-bold">{p.icon} {p.name}</p>
						<p class="text-xs text-fg-muted">{p.description}</p>
						<p class="text-xs mt-1 font-mono">
							{money(p.cost)} · +{p.opinion} opinion · {p.days} days
						</p>
					</div>
					{#if budget.isGovernor}
						<form
							method="POST"
							action="?/startProgramme"
							class="mt-auto"
							use:enhance={() => {
								pending = kind;
								return async ({ result, update }) => {
									await update();
									pending = null;
									toastResult(result);
								};
							}}
						>
							<input type="hidden" name="kind" value={kind} />
							<Button
								type="submit"
								size="sm"
								variant="secondary"
								block
								loading={pending === kind}
								disabled={isRunning || short || pending !== null}
							>
								{isRunning ? "Running" : short ? `Short ${money(p.cost - budget.balance)}` : "Fund"}
							</Button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="text-xs text-fg-muted">
			Programmes together add at most +{MAX_PROGRAMME_OPINION} opinion{budget.programmeOpinion
				? `, now +${budget.programmeOpinion}`
				: ""}.
		</p>
		<a
			href="/region/{regionId}/construction"
			class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
			data-testid="region-budget-works"
		>
			<FluentBuilding20Filled class="size-5 text-friendly shrink-0" />
			<div class="min-w-0 flex-1">
				<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Public works</p>
				<p class="text-xs text-fg-muted">
					{budget.isGovernor
						? "Build here and pay from the regional budget instead of the treasury."
						: "The governor can pay for buildings here from this budget."}
				</p>
			</div>
		</a>
	</div>

	<!-- Ledger -->
	<div>
		<h3 class="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted mb-1">Recent ledger</h3>
		{#if budget.ledger.length}
			<ul class="divide-y divide-line text-sm">
				{#each budget.ledger as l (l.id)}
					<li class="flex items-baseline justify-between gap-3 py-1.5 min-w-0">
						<span class="min-w-0 truncate">
							<span class="text-xs text-fg-muted font-mono mr-1">{when(l.at)}</span>
							{l.description}
						</span>
						<span class="font-mono shrink-0 {l.amount >= 0 ? 'text-positive-fg' : 'text-hostile-fg'}">
							{l.amount >= 0 ? "+" : "−"}{money(l.amount)}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-fg-muted">Nothing yet. The share arrives as taxes are collected here.</p>
		{/if}
		<p class="text-xs text-fg-muted mt-2">
			{money(budget.totalCollected)} collected · {money(budget.totalSpent)} spent in total
		</p>
	</div>
</section>
