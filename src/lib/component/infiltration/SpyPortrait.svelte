<!-- Deterministic portrait for a network asset. Every feature (face, hair,
     brows, eyes, glasses, facial hair, headwear, clothing, small marks and
     the backdrop) is drawn from its own slice of a hashed seed, so the same
     asset always looks the same and neighbouring seeds look unrelated. -->
<script lang="ts">
	let { seed = 0, alive = true, size = 48 }: { seed?: number; alive?: boolean; size?: number } = $props();

	const BACKGROUNDS = [
		"#16323f",
		"#2b2438",
		"#1e3529",
		"#3a2a26",
		"#1f2f46",
		"#332b1d",
		"#292138",
		"#203634",
		"#3b2433",
		"#25303a",
		"#2f3a24",
		"#40311f"
	];
	const SKIN = ["#f3d9c0", "#e8c39e", "#d8a87c", "#c9966c", "#b8845f", "#a06c4a", "#8d5f42", "#6e4630", "#57361f"];
	const HAIR = [
		"#1a1a1d",
		"#2b2b2b",
		"#4a3423",
		"#6b4a2f",
		"#8a3b2a",
		"#a8743c",
		"#d3c08a",
		"#e6dcc0",
		"#b9b0a0",
		"#7d7d86"
	];
	const CLOTH = [
		"#243b53",
		"#3d2f2f",
		"#2f3d2b",
		"#3a3446",
		"#1e3a4a",
		"#4a3a24",
		"#2d2d3d",
		"#34432e",
		"#5a2a2a",
		"#55504a",
		"#1c1c22",
		"#6b5a3a"
	];
	const ACCENT = ["#c94b4b", "#d8b24c", "#4b7ec9", "#5aa36b", "#9a6bc9", "#e8e2d4", "#2a2a2a"];

	/** Two 32-bit mixes of the seed give ~64 bits of independent features. */
	function mix(n: number, salt: number) {
		let h = (Math.floor(n) ^ salt) >>> 0;
		h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
		h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
		return (h ^ (h >>> 16)) >>> 0;
	}
	const a = $derived(mix(seed, 0x9e3779b9));
	const b = $derived(mix(seed, 0x85ebca6b));
	const bits = (h: number, shift: number, n: number) => ((h >>> shift) & 0xff) % n;
	const from = <T,>(list: T[], h: number, shift: number) => list[bits(h, shift, list.length)]!;

	const background = $derived(from(BACKGROUNDS, a, 0));
	const skin = $derived(from(SKIN, a, 4));
	const hair = $derived(from(HAIR, a, 8));
	const cloth = $derived(from(CLOTH, a, 12));
	const accent = $derived(from(ACCENT, a, 16));
	/** 0 short · 1 side part · 2 long · 3 bun · 4 bald · 5 curly · 6 buzz · 7 bob */
	const hairStyle = $derived(bits(a, 20, 8));
	/** 0 suit and tie · 1 turtleneck · 2 trench coat · 3 open shirt · 4 hoodie · 5 uniform */
	const outfit = $derived(bits(a, 24, 6));
	const faceW = $derived(11 + bits(a, 27, 3));
	const faceH = $derived(13 + bits(a, 29, 3));

	/** 0 none · 1 round · 2 square · 3 sunglasses (glasses on ~35%) */
	const glasses = $derived(bits(b, 0, 20) < 13 ? 0 : 1 + bits(b, 5, 3));
	/** 0 none · 1 moustache · 2 beard · 3 stubble · 4 goatee */
	const facialHair = $derived(bits(b, 8, 10) < 6 ? 0 : 1 + bits(b, 12, 4));
	/** 0 none · 1 fedora · 2 beanie · 3 flat cap (headwear on ~20%) */
	const hat = $derived(bits(b, 16, 10) < 8 ? 0 : 1 + bits(b, 19, 3));
	/** 0 level · 1 angled · 2 thick */
	const brows = $derived(bits(b, 22, 3));
	const narrowEyes = $derived(bits(b, 24, 4) === 0);
	const earring = $derived(bits(b, 26, 6) === 0);
	const scar = $derived(bits(b, 27, 9) === 0);
	const mole = $derived(bits(b, 28, 7) === 0);
	const earpiece = $derived(bits(b, 29, 8) === 0);
	const pattern = $derived(bits(b, 30, 4));
	const smile = $derived(bits(a, 2, 3));

	const showHair = $derived(hairStyle !== 4 && hat !== 1 && hat !== 2);
	const uid = $props.id();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 64 64"
	role="img"
	aria-label="Asset portrait"
	style:filter={alive ? "none" : "grayscale(1) brightness(0.7)"}
