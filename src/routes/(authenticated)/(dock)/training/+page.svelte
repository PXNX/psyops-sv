<!-- /src/routes/(authenticated)/(dock)/training/+page.svelte -->
<!-- The barracks: the roster of serving units (service records), the
     recruitment office to enlist new ones, and the drill yard queue. -->
<script lang="ts">
	import { vanish } from "#lib/utils/motion.js";
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "$app/forms";
	import type { PageData } from "./$types";
	import FluentTarget from "~icons/fluent/target-24-regular";
	import IconAdd from "~icons/fluent/add-24-filled";
	import IconDelete from "~icons/fluent/delete-24-filled";
	import IconCheckmark from "~icons/fluent/checkmark-24-filled";
	import IconClock from "~icons/fluent/clock-24-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import * as m from "#lib/paraglide/messages.js";
	import { canCoverManpower, getExperienceLevel, manpowerCostOf } from "#lib/config/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { celebrate } from "#lib/utils/celebrate.js";

	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, IconButton, Badge } from "#lib/component/ui/index.js";

	let { data }: { data: PageData } = $props();

	// Unit type names are paraglide messages keyed by the unit type.
	const unitLabel = (unitType: string) => (m as unknown as Record<string, () => string>)[unitType]?.() ?? unitType;

	let isSubmitting = $state(false);
	let selectedTemplate = $state<any>(null);
	let now = $state(Date.now());
	let yard = $state<HTMLElement>();
	let roster = $state<HTMLElement>();

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 30000);
		return () => clearInterval(t);
	});

	const trainingDisabled = $derived(data.isIndependentRegion || data.isTraveling);
	const trainingDisabledReason = $derived(
		data.isIndependentRegion
			? "Independent region — join a state to recruit."
			: data.isTraveling
				? "No recruiting while travelling."
				: ""
	);

	// Olive-ink tint for the unit silhouettes; gold when picked.
	const INK =
		"[filter:brightness(0)_saturate(100%)_invert(80%)_sepia(10%)_saturate(500%)_hue-rotate(180deg)_brightness(95%)_contrast(90%)]";
	const INK_GOLD =
		"[filter:brightness(0)_saturate(100%)_invert(76%)_sepia(58%)_saturate(640%)_hue-rotate(352deg)_brightness(96%)_contrast(92%)]";

	function getUnitIconPath(unitType: string): string {
		return `/units/${unitType}.svg`;
	}

	function canAfford(template: any): boolean {
		if (!template || !data.inventory) return false;
		return (
			data.inventory.currency >= template.currencyCost &&
			(data.inventory.resources.iron || 0) >= template.ironCost &&
			(data.inventory.resources.steel || 0) >= template.steelCost &&
			(data.inventory.resources.gunpowder || 0) >= template.gunpowderCost &&
			(data.inventory.products.rifles || 0) >= template.riflesCost &&
			(data.inventory.products.ammunition || 0) >= template.ammunitionCost &&
			(data.inventory.products.artillery || 0) >= template.artilleryCost &&
			(data.inventory.products.vehicles || 0) >= template.vehiclesCost &&
			(data.inventory.products.explosives || 0) >= template.explosivesCost &&
			canCoverManpower(data.availableManpower ?? 0, manpowerCostOf(template.unitType))
		);
	}

	function getTemplateCosts(template: any): Record<string, number> {
		const costs: Record<string, number> = {};
		if (template.currencyCost > 0) costs.currency = template.currencyCost;
		if (template.ironCost > 0) costs.iron = template.ironCost;
		if (template.steelCost > 0) costs.steel = template.steelCost;
		if (template.gunpowderCost > 0) costs.gunpowder = template.gunpowderCost;
		if (template.riflesCost > 0) costs.rifles = template.riflesCost;
		if (template.ammunitionCost > 0) costs.ammunition = template.ammunitionCost;
		if (template.artilleryCost > 0) costs.artillery = template.artilleryCost;
		if (template.vehiclesCost > 0) costs.vehicles = template.vehiclesCost;
		if (template.explosivesCost > 0) costs.explosives = template.explosivesCost;
		return costs;
	}

	function getAvailableResources(): Record<string, number> {
		return {
			currency: data.inventory.currency,
			iron: data.inventory.resources.iron || 0,
			steel: data.inventory.resources.steel || 0,
			gunpowder: data.inventory.resources.gunpowder || 0,
			rifles: data.inventory.products.rifles || 0,
			ammunition: data.inventory.products.ammunition || 0,
			artillery: data.inventory.products.artillery || 0,
			vehicles: data.inventory.products.vehicles || 0,
			explosives: data.inventory.products.explosives || 0
		};
	}

	function progressBetween(start: Date | string | null, end: Date | string | null): number {
		if (!start || !end) return 0;
		const s = new Date(start).getTime();
		const e = new Date(end).getTime();
		return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
	}

	function timeLeft(end: Date | string | null): string {
		if (!end) return "";
		const diff = new Date(end).getTime() - now;
		if (diff <= 0) return "Ready";
		const hours = Math.floor(diff / 3600000);
		const minutes = Math.floor((diff % 3600000) / 60000);
		return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
	}

	const activeUnits = $derived(data.units.filter((u) => !u.isTraining));
	const trainingUnits = $derived(
		data.units
			.filter((u) => u.isTraining)
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
	);
	// Only the first unit in the queue is actually drilling.
	const activeTrainingUnit = $derived(trainingUnits[0]);
	const queuedUnits = $derived(trainingUnits.slice(1));

	// Shared enhance: busy flag, toast on failure, a quiet glow on success.
	function submit(target: () => HTMLElement | undefined, after?: () => void): SubmitFunction {
		return () => {
			isSubmitting = true;
			return async ({ update, result }) => {
				await update();
				isSubmitting = false;
				after?.();
				if (result.type === "success") celebrate(target());
				else toastResult(result);
			};
		};
	}

	const bars = [
		{ key: "organization", label: "ORG", color: "var(--color-friendly)" },
		{ key: "health", label: "STR", color: "var(--color-positive)" },
		{ key: "supplyLevel", label: "SUP", color: "var(--color-primary)" },
		{ key: "fuel", label: "FUEL", color: "var(--color-warning)" }
	] as const;
