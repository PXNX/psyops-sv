<!-- src/routes/(authenticated)/(dock)/region/[id]/GatherIntel.svelte -->
<!-- Tasking recon over a region: one card per sensor with its odds right now
     (what night, weather, ground cover and known air defence do to it), what
     a pass yields, and a 12-hour outlook to time the next pass. Posts the
     chosen sensor to ?/launchRecon. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { tick } from "svelte";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { Button, OddsRing } from "#lib/component/ui/index.js";
	import {
		COVER_FACTOR,
		COVER_LABEL,
		NIGHT_FACTOR,
		SENSORS,
		UNIT_CATEGORIES,
		WEATHER_FACTOR,
		WEATHER_LABEL,
		detectionChance,
		droneInterceptChance,
		regionConditions,
		type Cover,
		type SensorId,
		type UnitCategory,
		type Weather
	} from "#lib/config/index.js";
	import { countdown } from "#lib/utils/military.js";
	import IconRadar from "~icons/fluent/radar-20-regular";
	import IconSun from "~icons/fluent/weather-sunny-20-regular";
	import IconCloud from "~icons/fluent/weather-cloudy-20-regular";
	import IconRain from "~icons/fluent/weather-rain-20-regular";
	import IconFog from "~icons/fluent/weather-fog-20-regular";
	import IconMoon from "~icons/fluent/weather-moon-20-regular";
	import IconTree from "~icons/fluent/tree-deciduous-20-regular";
	import IconCity from "~icons/fluent/city-20-regular";
	import IconMountain from "~icons/fluent/mountain-location-bottom-20-regular";
	import IconField from "~icons/fluent/grid-dots-20-regular";
	import IconShield from "~icons/fluent/shield-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconTimer from "~icons/fluent/timer-20-regular";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconDrone from "~icons/mdi/quadcopter";
	import IconSatellite from "~icons/mdi/satellite-variant";

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
		regionId: number;
		longitude: number | null;
		terrain: string;
		conditions: { weather: Weather; night: boolean; cover: Cover };
		/** Air-defence units the latest pass reported; null when never seen. */
		airDefence: number | null;
		recon: {
			canTarget: boolean;
			targetReason: string | null;
			sensors: SensorOption[];
			inFlight: { id: number; sensor: string; completesAt: string }[];
		};
		walletBalance: number;
	}
	let { regionId, longitude, terrain, conditions, airDefence, recon, walletBalance }: Props = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	const CAT_LABEL: Record<UnitCategory, string> = {
		infantry: "Inf",
		vehicle: "Veh",
		artillery: "Arty",
		air: "Air"
	};
	const WEATHER_ICON = { clear: IconSun, cloudy: IconCloud, rain: IconRain, fog: IconFog };
	const COVER_ICON = { open: IconField, forest: IconTree, urban: IconCity, mountain: IconMountain };

	const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
	const intercept = $derived(airDefence ? droneInterceptChance(airDefence) : 0);

	/** A factor as a chip: what it does to the sensor's odds. */
	interface Effect {
		label: string;
		factor: number;
		icon: typeof IconSun;
		/** A risk to the platform rather than to the picture. */
		risk?: boolean;
	}

	const cards = $derived(
		recon.sensors.map((s) => {
			const id = s.id as SensorId;
			const cfg = SENSORS[id];
			const per = UNIT_CATEGORIES.map((c) => ({ c, p: detectionChance(id, c, conditions) }));
			const detect = mean(per.map((x) => x.p));
			const base = mean(UNIT_CATEGORIES.map((c) => cfg.base[c]));
			const drone = s.platform === "drone";
			const survive = drone ? 1 - intercept : 1;
			const effects: Effect[] = [];
			if (conditions.night && NIGHT_FACTOR[id] !== 1)
				effects.push({ label: "Night", factor: NIGHT_FACTOR[id], icon: IconMoon });
			if (WEATHER_FACTOR[id][conditions.weather] !== 1)
				effects.push({
					label: WEATHER_LABEL[conditions.weather],
					factor: WEATHER_FACTOR[id][conditions.weather],
					icon: WEATHER_ICON[conditions.weather]
				});
			const cover = COVER_FACTOR[cfg.kind][conditions.cover];
			if (cover !== 1)
				effects.push({ label: COVER_LABEL[conditions.cover], factor: cover, icon: COVER_ICON[conditions.cover] });
			if (drone && intercept > 0) effects.push({ label: "Air defence", factor: survive, icon: IconShield, risk: true });
			const yields = [
				cfg.identifiesTypes ? "Unit types" : "Counts",
				cfg.seesBuildings ? "Installations" : null,
				cfg.detectsFiring ? "Firing positions" : null
			].filter((x): x is string => !!x);
			const cooldown = s.cooldownEndsAt ? countdown(s.cooldownEndsAt, now) : null;
			const flying = recon.inFlight.filter((m) => m.sensor === s.id);
			const blocked = s.blockedReason ?? (walletBalance < s.cost ? "Not enough money" : null);
			return { ...s, per, odds: detect * survive, base, effects, yields, cooldown, flying, blocked, drone };
		})
	);

	// Default to the best sensor that can fly now.
	let sensor = $state<string | null>(null);
	const ready = $derived(cards.filter((c) => !c.blocked && !c.cooldown));
	const best = $derived(ready.length ? ready.reduce((a, b) => (b.odds > a.odds ? b : a)) : null);
	const chosen = $derived(cards.find((c) => c.id === (sensor ?? best?.id)) ?? null);

	// The next 12 hours in weather windows: when does each sensor see best?
	const outlook = $derived.by(() => {
		const slots = [];
		const start = new Date(now);
		start.setUTCMinutes(0, 0, 0);
		for (let k = 0; k < 12; k += 2) {
			const at = new Date(start.getTime() + k * 3600_000);
			const c = regionConditions({ id: regionId, longitude, terrain }, at);
			let top: { id: SensorId; p: number } | null = null;
			for (const s of recon.sensors) {
				const id = s.id as SensorId;
				const p =
					mean(UNIT_CATEGORIES.map((cat) => detectionChance(id, cat, c))) *
					(s.platform === "drone" ? 1 - intercept : 1);
				if (!top || p > top.p) top = { id, p };
			}
			slots.push({ at, c, top, k });
		}
		return slots;
	});
	const localTime = (at: Date) => {
		const h = (((at.getUTCHours() + at.getUTCMinutes() / 60 + (longitude ?? 0) / 15) % 24) + 24) % 24;
		return `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
	};

	let launching = $state(false);
	let panel: HTMLElement | undefined = $state();
	const pct = (p: number) => `${Math.round(p * 100)}%`;
	const factorText = (f: number) =>
		f === 0 ? "blind" : f > 1 ? `+${Math.round((f - 1) * 100)}%` : `−${Math.round((1 - f) * 100)}%`;
	const factorTone = (e: Effect) =>
		e.risk
			? "border-hostile/40 bg-hostile/10 text-hostile-fg"
			: e.factor > 1
				? "border-positive/40 bg-positive/10 text-positive-fg"
				: e.factor === 0
					? "border-hostile/40 bg-hostile/10 text-hostile-fg"
					: "border-warning/40 bg-warning/10 text-warning";
</script>

<section bind:this={panel} id="gather-intel" class="panel rounded-sm p-4 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title flex items-center gap-2"><IconRadar class="size-5 text-primary-fg" /> Gather intel</h2>
		<div class="flex flex-wrap items-center gap-1.5 text-xs">
			{#each [{ icon: conditions.night ? IconMoon : IconSun, text: `${localTime(now)} local · ${conditions.night ? "night" : "day"}` }, { icon: WEATHER_ICON[conditions.weather], text: WEATHER_LABEL[conditions.weather] }, { icon: COVER_ICON[conditions.cover], text: COVER_LABEL[conditions.cover] }] as chip (chip.text)}
				<span
					class="inline-flex items-center gap-1 rounded-full border border-line/20 bg-surface-4 px-2 py-0.5 text-fg-soft"
				>
					<chip.icon class="size-3.5 text-primary-fg" />{chip.text}
				</span>
			{/each}
			<span
				class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 {airDefence
					? 'border-hostile/40 bg-hostile/10 text-hostile-fg'
					: 'border-line/20 bg-surface-4 text-fg-soft'}"
				title="Air defence the latest pass reported. Drones can be shot down; satellites can't."
			>
				<IconShield class="size-3.5" />
				{airDefence == null
					? "AD unknown"
					: airDefence
						? `${airDefence} AD · drones ${pct(intercept)} risk`
						: "No AD seen"}
			</span>
		</div>
	</div>

	{#if !recon.canTarget}
		<p class="rounded-sm border border-line/15 bg-surface-4 px-3 py-2 text-sm text-fg-muted">
			{recon.targetReason ?? "Recon isn't available over this region."}
		</p>
	{:else}
		<form
			method="POST"
			action="?/launchRecon"
			class="space-y-3"
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
			<fieldset class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<legend class="sr-only">Sensor</legend>
				{#each cards as s (s.id)}
					{@const PlatformIcon = s.drone ? IconDrone : IconSatellite}
					{@const selected = chosen?.id === s.id}
					<label
						class="group relative flex cursor-pointer flex-col gap-2.5 rounded-sm border p-3 transition-colors {selected
							? 'border-primary/70 bg-primary/8'
							: 'border-line/20 bg-surface-2 hover:border-line/40'} {s.blocked ? 'opacity-55' : ''}"
					>
						<input
							type="radio"
							name="sensor"
							value={s.id}
							class="sr-only"
							checked={selected}
							disabled={!!s.blocked}
							onchange={() => (sensor = s.id)}
						/>
						<div class="flex items-start gap-3">
							<OddsRing value={s.odds} base={s.base} size={48} label="{s.label} odds now" textClass="text-xs" />
							<div class="min-w-0 flex-1">
								<p class="flex items-center gap-1.5 text-sm font-medium text-fg">
									<PlatformIcon class="size-4 shrink-0 text-primary-fg" />
									<span class="truncate">{s.label}</span>
								</p>
								<p class="mt-0.5 flex flex-wrap gap-1">
									{#each s.yields as y (y)}
										<span class="rounded-sm bg-surface-6 px-1.5 py-px text-[10px] text-fg-soft">{y}</span>
									{/each}
								</p>
							</div>
							{#if best?.id === s.id}
								<span
									class="shrink-0 rounded-full bg-positive/15 px-1.5 py-px text-[10px] font-medium text-positive-fg"
								>
									Best now
								</span>
							{/if}
						</div>

						<!-- Odds per unit category -->
						<div class="grid grid-cols-4 gap-1.5" aria-label="Detection odds by category">
							{#each s.per as { c, p } (c)}
								<div title="{CAT_LABEL[c]}: {pct(p)}">
									<div class="h-1 overflow-hidden rounded-full bg-surface-8">
										<div
											class="h-full rounded-full transition-[width] duration-500"
											style="width: {p * 100}%; background: {p >= 0.6
												? 'var(--color-positive)'
												: p >= 0.35
													? 'var(--color-warning)'
													: 'var(--color-hostile)'}"
										></div>
									</div>
									<p class="mt-0.5 flex justify-between font-mono text-[9px] text-fg-muted">
										<span>{CAT_LABEL[c]}</span><span>{Math.round(p * 100)}</span>
									</p>
								</div>
							{/each}
						</div>

						{#if s.effects.length}
							<div class="flex flex-wrap gap-1">
								{#each s.effects as e (e.label)}
									<span
										class="inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] {factorTone(e)}"
										title={e.risk
											? `Chance the drone survives: ${pct(e.factor)}`
											: `${e.label}: odds ${factorText(e.factor)}`}
									>
										<e.icon class="size-3" />{e.label}
										<span class="font-mono">{e.risk ? `${pct(1 - e.factor)} loss` : factorText(e.factor)}</span>
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-[10px] text-positive-fg">Ideal conditions</p>
						{/if}

						<div
							class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/10 pt-2 font-mono text-[11px] text-fg-muted"
						>
							<span class="inline-flex items-center gap-1">
								<IconWallet class="size-3.5" />${s.cost.toLocaleString()}
							</span>
							<span class="inline-flex items-center gap-1"><IconTimer class="size-3.5" />{s.durationMinutes} min</span>
							{#if s.cooldown}
								<span class="inline-flex items-center gap-1 text-warning">
									<IconClock class="size-3.5" />ready in {s.cooldown}
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1"
									title="Cooldown after a pass{s.cooldownScope === 'state' ? ', shared by your state' : ''}"
								>
									<IconClock class="size-3.5" />{s.cooldownMinutes >= 60
										? `${Math.round(s.cooldownMinutes / 60)} h`
										: `${s.cooldownMinutes} min`}{s.cooldownScope === "state" ? " · state" : ""}
								</span>
							{/if}
						</div>
						{#if s.blocked}<p class="text-[11px] text-hostile-fg">{s.blocked}</p>{/if}
						{#each s.flying as m (m.id)}
							<p class="flex items-center gap-1.5 text-[11px] text-primary-fg">
								<span class="size-1.5 animate-pulse rounded-full bg-primary"></span>
								En route · {countdown(m.completesAt, now) ?? "landing"}
							</p>
						{/each}
					</label>
				{/each}
			</fieldset>

			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="field-hint min-w-0 flex-1">
					{#if chosen}
						{chosen.label}: <span class="font-mono text-fg-soft">{pct(chosen.odds)}</span> average detection{chosen.drone &&
						intercept
							? `, with a ${pct(intercept)} chance of losing the drone`
							: ""}. The ring's tick marks clear-daylight odds over open ground.
					{:else}
						No sensor can fly right now.
					{/if}
				</p>
				<Button
					type="submit"
					size="sm"
					icon={IconRadar}
					loading={launching}
					disabled={!chosen || !!chosen.blocked || !!chosen.cooldown}
				>
					{chosen?.cooldown
						? `Ready in ${chosen.cooldown}`
						: chosen
							? `Launch ${chosen.short} · $${chosen.cost.toLocaleString()}`
							: "Launch"}
				</Button>
			</div>
		</form>
	{/if}

	<!-- When to fly: the next 12 hours -->
	<div class="border-t border-line/15 pt-3">
		<p class="mb-2 text-[10px] uppercase tracking-wide text-fg-muted">Outlook · next 12 hours</p>
		<ol class="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
			{#each outlook as slot (slot.k)}
				{@const Icon = slot.c.weather === "clear" ? (slot.c.night ? IconMoon : IconSun) : WEATHER_ICON[slot.c.weather]}
				<li
					class="flex flex-col items-center gap-1 rounded-sm border border-line/15 px-1 py-2 text-center {slot.c.night
						? 'bg-[#0f1420]'
						: 'bg-surface-2'}"
				>
					<span class="font-mono text-[10px] text-fg-muted">{slot.k === 0 ? "now" : localTime(slot.at)}</span>
					<Icon
						class="size-5 {slot.c.night
							? 'text-[#9fb3ff]'
							: slot.c.weather === 'clear'
								? 'text-warning'
								: 'text-fg-soft'}"
					/>
					<span class="text-[10px] text-fg-soft">{WEATHER_LABEL[slot.c.weather]}</span>
					{#if slot.top}
						<span class="font-mono text-[10px] text-primary-fg" title="Best sensor then">
							{SENSORS[slot.top.id].short}
							{Math.round(slot.top.p * 100)}%
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</section>
