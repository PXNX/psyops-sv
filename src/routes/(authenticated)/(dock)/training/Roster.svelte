<!-- The roster: one dense row per unit of the branch with thin condition
     meters, its formation, and the two things you do to a unit from here —
     send it on exercise or disband it. Ready units can be ticked to assign
     them to a formation. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { vanish } from "#lib/utils/motion.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { getExperienceLevel, type MilitaryUnitTemplate } from "#lib/config/index.js";
	import { Badge, IconButton, Button } from "#lib/component/ui/index.js";
	import FluentPeopleTeam20Regular from "~icons/fluent/people-team-20-regular";
	import FluentDelete20Regular from "~icons/fluent/delete-20-regular";
	import FluentTimer20Regular from "~icons/fluent/timer-20-regular";
	import ForceSymbol from "./ForceSymbol.svelte";
	import Meter from "./Meter.svelte";
	import { act, progressBetween, timeLeft, unitLabel } from "./forces";

	type Unit = {
		id: number;
		name: string;
		unitType: string;
		groupId: number | null;
		organization: number;
		health: number;
		supplyLevel: number;
		fuel: number;
		experience: number;
		isTraining: boolean;
		trainingStartedAt: Date | string | null;
		trainingCompletesAt: Date | string | null;
		isExercising: boolean;
		exerciseCompletesAt: Date | string | null;
	};

	interface Props {
		units: Unit[];
		templates: Record<string, MilitaryUnitTemplate>;
		exercise: {
			MIN_ORG_TO_START: number;
			DURATION_HOURS: number;
			EXPERIENCE_GAIN: number;
			ORG_COST: number;
			SUPPLY_COST: number;
		};
		now: number;
		/** Recruiting/exercising blocked (independent region, travelling). */
		blocked: string;
		/** Group names by id, to tag each row with its formation. */
		groupNames: Map<number, string>;
		/** Which units may be ticked for a formation (null: no formations in this branch). */
		canGroup: ((u: Unit) => boolean) | null;
		selected: number[];
	}
	let { units, templates, exercise, now, blocked, groupNames, canGroup, selected = $bindable() }: Props = $props();

	let busy = $state(false);
	let list = $state<HTMLElement>();

	const COLS =
		"grid grid-cols-[1.25rem_1.75rem_minmax(0,1fr)_auto] md:grid-cols-[1.25rem_1.75rem_minmax(0,1fr)_repeat(5,2.75rem)_6.5rem] items-center gap-x-3";

	function toggle(id: number, on: boolean) {
		selected = on ? [...selected, id] : selected.filter((x) => x !== id);
	}
	const exerciseHint = $derived(
		`${exercise.DURATION_HOURS}h · +${exercise.EXPERIENCE_GAIN} EXP · −${exercise.ORG_COST} ORG · −${exercise.SUPPLY_COST} SUP · wears some equipment`
	);
</script>

