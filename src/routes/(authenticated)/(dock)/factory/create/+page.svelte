<!-- src/routes/factory/create/+page.svelte -->
<!-- Founding a factory, laid out as a works licence application: the site
     survey (deposits, taxes), the works to build, staffing, and the fees. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentError20Filled from "~icons/fluent/error-circle-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import PickaxeEmoji from "~icons/fluent-emoji/pick";
	import HammerWrenchEmoji from "~icons/fluent-emoji/hammer-and-wrench";

	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	let selectedFactoryType = $state("mine");
	let selectedOutput = $state("");
	let factoryName = $state("");
	let maxWorkers = $state(10);
	let workerWage = $state(1500);
	let submitting = $state(false);

	const factoryTypes = $derived([
		{
			value: "mine",
			label: "Mine",
			icon: PickaxeEmoji,
			desc: "Digs raw resources",
			costs: { currency: data.factoryCost, energy: 50 } as Record<string, number>
		},
		{
			value: "refinery",
			label: "Refinery",
			icon: HammerWrenchEmoji,
			desc: "Refines materials",
			costs: { currency: data.factoryCost, energy: 50 } as Record<string, number>
		},
		{
			value: "armaments",
			label: "Armaments",
			icon: FluentFactory20Filled,
			desc: "Builds weapons",
			costs: { currency: data.factoryCost, energy: 50, iron: 100, steel: 50, gunpowder: 25 } as Record<string, number>
		},
		{
			value: "fabrication",
			label: "Fabrication",
			icon: FluentFactory20Filled,
			desc: "Makes chips and electronics",
			costs: { currency: data.factoryCost, energy: 100 } as Record<string, number>
		},
		{
			value: "equipment",
			label: "Equipment",
			icon: FluentFactory20Filled,
			desc: "Makes the machine tools and fab kit every plant needs",
			costs: { currency: data.factoryCost, energy: 100 } as Record<string, number>
		}
	]);

	const outputsByType: Record<string, string[]> = {
		mine: ["iron", "copper", "coal", "wood", "oil", "gas", "uranium", "rare_earth", "silicon"],
		refinery: ["steel", "gunpowder", "fuel", "enriched_uranium"],
		armaments: ["rifles", "ammunition", "artillery", "vehicles", "explosives"],
		fabrication: ["chips", "electronics"],
		equipment: ["machine_tools", "fab_equipment"]
	};

	const selectedFactoryTypeData = $derived(factoryTypes.find((t) => t.value === selectedFactoryType));
	const regionResources = $derived(data.region?.resources || []);
	const isOnCooldown = $derived(data.isOnCooldown);
	const energyFree = $derived(
		data.stateEnergy ? data.stateEnergy.totalProduction - data.stateEnergy.usedProduction : 0
	);

	const hasEnoughCurrency = $derived(
		selectedFactoryTypeData ? data.userBalance >= selectedFactoryTypeData.costs.currency : false
	);
	const hasEnoughEnergy = $derived(
		!!data.stateEnergy && !!selectedFactoryTypeData && energyFree >= selectedFactoryTypeData.costs.energy
	);

	function canMine(resource: string) {
		return regionResources.some((r) => r.resourceType === resource && r.amount > 0);
	}

	const canCreate = $derived(
		hasEnoughCurrency &&
			hasEnoughEnergy &&
			!isOnCooldown &&
			factoryName.trim() &&
			data.region &&
			data.companyId &&
			(selectedFactoryType !== "mine" || canMine(selectedOutput)) &&
			selectedOutput
	);

	function formatTimeRemaining(cooldownEnd: string): string {
		const diff = new Date(cooldownEnd).getTime() - Date.now();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		return `${days}d ${hours}h`;
	}

	const availableResources = $derived.by(() => {
		const available: Record<string, number> = {
			currency: data.userBalance,
			energy: energyFree
		};
		if (data.userInventory) {
			Object.entries(data.userInventory).forEach(([resource, quantity]) => {
				available[resource] = quantity as number;
			});
		}
		return available;
	});
