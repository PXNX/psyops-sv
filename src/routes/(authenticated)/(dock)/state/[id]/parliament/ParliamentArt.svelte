<!-- Animated, theme-coloured chamber scene for the parliament header. Ambient
     loops only; everything stops under prefers-reduced-motion. -->
<script lang="ts">
	interface Props {
		class?: string;
		label?: string;
	}
	let { class: className = "", label = "The chamber in session" }: Props = $props();
	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
	const glowId = `chamber-glow-${idSuffix}`;
</script>

<svg class={className} viewBox="0 0 520 130" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
	<defs>
		<radialGradient id={glowId}>
			<stop offset="0" stop-color="var(--color-politics)" stop-opacity="0.3" />
			<stop offset="1" stop-color="var(--color-politics)" stop-opacity="0" />
		</radialGradient>
	</defs>
	<ellipse cx="260" cy="140" rx="230" ry="120" fill={`url(#${glowId})`} class="glow" />
	<!-- banners on the back wall -->
	<g class="banners">
		{#each [90, 170, 260, 350, 430] as x (x)}
			<path
				d="M{x - 14} 18h28l-3 40-11 8-11-8z"
				fill="var(--color-politics)"
				fill-opacity="0.16"
				stroke="var(--color-politics)"
				stroke-opacity="0.45"
			/>
		{/each}
	</g>
	<!-- the hemicycle, drawn as three tiers of dots -->
	<g fill="var(--color-politics)" fill-opacity="0.55">
		{#each Array(34) as _, i (i)}
			{@const a = Math.PI - (i / 33) * Math.PI}
			<circle cx={260 + 104 * Math.cos(a)} cy={104 - 72 * Math.sin(a)} r="2.6" class="seat-a" style="--i:{i}" />
		{/each}
	</g>
	<g fill="var(--color-primary)" fill-opacity="0.45">
		{#each Array(24) as _, i (i)}
			{@const a = Math.PI - (i / 23) * Math.PI}
			<circle cx={260 + 76 * Math.cos(a)} cy={104 - 52 * Math.sin(a)} r="2.4" class="seat-b" style="--i:{i}" />
		{/each}
	</g>
	<!-- rostrum -->
	<path d="M228 104h64l10 26H218z" fill="var(--color-surface-6)" stroke="var(--color-line)" stroke-opacity="0.5" />
	<path d="M244 86h32l6 18h-44z" fill="var(--color-politics)" fill-opacity="0.2" stroke="var(--color-politics)" stroke-opacity="0.5" />
	<circle cx="260" cy="94" r="2.5" fill="var(--color-politics)" class="speaker" />
</svg>

<style>
	svg { display: block; }
	.glow { transform-box: fill-box; transform-origin: center; animation: breathe 7s ease-in-out infinite; }
	.banners { transform-origin: 260px 18px; animation: sway 9s ease-in-out infinite; }
	.seat-a, .seat-b { animation: twinkle 4s ease-in-out infinite; animation-delay: calc(var(--i) * 35ms); }
	.speaker { animation: pulse 2.8s ease-in-out infinite; }

	@keyframes breathe { 0%,100% { opacity: 0.65; transform: scale(0.97); } 50% { opacity: 1; transform: scale(1.04); } }
	@keyframes sway { 0%,100% { transform: rotate(-1.2deg); } 50% { transform: rotate(1.2deg); } }
	@keyframes twinkle { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
	@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

	@media (prefers-reduced-motion: reduce) {
		.glow, .banners, .seat-a, .seat-b, .speaker { animation: none; }
	}
</style>