</script>

<PageContainer maxWidth="6xl">
	<PageHeader title="Barracks" documentTitle="Training" icon={FluentTarget} />

	{#if trainingDisabled}
		<p
			class="bg-primary/12 border border-primary/35 text-primary-fg rounded-sm px-4 py-3 text-sm flex items-center gap-2"
		>
			<FluentWarning20Filled class="size-4 shrink-0" />
			{trainingDisabledReason}
		</p>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2 space-y-6">
			<!-- Roster -->
			<section bind:this={roster} class="space-y-3">
				<div class="flex items-center justify-between">
					<h2 class="section-title">Roster</h2>
					{#if activeUnits.length > 0}
						<Badge tone="green">{activeUnits.length} in service</Badge>
					{/if}
				</div>

				{#each activeUnits as unit, i (unit.id)}
					{@const tpl = data.templates[unit.unitType]}
					{@const level = getExperienceLevel(unit.experience ?? 0)}
					<article
						out:vanish
						class="panel rounded-sm p-4 sm:p-5 animate-rise-in"
						style="--rise-delay: {Math.min(i, 6) * 40}ms"
					>
						<!-- Service record header -->
						<div class="flex items-start gap-3">
							<div class="size-12 shrink-0 panel-muted rounded-sm p-1.5">
								<img
									loading="lazy"
									decoding="async"
									src={getUnitIconPath(unit.unitType)}
									alt=""
									class="size-full object-contain opacity-90 {INK}"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted font-mono">
									No. {String(unit.id).padStart(4, "0")} · {unitLabel(unit.unitType)}
								</p>
								<h3 class="font-bold text-fg truncate">{unit.name}</h3>
								<div class="mt-1 flex flex-wrap items-center gap-1.5">
									<Badge tone="red" size="xs">ATK {tpl.baseAttack}</Badge>
									<Badge tone="blue" size="xs">DEF {tpl.baseDefense}</Badge>
									<Badge tone="purple" size="xs">{level.label}</Badge>
								</div>
							</div>
							<form
								method="POST"
								action="?/disbandUnit"
								use:confirmSubmit={{
									title: `Disband ${unit.name}?`,
									body: "No refund.",
									confirmLabel: "Disband",
									danger: true
								}}
								use:enhance={() =>
									async ({ update, result }) => {
										await update();
										toastResult(result);
									}}
							>
								<input type="hidden" name="unitId" value={unit.id} />
								<IconButton
									type="submit"
									icon={IconDelete}
									label="Disband unit"
									variant="ghost"
									size="sm"
									shape="square"
									class="text-fg-muted hover:text-red-400 hover:bg-red-500/10"
								/>
							</form>
						</div>

						<!-- Condition -->
						<div class="mt-4">
							<div class="flex items-center justify-between text-xs mb-1">
								<span class="text-fg-muted">EXP</span>
								<span class="font-mono text-fg-soft">{unit.experience ?? 0}%</span>
							</div>
							<div class="h-1.5 bg-surface-0/70 rounded-full overflow-hidden border border-line/10">
								<div
									class="h-full rounded-full bg-politics transition-all duration-500"
									style="width: {unit.experience ?? 0}%"
								></div>
							</div>
						</div>
						<div class="mt-2 grid grid-cols-3 gap-3">
							{#each bars as bar}
								<div>
									<div class="flex items-center justify-between text-xs mb-1">
										<span class="text-fg-muted">{bar.label}</span>
										<span class="font-mono text-fg-soft">{unit[bar.key]}%</span>
									</div>
									<div class="h-1.5 bg-surface-0/70 rounded-full overflow-hidden border border-line/10">
										<div
											class="h-full rounded-full transition-all duration-500"
											style="width: {unit[bar.key]}%; background: {bar.color}"
										></div>
									</div>
								</div>
							{/each}
						</div>

						<!-- Exercise -->
						<div class="mt-4 pt-3 border-t border-dashed border-line/20">
							{#if unit.isExercising}
								{@const exComplete = unit.exerciseCompletesAt && new Date(unit.exerciseCompletesAt).getTime() <= now}
								<div class="flex items-center justify-between text-xs mb-1">
									<span class="text-politics-fg">On exercise</span>
									<span class="text-fg-muted font-mono">{timeLeft(unit.exerciseCompletesAt)}</span>
								</div>
								<div class="h-1.5 bg-surface-0/70 rounded-full overflow-hidden border border-line/10 mb-3">
									<div
										class="h-full rounded-full bg-politics transition-all duration-700"
										style="width: {progressBetween(unit.exerciseStartedAt, unit.exerciseCompletesAt)}%"
									></div>
								</div>
								{#if exComplete}
									<form method="POST" action="?/completeExercise" use:enhance={submit(() => roster)}>
										<input type="hidden" name="unitId" value={unit.id} />
										<Button
											type="submit"
											variant="soft-emerald"
											size="sm"
											block
											disabled={isSubmitting}
											icon={IconCheckmark}
										>
											Complete exercise
										</Button>
									</form>
								{:else}
									<form method="POST" action="?/cancelExercise" use:enhance={submit(() => undefined)}>
										<input type="hidden" name="unitId" value={unit.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											block
											disabled={isSubmitting}
											class="hover:text-red-400"
										>
											Cancel exercise
										</Button>
									</form>
								{/if}
							{:else}
								{@const lowOrg = unit.organization < data.exerciseConfig.MIN_ORG_TO_START}
								<form method="POST" action="?/startExercise" use:enhance={submit(() => undefined)}>
									<input type="hidden" name="unitId" value={unit.id} />
									<Button
										type="submit"
										variant="secondary"
										size="sm"
										block
										icon={IconClock}
										disabled={isSubmitting || trainingDisabled || lowOrg}
									>
										Exercise ({data.exerciseConfig.DURATION_HOURS}h)
									</Button>
								</form>
								<p class="mt-1.5 text-[11px] leading-snug text-fg-muted">
									{#if lowOrg}
										Needs {data.exerciseConfig.MIN_ORG_TO_START}% ORG
									{:else}
										+{data.exerciseConfig.EXPERIENCE_GAIN} XP · −{data.exerciseConfig.ORG_COST} ORG · −{data
											.exerciseConfig.SUPPLY_COST} SUP · equipment worn
									{/if}
								</p>
							{/if}
						</div>
					</article>
				{/each}

				{#if activeUnits.length === 0}
					<EmptyState icon={FluentTarget} title="No units in service" />
				{/if}
			</section>

			<!-- Recruitment office -->
			<section class="panel rounded-sm p-5 space-y-4">
				<h2 class="section-title">Recruitment office</h2>

				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
					{#each Object.values(data.templates) as template (template.id)}
						{@const isSelected = selectedTemplate?.id === template.id}
						<button
							type="button"
							class="press-spring tap-target p-3 rounded-sm border transition-colors text-center {isSelected
								? 'bg-primary/12 border-primary/55'
								: 'bg-surface-4/70 border-line/15 hover:border-primary/45'} disabled:opacity-50 disabled:cursor-not-allowed"
							aria-pressed={isSelected}
							onclick={() => (selectedTemplate = template)}
							disabled={isSubmitting || trainingDisabled}
						>
							<img
								loading="lazy"
								decoding="async"
								src={getUnitIconPath(template.unitType)}
								alt=""
								class="size-12 mx-auto object-contain transition-[filter] {isSelected ? INK_GOLD : INK}"
							/>
							<span
								class="mt-1.5 block text-sm font-medium leading-tight {isSelected ? 'text-primary-fg' : 'text-fg-soft'}"
								>{unitLabel(template.unitType)}</span
							>
							<span class="mt-0.5 block text-[10px] font-mono text-fg-muted">
								{template.baseAttack}/{template.baseDefense} · {template.trainingDuration}h
							</span>
						</button>
					{/each}
				</div>

				{#if selectedTemplate}
					{#key selectedTemplate.id}
						<!-- Enlistment form -->
						<div class="panel-muted rounded-sm p-4 space-y-4 animate-rise-in">
							<div class="flex items-center gap-3 pb-3 border-b border-dashed border-line/20">
								<img
									loading="lazy"
									decoding="async"
									src={getUnitIconPath(selectedTemplate.unitType)}
									alt=""
									class="size-12 object-contain shrink-0 {INK}"
								/>
								<div class="min-w-0 flex-1">
									<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Enlistment order</p>
									<h3 class="font-serif text-lg font-bold text-fg truncate">{selectedTemplate.displayName}</h3>
								</div>
								<div class="text-right shrink-0">
									<p class="text-[10px] uppercase tracking-wide text-fg-muted">Drill</p>
									<p class="font-mono font-bold text-fg">{selectedTemplate.trainingDuration}h</p>
								</div>
							</div>

							<ResourceRequirements costs={getTemplateCosts(selectedTemplate)} available={getAvailableResources()} />

							<p class="mt-3 text-[10px] uppercase tracking-[0.2em] text-fg-muted">
								Manpower
								<span class="font-mono text-fg">{manpowerCostOf(selectedTemplate.unitType).toLocaleString()} civilians</span>
								· {data.availableManpower.toLocaleString()} in region
							</p>

							<form
								method="POST"
								action="?/train"
								use:enhance={submit(
									() => yard,
									() => (selectedTemplate = null)
								)}
							>
								<input type="hidden" name="unitType" value={selectedTemplate.unitType} />
								<Button
									type="submit"
									variant="primary"
									block
									icon={IconAdd}
									disabled={!canAfford(selectedTemplate) || trainingDisabled}
									loading={isSubmitting}
									loadingText="Enlisting…"
								>
									Enlist
								</Button>
							</form>
						</div>
					{/key}
				{/if}
			</section>
		</div>

		<!-- Drill yard -->
		<aside bind:this={yard} class="panel rounded-sm p-5 self-start space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Drill yard</h2>
				{#if trainingUnits.length > 0}
					<Badge tone="amber">{trainingUnits.length}</Badge>
				{/if}
			</div>

			{#if activeTrainingUnit}
				{@const isComplete =
					activeTrainingUnit.trainingCompletesAt && new Date(activeTrainingUnit.trainingCompletesAt).getTime() <= now}
				<div class="bg-primary/12 border border-primary/35 rounded-sm p-3">
					<div class="flex items-center gap-2 mb-2">
						<img
							loading="lazy"
							decoding="async"
							src={getUnitIconPath(activeTrainingUnit.unitType)}
							alt=""
							class="size-10 object-contain shrink-0 {INK}"
						/>
						<div class="flex-1 min-w-0">
							<h3 class="font-semibold text-fg text-sm truncate">{activeTrainingUnit.name}</h3>
							<p class="text-xs text-primary-fg font-mono">{timeLeft(activeTrainingUnit.trainingCompletesAt)}</p>
						</div>
					</div>
					<div class="h-1.5 bg-surface-0/70 rounded-full overflow-hidden border border-line/10">
						<div
							class="h-full rounded-full bg-primary transition-all duration-700"
							style="width: {progressBetween(
								activeTrainingUnit.trainingStartedAt,
								activeTrainingUnit.trainingCompletesAt
							)}%"
						></div>
					</div>
					{#if isComplete}
						<form method="POST" action="?/completeTraining" use:enhance={submit(() => roster)} class="mt-3">
							<input type="hidden" name="unitId" value={activeTrainingUnit.id} />
							<Button type="submit" variant="soft-emerald" size="sm" block icon={IconCheckmark} disabled={isSubmitting}>
								Pass out
							</Button>
						</form>
					{/if}
				</div>
			{/if}

			{#if queuedUnits.length > 0}
				<ol class="space-y-1.5">
					{#each queuedUnits as unit, index (unit.id)}
						<li out:vanish class="panel-muted rounded-sm px-2.5 py-2 flex items-center gap-2">
							<span class="text-xs font-mono text-fg-muted w-5 shrink-0">{index + 2}.</span>
							<img
								loading="lazy"
								decoding="async"
								src={getUnitIconPath(unit.unitType)}
								alt=""
								class="size-6 object-contain shrink-0 {INK}"
							/>
							<span class="text-sm text-fg-body truncate flex-1">{unit.name}</span>
							<span class="text-[10px] uppercase tracking-wide text-fg-muted">Waiting</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if trainingUnits.length === 0}
				<p class="py-6 text-center text-sm text-fg-muted">The yard is empty.</p>
			{/if}
		</aside>
	</div>
</PageContainer>
