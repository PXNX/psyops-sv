<!-- src/routes/(authenticated)/(dock)/intel/+page.svelte -->
<!-- The intelligence archive as a stack of INTREPs: report number, DTG,
     region and grid, the sensor and conditions it flew in, and a findings
     table. Above it, passes still in flight and the fused picture per region. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { Conditions, UnitBadge } from "#lib/component/tactical/index.js";
	import { SENSORS, UNIT_CATEGORIES, type Cover, type SensorId, type Weather } from "#lib/config/index.js";
	import { ageLabel, countdown, dtg, formatLatLon } from "#lib/utils/military.js";
	import IconMap from "~icons/fluent/map-20-regular";
	import IconRadar from "~icons/fluent/radar-20-regular";

	const { data } = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let showStale = $state(true);
	const reports = $derived(showStale ? data.reports : data.reports.filter((r) => r.fresh));

	const sensorLabel = (s: string) => SENSORS[s as SensorId]?.label ?? s;
	const sensorShort = (s: string) => SENSORS[s as SensorId]?.short ?? s;
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const reportNo = (id: number) => `INTREP ${String(id).padStart(5, "0")}`;
	const levelTone = { none: "neutral", low: "amber", medium: "blue", high: "green" } as const;
	const TYPE_LABEL: Record<string, string> = {
		infantry: "Infantry",
		armor: "Armour",
		mechanized: "Mechanised",
		artillery: "Artillery",
		air_defence: "Air defence",
		fighter_squadron: "Fighters",
		bomber_squadron: "Bombers",
		vehicle: "Vehicles",
		air: "Aircraft"
	};
	const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
</script>

