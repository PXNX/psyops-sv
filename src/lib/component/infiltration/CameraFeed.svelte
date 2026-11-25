<!-- src/lib/component/infiltration/CameraFeed.svelte -->
<!-- A site's security camera, tapped through a network asset. The picture is
     drawn procedurally from the site's seed (so the same site always looks the
     same) and wrapped in a CCTV HUD: camera id, live clock, scanlines, grain. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { hash32, seededRandom } from "#lib/config/index.js";
	import type { Site } from "#lib/config/index.js";
	import { drawView, type CamLens, type CamMode, type CamView } from "./camera-views";

	interface Props {
		site: Site;
		/** When the feed was tapped (shown in the corner until the clock starts). */
		observedAt?: string;
		compact?: boolean;
		class?: string;
		/** Which camera on the site; "main" is the establishing shot. */
		view?: CamView;
		/** Day, night vision or thermal. */
		mode?: CamMode;
		/** Pan-tilt-zoom pan, -1 (left) to 1 (right). */
		pan?: number;
		lens?: CamLens;
		/** Caption override for the bottom bar. */
		label?: string;
	}
	let {
		site,
		observedAt,
		compact = false,
		class: className = "",
		view = "main",
		mode = "day",
		pan = 0,
		lens = "wide",
		label
	}: Props = $props();

	type Shape =
		| {
				k: "rect";
				x: number;
				y: number;
				w: number;
				h: number;
				fill?: string;
				stroke?: string;
				sw?: number;
				op?: number;
				rx?: number;
		  }
		| { k: "path"; d: string; fill?: string; stroke?: string; sw?: number; op?: number }
		| { k: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; op?: number }
		| { k: "poly"; pts: string; fill?: string; stroke?: string; sw?: number; op?: number };
	type Blip = { x: number; y: number; r: number; delay: number };

	const W = 640;
	const H = 360;
	const uid = $props.id();
	const tint = "#b9d8c4";
	const amber = "#ffcf3f";

	function build() {
		const rng = seededRandom(hash32(site.seed, 0xc17));
		const shapes: Shape[] = [];
		const blips: Blip[] = [];
		const line = (d: string, stroke = tint, sw = 1, op = 0.7) =>
			shapes.push({ k: "path", d, stroke, sw, op, fill: "none" });
		const rect = (x: number, y: number, w: number, h: number, fill: string, op = 1, stroke?: string) =>
			shapes.push({ k: "rect", x, y, w, h, fill, op, stroke, sw: stroke ? 0.8 : undefined });
		const circle = (cx: number, cy: number, r: number, fill: string, op = 1) =>
			shapes.push({ k: "circle", cx, cy, r, fill, op });

		if (view !== "main") {
			drawView(view, seededRandom(hash32(site.seed, view.length, view.charCodeAt(0))), {
				line,
				rect,
				circle,
				poly: (pts, fill, stroke, op) => shapes.push({ k: "poly", pts, fill, stroke, sw: stroke ? 1 : undefined, op }),
				blip: (x, y, r, delay) => blips.push({ x, y, r, delay })
			});
			for (let i = 0; i < 26; i++) circle(rng() * W, rng() * H, 0.6 + rng(), "#d7e7d9", 0.06 + rng() * 0.12);
			return { shapes, blips };
		}

		// Ground and horizon, common to every outdoor site.
		const indoor = site.kind === "datacenter" || site.kind === "command";
		rect(0, 0, W, H, indoor ? "#0d1310" : "#141b17");
		if (!indoor) {
			rect(0, 205, W, 155, "#1c251e");
			line(`M0 205H${W}`, "#5d7a68", 1, 0.5);
			// Distant treeline / perimeter fence.
			for (let x = 0; x < W; x += 22) {
				const h = 10 + rng() * 22;
				line(`M${x} 205V${205 - h}`, "#31473a", 2, 0.65);
			}
			line("M0 300H640", "#6d8a78", 1, 0.35);
			for (let x = 12; x < W; x += 46) line(`M${x} 300v24`, "#6d8a78", 1, 0.3);
		}

		if (site.kind === "powerplant") {
			// Cooling towers with a drifting steam plume.
			for (const [cx, scale] of [
				[190, 1],
				[330, 0.82]
			] as const) {
				const topY = 96 + (1 - scale) * 26;
				const baseY = 262;
				shapes.push({
					k: "poly",
					pts: `${cx - 52 * scale},${baseY} ${cx - 30 * scale},${topY} ${cx + 30 * scale},${topY} ${cx + 52 * scale},${baseY}`,
					fill: "#45564a",
					stroke: "#7d9a86",
					sw: 1
				});
				line(`M${cx - 30 * scale} ${topY}h${60 * scale}`, "#93ad9b", 1.4, 0.8);
				for (let p = 0; p < 4; p++) {
					circle(cx + (rng() - 0.5) * 46, topY - 16 - p * 19, 13 + p * 6 + rng() * 8, "#8fa69a", 0.1 + p * 0.03);
				}
			}
			rect(430, 150, 170, 112, "#3a483f", 1, "#6f8877");
			rect(446, 168, 138, 60, "#243029", 0.9);
			for (let x = 452; x < 580; x += 16) line(`M${x} 168v60`, "#4d6355", 1, 0.6);
			// Turbine hall lights and a transformer yard.
			for (let x = 438; x < 600; x += 24) circle(x, 142, 2.4, amber, 0.75);
			for (let i = 0; i < 5; i++) rect(452 + i * 26, 232, 18, 30, "#2e3a32", 1, "#5e7565");
			line("M80 262H610", "#7d9a86", 2, 0.5);
		} else if (site.kind === "airbase") {
			// Runway in perspective with a centreline.
			shapes.push({ k: "poly", pts: "250,205 470,205 640,360 60,360", fill: "#222b26", stroke: "#5a7262", sw: 1 });
			for (let y = 220; y < 360; y += 22) {
				const t = (y - 205) / 155;
				const half = 110 + t * 280;
				line(`M${360 - half} ${y}H${360 + half}`, "#a8c2b0", 1.4, 0.55);
			}
			line("M360 205v155", amber, 1.6, 0.7);
			// Hangars.
			for (const [x, w] of [
				[30, 130],
				[485, 120]
			] as const) {
				shapes.push({
					k: "poly",
					pts: `${x},205 ${x + 18},160 ${x + w - 18},160 ${x + w},205`,
					fill: "#3e4d43",
					stroke: "#7d9a86",
					sw: 1
				});
				line(`M${x + 18} 160h${w - 36}`, "#9ab5a2", 1, 0.5);
				rect(x + w / 2 - 20, 174, 40, 31, "#1c2620", 1, "#6f8877");
			}
			// Parked aircraft silhouettes on the apron.
			for (const [x, y, s] of [
				[250, 250, 1],
				[420, 275, 0.8],
				[150, 300, 1.15]
			] as const) {
				const p = `M${x - 24 * s} ${y}l${10 * s} -2l${12 * s} -14l${4 * s} 14l${28 * s} 2l${4 * s} 4l${-28 * s} 1l${-4 * s} 14l${-8 * s} -14l${-18 * s} -1Z`;
				shapes.push({ k: "path", d: p, fill: "#7f9686", op: 0.85 });
			}
			// Control tower and apron lights.
			rect(470, 92, 26, 70, "#3a483f", 1, "#7d9a86");
			rect(458, 80, 50, 18, "#29352d", 1, "#8ba897");
			for (let x = 462; x < 506; x += 8) rect(x, 84, 5, 9, "#9db8a5", 0.7);
			for (let x = 70; x < 580; x += 52) blips.push({ x, y: 214, r: 2.2, delay: rng() * 2 });
		} else if (site.kind === "datacenter") {
			// Server aisles in perspective.
			rect(0, 0, W, H, "#0d1310");
			shapes.push({ k: "poly", pts: "280,120 360,120 640,360 0,360", fill: "#141d18", stroke: "#405a49", sw: 1 });
			for (let row = 0; row < 5; row++) {
				const t = row / 5;
				const y = 150 + t * 190;
				const inset = 120 - t * 118;
				rect(inset, y, W - inset * 2, 26 + t * 14, "#25322a", 1, "#4e6a58");
				for (let x = inset + 8; x < W - inset - 8; x += 16 + t * 5) {
					rect(x, y + 6, 9 + t * 3, 5 + t * 2, "#0c120e", 1);
					blips.push({ x: x + 11 + t * 2, y: y + 8, r: 1.6 + t, delay: rng() * 3 });
				}
			}
			line("M320 120v240", "#7ea78b", 1, 0.3);
			for (let x = 90; x < 560; x += 90) rect(x, 46, 60, 8, "#8fb19a", 0.18);
		} else if (site.kind === "telecom") {
			rect(0, 205, W, 155, "#1a231d");
			// Lattice tower and dishes.
			const cx = 320;
			line(`M${cx - 70} 300L${cx} 60L${cx + 70} 300`, "#6c8876", 3, 0.85);
			line(`M${cx + 70} 300L${cx} 60L${cx - 70} 300`, "#6c8876", 3, 0.85);
			for (let y = 90; y < 300; y += 34) {
				const half = ((y - 60) / 240) * 70;
				line(`M${cx - half} ${y}H${cx + half}`, "#6c8876", 1.6, 0.75);
				line(`M${cx - half} ${y}L${cx + half} ${y + 34}`, "#566f60", 1, 0.5);
			}
			circle(cx, 64, 8, "#9cb7a5", 0.9);
			for (const [x, y, r] of [
				[232, 150, 22],
				[408, 122, 18],
				[250, 232, 14]
			] as const) {
				shapes.push({ k: "circle", cx: x, cy: y, r, fill: "#3d5144", stroke: "#8fae9a", sw: 1.4, op: 0.95 });
				line(`M${x} ${y}v${r + 10}`, "#8fae9a", 1.2, 0.7);
			}
			rect(470, 240, 130, 60, "#334039", 1, "#6f8877");
			for (let x = 480; x < 594; x += 14) blips.push({ x, y: 252, r: 1.8, delay: rng() * 2 });
		} else if (site.kind === "lab") {
			rect(60, 120, 520, 140, "#344139", 1, "#779487");
			for (let x = 80; x < 570; x += 38) rect(x, 142, 28, 42, "#16201a", 1, "#5c7766");
			rect(250, 198, 140, 62, "#1a241d", 1, "#6f8877");
			line("M250 198h140", "#9cb7a5", 1.4, 0.6);
			// Lab vessels behind the glass.
			for (const x of [276, 320, 364]) {
				rect(x, 212, 22, 36, "#4a6355", 0.85, "#9cb7a5");
				circle(x + 11, 222, 6, "#b6d3bf", 0.5);
			}
			for (let x = 70; x < 570; x += 36) blips.push({ x, y: 118, r: 1.6, delay: rng() * 3 });
			line("M300 120v140", "#7ea78b", 1, 0.25);
		} else {
			// Command centre: blast door, floodlights, fencing.
			rect(150, 110, 340, 150, "#333f38", 1, "#718e7d");
			rect(270, 140, 100, 120, "#1d2721", 1, "#8ba897");
			shapes.push({ k: "circle", cx: 320, cy: 200, r: 26, fill: "#2e3d34", stroke: "#9cb7a5", sw: 1 });
			for (let a = 0; a < 8; a++) {
				const ang = (a / 8) * Math.PI * 2;
				line(
					`M${320 + Math.cos(ang) * 8} ${200 + Math.sin(ang) * 8}L${320 + Math.cos(ang) * 26} ${200 + Math.sin(ang) * 26}`,
					"#9cb7a5",
					1.4,
					0.8
				);
			}
			for (let x = 100; x < 550; x += 60) rect(x, 96, 8, 14, "#d7e7d9", 0.6);
			for (let x = 40; x < 620; x += 34) line(`M${x} 268v60`, "#6f8877", 1.2, 0.5);
			line("M20 282H620", "#6f8877", 1.2, 0.5);
			blips.push({ x: 310, y: 130, r: 3, delay: 0 });
		}

		// Camera noise: a few dust motes and a scratch or two.
		for (let i = 0; i < 26; i++) {
			circle(rng() * W, rng() * H, 0.6 + rng(), "#d7e7d9", 0.06 + rng() * 0.12);
		}
		return { shapes, blips };
	}

	const scene = $derived(build());
	let clock = $state("");
	onMount(() => {
		clock = new Date().toISOString();
		const timer = setInterval(() => (clock = new Date().toISOString()), 1000);
		return () => clearInterval(timer);
	});
	const stamp = $derived((clock || observedAt || "").replace("T", " ").slice(0, 19) + "Z");
	const camNo = $derived(
		String(((hash32(site.seed, 4) + ["main", "gate", "lobby", "server", "perimeter"].indexOf(view)) % 16) + 1).padStart(
			2,
			"0"
		)
	);
	// PTZ: zoom in a little and slide the picture; the fisheye squeezes it into a bubble.
	const zoom = $derived(lens === "fisheye" ? 1.12 : pan ? 1.3 : 1);
	const shift = $derived(-pan * (W * (zoom - 1)) * 0.5);
	const sceneTransform = $derived(
		`transform: translate(${W / 2 + shift}px, ${H / 2}px) scale(${zoom}) translate(${-W / 2}px, ${-H / 2}px)`
	);
	const modeTag = $derived(mode === "night" ? "NV" : mode === "thermal" ? "IR·WHT" : "");
