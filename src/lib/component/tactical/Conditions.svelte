<!-- src/lib/component/tactical/Conditions.svelte -->
<!-- Current weather, daylight and ground cover over a region, as a compact
     row of icons with labels (what recon has to see through). -->
<script lang="ts">
	import IconSun from "~icons/fluent/weather-sunny-20-regular";
	import IconCloud from "~icons/fluent/weather-cloudy-20-regular";
	import IconRain from "~icons/fluent/weather-rain-20-regular";
	import IconFog from "~icons/fluent/weather-fog-20-regular";
	import IconMoon from "~icons/fluent/weather-moon-20-regular";
	import IconTree from "~icons/fluent/tree-deciduous-20-regular";
	import IconCity from "~icons/fluent/city-20-regular";
	import IconMountain from "~icons/fluent/mountain-location-bottom-20-regular";
	import IconField from "~icons/fluent/grid-dots-20-regular";
	import { COVER_LABEL, WEATHER_LABEL, type Cover, type Weather } from "#lib/config/index.js";

	interface Props {
		weather: Weather;
		night: boolean;
		cover: Cover;
		/** Stack vertically with longer labels. */
		compact?: boolean;
		class?: string;
	}

	let { weather, night, cover, compact = false, class: className = "" }: Props = $props();

	const WeatherIcon = $derived(
		{ clear: night ? IconMoon : IconSun, cloudy: IconCloud, rain: IconRain, fog: IconFog }[weather]
	);
	const CoverIcon = $derived({ open: IconField, forest: IconTree, urban: IconCity, mountain: IconMountain }[cover]);
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-soft {className}">
	<span class="inline-flex items-center gap-1" title="Weather">
		<WeatherIcon class="size-4 text-primary-fg" />
		{WEATHER_LABEL[weather]}{#if night}<span class="text-fg-muted">· night</span>{/if}
	</span>
	<span class="inline-flex items-center gap-1" title="Ground cover">
		<CoverIcon class="size-4 text-primary-fg" />
		{COVER_LABEL[cover]}
	</span>
	{#if !compact}
		<span class="font-mono text-[10px] uppercase tracking-wide text-fg-muted">
			{weather === "cloudy" || weather === "rain" ? "EO sat blocked" : night ? "EO degraded" : "EO clear"}
		</span>
	{/if}
</div>
