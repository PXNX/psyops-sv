<!-- src/lib/component/strike/StrikeLog.svelte -->
<!-- Strikes as a terse operations log: date-time group, who struck what with
     which weapon, the outcome, damage, civilian casualties and any IHL
     violation it was recorded as. Used on region, battle and war pages. -->
<script lang="ts">
	import type { StrikeLogEntry } from "#lib/server/services/military/strike.js";
	import { Badge } from "#lib/component/ui/index.js";
	import {
		EFFECT_LABEL,
		IHL_KIND_LABEL,
		TARGETS,
		WEAPONS,
		type IhlKind,
		type StrikeEffectKind
	} from "#lib/config/index.js";
	import { dtg } from "#lib/utils/military.js";
	import { getRegionName } from "#lib/utils/formatting.js";

	interface Props {
		entries: StrikeLogEntry[];
		/** Show which region was struck (off on a region's own page). */
		showRegion?: boolean;
		empty?: string;
	}

	let { entries, showRegion = true, empty = "No strikes recorded." }: Props = $props();

	const OUTCOME = {
		hit: { label: "Hit", tone: "red" },
		partial: { label: "Partial hit", tone: "orange" },
		miss: { label: "Missed", tone: "neutral" },
		intercepted: { label: "Intercepted", tone: "blue" }
	} as const;
	const STAT_LABEL: Record<string, string> = {
		economy: "power",
		infrastructure: "infrastructure",
		fortifications: "fortifications",
		hospitals: "hospitals"
	};

	function damageLine(e: StrikeLogEntry): string[] {
		const out: string[] = [];
		for (const [stat, n] of Object.entries(e.damage.levels ?? {})) {
			if (n) out.push(`−${n} ${STAT_LABEL[stat] ?? stat}`);
		}
		if (e.damage.effect) {
			out.push(
				`${EFFECT_LABEL[e.damage.effect.kind as StrikeEffectKind] ?? e.damage.effect.kind} −${Math.round(e.damage.effect.magnitude * 100)}%`
			);
		}
		for (const u of e.damage.units ?? []) out.push(`${u.name} −${u.damage}${u.destroyed ? " (destroyed)" : ""}`);
		if (e.damage.aircraftLost) out.push(`${e.damage.aircraftLost.name} hit (−${e.damage.aircraftLost.damage})`);
		if (e.damage.reparations) out.push(`$${e.damage.reparations.toLocaleString("en-US")} reparations paid`);
		return out;
	}
</script>

{#if entries.length === 0}
	<p class="text-sm text-fg-muted">{empty}</p>
{:else}
	<ol class="divide-y divide-line/10">
		{#each entries as e (e.id)}
			{@const o = OUTCOME[e.outcome]}
			{@const dmg = damageLine(e)}
			<li class="py-2.5 first:pt-0 last:pb-0" id="strike-{e.id}">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					<span class="data text-[11px] text-fg-muted">{dtg(e.createdAt)}</span>
					<a href="/state/{e.attackerStateId}" class="font-semibold text-hostile-fg hover:underline"
						>{e.attackerStateName ?? "Unknown"}</a
					>
					<span class="text-fg-muted">→</span>
					<span class="text-fg">{TARGETS[e.target]?.label ?? e.target}</span>
					{#if showRegion}
						<a href="/region/{e.regionId}" class="text-fg-soft hover:text-primary-hover"
							>· {getRegionName(e.regionId)}</a
						>
					{/if}
					<Badge tone={o.tone} size="xs">{o.label}</Badge>
					{#if e.protectedTarget}<Badge tone="red" size="xs">Protected</Badge>{/if}
				</div>
				<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
					<span>{WEAPONS[e.weapon]?.label ?? e.weapon} · {e.tier}</span>
					<span class="data">hit {e.accuracy}% · AD {e.interceptChance}% · intel {e.intelConfidence}%</span>
					<span class="data {e.civilianCasualties ? 'text-hostile-fg' : ''}">
						{e.civilianCasualties.toLocaleString("en-US")} civilian{e.civilianCasualties === 1 ? "" : "s"} killed
						<span class="text-fg-faint">(expected {e.expectedCasualties})</span>
					</span>
				</div>
				{#if dmg.length}
					<p class="mt-0.5 text-xs text-fg-soft">{dmg.join(" · ")}</p>
				{/if}
				{#if e.violations.length}
					<div class="mt-1 flex flex-wrap gap-1">
						{#each e.violations as v (v.kind)}
							<Badge tone={v.severity >= 3 ? "red" : v.severity === 2 ? "orange" : "amber"} size="xs">
								⚖ {IHL_KIND_LABEL[v.kind as IhlKind] ?? v.kind}
							</Badge>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
