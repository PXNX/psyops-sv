<!-- Quiet heraldic banner for the state dossier: an animated seal, a survey
     grid and light sweeping across the flag. Ambient only, theme colours. -->
<script lang="ts">
	interface Props {
		class?: string;
		label?: string;
	}
	let { class: className = "", label = "State dossier" }: Props = $props();
	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
	const glowId = `dossier-glow-${idSuffix}`;
</script>

<svg class={className} viewBox="0 0 560 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
	<defs>
		<radialGradient id={glowId}>
			<stop offset="0" stop-color="var(--color-primary)" stop-opacity="0.22" />
			<stop offset="1" stop-color="var(--color-primary)" stop-opacity="0" />
		</radialGradient>
	</defs>
	<circle cx="440" cy="60" r="110" fill={`url(#${glowId})`} class="halo" />
	<g stroke="var(--color-line)" stroke-opacity="0.2" stroke-width="1">
		{#each [30, 66, 102, 138, 174] as y (y)}<line x1="0" y1={y} x2="560" y2={y} />{/each}
		{#each [40, 100, 160, 220, 280, 340, 400, 460, 520] as x (x)}<line x1={x} y1="0" {x} y2="180" />{/each}
	</g>
	<!-- survey rings and compass ticks -->
	<g transform="translate(452 90)" fill="none" stroke="var(--color-primary)" stroke-opacity="0.4">
		<circle r="62" />
		<circle r="44" stroke-opacity="0.25" />
		<circle r="26" stroke-opacity="0.2" />
		{#each Array(12) as _, i (i)}
			{@const a = (i / 12) * Math.PI * 2}
			<line x1={Math.cos(a) * 52} y1={Math.sin(a) * 52} x2={Math.cos(a) * 62} y2={Math.sin(a) * 62} />
		{/each}
	</g>
	<g class="needle" transform="translate(452 90)">
		<path d="M0 0 L54 -8 L54 8 Z" fill="var(--color-primary)" fill-opacity="0.22" />
	</g>
	<!-- a light band crossing the flag -->
	<g class="sheen">
		<path d="M-120 0 L-40 0 L120 180 L40 180 Z" fill="var(--color-fg)" fill-opacity="0.045" />
	</g>
</svg>

<style>
	svg { display: block; }
	.halo { transform-box: fill-box; transform-origin: center; animation: breathe 8s ease-in-out infinite; }
	.needle { transform-box: fill-box; transform-origin: center; animation: sweep 18s linear infinite; }
	.sheen { animation: drift 12s ease-in-out infinite; }
	@keyframes breathe { 0%,100% { opacity: 0.6; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.05); } }
	@keyframes sweep { to { transform: rotate(360deg); } }
	@keyframes drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(360px); } }
	@media (prefers-reduced-motion: reduce) { .halo, .needle, .sheen { animation: none; } }
</style>
