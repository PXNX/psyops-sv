<!-- The fleet console: a hex sea you can actually sail. Select a hex to inspect
     it, select one of your ships and click "Move" then a destination hex, refuel
     at ports, load cargo, queue hulls and repairs at docks, and lay minefields. -->
<script lang="ts">
	import { tick } from "svelte";
	import { enhance, type SubmitFunction } from "$app/forms";
	import { page } from "$app/state";
	import type { PageData } from "./$types";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import Tutorial from "#lib/component/Tutorial.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import FluentMap from "~icons/fluent/map-24-regular";
	import FluentClock from "~icons/fluent/clock-24-filled";
	import FluentWarning from "~icons/fluent/warning-20-filled";
	import {
		AIRCRAFT,
		AIR_MISSIONS,
		AIR_MISSION_IDS,
		HEX_BOUNDS,
		SHIP_CLASSES,
		SHIP_CATEGORY_LABEL,
		SHIP_CATEGORIES,
		FLEET_WEAPONS,
		buildCost,
		constructionHours,
		dockUpgradeCost,
		FACILITY,
		hexKey,
		portUpgradeCost,
		hexMapViewBox,
		hexPolygon,
		hexToPixel,
		type Hex,
		type ShipClassId
	} from "#lib/config/index.js";

	let { data }: { data: PageData } = $props();

	const navySteps = [
		{
			id: "hex",
			title: "1. Hex auswählen",
			body: "Klicken Sie auf ein Sechskant auf der Karte. Das Panel zeigt dann Hafen, Schiffe und Minen dieses Feldes.",
			target: '[data-tutorial="navy-hex"]',
			done: "hex-selected"
		},
		{
			id: "port",
			title: "2. Hafen bauen",
			body: "Im markierten Formular einen Namen eingeben, eine Küstenregion wählen und absenden. Nur eine Region kann einen Hafen haben – er entsteht in ihrer EEZ.",
			target: '[data-tutorial="build-port"]',
			done: "port-built",
			manual: "Formular anzeigen"
		},
		{
			id: "dock",
			title: "3. Dock bauen",
			body: "Klicken Sie auf den markierten Button, um im Hafen ein Dock zu errichten oder seine Stufe zu erhöhen. Mehr Stufen bedeuten mehr Baubays.",
			target: '[data-tutorial="dock-button"]',
			done: "dock-built",
			manual: "Button anzeigen"
		},
		{
			id: "shipyard",
			title: "4. Schiff ordern",
			body: "Wählen Sie im Shipyard ein Dock und eine Schiffsklasse und klicken Sie auf „Add to queue“. Das Schiff erscheint nach dem Bau im Hafen.",
			target: '[data-tutorial="shipyard"]',
			done: "ship-ordered",
			manual: "Shipyard anzeigen"
		},
		{
			id: "intel",
			title: "5. Seeaufklärung",
			body: "Starten Sie im markierten Panel einen Sonar-Durchgang über dem ausgewählten Hex. Sonar ist der einzige Sensor, der zuverlässig U-Boote findet.",
			target: '[data-tutorial="sea-intel"]',
			done: "sea-intel",
			manual: "Panel anzeigen"
		},
		{
			id: "air",
			title: "6. Luftoperation",
			body: "Weisen Sie im Panel Air operations ein Geschwader einer Aufgabe zu – zum Beispiel Seezielbekämpfung oder Aufklärung. Die Details stehen in /docs/air.",
			target: '[data-tutorial="air-ops"]',
			manual: "Verstanden"
		}
	];

	const airSteps = [
		{
			id: "panel",
			title: "1. Air operations öffnen",
			body: "Hier stehen alle einsatzbereiten Geschwader mit Treibstoff und Erfahrung. Klicken Sie in das Formular, um zu beginnen.",
			target: '[data-tutorial="air-ops"]',
			done: "air-panel-open",
			manual: "Formular anzeigen"
		},
		{
			id: "kind",
			title: "2. Einsatz wählen",
			body: "Wählen Sie eine Einsatzart. Jede verlangt eine bestimmte Rolle: Bomber für Bombardierung, Naval bomber für Seeziele, Tanker für Betankung.",
			target: '[data-tutorial="air-kind"]',
			done: "air-kind-changed",
			manual: "Auswahl anzeigen"
		},
		{
			id: "launch",
			title: "3. Starten",
			body: "Ziel wählen und „Launch mission“ klicken. Der Treibstoff wird sofort abgezogen, die Wirkung kommt nach dem Flug – Details in /docs/air.",
			target: '[data-tutorial="air-ops"]',
			done: "air-mission",
			manual: "Formular anzeigen"
		}
	];

	const enhanceForm: SubmitFunction = () => async ({ result, update }) => {
		await update();
		toastResult(result);
		if (result.type === "success") {
			const tutorial = (result.data as { tutorial?: string } | null)?.tutorial;
			if (tutorial) window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: tutorial }));
		}
	};

	const viewBox = $derived.by(() => {
		const vb = hexMapViewBox();
		return `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`;
	});
	const hexes: Hex[] = [];
	for (let r = HEX_BOUNDS.minR; r <= HEX_BOUNDS.maxR; r++) {
		for (let q = HEX_BOUNDS.minQ; q <= HEX_BOUNDS.maxQ; q++) hexes.push({ q, r });
	}

	let selectedHex = $state<Hex | null>(null);
	let selectedShipId = $state<number | null>(null);
	let movingShipId = $state<number | null>(null);
	let moveTarget = $state<Hex | null>(null);
	let moveForm = $state<HTMLFormElement>();
	let orderClass = $state<ShipClassId>("corvette");
	let orderDockId = $state<number | null>(null);
	let cargoResource = $state("steel");
	let cargoAmount = $state(100);
	let cargoDirection = $state<"load" | "unload">("load");
	let seaSensor = $state("sonar");
	let airUnitId = $state<number | null>(null);
	let airMissionKind = $state<(typeof AIR_MISSION_IDS)[number]>("strategic_bombing");
	let airTargetRegion = $state<number | null>(null);
	let now = $state(Date.now());

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});
	$effect(() => {
		if (!moveTarget) return;
		const target = moveTarget;
		moveTarget = null;
		void tick().then(() => moveForm?.requestSubmit());
		void target;
	});

	const key = (h: Hex) => hexKey(h);
	const portAt = (h: Hex) => data.ports.find((p) => p.q === h.q && p.r === h.r);
	const dockAt = (h: Hex) => data.docks.find((d) => d.q === h.q && d.r === h.r);
	const minesAt = (h: Hex) => data.mines.filter((m) => m.q === h.q && m.r === h.r);
	const shipsAt = (h: Hex) => data.ships.filter((s) => s.q === h.q && s.r === h.r && s.status !== "sunk");
	const def = (id: string) => SHIP_CLASSES[id as ShipClassId];
	const mineColor = (stateId: number) => (data.enemyStateIds.includes(stateId) ? "#ef4444" : "#22d3ee");
	const shipColor = (stateId: number) =>
		stateId === data.myStateId ? "#4ade80" : data.alliedStateIds.includes(stateId) ? "#38bdf8" : "#f87171";
	const isEnemy = (stateId: number) => data.enemyStateIds.includes(stateId);

	const myShips = $derived(data.ships.filter((s) => s.stateId === data.myStateId && s.status !== "sunk"));
	const myPorts = $derived(data.ports.filter((p) => p.stateId === data.myStateId));
	const myDocks = $derived(data.docks.filter((d) => d.stateId === data.myStateId));
	const selectedShip = $derived(data.ships.find((s) => s.id === selectedShipId) ?? null);
	const selectedPort = $derived(selectedHex ? portAt(selectedHex) : null);
	const selectedDock = $derived(selectedHex ? dockAt(selectedHex) : null);
	const activeMoves = $derived(data.ships.filter((s) => s.status === "moving"));

	function hexClicked(h: Hex) {
		selectedHex = h;
		const ship = shipsAt(h)[0];
		if (ship) selectedShipId = ship.id;
		if (movingShipId != null) moveTarget = h;
		window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "hex-selected" }));
	}

	function beginMove(shipId: number) {
		movingShipId = movingShipId === shipId ? null : shipId;
		selectedShipId = shipId;
	}
	function cancelMove() {
		movingShipId = null;
	}
	function pickOrderDock() {
		if (!orderDockId && myDocks.length) orderDockId = myDocks[0]!.id;
	}
	$effect(() => {
		pickOrderDock();
	});
	$effect(() => {
		const value = page.url.searchParams.get("hex");
		if (!value) return;
		const [q, r] = value.split(",").map(Number);
		if (Number.isInteger(q) && Number.isInteger(r)) selectedHex = { q, r };
	});

	const pct = (value: number, max: number) => Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
	const timeLeft = (iso: string | null) => {
		if (!iso) return "—";
		const ms = new Date(iso).getTime() - now;
		if (ms <= 0) return "ready";
		const h = Math.floor(ms / 3_600_000);
		const m = Math.ceil((ms % 3_600_000) / 60_000);
		return h ? `${h}h ${m}m` : `${m}m`;
	};
	const progress = (item: (typeof data.queue)[number]) => {
		if (!item.startsAt || !item.completesAt) return 0;
		const start = new Date(item.startsAt).getTime();
		const end = new Date(item.completesAt).getTime();
		return pct(now - start, end - start);
	};
