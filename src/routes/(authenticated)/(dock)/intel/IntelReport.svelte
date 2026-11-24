<!-- src/routes/(authenticated)/(dock)/intel/IntelReport.svelte -->
<!-- One INTREP opened from the archive, printed like a classified message:
     banner, particulars (region, grid, sensor, conditions, author, validity)
     and the findings table. -->
<script lang="ts">
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { Conditions, UnitBadge } from "#lib/component/tactical/index.js";
	import {
		SENSORS,
		UNIT_CATEGORIES,
		WEATHER_LABEL,
		type Cover,
		type SensorId,
		type Weather
	} from "#lib/config/index.js";
	import { dtg, formatLatLon } from "#lib/utils/military.js";
	import IconImage from "~icons/fluent/image-multiple-20-regular";
	import IconBattle from "~icons/fluent/flash-20-regular";
	import type { PageData } from "./$types";
	import { CATEGORY_LABEL, pct, reportNo, typeLabel } from "./labels";

	interface Props {
		report: PageData["reports"][number];
		onImagery: (reportId: number) => void;
	}
	let { report: r, onImagery }: Props = $props();
	const f = $derived(r.findings);

	const typesIn = (c: string) =>
		f.unitTypes?.filter(
			(t) =>
				t.unitType === c ||
				(c === "vehicle" && ["armor", "mechanized", "air_defence"].includes(t.unitType)) ||
				(c === "air" && ["fighter_squadron", "bomber_squadron"].includes(t.unitType))
		) ?? [];
</script>

