<!-- Reusable infographics for the documentation. One component, many diagrams,
     so the markdown guides stay readable while every page gets a real visual.
     All colours come from the active theme, including in dark mode. -->
<script lang="ts">
	import FluentDiagram20Filled from "~icons/fluent/diagram-20-filled";

	export type ArtKind =
		| "levers"
		| "domains"
		| "clock"
		| "production"
		| "stability"
		| "intel"
		| "fog"
		| "fleet"
		| "election"
		| "sortie"
		| "needs"
		| "cyber"
		| "history";

	interface Props {
		kind: ArtKind;
		label?: string;
		caption?: string;
		/** Smaller layout for tutorial cards and sidebars. */
		compact?: boolean;
	}
	let { kind, label, caption, compact = false }: Props = $props();

	const uid = $props.id();
	const idSuffix = uid.replace(/[^a-zA-Z0-9_-]/g, "");
	const arrow = `url(#arrow-${idSuffix})`;
	const toneFill = (tone: string) =>
		`color-mix(in oklab, var(--color-${tone === "neutral" ? "surface" : tone}) 12%, var(--color-surface-1))`;
	const toneStroke = (tone: string) =>
		`color-mix(in oklab, var(--color-${tone === "neutral" ? "line" : tone}) 55%, transparent)`;
	const heights: Record<ArtKind, number> = {
		levers: 260,
		domains: 240,
		clock: 210,
		production: 230,
		stability: 210,
		intel: 250,
		fog: 220,
		fleet: 260,
		election: 220,
		sortie: 230,
		needs: 230,
		cyber: 250,
		history: 220
	};
	const height = $derived(heights[kind]);


