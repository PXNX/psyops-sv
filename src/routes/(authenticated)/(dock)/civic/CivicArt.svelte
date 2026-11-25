<!-- Theme-coloured, animated illustrations for the patronage desk. Ambient
     loops only (no entrance fades) so view-transition snapshots stay intact.
     Every animation stops under prefers-reduced-motion. -->
<script lang="ts">
	interface Props {
		kind: "skyline" | "gauge" | "building" | "seal";
		variant?: string;
		value?: number;
		/** For `building`: 1 founded, 2 adds a wing, 3 crowns it as a landmark. */
		tier?: number;
		class?: string;
		label?: string;
	}
	let { kind, variant = "", value = 0, tier = 1, class: className = "", label }: Props = $props();

	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
	const glowId = `civic-glow-${idSuffix}`;
	const gaugeId = `civic-gauge-${idSuffix}`;
	const circumference = 2 * Math.PI * 26;
	const dash = $derived((Math.max(0, Math.min(100, value)) / 100) * circumference);
</script>

{#if kind === "skyline"}
	<svg
		class={className}
		viewBox="0 0 480 150"
		preserveAspectRatio="xMidYMid slice"
		role="img"
		aria-label={label ?? "A town lit by private patronage"}
	>
		<defs>
			<radialGradient id={glowId}>
				<stop offset="0" stop-color="var(--color-warning)" stop-opacity="0.28" />
				<stop offset="1" stop-color="var(--color-warning)" stop-opacity="0" />
			</radialGradient>
		</defs>
		<circle cx="390" cy="34" r="58" fill={`url(#${glowId})`} class="sun" />
		<circle cx="390" cy="34" r="13" fill="var(--color-warning)" opacity="0.55" class="sun" />
		<g stroke="var(--color-line)" stroke-opacity="0.25" stroke-width="1">
			{#each [30, 60, 90, 120] as y (y)}<line x1="0" y1={y} x2="480" y2={y} />{/each}
		</g>
		<!-- distant blocks -->
		<g fill="var(--color-surface-4)" stroke="var(--color-line)" stroke-opacity="0.35">
			<rect x="24" y="78" width="42" height="72" rx="2" />
			<rect x="76" y="58" width="34" height="92" rx="2" />
			<rect x="120" y="86" width="50" height="64" rx="2" />
			<rect x="300" y="70" width="38" height="80" rx="2" />
			<rect x="348" y="90" width="56" height="60" rx="2" />
			<rect x="414" y="76" width="44" height="74" rx="2" />
		</g>
		<!-- the buildings you fund -->
		<g
			fill="var(--color-positive)"
			fill-opacity="0.14"
			stroke="var(--color-positive)"
			stroke-opacity="0.7"
			stroke-width="1.2"
		>
			<path d="M182 150V96h58v54" />
			<path d="M250 150V76l30-16 30 16v74" />
		</g>
		<g fill="var(--color-warning)" class="windows">
			{#each [194, 214, 234] as x (x)}
				<rect class="win-a" {x} y="108" width="7" height="9" rx="1" />
				<rect class="win-b" {x} y="126" width="7" height="9" rx="1" />
			{/each}
			{#each [268, 290] as x (x)}
				<rect class="win-b" {x} y="92" width="8" height="10" rx="1" />
				<rect class="win-a" {x} y="116" width="8" height="10" rx="1" />
			{/each}
		</g>
		<!-- a crane slowly working on the next one -->
		<g class="crane" stroke="var(--color-primary)" stroke-width="2" fill="none">
			<path d="M446 150V44h-44" />
			<path d="M446 44l16-14" />
			<path d="M414 44v18" />
		</g>
	</svg>
{:else if kind === "gauge"}
	<svg class={className} viewBox="0 0 64 64" role="img" aria-label={label ?? `Goodwill ${Math.round(value)} of 100`}>
		<defs>
			<linearGradient id={gaugeId} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="var(--color-positive)" />
				<stop offset="1" stop-color="var(--color-primary)" />
			</linearGradient>
		</defs>
		<circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-surface-6)" stroke-width="6" />
		<circle
			cx="32"
			cy="32"
			r="26"
			fill="none"
			stroke={`url(#${gaugeId})`}
			stroke-width="6"
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={circumference - dash}
			transform="rotate(-90 32 32)"
			class="arc"
		/>
		<circle cx="32" cy="32" r="18" fill="var(--color-surface-2)" opacity="0.5" />
		<circle cx="32" cy="32" r="3" fill="var(--color-positive)" class="pulse" />
	</svg>
{:else if kind === "building"}
	<svg class={className} viewBox="0 0 64 64" role="img" aria-label={label ?? variant}>
		<g
			fill="var(--color-positive)"
			fill-opacity="0.12"
			stroke="var(--color-positive)"
			stroke-opacity="0.6"
			stroke-width="1.5"
		>
			{#if variant === "water_works"}
				<path d="M8 54h48M14 54V30h36v24M20 30V20h24v10" />
				<path d="M32 20V8M24 14q8 8 16 0" />
			{:else if variant === "housing_block"}
				<path d="M12 54V18h40v36M12 34h40M20 26h8v8h-8zM36 26h8v8h-8zM20 42h8v8h-8zM36 42h8v8h-8z" />
			{:else if variant === "market_hall"}
				<path d="M8 54h48M12 54V30l20-14 20 14v24M20 54V38h24v16" />
			{:else if variant === "clinic"}
				<path d="M14 54V22h36v32M28 22v-8h8v8M32 30v16M24 38h16" />
			{:else if variant === "school_annex"}
				<path d="M8 54V26l24-14 24 14v28M20 54V38h24v16M28 38V30h8v8" />
			{:else}
				<path d="M16 54V30h32v24M32 30V14M22 22h20M26 40h12" />
			{/if}
		</g>
		{#if tier >= 2}
			<g
				fill="var(--color-primary)"
				fill-opacity="0.14"
				stroke="var(--color-primary)"
				stroke-opacity="0.7"
				stroke-width="1.5"
			>
				<path d="M52 54V38h8v16M2 54V42h8v12" />
			</g>
		{/if}
		{#if tier >= 3}
			<path
				d="M32 1.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z"
				fill="var(--color-warning)"
				class="star"
			/>
		{/if}
		<circle class="spark" cx="50" cy="14" r="2.5" fill="var(--color-warning)" />
	</svg>
{:else}
	<svg class={className} viewBox="0 0 64 64" role="img" aria-label={label ?? "Patronage seal"}>
		<circle
			cx="32"
			cy="32"
			r="27"
			fill="var(--color-warning)"
			fill-opacity="0.1"
			stroke="var(--color-warning)"
			stroke-opacity="0.6"
			stroke-width="1.5"
		/>
		<circle
			cx="32"
			cy="32"
			r="21"
			fill="none"
			stroke="var(--color-warning)"
			stroke-opacity="0.35"
			stroke-dasharray="3 4"
			class="ring"
		/>
		<path
			d="M32 20l3.4 7 7.6 1-5.5 5.4 1.3 7.6L32 37.6 25.2 41l1.3-7.6L21 28l7.6-1z"
			fill="var(--color-warning)"
			fill-opacity="0.65"
			class="star"
		/>
	</svg>
{/if}

<style>
	svg {
		display: block;
	}
	.sun {
		transform-box: fill-box;
		transform-origin: center;
		animation: breathe 6s ease-in-out infinite;
	}
	.windows rect {
		animation: flicker 4s ease-in-out infinite;
	}
	.win-b {
		animation-delay: 1.7s;
	}
	.crane {
		transform-box: fill-box;
		transform-origin: bottom right;
		animation: sway 7s ease-in-out infinite;
	}
	.arc {
		transition: stroke-dashoffset 0.8s ease;
	}
	.pulse {
		transform-box: fill-box;
		transform-origin: center;
		animation: pulse 2.6s ease-in-out infinite;
	}
	.spark {
		animation: pulse 3.4s ease-in-out infinite;
	}
	.ring {
		transform-box: fill-box;
		transform-origin: center;
		animation: spin 24s linear infinite;
	}
	.star {
		transform-box: fill-box;
		transform-origin: center;
		animation: breathe 5s ease-in-out infinite;
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.65;
			transform: scale(0.96);
		}
		50% {
			opacity: 1;
			transform: scale(1.06);
		}
	}
	@keyframes flicker {
		0%,
		100% {
			opacity: 0.35;
		}
		45% {
			opacity: 1;
		}
		60% {
			opacity: 0.6;
		}
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1.2);
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sun,
		.windows rect,
		.crane,
		.pulse,
		.spark,
		.ring,
		.star {
			animation: none;
		}
	}
</style>
