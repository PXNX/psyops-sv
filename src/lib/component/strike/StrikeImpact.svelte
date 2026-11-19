<!-- src/lib/component/strike/StrikeImpact.svelte -->
<!-- The moment a strike result comes in: a trail draws in towards the target
     reticle, then a flash and a shockwave on a hit (smaller and off-centre on
     a partial hit or miss), or the trail fizzles out in a puff of sparks when
     air defence intercepts it. Purely decorative; static end state under
     prefers-reduced-motion. -->
<script lang="ts">
	interface Props {
		outcome: "hit" | "partial" | "miss" | "intercepted";
		/** Re-runs the animation when it changes (e.g. the strike id). */
		key?: number | string;
		class?: string;
	}

	let { outcome, key = 0, class: className = "" }: Props = $props();

	// Where it lands: on the reticle, beside it, or well off.
	const impact = $derived(
		outcome === "hit" ? { x: 100, y: 60 } : outcome === "partial" ? { x: 116, y: 68 } : { x: 138, y: 80 }
	);
	const intercepted = $derived(outcome === "intercepted");
	const sparks = [0, 50, 110, 170, 230, 300];
</script>

{#key key}
	<svg
		viewBox="0 0 200 120"
		class="strike-impact block w-full {className}"
		role="img"
		aria-label={intercepted ? "Strike intercepted" : `Strike ${outcome}`}
	>
		<!-- Target reticle -->
		<g class="reticle" style:stroke="var(--color-fg-muted)">
			<circle cx="100" cy="60" r="16" fill="none" stroke-width="1" />
			<circle cx="100" cy="60" r="2" fill="var(--color-fg-muted)" stroke="none" />
			<path d="M100 36v10M100 74v10M76 60h10M114 60h10" stroke-width="1" />
		</g>

		{#if intercepted}
			<!-- The trail runs in, stops short, and fizzles. -->
			<path
				class="trail trail-short"
				d="M8 108 Q 40 30 74 44"
				fill="none"
				style:stroke="var(--color-warning)"
				stroke-width="1.5"
				stroke-linecap="round"
				pathLength="100"
			/>
			<g class="fizzle" transform="translate(74 44)">
				<circle r="6" style:fill="color-mix(in oklab, var(--color-fg-muted) 40%, transparent)" />
				{#each sparks as angle (angle)}
					<line
						class="spark"
						x1="0"
						y1="0"
						x2="0"
						y2="-9"
						style:stroke="var(--color-warning)"
						stroke-width="1"
						stroke-linecap="round"
						transform="rotate({angle})"
					/>
				{/each}
			</g>
		{:else}
			<path
				class="trail"
				d="M8 108 Q 50 20 {impact.x} {impact.y}"
				fill="none"
				style:stroke="var(--color-warning)"
				stroke-width="1.5"
				stroke-linecap="round"
				pathLength="100"
			/>
			<g transform="translate({impact.x} {impact.y})">
				<circle class="shockwave" r="10" fill="none" style:stroke="var(--color-error)" stroke-width="1.5" />
				<circle
					class="shockwave shockwave-late"
					r="10"
					fill="none"
					style:stroke="var(--color-warning)"
					stroke-width="1"
				/>
				<circle
					class="flash"
					r={outcome === "hit" ? 9 : 6}
					style:fill="color-mix(in oklab, var(--color-warning) 85%, white)"
				/>
			</g>
		{/if}
	</svg>
{/key}

<style>
	.trail {
		stroke-dasharray: 100;
		stroke-dashoffset: 0;
		animation: draw 520ms cubic-bezier(0.4, 0, 0.7, 1) both;
	}
	.trail-short {
		stroke-dasharray: 3 3;
		animation:
			draw 480ms cubic-bezier(0.4, 0, 0.7, 1) both,
			fade-out 500ms 900ms ease-out forwards;
	}
	.flash {
		transform-box: fill-box;
		transform-origin: center;
		animation: flash 700ms 480ms ease-out both;
	}
	.shockwave {
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0;
		animation: shockwave 1100ms 500ms cubic-bezier(0.1, 0.6, 0.3, 1) both;
	}
	.shockwave-late {
		animation-delay: 650ms;
	}
	.fizzle {
		opacity: 0;
		animation: fizzle 900ms 460ms ease-out both;
	}
	.spark {
		animation: spark 700ms 470ms ease-out both;
	}
	.reticle {
		animation: lock 1600ms ease-in-out both;
	}

	@keyframes draw {
		from {
			stroke-dashoffset: 100;
		}
	}
	@keyframes fade-out {
		to {
			opacity: 0.25;
		}
	}
	@keyframes flash {
		0% {
			transform: scale(0.2);
			opacity: 0;
		}
		15% {
			transform: scale(1.4);
			opacity: 1;
		}
		100% {
			transform: scale(0.6);
			opacity: 0.35;
		}
	}
	@keyframes shockwave {
		0% {
			transform: scale(0.3);
			opacity: 0.9;
		}
		100% {
			transform: scale(4.5);
			opacity: 0;
		}
	}
	@keyframes fizzle {
		0% {
			opacity: 0;
			transform: translate(74px, 44px) scale(0.4);
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0.4;
			transform: translate(74px, 50px) scale(1.2);
		}
	}
	@keyframes spark {
		0% {
			stroke-dasharray: 0 9;
		}
		60% {
			stroke-dasharray: 4 9;
			stroke-dashoffset: -3;
		}
		100% {
			stroke-dasharray: 1 9;
			stroke-dashoffset: -8;
			opacity: 0;
		}
	}
	@keyframes lock {
		0%,
		30% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trail,
		.trail-short,
		.flash,
		.shockwave,
		.fizzle,
		.spark,
		.reticle {
			animation: none;
		}
		.shockwave {
			opacity: 0.4;
		}
		.fizzle {
			opacity: 0.6;
		}
	}
</style>
