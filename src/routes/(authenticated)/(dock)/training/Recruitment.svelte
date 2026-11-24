<!-- Recruitment office: one row per unit type — symbol, name, attack and
     defence, drill time, the full price as inline chips, and Recruit. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { POPULATION_FLOOR, canCoverManpower, manpowerCostOf, type MilitaryUnitTemplate } from "#lib/config/index.js";
	import { Button } from "#lib/component/ui/index.js";
	import FluentPersonAdd20Regular from "~icons/fluent/person-add-20-regular";
	import ForceSymbol from "./ForceSymbol.svelte";
	import { act, unitLabel } from "./forces";

	interface Props {
		templates: MilitaryUnitTemplate[];
		inventory: { currency: number; resources: Record<string, number>; products: Record<string, number> };
		/** Region population (recruits are drawn from it, down to a floor). */
		manpower: number;
		/** Why recruiting is blocked, or "" when it is not. */
		blocked: string;
		/** Element to glow when a recruit joins the drill yard. */
		glow?: () => HTMLElement | undefined;
	}
	let { templates, inventory, manpower, blocked, glow }: Props = $props();

	let pending = $state<string | null>(null);

	const COST_KEYS = [
		["currencyCost", "currency"],
		["ironCost", "iron"],
		["steelCost", "steel"],
		["gunpowderCost", "gunpowder"],
		["riflesCost", "rifles"],
		["ammunitionCost", "ammunition"],
		["artilleryCost", "artillery"],
		["vehiclesCost", "vehicles"],
		["explosivesCost", "explosives"]
	] as const;

	const available = $derived<Record<string, number>>({
		currency: inventory.currency,
		iron: inventory.resources.iron || 0,
		steel: inventory.resources.steel || 0,
		gunpowder: inventory.resources.gunpowder || 0,
		rifles: inventory.products.rifles || 0,
		ammunition: inventory.products.ammunition || 0,
		artillery: inventory.products.artillery || 0,
		vehicles: inventory.products.vehicles || 0,
		explosives: inventory.products.explosives || 0,
		manpower: Math.max(0, manpower - POPULATION_FLOOR)
	});

	function costsOf(t: MilitaryUnitTemplate): Record<string, number> {
		const costs: Record<string, number> = {};
		for (const [field, key] of COST_KEYS) if ((t[field] ?? 0) > 0) costs[key] = t[field] as number;
		costs.manpower = manpowerCostOf(t.unitType);
		return costs;
	}

	function shortfall(t: MilitaryUnitTemplate): string {
		for (const [field, key] of COST_KEYS) {
			if ((available[key] ?? 0) < (t[field] ?? 0)) return `Not enough ${key === "currency" ? "money" : key}`;
		}
		if (!canCoverManpower(manpower, manpowerCostOf(t.unitType))) return "Not enough spare civilians in your region";
		return "";
	}
</script>

<ul class="divide-y divide-line/15">
	{#each templates as t (t.id)}
		{@const missing = shortfall(t)}
		<li
			class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5 md:grid-cols-[auto_13rem_minmax(0,1fr)_auto]"
		>
			<ForceSymbol unitType={t.unitType} size={28} title={unitLabel(t.unitType)} />
			<div class="min-w-0">
				<p class="truncate text-sm font-medium text-fg">{unitLabel(t.unitType)}</p>
				<p class="data text-[11px] text-fg-muted">
					<span title="Attack">ATK <span class="text-fg-soft">{t.baseAttack}</span></span>
					· <span title="Defence">DEF <span class="text-fg-soft">{t.baseDefense}</span></span>
					· <span title="Time in the drill yard">{t.trainingDuration}h drill</span>
				</p>
			</div>
			<div class="col-span-full row-start-2 md:col-span-1 md:row-start-auto">
				<ResourceRequirements inline title="Recruitment cost" costs={costsOf(t)} {available} />
			</div>
			<form
				method="POST"
				action="?/train"
				class="col-start-3 row-start-1 md:col-start-auto md:row-start-auto"
				use:enhance={act({ busy: (v) => (pending = v ? t.unitType : null), glow })}
			>
				<input type="hidden" name="unitType" value={t.unitType} />
				<Button
					type="submit"
					size="sm"
					variant={missing || blocked ? "ghost" : "secondary"}
					icon={FluentPersonAdd20Regular}
					disabled={!!blocked || !!missing || pending !== null}
					loading={pending === t.unitType}
					title={blocked || missing || `Recruit ${unitLabel(t.unitType)}`}
				>
					Recruit
				</Button>
			</form>
		</li>
	{/each}
</ul>