<svelte:head>
	<title>Intelligence · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">J2 · Intelligence</p>
			<h1 class="text-2xl font-bold text-fg">Intel reports</h1>
			{#if data.side}
				<p class="text-sm text-fg-muted">
					Shared within {data.side.stateName}{data.side.partners
						? ` and ${data.side.partners} bloc partner${data.side.partners === 1 ? "" : "s"}`
						: ""}. Reports stay fresh for 24 h.
				</p>
			{/if}
		</div>
		<Button href="/map" variant="secondary" size="sm" icon={IconMap}>Situation map</Button>
	</header>

	{#if !data.side}
		<section class="panel rounded-sm p-5 text-sm text-fg-muted">
			You need to live in a state to receive intelligence. Recon is launched from an enemy region's page or the map.
		</section>
	{:else}
		<!-- Passes in flight -->
		{#if data.inFlight.length}
			<section class="panel rounded-sm p-4">
				<h2 class="section-title mb-3"><IconRadar class="size-5 text-primary-fg" /> Tasked</h2>
				<ul class="divide-y divide-line/15">
					{#each data.inFlight as m (m.id)}
						<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
							<span class="font-mono text-xs text-primary-fg w-16">{sensorShort(m.sensor)}</span>
							<a href="/region/{m.region.id}" class="font-semibold text-fg hover:text-primary-fg">{m.region.name}</a>
							<span class="text-fg-muted text-xs">{m.region.ownerName ?? "—"}</span>
							<span class="ml-auto font-mono text-xs text-fg-soft">
								{countdown(m.completesAt, now) ? `ETA ${countdown(m.completesAt, now)}` : "landing…"}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Current picture per region -->
		{#if data.pictures.length}
			<section class="panel rounded-sm p-4">
				<h2 class="section-title mb-3">Current picture</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-left text-[10px] uppercase tracking-wide text-fg-muted">
								<th class="py-1.5 pr-3 font-medium">Region</th>
								<th class="py-1.5 pr-3 font-medium">Confidence</th>
								<th class="py-1.5 pr-3 font-medium">Known forces</th>
								<th class="py-1.5 pr-3 font-medium">Sensors</th>
								<th class="py-1.5 font-medium text-right">Last seen</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-line/15">
							{#each data.pictures as { region, picture } (region.id)}
								<tr>
									<td class="py-2 pr-3">
										<a href="/region/{region.id}" class="font-semibold text-fg hover:text-primary-fg">{region.name}</a>
										<div class="text-xs text-fg-muted">{region.ownerName ?? "—"}</div>
									</td>
									<td class="py-2 pr-3">
										<Badge tone={levelTone[picture.level]} size="xs">{picture.level}</Badge>
										<span class="ml-1 font-mono text-xs text-fg-soft">{pct(picture.confidence)}</span>
									</td>
									<td class="py-2 pr-3">
										<div class="flex flex-wrap items-center gap-1.5">
											{#each UNIT_CATEGORIES as c}
												{@const cat = picture.categories[c]}
												{#if cat.coverage === 0}
													<UnitBadge affiliation="unknown" size={16} title="{typeLabel(c)}: not observed" />
												{:else if cat.count}
													<UnitBadge
														affiliation="hostile"
														unitType={c}
														count={cat.count}
														estimated={cat.estimated}
														size={16}
														title="{typeLabel(c)}: {cat.estimated ? '~' : ''}{cat.count}"
													/>
												{/if}
											{/each}
										</div>
									</td>
									<td class="py-2 pr-3 font-mono text-xs text-fg-soft">
										{picture.sensors.map((s) => sensorShort(s.sensor)).join(" · ")}
									</td>
									<td class="py-2 text-right font-mono text-xs text-fg-soft">
										{picture.latestObservedAt ? ageLabel(picture.latestObservedAt, now) : "—"}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<div class="flex items-center justify-between gap-3">
			<h2 class="section-title">Archive <span class="font-mono text-fg-muted">({data.reports.length})</span></h2>
			<label class="flex items-center gap-2 text-xs text-fg-muted">
				<input type="checkbox" class="checkbox checkbox-xs" bind:checked={showStale} /> Show stale
			</label>
		</div>

		{#if !reports.length}
			<section class="panel rounded-sm p-5 text-sm text-fg-muted">
				No reports yet. Open an enemy region (or tap it on the map) and launch a recon pass.
			</section>
		{/if}

		{#each reports as r (r.id)}
			{@const f = r.findings}
			<article id="report-{r.id}" class="panel rounded-sm overflow-hidden {r.fresh ? '' : 'opacity-70'}">
				<!-- Message header -->
				<header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/15 bg-surface-3 px-4 py-2">
					<span class="font-mono text-sm font-bold tracking-wider text-fg">{reportNo(r.id)}</span>
					<Badge tone={r.fresh ? "green" : "neutral"} size="xs">{r.fresh ? "FRESH" : "STALE"}</Badge>
					{#if f.outcome === "intercepted"}
						<Badge tone="red" size="xs">PLATFORM LOST</Badge>
					{:else if f.outcome === "obscured"}
						<Badge tone="amber" size="xs">NO OBSERVATION</Badge>
					{/if}
					<span class="ml-auto font-mono text-xs text-fg-soft" title={new Date(r.observedAt).toLocaleString()}>
						DTG {dtg(r.observedAt)}
					</span>
				</header>

				<div class="grid gap-4 p-4 md:grid-cols-[minmax(0,15rem)_1fr]">
					<!-- Particulars -->
					<dl class="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-sm self-start">
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Region</dt>
						<dd>
							<a href="/region/{r.region.id}" class="font-semibold text-fg hover:text-primary-fg">{r.region.name}</a>
							<div class="text-xs text-fg-muted">{f.ownerStateName ?? r.region.ownerName ?? "Unclaimed"}</div>
						</dd>
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Grid</dt>
						<dd class="font-mono text-xs text-fg-soft">
							{r.region.lat != null && r.region.lon != null ? formatLatLon(r.region.lat, r.region.lon) : "—"}
						</dd>
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Sensor</dt>
						<dd class="text-fg-soft">{sensorLabel(r.sensor)}</dd>
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Conditions</dt>
						<dd>
							<Conditions
								weather={f.conditions.weather as Weather}
								night={f.conditions.night}
								cover={f.conditions.cover as Cover}
								compact
							/>
						</dd>
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Filed by</dt>
						<dd>
							{#if r.filedBy}
								<UserLink id={r.filedBy.id} name={r.filedBy.name} avatar={r.filedBy.avatar} size="xs" />
							{:else}<span class="text-fg-muted">—</span>{/if}
						</dd>
						<dt class="text-[10px] uppercase tracking-wide text-fg-muted pt-0.5">Valid to</dt>
						<dd class="font-mono text-xs text-fg-soft">{dtg(r.expiresAt)}</dd>
					</dl>

					<!-- Findings -->
					<div class="min-w-0 space-y-3">
						{#if f.outcome === "intercepted"}
							<p class="text-sm text-hostile-fg">
								Drone shot down over the target by {f.airDefence?.units ?? "?"} air-defence unit{f.airDefence?.units ===
								1
									? ""
									: "s"} ({pct(f.airDefence?.interceptChance ?? 0)} intercept chance). No imagery returned.
							</p>
						{:else if f.outcome === "obscured"}
							<p class="text-sm text-warning">
								Sensor could not see the ground ({f.conditions.weather}{f.conditions.night ? ", night" : ""}). Try radar
								or a thermal pass.
							</p>
						{:else}
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
									<thead>
										<tr class="text-left text-[10px] uppercase tracking-wide text-fg-muted">
											<th class="py-1 pr-3 font-medium">Hostile</th>
											<th class="py-1 pr-3 font-medium text-right">Count</th>
											<th class="py-1 font-medium text-right">Detection</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-line/15 font-mono">
										{#each UNIT_CATEGORIES as c}
											{@const seen = f.categories.find((x) => x.category === c)}
											{@const types =
												f.unitTypes?.filter(
													(t) =>
														t.unitType === c ||
														(c === "vehicle" && ["armor", "mechanized", "air_defence"].includes(t.unitType)) ||
														(c === "air" && ["fighter_squadron", "bomber_squadron"].includes(t.unitType))
												) ?? []}
											<tr>
												<td class="py-1.5 pr-3 font-sans">
													<span class="inline-flex items-center gap-2">
														<UnitBadge affiliation={f.coverage[c] ? "hostile" : "unknown"} unitType={c} size={16} />
														{typeLabel(c)}
													</span>
													{#if types.length && !(types.length === 1 && types[0].unitType === c)}
														<div class="pl-8 text-xs text-fg-muted">
															{types
																.map((t) => `${typeLabel(t.unitType)} ${t.estimated ? "~" : ""}${t.count}`)
																.join(" · ")}
														</div>
													{/if}
												</td>
												<td class="py-1.5 pr-3 text-right {seen ? 'text-hostile-fg font-bold' : 'text-fg-muted'}">
													{#if !f.coverage[c]}?{:else if seen}{seen.estimated ? "~" : ""}{seen.count}{:else}0{/if}
												</td>
												<td class="py-1.5 text-right text-fg-soft">{f.coverage[c] ? pct(f.coverage[c]) : "blind"}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if f.firingPositions}
								<p class="text-xs text-fg-soft">
									<span class="font-semibold text-fg">Firing positions (thermal):</span>
									<span class="font-mono">{f.firingPositions.count}</span>
									· {pct(f.firingPositions.confidence)} fix
								</p>
							{/if}
							{#if f.airDefence && f.airDefence.units}
								<p class="text-xs text-fg-soft">
									<span class="font-semibold text-fg">Air defence encountered:</span>
									<span class="font-mono">{f.airDefence.units}</span> unit{f.airDefence.units === 1 ? "" : "s"}
								</p>
							{/if}
							{#if f.buildings}
								<p class="font-mono text-xs text-fg-soft">
									<span class="font-sans font-semibold text-fg">Installations:</span>
									FORT {f.buildings.fortifications} · INFRA {f.buildings.infrastructure} · PWR {f.buildings.economy} · EDU
									{f.buildings.education} · MED {f.buildings.hospitals}{f.buildings.underConstruction
										? ` · ${f.buildings.underConstruction} under construction`
										: ""}
								</p>
							{/if}
							{#if f.battle}
								<a
									href="/battle/{f.battle.id}"
									class="block rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-xs hover:border-error/60"
								>
									<span class="font-semibold text-hostile-fg">Battle ({f.battle.phase})</span>
									<span class="font-mono text-fg-soft">
										· {f.battle.attackerStateName}: {f.battle.attacker.units} units / {f.battle.attacker.strength} str · {f
											.battle.defenderStateName}: {f.battle.defender.units} units / {f.battle.defender.strength} str
									</span>
								</a>
							{/if}
						{/if}
					</div>
				</div>
			</article>
		{/each}
	{/if}
</PageContainer>
