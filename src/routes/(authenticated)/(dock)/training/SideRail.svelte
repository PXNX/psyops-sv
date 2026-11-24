<!-- Side rail: what is in progress. The drill yard queue, units out on
     exercise, and the officer corps with its academy. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import CommanderBadge from "#lib/component/CommanderBadge.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { ACADEMY } from "#lib/config/index.js";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import FluentClock20Regular from "~icons/fluent/clock-20-regular";
	import FluentTimer20Regular from "~icons/fluent/timer-20-regular";
	import FluentHatGraduation20Regular from "~icons/fluent/hat-graduation-20-regular";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import ForceSymbol from "./ForceSymbol.svelte";
	import { act, progressBetween, timeLeft, unitLabel } from "./forces";

	type Unit = {
		id: number;
		name: string;
		unitType: string;
		trainingStartedAt: Date | string | null;
		trainingCompletesAt: Date | string | null;
		exerciseStartedAt?: Date | string | null;
		exerciseCompletesAt: Date | string | null;
	};
	type Officer = {
		id: number;
		name: string;
		traitIds: string[];
		portrait: number;
		health: number;
		experience: number;
		alive: boolean;
	};

	interface Props {
		now: number;
		training: Unit[];
		exercising: Unit[];
		exercise: {
			DURATION_HOURS: number;
			EXPERIENCE_GAIN: number;
			ORG_COST: number;
			SUPPLY_COST: number;
			MIN_ORG_TO_START: number;
		};
		officers: Officer[];
		courses: { id: number; completesAt: Date | string }[];
		canCommand: boolean;
		yard?: HTMLElement;
	}
	let { now, training, exercising, exercise, officers, courses, canCommand, yard = $bindable() }: Props = $props();

	let busy = $state(false);
	let corps = $state<HTMLElement>();
	let exercises = $state<HTMLElement>();

	const busyFlag = (v: boolean) => (busy = v);
</script>

