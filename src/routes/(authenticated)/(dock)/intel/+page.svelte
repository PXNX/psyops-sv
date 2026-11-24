<!-- src/routes/(authenticated)/(dock)/intel/+page.svelte -->
<!-- J2 console: key figures, the regions under watch with their fused
     picture, the recon imagery and the report archive; passes in flight and
     the sensor table sit in the side rail. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { ImageryGallery, type ImageryItem } from "#lib/component/recon/index.js";
	import { toImageryInput } from "#lib/utils/sensor-image.js";
	import { SENSORS, type SensorId } from "#lib/config/index.js";
	import { countdown } from "#lib/utils/military.js";
	import { countUp } from "#lib/utils/count-up.js";
	import IconRadar from "~icons/fluent/radar-20-regular";
	import IconEye from "~icons/fluent/eye-20-regular";
	import IconImage from "~icons/fluent/image-multiple-20-regular";
	import IconArchive from "~icons/fluent/archive-20-regular";
	import IconSend from "~icons/fluent/send-20-regular";
	import IconNetwork from "~icons/fluent/plug-connected-20-regular";
	import RegionWatch from "./RegionWatch.svelte";
	import ReportArchive from "./ReportArchive.svelte";
	import { LEVEL_LABEL, pct } from "./labels";

	const { data } = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let showStale = $state(true);
	const reports = $derived(showStale ? data.reports : data.reports.filter((r) => r.fresh));
	// Recon frames, newest first: every pass that returned a picture.
	const imagery: ImageryItem[] = $derived(
		reports.map((r) => ({
			input: toImageryInput({ ...r, regionId: r.region.id }, r.imagery),
			fresh: r.fresh,
			regionName: r.region.name
		}))
	);
	let gallery: ImageryGallery | undefined = $state();

	const freshCount = $derived(data.reports.filter((r) => r.fresh).length);
	const avgConfidence = $derived(
		data.pictures.length ? data.pictures.reduce((s, p) => s + p.picture.confidence, 0) / data.pictures.length : 0
	);
	const avgLevel = $derived(
		avgConfidence >= 0.75 ? "high" : avgConfidence >= 0.5 ? "medium" : avgConfidence >= 0.25 ? "low" : "none"
	);
	const hostiles = $derived(data.pictures.reduce((s, p) => s + p.picture.knownUnits, 0));
	const hostileRegions = $derived(data.pictures.filter((p) => p.picture.knownUnits > 0).length);
	// Hostile regions where a deeper spy network would add installations and exact types.
	const shallow = $derived(data.pictures.filter((p) => !p.own && p.depth < 3).length);

	const sensorShort = (s: string) => SENSORS[s as SensorId]?.short ?? s;
</script>

