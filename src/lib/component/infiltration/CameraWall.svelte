<!-- src/lib/component/infiltration/CameraWall.svelte -->
<!-- Every camera of a tapped site on one wall: a grid of feeds, or one feed
     blown up with a pan-tilt-zoom head, a fisheye lens and night/thermal
     modes. Purely a viewer: tapping the cameras happens on the server. -->
<script lang="ts">
	import { cameraAccess, type Site } from "#lib/config/index.js";
	import CameraFeed from "./CameraFeed.svelte";
	import { CAM_MODES, CAM_VIEWS, type CamLens, type CamMode, type CamView } from "./camera-views";

	interface Props {
		site: Site;
		observedAt?: string;
		/** Green-on-black styling for the terminal. */
		terminal?: boolean;
		/** Hosts the operator holds inside the site; the recorder unlocks the inside feeds. */
		owned?: string[];
	}
	let { site, observedAt, terminal = false, owned = [] }: Props = $props();
	const open = (v: CamView) => cameraAccess(v, { owned });

	let layout = $state<"grid" | "single">("grid");
	let view = $state<CamView>("main");
	let mode = $state<CamMode>("day");
	let lens = $state<CamLens>("wide");
	let pan = $state(0);

	function focus(v: CamView) {
		if (!open(v)) return;
		view = v;
		layout = "single";
	}
	// A view that's no longer available (a new session) falls back to the overview.
	$effect(() => {
		if (!open(view)) view = "main";
	});
	const nudge = (d: number) => (pan = Math.max(-1, Math.min(1, Math.round((pan + d) * 10) / 10)));
	const label = (v: CamView) => CAM_VIEWS.find((c) => c.id === v)?.label ?? v;

	const chip = $derived(
		terminal
			? "border border-[#1f6f3a] px-2 py-1 text-[11px] uppercase tracking-wider text-[#7dffa0] hover:bg-[#0f3a1f] aria-pressed:bg-[#1f6f3a] aria-pressed:text-black"
			: "rounded-sm border border-line/25 px-2 py-1 text-[11px] text-fg-soft hover:border-primary/60 aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-fg"
	);
</script>

<div class="space-y-2">
	<div class="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Camera controls">
		<button type="button" class={chip} aria-pressed={layout === "grid"} onclick={() => (layout = "grid")}>
			▦ Grid
		</button>
		<button type="button" class={chip} aria-pressed={layout === "single"} onclick={() => (layout = "single")}>
			▣ Single
		</button>
		<span class="mx-1 h-4 w-px bg-current opacity-20" aria-hidden="true"></span>
		{#each CAM_MODES as m (m.id)}
			<button type="button" class={chip} aria-pressed={mode === m.id} onclick={() => (mode = m.id)}>{m.label}</button>
		{/each}
		<span class="mx-1 h-4 w-px bg-current opacity-20" aria-hidden="true"></span>
		<button
			type="button"
			class={chip}
			aria-pressed={lens === "fisheye"}
			onclick={() => (lens = lens === "fisheye" ? "wide" : "fisheye")}
		>
			◉ Fisheye
		</button>
	</div>

	{#if layout === "grid"}
		<div class="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
			{#each CAM_VIEWS as cam (cam.id)}
				<button
					type="button"
					class="group relative block text-left disabled:cursor-not-allowed"
					onclick={() => focus(cam.id)}
					disabled={!open(cam.id)}
					aria-label={open(cam.id) ? `Open ${cam.label} camera` : `${cam.label} camera: no signal`}
				>
					{#if open(cam.id)}
						<CameraFeed {site} {observedAt} view={cam.id} {mode} {lens} compact />
					{:else}
						<div
							class="static-noise flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 rounded-sm border border-line/30 bg-[#050806] px-2 text-center font-mono text-[10px] tracking-wider text-[#7d9a86] uppercase"
						>
							<span class="text-[#ff8b80]">● no signal</span>
							<span>own the video recorder · <code class="normal-case">hop cams</code></span>
						</div>
					{/if}
					<span
						class="pointer-events-none absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-[#b9d8c4] uppercase group-hover:text-white"
					>
						{cam.label}
					</span>
				</button>
			{/each}
		</div>
	{:else}
		<div class="flex flex-wrap gap-1.5">
			{#each CAM_VIEWS as cam (cam.id)}
				<button
					type="button"
					class="{chip} disabled:opacity-40"
					aria-pressed={view === cam.id}
					disabled={!open(cam.id)}
					title={open(cam.id) ? undefined : "Own the video recorder host first"}
					onclick={() => (view = cam.id)}
				>
					{cam.label}
				</button>
			{/each}
		</div>
		<CameraFeed {site} {observedAt} {view} {mode} {lens} {pan} label="{label(view).toUpperCase()} · {site.name}" />
		<div class="flex items-center justify-center gap-2" role="group" aria-label="Pan the camera">
			<button type="button" class={chip} onclick={() => nudge(-0.5)} disabled={pan <= -1} aria-label="Pan left">
				◀ Pan
			</button>
			<button type="button" class={chip} onclick={() => (pan = 0)} aria-label="Centre the camera">● Home</button>
			<button type="button" class={chip} onclick={() => nudge(0.5)} disabled={pan >= 1} aria-label="Pan right">
				Pan ▶
			</button>
		</div>
	{/if}
</div>

<style>
	.static-noise {
		background-image: repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0 1px, rgba(0, 0, 0, 0) 1px 3px);
	}
</style>
