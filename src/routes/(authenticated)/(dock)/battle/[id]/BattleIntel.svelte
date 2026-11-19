<!-- src/routes/(authenticated)/(dock)/battle/[id]/BattleIntel.svelte -->
<!-- Intel and targeting per side: which sensors have looked at the battle
     region, how much of the enemy they could see, and what that does to the
     side's fire this round (the battle job uses the same numbers). -->
<script lang="ts">
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { SENSORS, UNIT_CATEGORIES, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import IconRadar from "~icons/fluent/radar-20-regular";

	interface Panel {
		modifiers: {
			confidence: number;
			general: number;
			indirect: number;
			airStrike: number;
			counterBattery: number;
			enemyAirDefence: number;
		};
		level: "none" | "low" | "medium" | "high";
		coverage: Record<string, number> | null;
		firingPositions: { count: number; confidence: number } | null;
		sensors: {
			reportId: number;
			sensor: string;
			outcome: string;
			observedAt: string;
			weight: number;
			confidence: number;
		}[];
	}
	interface Props {
		attacker: Panel & { name: string };
		defender: Panel & { name: string };
		regionId: number;
		/** The viewer's side in this battle, if any (offers recon). */
		mySide: "attacker" | "defender" | null;
		ended: boolean;
	}

	let { attacker, defender, regionId, mySide, ended }: Props = $props();

	const levelTone = { none: "red", low: "amber", medium: "blue", high: "green" } as const;
	const CAT: Record<string, string> = { infantry: "INF", vehicle: "VEH", artillery: "ART", air: "AIR" };
	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const mult = (n: number) => `×${n.toFixed(2)}`;
	const now = new Date();
</script>

{#snippet column(side: "attacker" | "defender", p: Panel & { name: string }, enemy: Panel)}
	<div class="space-y-3 min-w-0">
		<div class="flex items-center gap-2">
			<span class="size-2 shrink-0 {side === 'attacker' ? 'bg-error' : 'bg-secondary'}"></span>
			<h3 class="text-sm font-semibold text-fg truncate">{p.name}</h3>
			<Badge tone={levelTone[p.level]} size="xs" class="ml-auto">
				{p.level === "none" ? "BLIND" : p.level.toUpperCase()} · {pct(p.modifiers.confidence)}
			</Badge>
		</div>

		<!-- Coverage of the enemy by category -->
		<div class="grid grid-cols-4 gap-1">
			{#each UNIT_CATEGORIES as c}
				{@const v = p.coverage?.[c] ?? 0}
				<div class="rounded-sm border border-line/15 bg-surface-2 px-1.5 py-1 text-center">
					<p class="font-mono text-[10px] text-fg-muted">{CAT[c]}</p>
					<p class="font-mono text-xs {v ? 'text-fg' : 'text-fg-faint'}">{v ? pct(v) : "—"}</p>
				</div>
			{/each}
		</div>

		<!-- Sensors that contributed -->
		{#if p.sensors.length}
			<ul class="space-y-0.5 font-mono text-[11px]">
				{#each p.sensors as s (s.reportId)}
					<li class="flex items-center gap-2">
						<span class="w-16 text-primary-fg">{SENSORS[s.sensor as SensorId]?.short ?? s.sensor}</span>
						<span
							class={s.outcome === "ok"
								? "text-fg-soft"
								: s.outcome === "intercepted"
									? "text-hostile-fg"
									: "text-warning"}
						>
							{s.outcome === "ok" ? `saw ${pct(s.confidence)}` : s.outcome === "intercepted" ? "shot down" : "obscured"}
						</span>
						<span class="ml-auto text-fg-muted">{ageLabel(s.observedAt, now)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-xs text-fg-muted">No fresh recon over the battle area.</p>
		{/if}

		<!-- Resulting modifiers -->
		<dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs border-t border-line/15 pt-2">
			<dt class="text-fg-muted">All units</dt>
			<dd class="font-mono text-right {p.modifiers.general >= 1 ? 'text-positive-fg' : 'text-hostile-fg'}">
				{mult(p.modifiers.general)}
			</dd>
			<dt class="text-fg-muted">Artillery &amp; air targeting</dt>
			<dd class="font-mono text-right {p.modifiers.indirect >= 0.95 ? 'text-fg-soft' : 'text-hostile-fg'}">
				{mult(p.modifiers.indirect)}
			</dd>
			<dt class="text-fg-muted">
				Air strikes vs AD{p.modifiers.enemyAirDefence ? ` (${p.modifiers.enemyAirDefence} AA)` : ""}
			</dt>
			<dd class="font-mono text-right {p.modifiers.airStrike < 1 ? 'text-hostile-fg' : 'text-fg-soft'}">
				{mult(p.modifiers.airStrike)}
			</dd>
			<dt class="text-fg-muted">
				Counter-battery{p.firingPositions?.count ? ` (${p.firingPositions.count} positions)` : ""}
			</dt>
			<dd class="font-mono text-right {p.modifiers.counterBattery ? 'text-positive-fg' : 'text-fg-faint'}">
				{p.modifiers.counterBattery ? `−${pct(p.modifiers.counterBattery)} enemy ART` : "none"}
			</dd>
			{#if enemy.modifiers.counterBattery}
				<dt class="text-fg-muted">Own artillery under counter-fire</dt>
				<dd class="font-mono text-right text-hostile-fg">−{pct(enemy.modifiers.counterBattery)}</dd>
			{/if}
		</dl>
	</div>
{/snippet}

<section class="panel rounded-sm p-4 space-y-4" id="battle-intel">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title">Intel &amp; targeting</h2>
		{#if mySide && !ended}
			<Button href="/region/{regionId}#region-situation" size="xs" variant="secondary" icon={IconRadar}>
				Task recon
			</Button>
		{/if}
	</div>
	<div class="grid gap-5 sm:grid-cols-2">
		{@render column("attacker", attacker, defender)}
		{@render column("defender", defender, attacker)}
	</div>
	<p class="field-hint">
		Fresh recon on the enemy sharpens fire: artillery and air strikes need targeting data to hit at full strength,
		thermal fixes on firing positions enable counter-battery, and air defence blunts air strikes. Intel goes stale after
		24 h.
	</p>
</section>