<!-- Drill yard -->
<section bind:this={yard} class="space-y-2.5">
	<h2 class="section-title">
		<FluentClock20Regular class="size-4" /> Drill yard
		{#if training.length}<Badge tone="amber" size="xs">{training.length}</Badge>{/if}
	</h2>
	{#each training as unit (unit.id)}
		{@const ready = !!unit.trainingCompletesAt && new Date(unit.trainingCompletesAt).getTime() <= now}
		<div class="space-y-1.5">
			<div class="flex items-center gap-2">
				<ForceSymbol unitType={unit.unitType} size={20} title={unitLabel(unit.unitType)} />
				<span class="min-w-0 flex-1 truncate text-sm text-fg">{unit.name}</span>
				<span class="data text-xs {ready ? 'text-positive' : 'text-primary-fg'}">
					{timeLeft(now, unit.trainingCompletesAt)}
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-full bg-surface-0/80">
				<div
					class="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
					style:width="{progressBetween(now, unit.trainingStartedAt, unit.trainingCompletesAt)}%"
				></div>
			</div>
			{#if ready}
				<form method="POST" action="?/completeTraining" use:enhance={act({ busy: busyFlag, glow: () => yard })}>
					<input type="hidden" name="unitId" value={unit.id} />
					<Button type="submit" variant="soft-emerald" size="xs" block icon={FluentCheckmark20Filled} disabled={busy}>
						Pass out
					</Button>
				</form>
			{/if}
		</div>
	{:else}
		<p class="text-xs text-fg-muted">Empty — new recruits drill here before they serve.</p>
	{/each}
</section>

<!-- Exercises -->
<section bind:this={exercises} class="space-y-2.5 border-t border-line/15 pt-4">
	<h2 class="section-title">
		<FluentTimer20Regular class="size-4" /> Exercises
		{#if exercising.length}<Badge tone="purple" size="xs">{exercising.length}</Badge>{/if}
	</h2>
	{#each exercising as unit (unit.id)}
		{@const done = !!unit.exerciseCompletesAt && new Date(unit.exerciseCompletesAt).getTime() <= now}
		<div class="space-y-1.5">
			<div class="flex items-center gap-2">
				<ForceSymbol unitType={unit.unitType} size={20} />
				<span class="min-w-0 flex-1 truncate text-sm text-fg">{unit.name}</span>
				<span class="data text-xs {done ? 'text-positive' : 'text-politics-fg'}">
					{timeLeft(now, unit.exerciseCompletesAt)}
				</span>
			</div>
			<div class="h-1 overflow-hidden rounded-full bg-surface-0/80">
				<div
					class="h-full rounded-full bg-politics"
					style:width="{progressBetween(now, unit.exerciseStartedAt ?? null, unit.exerciseCompletesAt)}%"
				></div>
			</div>
			{#if done}
				<form method="POST" action="?/completeExercise" use:enhance={act({ busy: busyFlag, glow: () => exercises })}>
					<input type="hidden" name="unitId" value={unit.id} />
					<Button type="submit" variant="soft-emerald" size="xs" block icon={FluentCheckmark20Filled} disabled={busy}>
						Complete — +{exercise.EXPERIENCE_GAIN} EXP
					</Button>
				</form>
			{:else}
				<form method="POST" action="?/cancelExercise" use:enhance={act({ busy: busyFlag })} class="text-right">
					<button
						type="submit"
						disabled={busy}
						class="text-[11px] text-fg-faint transition-colors hover:text-error"
						title="Stops the drain; the experience and spent equipment are lost"
					>
						Cancel exercise
					</button>
				</form>
			{/if}
		</div>
	{:else}
		<p class="text-xs text-fg-muted">
			None running. Use <span class="text-fg-soft">Exercise</span> on a roster row.
		</p>
	{/each}
	<p class="text-[11px] leading-snug text-fg-faint">
		{exercise.DURATION_HOURS}h · +{exercise.EXPERIENCE_GAIN} EXP · −{exercise.ORG_COST} ORG · −{exercise.SUPPLY_COST} SUP
		· needs
		{exercise.MIN_ORG_TO_START}% ORG
		<a href="/docs/conflict" class="ml-0.5 text-primary-fg hover:underline" title="How drill and experience work">ⓘ</a>
	</p>
</section>

<!-- Officer corps -->
<section bind:this={corps} class="space-y-2.5 border-t border-line/15 pt-4">
	<h2 class="section-title">
		<FluentHatGraduation20Regular class="size-4" /> Officer corps
		{#if officers.length}<Badge tone="neutral" size="xs">{officers.filter((o) => o.alive).length}</Badge>{/if}
	</h2>
	{#if officers.length}
		<ul class="space-y-1.5">
			{#each officers as officer (officer.id)}
				<li><CommanderBadge {officer} size="sm" /></li>
			{/each}
		</ul>
	{:else}
		<p class="text-xs text-fg-muted">No commanders yet. Graduates lead divisions and airgroups.</p>
	{/if}
	{#each courses as course (course.id)}
		<div class="flex items-center gap-2 text-xs text-fg-muted">
			<FluentHatGraduation20Regular class="size-3.5 text-primary-fg" />
			<span class="flex-1">Cadet at the academy</span>
			<span class="data text-primary-fg">{timeLeft(now, course.completesAt)}</span>
		</div>
	{/each}
	{#if canCommand}
		<form
			method="POST"
			action="?/startTraining"
			use:enhance={act({ busy: busyFlag, glow: () => corps })}
			class="space-y-2 pt-1"
		>
			<ResourceRequirements
				inline
				title="Academy course, paid by the state treasury"
				costs={{ currency: ACADEMY.money, steel: ACADEMY.steel, hours: ACADEMY.durationHours }}
				available={{}}
				labels={{ hours: "course" }}
			/>
			<Button type="submit" size="sm" variant="secondary" block icon={FluentHatGraduation20Regular} disabled={busy}>
				Train a commander
			</Button>
		</form>
	{/if}
</section>
