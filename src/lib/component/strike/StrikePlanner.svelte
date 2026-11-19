<!-- src/lib/component/strike/StrikePlanner.svelte -->
<!-- Strike planning for an enemy region: pick a tier, a target and a weapon,
     and see before confirming what it will likely do: hit chance (and why),
     intercept chance, expected civilian harm and whether international
     humanitarian law would count it as a violation. The preview runs the same
     maths the server resolves with (strike.config.ts), on what your side
     knows; the truth (e.g. unseen air defence) may differ. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { tick } from "svelte";
	import type { StrikeOptions } from "#lib/server/services/military/strike.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { feedback } from "#lib/utils/feedback.js";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { Conditions } from "#lib/component/tactical/index.js";
	import {
		GUIDANCE_LABEL,
		IHL_KIND_LABEL,
		STRIKE_TIERS,
		TARGETS,
		TIER_CONFIG,
		WEAPONS,
		formatPopulation,
		planStrike,
		reparationsOwed,
		targetsForTier,
		weaponsForTier,
		type IhlKind,
		type RiskLevel,
		type StrikeTarget,
		type StrikeTier,
		type StrikeWeapon
	} from "#lib/config/index.js";
	import { ageLabel, countdown } from "#lib/utils/military.js";
	import StrikeImpact from "./StrikeImpact.svelte";
	import type { StrikeResult } from "./types";
	import IconTarget from "~icons/fluent/target-20-regular";
	import IconScales from "~icons/fluent/scales-20-regular";
	import IconWarning from "~icons/fluent/warning-20-filled";
	import IconPeople from "~icons/fluent/people-20-regular";

	interface Props {
		options: StrikeOptions;
		regionName: string;
	}

	let { options, regionName }: Props = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let tier = $state<StrikeTier>("strategic");
	let target = $state<StrikeTarget>("power_grid");
	let weapon = $state<StrikeWeapon>("cruise_missile");
	let accepted = $state(false);
	let launching = $state(false);
	let result = $state<StrikeResult | null>(null);
	let panel: HTMLElement | undefined = $state();

	const weaponOption = (id: StrikeWeapon) => options.weapons.find((w) => w.id === id);
	const tierTargets = $derived(targetsForTier(tier));
	const tierWeapons = $derived(weaponsForTier(tier));

	function chooseTier(t: StrikeTier) {
		tier = t;
		target = targetsForTier(t)[0]!;
		// Prefer the first weapon that can fly right now.
		const ws = weaponsForTier(t);
		weapon = ws.find((w) => !weaponOption(w)?.reason) ?? ws[0]!;
		accepted = false;
	}

	const plan = $derived(options.context ? planStrike(target, weapon, options.context) : null);
	const chosen = $derived(weaponOption(weapon));
	const cooldown = $derived(options.tierCooldowns[tier] ? countdown(options.tierCooldowns[tier]!, now) : null);
	const affordable = $derived(!!chosen && options.treasury >= chosen.cost);
	const violates = $derived(!!plan?.ihl.length);
	const reparations = $derived(
		plan ? plan.ihl.reduce((s, f, i) => s + reparationsOwed(f.points, i === 0 ? plan.expectedCasualties : 0), 0) : 0
	);
	const canLaunch = $derived(
		!!plan && !!chosen && !chosen.reason && !cooldown && affordable && (!violates || accepted)
	);

	const RISK_TONE: Record<RiskLevel, "green" | "amber" | "orange" | "red"> = {
		none: "green",
		low: "green",
		medium: "amber",
		high: "orange",
		extreme: "red"
	};
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const money = (n: number) => `$${n.toLocaleString("en-US")}`;
	const OUTCOME_HEADLINE = {
		hit: "Direct hit",
		partial: "Partial hit",
		miss: "Missed the target",
		intercepted: "Intercepted by air defence"
	} as const;
</script>