</script>

<div class="cctv relative overflow-hidden rounded-sm border border-line/30 bg-[#0d1310] {className}">
	<svg
		viewBox="0 0 {W} {H}"
		class="block h-auto w-full select-none"
		role="img"
		aria-label="{site.code} security camera feed"
	>
		<defs>
			<radialGradient id="{uid}-vig" cx="50%" cy="48%" r="72%">
				<stop offset="55%" stop-color="#000" stop-opacity="0" />
				<stop offset="100%" stop-color="#000" stop-opacity="0.85" />
			</radialGradient>
			<filter id="{uid}-grain" x="0" y="0" width="100%" height="100%">
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={site.seed % 100} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<!-- Night vision: lift the shadows and paint everything phosphor green. -->
			<filter id="{uid}-night" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" values="0.2 0.5 0.1 0 0  0.6 1.4 0.3 0 0.08  0.15 0.35 0.1 0 0  0 0 0 1 0" />
			</filter>
			<!-- Thermal: brightness mapped onto an iron palette, warm things glow. -->
			<filter id="{uid}-thermal" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" values="0.5 0.9 0.3 0 0  0.5 0.9 0.3 0 0  0.5 0.9 0.3 0 0  0 0 0 1 0" />
				<feComponentTransfer>
					<feFuncR type="table" tableValues="0.02 0.25 0.7 0.95 1 1" />
					<feFuncG type="table" tableValues="0.0 0.02 0.12 0.45 0.85 1" />
					<feFuncB type="table" tableValues="0.12 0.45 0.4 0.08 0.2 0.9" />
				</feComponentTransfer>
			</filter>
			<clipPath id="{uid}-bubble">
				<ellipse cx={W / 2} cy={H / 2} rx={W * 0.47} ry={H * 0.49} />
			</clipPath>
		</defs>
		<rect width={W} height={H} fill="#050806" />
		<g
			clip-path={lens === "fisheye" ? `url(#${uid}-bubble)` : undefined}
			filter={mode === "day" ? undefined : `url(#${uid}-${mode})`}
		>
			<g style={sceneTransform} class="ptz">
				{#each scene.shapes as s, i (i)}
					{#if s.k === "rect"}
						<rect
							x={s.x}
							y={s.y}
							width={s.w}
							height={s.h}
							fill={s.fill}
							opacity={s.op ?? 1}
							stroke={s.stroke}
							stroke-width={s.sw}
						/>
					{:else if s.k === "circle"}
						<circle
							cx={s.cx}
							cy={s.cy}
							r={s.r}
							fill={s.fill}
							opacity={s.op ?? 1}
							stroke={s.stroke}
							stroke-width={s.sw}
						/>
					{:else if s.k === "poly"}
						<polygon points={s.pts} fill={s.fill} opacity={s.op ?? 1} stroke={s.stroke} stroke-width={s.sw} />
					{:else}
						<path d={s.d} fill={s.fill ?? "none"} opacity={s.op ?? 1} stroke={s.stroke} stroke-width={s.sw} />
					{/if}
				{/each}
				{#each scene.blips as b, i (i)}
					<circle class="blip" cx={b.x} cy={b.y} r={b.r} fill={amber} style="animation-delay: {b.delay}s" />
				{/each}
			</g>
		</g>
		<rect width={W} height={H} fill="url(#{uid}-vig)" />
		{#if lens === "fisheye"}
			<ellipse
				cx={W / 2}
				cy={H / 2}
				rx={W * 0.47}
				ry={H * 0.49}
				fill="none"
				stroke="#000"
				stroke-width="18"
				opacity="0.6"
			/>
		{/if}
		<rect width={W} height={H} filter="url(#{uid}-grain)" opacity="0.12" style="mix-blend-mode: overlay" />
		<!-- HUD -->
		<g fill="none" stroke={tint} stroke-width="1.4" opacity="0.7">
			<path d="M12 34V12h26M628 34V12h-26M12 326v22h26M628 326v22h-26" />
		</g>
		<rect x="0" y="0" width={W} height="26" fill="#000" opacity="0.62" />
		<text x="14" y="17" font-size="11" fill={tint} font-family="ui-monospace, monospace" letter-spacing="1.2">
			CAM {camNo} · {site.code}{modeTag ? ` · ${modeTag}` : ""}{pan ? ` · PTZ ${pan > 0 ? "▶" : "◀"}` : ""}
		</text>
		<circle class="rec" cx={W - 76} cy="13" r="4" fill="#ff5b4d" />
		<text x={W - 66} y="17" font-size="10" fill="#ff8b80" font-family="ui-monospace, monospace" letter-spacing="1">
			REC
		</text>
		<rect x="0" y={H - 24} width={W} height="24" fill="#000" opacity="0.62" />
		{#if !compact}
			<text x="14" y={H - 8} font-size="10" fill={tint} font-family="ui-monospace, monospace" opacity="0.85">
				{label ?? `${site.camera} · ${site.name}`}
			</text>
		{/if}
		<text x={W - 14} y={H - 8} text-anchor="end" font-size="10" fill={tint} font-family="ui-monospace, monospace">
			{stamp}
		</text>
	</svg>
	<div class="scanlines pointer-events-none absolute inset-0" aria-hidden="true"></div>
</div>

<style>
	.scanlines {
		background: repeating-linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0px,
			rgba(0, 0, 0, 0) 2px,
			rgba(0, 0, 0, 0.22) 3px,
			rgba(0, 0, 0, 0) 4px
		);
		mix-blend-mode: multiply;
		opacity: 0.55;
	}
	.rec {
		animation: rec 1.4s steps(1, end) infinite;
	}
	.blip {
		animation: blip 2.4s ease-in-out infinite;
	}
	.ptz {
		transition: transform 0.6s ease;
	}
	@keyframes rec {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0.15;
		}
	}
	@keyframes blip {
		0%,
		45% {
			opacity: 0.15;
		}
		50%,
		70% {
			opacity: 0.85;
		}
		100% {
			opacity: 0.15;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.rec,
		.blip {
			animation: none;
		}
		.ptz {
			transition: none;
		}
	}
</style>
