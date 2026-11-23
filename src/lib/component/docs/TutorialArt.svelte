<!-- Small illustrated strip shown inside an interactive tutorial step. The
     step supplies an `art` key; each scene is drawn from theme colours so it
     reads on both the dark and light palettes. -->
<script lang="ts">
	import type { TutorialArtKind } from "./art.js";

	interface Props {
		kind: TutorialArtKind;
	}
	let { kind }: Props = $props();
	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
</script>

<div class="tutorial-art">
	<svg viewBox="0 0 240 72" role="img" aria-label={kind} preserveAspectRatio="xMidYMid meet">
		<defs>
			<marker id="ta-{idSuffix}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
				<path d="M 0 0 L 10 5 L 0 10 z" style:fill="var(--color-primary)" />
			</marker>
		</defs>
		<rect x="0" y="0" width="240" height="72" rx="6" style:fill="var(--color-primary)" fill-opacity="0.06" />

		{#if kind === "naval" || kind === "hex"}
			<!-- Hex sea, optional crosshair -->
			<g style:stroke="var(--color-primary)" stroke-opacity="0.55" style:fill="var(--color-primary)" fill-opacity="0.08">
				<polygon points="36,18 58,18 69,36 58,54 36,54 25,36" />
				<polygon points="69,18 91,18 102,36 91,54 69,54 58,36" />
				<polygon points="102,18 124,18 135,36 124,54 102,54 91,36" />
				<polygon points="53,54 75,54 86,72 75,90 53,90 42,72" transform="translate(0,-18)" />
				<polygon points="86,54 108,54 119,72 108,90 86,90 75,72" transform="translate(0,-18)" />
			</g>
			<circle cx="80" cy="36" r="7" style:fill="var(--color-success)" />
			<text x="80" y="39.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#04121f">FF</text>
			{#if kind === "hex"}
				<circle cx="80" cy="36" r="16" fill="none" style:stroke="var(--color-warning)" stroke-width="2" stroke-dasharray="4 3" />
				<text x="164" y="31" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Tap a hex</text>
				<text x="164" y="47" font-size="9" style:fill="var(--color-fg-muted)">q, r · port · ships</text>
			{:else}
				<text x="164" y="31" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Naval mode</text>
				<text x="164" y="47" font-size="9" style:fill="var(--color-fg-muted)">EEZ + hex grid</text>
			{/if}
		{:else if kind === "aerial"}
			<g style:stroke="var(--color-primary)" fill="none" stroke-dasharray="5 3">
				<rect x="20" y="12" width="92" height="48" rx="5" />
				<rect x="124" y="12" width="92" height="48" rx="5" />
			</g>
			<text x="28" y="28" font-size="10" font-weight="700" style:fill="var(--color-primary-fg)">LR-A1</text>
			<text x="132" y="28" font-size="10" font-weight="700" style:fill="var(--color-primary-fg)">LR-A2</text>
			<text x="44" y="48" font-size="9" style:fill="var(--color-fg-muted)">3R 4H 1✈</text>
			<text x="148" y="48" font-size="9" style:fill="var(--color-fg-muted)">2R 6H 3✈</text>
			<text x="228" y="42" text-anchor="end" font-size="9" style:fill="var(--color-fg-muted)">one sector</text>
		{:else if kind === "land"}
			<g style:stroke="var(--color-line)">
				<rect x="22" y="14" width="52" height="42" rx="4" style:fill="var(--color-success)" fill-opacity="0.18" />
				<rect x="80" y="14" width="52" height="42" rx="4" style:fill="var(--color-error)" fill-opacity="0.16" />
				<rect x="138" y="14" width="52" height="42" rx="4" style:fill="var(--color-primary)" fill-opacity="0.16" />
			</g>
			<text x="48" y="40" text-anchor="middle" font-size="9" style:fill="var(--color-base-content)">own</text>
			<text x="106" y="40" text-anchor="middle" font-size="9" style:fill="var(--color-base-content)">hostile</text>
			<text x="164" y="40" text-anchor="middle" font-size="9" style:fill="var(--color-base-content)">intel</text>
			<text x="210" y="32" font-size="10" font-weight="700" style:fill="var(--color-base-content)">Land mode</text>
			<text x="210" y="46" font-size="9" style:fill="var(--color-fg-muted)">units · battles</text>
		{:else if kind === "history"}
			<line x1="20" y1="36" x2="150" y2="36" style:stroke="var(--color-line)" stroke-width="2" />
			{#each [30, 70, 110, 145] as x, i}
				<circle cx={x} cy="36" r={i === 3 ? 8 : 5} style:fill="var(--color-{i === 3 ? 'primary' : 'surface-0'})" style:stroke="var(--color-primary)" stroke-width="2" />
				<text x={x} y="58" text-anchor="middle" font-size="7" style:fill="var(--color-fg-muted)">{["Mon", "Tue", "Wed", "Now"][i]}</text>
			{/each}
			<text x="172" y="30" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Map history</text>
			<text x="172" y="46" font-size="9" style:fill="var(--color-fg-muted)">pick a date</text>
		{:else if kind === "port" || kind === "dock"}
			<path d="M 14 60 L 226 60" style:stroke="var(--color-primary)" stroke-width="2" />
			<rect x="34" y="30" width="40" height="28" rx="3" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
			<text x="54" y="50" text-anchor="middle" font-size="17" style:fill="var(--color-primary-fg)">⚓</text>
			{#if kind === "dock"}
				<rect x="96" y="22" width="56" height="36" rx="3" style:fill="var(--color-warning)" fill-opacity="0.2" style:stroke="var(--color-warning)" />
				<path d="M 112 22 L 112 10 L 148 10" fill="none" style:stroke="var(--color-warning)" stroke-width="2" />
				<text x="124" y="46" text-anchor="middle" font-size="9" style:fill="var(--color-base-content)">DOCK</text>
			{/if}
			<text x="170" y="32" font-size="11" font-weight="700" style:fill="var(--color-base-content)">{kind === "port" ? "One port" : "Build bays"}</text>
			<text x="170" y="47" font-size="9" style:fill="var(--color-fg-muted)">{kind === "port" ? "per coast region" : "parallel orders"}</text>
		{:else if kind === "ship" || kind === "mine"}
			<g transform="translate(20,34)">
				<path d="M 0 8 L 12 8 L 18 0 L 68 0 L 76 8 L 88 8 L 82 18 L 8 18 Z" style:fill="var(--color-primary)" fill-opacity="0.25" style:stroke="var(--color-primary)" />
				<rect x="34" y="-10" width="20" height="10" rx="2" style:fill="var(--color-surface-2)" style:stroke="var(--color-primary)" />
			</g>
			{#if kind === "mine"}
				<text x="138" y="34" font-size="20" style:fill="var(--color-error)">✳</text>
				<text x="164" y="30" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Minefield</text>
				<text x="164" y="46" font-size="9" style:fill="var(--color-fg-muted)">48 h · blocks trade</text>
			{:else}
				<text x="138" y="36" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Move</text>
				<text x="138" y="52" font-size="9" style:fill="var(--color-fg-muted)">1 hex / tick</text>
			{/if}
		{:else if kind === "intel"}
			<circle cx="52" cy="36" r="26" fill="none" style:stroke="var(--color-line)" />
			<circle cx="52" cy="36" r="16" fill="none" style:stroke="var(--color-line)" />
			<path d="M 52 36 L 76 20 A 26 26 0 0 1 76 52 Z" style:fill="var(--color-success)" fill-opacity="0.28" />
			<circle cx="68" cy="30" r="4" style:fill="var(--color-error)" />
			<text x="104" y="30" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Sea intel</text>
			<text x="104" y="46" font-size="9" style:fill="var(--color-fg-muted)">sonar · SAR · radar</text>
		{:else if kind === "squadron" || kind === "mission" || kind === "fuel"}
			<g style:fill="var(--color-primary)" fill-opacity="0.8">
				<path d="M 24 30 L 44 34 L 58 30 L 44 27 Z" />
				<path d="M 54 44 L 74 48 L 88 44 L 74 41 Z" />
				<path d="M 54 16 L 74 20 L 88 16 L 74 13 Z" />
			</g>
			{#if kind === "mission"}
				<path d="M 96 36 L 148 36" style:stroke="var(--color-primary)" stroke-width="2" marker-end="url(#ta-{idSuffix})" />
				<circle cx="160" cy="36" r="8" fill="none" style:stroke="var(--color-error)" stroke-width="2" />
				<text x="178" y="32" font-size="10" font-weight="700" style:fill="var(--color-base-content)">Launch</text>
				<text x="178" y="46" font-size="9" style:fill="var(--color-fg-muted)">flight time → effect</text>
			{:else if kind === "fuel"}
				<rect x="100" y="26" width="100" height="18" rx="4" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
				<rect x="100" y="26" width="62" height="18" rx="4" style:fill="var(--color-warning)" fill-opacity="0.7" />
				<text x="212" y="40" font-size="10" style:fill="var(--color-fg-muted)">62%</text>
			{:else}
				<text x="112" y="32" font-size="11" font-weight="700" style:fill="var(--color-base-content)">Squadron</text>
				<text x="112" y="47" font-size="9" style:fill="var(--color-fg-muted)">role + experience</text>
			{/if}
		{/if}
	</svg>
</div>

<style>
	@reference "../../../app.css";

	.tutorial-art {
		@apply my-2 overflow-hidden rounded-sm border border-line/15;
	}
	.tutorial-art svg {
		@apply block w-full;
		max-height: 76px;
	}
</style>
