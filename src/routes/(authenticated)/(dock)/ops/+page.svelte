<!-- src/routes/(authenticated)/(dock)/ops/+page.svelte -->
<!-- Covert operations console. Leaders (president, defence or foreign
     minister) pick an operation from a dense list, choose a target in the
     sticky detail pane, read the live odds and why, launch, and watch it
     resolve in the console. Below: what is working on our state, our running
     operations, cyber defence and the ledger. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { fade } from "svelte/transition";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import {
		COVERT_OPS,
		COVERT_OP_KINDS,
		CYBER,
		CYBER_DEFENCE,
		PSYOPS,
		covertOdds,
		moraleMagnitude,
		type CovertDomain,
		type CovertOpKind,
		type StateEffectKind
	} from "#lib/config/index.js";
	import { countdown } from "#lib/utils/military.js";
	import { EFFECT_TONE, effectLabel } from "#lib/utils/covert.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { vanish } from "#lib/utils/motion.js";
	import OpsTerminal from "./OpsTerminal.svelte";
	import OpsLedger from "./OpsLedger.svelte";
	import { OP_ICON } from "./opIcons.js";
	import IconShield from "~icons/fluent/shield-keyhole-20-regular";
	import IconNetwork from "~icons/fluent/connected-20-regular";
	import IconInfo from "~icons/fluent/info-20-regular";
	import IconCyber from "~icons/fluent/globe-shield-20-regular";
	import IconPsyops from "~icons/fluent/people-team-20-regular";
	import IconAlert from "~icons/fluent/warning-20-regular";
	import IconTarget from "~icons/fluent/target-arrow-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconHome from "~icons/fluent/home-20-regular";

	const { data, form } = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	// ── Planner ────────────────────────────────────────────────────────────
	let kind = $state<CovertOpKind>("grid_attack");
	let targetId = $state<string | undefined>(undefined);
	// A network console link can preselect the target; don't overwrite a manual
	// pick on later data refreshes.
	let appliedUrlTarget = $state<number | null>(null);
	$effect(() => {
		if (data.targetId && data.targetId !== appliedUrlTarget) {
			targetId = String(data.targetId);
			appliedUrlTarget = data.targetId;
		}
	});
	let regionId = $state<string | undefined>(undefined);
	let posture = $state<"inflate" | "conceal">("inflate");
	let message = $state("");
	let launching = $state(false);
	let upgrading = $state(false);

	const DOMAINS = [
		{ id: "cyber", label: "Cyber", icon: IconCyber },
		{ id: "psyops", label: "Psyops", icon: IconPsyops }
	] as const;
	const kindsOf = (d: CovertDomain) => COVERT_OP_KINDS.filter((k) => COVERT_OPS[k].domain === d);

	const spec = $derived(COVERT_OPS[kind]);
	const SpecIcon = $derived(OP_ICON[kind]);
	const targets = $derived(data.planner?.targets ?? []);
	const target = $derived(targets.find((t) => String(t.id) === targetId) ?? null);
	const targetItems = $derived(
		targets.map((t) => ({
			id: t.id,
			name: t.name,
			logo: t.logo,
			hint: t.ally ? "bloc partner" : t.atWar ? "at war" : t.casusBelli ? "casus belli" : "peace"
		}))
	);

	function oddsOf(k: CovertOpKind) {
		if (COVERT_OPS[k].self)
			return covertOdds(k, { defenceLevel: 0, atWar: true, recentOps: 0, targetResilient: false });
		if (!target) return null;
		return covertOdds(k, {
			defenceLevel: target.defenceLevel,
			atWar: target.atWar || target.casusBelli,
			recentOps: target.recentOps,
			targetResilient: target.resilient,
			networkAssets: target.networkAssets
		});
	}
	const odds = $derived(oddsOf(kind));
	// Before a target is chosen the meters show the base odds, dimmed.
	const shownOdds = $derived(odds ?? { success: spec.baseSuccess, attribution: spec.baseAttribution, factors: [] });

	const cooldownOf = (k: CovertOpKind) => {
		const at = data.planner?.cooldowns[k];
		return at ? countdown(at, now) : null;
	};
	const cooldownLeft = $derived(cooldownOf(kind));
	const regionName = $derived(data.planner?.regions.find((r) => String(r.id) === regionId)?.name ?? null);
	const treasury = $derived(data.state?.treasury ?? 0);

	const blocked = $derived.by((): string | null => {
		if (!data.planner || !data.state) return "Only your state's leadership can order operations.";
		if (cooldownLeft) return `Teams ready again in ${cooldownLeft}.`;
		if (treasury < spec.cost) return `The treasury can't cover $${spec.cost.toLocaleString()}.`;
		if (!spec.self) {
			if (!target) return "Choose a target state.";
			if (target.ally) return "That's a bloc partner.";
			if (spec.needsWar && !target.atWar && !target.casusBelli)
				return `Needs a war (or a casus belli) with ${target.name}.`;
		}
		if (spec.needsRegion && !regionId) return "Choose one of your regions.";
		if (kind === "leaflet_drop" && !message.trim()) return "Write the leaflet.";
		return null;
	});

	/** Everything an operation spends, from the same config used to charge and
	 *  schedule it. "hours" is the effect duration, not a build time. */
	const costsOf = (k: CovertOpKind) => {
		const s = COVERT_OPS[k];
		return {
			currency: s.cost,
			...(s.durationHours ? { hours: s.durationHours } : {}),
			cooldown: s.cooldownHours
		};
	};
	const COST_LABELS = { hours: "Effect", cooldown: "Cooldown" };
	const INLINE_LABELS = { hours: "effect", cooldown: "cooldown" };
	const available = $derived({ currency: treasury });

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(Math.round(n * 100))}`;

	const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
	const effectPreview = $derived(capitalise(effectText()));
	function effectText(): string {
		const t = target?.name ?? "the target";
		switch (kind) {
			case "grid_attack":
				return `${t}'s energy capacity and factory output −${spec.magnitude}% for ${spec.durationHours} h.`;
			case "c2_disruption":
				return `${t}'s recon sees ${spec.magnitude}% less and lands ×${CYBER.C2_RECON_DELAY} slower; its units fight ${Math.round(spec.magnitude * CYBER.C2_BATTLE_SHARE)}% weaker, for ${spec.durationHours} h.`;
			case "financial_theft":
				return `Takes ${spec.magnitude}% of ${t}'s treasury (max $${CYBER.THEFT_MAX.toLocaleString()}); ${Math.round(CYBER.THEFT_KEPT * 100)}% of it reaches ours.`;
			case "morale_campaign": {
				const m = target ? moraleMagnitude(spec.magnitude, target.population, target.resilient) : spec.magnitude;
				return `${t}'s battle output −${Math.round(m)}% for ${spec.durationHours} h (stacks, diminishing, max ${PSYOPS.MORALE_CAP}%); +${PSYOPS.EXHAUSTION.morale_campaign} war exhaustion.`;
			}
			case "disinformation":
				return posture === "inflate"
					? `${t}'s recon over ${regionName ?? "the region"} counts ${PSYOPS.INFLATE}% more units plus ${PSYOPS.DECOY_VEHICLES} decoy vehicles, for ${spec.durationHours} h. Sharp passes may see through it.`
					: `${t}'s recon over ${regionName ?? "the region"} misses ${-PSYOPS.CONCEAL}% of your units, for ${spec.durationHours} h. Sharp passes may see through it.`;
			case "counter_propaganda":
				return `Your battle output +${spec.magnitude}%; enemy campaigns land at half strength and ${Math.round(PSYOPS.RESILIENCE_SUCCESS * 100)}% less often, for ${spec.durationHours} h.`;
			case "leaflet_drop":
				return `Every resident of ${t} finds your leaflet on their overview for ${spec.durationHours} h; morale −${spec.magnitude}%, +${PSYOPS.EXHAUSTION.leaflet_drop} war exhaustion if at war.`;
			case "comms_intercept":
				return `Your recon over ${t} detects more and counts more accurately; strike planners see their true air defences. Unnoticed unless traced, for ${spec.durationHours} h.`;
			case "air_defence_spoof":
				return `${t}'s radar cueing drops by ${spec.magnitude} levels: drones survive interception and strikes get through, for ${spec.durationHours} h.`;
			case "supply_chain":
				return `${t}'s factories produce −${spec.magnitude}% while poisoned suppliers and invoices are untangled, for ${spec.durationHours} h.`;
		}
	}

	// ── Result console ────────────────────────────────────────────────────
	let outcome = $state<NonNullable<typeof form>["outcome"] | null>(null);
	let consoleEl: HTMLElement | undefined = $state();

	const effectsOnUs = $derived(data.effectsOnUs.filter((e) => new Date(e.expiresAt) > now));
	const hostileOnUs = $derived(effectsOnUs.filter((e) => e.kind !== "morale_boost" && e.kind !== "casus_belli"));
	const running = $derived((data.planner?.running ?? []).filter((e) => new Date(e.expiresAt) > now));
	const footholds = $derived(targets.reduce((n, t) => n + (t.networkAssets ?? 0), 0));
	const footholdStates = $derived(targets.filter((t) => (t.networkAssets ?? 0) > 0).length);
	const runningTargets = $derived(new Set(running.map((e) => e.target)).size);
	const againstUs = $derived(data.ledger.filter((o) => !o.ours).length);

	const defenceMax = CYBER_DEFENCE.MAX_LEVEL;
	const defenceTip = `Each level makes cyber attacks on us ${Math.round(CYBER_DEFENCE.SUCCESS_PER_LEVEL * 100)}% less likely to work and ${Math.round(CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * 100)}% likelier to be traced.`;
