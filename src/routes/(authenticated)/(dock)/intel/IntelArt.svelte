<!-- Small animated reconnaissance vignettes for the intel console: a sweeping
     radar, a drone on a flight path, a target reticle and a stack of INTREPs
     under a scanning beam. Theme-aware, and motionless under reduced motion. -->
<script lang="ts">
	type Kind = "scan" | "tasked" | "picture" | "archive";
	let { kind, label, class: className = "" }: { kind: Kind; label?: string; class?: string } = $props();

	const ink = "var(--color-primary)";
	const hot = "var(--color-error)";
	const soft = "var(--color-fg-muted)";
</script>

<figure class="intel-art animate-rise-in {className}" aria-label={label}>
	<svg viewBox="0 0 160 64" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
		{#if kind === "scan"}
			<circle cx="80" cy="32" r="28" fill={ink} fill-opacity="0.06" stroke={ink} stroke-opacity="0.35" />
			<circle cx="80" cy="32" r="18" fill="none" stroke={ink} stroke-opacity="0.25" />
			<circle cx="80" cy="32" r="8" fill="none" stroke={ink} stroke-opacity="0.35" />
			<g class="sweep" style="transform-origin: 80px 32px">
				<path d="M80 32 L80 4 A28 28 0 0 1 102 12 Z" fill={ink} fill-opacity="0.18" />
				<path d="M80 32 L80 4" stroke={ink} stroke-width="1.5" />
			</g>
			<circle class="blip blip-a" cx="98" cy="20" r="3" fill={hot} />
			<circle class="blip blip-b" cx="64" cy="44" r="2.5" fill={ink} />
			<circle cx="80" cy="32" r="2.5" fill={ink} />
		{:else if kind === "tasked"}
			<path d="M12 50 Q70 6 148 26" fill="none" stroke={soft} stroke-opacity="0.35" stroke-width="2" stroke-dasharray="3 5" />
			<path class="dash" d="M12 50 Q70 6 148 26" fill="none" stroke={ink} stroke-width="2" stroke-dasharray="7 7" />
			<g class="drone">
				<path d="M0 -5 l7 5 l-7 5 l-7 -5 z" fill={ink} fill-opacity="0.4" stroke={ink} />
				<path d="M-7 -5 h14" stroke={ink} stroke-width="1.5" />
			</g>
			<g class="pulse">
				<circle cx="148" cy="26" r="7" fill="none" stroke={hot} stroke-width="1.5" />
				<path d="M148 15 v22 M137 26 h22" stroke={hot} stroke-opacity="0.6" stroke-width="1" />
			</g>
			<circle cx="12" cy="50" r="4" fill={ink} />
		{:else if kind === "picture"}
			<g class="pulse">
				<circle cx="54" cy="32" r="18" fill={ink} fill-opacity="0.08" stroke={ink} stroke-width="1.5" />
				<circle cx="54" cy="32" r="9" fill="none" stroke={ink} stroke-opacity="0.6" stroke-dasharray="3 3" />
				<path d="M54 8 v10 M54 46 v10 M30 32 h10 M68 32 h10" stroke={ink} stroke-width="1.5" />
			</g>
			{#each [0, 1, 2, 3] as i}
				<rect x="94" y={12 + i * 11} width="52" height="5" rx="2.5" fill={ink} fill-opacity="0.18" />
				<rect
					class="meter meter-{i}"
					x="94"
					y={12 + i * 11}
					width={[44, 32, 20, 10][i]}
					height="5"
					rx="2.5"
					fill={i === 3 ? hot : ink}
					fill-opacity="0.7"
				/>
			{/each}
		{:else if kind === "archive"}
			<rect x="34" y="10" width="76" height="48" rx="3" fill="var(--color-surface-1)" stroke={soft} stroke-opacity="0.5" />
			<rect x="40" y="16" width="76" height="48" rx="3" fill="var(--color-surface-2)" stroke={soft} stroke-opacity="0.7" />
			<rect x="46" y="22" width="76" height="48" rx="3" fill={ink} fill-opacity="0.08" stroke={ink} stroke-opacity="0.6" />
			<path d="M54 32 h56 M54 39 h40 M54 46 h48 M54 53 h28" stroke={soft} stroke-opacity="0.5" stroke-width="2" />
			<g class="scan-line">
				<rect x="46" y="22" width="76" height="3" fill={ink} fill-opacity="0.55" />
			</g>
		{/if}
	</svg>
	{#if label}<figcaption>{label}</figcaption>{/if}
</figure>

<style>
	@reference "../../../../app.css";

	.intel-art {
		@apply relative m-0 flex h-16 min-w-32 items-center overflow-hidden rounded-sm border border-line/15 bg-surface-2/50 px-1;
	}
	.intel-art :global(svg) {
		@apply block h-full w-full;
	}
	.intel-art figcaption {
		@apply sr-only;
	}
	.sweep {
		animation: intel-spin 5s linear infinite;
	}
	.blip {
		animation: intel-pulse 1.8s ease-in-out infinite;
	}
	.blip-b {
		animation-delay: -0.9s;
	}
	.dash {
		animation: intel-dash 1.4s linear infinite;
	}
	.drone {
		animation: intel-fly 4s ease-in-out infinite;
	}
	.pulse {
		animation: intel-pulse 2.4s ease-in-out infinite;
	}
	.meter {
		animation: intel-meter 2.6s ease-in-out infinite;
	}
	.meter-1 {
		animation-delay: -0.6s;
	}
	.meter-2 {
		animation-delay: -1.2s;
	}
	.meter-3 {
		animation-delay: -1.8s;
	}
	.scan-line {
		animation: intel-scan 2.8s ease-in-out infinite;
	}
	@keyframes intel-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes intel-pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes intel-dash {
		to {
			stroke-dashoffset: -28;
		}
	}
	@keyframes intel-fly {
		0% {
			transform: translate(4px, 44px) rotate(25deg);
			opacity: 0.5;
		}
		50% {
			transform: translate(72px, 16px) rotate(-8deg);
			opacity: 1;
		}
		100% {
			transform: translate(142px, 24px) rotate(0deg);
			opacity: 0.5;
		}
	}
	@keyframes intel-meter {
		0%,
		100% {
			opacity: 0.45;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes intel-scan {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.25;
		}
		50% {
			transform: translateY(44px);
			opacity: 0.9;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sweep,
		.blip,
		.dash,
		.drone,
		.pulse,
		.meter,
		.scan-line {
			animation: none;
		}
	}
</style>
