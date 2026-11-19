<!-- src/routes/(authenticated)/(dock)/map/+page.svelte -->
<!-- The situational-awareness map: a dark world map with a base layer
     (political, blocs, wars, weather, terrain or a heatmap) and tactical
     overlays for the viewer's side: own forces (blue frames), hostile forces
     known through fresh intel (red diamonds; "?" where contested and
     unknown), battles with range rings and axes of attack, and recon cover.
     Left: layer rail. Right: search and tools. Bottom: status bar. Tapping a
     region opens a side panel (desktop) or bottom sheet (phone). -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "#lib/assets/worldmap3.svg?raw";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { onMount, tick } from "svelte";
	import type { PageData } from "./$types";
	import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import { ageLabel, countdown, formatLatLon, kmPerMapUnit, mapToLatLon, niceKm } from "#lib/utils/military.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import Logo from "#lib/component/Logo.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import {
		AttackArrow,
		Conditions,
		RangeRing,
		ReconSector,
		UnitBadge,
		UnitSymbol
	} from "#lib/component/tactical/index.js";
	import { UNIT_CATEGORIES, WEATHER_LABEL, COVER_LABEL, regionConditions, weatherAt } from "#lib/config/index.js";
	import IconSearch from "~icons/fluent/search-20-regular";
	import IconZoomIn from "~icons/fluent/zoom-in-20-regular";
	import IconZoomOut from "~icons/fluent/zoom-out-20-regular";
	import IconMyLocation from "~icons/fluent/my-location-20-regular";
	import IconReset from "~icons/fluent/arrow-reset-20-regular";
	import IconFlag from "~icons/fluent/flag-20-regular";
	import IconTeam from "~icons/fluent/people-team-20-regular";
	import IconFire from "~icons/fluent/fire-20-regular";
	import IconWeather from "~icons/fluent/weather-partly-cloudy-day-20-regular";
	import IconMountain from "~icons/fluent/mountain-location-bottom-20-regular";
	import IconHeat from "~icons/fluent/data-area-20-regular";
	import IconShield from "~icons/fluent/shield-20-regular";
	import IconTarget from "~icons/fluent/target-20-regular";
	import IconFlash from "~icons/fluent/flash-20-regular";
	import IconRadar from "~icons/fluent/radar-20-regular";
	import IconDismiss from "~icons/fluent/dismiss-20-regular";
	import IconDocument from "~icons/fluent/document-search-20-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-20-regular";

	let { data }: { data: PageData } = $props();

	// ── Palette (theme variables; set as inline styles on the SVG) ──────────
	const LAND = "var(--color-base-300)";
	const BORDER = "var(--color-base-100)";
	const mixOn = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, ${LAND})`;

	// Scene size = the world map's viewBox, so map units are CSS px at zoom 1.
	const SVG_WIDTH = 1400;
	const SVG_HEIGHT = 600;
	const DRAG_THRESHOLD = 8;

	// ── Layers ───────────────────────────────────────────────────────────────
	type Base = "political" | "blocs" | "wars" | "weather" | "terrain" | "residents" | "powerplants" | string;
	let base = $state<Base>("political");
	let overlays = $state({ friendly: true, hostile: true, battles: true, recon: true, strikes: true });
	let heatOpen = $state(false);

	const RESOURCES: Record<string, string> = {
		oil: "Oil",
		aluminium: "Aluminium",
		rubber: "Rubber",
		tungsten: "Tungsten",
		steel: "Steel",
		chromium: "Chromium"
	};
	const HEAT_LAYERS = [
		{ value: "residents", label: "Residents" },
		{ value: "powerplants", label: "Power plants" },
		...Object.entries(RESOURCES).map(([value, label]) => ({ value, label }))
	];
	const BASE_LAYERS = [
		{ value: "political", label: "Political", icon: IconFlag },
		{ value: "blocs", label: "Blocs", icon: IconTeam },
		{ value: "wars", label: "Wars", icon: IconFire },
		{ value: "weather", label: "Weather", icon: IconWeather },
		{ value: "terrain", label: "Terrain & cover", icon: IconMountain }
	];
	const OVERLAYS = [
		{ key: "friendly", label: "Own forces", icon: IconShield },
		{ key: "hostile", label: "Known hostile forces", icon: IconTarget },
		{ key: "battles", label: "Battles & axes of attack", icon: IconFlash },
		{ key: "recon", label: "Recon coverage", icon: IconRadar },
		{ key: "strikes", label: "Airstrikes (24 h)", icon: IconFire }
	] as const;
	const isHeat = $derived(HEAT_LAYERS.some((l) => l.value === base));

	// ── Map state ────────────────────────────────────────────────────────────
	let instance: PanZoom | null = $state(null);
	let viewportEl = $state<HTMLElement | null>(null);
	let sceneEl = $state<HTMLElement | null>(null);
	let panelEl = $state<HTMLElement | null>(null);
	let transform = $state({ x: 0, y: 0, scale: 1 });
	let minZoom = 0.1;
	let centroids = $state<Record<number, { x: number; y: number; r: number }>>({});
	let cursor = $state<{ x: number; y: number } | null>(null);
	let selectedId = $state<number | null>(null);
	let highlightedId = $state<number | null>(null);
	let highlightTimeout: ReturnType<typeof setTimeout> | null = null;
	let now = $state(new Date());
	let isDesktop = $state(false);
	let sheetOpen = $state(false);

	onMount(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const set = () => (isDesktop = mq.matches);
		set();
		mq.addEventListener("change", set);
		const t = setInterval(() => (now = new Date()), 60_000);
		return () => {
			mq.removeEventListener("change", set);
			clearInterval(t);
		};
	});

	const sa = $derived(data.sa);
	const sideStates = $derived(new Set(sa?.side?.stateIds ?? []));
	const enemyStates = $derived(new Set(sa?.enemyStateIds ?? []));
	const stateById = $derived(new Map(data.states.map((s) => [s.id, s])));
	const k = $derived(1 / Math.max(transform.scale, 0.05)); // map units per screen px

	// ── Region colouring ─────────────────────────────────────────────────────
	function maxOf(fn: (r: (typeof data.regionMap)[number]) => number) {
		let m = 0;
		for (const r of Object.values(data.regionMap)) m = Math.max(m, fn(r));
		return m;
	}

	function fillFor(id: number, r: (typeof data.regionMap)[number], maxHeat: number): string {
		switch (base) {
			case "political":
				return r.stateId && data.stateColorMap[r.stateId] ? mixOn(data.stateColorMap[r.stateId], 80) : LAND;
			case "blocs":
				return r.stateId && data.blocColorMap?.[r.stateId] ? mixOn(data.blocColorMap[r.stateId], 70) : LAND;
			case "wars":
				if (!r.stateId) return LAND;
				if (sideStates.has(r.stateId)) return mixOn("var(--color-secondary)", 64);
				if (enemyStates.has(r.stateId)) return mixOn("var(--color-error)", 64);
				if (data.warAttackerStateIds?.has(r.stateId) || data.warDefenderStateIds?.has(r.stateId))
					return mixOn("var(--color-warning)", 40);
				return LAND;
			case "weather": {
				const w = weatherAt(id, now);
				return w === "clear"
					? LAND
					: w === "cloudy"
						? mixOn("var(--color-base-content)", 28)
						: w === "rain"
							? mixOn("var(--color-primary)", 52)
							: mixOn("var(--color-base-content)", 46);
			}
			case "terrain": {
				const c = r.cover;
				return c === "forest"
					? mixOn("var(--color-success)", 50)
					: c === "urban"
						? mixOn("var(--color-base-content)", 40)
						: c === "mountain"
							? mixOn("var(--color-warning)", 44)
							: mixOn("var(--color-success)", 14);
			}
			default: {
				const v = heatValue(r);
				if (!v || !maxHeat) return LAND;
				const color =
					base === "residents"
						? "var(--color-success)"
						: base === "powerplants"
							? "var(--color-warning)"
							: "var(--color-primary)";
				return mixOn(color, Math.round(24 + 76 * Math.min(v / maxHeat, 1)));
			}
		}
	}

	function heatValue(r: (typeof data.regionMap)[number]) {
		if (base === "residents") return r.residentCount ?? 0;
		if (base === "powerplants") return r.powerplantCount ?? 0;
		return (r.resources as Record<string, number>)[base] ?? 0;
	}

	/**
	 * The outline of the selected (or searched) region. Region shapes share
	 * their edges with the neighbours drawn after them, so stroking the region
	 * path itself only shows the parts that no later path covers. One overlay
	 * path, drawn last with the region's whole `d` (every subpath and island),
	 * shows the full border. Non-scaling stroke keeps it 1.25 px at every zoom.
	 */
	let outlineEl: SVGPathElement | null = null;
	function regionOutline(svg: Element): SVGPathElement {
		if (outlineEl?.parentNode === svg) return outlineEl;
		outlineEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
		outlineEl.setAttribute("class", "region-outline");
		outlineEl.setAttribute("fill", "none");
		outlineEl.setAttribute("pointer-events", "none");
		outlineEl.setAttribute("vector-effect", "non-scaling-stroke");
		svg.appendChild(outlineEl);
		return outlineEl;
	}

	function colorRegions(root: Element) {
		const maxHeat = isHeat ? maxOf(heatValue) : 0;
		// Selection wins over the transient search flash. An object, not two
		// `let`s: assignments inside the forEach callback are invisible to
		// TypeScript's narrowing when read after the loop.
		const pick: { el: SVGElement | null; color: string } = { el: null, color: "var(--color-primary)" };
		root.querySelectorAll("path[id]").forEach((path) => {
			const el = path as SVGElement;
			const id = parseInt(path.id, 10);
			if (isNaN(id)) {
				if (!path.closest("defs")) {
					el.style.fill = LAND;
					el.classList.add("region-inert");
				}
				return;
			}
			const r = data.regionMap[id];
			el.style.fill = r ? fillFor(id, r, maxHeat) : LAND;
			el.style.stroke = BORDER;
			const flash = id === highlightedId;
			el.classList.toggle("region-highlight", flash);
			if (id === selectedId) {
				pick.el = el;
				pick.color = "var(--color-primary)";
			} else if (flash && !pick.el) {
				pick.el = el;
				pick.color = "var(--color-warning)";
			}
		});
		const svg = root.querySelector("#panzoom-element") ?? root;
		const outline = regionOutline(svg);
		const d = pick.el?.getAttribute("d");
		if (d) {
			if (outline.getAttribute("d") !== d) outline.setAttribute("d", d);
			outline.style.stroke = pick.color;
			outline.style.display = "";
			svg.appendChild(outline); // above every region, whatever the draw order
		} else {
			outline.style.display = "none";
		}
	}

	$effect(() => {
		// Re-run on layer, selection and weather tick (fill and outline).
		void base;
		void selectedId;
		void highlightedId;
		void now;
		void sideStates;
		if (instance && sceneEl) colorRegions(sceneEl);
	});

	// ── Panzoom ──────────────────────────────────────────────────────────────
	function viewportSize() {
		const rect = viewportEl?.getBoundingClientRect();
		if (!rect || rect.width < 1 || rect.height < 1) return { width: window.innerWidth, height: window.innerHeight };
		return { width: rect.width, height: rect.height };
	}

	function constrain() {
		if (!instance) return;
		const t = instance.getTransform();
		const { width, height } = viewportSize();
		const sw = SVG_WIDTH * t.scale;
		const sh = SVG_HEIGHT * t.scale;
		const x = sw > width ? Math.max(width - sw, Math.min(0, t.x)) : (width - sw) / 2;
		const y = sh > height ? Math.max(height - sh, Math.min(0, t.y)) : (height - sh) / 2;
		if (x !== t.x || y !== t.y) instance.moveTo(x, y);
	}

	function initPanzoom(node: HTMLElement) {
		sceneEl = node;
		colorRegions(node);

		// Centroid and rough radius of every region, for placing symbols.
		const c: Record<number, { x: number; y: number; r: number }> = {};
		node.querySelectorAll("path[id]").forEach((p) => {
			const id = parseInt(p.id, 10);
			if (isNaN(id) || !data.regionMap[id]) return;
			const b = (p as SVGGraphicsElement).getBBox();
			c[id] = { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.max(2, Math.hypot(b.width, b.height) / 2) };
		});
		centroids = c;

		const { width, height } = viewportSize();
		minZoom = Math.max(width / SVG_WIDTH, height / SVG_HEIGHT, 0.1);
		instance = panzoom(node, { bounds: false, maxZoom: 60, minZoom, smoothScroll: false });
		const sync = () => {
			constrain();
			const t = instance!.getTransform();
			transform = { x: t.x, y: t.y, scale: t.scale };
		};
		instance.on("transform", sync);

		const start = data.currentUserRegionId ? c[data.currentUserRegionId] : null;
		if (start) {
			const z = Math.max(minZoom, 5);
			instance.zoomAbs(0, 0, z);
			instance.moveTo(width / 2 - start.x * z, height / 2 - start.y * z);
		} else {
			resetView();
		}
		sync();

		const onResize = () => {
			const { width, height } = viewportSize();
			const next = Math.max(width / SVG_WIDTH, height / SVG_HEIGHT, 0.1);
			const wasFit = instance!.getTransform().scale <= minZoom * 1.01;
			minZoom = next;
			instance!.setMinZoom(next);
			if (wasFit) resetView();
			sync();
		};
		window.addEventListener("resize", onResize);
		window.visualViewport?.addEventListener("resize", onResize);
		return {
			destroy() {
				window.removeEventListener("resize", onResize);
				window.visualViewport?.removeEventListener("resize", onResize);
				instance?.dispose();
			}
		};
	}

	function resetView() {
		if (!instance) return;
		const { width, height } = viewportSize();
		instance.zoomAbs(0, 0, minZoom);
		instance.moveTo((width - SVG_WIDTH * minZoom) / 2, (height - SVG_HEIGHT * minZoom) / 2);
	}

	function zoomBy(factor: number) {
		if (!instance || !viewportEl) return;
		const rect = viewportEl.getBoundingClientRect();
		instance.smoothZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
	}

	/** Fly to a box in map units. */
	function flyTo(box: { x: number; y: number; w: number; h: number }, maxZoom = 6) {
		if (!instance) return;
		const { width, height } = viewportSize();
		const z = Math.max(
			minZoom,
			Math.min(maxZoom, (width * 0.6) / Math.max(box.w, 1), (height * 0.6) / Math.max(box.h, 1))
		);
		const cx = box.x + box.w / 2;
		const cy = box.y + box.h / 2;
		instance.zoomAbs(0, 0, z);
		instance.smoothMoveTo(width / 2 - cx * z, height / 2 - cy * z);
	}

	function focusRegion(id: number, select = true) {
		const c = centroids[id];
		if (!c) return;
		flyTo({ x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }, 6);
		highlightedId = id;
		if (highlightTimeout) clearTimeout(highlightTimeout);
		highlightTimeout = setTimeout(() => (highlightedId = null), 3000);
		if (select) openRegion(id);
	}

	function focusState(stateId: number) {
		let x0 = Infinity,
			y0 = Infinity,
			x1 = -Infinity,
			y1 = -Infinity;
		for (const [id, r] of Object.entries(data.regionMap)) {
			const c = centroids[Number(id)];
			if (r.stateId !== stateId || !c) continue;
			x0 = Math.min(x0, c.x - c.r);
			y0 = Math.min(y0, c.y - c.r);
			x1 = Math.max(x1, c.x + c.r);
			y1 = Math.max(y1, c.y + c.r);
		}
		if (isFinite(x0)) flyTo({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 8);
	}

	// ── Pointer: tap vs drag, cursor position ───────────────────────────────
	let downX = 0;
	let downY = 0;
	function onPointerDown(e: PointerEvent) {
		if (!e.isPrimary) return;
		downX = e.clientX;
		downY = e.clientY;
	}
	function onPointerUp(e: PointerEvent) {
		if (!e.isPrimary || Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESHOLD) return;
		let el = e.target as Element | null;
		for (let d = 0; el && d < 5; d++, el = el.parentElement) {
			const id = parseInt(el.id, 10);
			if (!isNaN(id) && id > 0 && data.regionMap[id]) {
				openRegion(id);
				return;
			}
		}
	}
	function onPointerMove(e: PointerEvent) {
		if (!viewportEl) return;
		const rect = viewportEl.getBoundingClientRect();
		cursor = {
			x: (e.clientX - rect.left - transform.x) / transform.scale,
			y: (e.clientY - rect.top - transform.y) / transform.scale
		};
	}

	function openRegion(id: number) {
		selectedId = id;
		sheetOpen = true;
	}
	function closeRegion() {
		selectedId = null;
		sheetOpen = false;
	}
	$effect(() => {
		if (!sheetOpen && !isDesktop) selectedId = null;
	});

	// ── Search ───────────────────────────────────────────────────────────────
	let query = $state("");
	let searchFocused = $state(false);
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		const stateHits = data.states
			.filter((s) => s.name.toLowerCase().includes(q))
			.slice(0, 3)
			.map((s) => ({ kind: "state" as const, id: s.id, name: s.name, sub: "State" }));
		const regionHits = Object.entries(data.regionMap)
			.map(([id, r]) => ({
				kind: "region" as const,
				id: Number(id),
				name: getRegionName(Number(id)),
				sub: r.stateId ? (stateById.get(r.stateId)?.name ?? "") : "Unclaimed"
			}))
			.filter((r) => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))
			.slice(0, 8 - stateHits.length);
		return [...stateHits, ...regionHits];
	});
	function pick(r: (typeof results)[number]) {
		if (r.kind === "state") focusState(r.id);
		else focusRegion(r.id);
		query = "";
		searchFocused = false;
	}

	// ── Status bar ───────────────────────────────────────────────────────────
	const statusCoords = $derived(cursor ? mapToLatLon(cursor.x, cursor.y) : null);
	const scaleBar = $derived.by(() => {
		const { width, height } = viewportEl ? viewportSize() : { width: 400, height: 400 };
		const cx = (width / 2 - transform.x) / transform.scale;
		const cy = (height / 2 - transform.y) / transform.scale;
		const kmPerPx =
			kmPerMapUnit(Math.max(0, Math.min(SVG_WIDTH, cx)), Math.max(0, Math.min(SVG_HEIGHT, cy))) / transform.scale;
		const km = niceKm(80 * kmPerPx);
		return { km, px: kmPerPx ? km / kmPerPx : 0 };
	});

	// ── Tactical overlay data ───────────────────────────────────────────────
	type Marker = { id: number; x: number; y: number };
	const friendlyMarkers = $derived(
		Object.entries(sa?.friendly ?? {})
			.map(([id, f]) => {
				const c = centroids[Number(id)];
				if (!c) return null;
				const types = Object.entries(f.byType).sort((a, b) => b[1] - a[1]);
				return {
					id: Number(id),
					x: c.x,
					y: c.y,
					total: f.total,
					ally: f.ally,
					unitType: types.length === 1 ? types[0][0] : types[0]?.[0]
				};
			})
			.filter((m): m is Marker & { total: number; ally: boolean; unitType: string } => !!m)
	);
	const hostileMarkers = $derived.by(() => {
		const out: (Marker & { known: boolean; count: number; estimated: boolean; dominant: string | null })[] = [];
		const pics = sa?.pictures ?? {};
		for (const [id, p] of Object.entries(pics)) {
			const c = centroids[Number(id)];
			if (!c || !p.knownUnits) continue;
			const estimated = UNIT_CATEGORIES.some((cat) => p.categories[cat]?.estimated);
			out.push({ id: Number(id), x: c.x, y: c.y, known: true, count: p.knownUnits, estimated, dominant: p.dominant });
		}
		for (const id of sa?.contested ?? []) {
			const c = centroids[id];
			if (!c || pics[id]) continue;
			const owner = data.regionMap[id]?.stateId;
			if (owner && sideStates.has(owner)) continue; // own region under attack: shown by the battle ring
			out.push({ id, x: c.x, y: c.y, known: false, count: 0, estimated: false, dominant: null });
		}
		return out;
	});
	const battleMarkers = $derived(
		(sa?.battles ?? [])
			.map((b) => {
				const c = centroids[b.regionId];
				if (!c) return null;
				const o = b.originRegionId ? centroids[b.originRegionId] : null;
				return { ...b, x: c.x, y: c.y, r: c.r, ox: o?.x ?? null, oy: o?.y ?? null };
			})
			.filter((b) => !!b)
	);
	const reconMarkers = $derived(
		Object.entries(sa?.pictures ?? {})
			.map(([id, p]) => {
				const c = centroids[Number(id)];
				return c && p.observedAt
					? { id: Number(id), x: c.x, y: c.y, r: c.r, age: ageLabel(p.observedAt, now), strength: p.confidence }
					: null;
			})
			.filter((m) => !!m)
	);
	const strikeMarkers = $derived(
		Object.entries(data.strikes ?? {})
			.map(([id, st]) => {
				const c = centroids[Number(id)];
				return c ? { id: Number(id), x: c.x, y: c.y, r: c.r, ...st } : null;
			})
			.filter((m) => !!m)
	);
	const inFlightMarkers = $derived(
		(sa?.inFlight ?? []).map((m) => ({ ...m, c: centroids[m.regionId] })).filter((m) => !!m.c)
	);
	const hasHostileAt = $derived(new Set(hostileMarkers.map((m) => m.id)));
	const hasFriendlyAt = $derived(new Set(friendlyMarkers.map((m) => m.id)));

	// ── Selected region ──────────────────────────────────────────────────────
	const sel = $derived(selectedId != null ? data.regionMap[selectedId] : null);
	const selState = $derived(sel?.stateId ? stateById.get(sel.stateId) : null);
	const selConditions = $derived(
		sel && selectedId != null
			? {
					...regionConditions({ id: selectedId, longitude: sel.longitude, terrain: sel.terrain }, now),
					cover: sel.cover as ReturnType<typeof regionConditions>["cover"]
				}
			: null
	);
	const selPicture = $derived(selectedId != null ? (sa?.pictures?.[selectedId] ?? null) : null);
	const selFriendly = $derived(selectedId != null ? (sa?.friendly?.[selectedId] ?? null) : null);
	const selBattle = $derived(selectedId != null ? (sa?.battles ?? []).find((b) => b.regionId === selectedId) : null);
	const selOwn = $derived(!!sel?.stateId && sideStates.has(sel.stateId));
	const selCanRecon = $derived(
		!!sa?.side && !!sel && ((!!sel.stateId && enemyStates.has(sel.stateId)) || !!selBattle?.mine)
	);
	const selInFlight = $derived((sa?.inFlight ?? []).filter((m) => m.regionId === selectedId));
	let sensor = $state("drone_eo");
	let launching = $state(false);
	const chosen = $derived(sa?.sensors?.find((s) => s.id === sensor));
	const chosenCooldown = $derived(chosen?.cooldownEndsAt ? countdown(chosen.cooldownEndsAt, now) : null);

	const levelTone = { none: "neutral", low: "amber", medium: "blue", high: "green" } as const;
	const LABEL: Record<string, string> = {
		infantry: "Infantry",
		armor: "Armour",
		mechanized: "Mechanised",
		artillery: "Artillery",
		air_defence: "Air defence",
		fighter_squadron: "Fighters",
		bomber_squadron: "Bombers",
		vehicle: "Vehicles",
		air: "Aircraft"
	};
</script>

<svelte:head>
	<title>Situation Map · PsyOps</title>
	<style>
		body {
			overflow: hidden;
			touch-action: pan-x pan-y;
		}
	</style>
</svelte:head>

<svelte:window onclick={(e) => !(e.target as Element).closest?.(".map-search") && (searchFocused = false)} />

<!-- The control panels are siblings of the pan surface, not children of it.
     Panzoom listens on the pan target's parent and calls preventDefault on
     touchstart, which would swallow every tap on a control inside it. -->
<div class="relative flex-1 w-full overflow-hidden">
	<div
		bind:this={viewportEl}
		class="map-viewport absolute inset-0 touch-none"
		onpointermove={onPointerMove}
		onpointerleave={() => (cursor = null)}
		role="presentation"
	>
		<!-- Panned scene: world map + tactical overlay in the same 1400×600 space -->
		<div
			use:initPanzoom
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			role="application"
			aria-label="Situation map. Drag to pan, pinch or scroll to zoom, tap a region for details."
			class="map-scene absolute top-0 left-0 cursor-crosshair"
			style:width="{SVG_WIDTH}px"
			style:height="{SVG_HEIGHT}px"
		>
			{@html WorldMap}

			<svg
				class="tactical absolute inset-0 pointer-events-none"
				viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}"
				width={SVG_WIDTH}
				height={SVG_HEIGHT}
				style:--k={k}
				aria-hidden="true"
			>
				<!-- Graticule -->
				<g class="graticule">
					{#each Array.from({ length: 27 }, (_, i) => (i + 1) * 50) as gx}
						<line x1={gx} y1="0" x2={gx} y2={SVG_HEIGHT} />
					{/each}
					{#each Array.from({ length: 11 }, (_, i) => (i + 1) * 50) as gy}
						<line x1="0" y1={gy} x2={SVG_WIDTH} y2={gy} />
					{/each}
				</g>

				{#if overlays.recon}
					{#each reconMarkers as m (m.id)}
						<ReconSector
							x={m.x}
							y={m.y}
							r={Math.max(m.r * 1.2, 14 * k)}
							label={m.age}
							strength={m.strength}
							fontSize={9 * k}
						/>
					{/each}
					{#each inFlightMarkers as m, i (i)}
						<ReconSector x={m.c.x} y={m.c.y} r={Math.max(m.c.r * 1.3, 16 * k)} pending />
					{/each}
				{/if}

				{#if overlays.battles}
					{#each battleMarkers as b (b.id)}
						<RangeRing x={b.x} y={b.y} r={Math.max(b.r * 1.1, 16 * k)} />
					{/each}
					{#each battleMarkers as b (b.id)}
						{#if b.ox != null && b.oy != null}
							<AttackArrow x1={b.ox} y1={b.oy} x2={b.x} y2={b.y} headSize={8 * k} inset={Math.max(b.r * 0.4, 6 * k)} />
						{/if}
					{/each}
				{/if}

				{#if overlays.strikes}
					{#each strikeMarkers as m (m.id)}
						<!-- Impact burst, up and to the right of the region's centre -->
						<g
							transform="translate({m.x + Math.max(m.r * 0.5, 10 * k)} {m.y - Math.max(m.r * 0.5, 10 * k)}) scale({k})"
							class="pointer-events-none"
						>
							<title>{m.count} strike{m.count === 1 ? "" : "s"}, {m.casualties} civilians killed (24 h)</title>
							<path
								d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z"
								style:fill={m.casualties ? "var(--color-error)" : "var(--color-warning)"}
								style:stroke="var(--color-surface-0)"
								stroke-width="1"
							/>
							{#if m.count > 1}
								<text
									x="9"
									y="3"
									font-size="8"
									class="data"
									style:fill="var(--color-warning)"
									style:paint-order="stroke"
									style:stroke="var(--color-surface-0)"
									stroke-width="2">{m.count}</text
								>
							{/if}
						</g>
					{/each}
				{/if}

				{#if overlays.friendly}
					{#each friendlyMarkers as m (m.id)}
						<UnitSymbol
							affiliation="friend"
							unitType={m.unitType}
							count={m.total}
							x={m.x - (overlays.hostile && hasHostileAt.has(m.id) ? 16 * k : 0)}
							y={m.y}
							scale={0.85 * k}
							dashed={m.ally}
						/>
					{/each}
				{/if}

				{#if overlays.hostile}
					{#each hostileMarkers as m (m.id)}
						<UnitSymbol
							affiliation={m.known ? "hostile" : "unknown"}
							unitType={m.dominant}
							count={m.known ? m.count : null}
							estimated={m.estimated}
							x={m.x + (overlays.friendly && hasFriendlyAt.has(m.id) ? 16 * k : 0)}
							y={m.y}
							scale={0.85 * k}
						/>
					{/each}
				{/if}
			</svg>
		</div>
	</div>

	<!-- Left rail: base layers, heatmaps, overlays -->
	<nav class="panel absolute left-2 top-2 z-10 flex flex-col gap-0.5 rounded-sm p-1" aria-label="Map layers">
		{#each BASE_LAYERS as l (l.value)}
			<IconButton
				icon={l.icon}
				label={l.label}
				size="sm"
				shape="square"
				variant={base === l.value ? "soft-blue" : "ghost"}
				aria-pressed={base === l.value}
				onclick={() => {
					base = l.value;
					heatOpen = false;
				}}
			/>
		{/each}
		<div class="relative">
			<IconButton
				icon={IconHeat}
				label="Heatmaps"
				size="sm"
				shape="square"
				variant={isHeat ? "soft-blue" : "ghost"}
				aria-expanded={heatOpen}
				onclick={() => (heatOpen = !heatOpen)}
			/>
			{#if heatOpen}
				<div class="panel absolute left-full top-0 ml-2 w-40 rounded-sm p-1 animate-pop-in">
					{#each HEAT_LAYERS as h (h.value)}
						<button
							type="button"
							class="block w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-surface-5 {base === h.value
								? 'text-primary-fg font-semibold'
								: 'text-fg-soft'}"
							onclick={() => {
								base = h.value;
								heatOpen = false;
							}}>{h.label}</button
						>
					{/each}
				</div>
			{/if}
		</div>
		<div class="mx-1 my-1 h-px bg-line/20"></div>
		{#each OVERLAYS as o (o.key)}
			<IconButton
				icon={o.icon}
				label={o.label}
				size="sm"
				shape="square"
				variant={overlays[o.key] ? "soft-blue" : "ghost"}
				aria-pressed={overlays[o.key]}
				onclick={() => (overlays[o.key] = !overlays[o.key])}
			/>
		{/each}
		<div class="mx-1 my-1 h-px bg-line/20"></div>
		<IconButton icon={IconDocument} label="Intel reports" size="sm" shape="square" variant="ghost" href="/intel" />
	</nav>

	<!-- Search, top right -->
	<form
		class="map-search panel absolute top-2 right-2 left-16 z-20 rounded-sm md:left-auto md:w-80"
		onsubmit={(e) => {
			e.preventDefault();
			if (results[0]) pick(results[0]);
		}}
	>
		<label class="flex items-center gap-2 px-3">
			<IconSearch class="size-4 shrink-0 text-fg-muted" />
			<input
				type="search"
				bind:value={query}
				onfocus={() => (searchFocused = true)}
				placeholder="Search regions, states…"
				class="w-full min-w-0 bg-transparent py-2 text-sm text-fg outline-none placeholder:text-fg-faint"
			/>
		</label>
		{#if searchFocused && results.length}
			<ul class="max-h-72 overflow-y-auto border-t border-line/15">
				{#each results as r (r.kind + r.id)}
					<li>
						<button
							type="button"
							class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-5"
							onclick={() => pick(r)}
						>
							<span class="font-mono text-[10px] uppercase text-fg-faint w-10"
								>{r.kind === "state" ? "STATE" : "RGN"}</span
							>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm text-fg">{r.name}</span>
								{#if r.kind === "region"}<span class="block truncate text-xs text-fg-muted">{r.sub}</span>{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</form>

	<!-- Right tool column -->
	<div class="panel absolute right-2 top-14 z-10 flex flex-col gap-0.5 rounded-sm p-1">
		<IconButton icon={IconZoomIn} label="Zoom in" size="sm" shape="square" onclick={() => zoomBy(1.6)} />
		<IconButton icon={IconZoomOut} label="Zoom out" size="sm" shape="square" onclick={() => zoomBy(1 / 1.6)} />
		{#if data.currentUserRegionId}
			<IconButton
				icon={IconMyLocation}
				label="Locate me"
				size="sm"
				shape="square"
				onclick={() => data.currentUserRegionId && focusRegion(data.currentUserRegionId, false)}
			/>
		{/if}
		<IconButton icon={IconReset} label="Reset view" size="sm" shape="square" onclick={resetView} />
	</div>

	<!-- Legend -->
	<div class="panel absolute left-16 bottom-9 z-10 hidden rounded-sm px-2.5 py-1.5 text-[11px] text-fg-soft sm:block">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			{#if overlays.friendly}<span class="inline-flex items-center gap-1"
					><UnitBadge affiliation="friend" size={14} />Own</span
				>{/if}
			{#if overlays.hostile}
				<span class="inline-flex items-center gap-1"><UnitBadge affiliation="hostile" size={14} />Hostile (intel)</span>
				<span class="inline-flex items-center gap-1"><UnitBadge affiliation="unknown" size={14} />Unknown</span>
			{/if}
			{#if overlays.battles}<span class="inline-flex items-center gap-1"
					><span class="size-2.5 rounded-full border border-error"></span>Battle</span
				>{/if}
			{#if overlays.recon}<span class="inline-flex items-center gap-1"
					><span class="size-2.5 rounded-full bg-primary/40"></span>Recon cover</span
				>{/if}
			{#if overlays.strikes && strikeMarkers.length}<span class="inline-flex items-center gap-1"
					><span class="size-2.5 rotate-45 bg-warning"></span>Airstrike</span
				>{/if}
			{#if base === "weather"}<span class="text-fg-muted">· grey cloud/fog, blue rain</span>{/if}
			{#if base === "terrain"}<span class="text-fg-muted">· green forest, grey urban, amber mountains</span>{/if}
			{#if isHeat}<span class="text-fg-muted">· {HEAT_LAYERS.find((h) => h.value === base)?.label}: low → high</span
				>{/if}
		</div>
	</div>

	<!-- Status bar -->
	<div
		class="absolute inset-x-0 bottom-0 z-10 flex h-7 items-center gap-3 border-t border-line/15 bg-base-200/90 px-3 font-mono text-[11px] text-fg-soft"
	>
		<span class="min-w-0 truncate">
			{statusCoords ? formatLatLon(statusCoords.lat, statusCoords.lon) : "—"}
		</span>
		<span class="hidden sm:inline text-fg-faint">
			{cursor ? `GRID ${Math.round(cursor.x)}/${Math.round(cursor.y)}` : ""}
		</span>
		<span class="ml-auto flex items-center gap-1.5">
			<span class="inline-block h-1.5 border-x border-b border-fg-soft" style:width="{scaleBar.px}px"></span>
			{scaleBar.km >= 1 ? `${scaleBar.km.toLocaleString()} km` : "<1 km"}
		</span>
		<span>Z {transform.scale.toFixed(1)}×</span>
	</div>

	<!-- Desktop side panel -->
	{#if isDesktop && sel && selectedId != null}
		<aside
			bind:this={panelEl}
			class="panel absolute right-14 top-14 bottom-9 z-10 w-80 overflow-y-auto rounded-sm p-4 animate-pop-in"
		>
			{@render regionPanel()}
		</aside>
	{/if}
</div>

{#if !isDesktop}
	<BottomSheet bind:open={sheetOpen}>
		<div bind:this={panelEl}>
			{#if sel && selectedId != null}{@render regionPanel()}{/if}
		</div>
	</BottomSheet>
{/if}

{#snippet regionPanel()}
	{#if sel && selectedId != null}
		<div class="space-y-4">
			<header class="flex items-start gap-3">
				<Logo
					src={regionCoatUrl(selectedId)}
					alt={getRegionName(selectedId)}
					class="size-12 shrink-0 rounded-sm object-cover"
				/>
				<div class="min-w-0 flex-1">
					<h2 class="truncate text-lg font-bold text-fg">{getRegionName(selectedId)}</h2>
					{#if selState}
						<a href="/state/{selState.id}" class="flex items-center gap-1.5 text-sm text-fg-soft hover:text-primary-fg">
							<span class="size-2.5 shrink-0" style:background={data.stateColorMap[selState.id]}></span>
							<span class="truncate">{selState.name}</span>
							{#if selOwn}<Badge tone="blue" size="xs">own side</Badge
								>{:else if sel.stateId && enemyStates.has(sel.stateId)}<Badge tone="red" size="xs">hostile</Badge>{/if}
						</a>
					{:else}
						<p class="text-sm italic text-fg-muted">Unclaimed</p>
					{/if}
				</div>
				{#if isDesktop}
					<IconButton icon={IconDismiss} label="Close" size="xs" shape="square" onclick={closeRegion} />
				{/if}
			</header>

			{#if selConditions}
				<Conditions {...selConditions} />
			{/if}

			{#if selBattle}
				<a
					href="/battle/{selBattle.id}"
					class="flex items-center gap-2 rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-sm hover:border-error/60"
				>
					<span class="size-2 animate-pulse rounded-full bg-error"></span>
					<span class="min-w-0 flex-1 truncate text-hostile-fg">
						Battle · {stateById.get(selBattle.attackerStateId)?.name} → {stateById.get(selBattle.defenderStateId)?.name}
					</span>
					<IconChevronRight class="size-4 text-fg-muted" />
				</a>
			{/if}

			<!-- Forces -->
			<section class="space-y-2">
				<h3 class="section-title text-xs">Forces</h3>
				{#if selFriendly}
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(selFriendly.byType) as [t, n] (t)}
							<span class="inline-flex items-center gap-1 text-xs text-fg-soft" title={LABEL[t]}>
								<UnitBadge affiliation="friend" unitType={t} count={n} size={18} />
							</span>
						{/each}
					</div>
				{:else if selOwn}
					<p class="text-xs text-fg-muted">No own units stationed.</p>
				{/if}

				{#if !selOwn || selBattle}
					{#if selPicture}
						<div class="flex items-center gap-2 text-xs">
							<Badge tone={levelTone[selPicture.level as keyof typeof levelTone] ?? "neutral"} size="xs">
								Intel {selPicture.level} · {Math.round(selPicture.confidence * 100)}%
							</Badge>
							{#if selPicture.observedAt}<span class="font-mono text-fg-muted"
									>{ageLabel(selPicture.observedAt, now) === "now"
										? "just now"
										: `${ageLabel(selPicture.observedAt, now)} ago`}</span
								>{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#each UNIT_CATEGORIES as c}
								{@const cat = selPicture.categories[c]}
								{#if !cat?.coverage}
									<UnitBadge affiliation="unknown" size={18} title="{LABEL[c]}: not observed" />
								{:else if cat.count}
									<UnitBadge
										affiliation="hostile"
										unitType={c}
										count={cat.count}
										estimated={cat.estimated}
										size={18}
										title={LABEL[c]}
									/>
								{/if}
							{/each}
							{#if !selPicture.knownUnits}<span class="text-xs text-fg-muted">No hostile units seen.</span>{/if}
						</div>
						{#if selPicture.firing}
							<p class="text-xs text-hostile-fg">
								{selPicture.firing} firing position{selPicture.firing === 1 ? "" : "s"} (thermal)
							</p>
						{/if}
					{:else if sel.stateId && !selOwn}
						<p class="flex items-center gap-2 text-xs text-fg-muted">
							<UnitBadge affiliation="unknown" size={18} /> Hostile forces unknown: no fresh intel.
						</p>
					{/if}
				{/if}
			</section>

			<!-- Installations (enemy ones only through fresh intel) -->
			<section>
				<h3 class="section-title mb-1.5 text-xs">Installations</h3>
				<dl class="grid grid-cols-5 gap-1 text-center font-mono">
					{#each [["FORT", sel.fortifications], ["INFRA", sel.infrastructure], ["PWR", sel.economy], ["EDU", sel.education], ["MED", sel.hospitals]] as [label, v] (label)}
						<div class="rounded-sm border border-line/15 bg-surface-2 px-1 py-1">
							<dt class="text-[9px] text-fg-muted">{label}</dt>
							<dd class="text-sm text-fg">{v ?? "?"}</dd>
						</div>
					{/each}
				</dl>
				{#if isHeat}
					<p class="mt-1.5 text-xs text-fg-muted">
						{HEAT_LAYERS.find((h) => h.value === base)?.label}:
						<span class="font-mono text-fg">{heatValue(sel).toLocaleString()}</span>
					</p>
				{:else if base === "weather" && selConditions}
					<p class="mt-1.5 text-xs text-fg-muted">{WEATHER_LABEL[selConditions.weather]} for up to 3 h.</p>
				{:else if base === "terrain" && selConditions}
					<p class="mt-1.5 text-xs text-fg-muted">{COVER_LABEL[selConditions.cover]} cover.</p>
				{/if}
			</section>

			<!-- Recon -->
			{#if selCanRecon && sa}
				<section class="space-y-2 border-t border-line/15 pt-3">
					<h3 class="section-title text-xs">Launch recon</h3>
					<form
						method="POST"
						action="?/launchRecon"
						class="flex gap-2"
						use:enhance={() => {
							launching = true;
							return async ({ result }) => {
								launching = false;
								toastResult(result);
								if (result.type === "success") {
									await invalidateAll();
									await tick();
									celebrate(panelEl);
								}
							};
						}}
					>
						<input type="hidden" name="regionId" value={selectedId} />
						<select
							name="sensor"
							bind:value={sensor}
							class="field-control min-w-0 flex-1 rounded-sm px-2 py-1.5 text-xs"
						>
							{#each sa.sensors as s (s.id)}
								<option value={s.id}>{s.short} · ${s.cost.toLocaleString()} · {s.durationMinutes}m</option>
							{/each}
						</select>
						<Button type="submit" size="sm" icon={IconRadar} loading={launching} disabled={!!chosenCooldown}>
							{chosenCooldown ?? "Launch"}
						</Button>
					</form>
					{#if chosen}<p class="field-hint">{chosen.label}</p>{/if}
					{#each selInFlight as m, i (i)}
						<p class="font-mono text-xs text-primary-fg">
							{sa.sensors.find((s) => s.id === m.sensor)?.short ?? m.sensor} en route · {countdown(
								m.completesAt,
								now
							) ?? "landing"}
						</p>
					{/each}
				</section>
			{/if}

			<div class="flex gap-2">
				<Button href="/region/{selectedId}" size="sm" variant="secondary" grow>Region page</Button>
				<Button href="/intel" size="sm" variant="ghost" icon={IconDocument}>Intel</Button>
			</div>
		</div>
	{/if}
{/snippet}

<style>
	:global(#panzoom-element) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.map-viewport {
		background: var(--color-surface-0);
	}
	:global(#panzoom-element path) {
		stroke-width: 0.3;
		transition: filter 0.15s ease;
	}
	:global(#panzoom-element path.region-inert) {
		pointer-events: none;
	}
	:global(#panzoom-element path:hover) {
		filter: brightness(1.3);
		cursor: pointer;
	}
	:global(#panzoom-element path.region-highlight) {
		animation: region-pulse 900ms ease-in-out 3;
	}
	/* Selection ring: one path over every region, so shared borders do not
	   clip it. `non-scaling-stroke` keeps it 1.25 px wide at any zoom. */
	:global(#panzoom-element .region-outline) {
		stroke-width: 1.25px;
		stroke-linejoin: round;
		stroke-linecap: round;
		pointer-events: none;
	}
	@keyframes region-pulse {
		50% {
			filter: brightness(1.7);
		}
	}
	.graticule line {
		stroke: var(--color-base-content);
		stroke-opacity: 0.05;
		stroke-width: calc(var(--k, 1) * 1px);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(#panzoom-element path.region-highlight) {
			animation: none;
		}
	}
</style>
