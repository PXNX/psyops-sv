<!-- Animated, theme-coloured illustrations for the operations console.
     Ambient loops only (no entrance fades) so view-transition snapshots never
     catch the page mid-animation. Everything stops under reduced motion. -->
<script lang="ts">
	export type OpsArtKind = "radar" | "cyber" | "psyops" | "shield" | "trace";

	interface Props {
		kind: OpsArtKind;
		class?: string;
		label?: string;
	}
	let { kind, class: className = "", label }: Props = $props();

	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
	const sweepId = `sweep-${idSuffix}`;
	const glowId = `glow-${idSuffix}`;
</script>

{#if kind === "radar"}
	<svg class={className} viewBox="0 0 460 170" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label ?? "Radar scanning for hostile signals"}>
		<defs>
			<linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="var(--color-primary)" stop-opacity="0.38" />
				<stop offset="1" stop-color="var(--color-primary)" stop-opacity="0" />
			</linearGradient>
			<radialGradient id={glowId}>
				<stop offset="0" stop-color="var(--color-primary)" stop-opacity="0.2" />
				<stop offset="1" stop-color="var(--color-primary)" stop-opacity="0" />
			</radialGradient>
		</defs>
		<g class="grid-lines" stroke="var(--color-line)" stroke-opacity="0.25" stroke-width="1">
			{#each [26, 52, 78, 104, 130, 156] as y (y)}<line x1="0" y1={y} x2="460" y2={y} />{/each}
			{#each [20, 80, 140, 200, 260, 320, 380, 440] as x (x)}<line x1={x} y1="0" x2={x} y2="170" />{/each}
		</g>
		<circle cx="85" cy="85" r="82" fill={`url(#${glowId})`} />
		<g transform="translate(85 85)" fill="none" stroke="var(--color-primary)" stroke-opacity="0.5">
			<circle r="78" stroke-opacity="0.45" />
			<circle r="52" stroke-opacity="0.3" />
			<circle r="26" stroke-opacity="0.22" />
			<line x1="-78" x2="78" stroke-opacity="0.22" />
			<line y1="-78" y2="78" stroke-opacity="0.22" />
		</g>
		<g class="sweep" transform="translate(85 85)">
			<path d="M0 0 L78 0 A78 78 0 0 0 55 -55 Z" fill={`url(#${sweepId})`} />
			<line x1="0" y1="0" x2="78" y2="0" stroke="var(--color-primary)" stroke-width="1.5" stroke-opacity="0.8" />
		</g>
		<g class="blips" fill="var(--color-hostile, var(--color-error))">
			<circle class="blip-one" cx="128" cy="50" r="3.5" />
			<circle class="blip-two" cx="46" cy="118" r="2.8" />
			<circle class="blip-three" cx="140" cy="120" r="3" />
		</g>
		<g fill="none" stroke="var(--color-positive)" stroke-width="1.5" stroke-linecap="round" class="signal">
			<path d="M210 108 h24 l10 -30 12 58 12 -44 10 20 h26 l8 -18 10 34 12 -24 h28" />
		</g>
		<g fill="var(--color-fg-muted)" class="pulse-dots">
			<circle class="dot-one" cx="210" cy="108" r="2.5" />
			<circle class="dot-two" cx="392" cy="104" r="2.5" />
		</g>
	</svg>
{:else if kind === "cyber"}
	<svg class={className} viewBox="0 0 40 40" role="img" aria-label={label ?? "Cyber operations"}>
		<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<circle class="orbit" cx="20" cy="20" r="14" stroke-opacity="0.35" />
			<circle cx="20" cy="20" r="7" />
			<path d="M20 3v6M20 31v6M3 20h6M31 20h6" />
		</g>
		<circle class="core" cx="20" cy="20" r="3" fill="currentColor" />
	</svg>
{:else if kind === "psyops"}
	<svg class={className} viewBox="0 0 40 40" role="img" aria-label={label ?? "Psychological operations"}>
		<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<circle cx="20" cy="26" r="4" />
			<path d="M20 22V8" />
			<path class="wave-one" d="M12 12a11 11 0 0 1 16 0" />
			<path class="wave-two" d="M7 7a18 18 0 0 1 26 0" />
		</g>
		<circle class="core" cx="20" cy="26" r="1.5" fill="currentColor" />
	</svg>
{:else if kind === "shield"}
	<svg class={className} viewBox="0 0 120 120" role="img" aria-label={label ?? "Cyber defence"}>
		<defs>
			<radialGradient id={glowId}>
				<stop offset="0" stop-color="var(--color-positive)" stop-opacity="0.24" />
				<stop offset="1" stop-color="var(--color-positive)" stop-opacity="0" />
			</radialGradient>
		</defs>
		<circle cx="60" cy="60" r="56" fill={`url(#${glowId})`} class="breath" />
		<path
			d="M60 14 96 28v28c0 22-15 38-36 48-21-10-36-26-36-48V28z"
			fill="var(--color-positive)"
			fill-opacity="0.08"
			stroke="var(--color-positive)"
			stroke-opacity="0.6"
			stroke-width="2"
		/>
		<g class="locks" fill="none" stroke="var(--color-positive)" stroke-width="2.5" stroke-linecap="round">
			<path d="M60 46v22" />
			<path d="M60 82v2" />
			<path d="M44 60a16 16 0 0 1 32 0" stroke-opacity="0.5" />
		</g>
	</svg>
{:else}
	<svg class={className} viewBox="0 0 300 40" preserveAspectRatio="none" role="img" aria-label={label ?? "Signal trace"}>
		<g fill="none" stroke="var(--color-primary)" stroke-opacity="0.18" stroke-width="1">
			<path d="M0 20h300M0 8h300M0 32h300" />
		</g>
		<path class="trace" d="M0 20h60l12-11 14 22 14-17 13 12h45l12-8 13 16 14-14h103" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-opacity="0.5" />
	</svg>
{/if}

<style>
	svg {
		display: block;
	}
	.sweep {
		transform-box: fill-box;
		transform-origin: center;
		animation: scan 6s linear infinite;
	}
	.blips circle {
		transform-box: fill-box;
		transform-origin: center;
	}
	.blip-one {
		animation: blink 6s ease-in-out 0.4s infinite;
	}
	.blip-two {
		animation: blink 6s ease-in-out 2.7s infinite;
	}
	.blip-three {
		animation: blink 6s ease-in-out 4.3s infinite;
	}
	.signal path {
		stroke-dasharray: 240;
		animation: draw 5s ease-in-out infinite;
	}
	.pulse-dots circle {
		animation: dot-pulse 2.8s ease-in-out infinite;
	}
	.dot-two {
		animation-delay: 1.4s;
	}
	.orbit {
		transform-box: fill-box;
		transform-origin: center;
		animation: scan 9s linear infinite;
	}
	.core {
		animation: glow 2.4s ease-in-out infinite;
	}
	.wave-one,
	.wave-two {
		animation: wave 2.6s ease-in-out infinite;
	}
	.wave-two {
		animation-delay: 0.5s;
	}
	.breath {
		transform-box: fill-box;
		transform-origin: center;
		animation: breathe 4s ease-in-out infinite;
	}
	.locks {
		animation: glow 3s ease-in-out infinite;
	}
	.trace {
		stroke-dasharray: 320;
		animation: draw 7s linear infinite;
	}

	@keyframes scan {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes blink {
		0%,
		100% {
			opacity: 0.15;
			transform: scale(0.7);
		}
		/* eslint-disable-next-line */
		8%,
		18% {
			opacity: 1;
			transform: scale(1.7);
		}
	}
	@keyframes draw {
		0% {
			stroke-dashoffset: 240;
			opacity: 0;
		}
		15%,
		80% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: 0;
			opacity: 0;
		}
	}
	@keyframes dot-pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes glow {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes wave {
		0%,
		100% {
			opacity: 0.4;
			transform: translateY(1px);
		}
		50% {
			opacity: 1;
			transform: translateY(-1px);
		}
	}
	@keyframes breathe {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(0.94);
		}
		50% {
			opacity: 1;
			transform: scale(1.06);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sweep,
		.blips circle,
		.signal path,
		.pulse-dots circle,
		.orbit,
		.core,
		.wave-one,
		.wave-two,
		.breath,
		.locks,
		.trace {
			animation: none;
		}
	}
</style>
