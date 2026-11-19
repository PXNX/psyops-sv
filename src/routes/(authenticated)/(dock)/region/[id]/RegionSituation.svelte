<!-- src/routes/(authenticated)/(dock)/region/[id]/RegionSituation.svelte -->
<!-- The region as the viewer's side sees it: viewing conditions, own forces,
     hostile forces through fresh intel only (fog of war), and the recon
     tasking form. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { tick } from "svelte";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { Conditions, UnitBadge } from "#lib/component/tactical/index.js";
	import { UNIT_CATEGORIES, type Cover, type Weather } from "#lib/config/index.js";
	import { ageLabel, countdown } from "#lib/utils/military.js";
	import IconRadar from "~icons/fluent/radar-20-regular";
	import IconDocument from "~icons/fluent/document-search-20-regular";

	interface SensorOption {
		id: string;
		label: string;
		short: string;
		kind: string;
		platform: string;
		cost: number;
		durationMinutes: number;
		cooldownMinutes: number;
		cooldownScope: "user" | "state";
		cooldownEndsAt: string | null;
		blockedReason: string | null;
	}
	interface Props {
		situation: {
			conditions: { weather: Weather; night: boolean; cover: Cover };
			isHostileRegion: boolean;
			friendly: { unitType: string; count: number; mine: number }[];
			picture: {
				confidence: number;
				level: "none" | "low" | "medium" | "high";
				categories: Record<string, { coverage: number; count: number | null; estimated: boolean }>;
				unitTypes: { unitType: string; count: number; estimated: boolean }[] | null;
				firingPositions: { count: number; confidence: number } | null;
				sensors: { sensor: string }[];
				latestObservedAt: string | null;
			} | null;
			recon: {
				canTarget: boolean;
				targetReason: string | null;
				sensors: SensorOption[];
				inFlight: { id: number; sensor: string; completesAt: string }[];
			};
		};
		walletBalance: number;
		hasBattle: boolean;
	}

	let { situation, walletBalance, hasBattle }: Props = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let sensor = $state("drone_eo");
	let launching = $state(false);
	let panel: HTMLElement | undefined = $state();

	const chosen = $derived(situation.recon.sensors.find((s) => s.id === sensor));
	const chosenCooldown = $derived(chosen?.cooldownEndsAt ? countdown(chosen.cooldownEndsAt, now) : null);
	const pic = $derived(situation.picture);
	const showHostile = $derived(situation.isHostileRegion || hasBattle || !!pic);
	const levelTone = { none: "neutral", low: "amber", medium: "blue", high: "green" } as const;
	const LABEL: Record<string, string> = {
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
</script>

<section bind:this={panel} id="region-situation" class="panel rounded-sm p-4 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title">Situation</h2>
		<Conditions {...situation.conditions} />
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Own / friendly forces -->
		<div>
			<p class="mb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Friendly forces</p>
			{#if situation.friendly.length}
				<ul class="space-y-1">
					{#each situation.friendly as u (u.unitType)}
						<li class="flex items-center gap-2 text-sm">
							<UnitBadge affiliation="friend" unitType={u.unitType} count={u.count} size={18} />
							<span class="text-fg-soft">{LABEL[u.unitType] ?? u.unitType}</span>
							{#if u.mine}<span class="ml-auto font-mono text-[11px] text-friendly-fg">{u.mine} yours</span>{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-fg-muted">None stationed here.</p>
			{/if}
		</div>

		<!-- Hostile forces, through intel only -->
		{#if showHostile}
			<div>
				<div class="mb-1.5 flex items-center gap-2">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Hostile forces</p>
					{#if pic}
						<Badge tone={levelTone[pic.level]} size="xs">{pic.level} · {Math.round(pic.confidence * 100)}%</Badge>
						{#if pic.latestObservedAt}
							<span class="font-mono text-[11px] text-fg-muted"
								>{ageLabel(pic.latestObservedAt, now) === "now"
									? "just now"
									: `${ageLabel(pic.latestObservedAt, now)} ago`}</span
							>
						{/if}
					{/if}
				</div>
				{#if pic}
					<ul class="space-y-1">
						{#each UNIT_CATEGORIES as c}
							{@const cat = pic.categories[c]}
							<li class="flex items-center gap-2 text-sm">
								{#if cat.coverage === 0}
									<UnitBadge affiliation="unknown" size={18} />
									<span class="text-fg-muted">{LABEL[c]}</span>
									<span class="ml-auto font-mono text-[11px] text-fg-faint">not observed</span>
								{:else}
									<UnitBadge
										affiliation="hostile"
										unitType={c}
										count={cat.count ?? 0}
										estimated={cat.estimated}
										size={18}
									/>
									<span class="text-fg-soft">{LABEL[c]}</span>
									<span class="ml-auto font-mono text-[11px] text-fg-muted">{Math.round(cat.coverage * 100)}%</span>
								{/if}
							</li>
						{/each}
					</ul>
					{#if pic.firingPositions?.count}
						<p class="mt-1.5 text-xs text-hostile-fg">
							{pic.firingPositions.count} firing position{pic.firingPositions.count === 1 ? "" : "s"} located (thermal)
						</p>
					{/if}
				{:else}
					<div class="flex items-center gap-2 text-sm">
						<UnitBadge affiliation="unknown" size={18} />
						<span class="text-fg-muted">Unknown: no fresh intel on this region.</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Recon tasking -->
	{#if situation.recon.canTarget}
		<div class="border-t border-line/15 pt-3 space-y-2">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Task recon</p>
			<form
				method="POST"
				action="?/launchRecon"
				class="flex flex-col sm:flex-row gap-2"
				use:enhance={() => {
					launching = true;
					return async ({ result }) => {
						launching = false;
						toastResult(result);
						if (result.type === "success") {
							await invalidateAll();
							await tick();
							celebrate(panel);
						}
					};
				}}
			>
				<select name="sensor" bind:value={sensor} class="field-control rounded-sm px-3 py-2 text-sm flex-1 min-w-0">
					{#each situation.recon.sensors as s (s.id)}
						<option value={s.id} disabled={!!s.blockedReason}>
							{s.label} · ${s.cost.toLocaleString()} · {s.durationMinutes} min{s.blockedReason ? " (out of range)" : ""}
						</option>
					{/each}
				</select>
				<Button
					type="submit"
					size="sm"
					icon={IconRadar}
					loading={launching}
					disabled={!chosen || !!chosen.blockedReason || !!chosenCooldown || walletBalance < (chosen?.cost ?? 0)}
				>
					{chosenCooldown ? `Ready in ${chosenCooldown}` : "Launch"}
				</Button>
			</form>
			{#if chosen}
				<p class="field-hint">
					{#if chosen.platform === "drone"}Drones can be shot down by air defence; rain and fog blind them.
					{:else if chosen.platform === "satellite"}Satellites ignore air defence. {chosen.kind === "visual"
							? "Clouds and darkness block visual passes."
							: chosen.kind === "radar"
								? "Radar sees through clouds but barely picks up infantry."
								: "Thermal works at night and spots firing positions."} Revisit every {Math.round(
							chosen.cooldownMinutes / 60
						)} h for your state.
					{:else}Short-range radar from a neighbouring region: good on aircraft and vehicles.{/if}
				</p>
			{/if}
			{#if situation.recon.inFlight.length}
				<ul class="text-xs text-fg-soft font-mono space-y-0.5">
					{#each situation.recon.inFlight as m (m.id)}
						<li>
							{situation.recon.sensors.find((s) => s.id === m.sensor)?.short ?? m.sensor} en route · {countdown(
								m.completesAt,
								now
							) ?? "landing"}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<div class="flex justify-end">
		<Button href="/intel" variant="ghost" size="xs" icon={IconDocument}>Intel reports</Button>
	</div>
</section>
