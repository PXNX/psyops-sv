<!-- Deterministic portrait for a commander: seeded hair, face, uniform and
     background so the same officer always looks the same. -->
<script lang="ts">
	let {
		seed = 0,
		alive = true,
		size = 48
	}: { seed?: number; alive?: boolean; size?: number } = $props();

	const BACKGROUNDS = ["#16323f", "#2b2438", "#1e3529", "#3a2a26", "#1f2f46", "#332b1d", "#292138", "#203634"];
	const UNIFORMS = ["#243b53", "#3d2f2f", "#2f3d2b", "#3a3446", "#1e3a4a", "#4a3a24", "#2d2d3d", "#34432e"];
	const SKIN = ["#e8c39e", "#d8a87c", "#b8845f", "#8d5f42", "#f0d2b4", "#c9966c"];
	const HAIR = ["#2b2b2b", "#6b4a2f", "#b9b0a0", "#8a3b2a", "#4a4a55", "#d3c08a", "#1f1f24", "#7a5a44"];

	const pick = <T,>(list: T[], n: number) => list[Math.abs(n) % list.length]!;
	const background = $derived(pick(BACKGROUNDS, seed * 7 + 3));
	const uniform = $derived(pick(UNIFORMS, seed * 3 + 1));
	const skin = $derived(pick(SKIN, seed * 5 + 2));
	const hair = $derived(pick(HAIR, seed * 11 + 5));
	const longHair = $derived(seed % 3 === 0);
	const beard = $derived(seed % 4 === 1);
	const badge = $derived(seed % 2 === 0);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 64 64"
	role="img"
	aria-label="Commander portrait"
	style:filter={alive ? "none" : "grayscale(1) brightness(0.7)"}
>
	<rect width="64" height="64" fill={background} />
	<circle cx="32" cy="25" r="20" fill={hair} opacity="0.35" />
	<path d="M8 64 Q12 44 32 44 Q52 44 56 64 Z" fill={uniform} />
	<path d="M32 44 L27 52 L32 58 L37 52 Z" fill="#e8e2d4" opacity="0.85" />
	{#if badge}<rect x="39" y="49" width="7" height="4" fill="#d8b24c" />{/if}
	<rect x="25" y="38" width="14" height="8" rx="3" fill={skin} />
	<ellipse cx="32" cy="26" rx="12" ry="14" fill={skin} />
	{#if longHair}<path d="M20 24 Q18 42 23 44 L25 30 Z M44 24 Q46 42 41 44 L39 30 Z" fill={hair} />{/if}
	<path d="M20 22 Q22 10 32 11 Q42 10 44 22 Q37 16 32 17 Q27 16 20 22 Z" fill={hair} />
	<circle cx="27.5" cy="26" r="1.6" fill="#1b1b1b" />
	<circle cx="36.5" cy="26" r="1.6" fill="#1b1b1b" />
	<path d="M29 33 Q32 35 35 33" stroke="#7a4a3a" stroke-width="1.4" fill="none" stroke-linecap="round" />
	{#if beard}<path d="M22 32 Q32 46 42 32 Q40 40 32 41 Q24 40 22 32 Z" fill={hair} opacity="0.85" />{/if}
</svg>
