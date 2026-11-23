<!-- Animated vignettes for the domain console. Each one is a tiny, thematic
     SVG scene: flowing supply lines, a sweeping radar, an orbiting satellite,
     a pulsing neural net. Colours follow the active theme and all motion stops
     under prefers-reduced-motion. -->
<script lang="ts">
	type Kind = "supply" | "autonomy" | "convoy" | "trade" | "sea" | "space" | "ai" | "smuggling";
	let { kind, label, class: className = "" }: { kind: Kind; label?: string; class?: string } = $props();

	const ink = "var(--color-primary)";
	const friendly = "var(--color-friendly)";
	const soft = "var(--color-fg-muted)";
</script>

<figure class="domain-art animate-rise-in {className}" aria-label={label}>
	<svg viewBox="0 0 160 64" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
		{#if kind === "supply"}
			<path d="M8 48 H152" stroke={soft} stroke-opacity="0.35" stroke-width="2" />
			<path class="dash" d="M8 48 H152" stroke={ink} stroke-width="2" stroke-dasharray="6 7" />
			<g class="truck">
				<rect x="26" y="28" width="30" height="16" rx="2" fill={ink} fill-opacity="0.22" stroke={ink} />
				<rect x="58" y="33" width="16" height="11" rx="2" fill={friendly} fill-opacity="0.3" stroke={friendly} />
				<circle cx="36" cy="46" r="3.5" fill="var(--color-surface-1)" stroke={ink} />
				<circle cx="65" cy="46" r="3.5" fill="var(--color-surface-1)" stroke={ink} />
			</g>
			<g class="truck truck-late">
				<rect x="96" y="28" width="30" height="16" rx="2" fill={ink} fill-opacity="0.16" stroke={ink} />
				<circle cx="104" cy="46" r="3.5" fill="var(--color-surface-1)" stroke={ink} />
				<circle cx="120" cy="46" r="3.5" fill="var(--color-surface-1)" stroke={ink} />
			</g>
		{:else if kind === "autonomy"}
			<path class="dash" d="M18 20 H62 V38" fill="none" stroke={friendly} stroke-width="2" />
			<path class="dash dash-late" d="M18 50 H48 V38" fill="none" stroke={ink} stroke-width="2" />
			<circle cx="14" cy="20" r="4" fill={friendly} />
			<circle cx="14" cy="50" r="4" fill={ink} />
			<g class="pulse">
				<path d="M62 52 V30 L76 24 L90 30 V52 Z" fill={ink} fill-opacity="0.18" stroke={ink} stroke-width="1.5" />
				<rect x="80" y="12" width="8" height="14" rx="1" fill={ink} fill-opacity="0.4" stroke={ink} />
				<path d="M70 40 h16" stroke={friendly} stroke-width="2" />
			</g>
			<path class="dash dash-late" d="M92 38 H146" stroke={ink} stroke-width="2" />
			<circle cx="150" cy="38" r="4" fill={ink} />
		{:else if kind === "convoy"}
			<path d="M14 46 Q80 12 146 46" fill="none" stroke={soft} stroke-opacity="0.35" stroke-width="2" />
			<path class="dash" d="M14 46 Q80 12 146 46" fill="none" stroke={ink} stroke-width="2" />
			<g class="truck">
				<rect x="60" y="16" width="22" height="12" rx="2" fill={ink} fill-opacity="0.25" stroke={ink} />
				<circle cx="66" cy="29" r="3" fill="var(--color-surface-1)" stroke={ink} />
				<circle cx="77" cy="29" r="3" fill="var(--color-surface-1)" stroke={ink} />
			</g>
			<circle cx="14" cy="46" r="4" fill={friendly} />
			<circle cx="146" cy="46" r="4" fill={friendly} />
		{:else if kind === "trade"}
			<g class="float">
				<path d="M14 18 l20 -6 l10 4 l-8 6 l10 4 l-22 6 l-10 -6 z" fill={ink} fill-opacity="0.28" stroke={ink} />
			</g>
			<path class="dash" d="M22 30 Q70 40 118 26" fill="none" stroke={ink} stroke-width="2" />
			<g class="boat">
				<path d="M112 40 h30 l-6 10 h-18 z" fill={friendly} fill-opacity="0.28" stroke={friendly} />
				<path d="M126 40 V26 h10" fill="none" stroke={friendly} stroke-width="2" />
			</g>
			<path d="M8 54 H152" stroke={soft} stroke-opacity="0.3" stroke-width="2" />
			<circle cx="14" cy="18" r="2.5" fill={ink} />
			<circle cx="146" cy="40" r="2.5" fill={friendly} />
		{:else if kind === "sea"}
			<path class="wave" d="M8 44 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke={ink} stroke-opacity="0.5" stroke-width="2" />
			<path class="wave wave-late" d="M8 52 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke={friendly} stroke-opacity="0.4" stroke-width="2" />
			<g class="boat">
				<path d="M56 40 h44 l-10 12 H66 z" fill={ink} fill-opacity="0.28" stroke={ink} />
				<rect x="76" y="22" width="16" height="18" fill={ink} fill-opacity="0.35" stroke={ink} />
			</g>
			<g class="radar" style="transform-origin: 80px 40px">
				<path d="M80 40 L80 8 A32 32 0 0 1 104 17 Z" fill={friendly} fill-opacity="0.12" />
				<path d="M80 40 L80 8" stroke={friendly} stroke-width="1.5" />
			</g>
			<circle cx="80" cy="40" r="3" fill={friendly} />
		{:else if kind === "space"}
			<path d="M-10 74 Q80 26 170 74" fill={ink} fill-opacity="0.08" stroke={ink} stroke-opacity="0.5" stroke-width="2" />
			<g class="orbit" style="transform-origin: 80px 64px">
				<ellipse cx="80" cy="64" rx="58" ry="20" fill="none" stroke={soft} stroke-opacity="0.4" stroke-dasharray="4 5" />
				<g class="satellite">
					<rect x="72" y="38" width="16" height="10" rx="2" fill={ink} fill-opacity="0.35" stroke={ink} />
					<rect x="60" y="39" width="11" height="8" fill={friendly} fill-opacity="0.35" stroke={friendly} />
					<rect x="89" y="39" width="11" height="8" fill={friendly} fill-opacity="0.35" stroke={friendly} />
				</g>
			</g>
			<g class="pulse">
				<path d="M76 24 a8 8 0 0 1 8 0" fill="none" stroke={ink} stroke-width="1.5" />
				<path d="M71 18 a15 15 0 0 1 18 0" fill="none" stroke={ink} stroke-opacity="0.6" stroke-width="1.5" />
			</g>
		{:else if kind === "ai"}
			{#each [[24, 18], [48, 40], [24, 50], [82, 18], [82, 50], [112, 34], [138, 18], [138, 50]] as node, i}
				<circle cx={node[0]} cy={node[1]} r={i % 3 === 0 ? 5 : 3.5} fill={i % 2 ? friendly : ink} fill-opacity="0.55" class="pulse" style="animation-delay:{i * 120}ms" />
			{/each}
			<g stroke={ink} stroke-opacity="0.45" stroke-width="1.5" fill="none">
				<path class="dash" d="M27 20 L45 38 M27 48 L45 42 M51 40 L79 20 M51 42 L79 48 M85 20 L109 34 M85 48 L109 34 M115 34 L135 20 M115 34 L135 48" />
			</g>
			<rect x="100" y="26" width="22" height="16" rx="3" fill={ink} fill-opacity="0.2" stroke={ink} />
			<path d="M106 34 h10" stroke={friendly} stroke-width="2" />
		{:else if kind === "smuggling"}
			<path d="M12 50 Q40 10 74 34 T150 20" fill="none" stroke={soft} stroke-opacity="0.3" stroke-width="2" stroke-dasharray="2 5" />
			<path class="dash" d="M12 50 Q40 10 74 34 T150 20" fill="none" stroke={friendly} stroke-width="2" stroke-dasharray="5 8" />
			<g class="float">
				<path d="M50 30 h20 v16 H50 z" fill={ink} fill-opacity="0.25" stroke={ink} />
				<path d="M50 30 l10 -7 l10 7" fill="none" stroke={ink} stroke-width="1.5" />
				<path d="M56 38 h8" stroke={friendly} stroke-width="2" />
			</g>
			<circle cx="12" cy="50" r="4" fill={ink} />
			<circle cx="150" cy="20" r="4" fill={friendly} />
		{/if}
	</svg>
	{#if label}<figcaption>{label}</figcaption>{/if}
</figure>

<style>
	@reference "../../../../app.css";

	.domain-art {
		@apply relative m-0 flex h-16 min-w-32 items-center overflow-hidden rounded-sm border border-line/15 bg-surface-2/50 px-1;
	}
	.domain-art :global(svg) {
		@apply block h-full w-full;
	}
	.domain-art figcaption {
		@apply sr-only;
	}
	.dash {
		animation: domain-dash 1.6s linear infinite;
	}
	.dash-late {
		animation-delay: -0.8s;
	}
	.truck {
		animation: domain-drive 4s ease-in-out infinite;
	}
	.truck-late {
		animation-delay: -2s;
	}
	.boat {
		animation: domain-bob 3s ease-in-out infinite;
	}
	.float {
		animation: domain-float 3.4s ease-in-out infinite;
	}
	.wave {
		animation: domain-wave 2.6s ease-in-out infinite;
	}
	.wave-late {
		animation-delay: -1.3s;
	}
	.radar {
		animation: domain-spin 6s linear infinite;
	}
	.orbit {
		animation: domain-spin 14s linear infinite;
	}
	.satellite {
		animation: domain-float 2.8s ease-in-out infinite;
	}
	.pulse {
		animation: domain-pulse 2.2s ease-in-out infinite;
	}
	@keyframes domain-dash {
		to {
			stroke-dashoffset: -26;
		}
	}
	@keyframes domain-drive {
		0%,
		100% {
			transform: translateX(-6px);
			opacity: 0.75;
		}
		50% {
			transform: translateX(10px);
			opacity: 1;
		}
	}
	@keyframes domain-bob {
		0%,
		100% {
			transform: translateY(0) rotate(-1deg);
		}
		50% {
			transform: translateY(-2px) rotate(1deg);
		}
	}
	@keyframes domain-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
	@keyframes domain-wave {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 0.9;
		}
	}
	@keyframes domain-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes domain-pulse {
		0%,
		100% {
			opacity: 0.45;
		}
		50% {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dash,
		.truck,
		.boat,
		.float,
		.wave,
		.radar,
		.orbit,
		.satellite,
		.pulse {
			animation: none;
		}
	}
</style>
