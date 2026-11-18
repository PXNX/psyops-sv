<!-- src/routes/(authenticated)/(dock)/visas/VisaStamp.svelte -->
<!-- A rubber stamp inked onto a passport page (visas, entry permits, residence).
     Lands with animate-stamp; meant to sit on PassportPage's paper. -->
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

	const ink = {
		green: "#2f6b22",
		red: "#a3241b",
		blue: "#1f4f8f",
		violet: "#5b2f86",
		gold: "#8a5a00"
	}[tone];
</script>

<!-- The outer box holds the tilt (so it stays after the landing animation);
     the inner one does the landing. -->
<div class="pointer-events-none select-none {className}" style="transform: rotate({tilt}deg)" aria-hidden="true">
	<div
		class="animate-stamp flex flex-col items-center justify-center text-center {shape === 'round'
			? 'size-24 rounded-full'
			: 'min-w-28 px-3 py-1.5 rounded-sm'}"
		style="--stamp-tilt: 0deg; --rise-delay: {delay}ms; color: {ink}; border: 3px double {ink}; opacity: {faded
			? 0.45
			: 0.82};"
	>
		<span class="text-[8px] font-bold tracking-[0.25em] uppercase leading-none">{label}</span>
		<span
			class="font-black uppercase leading-tight tracking-wide break-words {shape === 'round'
				? 'text-[11px] max-w-[5.5rem] line-clamp-2 my-0.5'
				: 'text-sm'}">{title ?? ""}</span
		>
		{#if date}
			<span class="w-10 h-px my-0.5" style="background: {ink}"></span>
			<span class="text-[8px] font-mono leading-none">{date}</span>
		{/if}
	</div>
</div>
