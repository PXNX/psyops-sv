<!-- src/routes/(authenticated)/(dock)/domains/+page.svelte -->
<!-- Command console for the support domains: sea power, space, AI and the
     shadow economy. Leaders see the planners; citizens can run cargo. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import {
		NAVAL_OPS,
		NAVAL_OP_KINDS,
		SATELLITE_KINDS,
		SATELLITE_KIND_IDS,
		SMUGGLING_GOODS,
		SMUGGLING_GOOD_IDS,
		SPACE_OPS,
		SPACE_OP_KINDS,
	} from "#lib/config/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import DocArt from "#lib/component/docs/DocArt.svelte";
	import DomainArt from "./DomainArt.svelte";

	const { data, form } = $props();
	const p = $derived(data.planner);
	const targets = $derived(p?.targets ?? []);
	const handleSubmit = () => async ({ result, update }: { result: any; update: () => Promise<void> }) => {
		await update();
		toastResult(result);
	};
	const label = (v: string) => v.replace(/_/g, " ");

	// State and region ids are always picked from a searchable dropdown that
	// shows `Name (#id)` — never typed into a number field.
	let convoyOrigin = $state("");
	let convoyTarget = $state("");
	let repairRegion = $state("");
	let navalRegion = $state("");
</script>

<PageContainer>
	<div class="space-y-6 py-6">
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="section-title">Joint command</p>
				<h1 class="font-serif text-3xl">Five domains</h1>
				<p class="mt-1 max-w-2xl text-sm text-fg-muted">
					Land, sea and air fight the battle. Space and cyber decide who sees it, who commands it and who pays for it.
				</p>
			</div>
			{#if data.state}
				<Badge>{data.state.name}</Badge>
			{/if}
		</header>

		<div class="animate-rise-in panel rounded-sm p-2" style="--rise-delay: 60ms">
			<DocArt
				kind="domains"
				label="Combined arms"
				caption="Hold ground, command the sea and sky — then use space and cyber to see, talk and strike first."
				compact
			/>
		</div>

		{#if form && "message" in form && form.message}
			<p class="panel border-positive/40 p-3 text-sm">{String(form.message)}</p>
		{/if}

		{#if !data.state}
			<div class="panel p-6 text-sm text-fg-muted">Settle in a state to see its command picture.</div>
		{:else}
			<!-- ── Logistics ───────────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 120ms" aria-labelledby="supply-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="supply-title" class="section-title">🚚 Supply chains</h2>
					<DomainArt kind="supply" label="Supply routes" class="w-44" />
				</div>
				<p class="text-sm">
					Average supply <strong>{Math.round((p?.supply.average ?? 1) * 100)}%</strong> · worst region
					{Math.round((p?.supply.worst ?? 1) * 100)}% · {p?.supply.regions ?? 0} active region(s){#if p?.supply.blockaded}<span
							class="text-warning"> · under blockade</span
						>{/if}
				</p>
				<p class="mt-1 text-xs text-fg-muted">
					Roads, rails and ports decide how much food, fuel and ammunition reach a region. Strikes on bridges
					and a naval blockade throttle the flow: units fight weaker and factories run slower. Smuggled cargo
					lands directly in the destination's strategic stockpile.
				</p>
			</section>

			<section class="animate-rise-in panel p-4" style="--rise-delay: 180ms" aria-labelledby="autonomy-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="autonomy-title" class="section-title">🏭 Supply autonomy {Math.round((p?.autonomy.score ?? 1) * 100)}%</h2>
					<DomainArt kind="autonomy" label="Domestic sourcing" class="w-44" />
				</div>
				<p class="text-xs text-fg-muted">
					{p?.autonomy.domestic ?? 0} of {p?.autonomy.total ?? 0} strategic inputs sourced at home ·
					{p?.autonomy.bloc ?? 0} from bloc partners · {p?.autonomy.trade ?? 0} via trade lanes ·
					<span class:text-warning={(p?.autonomy.shortage ?? 0) > 0}>{p?.autonomy.shortage ?? 0} unsourced</span>
				</p>
				<p class="mt-1 text-xs text-fg-muted">
					Factories drawing on domestic stock run at full output; bloc partners and trade lanes cost a little
					efficiency, and a blockade or closure throttles the lanes further. Unsourced inputs leave a line limping
					along and degrade its quality.
				</p>
			</section>

			<!-- ── Convoy operations ───────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 240ms" aria-labelledby="convoy-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="convoy-title" class="section-title">🚚 Convoy operations</h2>
					<DomainArt kind="convoy" label="Convoy on the move" class="w-44" />
				</div>
				{#if p?.roles.convoy}
					<form method="POST" action="?/convoy" use:enhance={handleSubmit} class="grid gap-2 sm:grid-cols-4">
						<SearchSelect
							name="originRegionId"
							items={p.ownRegions}
							bind:value={convoyOrigin}
							showId
							placeholder="Origin region"
							searchPlaceholder="Search your regions…"
						/>
						<SearchSelect
							name="targetRegionId"
							items={p.ownRegions}
							bind:value={convoyTarget}
							showId
							placeholder="Target region"
							searchPlaceholder="Search your regions…"
						/>
						<input class="field-control w-full" type="number" name="cargo" value="100" min="1" />
						<Button type="submit" size="sm">Dispatch convoy</Button>
					</form>
					<form method="POST" action="?/repair" use:enhance={handleSubmit} class="mt-3 flex flex-wrap items-center gap-2">
						<SearchSelect
							name="regionId"
							items={p.ownRegions.map((r) => ({ ...r, hint: `infrastructure ${r.infrastructure ?? 0}` }))}
							bind:value={repairRegion}
							showId
							placeholder="Region to rebuild"
							searchPlaceholder="Search your regions…"
						/>
						<Button type="submit" size="sm" variant="secondary">Rebuild infrastructure (2 machine tools)</Button>
					</form>
					{#if p.convoys.length}
						<ul class="mt-3 space-y-1 text-xs text-fg-muted">
							{#each p.convoys.slice(0, 5) as c}<li>
									Region {c.originRegionId} → {c.targetRegionId}: {c.cargo} units · {label(c.outcome)} ·
									{c.interceptionChance}% intercept risk
								</li>{/each}
						</ul>
					{/if}
				{:else}
					<p class="text-sm text-fg-muted">Only the president or economy minister can fund convoys and repairs.</p>
				{/if}
			</section>

			<!-- ── Air & sea trade ─────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 300ms" aria-labelledby="trade-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="trade-title" class="section-title">✈️🚢 Air &amp; sea trade</h2>
					<DomainArt kind="trade" label="Trade lanes" class="w-44" />
				</div>
				<p class="mb-3 text-xs text-fg-muted">
					Air flow {Math.round((p?.trade.factors.air ?? 1) * 100)}% · sea flow {Math.round((p?.trade.factors.sea ?? 1) * 100)}%.
					Lanes earn treasury every six hours; a closed airspace grounds air freight, and an EEZ closure or blockade
					chokes shipping.
				</p>
				{#if p?.roles.trade || p?.roles.closure}
					<div class="grid gap-4 lg:grid-cols-2">
						{#if p.roles.trade}
							<form method="POST" action="?/openLane" use:enhance={handleSubmit} class="space-y-2">
								<h3 class="section-title">Open a trade lane</h3>
								<select class="field-control w-full" name="kind">
									{#each ["air", "sea"] as kind}
										{@const laneSpec = p.trade.laneSpecs[kind as "air" | "sea"]}
										<option value={kind}>{label(laneSpec.label)} · {laneSpec.revenuePerPoint.toLocaleString()}/point</option>
									{/each}
								</select>
								<select class="field-control w-full" name="partnerStateId">
									<option value="">Partner state</option>
									{#each targets as t}<option value={t.id}>{t.name} (#{t.id})</option>{/each}
								</select>
								<input class="field-control w-full" type="number" name="capacity" value="50" min="10" />
								<Button type="submit" size="sm">Open lane</Button>
							</form>
						{/if}
						{#if p.roles.closure}
							<form method="POST" action="?/closeZone" use:enhance={handleSubmit} class="space-y-2">
								<h3 class="section-title">Close a zone</h3>
								<select class="field-control w-full" name="kind">
									{#each ["airspace", "eez"] as kind}
										{@const closureSpec = p.trade.closureSpecs[kind as "airspace" | "eez"]}
										<option value={kind}>{label(closureSpec.label)} · {closureSpec.costPerHour.toLocaleString()}/h</option>
									{/each}
								</select>
								<select class="field-control w-full" name="targetStateId">
									<option value="">Everyone</option>
									{#each targets as t}<option value={t.id}>{t.name} (#{t.id}) only</option>{/each}
								</select>
								<input class="field-control w-full" type="number" name="hours" value="24" min="6" />
								<Button type="submit" size="sm" variant="secondary">Declare closure</Button>
							</form>
						{/if}
					</div>
					{#if p.trade.lanes.length || p.trade.zones.length}
						<ul class="mt-3 space-y-1 text-xs text-fg-muted">
							{#each p.trade.lanes.slice(0, 5) as lane}<li>
									{label(p.trade.laneSpecs[lane.kind as "air" | "sea"].label)} · capacity {lane.capacity} · partner state {lane.partnerStateId}
								</li>{/each}
							{#each p.trade.zones.slice(0, 5) as zone}<li>
									{label(zone.kind)} · {zone.targetStateId ? `against state ${zone.targetStateId}` : "all traffic"} · strength {zone.strength}%
								</li>{/each}
						</ul>
					{/if}
				{/if}
			</section>

			<!-- ── Sea ─────────────────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 360ms" aria-labelledby="sea-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="sea-title" class="section-title">⚓ Sea — {p?.seaControl ?? 0} sea-control points</h2>
					<DomainArt kind="sea" label="Radar sweeping the sea" class="w-44" />
				</div>
				{#if p?.roles.naval}
					<form method="POST" action="?/naval" use:enhance={handleSubmit} class="grid gap-3 sm:grid-cols-4">
						<div>
							<label class="field-label" for="naval-kind">Operation</label>
							<select class="field-control w-full" name="kind" id="naval-kind">
								{#each NAVAL_OP_KINDS as kind}
									<option value={kind}>{NAVAL_OPS[kind].label} — {NAVAL_OPS[kind].cost.toLocaleString()}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="field-label" for="naval-target">Target state</label>
							<select class="field-control w-full" name="targetStateId" id="naval-target">
								<option value="">—</option>
								{#each targets as t}<option value={t.id}>{t.name} (#{t.id})</option>{/each}
							</select>
						</div>
						<div>
							<label class="field-label" for="naval-region">Coastal region</label>
							<SearchSelect
								id="naval-region"
								name="regionId"
								items={p.ownRegions}
								bind:value={navalRegion}
								showId
								placeholder="Choose a coastal region…"
								searchPlaceholder="Search your regions…"
							/>
						</div>
						<div class="flex items-end"><Button type="submit" size="sm" block>Launch</Button></div>
					</form>
					<p class="mt-2 text-xs text-fg-muted">
						Fleet: {p.fleet.length} ready unit(s) —
						{#each p.fleet.slice(0, 8) as u, i}{i > 0 ? ", " : ""}{u.name} ({label(u.unitType)}){/each}
					</p>
				{:else}
					<p class="text-sm text-fg-muted">Only the president or defence minister can order naval operations.</p>
				{/if}
				{#if p?.blockades.length}
					<p class="mt-2 text-sm text-warning">Blockaded by {p.blockades.map((b) => b.blockader).join(", ")} — trade and energy are cut.</p>
				{/if}
				{#if p?.navalOps.length}
					<ul class="mt-3 space-y-1 text-xs text-fg-muted">
						{#each p.navalOps.slice(0, 5) as op}<li>{label(op.kind)} · {op.target ?? "—"} · {op.message}</li>{/each}
					</ul>
				{/if}
			</section>

			<!-- ── Space ───────────────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 420ms" aria-labelledby="space-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="space-title" class="section-title">🛰️ Space — {p?.satellites.length ?? 0} satellites · GPS ×{p?.space.gps ?? 1}</h2>
					<DomainArt kind="space" label="Satellite in orbit" class="w-44" />
				</div>
				<p class="mb-3 text-xs text-fg-muted">
					Recon +{Math.round((p?.space.recon ?? 0) * 100)}% · C2 resilience {Math.round((p?.space.comms ?? 0) * 100)}% ·
					early warning {Math.round((p?.space.earlyWarning ?? 0) * 100)}% · upkeep {(p?.space.upkeep ?? 0).toLocaleString()}/day ·
					defence level {p?.spaceDefence ?? 0}
				</p>
				{#if p?.roles.space}
					<div class="grid gap-4 lg:grid-cols-2">
						<form method="POST" action="?/launchSatellite" use:enhance={handleSubmit} class="space-y-2">
							<h3 class="section-title">Launch a satellite</h3>
							<label class="field-label" for="sat-kind">Type</label>
							<select class="field-control w-full" name="kind" id="sat-kind">
								{#each SATELLITE_KIND_IDS as kind}
									<option value={kind}>{SATELLITE_KINDS[kind].label} — {SATELLITE_KINDS[kind].cost.toLocaleString()}</option>
								{/each}
							</select>
							<label class="field-label" for="sat-name">Name</label>
							<input class="field-control w-full" name="name" id="sat-name" required minlength="3" />
							<Button type="submit" size="sm">Launch (80 chips + 20 rare earths)</Button>
						</form>
						<form method="POST" action="?/spaceOp" use:enhance={handleSubmit} class="space-y-2">
							<h3 class="section-title">Space operation</h3>
							<select class="field-control w-full" name="kind">
								{#each SPACE_OP_KINDS as kind}
									<option value={kind}>{SPACE_OPS[kind].label} — {SPACE_OPS[kind].cost.toLocaleString()}</option>
								{/each}
							</select>
							<select class="field-control w-full" name="targetStateId">
								<option value="">Target state</option>
								{#each targets as t}<option value={t.id}>{t.name} (#{t.id})</option>{/each}
							</select>
							<select class="field-control w-full" name="satelliteId">
								<option value="">Random target satellite</option>
								{#each p.satellites as s}<option value={s.id}>{s.name} ({label(s.kind)})</option>{/each}
							</select>
							<Button type="submit" size="sm" variant="secondary">Execute</Button>
						</form>
					</div>
					{#if p.spaceNextCost !== null}
						<form method="POST" action="?/upgradeSpaceDefence" use:enhance={handleSubmit} class="mt-3">
							<Button type="submit" size="sm" variant="secondary">Harden space defence — {p.spaceNextCost.toLocaleString()}</Button>
						</form>
					{/if}
				{/if}
				{#if p?.satellites.length}
					<ul class="mt-3 space-y-1 text-xs text-fg-muted">
						{#each p.satellites.slice(0, 8) as s}<li>{s.name} · {label(s.kind)} · {s.health}% · {label(s.status)}</li>{/each}
					</ul>
				{/if}
			</section>

			<!-- ── AI ──────────────────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 480ms" aria-labelledby="ai-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="ai-title" class="section-title">🧠 Artificial intelligence — level {p?.ai.level ?? 0}</h2>
					<DomainArt kind="ai" label="Neural network" class="w-44" />
				</div>
				<p class="text-sm">{p?.ai.label ?? "No programme"}</p>
				<p class="mt-1 text-xs text-fg-muted">
					Cyber +{Math.round((p?.ai.cyberOffence ?? 0) * 100)}% · defence +{Math.round((p?.ai.cyberDefence ?? 0) * 100)}% ·
					recon +{Math.round((p?.ai.recon ?? 0) * 100)}% · production ×{p?.ai.production ?? 1} ·
					detection +{Math.round((p?.ai.detection ?? 0) * 100)}% · {p?.ai.researchPerDay ?? 0} research/day
				</p>
				<p class="mt-1 text-xs text-fg-muted">
					Computing base: {p?.ai.hardware ?? 0} server hardware · {p?.ai.datacenters ?? 0} datacenters — built in a fabrication line, they run on electricity and cooling water.
				</p>
				{#if p?.roles.ai && p.aiNextCost}
					<form method="POST" action="?/upgradeAi" use:enhance={handleSubmit} class="mt-3">
						<Button type="submit" size="sm">
							Upgrade — {p.aiNextCost.cost.toLocaleString()} · {p.aiNextCost.chips} chips · {p.aiNextCost.rareEarth} rare earths{#if p.aiNextCost.hardware} · {p.aiNextCost.hardware} hardware{/if}{#if p.aiNextCost.datacenters} · {p.aiNextCost.datacenters} datacenter{p.aiNextCost.datacenters === 1 ? "" : "s"}{/if}
						</Button>
					</form>
				{/if}
			</section>

			<!-- ── Smuggling ───────────────────────────────────────────────── -->
			<section class="animate-rise-in panel p-4" style="--rise-delay: 540ms" aria-labelledby="smuggle-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<h2 id="smuggle-title" class="section-title">🕸️ Smuggling — wallet {(data.civilian.wallet ?? 0).toLocaleString()}</h2>
					<DomainArt kind="smuggling" label="Shadow route" class="w-44" />
				</div>
				{#if p?.roles.smuggler}
					<form method="POST" action="?/openRoute" use:enhance={handleSubmit} class="grid gap-2 sm:grid-cols-3">
						<select class="field-control w-full" name="good">
							{#each SMUGGLING_GOOD_IDS as good}
								<option value={good}>{SMUGGLING_GOODS[good].label}</option>
							{/each}
						</select>
						<select class="field-control w-full" name="targetStateId">
							<option value="">Partner state</option>
							{#each targets as t}<option value={t.id}>{t.name} (#{t.id})</option>{/each}
						</select>
						<Button type="submit" size="sm" variant="secondary">Open route (25,000)</Button>
					</form>
				{/if}
				{#if p?.routes.length}
					<div class="mt-4 space-y-2">
						{#each p.routes as r}
							<form method="POST" action="?/runRoute" use:enhance={handleSubmit} class="panel-interactive flex flex-wrap items-center gap-2 p-3">
								<input type="hidden" name="routeId" value={r.id} />
								<span class="text-sm">{r.origin} → {r.target} · {label(r.good)} · {r.risk}% risk</span>
								<input class="field-control w-20" type="number" name="quantity" value="10" min="1" />
								<Button type="submit" size="sm">Run cargo</Button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="mt-2 text-sm text-fg-muted">No routes are open yet.</p>
				{/if}
				{#if data.civilian.runs.length}
					<ul class="mt-3 space-y-1 text-xs text-fg-muted">
						{#each data.civilian.runs.slice(0, 5) as run}<li>{label(run.good)} ×{run.quantity} — {label(run.outcome)}</li>{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>
</PageContainer>