{#if units.length}
	<div
		class="{COLS} hidden border-b border-line/15 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint md:grid"
	>
		<span></span><span></span><span>Unit</span>
		<span title="Experience">EXP</span>
		<span title="Organisation: readiness to fight">ORG</span>
		<span title="Strength: share of the unit still standing">STR</span>
		<span title="Supply">SUP</span>
		<span title="Fuel: a dry tank halves the unit's output in battle">FUEL</span>
		<span class="text-right">Orders</span>
	</div>
{/if}

<ul bind:this={list} class="divide-y divide-line/15">
	{#each units as unit (unit.id)}
		{@const tpl = templates[unit.unitType]}
		{@const level = getExperienceLevel(unit.experience ?? 0)}
		{@const selectable = !!canGroup?.(unit)}
		{@const group = unit.groupId ? groupNames.get(unit.groupId) : undefined}
		{@const lowOrg = unit.organization < exercise.MIN_ORG_TO_START}
		<li out:vanish class="{COLS} gap-y-2 py-2.5 {selected.includes(unit.id) ? 'bg-primary/6' : ''}">
			<span class="flex justify-center">
				{#if selectable}
					<input
						type="checkbox"
						class="checkbox checkbox-xs"
						aria-label="Select {unit.name}"
						checked={selected.includes(unit.id)}
						onchange={(e) => toggle(unit.id, e.currentTarget.checked)}
					/>
				{/if}
			</span>
			<ForceSymbol unitType={unit.unitType} size={26} title={unitLabel(unit.unitType)} />
			<div class="min-w-0">
				<p class="truncate text-sm font-medium text-fg">{unit.name}</p>
				<p class="flex min-w-0 flex-wrap items-center gap-x-2 text-[11px] text-fg-muted">
					<span class="truncate">{unitLabel(unit.unitType)}</span>
					{#if tpl}<span class="data text-fg-faint" title="Attack / defence">
							ATK {tpl.baseAttack} · DEF {tpl.baseDefense}
						</span>{/if}
					<span class="text-politics-fg">{level.label}</span>
					{#if group}<span class="flex items-center gap-1 text-fg-soft">
							<FluentPeopleTeam20Regular class="size-3" />{group}
						</span>{/if}
				</p>
			</div>

			{#if unit.isTraining}
				<div class="order-last col-span-full md:order-none md:col-span-5">
					<div class="flex justify-between text-[11px] text-fg-muted">
						<span>In the drill yard</span>
						<span class="data">{timeLeft(now, unit.trainingCompletesAt)}</span>
					</div>
					<div class="mt-1 h-[3px] overflow-hidden rounded-full bg-surface-0/80">
						<div
							class="h-full rounded-full bg-primary"
							style:width="{progressBetween(now, unit.trainingStartedAt, unit.trainingCompletesAt)}%"
						></div>
					</div>
				</div>
			{:else}
				<div class="order-last col-span-full grid grid-cols-5 gap-3 md:order-none md:contents">
					<Meter label="EXP" title="Experience" value={unit.experience ?? 0} bar="bg-politics" warnLow={false} />
					<Meter label="ORG" title="Organisation" value={unit.organization} bar="bg-friendly" />
					<Meter label="STR" title="Strength" value={unit.health} bar="bg-positive" />
					<Meter label="SUP" title="Supply" value={unit.supplyLevel} bar="bg-primary" />
					<Meter label="FUEL" title="Fuel" value={unit.fuel ?? 0} bar="bg-accent" />
				</div>
			{/if}

			<div class="flex items-center justify-end gap-1">
				{#if unit.isTraining}
					<Badge tone="amber" size="xs">Training</Badge>
				{:else if unit.isExercising}
					<Badge tone="purple" size="xs" icon={FluentTimer20Regular}>{timeLeft(now, unit.exerciseCompletesAt)}</Badge>
				{:else}
					<form method="POST" action="?/startExercise" use:enhance={act({ busy: (v) => (busy = v), glow: () => list })}>
						<input type="hidden" name="unitId" value={unit.id} />
						<Button
							type="submit"
							size="xs"
							variant="ghost"
							icon={FluentTimer20Regular}
							disabled={busy || !!blocked || lowOrg}
							title={blocked ||
								(lowOrg ? `Needs ${exercise.MIN_ORG_TO_START}% ORG to exercise` : `Exercise: ${exerciseHint}`)}
						>
							Exercise
						</Button>
					</form>
				{/if}
				<form
					method="POST"
					action="?/disbandUnit"
					use:confirmSubmit={{
						title: `Disband ${unit.name}?`,
						body: "No refund.",
						confirmLabel: "Disband",
						danger: true
					}}
					use:enhance={act()}
				>
					<input type="hidden" name="unitId" value={unit.id} />
					<IconButton
						type="submit"
						icon={FluentDelete20Regular}
						label="Disband {unit.name}"
						variant="ghost"
						size="xs"
						shape="square"
						class="text-fg-faint hover:bg-error/10 hover:text-error"
					/>
				</form>
			</div>
		</li>
	{/each}
</ul>