<article class="intel-report relative overflow-hidden rounded-sm border border-error/25 bg-surface-2">
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-error/25 bg-error/10 px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-hostile-fg"
	>
		<span>Restricted // Eyes only</span>
		<span>J2 · {reportNo(r.id)}</span>
	</div>

	<div class="grid gap-5 p-4 md:grid-cols-[minmax(0,14rem)_1fr]">
		<!-- Particulars -->
		<dl class="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 self-start text-sm">
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">DTG</dt>
			<dd class="data text-xs text-fg-soft">{dtg(r.observedAt)}</dd>
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">Grid</dt>
			<dd class="data text-xs text-fg-soft">
				{r.region.lat != null && r.region.lon != null ? formatLatLon(r.region.lat, r.region.lon) : "—"}
			</dd>
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">Sensor</dt>
			<dd class="text-fg-soft">{SENSORS[r.sensor as SensorId]?.label ?? r.sensor}</dd>
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">Conditions</dt>
			<dd>
				<Conditions
					weather={f.conditions.weather as Weather}
					night={f.conditions.night}
					cover={f.conditions.cover as Cover}
					compact
				/>
			</dd>
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">Filed by</dt>
			<dd>
				{#if r.filedBy}
					<UserLink id={r.filedBy.id} name={r.filedBy.name} avatar={r.filedBy.avatar} size="xs" />
				{:else}<span class="text-fg-muted">—</span>{/if}
			</dd>
			<dt class="pt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">Valid to</dt>
			<dd class="data text-xs text-fg-soft">{dtg(r.expiresAt)}</dd>
			<dd class="col-span-2 pt-1">
				<Button variant="secondary" size="xs" icon={IconImage} onclick={() => onImagery(r.id)}>View imagery</Button>
			</dd>
		</dl>

		<!-- Findings -->
		<div class="min-w-0 space-y-3">
			{#if f.outcome === "intercepted"}
				<p class="text-sm text-hostile-fg">
					Drone shot down over the target{f.airDefence?.units
						? ` by ${f.airDefence.units} air-defence unit${f.airDefence.units === 1 ? "" : "s"}`
						: ""}{f.airDefence ? ` (${pct(f.airDefence.interceptChance)} intercept chance)` : ""}. No imagery returned.
				</p>
			{:else if f.outcome === "obscured"}
				<p class="text-sm text-warning">
					Sensor could not see the ground ({(
						WEATHER_LABEL[f.conditions.weather as Weather] ?? f.conditions.weather
					).toLowerCase()}{f.conditions.night ? ", night" : ""}). Try SAR or a thermal pass.
				</p>
			{:else}
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-[10px] uppercase tracking-wide text-fg-muted">
							<th class="py-1 pr-3 font-medium">Hostile</th>
							<th class="py-1 pr-3 text-right font-medium">Count</th>
							<th class="py-1 text-right font-medium">Detection</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line/15">
						{#each UNIT_CATEGORIES as c (c)}
							{@const seen = f.categories.find((x) => x.category === c)}
							{@const types = typesIn(c)}
							<tr>
								<td class="py-1.5 pr-3">
									<span class="inline-flex items-center gap-2">
										<UnitBadge affiliation={f.coverage[c] ? "hostile" : "unknown"} unitType={c} size={16} />
										{CATEGORY_LABEL[c]}
									</span>
									{#if types.length && !(types.length === 1 && types[0].unitType === c)}
										<div class="pl-8 text-xs text-fg-muted">
											{types.map((t) => `${typeLabel(t.unitType)} ${t.estimated ? "~" : ""}${t.count}`).join(" · ")}
										</div>
									{/if}
								</td>
								<td class="data py-1.5 pr-3 text-right {seen?.count ? 'font-bold text-hostile-fg' : 'text-fg-muted'}">
									{#if !f.coverage[c]}—{:else if seen}{seen.estimated ? "~" : ""}{seen.count}{:else}0{/if}
								</td>
								<td class="data py-1.5 text-right text-fg-soft">
									{#if f.coverage[c]}{pct(f.coverage[c])}{:else}<span class="text-fg-faint">blind</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				{#if f.firingPositions}
					<p class="text-xs text-fg-soft">
						<span class="font-semibold text-fg">Firing positions (thermal):</span>
						<span class="data">{f.firingPositions.count}</span> · {pct(f.firingPositions.confidence)} fix
					</p>
				{/if}
				{#if f.airDefence && f.airDefence.units}
					<p class="text-xs text-fg-soft">
						<span class="font-semibold text-fg">Air defence encountered:</span>
						<span class="data">{f.airDefence.units}</span> unit{f.airDefence.units === 1 ? "" : "s"}
					</p>
				{/if}
				{#if f.buildings}
					<p class="text-xs text-fg-soft">
						<span class="font-semibold text-fg">Installations:</span>
						<span class="data">
							FORT {f.buildings.fortifications} · INFRA {f.buildings.infrastructure} · PWR {f.buildings.economy} · EDU
							{f.buildings.education} · MED {f.buildings.hospitals} · RADAR {f.buildings.radar ?? 0}
						</span>{f.buildings.underConstruction ? ` · ${f.buildings.underConstruction} under construction` : ""}
					</p>
				{/if}
				{#if f.battle}
					<a
						href="/battle/{f.battle.id}"
						class="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-xs hover:border-error/60"
					>
						<IconBattle class="size-4 text-hostile-fg" />
						<span class="font-semibold text-hostile-fg">Battle · {f.battle.phase}</span>
						<span class="data text-fg-soft">
							{f.battle.attackerStateName}
							{f.battle.attacker.units} units / {f.battle.attacker.strength} str — {f.battle.defenderStateName}
							{f.battle.defender.units} units / {f.battle.defender.strength} str
						</span>
					</a>
				{/if}
			{/if}
		</div>
	</div>

	<div
		class="flex flex-wrap items-center justify-between gap-2 border-t border-error/25 bg-error/10 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-hostile-fg"
	>
		<span>End of report</span>
		{#if !r.fresh}
			<span class="stamp" style="--stamp-tilt: -6deg">Superseded</span>
		{:else}
			<Badge tone="green" size="xs">Fresh</Badge>
		{/if}
	</div>
</article>

<style>
	/* A single declassifying scan passes over the report as it opens. */
	.intel-report::after {
		content: "";
		position: absolute;
		inset-inline: 0;
		top: 0;
		height: 2px;
		pointer-events: none;
		background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
		box-shadow: 0 0 12px color-mix(in oklab, var(--color-primary) 50%, transparent);
		animation: intel-decrypt 1.2s ease-in-out 1 forwards;
	}
	@keyframes intel-decrypt {
		from {
			transform: translateY(0);
			opacity: 0.8;
		}
		to {
			transform: translateY(420px);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.intel-report::after {
			display: none;
		}
	}
</style>
