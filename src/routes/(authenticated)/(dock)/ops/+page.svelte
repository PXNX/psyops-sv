<!-- src/routes/(authenticated)/(dock)/ops/+page.svelte -->
<!-- Covert operations console. Leaders (president, defence or foreign
     minister) plan cyber operations and psyops: pick an operation and a
     target, see the odds and why, launch, and watch it resolve in the
     console. Alongside: what is working on our state, what our operations
     are doing to others, cyber defence, and the ledger. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { fade } from "svelte/transition";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
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
	import { countdown, dtg } from "#lib/utils/military.js";
	import { EFFECT_TONE, effectLabel } from "#lib/utils/covert.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { vanish } from "#lib/utils/motion.js";
	import OpsTerminal from "./OpsTerminal.svelte";
	import IconShield from "~icons/fluent/shield-keyhole-20-regular";
	import IconNetwork from "~icons/mdi/network";

	const { data, form } = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	// ── Planner ────────────────────────────────────────────────────────────
	let domain = $state<CovertDomain>("cyber");
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

	const kindsOf = (d: CovertDomain) => COVERT_OP_KINDS.filter((k) => COVERT_OPS[k].domain === d);
	function pickDomain(d: CovertDomain) {
		domain = d;
		kind = kindsOf(d)[0]!;
	}

	const spec = $derived(COVERT_OPS[kind]);
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
	const odds = $derived(
		spec.self
			? covertOdds(kind, { defenceLevel: 0, atWar: true, recentOps: 0, targetResilient: false })
			: target
				? covertOdds(kind, {
						defenceLevel: target.defenceLevel,
						atWar: target.atWar || target.casusBelli,
						recentOps: target.recentOps,
						targetResilient: target.resilient,
						networkAssets: target.networkAssets
					})
				: null
	);
	const cooldownLeft = $derived.by(() => {
		const at = data.planner?.cooldowns[kind];
		return at ? countdown(at, now) : null;
	});
	const regionName = $derived(data.planner?.regions.find((r) => String(r.id) === regionId)?.name ?? null);

	const blocked = $derived.by((): string | null => {
		if (!data.planner || !data.state) return "Only your state's leadership can order operations.";
		if (cooldownLeft) return `Teams ready again in ${cooldownLeft}.`;
		if ((data.state.treasury ?? 0) < spec.cost) return `The treasury can't cover $${spec.cost.toLocaleString()}.`;
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

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(Math.round(n * 100))}`;
	const hours = (h: number) => (h ? `${h} h` : "instant");

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
		}
	}

	// ── Result console ────────────────────────────────────────────────────
	let outcome = $state<NonNullable<typeof form>["outcome"] | null>(null);
	let consoleEl: HTMLElement | undefined = $state();

	const KIND_ICON: Record<CovertDomain, string> = { cyber: "⌁", psyops: "◉" };
	const effectsOnUs = $derived(data.effectsOnUs.filter((e) => new Date(e.expiresAt) > now));
	const running = $derived((data.planner?.running ?? []).filter((e) => new Date(e.expiresAt) > now));
</script>

<svelte:head>
	<title>Operations · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">J3 · Information operations</p>
			<h1 class="text-2xl font-bold text-fg">Covert operations</h1>
			{#if data.state}
				<p class="text-sm text-fg-muted">
					{data.state.name}{data.authority ? ` · ${data.authority.roleLabel}` : ""}
				</p>
			{/if}
		</div>
		{#if data.state}
			<div class="flex flex-wrap items-end justify-end gap-5">
				{#if data.planner}
					<span class="data hidden text-xs text-fg-muted sm:block">
						{targets.reduce((n, t) => n + (t.networkAssets ?? 0), 0)} footholds abroad
					</span>
				{/if}
				<dl class="flex gap-5 text-right">
					{#if data.state.treasury !== null}
						<div>
							<dt class="section-title justify-end">Treasury</dt>
							<dd class="data text-lg text-fg">${data.state.treasury.toLocaleString()}</dd>
						</div>
					{/if}
					<div>
						<dt class="section-title justify-end">Cyber defence</dt>
						<dd class="data text-lg text-fg">L{data.state.defenceLevel}/{CYBER_DEFENCE.MAX_LEVEL}</dd>
					</div>
				</dl>
				<Button variant="secondary" size="sm" href="/ops/network" icon={IconNetwork}>Network</Button>
			</div>
		{/if}
	</header>

	{#if !data.state}
		<div class="panel mt-6 p-6 text-sm text-fg-muted">Settle in a state to see its operations.</div>
	{:else}
		<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			<!-- Planner -->
			<section class="space-y-4" aria-labelledby="planner-title">
				<h2 id="planner-title" class="section-title">Plan an operation</h2>
				{#if !data.planner}
					<div class="panel p-5 text-sm text-fg-muted">
						Operations are ordered by your state's president, defence minister or foreign minister. You can see what
						your state knows about operations against it below.
					</div>
				{:else}
					<form
						method="POST"
						action="?/launch"
						class="panel space-y-4 p-4"
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
						<div class="flex gap-1 rounded-md bg-surface-2 p-1" role="tablist" aria-label="Domain">
							{#each ["cyber", "psyops"] as const as d (d)}
								<button
									type="button"
									role="tab"
									aria-selected={domain === d}
									class="flex-1 rounded-sm px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.12em] transition-colors {domain ===
									d
										? 'bg-surface-8 text-fg'
										: 'text-fg-muted hover:text-fg'}"
									onclick={() => pickDomain(d)}
								>
									<span aria-hidden="true">{KIND_ICON[d]}</span>
									{d === "cyber" ? "Cyber" : "Psyops"}
								</button>
							{/each}
						</div>

						<fieldset class="grid gap-2 sm:grid-cols-2">
							<legend class="sr-only">Operation</legend>
							{#each kindsOf(domain) as k (k)}
								{@const s = COVERT_OPS[k]}
								{@const cd = data.planner.cooldowns[k] ? countdown(data.planner.cooldowns[k]!, now) : null}
								<label
									class="panel-interactive flex cursor-pointer flex-col gap-1 p-3 has-[:checked]:border-primary/70 has-[:checked]:bg-surface-6"
								>
									<input type="radio" name="kind" value={k} bind:group={kind} class="sr-only" />
									<span class="flex items-center justify-between gap-2">
										<span class="font-semibold text-fg">{s.label}</span>
										<span class="data text-xs text-fg-soft">${s.cost.toLocaleString()}</span>
									</span>
									<span class="text-xs text-fg-muted">{s.blurb}</span>
									<span class="data mt-auto text-[11px] text-fg-faint">
										{hours(s.durationHours)} · cooldown {s.cooldownHours} h
										{#if cd}<span class="text-warning"> · ready in {cd}</span>{/if}
									</span>
								</label>
							{/each}
						</fieldset>

						{#if !spec.self}
							<div>
								<label class="field-label" for="ops-target">Target state</label>
								<SearchSelect
									id="ops-target"
									name="targetStateId"
									items={targetItems}
									bind:value={targetId}
									placeholder="Choose a target…"
									searchPlaceholder="Search states…"
								/>
							</div>
						{/if}

						{#if spec.needsRegion}
							<div class="grid gap-3 sm:grid-cols-[1fr_auto]">
								<div>
									<label class="field-label" for="ops-region">Region to dress up</label>
									<SearchSelect
										id="ops-region"
										name="regionId"
										items={data.planner.regions}
										bind:value={regionId}
										placeholder="One of your regions…"
									/>
								</div>
								<fieldset>
									<legend class="field-label">Posture</legend>
									<div class="flex gap-1 rounded-md bg-surface-2 p-1">
										{#each ["inflate", "conceal"] as const as p (p)}
											<label
												class="cursor-pointer rounded-sm px-3 py-1.5 text-sm {posture === p
													? 'bg-surface-8 text-fg'
													: 'text-fg-muted hover:text-fg'}"
											>
												<input type="radio" name="posture" value={p} bind:group={posture} class="sr-only" />
												{p === "inflate" ? "Ghost army" : "Hide strength"}
											</label>
										{/each}
									</div>
								</fieldset>
							</div>
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

						<!-- Live odds and why -->
						<div class="rounded-md border border-line/15 bg-surface-2 p-3">
							<p class="text-sm text-fg-body">{effectPreview}</p>
							{#if odds}
								<div class="mt-3 grid grid-cols-2 gap-3">
									{#each [{ label: "Success", v: odds.success, tone: "bg-positive" }, { label: "Attribution", v: odds.attribution, tone: "bg-hostile" }] as m (m.label)}
										<div>
											<div class="flex items-baseline justify-between">
												<span class="section-title">{m.label}</span>
												<span class="data text-lg text-fg">{pct(m.v)}</span>
											</div>
											<div
												class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-6"
												role="meter"
												aria-label={m.label}
												aria-valuemin={0}
												aria-valuemax={100}
												aria-valuenow={Math.round(m.v * 100)}
											>
												<div class="h-full {m.tone} transition-[width] duration-300" style:width={pct(m.v)}></div>
											</div>
										</div>
									{/each}
								</div>
								{#if !spec.self}
									<ul class="mt-3 space-y-0.5 text-xs">
										<li class="flex justify-between text-fg-muted">
											<span>Base odds</span>
											<span class="data">{pct(spec.baseSuccess)} / {pct(spec.baseAttribution)}</span>
										</li>
										{#each odds.factors as f (f.label)}
											<li class="flex justify-between text-fg-soft">
												<span>{f.label}</span>
												<span class="data">
													<span class:text-hostile-fg={f.success < 0}>{f.success ? signed(f.success) : "±0"}</span>
													/
													<span class:text-warning={f.attribution > 0}
														>{f.attribution ? signed(f.attribution) : "±0"}</span
													>
												</span>
											</li>
										{/each}
										{#if target && !target.atWar}
											<li class="text-warning">
												{target.casusBelli
													? `We hold a casus belli on ${target.name}: no diplomatic exposure.`
													: `Not at war: if traced, ${target.name} gets a casus belli against us for a week.`}
											</li>
										{/if}
									</ul>
								{/if}
							{/if}
						</div>

						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-fg-muted">
								{blocked ?? `Paid from the treasury: $${spec.cost.toLocaleString()}.`}
							</p>
							<Button
								type="submit"
								variant={domain === "cyber" ? "primary" : "soft-purple"}
								disabled={!!blocked}
								loading={launching}
								loadingText="Executing…"
							>
								{spec.self ? "Launch campaign" : `Launch ${spec.label.toLowerCase()}`}
							</Button>
						</div>
					</form>
				{/if}

				{#if outcome}
					<div bind:this={consoleEl} transition:fade={{ duration: 150 }}>
						<OpsTerminal {outcome} onclose={() => (outcome = null)} />
					</div>
				{/if}
			</section>

			<!-- Situation -->
			<aside class="space-y-6">
				<section aria-labelledby="on-us-title">
					<h2 id="on-us-title" class="section-title mb-2">Working on {data.state.name}</h2>
					{#if effectsOnUs.length}
						<ul class="space-y-2">
							{#each effectsOnUs as e (e.id)}
								<li class="panel flex items-start justify-between gap-3 p-3" out:vanish>
									<div class="min-w-0">
										<Badge tone={EFFECT_TONE[e.kind as StateEffectKind]}
											>{effectLabel(e.kind, e.magnitude, e.region)}</Badge
										>
										<p class="mt-1 text-xs text-fg-muted">
											{#if e.kind === "casus_belli"}
												against {e.source ?? "an unknown state"}: we may strike it as if at war
											{:else if e.kind === "morale_boost"}
												our own campaign
											{:else}
												{e.source ? `by ${e.source}` : "origin unknown"}
											{/if}
										</p>
									</div>
									<span class="data shrink-0 text-xs text-fg-soft">{countdown(e.expiresAt, now) ?? "ended"}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="panel p-3 text-sm text-fg-muted">Nothing detected. Which isn't the same as nothing.</p>
					{/if}
				</section>

				{#if data.planner}
					<section aria-labelledby="running-title">
						<h2 id="running-title" class="section-title mb-2">Our operations running</h2>
						{#if running.length}
							<ul class="space-y-2">
								{#each running as e (e.id)}
									<li class="panel flex items-start justify-between gap-3 p-3" out:vanish>
										<div class="min-w-0">
											<Badge tone={EFFECT_TONE[e.kind as StateEffectKind]}
												>{effectLabel(e.kind, e.magnitude, e.region)}</Badge
											>
											<p class="mt-1 text-xs text-fg-muted">on {e.target}</p>
										</div>
										<span class="data shrink-0 text-xs text-fg-soft">{countdown(e.expiresAt, now) ?? "ended"}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="panel p-3 text-sm text-fg-muted">No operation of ours is running.</p>
						{/if}
					</section>
				{/if}

				<section aria-labelledby="defence-title" class="panel p-4">
					<h2 id="defence-title" class="section-title mb-3"><IconShield class="size-4" /> Cyber defence</h2>
					<div class="flex gap-1" aria-label="Level {data.state.defenceLevel} of {CYBER_DEFENCE.MAX_LEVEL}">
						{#each Array(CYBER_DEFENCE.MAX_LEVEL) as _, i (i)}
							<span class="h-2 flex-1 rounded-sm {i < data.state.defenceLevel ? 'bg-positive' : 'bg-surface-7'}"></span>
						{/each}
					</div>
					<p class="mt-2 text-xs text-fg-muted">
						Each level: cyber attacks on us {Math.round(CYBER_DEFENCE.SUCCESS_PER_LEVEL * 100)}% less likely to work and
						{Math.round(CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * 100)}% likelier to be traced.
					</p>
					{#if data.state.canUpgrade && data.state.upgradeCost !== null}
						<form
							method="POST"
							action="?/upgradeDefence"
							class="mt-3"
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
							<Button
								type="submit"
								variant="secondary"
								size="sm"
								loading={upgrading}
								disabled={(data.state.treasury ?? 0) < data.state.upgradeCost}
							>
								Raise to level {data.state.defenceLevel + 1} · ${data.state.upgradeCost.toLocaleString()}
							</Button>
						</form>
					{/if}
				</section>
			</aside>
		</div>

		<!-- Ledger -->
		<section class="mt-8" aria-labelledby="ledger-title">
			<h2 id="ledger-title" class="section-title mb-2">Operations ledger</h2>
			{#if data.ledger.length}
				<div class="panel overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-line/15 text-left text-[11px] uppercase tracking-[0.12em] text-fg-muted">
								<th class="px-3 py-2 font-semibold">DTG</th>
								<th class="px-3 py-2 font-semibold">Operation</th>
								<th class="px-3 py-2 font-semibold">Target / origin</th>
								<th class="px-3 py-2 text-right font-semibold">Odds S/A</th>
								<th class="px-3 py-2 font-semibold">Outcome</th>
							</tr>
						</thead>
						<tbody>
							{#each data.ledger as o (`${o.ours}-${o.id}`)}
								<tr class="border-b border-line/10 align-top last:border-0">
									<td class="data whitespace-nowrap px-3 py-2 text-xs text-fg-muted">{dtg(o.launchedAt)}</td>
									<td class="px-3 py-2">
										<span class="text-fg">{COVERT_OPS[o.kind].label}</span>
										{#if o.region}<span class="text-xs text-fg-muted"> · {o.region}</span>{/if}
										{#if o.message}<p class="max-w-xs truncate text-xs italic text-fg-muted">“{o.message}”</p>{/if}
										{#if o.amount}<p class="data text-xs text-fg-soft">${o.amount.toLocaleString()} taken</p>{/if}
									</td>
									<td class="px-3 py-2 text-xs">
										{#if o.self}
											<span class="text-fg-muted">home front</span>
										{:else if o.ours}
											<span class="text-fg-soft">→ {o.other}</span>
										{:else}
											<span class="text-hostile-fg">← {o.other ?? "unknown"}</span>
										{/if}
									</td>
									<td class="data px-3 py-2 text-right text-xs text-fg-soft">
										{o.successChance}% / {o.attributionChance}%
									</td>
									<td class="px-3 py-2">
										<div class="flex flex-wrap gap-1">
											<Badge size="xs" tone={o.succeeded ? (o.ours ? "green" : "red") : "neutral"}
												>{o.succeeded ? "success" : o.ours ? "failed" : "thwarted"}</Badge
											>
											{#if o.ours && !o.self}
												{#if o.attributed}<Badge size="xs" tone="orange">traced</Badge>
												{:else if o.detected}<Badge size="xs" tone="amber">noticed</Badge>
												{:else}<Badge size="xs" tone="neutral">unseen</Badge>{/if}
											{:else if !o.ours && o.attributed}
												<Badge size="xs" tone="orange">attributed</Badge>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="panel p-3 text-sm text-fg-muted">No operations on record.</p>
			{/if}
		</section>
	{/if}
</PageContainer>