</script>

<PageContainer>
	<PageHeader
		title="Fleet at sea"
		subtitle="Hex sea lanes, ports, docks and the ships that move between them"
		icon={FluentMap}
	/>

	{#if !data.myStateId}
		<EmptyState title="No fleet yet" description="Join a state to command ships, build ports and sail the sea lanes." />
	{:else}
		{#if !data.canCommand}
			<div class="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
				<FluentWarning class="size-4" />
				Only the president or defence minister can issue fleet orders. You can still watch the sea.
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<!-- ── The hex sea ──────────────────────────────────────────────── -->
			<section class="min-w-0 rounded-lg border border-line/20 bg-surface-2 p-2">
				<div class="mb-2 flex flex-wrap items-center gap-3 px-1 text-xs text-fg-muted">
					<span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-[#4ade80]"></i>Yours</span>
					<span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-[#38bdf8]"></i>Allied</span>
					<span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-[#f87171]"></i>Hostile</span>
					<span class="flex items-center gap-1.5"><i class="size-2.5 rounded-full bg-[#ef4444]"></i>Mines</span>
					<span class="flex items-center gap-1.5"><i class="size-2.5 rounded-full bg-[#c084fc]"></i>GNSS jammer</span>
					{#if movingShipId != null}
						<button class="ml-auto rounded bg-primary/20 px-2 py-1 text-primary-fg" onclick={cancelMove}>Cancel move</button>
					{:else}
						<span class="ml-auto">Click a hex to inspect it</span>
					{/if}
				</div>
				<svg viewBox={viewBox} class="w-full h-auto max-h-[62vh]" role="img" aria-label="Naval hex map">
					{#each hexes as h (key(h))}
						{@const port = portAt(h)}
						{@const dock = dockAt(h)}
						{@const ships = shipsAt(h)}
						{@const mines = minesAt(h)}
						{@const selected = selectedHex && key(selectedHex) === key(h)}
						{@const hostileMine = mines.some((m) => isEnemy(m.stateId))}
						<g
							role="button"
							tabindex="0"
							data-tutorial="navy-hex"
							onclick={() => hexClicked(h)}
							onkeydown={(e) => (e.key === "Enter" || e.key === " ") && hexClicked(h)}
							class="cursor-pointer"
						>
							<polygon
								points={hexPolygon(h)}
								fill={selected ? "#1d4ed8" : hostileMine ? "#451a1a" : port ? "#0e3a2a" : "#0b2036"}
								stroke={selected ? "#93c5fd" : "#1e3a5f"}
								stroke-width={selected ? 2 : 0.8}
							/>
							{#if port}
								<text
									x={hexToPixel(h).x}
									y={hexToPixel(h).y + 8}
									text-anchor="middle"
									font-size="9"
									fill="#7dd3fc"
								>
									⚓{port.name.slice(0, 6)}
								</text>
							{/if}
							{#if dock}
								<circle cx={hexToPixel(h).x + 19} cy={hexToPixel(h).y - 16} r="5" fill="#fbbf24" />
							{/if}
							{#each mines as mine, i}
								<text
									x={hexToPixel(h).x - 16 + i * 8}
									y={hexToPixel(h).y - 8}
									text-anchor="middle"
									font-size="11"
									fill={mineColor(mine.stateId)}
								>✳</text
								>
							{/each}
							{#each ships as ship, i}
								{#if ship.shipClass === "gnss_jammer"}
									<text
										x={hexToPixel(h).x - 7 + i * 14}
										y={hexToPixel(h).y + 9}
										text-anchor="middle"
										font-size="9"
										font-weight="bold"
										fill="#c084fc"
									>J</text>
								{/if}
								<circle
									cx={hexToPixel(h).x - 7 + i * 14}
									cy={hexToPixel(h).y + 18}
									r="7"
									fill={shipColor(ship.stateId)}
									stroke="#04121f"
									stroke-width="1"
								/>
								<text
									x={hexToPixel(h).x - 7 + i * 14}
									y={hexToPixel(h).y + 21}
									text-anchor="middle"
									font-size="6"
									font-weight="bold"
									fill="#04121f"
								>{def(ship.shipClass)?.short ?? "?"}</text
								>
							{/each}
							<title>
								{h.q},{h.r}{port ? ` · ${port.name}` : ""}{ships.length ? ` · ${ships.length} ship(s)` : ""}{mines.length
									? ` · ${mines.length} minefield(s)`
									: ""}
							</title>
						</g>
					{/each}
				</svg>
			</section>

			<!-- ── Side panels ───────────────────────────────────────────────── -->
			<div class="space-y-4">
				<!-- Selected hex -->
				<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
					<h2 class="text-sm font-semibold text-heading">
						Hex {selectedHex ? `${selectedHex.q},${selectedHex.r}` : "—"}
					</h2>
					{#if selectedPort}
						{@const blocked = data.blockedPorts[selectedPort.id]}
						<div class="mt-2 space-y-1 text-xs text-fg-muted">
							<div class="font-medium text-fg">⚓ {selectedPort.name}</div>
							<div>Fuel: {selectedPort.fuelStock} · Level {selectedPort.level}</div>
							<div>Cargo: {Object.entries(selectedPort.stock ?? {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(", ") || "empty"}</div>
						</div>
						{#if blocked}
							<div class="mt-2 flex items-center gap-1.5 text-xs text-danger"><FluentWarning class="size-4" />Blockaded by enemy mines</div>
						{/if}
						{#if data.canCommand && selectedPort.stateId === data.myStateId}
							<div class="mt-3 flex flex-wrap gap-2">
								{#if selectedPort.level < FACILITY.maxPortLevel}
									<form method="POST" action="?/upgradePort" use:enhance={enhanceForm}>
										<input type="hidden" name="portId" value={selectedPort.id} />
										<Button type="submit" size="sm" variant="secondary" title="More fuel storage and cargo capacity">
											Expand port → L{selectedPort.level + 1}
										</Button>
									</form>
								{/if}
								{#if !selectedDock || selectedDock.level < FACILITY.maxDockLevel}
									<form method="POST" action="?/buildDock" use:enhance={enhanceForm} data-tutorial="dock-button">
										<input type="hidden" name="portId" value={selectedPort.id} />
										<Button type="submit" size="sm">
											{selectedDock ? `Expand dock → L${selectedDock.level + 1}` : "Build dock"}
										</Button>
									</form>
								{/if}
							</div>
							<p class="mt-1 text-[11px] text-fg-muted">
								{#if selectedPort.level < FACILITY.maxPortLevel}
									Port upgrade: {portUpgradeCost(selectedPort.level).money.toLocaleString()} · {portUpgradeCost(selectedPort.level).steel} steel
								{/if}
								{#if !selectedDock || selectedDock.level < FACILITY.maxDockLevel}
									<br />Dock: {dockUpgradeCost(selectedDock?.level ?? 1).money.toLocaleString()} · {dockUpgradeCost(selectedDock?.level ?? 1).steel} steel
								{/if}
							</p>
						{/if}
					{:else if data.canCommand && data.portCandidates.length}
						<form method="POST" action="?/buildPort" use:enhance={enhanceForm} data-tutorial="build-port" class="mt-2 space-y-2">
							<p class="text-xs text-fg-muted">
								Establish a port in the EEZ of one of your coastal regions (one per region).
							</p>
							<input
								name="name"
								required
								maxlength="100"
								placeholder="Port name"
								class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-sm"
							/>
							<select name="regionId" required class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
								{#each data.portCandidates as region}
									<option value={region.id}>{region.label}</option>
								{/each}
							</select>
							<Button type="submit" size="sm">Build port</Button>
						</form>
					{:else if selectedHex && data.canCommand}
						<p class="mt-2 text-xs text-fg-muted">Every maritime region you own already has a port.</p>
					{/if}
					{#if selectedDock}
						<div class="mt-2 text-xs text-fg-muted">Dock level {selectedDock.level} · {selectedDock.level} build bay(s)</div>
					{/if}
					{#if selectedHex && minesAt(selectedHex).length}
						<div class="mt-2 text-xs text-danger">
							{minesAt(selectedHex).length} minefield(s) · strength {minesAt(selectedHex).map((m) => m.strength).join(", ")}
						</div>
					{/if}
				</section>

				<!-- Sea reconnaissance -->
				{#if selectedHex}
					{@const reading = data.seaIntel[hexKey(selectedHex)]}
					<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
						<h2 class="text-sm font-semibold text-heading">Sea intel · {selectedHex.q},{selectedHex.r}</h2>
						{#if reading}
							<div class="mt-1 text-[11px] text-fg-muted">
								{reading.sensor} sweep · {Object.entries(reading.contacts).map(([k, v]) => `${k} ×${v}`).join(", ") || "no contacts"} ·
								{reading.mines} mines · {reading.confidence}% confidence
							</div>
						{:else}
							<div class="mt-1 text-[11px] text-fg-muted">No fresh pass over this hex.</div>
						{/if}
						<form method="POST" action="?/launchSeaIntel" use:enhance={enhanceForm} data-tutorial="sea-intel" class="mt-2 flex flex-wrap items-end gap-2">
							<input type="hidden" name="q" value={selectedHex.q} />
							<input type="hidden" name="r" value={selectedHex.r} />
							<label class="text-xs">Sensor
								<select name="sensor" bind:value={seaSensor} class="mt-1 rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
									{#each data.seaSensors as sensor}
										<option value={sensor.id} disabled={!!sensor.cooldownEndsAt}>
											{sensor.label}{sensor.cooldownEndsAt ? " · cooling down" : ""}
										</option>
									{/each}
								</select>
							</label>
							<Button type="submit" size="sm" variant="ghost">Launch sweep</Button>
						</form>
					</section>
				{/if}

				<!-- Air arm -->
				<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
					<h2 class="text-sm font-semibold text-heading">Air operations</h2>
					{#if data.airSupport.units.length === 0}
						<p class="mt-1 text-xs text-fg-muted">No aircraft trained yet.</p>
					{:else}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each Object.entries(data.airSupport.byType) as [type, count]}
								<Badge tone="blue">{AIRCRAFT[type as keyof typeof AIRCRAFT]?.short ?? type} ×{count}</Badge>
							{/each}
						</div>
						{#if data.canCommand}
							<form
								method="POST"
								action="?/launchAirMission"
								use:enhance={enhanceForm}
								data-tutorial="air-ops"
								class="mt-3 space-y-2"
								onclick={() => window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "air-panel-open" }))}
							>
								<select name="unitId" bind:value={airUnitId} class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
									{#each data.airSupport.units as unit}
										<option value={unit.id}>
											{AIRCRAFT[unit.unitType as keyof typeof AIRCRAFT]?.label ?? unit.unitType} · {unit.fuel} fuel · {unit.experience} exp
										</option>
									{/each}
								</select>
								<select
									name="kind"
									bind:value={airMissionKind}
									data-tutorial="air-kind"
									class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
									onchange={() => window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "air-kind-changed" }))}
								>
									{#each AIR_MISSION_IDS as kind}
										<option value={kind}>{AIR_MISSIONS[kind].label}</option>
									{/each}
								</select>
								{#if AIR_MISSIONS[airMissionKind].target !== "hex"}
									<select
										name="targetRegionId"
										bind:value={airTargetRegion}
										class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
									>
										{#each data.regionList.filter((r) => AIR_MISSIONS[airMissionKind].target !== "friendly_region" || r.stateId === data.myStateId) as region}
											<option value={region.id}>{region.label}</option>
										{/each}
									</select>
								{:else}
									<p class="text-[11px] text-fg-muted">Target hex: {selectedHex ? `${selectedHex.q},${selectedHex.r}` : "select a hex on the map"}</p>
									<input type="hidden" name="q" value={selectedHex?.q ?? ""} />
									<input type="hidden" name="r" value={selectedHex?.r ?? ""} />
								{/if}
								<p class="text-[11px] text-fg-muted">
									{AIR_MISSIONS[airMissionKind].blurb} · {AIR_MISSIONS[airMissionKind].fuelCost} fuel · ~{AIR_MISSIONS[airMissionKind].durationHours}h
								</p>
								<Button type="submit" size="sm">Launch mission</Button>
							</form>
						{/if}
					{/if}
					{#if data.airMissions.length}
						<ul class="mt-3 space-y-1 border-t border-line/15 pt-2 text-[11px]">
							{#each data.airMissions as mission}
								<li class="flex justify-between gap-2">
									<span>{AIR_MISSIONS[mission.kind as keyof typeof AIR_MISSIONS]?.label ?? mission.kind}</span>
									<span class="text-fg-muted">{mission.status} · {timeLeft(mission.completesAt)}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<!-- Selected ship -->
				{#if selectedShip && selectedShip.stateId === data.myStateId}
					{@const shipDef = def(selectedShip.shipClass)}
					<section class="rounded-lg border border-primary/30 bg-surface-1 p-3">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-semibold text-heading">{selectedShip.name}</h2>
							<Badge tone={selectedShip.status === "sunk" ? "red" : "green"}>{selectedShip.status}</Badge>
						</div>
						<div class="mt-1 text-xs text-fg-muted">{shipDef?.role}</div>
						{#if (data.jamming[selectedShip.id]?.strength ?? 0) > 0}
							{@const jam = data.jamming[selectedShip.id]}
							<div class="mt-2 rounded border border-purple-500/40 bg-purple-500/10 px-2 py-1.5 text-[11px] text-purple-300">
								GNSS jamming {jam!.strength} · slower steaming, less accurate weapons
								<div class="text-purple-300/70">
									Sources: {jam!.sources.map((s) => `${s.domain} #${s.id}`).join(", ")}
								</div>
							</div>
						{/if}
						<div class="mt-2 space-y-2 text-xs">
							<div>
								<div class="flex justify-between"><span>Hull</span><span>{selectedShip.health}/{shipDef?.hp}</span></div>
								<div class="h-1.5 rounded bg-surface-4"><div class="h-full rounded bg-positive" style="width:{pct(selectedShip.health, shipDef?.hp ?? 1)}%"></div></div>
							</div>
							<div>
								<div class="flex justify-between"><span>Fuel</span><span>{selectedShip.fuel}/{shipDef?.fuelCapacity}</span></div>
								<div class="h-1.5 rounded bg-surface-4"><div class="h-full rounded bg-sky-400" style="width:{pct(selectedShip.fuel, shipDef?.fuelCapacity ?? 1)}%"></div></div>
							</div>
							{#if shipDef?.cargo.kind}
								<div>Cargo: {selectedShip.cargoType ?? "empty"} {selectedShip.cargoAmount}/{shipDef.cargo.capacity}</div>
							{/if}
							{#if shipDef?.weapons.length}
								<div class="text-fg-muted">Weapons: {shipDef.weapons.map((w) => FLEET_WEAPONS[w].label).join(", ")}</div>
							{/if}
						</div>
						{#if data.canCommand && selectedShip.status !== "sunk"}
							<div class="mt-3 flex flex-wrap gap-2">
								<Button size="sm" onclick={() => beginMove(selectedShip.id)} disabled={selectedShip.status === "repairing"}>
									{movingShipId === selectedShip.id ? "Pick a hex…" : "Move"}
								</Button>
								{#if selectedShip.status === "moving"}
									<form method="POST" action="?/stopShip" use:enhance={enhanceForm}>
										<input type="hidden" name="shipId" value={selectedShip.id} />
										<Button type="submit" size="sm" variant="ghost">Hold</Button>
									</form>
								{/if}
								{#if selectedPort && selectedPort.stateId === data.myStateId}
									<form method="POST" action="?/refuelShip" use:enhance={enhanceForm}>
										<input type="hidden" name="shipId" value={selectedShip.id} />
										<Button type="submit" size="sm" variant="ghost">Refuel</Button>
									</form>
								{/if}
								{#if selectedDock && selectedDock.stateId === data.myStateId && selectedShip.health < (shipDef?.hp ?? 0)}
									<form method="POST" action="?/repairShip" use:enhance={enhanceForm}>
										<input type="hidden" name="shipId" value={selectedShip.id} />
										<Button type="submit" size="sm" variant="ghost">Repair</Button>
									</form>
								{/if}
								{#if shipDef?.minelayer && selectedShip.status === "idle"}
									<form method="POST" action="?/layMines" use:enhance={enhanceForm}>
										<input type="hidden" name="shipId" value={selectedShip.id} />
										<Button type="submit" size="sm" variant="ghost">Lay mines</Button>
									</form>
								{/if}
							</div>
							{#if shipDef?.cargo.kind && selectedPort && selectedPort.stateId === data.myStateId}
								<form method="POST" action="?/cargo" use:enhance={enhanceForm} class="mt-3 flex flex-wrap items-end gap-2 border-t border-line/15 pt-3">
									<input type="hidden" name="shipId" value={selectedShip.id} />
									<input type="hidden" name="portId" value={selectedPort.id} />
									<label class="text-xs">Goods
										<input name="resource" bind:value={cargoResource} class="mt-1 w-24 rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs" />
									</label>
									<label class="text-xs">Amount
										<input name="amount" type="number" min="1" bind:value={cargoAmount} class="mt-1 w-20 rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs" />
									</label>
									<label class="text-xs">Action
										<select name="direction" bind:value={cargoDirection} class="mt-1 rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
											<option value="load">Load</option>
											<option value="unload">Unload</option>
										</select>
									</label>
									<Button type="submit" size="sm" variant="ghost">Go</Button>
								</form>
							{/if}
						{/if}
					</section>
				{/if}

				<!-- Dock orders -->
				{#if data.canCommand && myDocks.length}
					<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
						<h2 class="text-sm font-semibold text-heading">Shipyard</h2>
						<form method="POST" action="?/orderShip" use:enhance={enhanceForm} data-tutorial="shipyard" class="mt-2 space-y-2">
							<select name="dockId" bind:value={orderDockId} class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
								{#each myDocks as dock}
									<option value={dock.id}>Dock L{dock.level} · hex {dock.q},{dock.r}</option>
								{/each}
							</select>
							<select name="shipClass" bind:value={orderClass} class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
								{#each SHIP_CATEGORIES as category}
									<optgroup label={SHIP_CATEGORY_LABEL[category]}>
										{#each Object.values(SHIP_CLASSES).filter((c) => c.category === category) as ship}
											<option value={ship.id}>{ship.label}</option>
										{/each}
									</optgroup>
								{/each}
							</select>
							<p class="text-[11px] text-fg-muted">
								{buildCost(orderClass).money.toLocaleString()} credits · {buildCost(orderClass).steel} steel · ~{constructionHours(
									orderClass,
									myDocks.find((d) => d.id === orderDockId)?.level ?? 1
								)}h at this dock
							</p>
							<Button type="submit" size="sm">Add to queue</Button>
						</form>
					</section>
				{/if}
			</div>
		</div>

		<!-- ── Below the map: fleet, queues and log ─────────────────────────── -->
		<div class="mt-4 grid gap-4 lg:grid-cols-3">
			<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
				<h2 class="text-sm font-semibold text-heading">Your fleet <span class="text-fg-muted">({myShips.length})</span></h2>
				{#if myShips.length === 0}
					<p class="mt-2 text-xs text-fg-muted">No ships yet. Build a dock and order a hull.</p>
				{:else}
					<ul class="mt-2 space-y-1 text-xs">
						{#each myShips as ship}
							<li>
								<button
									class="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-surface-3"
									onclick={() => {
										selectedShipId = ship.id;
										selectedHex = { q: ship.q, r: ship.r };
									}}
								>
									<span><span class="font-medium">{ship.name}</span> <span class="text-fg-muted">· {ship.q},{ship.r}</span></span>
									<span class="text-fg-muted">{ship.status} · {ship.health}hp · {ship.fuel}fuel</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
				<h2 class="flex items-center gap-1.5 text-sm font-semibold text-heading"><FluentClock class="size-4" />Dock queue</h2>
				{#if data.queue.length === 0}
					<p class="mt-2 text-xs text-fg-muted">Nothing under construction or repair.</p>
				{:else}
					<ul class="mt-2 space-y-2">
						{#each data.queue as item}
							<li class="text-xs">
								<div class="flex items-center justify-between gap-2">
									<span>
										{item.kind === "construct" ? def(item.shipClass ?? "")?.label : "Repair"}
										<span class="text-fg-muted">· dock #{item.dockId}</span>
									</span>
									<span class="text-fg-muted">{item.status} · {timeLeft(item.completesAt)}</span>
								</div>
								{#if item.status === "building"}
									<div class="mt-1 h-1 rounded bg-surface-4"><div class="h-full rounded bg-primary" style="width:{progress(item)}%"></div></div>
								{/if}
								{#if data.canCommand && item.stateId === data.myStateId && item.status === "queued"}
									<form method="POST" action="?/cancelJob" use:enhance={enhanceForm} class="mt-1">
										<input type="hidden" name="itemId" value={item.id} />
										<button type="submit" class="text-[11px] text-danger hover:underline">Cancel & refund</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
				<h2 class="text-sm font-semibold text-heading">Sea log</h2>
				{#if data.events.length === 0}
					<p class="mt-2 text-xs text-fg-muted">No fleet activity yet.</p>
				{:else}
					<ul class="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-[11px] text-fg-muted">
						{#each data.events as event}
							<li class="border-b border-line/10 pb-1">
								<span class="text-fg">{event.kind.replace(/_/g, " ")}</span>
								{#if event.q != null && event.r != null}<span class="text-fg-muted"> · {event.q},{event.r}</span>{/if}
								<div>{event.message}</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		{#if activeMoves.length}
			<p class="mt-3 text-xs text-fg-muted">{activeMoves.length} ship(s) under way — they advance on the next fleet tick.</p>
		{/if}

		<form bind:this={moveForm} method="POST" action="?/moveShip" use:enhance={enhanceForm} class="hidden">
			<input type="hidden" name="shipId" value={movingShipId ?? ""} />
			<input type="hidden" name="q" value={moveTarget?.q ?? selectedHex?.q ?? ""} />
			<input type="hidden" name="r" value={moveTarget?.r ?? selectedHex?.r ?? ""} />
			<button type="submit">Move</button>
		</form>
	{/if}
	<Tutorial id="navy" title="Flotten-Kurzanleitung" steps={navySteps} />
	<Tutorial id="air" title="Luftwaffen-Kurzanleitung" steps={airSteps} />
</PageContainer>