>
	<defs>
		<pattern id="p-{uid}" width="6" height="6" patternUnits="userSpaceOnUse">
			{#if pattern === 1}
				<path d="M0 6 L6 0" stroke="#fff" stroke-opacity="0.06" stroke-width="1.5" />
			{:else if pattern === 2}
				<circle cx="3" cy="3" r="0.8" fill="#fff" fill-opacity="0.08" />
			{:else}
				<path d="M0 3 H6" stroke="#fff" stroke-opacity="0.05" />
			{/if}
		</pattern>
	</defs>
	<rect width="64" height="64" fill={background} />
	{#if pattern}<rect width="64" height="64" fill="url(#p-{uid})" />{/if}

	<!-- Long hair falls behind the shoulders. -->
	{#if showHair && (hairStyle === 2 || hairStyle === 7)}
		<path
			d={hairStyle === 2 ? "M18 22 Q14 46 22 50 L42 50 Q50 46 46 22 Z" : "M19 22 Q17 38 22 40 L42 40 Q47 38 45 22 Z"}
			fill={hair}
		/>
	{/if}

	<!-- Clothing -->
	<path d="M8 64 Q12 44 32 44 Q52 44 56 64 Z" fill={cloth} />
	{#if outfit === 0}
		<path d="M32 44 L26 52 L32 60 L38 52 Z" fill="#e8e2d4" />
		<path d="M32 47 L30 50 L32 60 L34 50 Z" fill={accent} />
	{:else if outfit === 1}
		<rect x="25" y="42" width="14" height="6" rx="2" fill={cloth} stroke="#000" stroke-opacity="0.2" />
	{:else if outfit === 2}
		<path d="M32 46 L22 46 L18 58 L28 52 Z M32 46 L42 46 L46 58 L36 52 Z" fill="#000" fill-opacity="0.25" />
		<path d="M32 46 L28 54 L32 62 L36 54 Z" fill="#e8e2d4" opacity="0.7" />
	{:else if outfit === 3}
		<path d="M32 44 L27 53 L32 56 L37 53 Z" fill={skin} />
		<path d="M27 46 L32 56 M37 46 L32 56" stroke="#e8e2d4" stroke-width="2" />
	{:else if outfit === 4}
		<path d="M14 50 Q32 36 50 50 Q44 46 32 46 Q20 46 14 50 Z" fill="#000" fill-opacity="0.25" />
		<path d="M30 50 L29 58 M34 50 L35 58" stroke="#e8e2d4" stroke-width="0.8" opacity="0.7" />
	{:else}
		<path d="M32 44 L27 52 L32 58 L37 52 Z" fill="#e8e2d4" opacity="0.85" />
		<rect x="39" y="49" width="7" height="4" fill="#d8b24c" />
	{/if}

	<!-- Neck and face -->
	<rect x="25" y="37" width="14" height="9" rx="3" fill={skin} />
	<ellipse cx="32" cy="26" rx={faceW} ry={faceH} fill={skin} />
	<ellipse cx={32 - faceW} cy="27" rx="1.8" ry="3" fill={skin} />
	<ellipse cx={32 + faceW} cy="27" rx="1.8" ry="3" fill={skin} />
	{#if earring}<circle cx={32 - faceW} cy="31" r="1" fill="#d8b24c" />{/if}
	{#if earpiece}<path d="M{33 + faceW} 27 q2 4 -1 9" stroke="#cfcfcf" stroke-width="0.8" fill="none" />{/if}

	<!-- Hair on top -->
	{#if showHair}
		{#if hairStyle === 0 || hairStyle === 2 || hairStyle === 7}
			<path d="M20 22 Q22 10 32 11 Q42 10 44 22 Q37 16 32 17 Q27 16 20 22 Z" fill={hair} />
		{:else if hairStyle === 1}
			<path d="M20 23 Q20 10 33 11 Q44 11 44 22 Q38 15 27 18 Q23 19 20 23 Z" fill={hair} />
		{:else if hairStyle === 3}
			<path d="M20 22 Q22 11 32 12 Q42 11 44 22 Q37 16 32 17 Q27 16 20 22 Z" fill={hair} />
			<circle cx="32" cy="9" r="4.5" fill={hair} />
		{:else if hairStyle === 5}
			{#each [20, 24, 28, 32, 36, 40, 44] as x, i (x)}
				<circle cx={x} cy={i % 2 ? 13 : 16} r="4.2" fill={hair} />
			{/each}
		{:else if hairStyle === 6}
			<path d="M21 20 Q24 12 32 12 Q40 12 43 20 Q38 16 32 16 Q26 16 21 20 Z" fill={hair} opacity="0.7" />
		{/if}
	{/if}

	<!-- Brows and eyes -->
	{#if brows === 0}
		<path d="M24.5 21.5 H30 M34 21.5 H39.5" stroke={hair} stroke-width="1.2" stroke-linecap="round" />
	{:else if brows === 1}
		<path d="M24.5 22 L30 20.8 M34 20.8 L39.5 22" stroke={hair} stroke-width="1.2" stroke-linecap="round" />
	{:else}
		<path d="M24.5 21.5 H30 M34 21.5 H39.5" stroke={hair} stroke-width="2.1" stroke-linecap="round" />
	{/if}
	{#if narrowEyes}
		<path d="M26 26 H29 M35 26 H38" stroke="#1b1b1b" stroke-width="1.4" stroke-linecap="round" />
	{:else}
		<circle cx="27.5" cy="26" r="1.6" fill="#1b1b1b" />
		<circle cx="36.5" cy="26" r="1.6" fill="#1b1b1b" />
	{/if}

	<!-- Glasses -->
	{#if glasses === 1}
		<g stroke="#d6d6d6" stroke-width="0.9" fill="none">
			<circle cx="27.5" cy="26" r="3.6" /><circle cx="36.5" cy="26" r="3.6" /><path d="M31.1 26 H32.9" />
		</g>
	{:else if glasses === 2}
		<g stroke="#2a2a2a" stroke-width="1.1" fill="none">
			<rect x="23.5" y="23" width="8" height="6" rx="1" /><rect x="32.5" y="23" width="8" height="6" rx="1" />
		</g>
	{:else if glasses === 3}
		<path
			d="M23 23.5 H31 Q31 29.5 27 29.5 Q23 29.5 23 23.5 Z M33 23.5 H41 Q41 29.5 37 29.5 Q33 29.5 33 23.5 Z"
			fill="#111"
		/>
		<path d="M31 24.5 H33" stroke="#111" stroke-width="1" />
	{/if}

	<!-- Mouth, marks and facial hair -->
	<path
		d={smile === 0 ? "M29 33 Q32 35 35 33" : smile === 1 ? "M29.5 33.5 H34.5" : "M29 34 Q32 32.5 35 34"}
		stroke="#7a4a3a"
		stroke-width="1.3"
		fill="none"
		stroke-linecap="round"
	/>
	{#if scar}<path d="M37 28 L40 33" stroke="#8a4a3a" stroke-width="0.9" opacity="0.8" />{/if}
	{#if mole}<circle cx="25.5" cy="31" r="0.7" fill="#3a2a20" />{/if}
	{#if facialHair === 1}
		<path d="M28 31.5 Q32 29.8 36 31.5 Q32 31 28 31.5 Z" fill={hair} stroke={hair} stroke-width="1" />
	{:else if facialHair === 2}
		<path d="M22 30 Q32 46 42 30 Q40 39 32 40 Q24 39 22 30 Z" fill={hair} opacity="0.9" />
	{:else if facialHair === 3}
		<path d="M22 30 Q32 44 42 30 Q40 38 32 39 Q24 38 22 30 Z" fill={hair} opacity="0.3" />
	{:else if facialHair === 4}
		<path d="M29 35.5 Q32 41 35 35.5 Q32 37 29 35.5 Z" fill={hair} />
	{/if}

	<!-- Headwear -->
	{#if hat === 1}
		<path d="M14 18 Q32 14 50 18 Q48 20 32 19 Q16 20 14 18 Z" fill="#26221e" />
		<path d="M21 18 Q21 7 32 7 Q43 7 43 18 Z" fill="#26221e" />
		<rect x="21" y="14.5" width="22" height="2.5" fill={accent} opacity="0.8" />
	{:else if hat === 2}
		<path d="M19 21 Q19 8 32 8 Q45 8 45 21 Z" fill={accent} />
		<rect x="19" y="18" width="26" height="4" rx="1.5" fill={accent} stroke="#000" stroke-opacity="0.25" />
	{:else if hat === 3}
		<path d="M19 18 Q20 9 32 9 Q44 9 45 16 Q50 17 48 19 Q34 19 19 18 Z" fill="#4a4036" />
	{/if}
</svg>
