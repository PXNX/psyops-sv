<!-- The energy desk: where the finance minister sites plants and decides who
     gets the refined fuel. Rules live in config/services; this is just the
     paperwork. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentBattery20Filled from "~icons/fluent/battery-20-filled";
	import FluentCart20Filled from "~icons/fluent/cart-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	const money = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const formatCurrency = (n: number) => money.format(n);

	let selectedRegionId = $state<number>(data.regions[0]?.id ?? 0);
	let selectedType = $state<string>("solar");
	let plantName = $state("");

	let civilian = $state(data.energy.civilianShare);
	let military = $state(data.energy.militaryShare);
	let exportShare = $state(data.energy.exportShare);
	const shareTotal = $derived(civilian + military + exportShare);

	const selectedRegion = $derived(data.regions.find((r) => r.id === selectedRegionId) ?? data.regions[0]);
	const preview = $derived(selectedRegion?.previews.find((p) => p.type === selectedType));
	const utilization = $derived(
		data.energy.totalProduction > 0 ? Math.round((data.energy.usedProduction / data.energy.totalProduction) * 100) : 0
	);
	const canBuild = $derived(preview && preview.problems.length === 0 && plantName.trim().length >= 3);
</script>

<svelte:head>
	<title>Energy desk · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Energy Desk"
		subtitle={data.state.name}
		icon={FluentFlash20Filled}
		backHref="/state/{data.state.id}/economy"
		backLabel="Economy"
	>
		{#snippet actions()}
			<Badge tone={data.blockaded ? "red" : "green"}>
				{data.blockaded ? "Blockade — imports cost 35% more" : "World market open"}
			</Badge>
		{/snippet}
	</PageHeader>

	<!-- Grid at a glance -->
	<section class="panel rounded-sm p-5 space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="section-title"><FluentFlash20Filled class="size-5 text-primary-fg" /> National grid</h2>
			<p class="font-mono text-sm text-fg-muted">
				{data.energy.usedProduction} / {data.energy.totalProduction} MW · {utilization}% load
			</p>
		</div>
		<div class="h-2.5 rounded-full bg-surface-0 overflow-hidden">
			<div class="h-full rounded-full bg-primary transition-all duration-700" style="width: {Math.min(utilization, 100)}%"></div>
		</div>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
			<div>
				<p class="text-fg-muted">Fuel supply</p>
				<p class="font-mono font-bold {data.energy.fuelFactor < 100 ? 'text-red-300' : 'text-positive-fg'}">{data.energy.fuelFactor}%</p>
			</div>
			<div>
				<p class="text-fg-muted">Upkeep paid</p>
				<p class="font-mono font-bold {data.energy.maintenanceFactor < 100 ? 'text-amber-300' : 'text-positive-fg'}">{data.energy.maintenanceFactor}%</p>
			</div>
			<div>
				<p class="text-fg-muted">Civilian heat fuel</p>
				<p class="font-mono font-bold text-fg">{data.energy.civilianFuel.toLocaleString()}</p>
			</div>
			<div>
				<p class="text-fg-muted">Military reserve</p>
				<p class="font-mono font-bold text-fg">{data.energy.militaryFuel.toLocaleString()}</p>
			</div>
		</div>
		<p class="text-xs text-fg-muted">
			{data.energy.exportedFuel.toLocaleString()} fuel exported to date. Refined fuel is divided by the policy below on the daily tick.
		</p>
	</section>

	<div class="grid gap-4 lg:grid-cols-2 items-start mt-4">
		<!-- Refined-fuel policy -->
		<form
			method="POST"
			action="?/setPolicy"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				toastResult(result);
			}}
			class="panel rounded-sm p-5 space-y-4"
		>
			<h2 class="section-title"><FluentCart20Filled class="size-5 text-positive-fg" /> Refined-fuel policy</h2>
			<p class="text-xs text-fg-muted">
				Each day the state's refined fuel is split into these three pools. Export fuel leaves the country and pays into the treasury; the military reserve funds naval operations; the civilian pool eases home heating.
			</p>
			<div class="grid grid-cols-3 gap-3">
				<div>
					<label for="civilian" class="field-label">Civilian %</label>
					<input id="civilian" name="civilian" type="number" min="0" max="100" bind:value={civilian} class="field-control rounded-sm px-3 py-2 font-mono w-full" />
				</div>
				<div>
					<label for="military" class="field-label">Military %</label>
					<input id="military" name="military" type="number" min="0" max="100" bind:value={military} class="field-control rounded-sm px-3 py-2 font-mono w-full" />
				</div>
				<div>
					<label for="export" class="field-label">Export %</label>
					<input id="export" name="export" type="number" min="0" max="100" bind:value={exportShare} class="field-control rounded-sm px-3 py-2 font-mono w-full" />
				</div>
			</div>
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs {shareTotal === 100 ? 'text-positive-fg' : 'text-red-300'}">
					Total {shareTotal}% · must add to 100
				</p>
				<Button type="submit" disabled={shareTotal !== 100 || !data.role}>Apply policy</Button>
			</div>
		</form>

		<!-- Site a new plant -->
		<form
			method="POST"
			action="?/buildPlant"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				toastResult(result);
			}}
			class="panel rounded-sm p-5 space-y-4"
		>
			<h2 class="section-title"><FluentFlash20Filled class="size-5 text-primary-fg" /> Site a power plant</h2>
			<div class="grid grid-cols-2 gap-3">
				<div class="min-w-0">
					<label for="regionId" class="field-label">Region</label>
					<select id="regionId" name="regionId" bind:value={selectedRegionId} class="field-control rounded-sm px-3 py-2 w-full">
						{#each data.regions as region (region.id)}
							<option value={region.id}>{region.name} · grid {region.grid} · {region.terrain}</option>
						{/each}
					</select>
				</div>
				<div class="min-w-0">
					<label for="plantName" class="field-label">Plant name</label>
					<input id="plantName" name="name" bind:value={plantName} minlength="3" placeholder="e.g. Sahara Solar I" class="field-control rounded-sm px-3 py-2 w-full" />
				</div>
			</div>
			<input type="hidden" name="plantType" value={selectedType} />

			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Plant type">
				{#each selectedRegion?.previews ?? [] as option (option.type)}
					<button
						type="button"
						onclick={() => (selectedType = option.type)}
						aria-pressed={selectedType === option.type}
						class="tap-target px-2.5 py-1.5 rounded-sm border text-xs transition-colors {selectedType === option.type
							? 'border-primary bg-primary/12 text-primary-fg'
							: 'border-line/20 text-fg-muted hover:text-fg'}"
					>
						{option.icon} {option.label}
					</button>
				{/each}
			</div>

			{#if preview}
				<div class="panel-muted rounded-sm p-3 space-y-2 text-xs">
					<div class="flex items-center justify-between gap-3">
						<span class="text-fg-soft">Expected output</span>
						<span class="font-mono font-bold text-primary-fg">{preview.output} MW</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-fg-soft">Siting factor</span>
						<span class="font-mono text-fg">{Math.round(preview.factor * 100)}% · grid {preview.gridRequired}+</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-fg-soft">Build time</span>
						<span class="font-mono text-fg">{preview.days} days</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-fg-soft">Imported components</span>
						<span class="font-mono text-fg">{formatCurrency(preview.partsCost)}</span>
					</div>
					{#if preview.notes.length}
						<p class="text-fg-muted">{preview.notes.join(" · ")}</p>
					{/if}
					{#if preview.problems.length}
						<ul class="text-red-300 space-y-0.5">
							{#each preview.problems as problem}<li>· {problem}</li>{/each}
						</ul>
					{:else}
						<p class="text-positive-fg">Site approved. Materials and treasury are available.</p>
					{/if}
				</div>
			{/if}
			<div class="flex justify-end">
				<Button type="submit" disabled={!canBuild}>Start construction</Button>
			</div>
		</form>
	</div>

	<!-- The plants themselves -->
	<section class="panel rounded-sm mt-4 overflow-hidden">
		<div class="px-5 py-3 border-b border-line/15">
			<h2 class="section-title"><FluentFlash20Filled class="size-5 text-primary-fg" /> Generating stations</h2>
		</div>
		{#if data.plants.length === 0}
			<p class="p-5 text-sm text-fg-muted">No plants yet. Site one above, then build out the region's grid network.</p>
		{:else}
			<ul class="divide-y divide-line/10">
				{#each data.plants as plant (plant.id)}
					<li class="flex items-center gap-3 px-5 py-3 text-sm min-w-0">
						<span class="text-lg shrink-0">{plant.icon}</span>
						<span class="font-semibold text-fg truncate">{plant.name}</span>
						<span class="text-xs text-fg-muted truncate">{plant.regionName ?? "State grid"} · {plant.label}</span>
						<span class="ml-auto font-mono text-xs shrink-0 {plant.underConstruction ? 'text-amber-300' : 'text-fg'}">
							{plant.underConstruction ? "Under construction" : plant.operational ? `${plant.output} MW` : "Offline"}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Network and storage note -->
	<section class="panel-muted rounded-sm p-4 mt-4 flex items-start gap-3">
		<FluentBattery20Filled class="size-5 shrink-0 text-positive-fg" />
		<div class="text-xs text-fg-muted space-y-1">
			<p class="text-fg font-semibold">Grid networks and battery storage</p>
			<p>
				Each grid-network level adds 120 MW of transmission capacity in a region and unlocks larger plants;
				battery storage adds 60 MW of dispatchable capacity and smooths solar and wind. Order both from the
				<a href="/state/{data.state.id}/construction" class="text-primary-hover hover:underline">state construction office</a>.
			</p>
		</div>
	</section>
</PageContainer>
