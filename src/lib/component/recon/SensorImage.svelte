<!-- src/lib/component/recon/SensorImage.svelte -->
<!-- One recon frame as SVG: the procedural scene from utils/sensor-image.ts
     (terrain, structures, units, damage, weather) under the sensor's look
     (EO photo, IR white-hot/black-hot/ironbow, SAR speckle, radar scope),
     with a reconnaissance HUD on top. "mini" drops the text for thumbnails. -->
<script lang="ts">
	import { prefersReducedMotion } from "svelte/motion";
	import { SENSORS, type SensorId } from "#lib/config/index.js";
	import { dtgCompact, formatLatLon } from "#lib/utils/military.js";
	import {
		buildScene,
		FRAME_H,
		FRAME_W,
		type DetectionIcon,
		type ImageryInput,
		type Prim,
		type Scene
	} from "#lib/utils/sensor-image.js";
	import IconSatellite from "~icons/mdi/satellite-variant";
	import IconDrone from "~icons/mdi/quadcopter";
	import IconRadar from "~icons/mdi/radar";
	import IconThermal from "~icons/mdi/thermometer-lines";
	import IconNight from "~icons/mdi/weather-night";
	import IconCloud from "~icons/mdi/weather-cloudy";
	import IconRain from "~icons/mdi/weather-pouring";
	import IconFog from "~icons/mdi/weather-fog";
	import IconSun from "~icons/mdi/weather-sunny";
	import IconTank from "~icons/mdi/tank";
	import IconPlane from "~icons/mdi/airplane";
	import IconFire from "~icons/mdi/fire";
	import IconTarget from "~icons/mdi/target";
	import IconShield from "~icons/mdi/shield-half-full";
	import IconSignalOff from "~icons/mdi/signal-off";
	import IconEyeOff from "~icons/mdi/eye-off";
	import IconFactory from "~icons/mdi/factory";
	import IconHospital from "~icons/mdi/hospital-box";
	import IconCrane from "~icons/mdi/crane";
	import IconInfantry from "~icons/mdi/account-group";
	import IconArtillery from "~icons/mdi/bullseye-arrow";
	import IconShip from "~icons/mdi/ferry";
	import IconSub from "~icons/mdi/submarine";
	import IconMine from "~icons/mdi/mine";
	import IconCrater from "~icons/mdi/circle-double";
	import IconSam from "~icons/mdi/rocket-launch";

	export type IrPalette = "white" | "black" | "iron";

	interface Props {
		input: ImageryInput;
		/** Prebuilt scene (sea/coastal passes); region passes build their own. */
		scene?: Scene;
		/** "bare": the picture alone, no HUD or boxes (backdrops). */
		variant?: "full" | "mini" | "bare";
		irPalette?: IrPalette;
		/** Play the "developing" reveal and scan line (skipped with reduced motion). */
		animate?: boolean;
		/** "cover" crops the frame to fill its box (hero backdrops). */
		fit?: "contain" | "cover";
		class?: string;
	}
	let {
		input,
		scene: sceneProp,
		variant = "full",
		irPalette = "white",
		animate = false,
		fit = "contain",
		class: className = ""
	}: Props = $props();

	const uid = $props.id();
	const scene = $derived(sceneProp ?? buildScene(input));
	const full = $derived(variant === "full");
	const motion = $derived(animate && !prefersReducedMotion.current);
	const id = (name: string) => `${uid}-${name}`;
	const url = (name: string) => `url(#${id(name)})`;
	const fill = (f: string | undefined) => (f?.startsWith("pat:") ? url(f.slice(4)) : (f ?? "none"));
	const fx = (t: string | undefined) => (t ? url(t) : undefined);

	const sensor = $derived(SENSORS[input.sensor as SensorId]);
	const modeTag = $derived(
		{
			eo: "EO",
			ir: irPalette === "black" ? "IR BH" : irPalette === "iron" ? "IR IRON" : "IR WH",
			sar: "SAR X-BAND"
		}[scene.mode]
	);
	const PlatformIcon = $derived(scene.platform === "drone" ? IconDrone : IconSatellite);
	const w = $derived(input.findings.conditions.weather);
	const WeatherIcon = $derived(
		w === "rain"
			? IconRain
			: w === "fog"
				? IconFog
				: w === "cloudy"
					? IconCloud
					: input.findings.conditions.night
						? IconNight
						: IconSun
	);
	const ICON: Record<DetectionIcon, typeof IconTank> = {
		armor: IconTank,
		artillery: IconArtillery,
		infantry: IconInfantry,
		air: IconPlane,
		sam: IconSam,
		fort: IconShield,
		fire: IconFire,
		crater: IconCrater,
		industry: IconFactory,
		hospital: IconHospital,
		radar: IconRadar,
		track: IconTarget,
		build: IconCrane,
		ship: IconShip,
		sub: IconSub,
		mine: IconMine
	};
	const stamp = (d: string) => dtgCompact(d);
	const latlon = $derived(input.lat != null && input.lon != null ? formatLatLon(input.lat, input.lon, 3) : "GRID UNK");

	// HUD colours: a cool white frame with amber target boxes.
	const hud = "#e8f0e8";
	const box = "#ffcf3f";
	const hostileBox = "#ff6b5a";
	const boxColor = (kind: string) => (kind === "damage" ? hostileBox : kind === "structure" ? "#8fd3ff" : box);

	const IRON = {
		r: "0 0.1 0.45 0.8 0.98 1 1",
		g: "0 0 0.02 0.18 0.5 0.82 1",
		b: "0 0.35 0.55 0.35 0.05 0.2 0.85"
	};
	/** Tree crowns in one canopy tile: [cx, cy, r, light?]. */
	const CANOPY: [number, number, number, number][] = [
		[3, 3, 2.6, 1],
		[9.5, 5, 2.1, 0],
		[16, 2.5, 2.8, 1],
		[22.5, 6, 2.3, 1],
		[5.5, 10.5, 2.9, 0],
		[13, 11, 2.4, 1],
		[20, 13, 2.7, 0],
		[2, 17.5, 2.2, 1],
		[9, 18, 2.6, 1],
		[16.5, 19.5, 2.1, 0],
		[24, 20, 2.5, 1],
		[12.5, 15.5, 1.5, 0]
	];
	/** Label width estimate (monospace ~0.6em). */
	const tw = (s: string, size: number) => s.length * size * 0.6;
	/** Label tabs above (or below) their boxes, nudged so they don't overlap. */
	const labels = $derived.by(() => {
		const taken: { x: number; y: number; w: number }[] = [];
		return scene.detections.map((d) => {
			const text = d.detail ? `${d.label} ${d.detail}` : d.label;
			const w = tw(text, 8) + 16;
			const x = Math.min(Math.max(2, d.x), FRAME_W - w - 2);
			let y = d.y > 32 ? d.y - 13 : Math.min(FRAME_H - 26, d.y + d.h + 2);
			for (let k = 0; k < 8; k++) {
				const hit = taken.some((t) => x < t.x + t.w && t.x < x + w && Math.abs(t.y - y) < 12);
				if (!hit) break;
				y = y - 12 < 14 ? y + 24 : y - 12;
			}
			taken.push({ x, y, w });
			return { x, y, w };
		});
	});
