<!-- src/lib/component/infiltration/CameraFeed.svelte -->
<!-- One tapped security camera. The room is drawn procedurally (see
     cctv-scenes.ts) at a low resolution, then run through a cheap CCTV
     pipeline: wide-angle barrel, grain, blocky compression, a rolling
     interference bar, a stuttering frame rate and the odd dropped frame, with
     an IR look at night and a thermal palette. Camera id, channel and a clock
     sit on top. Under prefers-reduced-motion it shows a still frame. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { hash32, isNightAt, seededRandom, type SiteCamera, type Site } from "#lib/config/index.js";
	import { SH, SW, composeScene, type CamLens, type CamMode, type Paint, type Scene } from "./cctv-scenes";

	interface Props {
		site: Pick<Site, "seed" | "code" | "name">;
		camera: SiteCamera;
		mode?: CamMode;
		lens?: CamLens;
		/** Pan-tilt-zoom pan, -1 (left) to 1 (right). */
		pan?: number;
		compact?: boolean;
		class?: string;
	}
	let { site, camera, mode = "auto", lens = "wide", pan = 0, compact = false, class: className = "" }: Props = $props();

	const DW = 640;
	const DH = 360;
	let canvas: HTMLCanvasElement | undefined = $state();

	// Settings the render loop reads every frame; kept outside reactivity on purpose.
	const live = { mode: "auto" as CamMode, lens: "wide" as CamLens, pan: 0 };
	$effect(() => {
		live.mode = mode;
		live.lens = lens;
		live.pan = pan;
		redraw?.();
	});
	let redraw: (() => void) | null = null;

	const night = () => isNightAt(site, new Date());
	const effective = (m: CamMode): Exclude<CamMode, "auto"> => (m === "auto" ? (night() ? "ir" : "day") : m);

	/** Iron palette for thermal: black → purple → orange → yellow → white. */
	const IRON = (() => {
		const stops: [number, number, number, number][] = [
			[0, 0, 0, 12],
			[0.3, 70, 10, 120],
			[0.55, 200, 40, 60],
			[0.75, 250, 140, 10],
			[0.9, 255, 220, 60],
			[1, 255, 255, 240]
		];
		const out = new Uint8Array(256 * 3);
		for (let i = 0; i < 256; i++) {
			const u = i / 255;
			const k = stops.findIndex((s) => s[0] >= u);
			const b = stops[Math.max(1, k)]!;
			const a = stops[Math.max(0, k - 1)]!;
			const f = b[0] === a[0] ? 0 : (u - a[0]) / (b[0] - a[0]);
			for (let c = 0; c < 3; c++) out[i * 3 + c] = a[c + 1]! + (b[c + 1]! - a[c + 1]!) * f;
		}
		return out;
	})();

	/** Source pixel for each output pixel: barrel for the wide lens, a hard bubble for the fisheye. */
	function lensMap(kind: CamLens) {
		const k = kind === "fisheye" ? 0.5 : 0.09;
		const lut = new Int32Array(SW * SH);
		const fall = new Float32Array(SW * SH);
		for (let y = 0; y < SH; y++)
			for (let x = 0; x < SW; x++) {
				const nx = (x / SW) * 2 - 1;
				const ny = (y / SH) * 2 - 1;
				const r2 = nx * nx + ny * ny * 0.56;
				const s = (1 + k * r2) / (1 + k * 0.7);
				let sx = ((nx * s + 1) / 2) * SW;
				let sy = ((ny * s + 1) / 2) * SH;
				const i = y * SW + x;
				if (kind === "fisheye" && (sx < 0 || sx >= SW || sy < 0 || sy >= SH || nx * nx + ny * ny > 1.05)) {
					lut[i] = -1;
					continue;
				}
				sx = Math.min(SW - 1, Math.max(0, sx));
				sy = Math.min(SH - 1, Math.max(0, sy));
				lut[i] = (sy | 0) * SW + (sx | 0);
				fall[i] = Math.max(0.25, 1.15 - r2 * 0.45);
			}
		return { lut, fall };
	}

	onMount(() => {
		const cv = canvas!;
		const out = cv.getContext("2d")!;
		const mk = () => {
			const c = document.createElement("canvas");
			c.width = SW;
			c.height = SH;
			return c;
		};
		const baseC = mk();
		const heatBaseC = mk();
		const frameC = mk();
		const heatC = mk();
		const smallC = mk();
		const g = {
			base: baseC.getContext("2d")!,
			heatBase: heatBaseC.getContext("2d")!,
			frame: frameC.getContext("2d", { willReadFrequently: true })!,
			heat: heatC.getContext("2d", { willReadFrequently: true })!,
			small: smallC.getContext("2d")!
		};

		const scene: Scene = composeScene(camera.scene, seededRandom(hash32(site.seed, camera.channel, 0xcc7)));
		scene.actors.sort((a, b) => b.z - a.z);
		scene.base({ c: g.base, h: g.heatBase } satisfies Paint);

		let lens = lensMap(live.lens);
		let lensKind = live.lens;
		const img = g.small.createImageData(SW, SH);
		let noiseSeed = hash32(site.seed, camera.channel) || 1;
		const rand = () => {
			noiseSeed ^= noiseSeed << 13;
			noiseSeed ^= noiseSeed >>> 17;
			noiseSeed ^= noiseSeed << 5;
			return ((noiseSeed >>> 0) % 10_000) / 10_000;
		};

		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		let dropped = 0;
		let smear = 0;

		function render(t: number) {
			const m = effective(live.mode);
			const zoom = live.lens === "fisheye" ? 1.05 : live.pan ? 1.35 : 1;
			const shift = -live.pan * SW * (zoom - 1) * 0.5;
			const tf = [zoom, 0, 0, zoom, SW / 2 - (SW / 2) * zoom + shift, SH / 2 - (SH / 2) * zoom] as const;
			const thermal = m === "thermal";
			for (const [ctx, src] of [[g.frame, baseC], ...(thermal ? [[g.heat, heatBaseC] as const] : [])] as const) {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, SW, SH);
				ctx.setTransform(...tf);
				ctx.drawImage(src, 0, 0);
			}
			const paint: Paint = { c: g.frame, h: thermal ? g.heat : null };
			for (const a of scene.actors) a.draw(paint, t);
			g.frame.setTransform(1, 0, 0, 1, 0, 0);
			g.heat.setTransform(1, 0, 0, 1, 0, 0);

			if (lensKind !== live.lens) {
				lens = lensMap(live.lens);
				lensKind = live.lens;
			}
			const src = g.frame.getImageData(0, 0, SW, SH).data;
			const heat = thermal ? g.heat.getImageData(0, 0, SW, SH).data : null;
			const dst = img.data;
			const dark = m === "day" && night();
			const grain = m === "ir" ? 46 : thermal ? 14 : 24;
			const band = reduced ? -99 : ((t * 26) % (SH + 60)) - 30;
			for (let y = 0; y < SH; y++) {
				const db = Math.abs(y - band);
				const inBand = db < 7;
				const lift = inBand ? 26 * (1 - db / 7) : 0;
				const jitter = inBand ? 2 : 0;
				for (let x = 0; x < SW; x++) {
					const i = y * SW + x;
					const o = i * 4;
					let s = lens.lut[i]!;
					if (s < 0) {
						dst[o] = dst[o + 1] = dst[o + 2] = 4;
						dst[o + 3] = 255;
						continue;
					}
					s = Math.min(SW * SH - 1, s + jitter) * 4;
					const r = src[s]!;
					const gg = src[s + 1]!;
					const b = src[s + 2]!;
					const L = 0.3 * r + 0.59 * gg + 0.11 * b;
					const n = (rand() - 0.5) * grain + lift;
					const f = lens.fall[i]!;
					if (m === "day") {
						let k = 1;
						if (dark) k = 0.32 + (L > 175 ? (L - 175) / 60 : 0);
						dst[o] = (L + (r - L) * 0.45) * 0.97 * k * f + n;
						dst[o + 1] = (L + (gg - L) * 0.45) * 1.02 * k * f + n;
						dst[o + 2] = (L + (b - L) * 0.45) * 0.93 * k * f + n;
					} else if (m === "ir") {
						const v = Math.pow(L / 255, 0.62) * 255 * f * 1.12 + 8 + n;
						dst[o] = v * 0.92;
						dst[o + 1] = v;
						dst[o + 2] = v * 0.94;
					} else {
						const h = heat![s]!;
						const v = Math.max(0, Math.min(255, (0.22 * L + 0.85 * h) * (0.8 + f * 0.2) + n)) | 0;
						dst[o] = IRON[v * 3]!;
						dst[o + 1] = IRON[v * 3 + 1]!;
						dst[o + 2] = IRON[v * 3 + 2]!;
					}
					dst[o + 3] = 255;
				}
			}
			// Compression: some 8×8 blocks collapse to their average, more right after a "keyframe".
			if (!reduced && rand() < 0.012) smear = 8;
			const blocks = smear > 0 ? 70 : 6 + ((rand() * 10) | 0);
			if (smear > 0) smear--;
			for (let k = 0; k < blocks; k++) {
				const bx = ((rand() * (SW / 8)) | 0) * 8;
				const by = ((rand() * (SH / 8)) | 0) * 8;
				let r = 0;
				let gg = 0;
				let b = 0;
				for (let y = by; y < by + 8; y++)
					for (let x = bx; x < bx + 8; x++) {
						const o = (y * SW + x) * 4;
						r += dst[o]!;
						gg += dst[o + 1]!;
						b += dst[o + 2]!;
					}
				for (let y = by; y < by + 8; y++)
					for (let x = bx; x < bx + 8; x++) {
						const o = (y * SW + x) * 4;
						dst[o] = r / 64;
						dst[o + 1] = gg / 64;
						dst[o + 2] = b / 64;
					}
			}
			g.small.putImageData(img, 0, 0);
		}

		function hud() {
			out.imageSmoothingEnabled = true;
			out.drawImage(smallC, 0, 0, DW, DH);
			if (dropped > 0) {
				out.fillStyle = "rgba(10,12,11,0.92)";
				out.fillRect(0, 0, DW, DH);
				out.fillStyle = "#9fb5a5";
				out.font = `${compact ? 28 : 18}px ui-monospace, monospace`;
				out.textAlign = "center";
				out.fillText("NO SYNC", DW / 2, DH / 2);
			}
			// Vignette.
			const v = out.createRadialGradient(DW / 2, DH / 2, DH * 0.35, DW / 2, DH / 2, DW * 0.62);
			v.addColorStop(0, "rgba(0,0,0,0)");
			v.addColorStop(1, "rgba(0,0,0,0.55)");
			out.fillStyle = v;
			out.fillRect(0, 0, DW, DH);
			// Overlay text, burned in like a real recorder's.
			const now = new Date();
			const size = compact ? 26 : 15;
			out.font = `${size}px ui-monospace, monospace`;
			out.textAlign = "left";
			out.lineWidth = 3;
			out.strokeStyle = "rgba(0,0,0,0.75)";
			out.fillStyle = "#e8f2ea";
			const stamp = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 19)}`;
			const id = `CH${String(camera.channel).padStart(2, "0")} ${camera.label.toUpperCase()}`;
			const m = effective(live.mode);
			const tag = m === "ir" ? " IR" : m === "thermal" ? " THM" : "";
			for (const [text, x, y, align] of [
				[stamp, 14, size + 8, "left"],
				[`${id}${tag}`, 14, DH - 14, "left"],
				...(compact ? [] : [[site.code, DW - 14, DH - 14, "right"] as const])
			] as const) {
				out.textAlign = align;
				out.strokeText(text, x, y);
				out.fillText(text, x, y);
			}
			if (Math.floor(now.getTime() / 700) % 2 === 0 || reduced) {
				out.fillStyle = "#ff4d3d";
				out.beginPath();
				out.arc(DW - (compact ? 90 : 62), size + 1, compact ? 9 : 6, 0, Math.PI * 2);
				out.fill();
				out.fillStyle = "#e8f2ea";
				out.textAlign = "right";
				out.strokeText("REC", DW - 14, size + 8);
				out.fillText("REC", DW - 14, size + 8);
			}
		}

		let visible = true;
		const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
		io.observe(cv);
		const t0 = performance.now() - (hash32(site.seed, camera.channel) % 20_000);
		let timer: ReturnType<typeof setTimeout> | undefined;
		let stopped = false;

		function tick() {
			if (stopped) return;
			let wait = 1000 / 12;
			if (visible && !document.hidden) {
				if (dropped > 0) dropped--;
				else if (rand() < 0.006) dropped = 1;
				render((performance.now() - t0) / 1000);
				hud();
				// Frame-rate stutter: the recorder sometimes holds a frame.
				if (rand() < 0.05) wait += 120 + rand() * 300;
			} else wait = 500;
			timer = setTimeout(tick, wait);
		}

		redraw = () => {
			render(reduced ? 12 : (performance.now() - t0) / 1000);
			hud();
		};
		if (reduced) {
			redraw();
			// The still frame keeps its clock running.
			const clock = setInterval(hud, 1000);
			return () => {
				clearInterval(clock);
				io.disconnect();
				redraw = null;
			};
		}
		tick();
		return () => {
			stopped = true;
			clearTimeout(timer);
			io.disconnect();
			redraw = null;
		};
	});
</script>

<div
	class="relative overflow-hidden rounded-sm border border-line/30 bg-[#050806] {className}"
	role="img"
	aria-label="{camera.label} security camera at {site.name}"
>
	<canvas bind:this={canvas} width={DW} height={DH} class="block aspect-[16/9] h-auto w-full" aria-hidden="true"
	></canvas>
	<div class="scanlines pointer-events-none absolute inset-0" aria-hidden="true"></div>
</div>

<style>
	.scanlines {
		background: repeating-linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0px,
			rgba(0, 0, 0, 0) 2px,
			rgba(0, 0, 0, 0.18) 3px,
			rgba(0, 0, 0, 0) 4px
		);
		mix-blend-mode: multiply;
		opacity: 0.5;
	}
</style>
