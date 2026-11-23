<!-- src/routes/(authenticated)/(dock)/state/[id]/economy/+page.svelte -->
<!-- The finance minister's desk: the treasury book, the power grid gauge,
     the state stockpile manifest and the drawers that lead elsewhere. -->
<script lang="ts">
	import { goodLabel } from "#lib/config/index.js";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentReceiptMoney20Filled from "~icons/fluent/receipt-money-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { STANCE_TONE } from "#lib/config/index.js";

	let { data } = $props();

	const money = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	const totalPowerOutput = $derived(
		data.powerPlants.reduce((sum, plant) => sum + (plant.isOperational ? plant.powerOutput : 0), 0)
	);

	const energyUtilization = $derived(
		data.energyInfo.totalProduction > 0
			? Math.round((data.energyInfo.usedProduction / data.energyInfo.totalProduction) * 100)
			: 0
	);

	type ResourceType =
		| "iron"
		| "copper"
		| "steel"
		| "gunpowder"
		| "wood"
		| "coal"
		| "oil"
		| "gas"
		| "uranium"
		| "rare_earth"
		| "silicon"
		| "fuel"
		| "enriched_uranium";
	const allResources: ResourceType[] = [
		"iron",
		"copper",
		"steel",
		"gunpowder",
		"wood",
		"coal",
		"oil",
		"gas",
		"uranium",
		"rare_earth",
		"silicon",
		"fuel",
		"enriched_uranium"
	];
	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));

	const drawers = $derived([
		{ href: `/state/${data.state.id}/energy`, label: "Energy desk", icon: FluentFlash20Filled },
		{ href: `/state/${data.state.id}/budget`, label: "Treasury statement", icon: FluentReceiptMoney20Filled },
		{ href: `/state/${data.state.id}/market`, label: "Government market", icon: FluentCart20Filled },
		{ href: `/state/${data.state.id}/proposal/create`, label: "Draft a tax bill", icon: FluentDocument20Filled }
	]);
</script>

<PageContainer maxWidth="5xl">
	<PageHeader
		title="Ministry of Economy"
		subtitle={data.state.name}
		icon={FluentMoney20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	>
		{#snippet actions()}
			{#if data.isPresident}
				<Badge tone="amber">President</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="grid md:grid-cols-2 gap-4">
		<!-- Treasury book -->
		<section class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentMoney20Filled class="size-5 text-positive" />
				Treasury
			</h2>
			<div>
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Cash in hand</p>
				<p class="font-mono text-3xl font-bold text-primary-fg animate-tick truncate">
					{money.format(data.treasury.balance)}
				</p>
			</div>
			<dl class="space-y-1.5 text-sm">
				<div class="flex items-center gap-2">
					<dt class="text-fg-muted">Collected to date</dt>
					<span class="flex-1 border-b border-dotted border-line/20 translate-y-1" aria-hidden="true"></span>
					<dd class="font-mono text-positive-fg">+{money.format(data.treasury.totalCollected)}</dd>
				</div>
				<div class="flex items-center gap-2">
					<dt class="text-fg-muted">Spent to date</dt>
					<span class="flex-1 border-b border-dotted border-line/20 translate-y-1" aria-hidden="true"></span>
					<dd class="font-mono text-red-300">−{money.format(data.treasury.totalSpent)}</dd>
				</div>
				<div class="flex items-center gap-2">
					<dt class="text-fg-muted">State debt</dt>
					<span class="flex-1 border-b border-dotted border-line/20 translate-y-1" aria-hidden="true"></span>
					<dd class="font-mono {data.debt > 0 ? 'text-amber-300' : 'text-fg-muted'}">
						{data.debt > 0 ? `−${money.format(data.debt)}` : "None"}
					</dd>
				</div>
			</dl>
			{#if data.stances.length}
				<div class="pt-3 border-t border-line/15">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted mb-2">Public opinion abroad</p>
					<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
						{#each data.stances as stance (stance.stateId)}
							<li>
								<a href="/state/{stance.stateId}" class="hover:text-primary-hover">{stance.name}</a>
								<span class="font-mono {STANCE_TONE[stance.label]}">
									{stance.stance > 0 ? "+" : ""}{stance.stance} · {stance.label}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>

		<!-- Power grid gauge -->
		<section class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentFlash20Filled class="size-5 text-primary-fg" />
				Power Grid
			</h2>
			<div class="flex items-end justify-between gap-3">
				<div>
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Load</p>
					<p
						class="font-mono text-3xl font-bold {energyUtilization >= 90
							? 'text-red-300'
							: energyUtilization >= 70
								? 'text-primary-fg'
								: 'text-fg'}"
					>
						{energyUtilization}%
					</p>
				</div>
				<p class="text-right font-mono text-xs text-fg-muted">
					{data.energyInfo.usedProduction} / {data.energyInfo.totalProduction} MW
				</p>
			</div>
			<div class="h-2.5 rounded-full bg-surface-0 overflow-hidden">
				<div
					class="h-full rounded-full transition-all duration-700 {energyUtilization >= 90
						? 'bg-red-500'
						: energyUtilization >= 70
							? 'bg-primary'
							: 'bg-positive'}"
					style="width: {Math.min(energyUtilization, 100)}%"
				></div>
			</div>
			{#if data.powerPlants.length > 0}
				<ul class="space-y-1 text-sm">
					{#each data.powerPlants as plant (plant.id)}
						<li class="flex items-center gap-2 min-w-0">
							<span
								class="size-1.5 shrink-0 rounded-full {plant.isOperational ? 'bg-positive' : 'bg-red-500'}"
								title={plant.isOperational ? "Running" : "Offline"}
							></span>
							<span class="text-fg-body truncate">{plant.name}</span>
							<span class="text-xs text-fg-muted capitalize">{plant.plantType}</span>
							<span class="ml-auto font-mono text-xs text-fg">{plant.powerOutput} MW</span>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-fg-muted">{totalPowerOutput} MW from {data.powerPlants.length} plants</p>
			{/if}
		</section>
	</div>

	<!-- Stockpile manifest -->
	<section class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			<FluentBox20Filled class="size-5 text-politics" />
			State Stockpile
		</h2>
		<ul class="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
			{#each allResources as resource (resource)}
				{@const quantity = resourceMap.get(resource) || 0}
				<li class="flex items-center gap-2 py-2 border-b border-dashed border-line/15 min-w-0">
					<ResourceIcon name={resource} class="size-5 shrink-0" />
					<span class="text-sm text-fg-soft truncate">{goodLabel(resource)}</span>
					<span class="ml-auto font-mono text-sm font-bold {quantity > 0 ? 'text-fg' : 'text-fg-muted/60'}">
						{quantity.toLocaleString()}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Drawers -->
	<nav class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" aria-label="Ministry tools">
		{#each drawers as drawer (drawer.href)}
			<a href={drawer.href} class="group panel-interactive rounded-sm p-3 flex items-center gap-3 min-w-0">
				<drawer.icon class="size-5 shrink-0 text-primary-fg" />
				<span
					class="flex-1 text-sm font-semibold text-fg-body group-hover:text-primary-hover transition-colors truncate"
				>
					{drawer.label}
				</span>
				<FluentChevronRight20Filled class="size-4 shrink-0 text-fg-muted group-hover:text-primary-hover" />
			</a>
		{/each}
	</nav>
</PageContainer>
