<!-- src/lib/component/strike/IhlRecord.svelte -->
<!-- A state's public international humanitarian law record: its standing
     badge and score, what that standing costs it, and its recent violations. -->
<script lang="ts">
	import type { IhlRecord } from "#lib/server/services/military/ihl.js";
	import { Badge } from "#lib/component/ui/index.js";
	import { IHL_HALF_LIFE_DAYS, IHL_STANDINGS } from "#lib/config/index.js";
	import { dtg } from "#lib/utils/military.js";
	import { getRegionName } from "#lib/utils/formatting.js";
	import IconScales from "~icons/fluent/scales-20-regular";

	let { record }: { record: IhlRecord } = $props();

	const TONE = { compliant: "green", concerns: "amber", violator: "orange", pariah: "red" } as const;
	const SEVERITY = ["", "Minor", "Serious", "Grave"];
	const next = $derived([...IHL_STANDINGS].reverse().find((s) => s.from > record.score) ?? null);
	const pct = (f: number) => Math.round(Math.abs(1 - f) * 100);
</script>

<section class="panel rounded-sm p-4 space-y-3" id="ihl-record">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title"><IconScales class="size-4" /> IHL record</h2>
		<Badge tone={TONE[record.standing]} icon={IconScales}>{record.label}</Badge>
	</div>

	<div class="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line/15 bg-line/12">
		<div class="bg-surface-2 px-3 py-2">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Score</p>
			<p class="data text-lg font-bold text-fg">{record.score.toFixed(record.score < 10 ? 1 : 0)}</p>
		</div>
		<div class="bg-surface-2 px-3 py-2">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Strikes ordered</p>
			<p class="data text-lg font-bold text-fg">{record.totals.strikes}</p>
		</div>
		<div class="bg-surface-2 px-3 py-2">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Civilians killed</p>
			<p class="data text-lg font-bold {record.totals.civilianCasualties ? 'text-hostile-fg' : 'text-fg'}">
				{record.totals.civilianCasualties.toLocaleString("en-US")}
			</p>
		</div>
	</div>

	<p class="text-sm text-fg-soft">{record.blurb}</p>

	{#if record.score >= 1}
		<ul class="text-xs text-fg-muted space-y-0.5">
			{#if record.moraleFactor < 1}<li>
					Troop morale <span class="data text-hostile-fg">−{pct(record.moraleFactor)}%</span> in battle
				</li>{/if}
			{#if record.embargoFactor > 1}<li>
					Arms embargo: strikes cost <span class="data text-hostile-fg">+{pct(record.embargoFactor)}%</span>
				</li>{/if}
			{#if record.easyExpulsion}<li>Its bloc can expel it with a third of the votes</li>{/if}
			<li>
				Violations fade by half every {IHL_HALF_LIFE_DAYS} days{next
					? `; ${next.label.toLowerCase()} from ${next.from}`
					: ""}.
			</li>
		</ul>
	{/if}

	{#if record.violations.length}
		<ol class="divide-y divide-line/10 border-t border-line/15">
			{#each record.violations as v (v.id)}
				<li class="pt-2 pb-2 last:pb-0 text-sm">
					<div class="flex flex-wrap items-center gap-2">
						<Badge tone={v.severity >= 3 ? "red" : v.severity === 2 ? "orange" : "amber"} size="xs"
							>{SEVERITY[v.severity] ?? ""}</Badge
						>
						<span class="text-fg">{v.kindLabel}</span>
						{#if v.regionId}
							<a href="/region/{v.regionId}" class="text-fg-soft hover:text-primary-hover"
								>{getRegionName(v.regionId)}</a
							>
						{/if}
						{#if v.victimStateName}<span class="text-fg-muted">({v.victimStateName})</span>{/if}
						<span class="ml-auto data text-[11px] text-fg-muted">{dtg(v.createdAt)}</span>
					</div>
					<p class="mt-0.5 text-xs text-fg-muted">
						{v.reason}
						{#if v.casualties}<span class="text-hostile-fg">{v.casualties} civilians killed.</span>{/if}
						<span class="data text-fg-faint">+{v.points} pts</span>
					</p>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="text-sm text-fg-muted">No violations on record.</p>
	{/if}
</section>