</script>
	/** A labelled rounded node used by most of the diagrams. */
	{#snippet box(
		x: number,
		y: number,
		w: number,
		h: number,
		title: string,
		sub: string,
		tone: "primary" | "friendly" | "warning" | "error" | "neutral" = "neutral"
	)}
		<g>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				rx="8"
				style:fill={toneFill(tone ?? "neutral")}
				style:stroke={toneStroke(tone ?? "neutral")}
				stroke-width="1.5"
			/>
			<text x={x + w / 2} y={y + h / 2 - 2} text-anchor="middle" font-size="13" font-weight="700" style:fill="var(--color-base-content)">
				{title}
			</text>
			{#if sub}
				<text x={x + w / 2} y={y + h / 2 + 15} text-anchor="middle" font-size="10.5" style:fill="var(--color-fg-muted)">{sub}</text>
			{/if}
		</g>
	{/snippet}

	{#snippet connect(x1: number, y1: number, x2: number, y2: number, tone?: string)}
		<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tone ?? "var(--color-line)"} stroke-width="1.8" marker-end={arrow} />
	{/snippet}


<figure class="doc-art" class:compact>
	<div class="doc-art-head">
		<span class="doc-art-mark"><FluentDiagram20Filled class="size-4" /></span>
		<span class="section-title text-xs uppercase tracking-[0.18em]">Visual</span>
		{#if label}<span class="ml-auto text-[11px] text-fg-muted">{label}</span>{/if}
	</div>
	<div class="doc-art-body">
		<svg viewBox="0 0 760 {height}" role="img" aria-label={label ?? kind} preserveAspectRatio="xMidYMid meet">
			<defs>
				<marker id="arrow-{idSuffix}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" style:fill="var(--color-line)" />
				</marker>
				<linearGradient id="sea-{idSuffix}" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" style:stop-color="var(--color-primary)" stop-opacity="0.22" />
					<stop offset="1" style:stop-color="var(--color-primary)" stop-opacity="0.04" />
				</linearGradient>
			</defs>
			<rect x="0" y="0" width="760" height={height} fill="none" />

			{#if kind === "levers"}
				<!-- Four levers of power around the player -->
				<circle cx="380" cy="130" r="48" style:fill="var(--color-primary)" fill-opacity="0.12" style:stroke="var(--color-primary)" stroke-width="2" />
				<text x="380" y="126" text-anchor="middle" font-size="15" font-weight="700" style:fill="var(--color-base-content)">YOU</text>
				<text x="380" y="145" text-anchor="middle" font-size="10" style:fill="var(--color-fg-muted)">an inheritance</text>
				{@render box(285, 16, 190, 54, "Politics", "who may act", "politics")}
				{@render box(550, 103, 190, 54, "Force", "what happens", "error")}
				{@render box(285, 190, 190, 54, "Money", "what funds it", "warning")}
				{@render box(20, 103, 190, 54, "Influence", "what is accepted", "friendly")}
				{@render connect(355, 70, 365, 85)}
				{@render connect(500, 138, 550, 130)}
				{@render connect(355, 190, 365, 176)}
				{@render connect(210, 130, 330, 130)}
				<text x="380" y="252" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">
					Cheap wins combine levers; force is the last one you spend.
				</text>
			{:else if kind === "domains"}
				<!-- Five domains and the combined-arms bonus -->
				<circle cx="380" cy="122" r="76" style:fill="var(--color-primary)" fill-opacity="0.08" style:stroke="var(--color-primary)" stroke-dasharray="5 5" />
				<text x="380" y="116" text-anchor="middle" font-size="14" font-weight="700" style:fill="var(--color-primary-fg)">COMBINED ARMS</text>
				<text x="380" y="135" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">+8% per extra domain</text>
				{@render box(315, 6, 130, 44, "Land", "hold ground", "warning")}
				{@render box(560, 86, 150, 44, "Sea", "coast & trade", "friendly")}
				{@render box(515, 195, 150, 44, "Air", "speed & reach", "primary")}
				{@render box(95, 195, 150, 44, "Cyber", "blind & deceive", "error")}
				{@render box(48, 86, 150, 44, "Space", "see & navigate", "politics")}
				{@render connect(380, 50, 380, 46)}
				{@render connect(452, 34, 560, 100)}
				{@render connect(500, 190, 520, 205)}
				{@render connect(260, 215, 245, 205)}
				{@render connect(198, 110, 300, 120)}
				<text x="380" y="230" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">
					Land ↔ Sea ↔ Air fight · Space and Cyber make them see, talk and hit.
				</text>
			{:else if kind === "clock"}
				<!-- Cron cadence -->
				<line x1="40" y1="112" x2="720" y2="112" style:stroke="var(--color-line)" stroke-width="2" />
				{#each [90, 240, 390, 540, 690] as x, i}
					<circle cx={x} cy="112" r="7" style:fill="var(--color-{i === 2 ? 'primary' : 'surface-0'})" style:stroke="var(--color-primary)" stroke-width="2" />
				{/each}
				{@render box(35, 22, 120, 60, "15 min", "fleet · travel", "primary")}
				{@render box(185, 22, 120, 60, "hourly", "battles · wars", "error")}
				{@render box(335, 22, 120, 60, "6 hours", "trade · weather", "warning")}
				{@render box(485, 22, 120, 60, "daily", "population", "friendly")}
				{@render box(635, 22, 105, 60, "00:00", "snapshot", "politics")}
				{#each [95, 245, 395, 545, 690] as x, i}
					<line x1={x} y1="82" x2={x} y2="105" style:stroke="var(--color-line)" />
					<text x={x} y="150" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">{["orders move", "rounds resolve", "markets shift", "people change", "world saved"][i]}</text>
				{/each}
				<text x="380" y="190" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Background jobs advance the world even while you are offline.</text>
			{:else if kind === "production"}
				<!-- Raw materials → factory → market → wallet/company -->
				{@render box(16, 60, 130, 66, "Mine", "iron · coal · oil", "warning")}
				{@render box(190, 60, 140, 66, "Factory", "recipe + worker", "primary")}
				{@render box(374, 60, 130, 66, "Market", "orders · prices", "friendly")}
				{@render box(548, 20, 190, 58, "Wallet", "wages · sales", "warning")}
				{@render box(548, 105, 190, 58, "Company", "shares · dividends", "politics")}
				{@render connect(146, 93, 190, 93)}
				{@render connect(330, 93, 374, 93)}
				{@render connect(504, 85, 548, 50)}
				{@render connect(504, 101, 548, 134)}
				<text x="380" y="185" text-anchor="middle" font-size="12" style:fill="var(--color-base-content)">
					Buy cheap inputs → produce → sell high → reinvest in shares or ships.
				</text>
				<text x="380" y="207" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">
					Taxes and market fees take their cut at every hop.
				</text>
			{:else if kind === "stability"}
				<!-- Stability bands -->
				<text x="40" y="42" font-size="13" font-weight="700" style:fill="var(--color-base-content)">State stability</text>
				<rect x="40" y="62" width="680" height="52" rx="8" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
				<rect x="40" y="62" width="218" height="52" rx="8" style:fill="var(--color-error)" fill-opacity="0.25" />
				<rect x="258" y="62" width="109" height="52" style:fill="var(--color-warning)" fill-opacity="0.25" />
				<rect x="367" y="62" width="149" height="52" style:fill="var(--color-primary)" fill-opacity="0.2" />
				<rect x="516" y="62" width="204" height="52" rx="8" style:fill="var(--color-success)" fill-opacity="0.22" />
				{#each [40, 258, 367, 516, 720] as x, i}
					<text x={x} y="134" text-anchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} font-size="11" style:fill="var(--color-fg-muted)">
						{["0 collapsing", "18 unrest", "32 uneasy", "48 stable", "70 loyal"][i]}
					</text>
				{/each}
				<polygon points="466,56 474,44 482,56" style:fill="var(--color-base-content)" />
				<line x1="474" y1="56" x2="474" y2="114" style:stroke="var(--color-base-content)" stroke-width="2" />
				<text x="474" y="166" text-anchor="middle" font-size="12" font-weight="700" style:fill="var(--color-base-content)">50 · start</text>
				<text x="380" y="196" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">
					Stability scales morale 0.9–1.1× and the war-exhaustion limit 0.8–1.2×.
				</text>
			{:else if kind === "intel"}
				<!-- Detection matrix: sensor × target -->
				<text x="40" y="36" font-size="13" font-weight="700" style:fill="var(--color-base-content)">Sensor × target</text>
				{#each ["Infantry", "Vehicles", "Artillery", "Aircraft", "Subs"] as head, c}
					<text x={250 + c * 100} y="66" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">{head}</text>
				{/each}
				{#each ["Drone EO", "Satellite IR", "Sonar", "Radar"] as row, r}
					<text x="40" y={100 + r * 40} font-size="12" style:fill="var(--color-base-content)">{row}</text>
					{#each [0.85, 0.5, 0.9, 0.2, 0] as base, c}
						{@const value = row === "Sonar" ? [0.25, 0.15, 0.1, 0, 0.9][c] : row === "Radar" ? [0.4, 0.8, 0.3, 0.6, 0][c] : base}
						<rect x={205 + c * 100} y={84 + r * 40} width="90" height="20" rx="4" style:fill="var(--color-surface-2)" />
						<rect x={205 + c * 100} y={84 + r * 40} width={90 * value} height="20" rx="4" style:fill="var(--color-{value === 0 ? 'error' : value > 0.7 ? 'success' : 'warning'})" fill-opacity={value === 0 ? 0.25 : 0.6} />
						<text x={295 + c * 100} y={99 + r * 40} text-anchor="end" font-size="10" style:fill="var(--color-base-content)">{Math.round(value * 100)}%</text>
					{/each}
				{/each}
				<text x="380" y="246" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">No sensor sees everything. Combine passes to raise confidence.</text>
			{:else if kind === "fog"}
				<!-- Fog of war: a sonar pass reveals ships for 12 hours -->
				{#each [0, 1, 2] as i}
					<g transform="translate({70 + i * 240}, 40)">
						<rect x="0" y="0" width="190" height="130" rx="8" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
						<text x="95" y="24" text-anchor="middle" font-size="12" font-weight="700" style:fill="var(--color-base-content)">
							{["No report", "Sonar sweep", "Fresh picture"][i]}
						</text>
						{#each [0, 1, 2, 3, 4, 5] as h}
							<polygon
								points="{45 + (h % 3) * 50},{52 + Math.floor(h / 3) * 40} {65 + (h % 3) * 50},{52 + Math.floor(h / 3) * 40} {75 + (h % 3) * 50},{70 + Math.floor(h / 3) * 40} {65 + (h % 3) * 50},{88 + Math.floor(h / 3) * 40} {45 + (h % 3) * 50},{88 + Math.floor(h / 3) * 40} {35 + (h % 3) * 50},{70 + Math.floor(h / 3) * 40}"
								style:fill="var(--color-{i === 2 ? 'primary' : 'surface-1'})"
								fill-opacity={i === 2 ? 0.18 : 0.5}
								style:stroke="var(--color-line)"
							/>
						{/each}
						{#if i > 0}
							<circle cx="90" cy="70" r="8" style:fill="var(--color-success)" />
							<text x="90" y="74" text-anchor="middle" font-size="7" font-weight="bold" fill="#04121f">SS</text>
						{/if}
						<text x="95" y="122" text-anchor="middle" font-size="10" style:fill="var(--color-fg-muted)">
							{i === 0 ? "enemy hidden" : i === 1 ? "15 min + 30 min cooldown" : "visible for 12 h"}
						</text>
					</g>
					{#if i < 2}{@render connect(260 + i * 240, 105, 310 + i * 240, 105)}{/if}
				{/each}
				<text x="380" y="198" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Only a fresh report over a hex reveals the ships inside it.</text>
			{:else if kind === "fleet"}
				<!-- Coast → EEZ → hex grid, with port, ship and mine -->
				<path d="M 20 30 C 160 30 150 150 300 150 C 430 150 420 60 560 60 L 560 240 L 20 240 Z" style:fill="var(--color-success)" fill-opacity="0.12" style:stroke="var(--color-success)" />
				<text x="150" y="100" font-size="12" style:fill="var(--color-fg-muted)">land</text>
				<path d="M 300 152 C 420 152 430 64 560 64 L 740 64 L 740 200 C 600 200 480 236 300 236 Z" style:fill="var(--color-primary)" fill-opacity="0.08" stroke-dasharray="6 4" style:stroke="var(--color-primary)" />
				<text x="560" y="100" font-size="12" style:fill="var(--color-primary-fg)">EEZ · 2 rings</text>
				{#each [0, 1, 2, 3] as i}
					<polygon
						points="{360 + i * 78},{120} {398 + i * 78},{120} {417 + i * 78},{154} {398 + i * 78},{188} {360 + i * 78},{188} {341 + i * 78},{154}"
						style:fill="var(--color-primary)"
						fill-opacity="0.1"
						style:stroke="var(--color-primary)"
						stroke-opacity="0.6"
					/>
				{/each}
				<rect x="360" y="134" width="38" height="38" rx="5" style:fill="var(--color-surface-0)" style:stroke="var(--color-primary)" />
				<text x="379" y="161" text-anchor="middle" font-size="20" style:fill="var(--color-primary-fg)">⚓</text>
				<circle cx="520" cy="154" r="14" style:fill="var(--color-success)" />
				<text x="520" y="158" text-anchor="middle" font-size="8" font-weight="bold" fill="#04121f">FF</text>
				<text x="672" y="154" font-size="24" style:fill="var(--color-error)">✳</text>
				<text x="380" y="220" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Mines block merchants; warships push through and take damage.</text>
				<text x="600" y="220" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Each ship moves 1 hex/tick.</text>
			{:else if kind === "election"}
				<!-- Half ballot box, half balance sheet -->
				{@render box(50, 50, 280, 110, "Ballot box", "residents who cast a vote", "friendly")}
				{@render box(430, 50, 280, 110, "Oligarchs", "wealth × loyalty to the party", "warning")}
				<text x="380" y="118" text-anchor="middle" font-size="20" style:fill="var(--color-fg-muted)">50 : 50</text>
				{@render connect(330, 105, 425, 105)}
				{@render box(220, 186, 320, 34, "Effective vote", "", "primary")}
				{@render connect(190, 160, 300, 186)}
				{@render connect(570, 160, 460, 186)}
			{:else if kind === "sortie"}
				<!-- Mission timeline: launch → flight time → effect -->
				<line x1="70" y1="90" x2="690" y2="90" style:stroke="var(--color-line)" stroke-width="2" />
				{#each [110, 320, 530, 670] as x, i}
					<circle cx={x} cy="90" r="9" style:fill="var(--color-{i === 3 ? 'success' : 'primary'})" />
					<text x={x} y="126" text-anchor="middle" font-size="11" style:fill="var(--color-base-content)">
						{["train", "launch · fuel spent", "cron: flight time", "effect + XP"][i]}
					</text>
				{/each}
				<text x="70" y="48" font-size="12" font-weight="700" style:fill="var(--color-base-content)">Fuel</text>
				<rect x="120" y="36" width="460" height="20" rx="5" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
				<rect x="120" y="36" width="250" height="20" rx="5" style:fill="var(--color-warning)" fill-opacity="0.7" />
				<text x="600" y="51" font-size="11" style:fill="var(--color-fg-muted)">220 → 184</text>
				<text x="380" y="178" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">The mission needs the squadron's role; a fighter cannot bomb industry.</text>
			{:else if kind === "needs"}
				<!-- Four civilian needs with the 0.85 shortage threshold -->
				<text x="40" y="36" font-size="13" font-weight="700" style:fill="var(--color-base-content)">Daily supply per civilian</text>
				{#each ["Food", "Water", "Electricity", "Heat"] as need, i}
					<text x="40" y={78 + i * 38} font-size="12" style:fill="var(--color-base-content)">{need}</text>
					<rect x="160" y={64 + i * 38} width="470" height="20" rx="4" style:fill="var(--color-surface-2)" />
					<rect x="160" y={64 + i * 38} width={470 * [0.35, 0.3, 0.2, 0.15][i]} height="20" rx="4" style:fill="var(--color-{['success', 'primary', 'warning', 'error'][i]})" fill-opacity="0.65" />
					<text x="648" y={79 + i * 38} font-size="11" style:fill="var(--color-fg-muted)">weight {[0.35, 0.3, 0.2, 0.15][i]}</text>
				{/each}
				<line x1="160" y1="58" x2="160" y2="182" style:stroke="var(--color-line)" />
				<text x="380" y="222" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Below 0.85 covered, hardship erodes opinion and stability.</text>
			{:else if kind === "cyber"}
				<!-- Intrusion chain with heat meter -->
				{#each ["Asset", "Scan", "Escalate", "Pivot", "Files"] as step, i}
					{@render box(20 + i * 148, 44, 120, 52, step, ["access 1", "900", "1,500", "2,200", "6,000"][i], i === 4 ? "error" : "primary")}
					{#if i < 4}{@render connect(140 + i * 148, 70, 168 + i * 148, 70)}{/if}
				{/each}
				<text x="40" y="150" font-size="12" font-weight="700" style:fill="var(--color-base-content)">Heat</text>
				<rect x="100" y="134" width="560" height="24" rx="5" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
				<rect x="100" y="134" width="300" height="24" rx="5" style:fill="var(--color-error)" fill-opacity="0.5" />
				<line x1="660" y1="128" x2="660" y2="164" style:stroke="var(--color-error)" stroke-width="2" />
				<text x="660" y="182" text-anchor="end" font-size="10" style:fill="var(--color-fg-muted)">100 = burned</text>
				<text x="380" y="216" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Each action raises heat; it decays 3/hour. Cover tracks before the asset burns.</text>
			{:else if kind === "history"}
				<!-- Daily snapshots saved at midnight -->
				<line x1="60" y1="120" x2="700" y2="120" style:stroke="var(--color-line)" stroke-width="2" />
				{#each [100, 250, 400, 550, 680] as x, i}
					<circle cx={x} cy="120" r={i === 4 ? 11 : 8} style:fill="var(--color-{i === 4 ? 'primary' : 'surface-0'})" style:stroke="var(--color-primary)" stroke-width="2" />
					<text x={x} y="98" text-anchor="middle" font-size="10" style:fill="var(--color-fg-muted)">{["Mon", "Tue", "Wed", "Thu", "Today"][i]}</text>
					<rect x={x - 32} y="140" width="64" height="30" rx="4" style:fill="var(--color-surface-2)" style:stroke="var(--color-line)" />
					<text x={x} y="159" text-anchor="middle" font-size="10" style:fill="var(--color-base-content)">{i === 4 ? "live" : "saved"}</text>
				{/each}
				<text x="380" y="54" text-anchor="middle" font-size="13" font-weight="700" style:fill="var(--color-base-content)">One world snapshot per day at 00:00</text>
				<text x="380" y="200" text-anchor="middle" font-size="11" style:fill="var(--color-fg-muted)">Pick any date on the history page to replay who held what.</text>
			{/if}
		</svg>
	</div>
	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	@reference "../../../app.css";

	.doc-art {
		@apply my-6 overflow-hidden rounded-sm border border-line/20 bg-surface-2/60 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)];
		background-image: radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 45%);
	}
	.doc-art-head {
		@apply flex items-center gap-2 border-b border-line/15 px-4 py-2;
	}
	.doc-art-mark {
		@apply flex size-7 items-center justify-center rounded-sm border border-primary/30 bg-primary/12 text-primary-fg;
	}
	.doc-art-body {
		@apply overflow-x-auto px-3 py-3;
	}
	.doc-art-body :global(svg) {
		@apply mx-auto block w-full;
		max-height: 320px;
	}
	.doc-art figcaption {
		@apply border-t border-line/15 px-4 py-2 text-center text-xs text-fg-muted;
	}
	.doc-art.compact {
		@apply my-0 border-0 bg-transparent shadow-none;
	}
	.doc-art.compact .doc-art-head {
		@apply border-0 px-2 py-1;
	}
	.doc-art.compact .doc-art-body {
		@apply px-1 py-0;
	}
	.doc-art.compact .doc-art-body :global(svg) {
		max-height: 90px;
	}
</style>