<svelte:head>
	<title>Intelligence · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
		<div class="min-w-0">
			<p class="section-title">J2 · Intelligence</p>
			<h1 class="mt-0.5 text-2xl font-semibold text-fg">Intelligence</h1>
			{#if data.side}
				<p class="text-sm text-fg-muted">
					Shared with {data.side.stateName}{data.side.partners
						? ` and ${data.side.partners} bloc partner${data.side.partners === 1 ? "" : "s"}`
						: ""} · reports stay fresh for 24 h
				</p>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button href="/map" size="sm" icon={IconSend} title="Pick a hostile region on the map to launch a pass">
				Order recon
			</Button>
		</div>
	</header>

	{#if !data.side}
		<section class="panel flex flex-wrap items-center justify-between gap-3 p-5">
			<p class="text-sm text-fg-muted">You need to live in a state to receive intelligence.</p>
			<Button href="/map" variant="secondary" size="sm">Open the map</Button>
		</section>
	{:else}
		<!-- Status strip -->
		<section
			class="panel grid grid-cols-2 divide-line/15 sm:grid-cols-4 sm:divide-x [&>div]:px-4 [&>div]:py-3"
			aria-label="Intelligence status"
		>
			<div>
				<p class="section-title">Fresh reports</p>
				{#key freshCount}<p class="data text-2xl text-fg" use:countUp={freshCount}>{freshCount}</p>{/key}
				<p class="text-[11px] text-fg-faint">of {data.reports.length} archived</p>
			</div>
			<div>
				<p class="section-title">Regions watched</p>
				{#key data.pictures.length}<p class="data text-2xl text-fg" use:countUp={data.pictures.length}>
						{data.pictures.length}
					</p>{/key}
				<p class="text-[11px] text-fg-faint">
					{data.inFlight.length
						? `${data.inFlight.length} pass${data.inFlight.length === 1 ? "" : "es"} en route`
						: "no pass en route"}
				</p>
			</div>
			<div>
				<p class="section-title">Avg confidence</p>
				<p class="data text-2xl text-fg">{data.pictures.length ? pct(avgConfidence) : "—"}</p>
				<p class="text-[11px] text-fg-faint">{data.pictures.length ? LEVEL_LABEL[avgLevel] : "no fresh picture"}</p>
			</div>
			<div>
				<p class="section-title">Hostile contacts</p>
				{#key hostiles}<p class="data text-2xl {hostiles ? 'text-hostile-fg' : 'text-fg'}" use:countUp={hostiles}>
						{hostiles}
					</p>{/key}
				<p class="text-[11px] text-fg-faint">
					{hostileRegions ? `in ${hostileRegions} region${hostileRegions === 1 ? "" : "s"}` : "none seen"}
				</p>
			</div>
		</section>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
			<!-- Main work area -->
			<div class="min-w-0 space-y-4">
				<section class="panel px-4 pt-3 pb-1">
					<h2 class="section-title"><IconEye class="size-4 text-primary-fg" /> Regions under watch</h2>
					{#if data.pictures.length}
						<RegionWatch pictures={data.pictures} {now} />
					{:else}
						<div class="flex flex-wrap items-center justify-between gap-3 py-4">
							<p class="text-sm text-fg-muted">No fresh passes — pick a hostile region and send a sensor.</p>
							<Button href="/map" size="sm" variant="secondary" icon={IconSend}>Order recon</Button>
						</div>
					{/if}
				</section>

				{#if imagery.length}
					<section class="panel p-4">
						<h2 class="section-title mb-3">
							<IconImage class="size-4 text-primary-fg" /> Imagery
							<span class="data font-normal text-fg-faint">{imagery.length}</span>
						</h2>
						<ImageryGallery bind:this={gallery} items={imagery} {now} />
					</section>
				{/if}

				<section class="panel px-4 pt-3 pb-2">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h2 class="section-title">
							<IconArchive class="size-4 text-primary-fg" /> Report archive
							<span class="data font-normal text-fg-faint">{reports.length}</span>
						</h2>
						<label class="flex items-center gap-2 text-xs text-fg-muted">
							<input type="checkbox" class="checkbox checkbox-xs" bind:checked={showStale} /> Show stale
						</label>
					</div>
					{#if reports.length}
						<div class="mt-2">
							<ReportArchive {reports} {now} onImagery={(id) => gallery?.show(id)} />
						</div>
					{:else}
						<p class="py-4 text-sm text-fg-muted">
							{data.reports.length ? "No fresh reports — tick “Show stale” for older ones." : "No reports filed yet."}
						</p>
					{/if}
				</section>
			</div>

			<!-- Side rail -->
			<aside class="space-y-4">
				<section class="panel p-4">
					<h2 class="section-title mb-2"><IconRadar class="size-4 text-primary-fg" /> En route</h2>
					{#if data.inFlight.length}
						<ul class="divide-y divide-line/15">
							{#each data.inFlight as m (m.id)}
								{@const eta = countdown(m.completesAt, now)}
								<li class="flex items-center gap-2 py-2 text-sm">
									<span class="relative flex size-2 shrink-0" aria-hidden="true">
										<span class="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping"></span>
										<span class="relative size-2 rounded-full bg-primary"></span>
									</span>
									<span class="min-w-0 flex-1">
										<a href="/region/{m.region.id}" class="block truncate font-medium text-fg hover:text-primary-fg">
											{m.region.name}
										</a>
										<span class="data text-[11px] text-fg-faint">{sensorShort(m.sensor)}</span>
									</span>
									<span class="data shrink-0 text-xs text-fg-soft">{eta ? `ETA ${eta}` : "landing…"}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-xs text-fg-muted">No passes in flight.</p>
						<a href="/map" class="mt-1 inline-block text-xs text-primary-fg hover:underline">Order one on the map</a>
					{/if}
				</section>

				{#if shallow}
					<section class="panel p-4">
						<h2 class="section-title mb-1.5"><IconNetwork class="size-4 text-primary-fg" /> Spy network</h2>
						<p class="text-xs text-fg-muted">
							{shallow} watched region{shallow === 1 ? "" : "s"} without a deep network: installations and exact unit types
							stay hidden.
						</p>
						<a href="/ops/network" class="mt-1 inline-block text-xs text-primary-fg hover:underline">Build footholds</a>
					</section>
				{/if}
			</aside>
		</div>
	{/if}
</PageContainer>
