<!-- The fleet console: the fleet overview and its orders. The hex grid itself
     lives on the map in naval mode; pick a hex there (or by q,r / a contact
     below) to inspect it, then move ships, refuel, load cargo, queue hulls and
     repairs at docks, and lay minefields. -->
<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
	import { page } from "$app/state";
	import type { FleetPageData } from "#lib/types/fleet-page.js";
	import AirOperations from "./AirOperations.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import Tutorial from "#lib/component/Tutorial.svelte";
	import CommanderPortrait from "#lib/component/CommanderPortrait.svelte";
	import { COMMANDER_TRAITS, commanderLevel } from "#lib/config/index.js";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import FluentMap from "~icons/fluent/map-24-regular";
	import FluentClock from "~icons/fluent/clock-24-filled";
	import FluentWarning from "~icons/fluent/warning-20-filled";
	import {
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
		inBounds,
		portUpgradeCost,
		type Hex,
		type ShipClassId
	} from "#lib/config/index.js";

	/** `embedded` is set when the console is the Navy tab of the Forces page. */
	let { data, embedded = false }: { data: FleetPageData; embedded?: boolean } = $props();

	const navySteps = [
		{
			id: "hex",
			title: "1. Select a hex",
			body: "Enter q,r here or click a hex on the map's naval mode. The panel then shows the port, ships and mines on that tile.",
			target: '[data-tutorial="navy-hex"]',
			done: "hex-selected"
		},
		{
			id: "port",
			title: "2. Build a port",
			body: "Enter a name in the highlighted form, pick a coastal region and submit. Each region can hold exactly one port, placed inside its EEZ.",
			target: '[data-tutorial="build-port"]',
			done: "port-built",
			manual: "Show form"
		},
		{
			id: "dock",
			title: "3. Build a dock",
			body: "Click the highlighted button to build a dock or raise its level. More levels mean more construction bays.",
			target: '[data-tutorial="dock-button"]',
			done: "dock-built",
			manual: "Show button"
		},
		{
			id: "shipyard",
			title: "4. Order a ship",
			body: "In the Shipyard pick a dock and a class, then click “Add to queue”. The hull appears in the port once construction finishes.",
			target: '[data-tutorial="shipyard"]',
			done: "ship-ordered",
			manual: "Show shipyard"
		},
		{
			id: "intel",
			title: "5. Sea reconnaissance",
			body: "Launch a sonar sweep over the selected hex. Sonar is the only sensor that reliably finds submarines; the details are in /docs/navy.",
			target: '[data-tutorial="sea-intel"]',
			done: "sea-intel",
			manual: "Show panel"
		},
		{
			id: "air",
			title: "6. Air operations",
			body: "Task a squadron with a mission in the Air operations panel — naval strike or reconnaissance, for example. See /docs/air for the rules.",
			target: '[data-tutorial="air-ops"]',
			manual: "Finish"
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

	let selectedHex = $state<Hex | null>(null);
	let selectedShipId = $state<number | null>(null);
	let hexQ = $state<number | string>("");
	let hexR = $state<number | string>("");
	let moveQ = $state<number | string>("");
	let moveR = $state<number | string>("");
	let orderClass = $state<ShipClassId>("corvette");
	let orderDockId = $state<number | null>(null);
	let cargoResource = $state("steel");
	let cargoAmount = $state(100);
	let cargoDirection = $state<"load" | "unload">("load");
	let seaSensor = $state("sonar");
	let now = $state(Date.now());

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const portAt = (h: Hex) => data.ports.find((p) => p.q === h.q && p.r === h.r);
	const dockAt = (h: Hex) => data.docks.find((d) => d.q === h.q && d.r === h.r);
	const minesAt = (h: Hex) => data.mines.filter((m) => m.q === h.q && m.r === h.r);
	const shipsAt = (h: Hex) => data.ships.filter((s) => s.q === h.q && s.r === h.r && s.status !== "sunk");
	const def = (id: string) => SHIP_CLASSES[id as ShipClassId];

	const myShips = $derived(data.ships.filter((s) => s.stateId === data.myStateId && s.status !== "sunk"));
	const myPorts = $derived(data.ports.filter((p) => p.stateId === data.myStateId));
	const myDocks = $derived(data.docks.filter((d) => d.stateId === data.myStateId));
	const selectedShip = $derived(data.ships.find((s) => s.id === selectedShipId) ?? null);
	const selectedPort = $derived(selectedHex ? portAt(selectedHex) : null);
	const selectedDock = $derived(selectedHex ? dockAt(selectedHex) : null);
	const activeMoves = $derived(data.ships.filter((s) => s.status === "moving"));
	/** Hexes worth jumping to: anything with a port, dock, ship or mine. The
	 *  full grid lives on /map in naval mode, not in this console. */
	const activeHexes = $derived.by(() => {
		const seen = new Map<string, Hex>();
		const add = (h: Hex) => seen.set(hexKey(h), { q: h.q, r: h.r });
		for (const p of data.ports) add(p);
		for (const d of data.docks) add(d);
		for (const s of data.ships) add(s);
		for (const m of data.mines) add(m);
		return [...seen.values()].sort((a, b) => a.r - b.r || a.q - b.q);
	});

	function hexClicked(h: Hex) {
		selectedHex = h;
		hexQ = h.q;
		hexR = h.r;
		moveQ = h.q;
		moveR = h.r;
		const ship = shipsAt(h)[0];
		if (ship) selectedShipId = ship.id;
		window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "hex-selected" }));
	}

	function selectHexFromInput() {
		const q = Number(hexQ);
		const r = Number(hexR);
		if (!inBounds({ q, r })) return;
		hexClicked({ q, r });
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
		if (Number.isInteger(q) && Number.isInteger(r)) hexClicked({ q, r });
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

<PageContainer maxWidth="full" class={embedded ? "!px-0 !py-0" : ""}>
	{#if !embedded}
		<PageHeader
			title="Fleet at sea"
			subtitle="Hex sea lanes, ports, docks and the ships that move between them"
			icon={FluentMap}
		/>
	{/if}

	{#if !data.myStateId}
		<EmptyState title="No fleet yet" subtitle="Join a state to command ships, build ports and sail the sea lanes." />
	{:else}
		{#if !data.canCommand}
			<div class="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
				<FluentWarning class="size-4" />
				Only the president or defence minister can issue fleet orders. You can still watch the sea.
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<!-- ── Hex selection (the grid itself lives on /map) ────────────── -->
			<section class="min-w-0 rounded-lg border border-line/20 bg-surface-2 p-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-sm font-semibold text-heading">Select a hex</h2>
					<a href="/map" class="text-xs text-primary-fg hover:underline">Open the hex map →</a>
				</div>
				<p class="mt-1 text-xs text-fg-muted">
					The hex grid is drawn on the real world map in naval mode. Pick a hex there, or jump to one with
					contacts below.
				</p>
				<form
					class="mt-2 flex flex-wrap items-end gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						selectHexFromInput();
					}}
					data-tutorial="navy-hex"
				>
					<label class="text-[11px] text-fg-muted">Q
						<input
							type="number"
							min={HEX_BOUNDS.minQ}
							max={HEX_BOUNDS.maxQ}
							bind:value={hexQ}
							class="mt-1 w-20 rounded border border-line/30 bg-surface-2 px-2 py-1 text-sm"
						/>
					</label>
					<label class="text-[11px] text-fg-muted">R
						<input
							type="number"
							min={HEX_BOUNDS.minR}
							max={HEX_BOUNDS.maxR}
							bind:value={hexR}
							class="mt-1 w-20 rounded border border-line/30 bg-surface-2 px-2 py-1 text-sm"
						/>
					</label>
					<Button type="submit" size="sm" variant="secondary">Inspect</Button>
					{#if selectedHex}
						<button
							type="button"
							class="ml-auto text-xs text-primary-fg hover:underline"
							onclick={() => hexClicked(selectedHex!)}
						>Reopen {selectedHex.q},{selectedHex.r}</button
						>
					{/if}
				</form>
				{#if activeHexes.length}
					<div class="mt-3 border-t border-line/15 pt-2">
						<div class="mb-1 text-[11px] uppercase tracking-wide text-fg-muted">Hexes with contacts</div>
						<div class="flex flex-wrap gap-1">
							{#each activeHexes as h (hexKey(h))}
								<button
									type="button"
									class="rounded-sm border border-line/20 bg-surface-1 px-2 py-1 font-mono text-[11px] text-fg-soft hover:border-primary/50 {selectedHex &&
									hexKey(selectedHex) === hexKey(h)
										? 'border-primary text-primary-fg'
										: ''}"
									onclick={() => hexClicked(h)}
								>{h.q},{h.r}</button
								>
							{/each}
						</div>
					</div>
				{/if}
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

				<!-- In Forces, air missions belong to the Aviation tab. -->
				{#if !embedded}
					<section class="rounded-lg border border-line/20 bg-surface-1 p-3">
						<h2 class="text-sm font-semibold text-heading">Air operations</h2>
						<AirOperations
							airSupport={data.airSupport}
							airMissions={data.airMissions}
							regionList={data.regionList}
							myStateId={data.myStateId}
							canCommand={data.canCommand}
						/>
					</section>
				{/if}

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
								<form method="POST" action="?/moveShip" use:enhance={enhanceForm} class="flex flex-wrap items-end gap-1">
									<input type="hidden" name="shipId" value={selectedShip.id} />
									<label class="text-[11px] text-fg-muted">To Q
										<input type="number" name="q" min={HEX_BOUNDS.minQ} max={HEX_BOUNDS.maxQ} bind:value={moveQ} class="mt-1 w-16 rounded border border-line/30 bg-surface-2 px-1 py-1 text-xs" />
									</label>
									<label class="text-[11px] text-fg-muted">R
										<input type="number" name="r" min={HEX_BOUNDS.minR} max={HEX_BOUNDS.maxR} bind:value={moveR} class="mt-1 w-16 rounded border border-line/30 bg-surface-2 px-1 py-1 text-xs" />
									</label>
									<Button type="submit" size="sm" disabled={selectedShip.status === "repairing"}>Move</Button>
								</form>
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
				<h2 class="text-sm font-semibold text-heading">Fleets <span class="text-fg-muted">({data.fleets.length})</span></h2>
				{#each data.fleets as fleet (fleet.id)}
					{@const officer = data.officers.find((o) => o.id === fleet.commanderId)}
					<div class="soft-lift mt-2 rounded-sm border border-line/20 p-2">
						<div class="flex items-center gap-2">
							{#if officer}
								<CommanderPortrait seed={officer.portrait} alive={officer.alive} size={28} />
							{/if}
							<span class="min-w-0 flex-1 truncate text-xs font-medium">{fleet.name}</span>
							<span class="text-[10px] text-fg-muted"
								>{myShips.filter((s) => s.fleetId === fleet.id).length} hulls · {data.fleetHexes.filter((h) => h.fleetId === fleet.id).length} hexes</span
							>
						</div>
						{#if officer}
							<div class="mt-1 text-[10px] text-fg-muted">
								{officer.name} · L{commanderLevel(officer.experience)} · {officer.alive ? `${officer.health}hp` : "killed"} ·
								{officer.traitIds.map((id) => COMMANDER_TRAITS[id as keyof typeof COMMANDER_TRAITS]?.label ?? id).join(", ") || "no traits"}
							</div>
						{/if}
						<div class="mt-1 flex items-center gap-1">
							<form method="POST" action="?/assignCommander" use:enhance={enhanceForm} class="flex min-w-0 flex-1 gap-1">
								<input type="hidden" name="kind" value="fleet" />
								<input type="hidden" name="id" value={fleet.id} />
								<select name="commanderId" class="min-w-0 flex-1 rounded border border-line/30 bg-surface-2 px-1 py-1 text-[11px]">
									<option value="">No commander</option>
									{#each data.officers.filter((o) => o.alive) as o (o.id)}
										<option value={o.id} selected={o.id === fleet.commanderId}>{o.name}</option>
									{/each}
								</select>
								<Button type="submit" size="xs" variant="ghost">Set</Button>
							</form>
							<form method="POST" action="?/disbandFleet" use:enhance={enhanceForm}>
								<input type="hidden" name="fleetId" value={fleet.id} />
								<Button type="submit" size="xs" variant="ghost">Disband</Button>
							</form>
						</div>
					</div>
				{/each}
				{#if data.canCommand}
					<form method="POST" action="?/formFleet" use:enhance={enhanceForm} class="mt-2 space-y-1 border-t border-line/20 pt-2">
						<input name="name" required maxlength="100" placeholder="New fleet name" class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs" />
						<div class="max-h-20 space-y-0.5 overflow-y-auto rounded border border-line/20 p-1">
							{#each myShips.filter((s) => !s.fleetId) as ship (ship.id)}
								<label class="flex items-center gap-1 text-[11px]"><input type="checkbox" name="shipIds" value={ship.id} /> {ship.name}</label>
							{/each}
						</div>
						<Button type="submit" size="xs" variant="secondary" block>Form fleet</Button>
					</form>
				{/if}
				<h3 class="mt-3 text-xs font-semibold text-heading">Your ships <span class="text-fg-muted">({myShips.length})</span></h3>
				{#if myShips.length === 0}
					<p class="mt-1 text-xs text-fg-muted">No ships yet. Build a dock and order a hull.</p>
				{:else}
					<ul class="mt-1 space-y-1 text-xs">
						{#each myShips as ship}
							<li>
								<button class="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-surface-3" onclick={() => hexClicked({ q: ship.q, r: ship.r })}>
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
	{/if}
	<Tutorial id="navy" title="Flotten-Kurzanleitung" steps={navySteps} />
</PageContainer>
