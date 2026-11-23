<!-- src/routes/(authenticated)/(dock)/visas/VisaStamp.svelte -->
<!-- A rubber stamp inked onto a passport page (visas, entry permits, residence).
     Lands with animate-stamp; meant to sit on PassportPage's paper. The ink is
     speckled and the edges wobble, like a real hand-pressed stamp. -->
<script lang="ts">
	interface Props {
		/** Small text on the top arc, e.g. "Visa" / "Entry". */
		label: string;
		/** Big text in the middle, e.g. the state's name. */
		title: string | null | undefined;
		/** Small line at the bottom, usually a date. */
		date?: string | null;
		tone?: "green" | "red" | "blue" | "violet" | "gold";
		shape?: "round" | "rect";
		/** Rotation in degrees. */
		tilt?: number;
		/** Delay before the stamp lands, ms. */
		delay?: number;
		faded?: boolean;
		class?: string;
	}

	let {
		label,
		title,
		date = null,
		tone = "green",
		shape = "round",
		tilt = -12,
		delay = 120,
		faded = false,
		class: className = ""
	}: Props = $props();

	const ink = $derived({
		green: "#2f6b22",
		red: "#a3241b",
		blue: "#1f4f8f",
		violet: "#5b2f86",
		gold: "#8a5a00"
	}[tone]);

	// One filter per stamp so several stamps on the same page don't share ids.
	const stampId = $props.id();
	const uid = stampId.replace(/[^a-zA-Z0-9_-]/g, "");
	const roughId = `stamp-ink-${uid}`;
</script>

<svg class="stamp-defs" aria-hidden="true" focusable="false">
	<defs>
		<filter id={roughId} x="-15%" y="-15%" width="130%" height="130%">
			<!-- Fine grain punches tiny holes in the ink: the pad was never evenly loaded. -->
			<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="11" result="grain" />
			<feColorMatrix
				in="grain"
				type="matrix"
				values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.4 0 0 0 1.25"
				result="speckle"
			/>
			<feComposite in="SourceGraphic" in2="speckle" operator="in" result="speckled" />
			<!-- Coarse noise nudges the outline so the rim is not machine-perfect. -->
			<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="warp" />
			<feDisplacementMap in="speckled" in2="warp" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
		</filter>
	</defs>
</svg>

<!-- The outer box holds the tilt (so it stays after the landing animation);
     the inner one does the landing. -->
<div class="pointer-events-none select-none {className}" style="transform: rotate({tilt}deg)" aria-hidden="true">
	<div
		class="animate-stamp stamp-ink flex flex-col items-center justify-center text-center {shape === 'round'
			? 'size-24 rounded-full'
			: 'min-w-28 px-3 py-1.5 rounded-sm'}"
		style="--stamp-tilt: 0deg; --rise-delay: {delay}ms; color: {ink}; border: 3px double {ink}; opacity: {faded
			? 0.45
			: 0.82}; filter: url(#{roughId}); box-shadow: inset 0 0 0 1px color-mix(in srgb, {ink} 60%, transparent), 2px 2px 0 -1px color-mix(in srgb, {ink} 35%, transparent);"
	>
		{#if shape === 'round'}
			<span class="stamp-ring" style="border-color: {ink}"></span>
		{/if}
		<span class="relative text-[8px] font-bold tracking-[0.25em] uppercase leading-none">{label}</span>
		<span
			class="relative font-black uppercase leading-tight tracking-wide break-words {shape === 'round'
				? 'text-[11px] max-w-[5.5rem] line-clamp-2 my-0.5'
				: 'text-sm'}">{title ?? ""}</span
		>
		{#if date}
			<span class="relative w-10 h-px my-0.5" style="background: {ink}"></span>
			<span class="relative text-[8px] font-mono leading-none">{date}</span>
		{/if}
	</div>
</div>

<style>
	.stamp-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}
	/* Let the ink soak into the paper instead of sitting on top of it. */
	.stamp-ink {
		mix-blend-mode: multiply;
		-webkit-font-smoothing: antialiased;
	}
	.stamp-ring {
		position: absolute;
		inset: 4px;
		border: 1px dashed;
		border-radius: 50%;
		opacity: 0.55;
	}
</style>