</script>

<PageContainer maxWidth="3xl">
	<PageHeader title="New Factory" icon={FluentFactory20Filled} backHref="/production" backLabel="Production" />

	{#if data.error}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5 flex items-start gap-3">
			<FluentError20Filled class="size-6 text-red-400 shrink-0" />
			<div class="space-y-3 flex-1">
				<p class="text-red-300 text-sm">{data.error}</p>
				<div class="flex flex-wrap gap-2">
					{#if data.error.includes("company")}
						<Button variant="soft-red" size="sm" href="/company/create">Create Company</Button>
					{/if}
					<Button variant="secondary" size="sm" href="/production">Go Back</Button>
				</div>
			</div>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update, result }) => {
					await update();
					submitting = false;
					toastResult(result);
				};
			}}
			class="panel rounded-sm p-5 sm:p-6 space-y-6"
		>
			<!-- Form head -->
			<div class="text-center border-b-2 border-double border-line/30 pb-4">
				<p class="text-[10px] uppercase tracking-[0.3em] text-fg-muted">Application for a</p>
				<h2 class="font-serif text-2xl font-black text-fg">Works Licence</h2>
				{#if data.region}
					<p class="mt-1 text-xs text-fg-muted">
						{data.region.name} · {data.region.stateName}
					</p>
				{/if}
			</div>

			{#if isOnCooldown && data.cooldownEndsAt}
				<p
					class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm px-3 py-2 text-sm flex items-center gap-2"
				>
					<FluentClock20Filled class="size-4 text-red-400 shrink-0" />
					Next licence in <strong class="font-mono">{formatTimeRemaining(data.cooldownEndsAt)}</strong>
				</p>
			{/if}

			<!-- 1. Site survey -->
			{#if data.region}
				<fieldset class="space-y-2">
					<legend class="field-label">1 · Site survey</legend>
					{#if regionResources.length > 0}
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{#each regionResources as resource (resource.resourceType)}
								<div class="panel-muted rounded-sm p-2.5">
									<div class="flex items-center gap-1.5">
										<ResourceIcon name={resource.resourceType} class="size-4" />
										<span class="text-sm font-medium text-fg capitalize truncate">{resource.resourceType}</span>
									</div>
									<p class="mt-0.5 text-xs text-fg-muted">
										<span class="font-mono text-politics-fg">{resource.remaining.toLocaleString()}</span> left · {resource.amount}%
									</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-primary-fg">No deposits to mine here.</p>
					{/if}
					<p class="text-xs text-fg-muted">
						Taxes: income <span class="text-primary-fg font-mono">{data.regionalTaxes?.incomeTax || 0}%</span> · sales
						<span class="text-primary-fg font-mono">{data.regionalTaxes?.salesTax || 0}%</span> · property
						<span class="text-primary-fg font-mono">{data.regionalTaxes?.propertyTax || 0}%</span>
					</p>
				</fieldset>
			{/if}

			<!-- 2. Works -->
			<fieldset class="space-y-3">
				<legend class="field-label">2 · Works</legend>
				<input
					type="text"
					id="name"
					name="name"
					aria-label="Factory name"
					bind:value={factoryName}
					placeholder="Name, e.g. Steel Works No. 1"
					maxlength="50"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					disabled={isOnCooldown}
				/>

				<div class="grid grid-cols-3 gap-2">
					{#each factoryTypes as type (type.value)}
						{@const selected = selectedFactoryType === type.value}
						<button
							type="button"
							aria-pressed={selected}
							class="press-spring p-3 rounded-sm border text-center transition-colors {selected
								? 'bg-primary/12 border-primary/55'
								: 'bg-surface-4/70 border-line/15 hover:border-line/35'}"
							onclick={() => {
								selectedFactoryType = type.value;
								selectedOutput = "";
							}}
							disabled={isOnCooldown}
						>
							<type.icon class="size-7 mb-1 mx-auto" />
							<span class="block font-bold text-sm {selected ? 'text-primary-fg' : 'text-fg'}">{type.label}</span>
							<span class="block text-[11px] text-fg-muted leading-tight">{type.desc}</span>
						</button>
					{/each}
				</div>
				<input type="hidden" name="factoryType" value={selectedFactoryType} />
				<p class="text-xs text-fg-muted">
					Requires {data.equipmentRules?.machine_tools ?? 5} machine tools{#if data.equipmentRules?.fab_equipment}
						and {data.equipmentRules.fab_equipment} fab equipment{/if}. You own
					{data.userEquipment?.machine_tools ?? 0} machine tools{#if data.equipmentRules?.fab_equipment},
						{data.userEquipment?.fab_equipment ?? 0} fab equipment{/if}. Tools wear out every
					{data.equipmentRules?.wearEvery ?? 5} shifts — build an equipment plant first.
				</p>

				<div class="grid grid-cols-4 sm:grid-cols-5 gap-2">
					{#each outputsByType[selectedFactoryType] as output (output)}
						{@const minable = selectedFactoryType !== "mine" || canMine(output)}
						{@const selected = selectedOutput === output}
						<button
							type="button"
							aria-pressed={selected}
							class="press-spring p-2 rounded-sm border text-center transition-colors disabled:opacity-40 {selected
								? 'bg-primary/12 border-primary/55'
								: 'bg-surface-4/70 border-line/15 hover:border-line/35'}"
							onclick={() => (selectedOutput = output)}
							disabled={isOnCooldown || !minable}
							title={minable ? undefined : "No deposit in this region"}
						>
							<ResourceIcon name={output} class="size-6 mx-auto" />
							<span class="block text-[11px] capitalize mt-1 truncate {selected ? 'text-primary-fg' : 'text-fg-soft'}"
								>{output}</span
							>
						</button>
					{/each}
				</div>
				<input type="hidden" name="output" value={selectedOutput} />
			</fieldset>

			<!-- 3. Staffing -->
			<fieldset class="space-y-3">
				<legend class="field-label">3 · Staffing</legend>
				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<div class="flex items-center justify-between text-sm">
							<label for="maxWorkers" class="text-fg-soft">Posts</label>
							<span class="font-mono font-bold text-fg">{maxWorkers}</span>
						</div>
						<input
							type="range"
							id="maxWorkers"
							name="maxWorkers"
							min="5"
							max="50"
							step="5"
							bind:value={maxWorkers}
							class="w-full accent-primary cursor-pointer"
							disabled={isOnCooldown}
						/>
					</div>
					<div>
						<div class="flex items-center justify-between text-sm">
							<label for="workerWage" class="text-fg-soft">Wage / shift</label>
							<span class="font-mono font-bold text-positive-fg">{workerWage.toLocaleString()}</span>
						</div>
						<input
							type="range"
							id="workerWage"
							name="workerWage"
							min="1000"
							max="5000"
							step="100"
							bind:value={workerWage}
							class="w-full accent-primary cursor-pointer"
							disabled={isOnCooldown}
						/>
					</div>
				</div>
				<p class="flex items-center justify-between text-xs text-fg-muted border-t border-dashed border-line/20 pt-2">
					Full crew per shift
					<span class="font-mono font-bold text-fg">{(maxWorkers * workerWage).toLocaleString()}</span>
				</p>
			</fieldset>

			<!-- 4. Fees -->
			{#if selectedFactoryTypeData}
				<fieldset class="space-y-2">
					<legend class="field-label">4 · Fees &amp; materials</legend>
					<ResourceRequirements costs={selectedFactoryTypeData.costs} available={availableResources} />
				</fieldset>
			{/if}

			<div class="flex gap-3 pt-2 border-t border-line/15">
				<Button variant="secondary" grow href="/production">Cancel</Button>
				<Button
					type="submit"
					variant="primary"
					grow
					loading={submitting}
					disabled={!canCreate}
					icon={FluentCheckmark20Filled}
				>
					File &amp; build
				</Button>
			</div>
		</form>
	{/if}
</PageContainer>
