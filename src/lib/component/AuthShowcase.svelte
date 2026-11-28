<!-- src/lib/component/AuthShowcase.svelte -->
<!-- A quiet, slowly rotating backdrop for the sign-in screen. Each frame is a
     real in-game capture, with a one-line note on what the player is looking at,
     so the page doubles as a short tour of the game. Decorative: it never takes
     focus or clicks, and stops moving for reduced-motion users. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { prefersReducedMotion } from "svelte/motion";

	let { showCaptions = true }: { showCaptions?: boolean } = $props();

	const slides = [
		{
			src: "/images/docs/psyops.webp",
			kicker: "The board",
			title: "A world that answers to you",
			text: "Regions with their own people, economy and mood."
		},
		{
			src: "/images/docs/five-domains.webp",
			kicker: "Five domains",
			title: "War is more than boots on the ground",
			text: "Land, sea, air, space and covert ops on one map."
		},
		{
			src: "/images/docs/industry.webp",
			kicker: "Industry",
			title: "Build the machine that funds the mission",
			text: "Factories, resources and trade routes that fund the mission."
		},
		{
			src: "/images/docs/air-fighter.webp",
			kicker: "Air power",
			title: "Decide who owns the sky",
			text: "Squadrons and sorties planned alongside your ground troops."
		},
		{
			src: "/images/docs/sea-capital.webp",
			kicker: "Naval command",
			title: "Project power beyond your coastline",
			text: "Fleets, sea lanes and coastal strikes beyond your coast."
		}
	];

	let active = $state(0);

	onMount(() => {
		if (prefersReducedMotion.current) return;
		const timer = setInterval(() => (active = (active + 1) % slides.length), 6500);
		return () => clearInterval(timer);
	});
</script>

<div class="auth-showcase pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
	{#each slides as slide, i (slide.src)}
		<img
			src={slide.src}
			alt=""
			class="showcase-slide {i === active ? 'active' : ''}"
			loading={i === 0 ? "eager" : "lazy"}
			decoding="async"
		/>
	{/each}
	<div class="showcase-veil"></div>

	<!-- A small placard, like the label under a museum exhibit. -->
	{#if showCaptions}
		<div class="showcase-placard absolute bottom-10 left-10 hidden max-w-xs lg:block">
			{#key active}
				<div in:fly={{ y: 14, duration: 520 }} out:fade={{ duration: 260 }}>
					<p class="font-mono text-[10px] uppercase tracking-[0.28em] text-primary-fg">
						{slides[active].kicker}
					</p>
					<p class="mt-1 text-xs leading-relaxed text-fg-muted">{slides[active].text}</p>
					<div class="mt-3 flex gap-1.5">
						{#each slides as slide, i (slide.src)}
							<span
								class="h-1 rounded-full transition-all duration-500 {i === active
									? 'w-6 bg-primary'
									: 'w-1.5 bg-fg-muted/40'}"
							></span>
						{/each}
					</div>
				</div>
			{/key}
		</div>
	{/if}
</div>

<style>
	.auth-showcase {
		background: #060a14;
	}

	.showcase-slide {
		position: absolute;
		inset: -2%;
		width: 104%;
		height: 104%;
		object-fit: cover;
		opacity: 0;
		transform: scale(1.02);
		transition: opacity 1800ms ease-in-out;
	}

	.showcase-slide.active {
		opacity: 0.16;
		animation: showcase-drift 18s ease-out forwards;
	}

	.showcase-veil {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 50% 35%, transparent 0%, rgb(6 10 20 / 55%) 70%),
			linear-gradient(to bottom, rgb(6 10 20 / 45%), rgb(6 10 20 / 85%));
	}

	.showcase-placard {
		padding: 0.6rem 0.85rem;
		border: 1px solid color-mix(in oklab, var(--color-line) 30%, transparent);
		border-radius: 0.25rem;
		background: color-mix(in oklab, var(--color-surface-1) 78%, transparent);
		backdrop-filter: blur(8px);
	}

	@keyframes showcase-drift {
		from {
			transform: scale(1.02) translate3d(0, 0, 0);
		}
		to {
			transform: scale(1.1) translate3d(-1.5%, -1%, 0);
		}
	}

	@media (min-width: 1024px) {
		.showcase-slide.active {
			opacity: 0.42;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.showcase-slide,
		.showcase-slide.active {
			animation: none;
			transition: none;
			transform: none;
		}
	}
</style>
