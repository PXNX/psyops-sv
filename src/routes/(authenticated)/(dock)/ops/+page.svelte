<!-- src/routes/(authenticated)/(dock)/ops/+page.svelte -->
<!-- Covert operations console. Leaders (president, defence or foreign
     minister) pick an operation from a grid of tiles, choose a target in the
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
		LEAFLET_RANDOM,
		LEAFLET_TEMPLATES,
		fillLeaflet,
		isLeafletTemplate
	} from "#lib/config/game/leaflets.config.js";
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
	import OddsRing from "./OddsRing.svelte";
	import { OP_ICON } from "./opIcons.js";
	import IconShield from "~icons/fluent/shield-keyhole-20-regular";
	import IconNetwork from "~icons/fluent/connected-20-regular";
	import IconCyber from "~icons/fluent/globe-shield-20-regular";
	import IconPsyops from "~icons/fluent/people-team-20-regular";
	import IconAlert from "~icons/fluent/warning-20-regular";
	import IconTarget from "~icons/fluent/target-arrow-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconHome from "~icons/fluent/home-20-regular";
	import IconLock from "~icons/fluent/lock-closed-20-regular";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconRadar from "~icons/fluent/radar-20-regular";
	import IconPulse from "~icons/fluent/pulse-20-regular";
	import IconScale from "~icons/fluent/scales-20-regular";
	import IconCheck from "~icons/fluent/checkmark-circle-20-regular";
	import IconEye from "~icons/fluent/eye-20-regular";

	const { data, form } = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	// ── Planner ────────────────────────────────────────────────────────────
	let kind = $state<CovertOpKind>("grid_attack");
	// A network console link can preselect the target (already in the server
	// render); don't overwrite a manual pick on later data refreshes.
	const initialTarget = (() => data.targetId)();
	let targetId = $state<string | undefined>(initialTarget ? String(initialTarget) : undefined);
	let appliedUrlTarget = $state<number | null>(initialTarget ?? null);
	$effect(() => {
		if (data.targetId && data.targetId !== appliedUrlTarget) {
			targetId = String(data.targetId);
			appliedUrlTarget = data.targetId;
		}
	});
	let regionId = $state<string | undefined>(undefined);
	let posture = $state<"inflate" | "conceal">("inflate");
	let leafletTemplate = $state<string | undefined>(LEAFLET_RANDOM);
	let launching = $state(false);
	let upgrading = $state(false);

	const DOMAINS = [
		{ id: "cyber", label: "Cyber", icon: IconCyber },
		{ id: "psyops", label: "Psyops", icon: IconPsyops }
	] as const;
	const kindsOf = (d: CovertDomain) => COVERT_OP_KINDS.filter((k) => COVERT_OPS[k].domain === d);

	const spec = $derived(COVERT_OPS[kind]);
	const leafletItems = [
		{ id: LEAFLET_RANDOM, name: "Let the print shop choose", hint: "random" },
		...LEAFLET_TEMPLATES.map((t) => ({ id: t.id, name: t.label }))
	];
	const SpecIcon = $derived(OP_ICON[kind]);
	const targets = $derived(data.planner?.targets ?? []);
	const target = $derived(targets.find((t) => String(t.id) === targetId) ?? null);
	const leafletPreview = $derived(
		leafletTemplate && isLeafletTemplate(leafletTemplate)
			? fillLeaflet(leafletTemplate, target?.name ?? "the target")
			: "One of the printed slogans, picked at random, with the target's name."
	);
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
	// Before a target is chosen the rings show the base odds, dimmed.
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
		if (kind === "leaflet_drop" && !leafletTemplate) return "Pick a leaflet.";
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
	const INLINE_LABELS = { hours: "effect", cooldown: "cooldown" };
	const available = $derived({ currency: treasury });

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(Math.round(n * 100))}`;
	const money = (n: number) =>
		n >= 1_000_000
			? `$${+(n / 1_000_000).toFixed(1)}M`
			: n >= 1000
				? `$${+(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`
				: `$${n}`;
	const affordable = $derived(COVERT_OP_KINDS.filter((k) => COVERT_OPS[k].cost <= treasury).length);

	const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
	const effectPreview = $derived(capitalise(effectText()));
	// Numbers in the effect line are set in the data face so they stand out.
	const NUMBERS = /([−+×]?\$?\d[\d,.]*%?)/g;
	const effectParts = $derived(effectPreview.split(NUMBERS).map((t, i) => ({ t, n: i % 2 === 1 })));
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

	/** The operation behind a state effect, for its icon and full duration. */
	const opOf = (k: string) => COVERT_OP_KINDS.find((o) => COVERT_OPS[o].effect === k) ?? null;
	const effectIcon = (k: string) => {
		const op = opOf(k);
		return op ? OP_ICON[op] : k === "casus_belli" ? IconScale : IconAlert;
	};
	/** Share of the effect's lifetime still left (0-1), or null if unknown. */
	function remaining(k: string, expiresAt: string): number | null {
		const op = opOf(k);
		const hours = op ? COVERT_OPS[op].durationHours : k === "casus_belli" ? CYBER.CASUS_BELLI_HOURS : 0;
		if (!hours) return null;
		const left = new Date(expiresAt).getTime() - now.getTime();
		return Math.max(0, Math.min(1, left / (hours * 3_600_000)));
	}

	const defenceMax = CYBER_DEFENCE.MAX_LEVEL;
	const defenceTip = `Each level makes cyber attacks on us ${Math.round(CYBER_DEFENCE.SUCCESS_PER_LEVEL * 100)}% less likely to work and ${Math.round(CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * 100)}% likelier to be traced.`;
	const domainTint = (d: CovertDomain) =>
		d === "cyber" ? "bg-primary/15 text-primary-fg" : "bg-politics-bg/20 text-politics-fg";
</script>

<svelte:head>
	<title>Operations · PsyOps</title>
</svelte:head>

{#snippet effectRow(
	e: { id: number; kind: string; magnitude: number; region: string | null; expiresAt: string },
	sub: string,
	hostile: boolean
)}
	{@const Icon = effectIcon(e.kind)}
	{@const left = remaining(e.kind, e.expiresAt)}
	<li class="flex items-center gap-3 py-2.5" out:vanish>
		<span
			class="grid size-8 shrink-0 place-items-center rounded-full {hostile
				? 'bg-hostile/15 text-hostile-fg'
				: 'bg-positive/15 text-positive-fg'}"
		>
			<Icon class="size-4" />
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between gap-2">
				<Badge size="xs" tone={EFFECT_TONE[e.kind as StateEffectKind]}>
					{effectLabel(e.kind, e.magnitude, e.region)}
				</Badge>
				<span class="data shrink-0 text-[11px] text-fg-soft">{countdown(e.expiresAt, now) ?? "ended"}</span>
			</div>
			<div class="mt-1 flex items-center gap-2">
				<span class="truncate text-[11px] text-fg-muted">{sub}</span>
				{#if left !== null}
					<span class="ml-auto h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-7" aria-hidden="true">
						<span
							class="block h-full rounded-full transition-[width] duration-500 {hostile ? 'bg-hostile' : 'bg-positive'}"
							style:width={pct(left)}
						></span>
					</span>
				{/if}
			</div>
		</div>
	</li>
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
		{#if data.authority}
			<Button variant="secondary" size="sm" href="/ops/network" icon={IconNetwork}>Network</Button>
		{/if}
	</header>

	{#if !data.state}
		<div class="panel mt-6 p-6 text-sm text-fg-muted">
			Settle in a state to see its covert operations. <a class="text-primary-fg hover:underline" href="/states">
				Browse states
			</a>
		</div>
	{:else}
		<!-- Status tiles -->
		<dl class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#if data.state.treasury !== null}
				<div class="panel flex items-center gap-3 p-3">
					<span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-fg">
						<IconWallet class="size-5" />
					</span>
					<div class="min-w-0">
						<dt class="section-title">Treasury</dt>
						<dd class="data truncate text-lg text-fg">{money(data.state.treasury)}</dd>
						{#if data.planner}
							<dd class="text-[11px] text-fg-faint">{affordable}/{COVERT_OP_KINDS.length} ops affordable</dd>
						{/if}
					</div>
				</div>
			{/if}
			<div class="panel flex items-center gap-3 p-3" title={defenceTip}>
				<OddsRing
					value={data.state.defenceLevel / defenceMax}
					segments={defenceMax}
					color="var(--color-positive)"
					size={40}
					label="Cyber defence"
				>
					<IconShield class="size-4 text-fg-muted" />
				</OddsRing>
				<div class="min-w-0">
					<dt class="section-title">Cyber defence</dt>
					<dd class="data text-lg text-fg">
						L{data.state.defenceLevel}<span class="text-sm text-fg-faint">/{defenceMax}</span>
					</dd>
				</div>
			</div>
			<div class="panel flex items-center gap-3 p-3">
				<span
					class="relative grid size-10 shrink-0 place-items-center rounded-full {hostileOnUs.length
						? 'bg-hostile/15 text-hostile-fg'
						: 'bg-surface-7 text-fg-muted'}"
				>
					<IconRadar class="size-5" />
					{#if hostileOnUs.length}
						<span class="absolute inset-0 rounded-full ring-2 ring-hostile/50 motion-safe:animate-ping"></span>
					{/if}
				</span>
				<div class="min-w-0">
					<dt class="section-title">Working on us</dt>
					<dd class="data text-lg {hostileOnUs.length ? 'text-hostile-fg' : 'text-fg'}">{effectsOnUs.length}</dd>
					<dd class="text-[11px] text-fg-faint">
						{hostileOnUs.length ? `${hostileOnUs.length} hostile` : "All quiet"}
					</dd>
				</div>
			</div>
			<div class="panel flex items-center gap-3 p-3">
				<span
					class="grid size-10 shrink-0 place-items-center rounded-full {running.length
						? 'bg-positive/15 text-positive-fg'
						: 'bg-surface-7 text-fg-muted'}"
				>
					<IconPulse class="size-5" />
				</span>
				{#if data.planner}
					<div class="min-w-0">
						<dt class="section-title">Our ops running</dt>
						<dd class="data text-lg text-fg">{running.length}</dd>
						<dd class="truncate text-[11px] text-fg-faint">
							{#if footholds}
								<a href="/ops/network" class="hover:text-primary-fg">
									{footholds} foothold{footholds === 1 ? "" : "s"} · {footholdStates} state{footholdStates === 1
										? ""
										: "s"}
								</a>
							{:else if running.length}
								on {runningTargets} state{runningTargets === 1 ? "" : "s"}
							{:else}
								No footholds abroad
							{/if}
						</dd>
					</div>
				{:else}
					<div class="min-w-0">
						<dt class="section-title">Ops against us</dt>
						<dd class="data text-lg text-fg">{againstUs}</dd>
						<dd class="text-[11px] text-fg-faint">On record</dd>
					</div>
				{/if}
			</div>
		</dl>

		{#if data.planner}
			<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
				<!-- Operation picker -->
				<section class="min-w-0 space-y-5 self-start" aria-labelledby="picker-title">
					<h2 id="picker-title" class="sr-only">Choose an operation</h2>
					{#each DOMAINS as d (d.id)}
						<div role="radiogroup" aria-labelledby="domain-{d.id}">
							<h3 id="domain-{d.id}" class="section-title mb-2">
								<d.icon class="size-4" />
								{d.label}
								<span class="h-px flex-1 bg-line/15"></span>
							</h3>
							<ul class="grid grid-cols-2 gap-2 {kindsOf(d.id).length % 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}">
								{#each kindsOf(d.id) as k (k)}
									{@const s = COVERT_OPS[k]}
									{@const Icon = OP_ICON[k]}
									{@const cd = cooldownOf(k)}
									{@const o = oddsOf(k)}
									{@const warLocked = !s.self && s.needsWar && target && !target.atWar && !target.casusBelli}
									{@const short = s.cost > treasury}
									<li class="min-w-0">
										<label
											title={s.blurb}
											class="group relative flex h-full cursor-pointer flex-col gap-2.5 rounded-sm border border-line/15 bg-surface-2 p-3 transition-colors hover:border-line/40 hover:bg-surface-4 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60"
											class:opacity-60={cd || warLocked || short}
										>
											<input type="radio" name="op-kind" value={k} bind:group={kind} class="sr-only" />
											<span class="flex items-start justify-between gap-2">
												<span
													class="grid size-9 shrink-0 place-items-center rounded-sm transition-colors {domainTint(
														s.domain
													)} group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-content"
												>
													<Icon class="size-5" />
												</span>
												{#if cd}
													<span class="data flex items-center gap-1 text-[11px] text-warning">
														<IconClock class="size-3.5" />{cd}
													</span>
												{:else if warLocked}
													<span class="flex items-center gap-1 text-[11px] text-fg-muted">
														<IconLock class="size-3.5" />War
													</span>
												{:else if s.self}
													<span class="flex items-center gap-1 text-[11px] text-positive-fg">
														<IconHome class="size-3.5" />Home
													</span>
												{:else}
													<OddsRing
														value={o?.success ?? s.baseSuccess}
														dim={!o}
														size={34}
														textClass="text-[10px]"
														label="Success chance"
													/>
												{/if}
											</span>
											<span class="text-sm leading-tight font-medium text-fg">{s.label}</span>
											<span class="data mt-auto flex items-center gap-2.5 text-[11px] text-fg-muted">
												<span class:text-error={short}>{money(s.cost)}</span>
												{#if s.durationHours}
													<span class="flex items-center gap-0.5"><IconClock class="size-3" />{s.durationHours}h</span>
												{/if}
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
						class="panel overflow-hidden"
						use:enhance={() => {
							launching = true;
							return async ({ result, update }) => {
								launching = false;
								await update({ reset: false });
								toastResult(result);
								if (result.type === "success" && result.data?.outcome) {
									outcome = result.data.outcome as typeof outcome;
									queueMicrotask(() => consoleEl?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
								}
							};
						}}
					>
						<input type="hidden" name="kind" value={kind} />

						<!-- What -->
						<div
							class="flex items-start gap-3 border-b border-line/15 bg-linear-to-br p-4 {spec.domain === 'cyber'
								? 'from-primary/15'
								: 'from-politics-bg/20'} to-transparent"
						>
							<span class="grid size-12 shrink-0 place-items-center rounded-sm {domainTint(spec.domain)}">
								<SpecIcon class="size-6" />
							</span>
							<div class="min-w-0">
								<p class="section-title">{spec.domain === "cyber" ? "Cyber operation" : "Psychological operation"}</p>
								<h2 class="text-lg leading-tight font-semibold text-fg">{spec.label}</h2>
								<p class="mt-1 text-xs text-fg-muted">{spec.blurb}</p>
							</div>
						</div>

						<div class="space-y-4 p-4">
							<!-- Where -->
							{#if spec.self}
								<p class="flex items-center gap-2 rounded-sm bg-positive/10 px-3 py-2 text-xs text-positive-fg">
									<IconHome class="size-4 shrink-0" /> Our own population: always lands, never traced.
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
									<label class="field-label" for="ops-leaflet">Leaflet</label>
									<SearchSelect
										id="ops-leaflet"
										name="leafletTemplate"
										items={leafletItems}
										bind:value={leafletTemplate}
										placeholder="Choose a leaflet…"
										searchPlaceholder="Search slogans…"
									/>
									<p class="mt-2 rounded-sm bg-surface-2 px-3 py-2 font-serif text-sm leading-snug text-fg">
										{leafletPreview}
									</p>
								</div>
							{/if}

							<!-- Odds -->
							<div>
								<div class="flex items-center justify-around gap-4">
									<div class="flex flex-col items-center gap-1">
										<OddsRing
											value={shownOdds.success}
											base={odds && !spec.self ? spec.baseSuccess : null}
											dim={!odds}
											size={76}
											textClass="text-lg"
											label="Success chance"
										/>
										<span class="section-title">Success</span>
									</div>
									<div class="flex flex-col items-center gap-1">
										<OddsRing
											value={shownOdds.attribution}
											color="var(--color-hostile)"
											base={odds && !spec.self ? spec.baseAttribution : null}
											dim={!odds}
											size={76}
											textClass="text-lg"
											label="Chance of being traced"
										/>
										<span class="section-title">Traced</span>
									</div>
								</div>
								{#if !odds}
									<p class="mt-2 text-center text-[11px] text-fg-muted">
										Base odds · pick a target for the live picture
									</p>
								{:else if !spec.self && odds.factors.length}
									<ul class="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="What moves the odds">
										{#each odds.factors as f (f.label)}
											<li
												class="inline-flex items-center gap-1.5 rounded-full border border-line/15 bg-surface-3 py-0.5 pr-1.5 pl-2.5 text-[11px] text-fg-soft"
											>
												{f.label}
												{#if f.success}
													<span
														class="data inline-flex items-center gap-0.5 {f.success > 0
															? 'text-positive-fg'
															: 'text-hostile-fg'}"
														title="Success"
													>
														<IconCheck class="size-3" />{signed(f.success)}
													</span>
												{/if}
												{#if f.attribution}
													<span
														class="data inline-flex items-center gap-0.5 {f.attribution > 0
															? 'text-warning'
															: 'text-positive-fg'}"
														title="Traced"
													>
														<IconEye class="size-3" />{signed(f.attribution)}
													</span>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
								{#if odds && !spec.self && target && !target.atWar}
									<p
										class="mt-3 flex items-start gap-1.5 rounded-sm px-3 py-2 text-[11px] {target.casusBelli
											? 'bg-positive/10 text-positive-fg'
											: 'bg-warning/10 text-warning'}"
									>
										<IconAlert class="mt-px size-3.5 shrink-0" />
										{target.casusBelli
											? `Casus belli on ${target.name}: no diplomatic exposure.`
											: `Not at war: if traced, ${target.name} gets a casus belli on us for a week.`}
									</p>
								{/if}
							</div>

							<!-- Effect -->
							<div class="rounded-sm border-l-2 border-positive bg-positive/5 px-3 py-2.5">
								<p class="section-title mb-1">If it lands</p>
								<p class="text-sm text-fg-soft">
									{#each effectParts as p, i (i)}{#if p.n}<span class="data text-fg">
												{p.t}
											</span>{:else}{p.t}{/if}{/each}
								</p>
							</div>

							<!-- Cost and launch -->
							<div class="space-y-2">
								<ResourceRequirements inline costs={costsOf(kind)} {available} labels={INLINE_LABELS} />
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
						</div>
					</form>
				</div>
			</div>
		{:else}
			<p class="mt-6 text-sm text-fg-muted">
				Operations are ordered by your state's president, defence minister or foreign minister.
			</p>
		{/if}

		<!-- Situation -->
		<div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
			<section class="panel p-4" aria-labelledby="on-us-title">
				<h2 id="on-us-title" class="section-title mb-1">
					<IconAlert class="size-4" /> On {data.state.name}
					{#if effectsOnUs.length}<span class="data ml-auto tracking-normal">{effectsOnUs.length}</span>{/if}
				</h2>
				{#if effectsOnUs.length}
					<ul class="divide-y divide-line/10">
						{#each effectsOnUs as e (e.id)}
							{@render effectRow(
								e,
								e.kind === "casus_belli"
									? `On ${e.source ?? "an unknown state"}`
									: e.kind === "morale_boost"
										? "Our own campaign"
										: e.source
											? `By ${e.source}`
											: "Origin unknown",
								e.kind !== "morale_boost" && e.kind !== "casus_belli"
							)}
						{/each}
					</ul>
				{:else}
					<div class="flex flex-col items-center gap-1.5 py-5 text-center">
						<IconRadar class="size-7 text-fg-faint" />
						<p class="text-xs text-fg-muted">Nothing detected.<br />Which isn't the same as nothing.</p>
					</div>
				{/if}
			</section>

			{#if data.planner}
				<section class="panel p-4" aria-labelledby="running-title">
					<h2 id="running-title" class="section-title mb-1">
						<IconTarget class="size-4" /> Our ops running
						{#if running.length}<span class="data ml-auto tracking-normal">{running.length}</span>{/if}
					</h2>
					{#if running.length}
						<ul class="divide-y divide-line/10">
							{#each running as e (e.id)}
								{@render effectRow(e, `On ${e.target}`, false)}
							{/each}
						</ul>
					{:else}
						<div class="flex flex-col items-center gap-1.5 py-5 text-center">
							<IconPulse class="size-7 text-fg-faint" />
							<p class="text-xs text-fg-muted">None running.<br />Pick an operation to start.</p>
						</div>
					{/if}
				</section>
			{/if}

			<section class="panel p-4 {data.planner ? '' : 'md:col-span-2'}" aria-labelledby="defence-title">
				<h2 id="defence-title" class="section-title mb-3"><IconShield class="size-4" /> Cyber defence</h2>
				<div class="flex items-center gap-4">
					<OddsRing
						value={data.state.defenceLevel / defenceMax}
						segments={defenceMax}
						color="var(--color-positive)"
						size={72}
						label="Cyber defence"
					>
						<span class="text-base">
							L{data.state.defenceLevel}<span class="text-[0.65em] text-fg-faint">/{defenceMax}</span>
						</span>
					</OddsRing>
					<ul class="space-y-1 text-[11px] text-fg-muted">
						<li>
							<span class="data text-positive-fg">−{Math.round(CYBER_DEFENCE.SUCCESS_PER_LEVEL * 100)}%</span> enemy success
						</li>
						<li>
							<span class="data text-positive-fg">+{Math.round(CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * 100)}%</span> traced
						</li>
						<li class="text-fg-faint">per level</li>
					</ul>
				</div>
				{#if data.state.canUpgrade && data.state.upgradeCost !== null}
					<form
						method="POST"
						action="?/upgradeDefence"
						class="mt-4 flex flex-wrap items-center justify-between gap-2"
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
					<p class="mt-3 text-xs text-positive-fg">At the highest level.</p>
				{/if}
			</section>
		</div>

		<!-- Ledger -->
		<section class="panel mt-3 p-4" aria-labelledby="ledger-title">
			<h2 id="ledger-title" class="section-title mb-2"><IconHistory class="size-4" /> Operations ledger</h2>
			<OpsLedger rows={data.ledger} />
		</section>
	{/if}
</PageContainer>