</script>

{#snippet prims(list: Prim[])}
	{#each list as p, i (i)}
		{#if p.k === "rect"}
			<rect
				x={p.x}
				y={p.y}
				width={p.w}
				height={p.h}
				rx={p.rx}
				fill={fill(p.fill)}
				stroke={p.stroke}
				stroke-width={p.sw}
				stroke-dasharray={p.dash}
				opacity={p.op}
				transform={p.tf}
				filter={fx(p.fx)}
			/>
		{:else if p.k === "circle"}
			<circle
				cx={p.x}
				cy={p.y}
				r={p.r}
				fill={fill(p.fill)}
				stroke={p.stroke}
				stroke-width={p.sw}
				opacity={p.op}
				transform={p.tf}
				filter={fx(p.fx)}
			/>
		{:else if p.k === "ellipse"}
			<ellipse
				cx={p.x}
				cy={p.y}
				rx={p.rx}
				ry={p.ry}
				fill={fill(p.fill)}
				opacity={p.op}
				transform={p.tf}
				filter={fx(p.fx)}
			/>
		{:else}
			<path
				d={p.d}
				fill={fill(p.fill)}
				stroke={p.stroke}
				stroke-width={p.sw}
				stroke-dasharray={p.dash}
				stroke-linecap={p.cap ?? "round"}
				stroke-linejoin="round"
				opacity={p.op}
				transform={p.tf}
				filter={fx(p.fx)}
			/>
		{/if}
	{/each}
{/snippet}

<svg
	viewBox="0 0 {FRAME_W} {FRAME_H}"
	preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : undefined}
	class="sensor-image block h-auto w-full select-none {className}"
	class:developing={motion}
	role="img"
	aria-label="{sensor?.label ?? input.sensor} imagery, {scene.detections.length} annotated objects"
	font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
>
	<defs>
		<clipPath id={id("frame")}><rect width={FRAME_W} height={FRAME_H} /></clipPath>
		<filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.6" /></filter>
		<filter id={id("blur")} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" /></filter>
		<filter id={id("glow")} x="-200%" y="-200%" width="500%" height="500%">
			<feGaussianBlur stdDeviation="1.4" result="b" />
			<feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
		</filter>
		<filter id={id("cloud")} x="-30%" y="-30%" width="160%" height="160%">
			<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed={scene.seed + 3} result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" result="d" />
			<feGaussianBlur in="d" stdDeviation="5" />
		</filter>
		<!-- Hillshade: noise as a height map, lit from the sun (or the radar). -->
		<filter id={id("relief")} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
			<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed={scene.seed} result="h" />
			<feDiffuseLighting in="h" surfaceScale={5 + scene.relief * 16} lighting-color="#fff" result="l">
				<feDistantLight azimuth={scene.reliefAzimuth} elevation={scene.reliefElevation} />
			</feDiffuseLighting>
			<feComposite
				in="SourceGraphic"
				in2="l"
				operator="arithmetic"
				k1={0.3 + scene.relief * 0.75}
				k2={1 - scene.relief * 0.55}
				k3="0"
				k4={-0.04 * scene.relief}
			/>
		</filter>
		<!-- SAR speckle: multiplicative noise over the whole return. -->
		<filter id={id("speckle")} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={scene.seed + 9} result="n" />
			<feColorMatrix
				in="n"
				type="matrix"
				values="1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  0 0 0 0 1"
				result="g"
			/>
			<feComposite in="SourceGraphic" in2="g" operator="arithmetic" k1="1.55" k2="0" k3="0" k4="0" />
		</filter>
		<filter id={id("irblur")} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
			<feGaussianBlur stdDeviation={scene.tone.blur} />
		</filter>
		<filter id={id("grain")} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
			<feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed={scene.seed + 17} />
			<feColorMatrix type="saturate" values="0" />
		</filter>
		<filter id={id("static")} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
			<feTurbulence type="turbulence" baseFrequency="0.015 0.6" numOctaves="2" seed={scene.seed + 23} />
			<feColorMatrix type="saturate" values="0" />
		</filter>
		<filter id={id("palette")} color-interpolation-filters="sRGB">
			{#if irPalette === "black"}
				<feComponentTransfer>
					<feFuncR type="table" tableValues="1 0" /><feFuncG type="table" tableValues="1 0" /><feFuncB
						type="table"
						tableValues="1 0"
					/>
				</feComponentTransfer>
			{:else}
				<feComponentTransfer>
					<feFuncR type="table" tableValues={IRON.r} /><feFuncG type="table" tableValues={IRON.g} /><feFuncB
						type="table"
						tableValues={IRON.b}
					/>
				</feComponentTransfer>
			{/if}
		</filter>
		<pattern id={id("canopy")} width="26" height="23" patternUnits="userSpaceOnUse" patternTransform="rotate(17)">
			<rect width="26" height="23" fill={scene.canopy.base} />
			{#each CANOPY as [cx, cy, r, tone], i (i)}
				<circle {cx} {cy} {r} fill={tone ? scene.canopy.light : scene.canopy.dark} opacity={0.6 + (i % 3) * 0.2} />
			{/each}
		</pattern>
		{#each [0, 60, 120] as angle, i (angle)}
			<pattern
				id={id(`furrow${i}`)}
				width="4"
				height="4"
				patternUnits="userSpaceOnUse"
				patternTransform="rotate({angle + (scene.seed % 30)})"
			>
				<path d="M0 0.5H4" stroke={scene.furrow} stroke-width="0.7" opacity="0.28" />
			</pattern>
		{/each}
		<radialGradient id={id("vignette")} cx="50%" cy="50%" r="72%">
			<stop offset="55%" stop-color="#000" stop-opacity="0" />
			<stop offset="100%" stop-color="#000" stop-opacity="1" />
		</radialGradient>
	</defs>

	<g clip-path={url("frame")}>
		<!-- ── The image ── -->
		<g class="develop">
			<g filter={scene.mode === "ir" && irPalette !== "white" ? url("palette") : undefined}>
				<rect width={FRAME_W} height={FRAME_H} fill={scene.base} />
				<g filter={scene.tone.speckle ? url("speckle") : scene.tone.blur ? url("irblur") : undefined}>
					<g transform={scene.view || undefined}>
						<g filter={scene.relief ? url("relief") : undefined}>
							<rect x="-200" y="-200" width={FRAME_W + 400} height={FRAME_H + 400} fill={scene.base} />
							{@render prims(scene.ground)}
						</g>
						{@render prims(scene.features)}
						{@render prims(scene.objects)}
						{@render prims(scene.effects)}
					</g>
				</g>
				{@render prims(scene.atmosphere)}
				{#if scene.tone.haze}
					<rect width={FRAME_W} height={FRAME_H} fill={scene.tone.hazeColor} opacity={scene.tone.haze} />
				{/if}
				{#if scene.tone.tint}
					<rect
						width={FRAME_W}
						height={FRAME_H}
						fill={scene.tone.tint.color}
						opacity={scene.tone.tint.op}
						style="mix-blend-mode: multiply"
					/>
				{/if}
				{#if scene.tone.darkness}
					<rect width={FRAME_W} height={FRAME_H} fill="#020403" opacity={scene.tone.darkness} />
				{/if}
				{#if scene.lights.length}
					<g transform={scene.view || undefined}>{@render prims(scene.lights)}</g>
				{/if}
				{#if scene.tone.grain}
					<rect
						width={FRAME_W}
						height={FRAME_H}
						filter={url("grain")}
						opacity={scene.tone.grain * 0.5}
						style="mix-blend-mode: overlay"
					/>
				{/if}
				{#if scene.tone.static}
					<rect width={FRAME_W} height={FRAME_H} filter={url("static")} opacity={scene.tone.static} />
					{#each [70, 152, 236, 300] as y, i (y)}
						<rect x="0" {y} width={FRAME_W} height={6 + i * 3} fill="#d8d8d8" opacity="0.18" />
					{/each}
				{/if}
			</g>
		</g>
		{#if scene.tone.vignette}
			<rect width={FRAME_W} height={FRAME_H} fill={url("vignette")} opacity={scene.tone.vignette} />
		{/if}

		{#if variant !== "bare"}
			<!-- ── HUD ── -->
			<g fill="none" stroke={hud} stroke-width={full ? 1.4 : 2.4} opacity="0.85">
				{#each [[10, 10, 1, 1], [FRAME_W - 10, 10, -1, 1], [10, FRAME_H - 10, 1, -1], [FRAME_W - 10, FRAME_H - 10, -1, -1]] as [x, y, sx, sy] (`${x}-${y}`)}
					<path d="M{x} {y + sy * 22}V{y}H{x + sx * 22}" />
				{/each}
				{#if scene.platform === "drone"}
					<circle cx={FRAME_W / 2} cy={FRAME_H / 2} r="16" stroke-width="1" opacity="0.7" />
					<path
						d="M{FRAME_W / 2 - 34} {FRAME_H / 2}h22M{FRAME_W / 2 + 12} {FRAME_H / 2}h22M{FRAME_W / 2} {FRAME_H / 2 -
							34}v22M{FRAME_W / 2} {FRAME_H / 2 + 12}v22"
						stroke-width="1"
					/>
				{:else}
					<path
						d="M{FRAME_W / 2 - 8} {FRAME_H / 2}h5M{FRAME_W / 2 + 3} {FRAME_H / 2}h5M{FRAME_W / 2} {FRAME_H / 2 -
							8}v5M{FRAME_W / 2} {FRAME_H / 2 + 3}v5"
						stroke-width="1"
					/>
				{/if}
			</g>

			<!-- Detection boxes: corner brackets, label tab with an icon. -->
			{#each scene.detections as d, i (i)}
				{@const c = boxColor(d.kind)}
				{@const k = Math.min(6, d.w / 3, d.h / 3)}
				{@const Icon = ICON[d.icon]}
				<g stroke={c} stroke-width={full ? 1.1 : 2} fill="none">
					<path
						d="M{d.x} {d.y + k}V{d.y}H{d.x + k}M{d.x + d.w - k} {d.y}H{d.x + d.w}V{d.y + k}M{d.x + d.w} {d.y +
							d.h -
							k}V{d.y + d.h}H{d.x + d.w - k}M{d.x + k} {d.y + d.h}H{d.x}V{d.y + d.h - k}"
					/>
					{#if full}<rect x={d.x} y={d.y} width={d.w} height={d.h} stroke-width="0.5" opacity="0.35" />{/if}
				</g>
				{#if full}
					{@const { x: lx, y: ly, w: lw } = labels[i]!}
					<g>
						<rect x={lx} y={ly} width={lw} height="11" fill="#000" opacity="0.62" />
						<Icon x={lx + 1.5} y={ly + 1.5} width="8" height="8" color={c} />
						<text x={lx + 12} y={ly + 8.3} font-size="8" fill={c}>
							{d.label}{#if d.detail}<tspan fill="#e8f0e8" opacity="0.85">{"\u00a0" + d.detail}</tspan>{/if}
						</text>
					</g>
				{/if}
			{/each}

			{#if full}
				<!-- Classification banner -->
				<rect x={FRAME_W / 2 - 78} y="0" width="156" height="12" fill="#000" opacity="0.6" />
				<text x={FRAME_W / 2} y="9" font-size="8" fill="#ff8a7a" text-anchor="middle" letter-spacing="1.5">
					SECRET // REL BLOC
				</text>
				<!-- Sensor and platform -->
				<g fill={hud} font-size="9">
					<PlatformIcon x="16" y="15" width="11" height="11" color={hud} />
					<text x="31" y="24">{sensor?.short ?? input.sensor} · {modeTag}</text>
					<text x="16" y="36" font-size="7.5" opacity="0.75">
						FRM {String(input.reportId).padStart(6, "0")}{scene.platform === "drone"
							? ` · ALT ${1200 + (input.reportId % 7) * 150} M · HDG ${String((scene.heading + 360) % 360).padStart(3, "0")}`
							: scene.platform === "satellite"
								? ` · REV ${(input.reportId * 37) % 9000}`
								: ""}
					</text>
					{#if scene.mode === "ir"}<IconThermal x="16" y="40" width="10" height="10" color={hud} />{/if}
					<!-- Time and conditions -->
					<text x={FRAME_W - 16} y="24" text-anchor="end">{stamp(input.observedAt)}</text>
					<WeatherIcon x={FRAME_W - 28} y="28" width="11" height="11" color={hud} />
					{#if input.findings.conditions.night}<IconNight
							x={FRAME_W - 42}
							y="28"
							width="11"
							height="11"
							color={hud}
						/>{/if}
					<text
						x={FRAME_W - 46 - (input.findings.conditions.night ? 0 : -14)}
						y="36.5"
						text-anchor="end"
						font-size="7.5"
						opacity="0.75"
					>
						VIS {Math.round(scene.visibility * 100)}%
					</text>
					<!-- Position -->
					<text x="16" y={FRAME_H - 16}>{latlon}</text>
					<text x="16" y={FRAME_H - 28} font-size="7.5" opacity="0.75">
						GSD {scene.platform === "drone" ? "0.1" : "0.5"} M · {input.findings.conditions.cover.toUpperCase()}
					</text>
				</g>
				<!-- Scale bar and north arrow -->
				{@const sx = FRAME_W - 26 - scene.scale.px}
				<g stroke={hud} stroke-width="1.2" fill="none">
					<path
						d="M{sx} {FRAME_H - 20}v-5M{sx} {FRAME_H - 22.5}h{scene.scale.px}M{sx + scene.scale.px} {FRAME_H - 20}v-5"
					/>
					<path d="M{sx + scene.scale.px / 2} {FRAME_H - 21}v-3" stroke-width="0.8" />
				</g>
				<text x={sx + scene.scale.px / 2} y={FRAME_H - 28} font-size="7.5" fill={hud} text-anchor="middle">
					{scene.scale.meters} M
				</text>
				<g transform="translate({FRAME_W - 24} 58) rotate({-scene.heading})">
					<path d="M0 -11L4 4L0 1L-4 4Z" fill={hud} opacity="0.85" />
					<text y="-14" font-size="7.5" fill={hud} text-anchor="middle">N</text>
				</g>
			{:else}
				<g>
					<rect x="0" y="0" width="92" height="24" fill="#000" opacity="0.55" />
					<PlatformIcon x="5" y="4" width="16" height="16" color={hud} />
					<text x="25" y="17" font-size="13" fill={hud}>{scene.mode.toUpperCase()}</text>
					{#if input.findings.conditions.night}<IconNight x="70" y="5" width="15" height="15" color={hud} />{/if}
				</g>
			{/if}
		{/if}

		<!-- No usable picture -->
		{#if scene.status !== "ok"}
			{@const lost = scene.status === "intercepted"}
			{@const StatusIcon = lost ? IconSignalOff : IconEyeOff}
			<g transform="translate({FRAME_W / 2} {FRAME_H / 2})">
				<rect x="-120" y="-24" width="240" height="48" fill="#000" opacity="0.7" />
				<rect
					x="-120"
					y="-24"
					width="240"
					height="48"
					fill="none"
					stroke={lost ? hostileBox : box}
					stroke-width="1.5"
				/>
				<StatusIcon x="-110" y="-14" width="28" height="28" color={lost ? hostileBox : box} />
				<text x="-74" y="-2" font-size={full ? 13 : 20} fill={lost ? hostileBox : box} font-weight="bold">
					{lost ? "LINK LOST" : "NO USABLE IMAGERY"}
				</text>
				{#if full}
					<text x="-74" y="13" font-size="8" fill="#e8f0e8">
						{lost
							? `PLATFORM DOWN · ${input.findings.airDefence?.units ?? "?"} AD ENGAGED`
							: `${input.findings.conditions.night ? "NIGHT" : ""}${input.findings.conditions.night && w !== "clear" ? " · " : ""}${w !== "clear" ? w.toUpperCase() : ""} · SENSOR BLIND`}
					</text>
				{/if}
			</g>
		{/if}

		{#if motion}
			<rect class="scanline" x="0" y="0" width={FRAME_W} height="3" fill="#bfffd0" opacity="0.5" />
		{/if}
	</g>
</svg>

<style>
	/* A dark halo keeps HUD text legible over cloud and bright ground. */
	.sensor-image text {
		paint-order: stroke;
		stroke: rgb(0 0 0 / 0.6);
		stroke-width: 2px;
		stroke-linejoin: round;
	}
	.developing .develop {
		animation: develop 1.1s ease-out both;
	}
	@keyframes develop {
		from {
			opacity: 0.15;
			filter: contrast(2.2) brightness(0.4);
		}
		to {
			opacity: 1;
			filter: none;
		}
	}
	.scanline {
		animation: scan 1.2s ease-in-out both;
	}
	@keyframes scan {
		from {
			transform: translateY(0);
			opacity: 0.6;
		}
		to {
			transform: translateY(400px);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.developing .develop,
		.scanline {
			animation: none;
		}
	}
</style>