</script>

<svelte:head>
	<title>Operations · PsyOps</title>
</svelte:head>

{#snippet countdownChip(expiresAt: string)}
	<span class="data flex shrink-0 items-center gap-1.5 text-xs text-fg-soft">
		<span class="size-1.5 rounded-full bg-positive motion-safe:animate-pulse" aria-hidden="true"></span>
		{countdown(expiresAt, now) ?? "ended"}
	</span>
{/snippet}

{#snippet defenceMeter(level: number, cls: string)}
	<div
		class="flex gap-0.5 {cls}"
		role="meter"
		aria-label="Cyber defence level"
		aria-valuemin={0}
		aria-valuemax={defenceMax}
		aria-valuenow={level}
	>
		{#each Array(defenceMax) as _, i (i)}
			<span class="h-1 flex-1 rounded-full transition-colors duration-500 {i < level ? 'bg-positive' : 'bg-surface-8'}"
			></span>
		{/each}
	</div>
{/snippet}

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div class="min-w-0">
			<p class="section-title">J3 · Information operations</p>
			<h1 class="mt-1 text-2xl font-semibold text-fg">Covert operations</h1>
			{#if data.state}
				<p class="mt-0.5 text-sm text-fg-muted">
					{data.state.name}{data.authority ? ` · ${data.authority.roleLabel}` : " · what your state knows"}
				</p>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" href="/docs/intel" icon={IconInfo} title="How covert operations work">
				Guide
			</Button>
			{#if data.authority}
				<Button variant="secondary" size="sm" href="/ops/network" icon={IconNetwork}>Network</Button>
			{/if}
		</div>
	</header>

	{#if !data.state}
		<div class="panel mt-6 p-6 text-sm text-fg-muted">
			Settle in a state to see its covert operations. <a class="text-primary-fg hover:underline" href="/states">
				Browse states
			</a>
		</div>
	{:else}
		<!-- Status strip -->
		<dl class="panel mt-5 grid grid-cols-2 sm:grid-cols-4">
			{#if data.state.treasury !== null}
				<div class="p-3 sm:px-4">
					<dt class="section-title">Treasury</dt>
					<dd class="data mt-1 text-xl text-fg">${data.state.treasury.toLocaleString()}</dd>
					<dd class="text-[11px] text-fg-faint">Pays for every operation</dd>
				</div>
			{/if}
			<div class="border-line/15 p-3 sm:border-l sm:px-4" title={defenceTip}>
				<dt class="section-title">Cyber defence</dt>
				<dd class="data mt-1 text-xl text-fg">
					L{data.state.defenceLevel}<span class="text-sm text-fg-faint">/{defenceMax}</span>
				</dd>
				<dd>{@render defenceMeter(data.state.defenceLevel, "mt-1 max-w-24")}</dd>
			</div>
			<div class="border-t border-line/15 p-3 sm:border-t-0 sm:border-l sm:px-4">
				<dt class="section-title">Working on us</dt>
				<dd class="data mt-1 text-xl {hostileOnUs.length ? 'text-hostile-fg' : 'text-fg'}">{effectsOnUs.length}</dd>
				<dd class="text-[11px] text-fg-faint">
					{hostileOnUs.length ? `${hostileOnUs.length} hostile` : "Nothing hostile detected"}
				</dd>
			</div>
			{#if data.planner}
				<div class="border-t border-l border-line/15 p-3 sm:border-t-0 sm:px-4">
					<dt class="section-title">Our ops running</dt>
					<dd class="data mt-1 text-xl text-fg">{running.length}</dd>
					<dd class="text-[11px] text-fg-faint">
						{#if footholds}
							<a href="/ops/network" class="hover:text-primary-fg">
								{footholds} foothold{footholds === 1 ? "" : "s"} in {footholdStates} state{footholdStates === 1
									? ""
									: "s"}
							</a>
						{:else}
							{running.length ? `on ${runningTargets} state${runningTargets === 1 ? "" : "s"}` : "No footholds abroad"}
						{/if}
					</dd>
				</div>
			{:else}
				<div class="border-t border-l border-line/15 p-3 sm:border-t-0 sm:px-4">
					<dt class="section-title">Ops against us</dt>
					<dd class="data mt-1 text-xl text-fg">{againstUs}</dd>
					<dd class="text-[11px] text-fg-faint">On record</dd>
				</div>
			{/if}
		</dl>

		{#if data.planner}
			<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
				<!-- Operation picker -->
				<section class="panel min-w-0 self-start" aria-labelledby="picker-title">
					<h2 id="picker-title" class="sr-only">Choose an operation</h2>
					{#each DOMAINS as d (d.id)}
						<div role="radiogroup" aria-labelledby="domain-{d.id}">
							<h3
								id="domain-{d.id}"
								class="section-title border-b border-line/15 px-4 pt-3 pb-2 {d.id === 'psyops' ? 'border-t' : ''}"
							>
								<d.icon class="size-4" />
								{d.label}
							</h3>
							<ul class="divide-y divide-line/10">
								{#each kindsOf(d.id) as k (k)}
									{@const s = COVERT_OPS[k]}
									{@const Icon = OP_ICON[k]}
									{@const cd = cooldownOf(k)}
									{@const o = oddsOf(k)}
									{@const warLocked = !s.self && s.needsWar && target && !target.atWar && !target.casusBelli}
									<li>
										<label
											class="group flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-5 has-[:checked]:bg-primary/10 has-[:checked]:shadow-[inset_3px_0_0_var(--color-primary)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 has-[:focus-visible]:ring-inset"
										>
											<input type="radio" name="op-kind" value={k} bind:group={kind} class="sr-only" />
											<span
												class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-sm bg-surface-7 text-fg-soft transition-colors group-has-[:checked]:bg-primary/20 group-has-[:checked]:text-primary-fg"
											>
												<Icon class="size-4.5" />
											</span>
											<span class="min-w-0 flex-1">
												<span class="flex items-center justify-between gap-2">
													<span class="truncate font-medium text-fg">{s.label}</span>
													{#if cd}
														<Badge size="xs" tone="amber" icon={IconClock}>{cd}</Badge>
													{:else if warLocked}
														<Badge size="xs" tone="neutral">Needs war</Badge>
													{:else if o && !s.self}
														<span
															class="data text-xs {o.success >= 0.6
																? 'text-positive-fg'
																: o.success >= 0.35
																	? 'text-warning'
																	: 'text-hostile-fg'}"
															title="Success / attribution against {target?.name}"
														>
															{pct(o.success)}<span class="text-fg-faint"> · {pct(o.attribution)}</span>
														</span>
													{:else if s.self}
														<Badge size="xs" tone="green" icon={IconHome}>Home</Badge>
													{/if}
												</span>
												<span class="block truncate text-xs text-fg-muted" title={s.blurb}>{s.blurb}</span>
												<span class="mt-1 block">
													<ResourceRequirements inline costs={costsOf(k)} {available} labels={INLINE_LABELS} />
												</span>
											</span>
										</label>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</section>

				<!-- Detail pane -->
				<div class="space-y-4 self-start {outcome ? '' : 'lg:sticky lg:top-4'}">
					{#if outcome}
						<div bind:this={consoleEl} transition:fade={{ duration: 150 }}>
							<OpsTerminal
								{outcome}
								onclose={() => (outcome = null)}
								ondone={() => outcome?.succeeded && celebrate(consoleEl)}
							/>
						</div>
					{/if}

					<form
						method="POST"
						action="?/launch"
						class="panel divide-y divide-line/15"
						use:enhance={() => {
							launching = true;
							return async ({ result, update }) => {
								launching = false;
								await update({ reset: false });
								toastResult(result);
								if (result.type === "success" && result.data?.outcome) {
									outcome = result.data.outcome as typeof outcome;
									message = "";
									queueMicrotask(() => consoleEl?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
								}
							};
						}}
					>
						<input type="hidden" name="kind" value={kind} />

						<!-- What -->
						<div class="flex items-start gap-3 p-4">
							<span
								class="grid size-10 shrink-0 place-items-center rounded-sm {spec.domain === 'cyber'
									? 'bg-primary/15 text-primary-fg'
									: 'bg-politics-bg/20 text-politics-fg'}"
							>
								<SpecIcon class="size-5" />
							</span>
							<div class="min-w-0">
								<p class="section-title">{spec.domain === "cyber" ? "Cyber operation" : "Psychological operation"}</p>
								<h2 class="text-lg font-semibold text-fg">{spec.label}</h2>
								<p class="mt-0.5 text-xs text-fg-muted">{spec.blurb}</p>
							</div>
						</div>

						<!-- Where -->
						<div class="space-y-3 p-4">
							{#if spec.self}
								<p class="flex items-center gap-2 text-sm text-fg-soft">
									<IconHome class="size-4 text-positive" /> Aimed at our own population: always lands, never traced.
								</p>
							{:else}
								<div>
									<label class="field-label flex items-center gap-1.5" for="ops-target">
										<IconTarget class="size-4 text-fg-muted" /> Target state
									</label>
									<SearchSelect
										id="ops-target"
										name="targetStateId"
										items={targetItems}
										bind:value={targetId}
										showId
										placeholder="Choose a target…"
										searchPlaceholder="Search states…"
									/>
								</div>
							{/if}

							{#if spec.needsRegion}
								<div>
									<label class="field-label" for="ops-region">Region to dress up</label>
									<SearchSelect
										id="ops-region"
										name="regionId"
										items={data.planner.regions}
										bind:value={regionId}
										showId
										placeholder="One of your regions…"
										searchPlaceholder="Search regions…"
									/>
								</div>
								<fieldset class="min-w-0">
									<legend class="field-label">Posture</legend>
									<div class="flex gap-1 rounded-sm bg-surface-2 p-1">
										{#each ["inflate", "conceal"] as const as p (p)}
											<label
												class="flex-1 cursor-pointer rounded-sm px-3 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 {posture ===
												p
													? 'bg-surface-8 text-fg'
													: 'text-fg-muted hover:text-fg'}"
											>
												<input type="radio" name="posture" value={p} bind:group={posture} class="sr-only" />
												{p === "inflate" ? "Ghost army" : "Hide strength"}
											</label>
										{/each}
									</div>
								</fieldset>
							{/if}

							{#if kind === "leaflet_drop"}
								<div>
									<label class="field-label" for="ops-leaflet">Leaflet text</label>
									<textarea
										id="ops-leaflet"
										name="message"
										bind:value={message}
										maxlength={PSYOPS.LEAFLET_MAX_CHARS}
										rows="3"
										class="field-control textarea w-full resize-none"
										placeholder="Soldiers of …, your leaders have abandoned you."></textarea>
									<p class="field-hint data text-right">{message.length}/{PSYOPS.LEAFLET_MAX_CHARS}</p>
								</div>
							{/if}
						</div>

						<!-- Odds and why -->
						<div class="p-4">
							<div class="grid grid-cols-2 gap-4" class:opacity-60={!odds}>
								{#each [{ label: "Success", v: shownOdds.success, base: spec.baseSuccess, tone: "bg-positive" }, { label: "Traced", v: shownOdds.attribution, base: spec.baseAttribution, tone: "bg-hostile" }] as m (m.label)}
									<div>
										<div class="flex items-baseline justify-between">
											<span class="section-title">{m.label}</span>
											<span class="data text-xl text-fg">{pct(m.v)}</span>
										</div>
										<div
											class="relative mt-1 h-1.5 rounded-full bg-surface-7"
											role="meter"
											aria-label="{m.label} chance"
											aria-valuemin={0}
											aria-valuemax={100}
											aria-valuenow={Math.round(m.v * 100)}
										>
											<div
												class="h-full rounded-full {m.tone} transition-[width] duration-300 motion-reduce:transition-none"
												style:width={pct(m.v)}
											></div>
											{#if odds && !spec.self}
												<span
													class="absolute -top-0.5 h-2.5 w-px bg-fg-muted"
													style:left={pct(m.base)}
													title="Base {pct(m.base)}"
													aria-hidden="true"
												></span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
							{#if !odds}
								<p class="mt-2 text-xs text-fg-muted">Base odds. Pick a target for the live picture.</p>
							{:else if !spec.self}
								<table class="mt-3 w-full text-xs">
									<tbody class="divide-y divide-line/10">
										<tr class="text-fg-muted">
											<td class="py-1">Base</td>
											<td class="data py-1 text-right">{pct(spec.baseSuccess)}</td>
											<td class="data w-14 py-1 text-right">{pct(spec.baseAttribution)}</td>
										</tr>
										{#each odds.factors as f (f.label)}
											<tr class="text-fg-soft">
												<td class="py-1">{f.label}</td>
												<td
													class="data py-1 text-right"
													class:text-hostile-fg={f.success < 0}
													class:text-positive-fg={f.success > 0}
												>
													{f.success ? signed(f.success) : "±0"}
												</td>
												<td
													class="data py-1 text-right"
													class:text-warning={f.attribution > 0}
													class:text-positive-fg={f.attribution < 0}
												>
													{f.attribution ? signed(f.attribution) : "±0"}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
								{#if target && !target.atWar}
									<p class="mt-2 flex items-start gap-1.5 text-xs text-warning">
										<IconAlert class="mt-px size-3.5 shrink-0" />
										{target.casusBelli
											? `We hold a casus belli on ${target.name}: no diplomatic exposure.`
											: `Not at war: if traced, ${target.name} gets a casus belli against us for a week.`}
									</p>
								{/if}
							{/if}
						</div>

						<!-- Effect -->
						<div class="p-4">
							<p class="section-title mb-1">Effect if it lands</p>
							<p class="text-sm text-fg-body">{effectPreview}</p>
						</div>

						<!-- Cost and launch -->
						<div class="space-y-3 p-4">
							<ResourceRequirements title="Operation cost" costs={costsOf(kind)} {available} labels={COST_LABELS} />
							{#if blocked}<p class="text-xs text-error" role="status">{blocked}</p>{/if}
							<Button
								type="submit"
								block
								variant={spec.domain === "cyber" ? "primary" : "soft-purple"}
								disabled={!!blocked}
								loading={launching}
								loadingText="Executing…"
							>
								{spec.self ? "Launch campaign" : `Launch ${spec.label.toLowerCase()}`}
							</Button>
						</div>
					</form>
				</div>
			</div>
		{:else}
			<p class="mt-6 text-sm text-fg-muted">
				Operations are ordered by your state's president, defence minister or foreign minister.
			</p>
		{/if}

		<!-- Situation and ledger -->
		<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
			<aside class="panel divide-y divide-line/15 self-start lg:col-start-2 lg:row-start-1">
				<section class="p-4" aria-labelledby="on-us-title">
					<h2 id="on-us-title" class="section-title mb-2">
						<IconAlert class="size-4" /> Working on {data.state.name}
					</h2>
					{#if effectsOnUs.length}
						<ul class="divide-y divide-line/10">
							{#each effectsOnUs as e (e.id)}
								<li class="flex items-start justify-between gap-3 py-2" out:vanish>
									<div class="min-w-0">
										<Badge tone={EFFECT_TONE[e.kind as StateEffectKind]}>
											{effectLabel(e.kind, e.magnitude, e.region)}
										</Badge>
										<p class="mt-1 text-xs text-fg-muted">
											{#if e.kind === "casus_belli"}
												Against {e.source ?? "an unknown state"}: we may strike it as if at war
											{:else if e.kind === "morale_boost"}
												Our own campaign
											{:else}
												{e.source ? `By ${e.source}` : "Origin unknown"}
											{/if}
										</p>
									</div>
									{@render countdownChip(e.expiresAt)}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-fg-muted">Nothing detected. Which isn't the same as nothing.</p>
					{/if}
				</section>

				{#if data.planner}
					<section class="p-4" aria-labelledby="running-title">
						<h2 id="running-title" class="section-title mb-2"><IconTarget class="size-4" /> Our operations running</h2>
						{#if running.length}
							<ul class="divide-y divide-line/10">
								{#each running as e (e.id)}
									<li class="flex items-start justify-between gap-3 py-2" out:vanish>
										<div class="min-w-0">
											<Badge tone={EFFECT_TONE[e.kind as StateEffectKind]}>
												{effectLabel(e.kind, e.magnitude, e.region)}
											</Badge>
											<p class="mt-1 text-xs text-fg-muted">On {e.target}</p>
										</div>
										{@render countdownChip(e.expiresAt)}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-fg-muted">None running. Pick one above to start.</p>
						{/if}
					</section>
				{/if}

				<section class="p-4" aria-labelledby="defence-title">
					<h2 id="defence-title" class="section-title mb-2">
						<IconShield class="size-4" /> Cyber defence
						<span class="data ml-auto text-xs tracking-normal text-fg-soft normal-case">
							Level {data.state.defenceLevel} of {defenceMax}
						</span>
					</h2>
					{@render defenceMeter(data.state.defenceLevel, "")}
					<p class="mt-2 text-xs text-fg-muted">
						Per level: −{Math.round(CYBER_DEFENCE.SUCCESS_PER_LEVEL * 100)}% enemy success, +{Math.round(
							CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * 100
						)}% traced.
					</p>
					{#if data.state.canUpgrade && data.state.upgradeCost !== null}
						<form
							method="POST"
							action="?/upgradeDefence"
							class="mt-3 flex flex-wrap items-center justify-between gap-2"
							use:enhance={({ formElement }) => {
								upgrading = true;
								return async ({ result, update }) => {
									upgrading = false;
									await update();
									toastResult(result);
									if (result.type === "success") celebrate(formElement.closest("section"));
								};
							}}
						>
							<ResourceRequirements
								inline
								title="Upgrade cost"
								costs={{ currency: data.state.upgradeCost }}
								available={{ currency: treasury }}
							/>
							<Button
								type="submit"
								variant="secondary"
								size="sm"
								loading={upgrading}
								disabled={treasury < data.state.upgradeCost}
							>
								Raise to L{data.state.defenceLevel + 1}
							</Button>
						</form>
					{:else if data.state.upgradeCost === null}
						<p class="mt-2 text-xs text-positive-fg">At the highest level.</p>
					{/if}
				</section>
			</aside>

			<section class="panel self-start p-4 lg:col-start-1 lg:row-start-1" aria-labelledby="ledger-title">
				<h2 id="ledger-title" class="section-title mb-1"><IconHistory class="size-4" /> Operations ledger</h2>
				<OpsLedger rows={data.ledger} />
			</section>
		</div>
	{/if}
</PageContainer>
