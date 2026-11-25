<!-- src/lib/component/infiltration/CameraWall.svelte -->
<!-- The site's cameras on one wall: a grid of feeds, or one feed blown up with
     a pan-tilt-zoom head, a fisheye lens and IR/thermal modes. Nothing shows
     until the server says the operator has earned it: before the pivot the
     wall is dark, after it the operator sees how many channels the recorder
     has, and only holding the recorder host brings up the pictures. -->
<script lang="ts">
	import type { Site, SystemsView } from "#lib/config/index.js";
	import CameraFeed from "./CameraFeed.svelte";
	import { CAM_MODES, type CamLens, type CamMode } from "./cctv-scenes";

	interface Props {
		site: Pick<Site, "seed" | "code" | "name">;
		/** What this session has unlocked, decided on the server; null without a session. */
		systems: SystemsView | null | undefined;
		/** Green-on-black styling for the terminal. */
		terminal?: boolean;
	}
	let { site, systems, terminal = false }: Props = $props();

	const cameras = $derived(systems?.cameras ?? []);
	let layout = $state<"grid" | "single">("grid");
	let pick = $state<string | null>(null);
	let mode = $state<CamMode>("auto");
	let lens = $state<CamLens>("wide");
	let pan = $state(0);
	const current = $derived(cameras.find((c) => c.id === pick) ?? cameras[0] ?? null);

	function focus(id: string) {
		pick = id;
		layout = "single";
		pan = 0;
	}
	const nudge = (d: number) => (pan = Math.max(-1, Math.min(1, Math.round((pan + d) * 10) / 10)));

	const chip = $derived(
		terminal
			? "border border-[#1f6f3a] px-2 py-1 text-[11px] uppercase tracking-wider text-[#7dffa0] hover:bg-[#0f3a1f] aria-pressed:bg-[#1f6f3a] aria-pressed:text-black disabled:opacity-40"
			: "rounded-sm border border-line/25 px-2 py-1 text-[11px] text-fg-soft hover:border-primary/60 aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:text-fg disabled:opacity-40"
	);
	const dark =
		"static-noise flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 rounded-sm border border-line/30 bg-[#050806] px-3 text-center font-mono text-[10px] tracking-wider text-[#7d9a86] uppercase";
</script>

{#snippet locked(title: string, hint: string)}
	<div class={dark}>
		<span class="text-[#ff8b80]">● {title}</span>
		<span>{hint}</span>
	</div>
{/snippet}

<div class="space-y-2">
	{#if !systems?.mapped}
		<div class="max-w-md">
			{@render locked("No signal · access required", "Pivot into the network, then take the video recorder")}
		</div>
	{:else if systems.cameraCount === 0}
		<p class="font-mono text-xs {terminal ? 'text-[#5fd389]' : 'text-fg-muted'}">
			No camera system on this network. Nothing to watch here.
		</p>
	{:else if cameras.length === 0}
		<div class="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
			{#each Array.from({ length: systems.cameraCount ?? 0 }, (_, i) => i) as i (i)}
				{@render locked(`Channel ${i + 1} · no signal`, "Access required · hop cams")}
			{/each}
		</div>
	{:else}
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
			<div class="grid gap-1.5 {cameras.length > 1 ? 'grid-cols-2 lg:grid-cols-3' : 'max-w-xl'}">
				{#each cameras as cam (cam.id)}
					<button
						type="button"
						class="block text-left outline-offset-2"
						onclick={() => focus(cam.id)}
						aria-label="Open the {cam.label} camera"
					>
						<CameraFeed {site} camera={cam} {mode} {lens} compact={cameras.length > 1} />
					</button>
				{/each}
			</div>
		{:else if current}
			<div class="flex flex-wrap gap-1.5">
				{#each cameras as cam (cam.id)}
					<button type="button" class={chip} aria-pressed={current.id === cam.id} onclick={() => (pick = cam.id)}>
						{cam.label}
					</button>
				{/each}
			</div>
			{#key current.id}
				<CameraFeed {site} camera={current} {mode} {lens} {pan} />
			{/key}
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
	{/if}
</div>

<style>
	.static-noise {
		background-image: repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0 1px, rgba(0, 0, 0, 0) 1px 3px);
	}
</style>