<section bind:this={panel} id="strike-planner" class="panel rounded-sm p-4 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title"><IconTarget class="size-4" /> Strike planning · {regionName}</h2>
		<div class="flex flex-wrap items-center gap-2 text-xs">
			{#if options.authority}
				<Badge tone="blue" size="xs">{options.authority.role === "president" ? "President" : "Defence minister"}</Badge>
			{/if}
			<span class="data text-fg-muted">Treasury {money(options.treasury)}</span>
		</div>
	</div>

	{#if options.context}
		{@const ctx = options.context}
		<!-- What your side knows about the target -->
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-soft">
			<Conditions {...ctx.conditions} />
			<span class="flex items-center gap-1">
				<IconPeople class="size-3.5 text-fg-muted" />
				<span class="data">{formatPopulation(ctx.population)}</span> civilians ·
				<span class="data">{Math.round(ctx.density)}</span>/km²
			</span>
			<span>
				Intel:
				{#if options.intel}
					<span class="data">{pct(options.intel.confidence)}</span> ({options.intel.level}{options.intel
						.latestObservedAt
						? `, ${ageLabel(options.intel.latestObservedAt, now)} old`
						: ""}){options.intel.buildingsSeen ? " · installations imaged" : ""}
				{:else}
					<span class="text-warning">none</span>
				{/if}
			</span>
			<span>
				Air defence:
				{#if options.adKnown}
					<span class="data">{ctx.adUnits}</span> seen
				{:else}
					<span class="text-warning">unknown</span>
				{/if}
			</span>
		</div>

		<!-- Tier tabs -->
		<div class="grid grid-cols-3 gap-1 rounded-sm border border-line/15 bg-surface-2 p-1" role="tablist">
			{#each STRIKE_TIERS as t (t)}
				{@const cd = options.tierCooldowns[t] ? countdown(options.tierCooldowns[t]!, now) : null}
				<button
					type="button"
					role="tab"
					aria-selected={tier === t}
					class="press-spring rounded-xs px-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors {tier ===
					t
						? 'bg-primary text-primary-content'
						: 'text-fg-muted hover:text-fg hover:bg-surface-4'}"
					onclick={() => chooseTier(t)}
				>
					{TIER_CONFIG[t].label}
					{#if cd}<span class="block data text-[10px] font-normal normal-case opacity-80">ready {cd}</span>{/if}
				</button>
			{/each}
		</div>
		<p class="text-xs text-fg-muted -mt-2">{TIER_CONFIG[tier].blurb}</p>

		<div class="grid gap-4 md:grid-cols-2">
			<!-- Target -->
			<fieldset class="space-y-1.5">
				<legend class="mb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Target</legend>
				{#each tierTargets as id (id)}
					{@const t = TARGETS[id]}
					<label
						class="flex cursor-pointer items-start gap-2 rounded-sm border px-3 py-2 transition-colors {target === id
							? t.protected
								? 'border-error/60 bg-error/10'
								: 'border-primary/60 bg-primary/10'
							: 'border-line/15 bg-surface-2 hover:border-line/30'}"
					>
						<input
							type="radio"
							class="radio radio-xs mt-0.5"
							name="target-pick"
							value={id}
							bind:group={target}
							onchange={() => (accepted = false)}
						/>
						<span class="min-w-0">
							<span class="flex items-center gap-1.5 text-sm text-fg">
								{t.label}
								{#if t.protected}<Badge tone="red" size="xs" icon={IconScales}>Protected</Badge>{/if}
							</span>
							<span class="block text-xs text-fg-muted">{t.blurb}</span>
						</span>
					</label>
				{/each}
			</fieldset>

			<!-- Weapon -->
			<fieldset class="space-y-1.5">
				<legend class="mb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Weapon</legend>
				{#each tierWeapons as id (id)}
					{@const w = WEAPONS[id]}
					{@const o = weaponOption(id)}
					<label
						class="flex items-start gap-2 rounded-sm border px-3 py-2 transition-colors {o?.reason
							? 'cursor-not-allowed opacity-60 border-line/10 bg-surface-2'
							: weapon === id
								? 'cursor-pointer border-primary/60 bg-primary/10'
								: 'cursor-pointer border-line/15 bg-surface-2 hover:border-line/30'}"
					>
						<input
							type="radio"
							class="radio radio-xs mt-0.5"
							name="weapon-pick"
							value={id}
							bind:group={weapon}
							disabled={!!o?.reason}
							onchange={() => (accepted = false)}
						/>
						<span class="min-w-0 flex-1">
							<span class="flex flex-wrap items-center gap-x-2 text-sm text-fg">
								{w.label}
								<span class="data text-[11px] text-fg-muted">{GUIDANCE_LABEL[w.guidance]}</span>
								<span class="ml-auto data text-xs text-fg-soft">{o ? money(o.cost) : ""}</span>
							</span>
							{#if o?.reason}
								<span class="block text-xs text-warning">{o.reason}</span>
							{:else if o?.aircraft}
								<span class="block text-xs text-fg-muted">Flown by {o.aircraft.name}</span>
							{/if}
						</span>
					</label>
				{/each}
				{#if options.embargoFactor > 1}
					<p class="field-hint text-hostile-fg">
						Arms embargo over your IHL record: prices +{Math.round((options.embargoFactor - 1) * 100)}%.
					</p>
				{/if}
			</fieldset>
		</div>

		<!-- Live preview -->
		{#if plan}
			<div class="rounded-sm border border-line/15 bg-surface-2 p-3 space-y-3" aria-live="polite">
				<div class="grid grid-cols-3 gap-2">
					<div>
						<p class="text-[10px] uppercase tracking-wide text-fg-muted">Hit chance</p>
						<p class="data text-2xl font-bold text-fg">{pct(plan.hitChance)}</p>
						<p class="data text-[11px] text-fg-muted">{pct(plan.accuracy)} if it gets through</p>
					</div>
					<div>
						<p class="text-[10px] uppercase tracking-wide text-fg-muted">Intercept</p>
						<p class="data text-2xl font-bold {plan.interceptChance ? 'text-warning' : 'text-fg'}">
							{options.adKnown ? pct(plan.interceptChance) : "?"}
						</p>
						<p class="text-[11px] text-fg-muted">
							{options.adKnown
								? `${options.context.adUnits} AD unit${options.context.adUnits === 1 ? "" : "s"} × ${pct(WEAPONS[weapon].adExposure)} exposure`
								: "no visual pass on air defence"}
						</p>
					</div>
					<div>
						<p class="text-[10px] uppercase tracking-wide text-fg-muted">Civilian risk</p>
						<p class="flex items-center gap-1.5">
							<Badge tone={RISK_TONE[plan.risk]}>{plan.risk}</Badge>
							<span class="data text-lg font-bold text-fg">~{plan.expectedCasualties}</span>
						</p>
						<p class="data text-[11px] text-fg-muted">{plan.exposed.toLocaleString("en-US")} exposed</p>
					</div>
				</div>

				<!-- Why: the accuracy factors -->
				<div>
					<p class="mb-1 text-[10px] uppercase tracking-wide text-fg-muted">Accuracy</p>
					<div class="flex flex-wrap items-center gap-1 text-[11px]">
						{#each plan.accuracyFactors as f, i (f.label)}
							{#if i > 0}<span class="text-fg-faint">×</span>{/if}
							<span
								class="data rounded-xs border px-1.5 py-0.5 {f.value < 0.8
									? 'border-warning/40 text-warning'
									: f.value > 1
										? 'border-success/40 text-positive-fg'
										: 'border-line/15 text-fg-soft'}"
								title={f.note}
							>
								{f.label}
								{f.value.toFixed(2)}
							</span>
						{/each}
						<span class="text-fg-faint">=</span>
						<span class="data font-semibold text-fg">{pct(plan.accuracy)}</span>
					</div>
					{#if plan.targetingConfidence < 0.5}
						<p class="mt-1 text-xs text-warning">
							Little intel on this target: fly recon first. A fresh visual or radar pass that images the installations
							makes building strikes far more accurate, and safer for civilians.
						</p>
					{/if}
				</div>

				<!-- IHL -->
				{#if plan.ihl.length}
					<div class="rounded-sm border border-error/40 bg-error/10 p-3 space-y-1.5">
						<p class="flex items-center gap-1.5 text-sm font-semibold text-hostile-fg">
							<IconWarning class="size-4" /> This strike would violate international humanitarian law
						</p>
						<ul class="space-y-0.5 text-xs text-fg-soft">
							{#each plan.ihl as f (f.kind)}
								<li><span class="text-fg">{IHL_KIND_LABEL[f.kind as IhlKind]}</span>: {f.reason}</li>
							{/each}
						</ul>
						<p class="text-xs text-fg-muted">
							Recorded publicly against your state: about {money(reparations)} in reparations to the victim, weaker troop
							morale, an arms embargo, and your bloc can expel you more easily.
						</p>
						<label class="flex items-center gap-2 text-xs text-fg">
							<input type="checkbox" class="checkbox checkbox-xs checkbox-error" bind:checked={accepted} />
							I order this strike and accept responsibility.
						</label>
					</div>
				{:else}
					<p class="flex items-center gap-1.5 text-xs text-positive-fg">
						<IconScales class="size-3.5" /> Proportionate to the military advantage ({plan.militaryValue}) on what you
						know.
					</p>
				{/if}
			</div>
		{/if}

		<form
			method="POST"
			action="?/launchStrike"
			class="flex flex-wrap items-center justify-end gap-2"
			use:enhance={() => {
				launching = true;
				return async ({ result: r }) => {
					launching = false;
					toastResult(r);
					if (r.type === "success" && r.data?.strikeResult) {
						result = r.data.strikeResult as StrikeResult;
						accepted = false;
						feedback(result.outcome === "intercepted" || result.outcome === "miss" ? "error" : "success");
						await invalidateAll();
						await tick();
						panel?.querySelector("#strike-result")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
					}
				};
			}}
		>
			<input type="hidden" name="target" value={target} />
			<input type="hidden" name="weapon" value={weapon} />
			{#if !affordable && chosen}<span class="text-xs text-warning">The treasury can't pay {money(chosen.cost)}.</span
				>{/if}
			<Button
				type="submit"
				variant="danger"
				size="sm"
				icon={IconTarget}
				loading={launching}
				disabled={!canLaunch || launching}
			>
				{cooldown ? `Re-arming · ${cooldown}` : `Order strike${chosen ? ` · ${money(chosen.cost)}` : ""}`}
			</Button>
		</form>

		{#if result}
			<div
				id="strike-result"
				class="grid items-center gap-3 rounded-sm border border-line/15 bg-surface-1 p-3 sm:grid-cols-[10rem_1fr]"
			>
				<StrikeImpact outcome={result.outcome} key={result.id} class="max-w-40 mx-auto" />
				<div class="space-y-1">
					<p class="text-sm font-semibold {result.outcome === 'hit' ? 'text-hostile-fg' : 'text-fg'}">
						{OUTCOME_HEADLINE[result.outcome]}
					</p>
					{#if result.summary.length}<p class="text-xs text-fg-soft">{result.summary.join(" · ")}</p>{/if}
					<p class="data text-xs {result.civilianCasualties ? 'text-hostile-fg' : 'text-fg-muted'}">
						{result.civilianCasualties} civilian{result.civilianCasualties === 1 ? "" : "s"} killed (expected {result.expectedCasualties})
					</p>
					{#if result.violations.length}
						<div class="flex flex-wrap gap-1">
							{#each result.violations as v (v.kind)}
								<Badge tone="red" size="xs">⚖ {IHL_KIND_LABEL[v.kind as IhlKind] ?? v.kind} +{v.points}</Badge>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</section>
