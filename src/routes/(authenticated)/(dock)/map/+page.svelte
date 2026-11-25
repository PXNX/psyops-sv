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
	import Tutorial from "#lib/component/Tutorial.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import {
		AttackArrow,
		Conditions,
		RangeRing,
		ReconSector,
		TACTICAL,
		UnitBadge,
		UnitSymbol
	} from "#lib/component/tactical/index.js";
	import {
		EEZ,
		HEX_BOUNDS,
		SHIP_CLASSES,
		airspaceSectorOf,
		eezHexes,
		hexFromLatLon,
		hexKey,
		hexDistance,
		hexesInRange,
		hexToMap,
		mapHexSize,
		mapToHex,
		hexPolygonMap,
		hexUnionPath,
		parseHexKey,
		UNIT_CATEGORIES,
		MILITARY_UNIT_TEMPLATES,
		WEATHER_LABEL,
		COVER_LABEL,
		regionConditions,
		weatherAt,
		seaConditionAt,
		SEA_CONDITION_LABEL
	} from "#lib/config/index.js";
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
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-20-regular";
	import IconSea from "~icons/fluent/water-24-regular";
	import IconMultiSelect from "~icons/fluent/multiselect-24-regular";
	import IconNavalMode from "~icons/fluent/vehicle-ship-24-regular";
	import IconLandMode from "~icons/fluent/map-24-regular";
	import IconAerialMode from "~icons/fluent/airplane-24-regular";
	import SensorImage from "#lib/component/recon/SensorImage.svelte";
	import { buildSeaScene, seaFrameInput, type SeaImageryInput } from "#lib/utils/sea-image.js";

	let { data }: { data: PageData } = $props();
	let historyOpen = $state(false);

	const mapSteps = [
		{
			id: "naval",
			title: "1. Naval mode",
			body: "Click the ship icon in the top-left rail. The sea hex grid, EEZs and coastal regions come to the front while the regions stay visible.",
			target: '[data-tutorial="naval-mode"]',
			done: "mode-naval",
			manual: "Show mode",
			art: "naval" as const
		},
		{
			id: "hex",
			title: "2. Select a hex",
			body: "Click a coloured hexagon. The panel shows coordinates, EEZ, port, ships and mines — plus a link to the navy console.",
			target: '[data-tutorial="hex-cell"]',
			done: "hex-selected",
			art: "hex" as const
		},
		{
			id: "aerial",
			title: "3. Airspace view",
			body: "Click the aircraft icon. Several hexes and the regions above them become sectors LR-A1 … with unit counts.",
			target: '[data-tutorial="aerial-mode"]',
			done: "mode-aerial",
			manual: "Show mode",
			art: "aerial" as const
		},
		{
			id: "history",
			title: "4. Map history",
			body: "Use the History button in the right-hand toolbar to open the date picker, then pick any saved day. The same map replays who held what on that day.",
			target: '[data-tutorial="map-history"]',
			manual: "Open history",
			art: "history" as const
		},
		{
			id: "done",
			title: "5. Done",
			body: "The technical background is in /docs/map-modes and /docs/navy. Restart the tour from your profile or the docs index.",
			manual: "Finish",
			art: "land" as const
		}
	];

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
	type MapMode = "naval" | "land" | "aerial";
	let mode = $state<MapMode>("naval");
	let base = $state<Base>("political");
	let overlays = $state({ friendly: true, hostile: true, battles: true, recon: true, strikes: true, sea: true });
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
		{ key: "strikes", label: "Airstrikes (24 h)", icon: IconFire },
		{ key: "sea", label: "Hex sea, EEZ & ports", icon: IconSea }
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
	let hoverHexKey = $state<string | null>(null);
	let selectedId = $state<number | null>(null);
	let selectedHexKey = $state<string | null>(null);
	/** Ctrl/Cmd-click (or the pin toggle on touch) adds hexes to a group order. */
	let selectedHexKeys = $state<Set<string>>(new Set());
	let multiSelect = $state(false);
	let seaSensor = $state("");
	let showSeaImage = $state(false);
	let showCoastImage = $state(false);
	$effect(() => {
		if (!seaSensor && data.sea.sensors?.length) seaSensor = data.sea.sensors[0]!.id;
	});
	/** Hexes whose centre falls inside a land path — filled in once the SVG mounts. */
	let landHexKeys = $state<Set<string>>(new Set());
	/** Hexes with at least one water sample: coastal hexes count too. */
	let waterHexKeys = $state<Set<string>>(new Set());
	/** Outline samples of each coastal region, in world-map units. */
	let coastlines = $state<
		{ regionId: number; stateId: number; color: string; d: string; points: { x: number; y: number }[] }[]
	>([]);
	let seaGeometryReady = $state(false);
	/** Each region's outline `d`, read once at mount (the shapes never change). */
	const regionPathD = new Map<number, string>();
	/** Aerial mode: the air sector under the pointer and the one picked. */
	let hoverSectorId = $state<string | null>(null);
	let selectedSectorId = $state<string | null>(null);
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
	const coastalIds = $derived(new Set(data.sea.coastalRegions.map((r) => r.id)));
	/** Every region on the shore, owned or not: the ones naval mode deals with. */
	const shoreIds = $derived(
		new Set(
			Object.entries(data.regionMap)
				.filter(([, r]) => r.terrain === "shore")
				.map(([id]) => Number(id))
		)
	);
	const showSea = $derived(mode !== "land");
	const showLand = $derived(mode !== "naval");
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
	 * shows the full border. Non-scaling stroke keeps it 0.75 px at every zoom.
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
			// Regions stay visible in naval mode: the sea overlays sit on the
			// world map rather than replacing the political/base layer. Inland
			// regions have nothing to do with the sea, so they dim and stop
			// taking clicks there.
			const inland = mode === "naval" && !shoreIds.has(id);
			let fill = r ? fillFor(id, r, maxHeat) : LAND;
			// Aerial mode tints each region with its air sector's hue.
			const sector = mode === "aerial" ? regionSector.get(id) : undefined;
			if (sector) {
				const hot = sector === selectedSectorId || sector === hoverSectorId;
				fill = `color-mix(in oklab, ${sectorHue(sector)} ${hot ? 55 : 32}%, ${fill})`;
			}
			// Stay opaque: the EEZ shapes beneath must not show through the land.
			el.style.fill = inland ? `color-mix(in oklab, ${fill} 45%, var(--color-surface-0))` : fill;
			el.style.opacity = "1";
			el.style.stroke = BORDER;
			el.classList.toggle("region-inland", inland);
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
		void mode;
		void coastalIds;
		void shoreIds;
		void regionSector;
		void hoverSectorId;
		void selectedSectorId;
		if (instance && sceneEl) colorRegions(sceneEl);
	});

	$effect(() => {
		// {@html worldSvg} replaces the world-map DOM; restore its fills after.
		void worldSvg;
		void tick().then(() => {
			if (instance && sceneEl) colorRegions(sceneEl);
		});
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

		// Centroid and rough radius of every region, for placing symbols. Keep
		// each path and its bbox: together they are an exact land test for the
		// sea grid, and the outlines give us real coastlines for EEZ claims.
		const c: Record<number, { x: number; y: number; r: number }> = {};
		const landBoxes: { el: SVGPathElement; x0: number; y0: number; x1: number; y1: number }[] = [];
		const pathById = new Map<number, SVGPathElement>();
		node.querySelectorAll("path[id]").forEach((p) => {
			const el = p as SVGPathElement;
			const id = parseInt(p.id, 10);
			if (isNaN(id) || !data.regionMap[id] || el.closest("defs")) return;
			const b = el.getBBox();
			c[id] = { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.max(2, Math.hypot(b.width, b.height) / 2) };
			landBoxes.push({ el, x0: b.x - 0.5, y0: b.y - 0.5, x1: b.x + b.width + 0.5, y1: b.y + b.height + 0.5 });
			pathById.set(id, el);
			regionPathD.set(id, el.getAttribute("d") ?? "");
		});
		centroids = c;

		const probe = new DOMPoint(0, 0);
		const isLand = (x: number, y: number) => {
			probe.x = x;
			probe.y = y;
			for (const b of landBoxes) {
				if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
				if (b.el.isPointInFill(probe)) return true;
			}
			return false;
		};
		const land = new Set<string>();
		const water = new Set<string>();
		const radius = mapHexSize() * 0.7;
		for (let r = HEX_BOUNDS.minR; r <= HEX_BOUNDS.maxR; r++) {
			for (let q = HEX_BOUNDS.minQ; q <= HEX_BOUNDS.maxQ; q++) {
				const key = hexKey({ q, r });
				const centre = hexToMap({ q, r });
				if (isLand(centre.x, centre.y)) land.add(key);
				let wet = !land.has(key);
				for (let i = 0; i < 6 && !wet; i++) {
					const a = ((60 * i - 30) * Math.PI) / 180;
					if (!isLand(centre.x + radius * Math.cos(a), centre.y + radius * Math.sin(a))) wet = true;
				}
				if (wet) water.add(key);
			}
		}
		landHexKeys = land;
		waterHexKeys = water;

		// Sample the actual outline of each coastal region. EEZs grow out from
		// these points, so an irregular coast produces an irregular EEZ and
		// neighbouring claims meet at the coast instead of at a centroid.
		coastlines = data.sea.coastalRegions.map((region) => {
			const path = pathById.get(region.id);
			const points: { x: number; y: number }[] = [];
			if (path) {
				const length = path.getTotalLength();
				const step = Math.max(3, length / 120);
				for (let d = 0; d <= length; d += step) {
					const p = path.getPointAtLength(d);
					points.push({ x: p.x, y: p.y });
				}
			}
			if (!points.length) {
				const centre = hexToMap(hexFromLatLon(region.latitude, region.longitude));
				points.push(centre);
			}
			return {
				regionId: region.id,
				stateId: region.stateId,
				color: data.stateColorMap[region.stateId] ?? "#38bdf8",
				d: path?.getAttribute("d") ?? "",
				points
			};
		});
		seaGeometryReady = true;

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
	/** Pointer position in world-map units (the 1400×600 SVG space). */
	function mapPoint(e: PointerEvent) {
		const rect = viewportEl!.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left - transform.x) / transform.scale,
			y: (e.clientY - rect.top - transform.y) / transform.scale
		};
	}
	/** The sea hex under the pointer: a grid cell carries its key, and the EEZ
	 *  band (which covers the inner cells) is resolved from the map position. */
	function hexKeyAt(e: PointerEvent): string | null {
		const target = e.target as Element | null;
		const cell = target?.closest?.("[data-hex]")?.getAttribute("data-hex");
		if (cell) return cell;
		if (!viewportEl || !target?.closest?.("[data-eez]")) return null;
		const p = mapPoint(e);
		return hexKey(mapToHex(p.x, p.y));
	}
	/** Aerial mode: the air sector under the pointer. A region, its EEZ band
	 *  and a sea cell each resolve to their sector; anything else (open map)
	 *  falls back to the sector grid. */
	function sectorAt(e: PointerEvent): string | null {
		if (!viewportEl) return null;
		const target = e.target as Element | null;
		const eez = target?.closest?.("[data-eez]")?.getAttribute("data-eez");
		if (eez) return regionSector.get(Number(eez)) ?? null;
		const cell = target?.closest?.("[data-hex]")?.getAttribute("data-hex");
		if (cell) return hexSector(cell);
		const id = target instanceof SVGPathElement ? parseInt(target.id, 10) : NaN;
		if (!isNaN(id) && regionSector.has(id)) return regionSector.get(id)!;
		const p = mapPoint(e);
		return airspaceSectorOf(mapToHex(p.x, p.y));
	}
	function onPointerUp(e: PointerEvent) {
		if (!e.isPrimary || Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESHOLD) return;
		if (mode === "aerial") {
			selectedSectorId = sectorAt(e);
			selectedId = null;
			selectedHexKey = null;
			selectedHexKeys = new Set();
			sheetOpen = !!selectedSectorId;
			return;
		}
		const key = hexKeyAt(e);
		if (key) {
			if (e.ctrlKey || e.metaKey || multiSelect) {
				const next = new Set(selectedHexKeys);
				if (next.has(key)) next.delete(key);
				else next.add(key);
				selectedHexKeys = next;
			} else {
				selectedHexKeys = new Set([key]);
			}
			selectedHexKey = key;
			selectedId = null;
			sheetOpen = false;
			window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "hex-selected" }));
			return;
		}
		let el = e.target as Element | null;
		for (let d = 0; el && d < 5; d++, el = el.parentElement) {
			const id = parseInt(el.id, 10);
			if (!isNaN(id) && id > 0 && data.regionMap[id]) {
				// Naval mode only deals with the coast.
				if (mode === "naval" && !shoreIds.has(id)) return;
				openRegion(id);
				return;
			}
		}
	}
	function onPointerMove(e: PointerEvent) {
		if (!viewportEl) return;
		if (mode === "aerial") {
			hoverHexKey = null;
			hoverSectorId = sectorAt(e);
		} else {
			hoverHexKey = hexKeyAt(e);
		}
		cursor = mapPoint(e);
	}

	function openRegion(id: number) {
		selectedId = id;
		selectedHexKey = null;
		selectedHexKeys = new Set();
		sheetOpen = true;
	}
	function closeRegion() {
		selectedId = null;
		sheetOpen = false;
	}
	$effect(() => {
		if (!sheetOpen && !isDesktop) {
			selectedId = null;
			selectedSectorId = null;
		}
	});
	$effect(() => {
		// Sectors only exist in aerial mode.
		if (mode !== "aerial") {
			selectedSectorId = null;
			hoverSectorId = null;
		}
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
			.filter(
				(m): m is Marker & { total: number; ally: boolean; unitType: string } =>
					!!m && (showLand || coastalIds.has(m.id))
			)
	);
	const hostileMarkers = $derived.by(() => {
		const out: (Marker & { known: boolean; count: number; estimated: boolean; dominant: string | null })[] = [];
		const pics = sa?.pictures ?? {};
		for (const [id, p] of Object.entries(pics)) {
			const c = centroids[Number(id)];
			if (!c || !p.knownUnits || (!showLand && !coastalIds.has(Number(id)))) continue;
			const estimated = UNIT_CATEGORIES.some((cat) => p.categories[cat]?.estimated);
			out.push({ id: Number(id), x: c.x, y: c.y, known: true, count: p.knownUnits, estimated, dominant: p.dominant });
		}
		for (const id of sa?.contested ?? []) {
			const c = centroids[id];
			if (!c || pics[id] || (!showLand && !coastalIds.has(id))) continue;
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
				if (!c || (!showLand && !coastalIds.has(b.regionId))) return null;
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

	// Ships and aircraft are military units as well as (for hulls) fleet contacts.
	// In naval/aerial modes draw the ones we own at their region, even when the
	// region is inland — a squadron still at its airfield is still our squadron.
	const UNIT_GLYPH: Record<string, string> = {
		carrier: "CV",
		frigate: "FF",
		submarine: "SS",
		landing_ship: "LS",
		marine: "MAR",
		bomber_squadron: "BOM",
		fighter_squadron: "FTR",
		transport_aircraft: "AIR",
		bomber: "BOM",
		tanker_aircraft: "TNK",
		fighterjet: "FTR",
		close_air_support: "CAS",
		naval_bomber: "NB",
		helicopter: "HELI"
	};
	const domainUnitMarkers = $derived.by(() => {
		if (mode === "land") return [];
		const out: { id: number; x: number; y: number; glyph: string; count: number; slot: number }[] = [];
		for (const [regionId, force] of Object.entries(sa?.friendly ?? {})) {
			const c = centroids[Number(regionId)];
			if (!c) continue;
			let slot = 0;
			for (const [type, count] of Object.entries(force.byType)) {
				const domain = MILITARY_UNIT_TEMPLATES[type as keyof typeof MILITARY_UNIT_TEMPLATES]?.domain;
				if (mode === "naval" ? domain !== "sea" : domain !== "air") continue;
				out.push({
					id: Number(regionId),
					x: c.x,
					y: c.y,
					glyph: UNIT_GLYPH[type] ?? type.slice(0, 3).toUpperCase(),
					count,
					slot: slot++
				});
			}
		}
		return out;
	});

	// ── Naval hex sea: a grid on the map, with coast-anchored EEZs ──────────
	const hexCentre = (h: { q: number; r: number }) => hexToMap(h);
	const hexPoints = (h: { q: number; r: number }) =>
		hexPolygonMap(h)
			.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
			.join(" ");
	const activeHexKeys = $derived(
		new Set([
			...data.sea.ports.map((p) => hexKey(p)),
			...data.sea.ships.filter((s) => s.status !== "sunk").map((s) => hexKey(s)),
			...data.sea.mines.map((m) => hexKey(m))
		])
	);

	/** Half-width of the EEZ band in map units: it reaches this far out from
	 *  the coastline, i.e. the claim's rings plus half a cell. */
	const eezBandWidth = () => mapHexSize() * (EEZ.radiusHexes + 0.5);

	/** Coast points bucketed by map cell, so an EEZ claim can find the nearest
	 *  coastline without comparing every hex with every sampled point. */
	const coastGrid = $derived.by(() => {
		const cell = mapHexSize() * 2;
		const grid = new Map<string, { index: number; x: number; y: number }[]>();
		coastlines.forEach((coast, index) => {
			for (const p of coast.points) {
				const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
				const bucket = grid.get(key) ?? [];
				bucket.push({ index, x: p.x, y: p.y });
				grid.set(key, bucket);
			}
		});
		return { grid, cell };
	});

	/** The coastline (index into `coastlines`) closest to a map point. */
	function nearestCoast(p: { x: number; y: number }): { index: number; distance: number } {
		const { grid, cell } = coastGrid;
		const bx = Math.floor(p.x / cell);
		const by = Math.floor(p.y / cell);
		let index = -1;
		let distance = Infinity;
		for (let dx = -2; dx <= 2; dx++) {
			for (let dy = -2; dy <= 2; dy++) {
				for (const item of grid.get(`${bx + dx},${by + dy}`) ?? []) {
					const d = Math.hypot(p.x - item.x, p.y - item.y);
					if (d < distance) {
						distance = d;
						index = item.index;
					}
				}
			}
		}
		return { index, distance };
	}

	/** EEZs are claimed by the nearest *coastline*, not by a region centroid.
	 *  Candidates are the water hexes within a couple of rings of any coast
	 *  sample; a hex belongs to the coastal region whose outline is closest.
	 *  That makes each zone an extension of its (non-hexagonal) shoreline. */
	const eezByHex = $derived.by(() => {
		const owner = new Map<string, { regionId: number; stateId: number; color: string; distance: number }>();
		if (!seaGeometryReady) return owner;
		if (!coastlines.length) {
			// Fallback for worlds whose region outlines are not in the base SVG.
			for (const region of data.sea.coastalRegions) {
				const centre = hexFromLatLon(region.latitude, region.longitude);
				const color = data.stateColorMap[region.stateId] ?? "#38bdf8";
				for (const h of eezHexes(region, data.sea.regionsForEez)) {
					const key = hexKey(h);
					if (landHexKeys.has(key)) continue;
					const distance = hexDistance(h, centre);
					const prev = owner.get(key);
					if (!prev || distance < prev.distance)
						owner.set(key, { regionId: region.id, stateId: region.stateId, color, distance });
				}
			}
			return owner;
		}

		const candidates = new Set<string>(activeHexKeys);
		for (const coast of coastlines) {
			for (const p of coast.points) {
				const { lat, lon } = mapToLatLon(p.x, p.y);
				for (const h of hexesInRange(hexFromLatLon(lat, lon), EEZ.radiusHexes)) {
					const key = hexKey(h);
					if (waterHexKeys.has(key)) candidates.add(key);
				}
			}
		}

		// A hex whose centre lies within reach of a coast belongs to the EEZ;
		// the open grid starts with the first cell beyond.
		const maxDistance = eezBandWidth();
		for (const key of candidates) {
			const { index: best, distance: bestDistance } = nearestCoast(hexToMap(parseHexKey(key)));
			if (best < 0 || bestDistance > maxDistance) continue;
			const coast = coastlines[best]!;
			owner.set(key, { regionId: coast.regionId, stateId: coast.stateId, color: coast.color, distance: bestDistance });
		}
		return owner;
	});
	/** Each coastal region's EEZ as one filled shape: the union of its claimed
	 *  sea cells plus the land-centred cells along its shore. Drawn beneath
	 *  the opaque land, the shape fills the water exactly from the coastline
	 *  out to the edge of the open hex grid, so no gap is left between them. */
	const eezPieces = $derived.by(() => {
		const byRegion = new Map<number, { color: string; hexes: { q: number; r: number }[] }>();
		const add = (regionId: number, color: string, h: { q: number; r: number }) => {
			const entry = byRegion.get(regionId) ?? { color, hexes: [] };
			entry.hexes.push(h);
			byRegion.set(regionId, entry);
		};
		for (const [key, o] of eezByHex) add(o.regionId, o.color, parseHexKey(key));
		if (coastlines.length) {
			// Shore cells: centred on land but touching a claimed cell. The land
			// covers their inland part; their water slivers join the EEZ.
			for (const key of landHexKeys) {
				const h = parseHexKey(key);
				if (eezByHex.has(key) || !hexNeighborsSafe(h).some((n) => eezByHex.has(hexKey(n)))) continue;
				const { index } = nearestCoast(hexToMap(h));
				const coast = index >= 0 ? coastlines[index] : undefined;
				if (coast) add(coast.regionId, coast.color, h);
			}
		}
		return [...byRegion.entries()].map(([regionId, v]) => ({
			regionId,
			color: v.color,
			d: hexUnionPath(v.hexes)
		}));
	});

	const seaHexes = $derived.by(() => {
		const out: {
			key: string;
			q: number;
			r: number;
			points: string;
			x: number;
			y: number;
			active: boolean;
			color: string;
			regionId: number | null;
			inEez: boolean;
			condition: ReturnType<typeof seaConditionAt>;
		}[] = [];
		for (let r = HEX_BOUNDS.minR; r <= HEX_BOUNDS.maxR; r++) {
			for (let q = HEX_BOUNDS.minQ; q <= HEX_BOUNDS.maxQ; q++) {
				const h = { q, r };
				const key = hexKey(h);
				const owner = eezByHex.get(key);
				// The whole sea grid is drawn on the real map in naval/aerial
				// mode. Until the mount-time geometry sample knows which hexes
				// are water, keep the smaller EEZ-only set so SSR stays lean.
				if (!owner && (!seaGeometryReady || !waterHexKeys.has(key))) continue;
				const c = hexCentre(h);
				const condition = seaConditionAt(q, r, mapToLatLon(c.x, c.y).lat, now);
				out.push({
					key,
					q,
					r,
					points: hexPoints(h),
					x: c.x,
					y: c.y,
					active: activeHexKeys.has(key),
					color: owner?.color ?? "#38bdf8",
					regionId: owner?.regionId ?? null,
					inEez: !!owner,
					condition
				});
			}
		}
		return out;
	});

	/** Show a vessel on water even if its stored hex sits under a land path. */
	function displayHex(h: { q: number; r: number }) {
		if (eezByHex.has(hexKey(h))) return h;
		const nearest = [...eezByHex.keys()].map(parseHexKey).sort((a, b) => hexDistance(a, h) - hexDistance(b, h))[0];
		return nearest ?? h;
	}
	const portMarkers = $derived(data.sea.ports.map((p) => ({ ...p, ...hexCentre(displayHex(p)) })));
	const shipMarkers = $derived(
		data.sea.ships
			.filter((s) => s.status !== "sunk")
			.map((s) => ({ ...s, ...hexCentre(displayHex(s)), short: SHIP_CLASSES[s.shipClass]?.short ?? "?" }))
	);
	const mineMarkers = $derived(data.sea.mines.map((m) => ({ ...m, ...hexCentre(displayHex(m)) })));

	const selectedHexInfo = $derived.by(() => {
		if (!selectedHexKey) return null;
		const h = parseHexKey(selectedHexKey);
		const owner = eezByHex.get(selectedHexKey);
		return {
			q: h.q,
			r: h.r,
			owner: owner
				? { regionId: owner.regionId, stateName: stateById.get(owner.stateId)?.name ?? `State ${owner.stateId}` }
				: null,
			port: data.sea.ports.find((p) => p.q === h.q && p.r === h.r) ?? null,
			ships: data.sea.ships.filter((s) => s.q === h.q && s.r === h.r && s.status !== "sunk"),
			mines: data.sea.mines.filter((m) => m.q === h.q && m.r === h.r),
			intel: data.sea.intel?.[selectedHexKey] ?? null
		};
	});

	/** Hexes currently held for a formation order (ctrl/cmd-click adds more). */
	const assignedHexes = $derived([...selectedHexKeys].map(parseHexKey));

	/** Procedural sensor frame for the selected hex's freshest sea report. */
	const seaImagery = $derived.by(() => {
		const info = selectedHexInfo;
		if (!info?.intel) return null;
		const key = selectedHexKey!;
		const h = parseHexKey(key);
		const centre = hexCentre(h);
		const ll = mapToLatLon(centre.x, centre.y);
		const conditions = regionConditions({ id: h.q * 100 + h.r, longitude: ll.lon, terrain: "shore" }, now);
		const ownerId = info.owner?.regionId;
		const shore = ownerId != null ? coastlines.find((c) => c.regionId === ownerId) : null;
		const sensor: SeaImageryInput = {
			seed: h.q * 100 + h.r,
			coastline: shore?.points,
			coastCentre: ownerId != null ? centroids[ownerId] : undefined,
			lat: ll.lat,
			lon: ll.lon,
			sensor: info.intel.sensor,
			observedAt: info.intel.observedAt,
			night: conditions.night,
			weather: conditions.weather,
			coastal: !!info.owner || !!info.port,
			port: !!info.port,
			contacts: {
				surface: info.intel.contacts?.surface ?? 0,
				sub: info.intel.contacts?.sub ?? 0,
				mine: info.intel.mines ?? 0
			},
			confidence: (info.intel.confidence ?? 0) / 100
		};
		return { input: seaFrameInput(sensor), scene: buildSeaScene(sensor) };
	});

	/** Coastal regions get their own frame: the same sea state and shoreline,
	 *  with the port and any fresh report from the water just offshore. */
	const coastalImagery = $derived.by(() => {
		if (selectedId == null || !coastalIds.has(selectedId)) return null;
		const region = data.sea.regionsForEez.find((r) => r.id === selectedId);
		if (!region) return null;
		const centre = hexFromLatLon(region.latitude, region.longitude);
		const keys = [hexKey(centre), ...hexNeighborsSafe(centre).map(hexKey)];
		const report = keys.map((key) => ({ key, r: data.sea.intel?.[key] })).find((x) => x.r) ?? null;
		const cond = regionConditions({ id: selectedId, longitude: region.longitude, terrain: "shore" }, now);
		const input: SeaImageryInput = {
			seed: selectedId,
			lat: region.latitude,
			lon: region.longitude,
			coastline: coastlines.find((c) => c.regionId === selectedId)?.points,
			coastCentre: centroids[selectedId],
			sensor: report?.r?.sensor ?? "sat_eo",
			observedAt: report?.r?.observedAt ?? now.toISOString(),
			night: cond.night,
			weather: cond.weather,
			coastal: true,
			port: data.sea.ports.some((p) => p.regionId === selectedId),
			contacts: {
				surface: report?.r?.contacts?.surface ?? 0,
				sub: report?.r?.contacts?.sub ?? 0,
				mine: report?.r?.mines ?? 0
			},
			confidence: (report?.r?.confidence ?? 0) / 100
		};
		return { input: seaFrameInput(input), scene: buildSeaScene(input) };
	});
	function hexNeighborsSafe(h: { q: number; r: number }) {
		return [
			{ q: h.q + 1, r: h.r },
			{ q: h.q - 1, r: h.r },
			{ q: h.q, r: h.r + 1 },
			{ q: h.q, r: h.r - 1 },
			{ q: h.q + 1, r: h.r - 1 },
			{ q: h.q - 1, r: h.r + 1 }
		];
	}

	/** The hex map is part of the world SVG itself, not a second floating canvas.
	 *  Drawn in order before the region paths, so the opaque land clips both:
	 *   1. the open-sea hex grid (cells claimed by an EEZ are skipped);
	 *   2. the EEZs: one filled shape per coastal region (see `eezPieces`).
	 *      The land covers its inland part, so what shows is exactly the water
	 *      from the coastline out to the first open-sea cell.
	 *  Styles go in `style`: the page CSS sets path stroke widths, and CSS
	 *  colour variables only resolve there. */
	const worldSvg = $derived.by(() => {
		if (!showSea || !overlays.sea) return WorldMap;
		// Aerial mode washes each cell and coast in its air sector's hue.
		const aerial = mode === "aerial";
		const cells = seaHexes
			.filter((h) => !h.inEez)
			.map((h) => {
				const hue = aerial ? sectorHue(hexSector(h.key)) : null;
				const fill =
					h.condition === "stormy" ? "url(#sea-storm)" : h.condition === "icy" ? "url(#sea-ice)" : (hue ?? "#38bdf8");
				const opacity = h.condition !== "calm" ? 1 : hue ? 0.08 : h.active ? 0.1 : 0;
				return `<polygon data-hex='${h.key}' data-tutorial='hex-cell' points='${h.points}' fill='${fill}' fill-opacity='${opacity}' stroke='${hue ?? "#7dd3fc"}' stroke-opacity='${
					h.active ? 0.45 : hue ? 0.22 : 0.16
				}' stroke-width='0.6' stroke-linejoin='round' style='cursor:pointer'/>`;
			})
			.join("");
		const coastColor = (c: { regionId: number; color: string }) => {
			const sector = aerial ? regionSector.get(c.regionId) : undefined;
			return sector ? sectorHue(sector) : c.color;
		};
		const patterns =
			"<defs>" +
			"<pattern id='sea-storm' width='3' height='3' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>" +
			"<rect width='3' height='3' fill='#f59e0b' fill-opacity='0.05'/>" +
			"<line x1='0' y1='0' x2='0' y2='3' stroke='#fbbf24' stroke-opacity='0.4' stroke-width='0.5'/></pattern>" +
			"<pattern id='sea-ice' width='4' height='4' patternUnits='userSpaceOnUse'>" +
			"<rect width='4' height='4' fill='#e0f2fe' fill-opacity='0.08'/>" +
			"<circle cx='2' cy='2' r='0.45' fill='#e0f2fe' fill-opacity='0.45'/></pattern>" +
			"</defs>";
		const pieces = eezPieces
			.map((c) => {
				const color = coastColor(c);
				return `<path data-eez='${c.regionId}' d='${c.d}' style='fill:color-mix(in oklab, ${color} 22%, var(--color-surface-0));stroke:${color};stroke-opacity:${aerial ? 0.3 : 0.55};stroke-width:0.6px;stroke-linejoin:round;cursor:pointer'/>`;
			})
			.join("");
		const group =
			`<g id='world-hex-sea'><title>Open sea · hex grid</title>${patterns}${cells}</g>` +
			`<g id='world-eez'><title>Exclusive economic zones · coast to hex grid</title>${pieces}</g>`;
		return WorldMap.replace("</defs>", `</defs>${group}`);
	});

	/** Hex outlines for the selection and the cell under the pointer. They sit
	 *  in the overlay so they also show inside the EEZ band. */
	const hexHighlights = $derived.by(() => {
		if (!showSea || !overlays.sea || mode === "aerial") return [];
		const keys = new Set(selectedHexKeys);
		if (selectedHexKey) keys.add(selectedHexKey);
		const out = [...keys].map((key) => ({ key, points: hexPoints(parseHexKey(key)), picked: true }));
		if (hoverHexKey && !keys.has(hoverHexKey))
			out.push({ key: hoverHexKey, points: hexPoints(parseHexKey(hoverHexKey)), picked: false });
		return out;
	});

	/** Aerial mode: air sectors (Luftraum). The map is cut into a coarse grid,
	 *  but a sector takes whole regions, never half of one: each region goes
	 *  to the sector its centre lies in, its EEZ waters follow it, and the
	 *  open sea goes by the grid. So one sector is a block of neighbouring
	 *  regions plus their coast and the sea beyond. */
	const regionSector = $derived.by(() => {
		const out = new Map<number, string>();
		for (const [id, c] of Object.entries(centroids)) out.set(Number(id), airspaceSectorOf(mapToHex(c.x, c.y)));
		return out;
	});
	function hexSector(key: string): string {
		const owner = eezByHex.get(key);
		return (owner && regionSector.get(owner.regionId)) || airspaceSectorOf(parseHexKey(key));
	}
	/** Four alternating hues so neighbouring sectors never share a tint. */
	const SECTOR_HUES = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b"];
	function sectorHue(id: string): string {
		const m = /^LR-([A-Z])(\d+)$/.exec(id);
		if (!m) return SECTOR_HUES[0]!;
		const row = m[1]!.charCodeAt(0) - 65;
		const col = Number(m[2]) - 1;
		return SECTOR_HUES[(row % 2) * 2 + ((col + row) % 2)]!;
	}

	const airspaces = $derived.by(() => {
		if (mode !== "aerial") return [];
		type Sector = {
			id: string;
			hue: string;
			regions: number[];
			eezHexes: string[];
			openHexes: string[];
			xs: number;
			ys: number;
			n: number;
		};
		const byId = new Map<string, Sector>();
		const get = (id: string) => {
			let s = byId.get(id);
			if (!s) {
				s = { id, hue: sectorHue(id), regions: [], eezHexes: [], openHexes: [], xs: 0, ys: 0, n: 0 };
				byId.set(id, s);
			}
			return s;
		};
		for (const [id, sector] of regionSector) {
			const s = get(sector);
			const c = centroids[id]!;
			s.regions.push(id);
			s.xs += c.x;
			s.ys += c.y;
			s.n++;
		}
		for (const h of seaHexes) {
			const s = get(h.regionId != null ? (regionSector.get(h.regionId) ?? airspaceSectorOf(h)) : airspaceSectorOf(h));
			(h.inEez ? s.eezHexes : s.openHexes).push(h.key);
			// Sea pulls the label only where a sector has no land of its own.
			if (!s.regions.length) {
				s.xs += h.x;
				s.ys += h.y;
				s.n++;
			}
		}
		const ownAir = data.sea.aircraft.filter((a) => sideStates.has(a.stateId) && a.fuel > 0);
		const ships = data.sea.ships.filter((x) => x.status !== "sunk");
		return [...byId.values()]
			.filter((s) => s.n > 0)
			.map((s) => {
				const stateCounts = new Map<number, number>();
				for (const id of s.regions) {
					const st = data.regionMap[id]?.stateId;
					if (st) stateCounts.set(st, (stateCounts.get(st) ?? 0) + 1);
				}
				const states = [...stateCounts.entries()]
					.sort((a, b) => b[1] - a[1])
					.map(([stateId, count]) => ({ stateId, count, name: stateById.get(stateId)?.name ?? `State #${stateId}` }));
				const own = states.some((x) => sideStates.has(x.stateId));
				const hostile = states.some((x) => enemyStates.has(x.stateId));
				const regionSet = new Set(s.regions);
				return {
					...s,
					x: s.xs / s.n,
					y: s.ys / s.n,
					states,
					control:
						own && hostile
							? ("contested" as const)
							: own
								? ("ours" as const)
								: hostile
									? ("hostile" as const)
									: ("neutral" as const),
					air: ownAir.filter((a) => regionSet.has(a.regionId)).length,
					ships: ships.filter((x) => hexSector(hexKey(x)) === s.id).length,
					ports: data.sea.ports.filter((x) => hexSector(hexKey(x)) === s.id).length
				};
			});
	});
	const hoverSector = $derived(hoverSectorId);
	const selSector = $derived(selectedSectorId ? (airspaces.find((x) => x.id === selectedSectorId) ?? null) : null);
	/** Outline of the hovered and picked sectors: their regions' shapes plus
	 *  the union of their sea cells. */
	const sectorOutlines = $derived.by(() => {
		const ids = [...new Set([selectedSectorId, hoverSectorId].filter((x): x is string => !!x))];
		return ids
			.map((id) => airspaces.find((x) => x.id === id))
			.filter((x) => !!x)
			.map((s) => ({
				id: s.id,
				hue: s.hue,
				picked: s.id === selectedSectorId,
				land: s.regions.map((r) => regionPathD.get(r) ?? "").join(" "),
				// The sector's EEZ bands keep their coast-hugging shape; only the
				// open sea beyond is drawn as hex cells.
				eez: eezPieces
					.filter((p) => s.regions.includes(p.regionId))
					.map((p) => p.d)
					.join(" "),
				sea: hexUnionPath(s.openHexes.map(parseHexKey))
			}));
	});

	function hexKeyFromCoords(r: { latitude: number; longitude: number }) {
		return hexKey(hexFromLatLon(r.latitude, r.longitude));
	}

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
		onpointerleave={() => {
			cursor = null;
			hoverSectorId = null;
		}}
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
			{@html worldSvg}

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

				{#if mode === "aerial"}
					<!-- Air sectors: the hovered/picked one outlined (its regions and its
					     sea cells), a tab label per sector -->
					<g pointer-events="none">
						{#each sectorOutlines as o (o.id)}
							<path
								d={o.eez}
								style:fill={o.hue}
								style:stroke={o.hue}
								style:stroke-width="{(o.picked ? 1.2 : 0.8) * k}px"
								fill-opacity={o.picked ? 0.16 : 0.08}
								stroke-opacity={o.picked ? 0.8 : 0.5}
								stroke-linejoin="round"
							/>
							<path
								d={o.sea}
								style:fill={o.hue}
								style:stroke={o.hue}
								style:stroke-width="{(o.picked ? 1.6 : 1.1) * k}px"
								fill-opacity={o.picked ? 0.12 : 0.06}
								stroke-opacity={o.picked ? 0.9 : 0.6}
								stroke-linejoin="round"
							/>
							<path
								d={o.land}
								style:fill="none"
								style:stroke={o.hue}
								style:stroke-width="{(o.picked ? 1 : 0.7) * k}px"
								stroke-opacity={o.picked ? 0.9 : 0.6}
								stroke-linejoin="round"
							/>
						{/each}
						{#each airspaces as sector (sector.id)}
							{@const hot = sector.id === hoverSector || sector.id === selectedSectorId}
							<g transform="translate({sector.x} {sector.y}) scale({k})">
								<rect
									x="-19"
									y="-7"
									width="38"
									height="14"
									rx="2"
									style:fill={hot ? sector.hue : "var(--color-surface-0)"}
									style:stroke={sector.hue}
									fill-opacity={hot ? 1 : 0.85}
									stroke-opacity={hot ? 1 : 0.6}
								/>
								<text
									y="3"
									text-anchor="middle"
									font-size="7.5"
									font-weight="600"
									class="data"
									style:fill={hot ? "var(--color-surface-0)" : sector.hue}
								>
									{sector.id.replace("LR-", "")}
								</text>
							</g>
						{/each}
					</g>
				{/if}

				{#if showSea && overlays.sea}
					<!-- Selected and hovered hexes; the band hides the cells beneath it -->
					<g pointer-events="none">
						{#each hexHighlights as h (h.key)}
							<polygon
								points={h.points}
								fill="#f8fafc"
								fill-opacity={h.picked ? 0.14 : 0.06}
								stroke="#f8fafc"
								stroke-opacity={h.picked ? 0.95 : 0.5}
								stroke-width={(h.picked ? 1.5 : 1) * k}
								stroke-linejoin="round"
							/>
						{/each}
					</g>
					<!-- Ports, ships and minefields -->
					<g class="sea-markers" pointer-events="none">
						{#each mineMarkers as m (m.id)}
							<g transform="translate({m.x + 7 * k} {m.y - 7 * k}) scale({k})">
								<title>Minefield · strength {m.strength}</title>
								<g style:stroke="var(--color-error)" stroke-width="1.2" stroke-linecap="round">
									<line x1="-4.5" y1="0" x2="4.5" y2="0" />
									<line x1="0" y1="-4.5" x2="0" y2="4.5" />
									<line x1="-3.2" y1="-3.2" x2="3.2" y2="3.2" />
									<line x1="-3.2" y1="3.2" x2="3.2" y2="-3.2" />
								</g>
								<circle
									r="2.6"
									style:fill="var(--color-surface-0)"
									style:stroke="var(--color-error)"
									stroke-width="1.2"
								/>
							</g>
						{/each}
						{#each portMarkers as p (p.id)}
							<g transform="translate({p.x} {p.y}) scale({k})">
								<title>{p.name} · hex {p.q},{p.r}</title>
								<circle r="7.5" style:fill="var(--color-surface-0)" stroke="#38bdf8" stroke-width="1.2" />
								<g fill="none" stroke="#7dd3fc" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="0" cy="-3.6" r="1.3" />
									<path d="M0 -2.3 V4.2 M-2.6 -0.8 H2.6 M-4 1.6 Q-3.4 4.4 0 4.4 Q3.4 4.4 4 1.6" />
								</g>
								<text
									x="11"
									y="3"
									font-size="8"
									class="data"
									style:fill="#7dd3fc"
									style:paint-order="stroke"
									style:stroke="var(--color-surface-0)"
									stroke-width="2.5"
								>
									{p.name}
								</text>
							</g>
						{/each}
						{#each shipMarkers as s (s.id)}
							{@const side =
								s.stateId === data.sa?.side?.stateId || sideStates.has(s.stateId)
									? "friend"
									: data.sa?.enemyStateIds?.includes(s.stateId)
										? "hostile"
										: "unknown"}
							<g transform="translate({s.x} {s.y + 12 * k}) scale({k})">
								<title>{s.short} · hex {s.q},{s.r} · {s.health} hp</title>
								<!-- APP-6 sea surface frames: circle friend, diamond hostile, square other -->
								{#if side === "friend"}
									<circle
										r="6"
										style:fill={TACTICAL.friend.fill}
										style:stroke={TACTICAL.friend.stroke}
										stroke-width="1.2"
									/>
								{:else if side === "hostile"}
									<path
										d="M0 -7 L7 0 L0 7 L-7 0 Z"
										style:fill={TACTICAL.hostile.fill}
										style:stroke={TACTICAL.hostile.stroke}
										stroke-width="1.2"
									/>
								{:else}
									<rect
										x="-5.5"
										y="-5.5"
										width="11"
										height="11"
										style:fill={TACTICAL.unknown.fill}
										style:stroke={TACTICAL.unknown.stroke}
										stroke-width="1.2"
									/>
								{/if}
								<text
									x="0"
									y="2"
									text-anchor="middle"
									font-size="4.6"
									font-weight="bold"
									style:fill={TACTICAL[side].text}
								>
									{s.short}
								</text>
							</g>
						{/each}
					</g>
				{/if}

				{#if mode !== "land" && overlays.friendly}
					<!-- Own sea or air units at their home region -->
					<g pointer-events="none">
						{#each domainUnitMarkers as u (u.id + ":" + u.glyph)}
							<g transform="translate({u.x} {u.y - (16 + u.slot * 13) * k}) scale({k})">
								<title>{u.glyph} ×{u.count}</title>
								<rect
									x="-12"
									y="-5.5"
									width="34"
									height="11"
									rx="5.5"
									style:fill="var(--color-surface-0)"
									style:stroke={TACTICAL.friend.stroke}
								/>
								{#if mode === "aerial"}
									<path
										transform="translate(-6.5 0) rotate(45)"
										d="M0 -4.5 L0.8 -1.2 L4 0.6 L4 1.5 L0.8 0.7 L0.5 3.2 L1.6 4 L1.6 4.6 L0 4.1 L-1.6 4.6 L-1.6 4 L-0.5 3.2 L-0.8 0.7 L-4 1.5 L-4 0.6 L-0.8 -1.2 Z"
										style:fill={TACTICAL.friend.icon}
									/>
								{:else}
									<path
										d="M-10 -0.5 H-3 L-4.2 2.5 H-8.8 Z M-7 -0.5 V-3.5 H-5.6 V-0.5"
										style:fill={TACTICAL.friend.icon}
									/>
								{/if}
								<text x="0" y="2.2" font-size="6" font-weight="bold" style:fill={TACTICAL.friend.text}>{u.glyph}</text>
								<text x="20" y="2.2" text-anchor="end" font-size="6" class="data" style:fill={TACTICAL.friend.text}>
									{u.count}
								</text>
							</g>
						{/each}
					</g>
				{/if}

				{#if overlays.recon && showLand}
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

				{#if overlays.battles && showLand}
					{#each battleMarkers as b (b.id)}
						<RangeRing x={b.x} y={b.y} r={Math.max(b.r * 1.1, 16 * k)} />
					{/each}
					{#each battleMarkers as b (b.id)}
						{#if b.ox != null && b.oy != null}
							<AttackArrow x1={b.ox} y1={b.oy} x2={b.x} y2={b.y} headSize={8 * k} inset={Math.max(b.r * 0.4, 6 * k)} />
						{/if}
					{/each}
				{/if}

				{#if overlays.strikes && showLand}
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
									stroke-width="2"
								>
									{m.count}
								</text>
							{/if}
						</g>
					{/each}
				{/if}

				{#if overlays.friendly && showLand}
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

				{#if overlays.hostile && showLand}
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
		<div class="mb-1 flex flex-col gap-0.5 border-b border-line/20 pb-1" aria-label="Map mode">
			<IconButton
				icon={IconNavalMode}
				label="Naval mode · sea and coasts only"
				size="sm"
				shape="square"
				variant={mode === "naval" ? "soft-blue" : "ghost"}
				aria-pressed={mode === "naval"}
				data-tutorial="naval-mode"
				onclick={() => {
					mode = "naval";
					window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "mode-naval" }));
				}}
			/>
			<IconButton
				icon={IconLandMode}
				label="Land mode · regions and forces"
				size="sm"
				shape="square"
				variant={mode === "land" ? "soft-blue" : "ghost"}
				aria-pressed={mode === "land"}
				onclick={() => (mode = "land")}
			/>
			<IconButton
				icon={IconAerialMode}
				label="Aerial mode · grouped Luftraum sectors"
				size="sm"
				shape="square"
				variant={mode === "aerial" ? "soft-blue" : "ghost"}
				aria-pressed={mode === "aerial"}
				data-tutorial="aerial-mode"
				onclick={() => {
					mode = "aerial";
					window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "mode-aerial" }));
				}}
			/>
		</div>
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
							}}
						>
							{h.label}
						</button>
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
		<IconButton
			icon={IconMultiSelect}
			label="Multi-select hexes"
			size="sm"
			shape="square"
			variant={multiSelect ? "soft-blue" : "ghost"}
			aria-pressed={multiSelect}
			onclick={() => (multiSelect = !multiSelect)}
		/>
		<IconButton icon={IconDocument} label="Intel reports" size="sm" shape="square" variant="ghost" href="/intel" />
	</nav>

	<!-- Selected sea hex -->
	{#if selectedHexInfo}
		<div class="panel absolute right-2 top-28 z-20 w-64 rounded-sm p-3 text-xs shadow-lg animate-pop-in">
			<div class="flex items-center justify-between gap-2">
				<h3 class="font-semibold text-heading">Sea hex {selectedHexInfo.q},{selectedHexInfo.r}</h3>
				<IconButton
					icon={IconDismiss}
					label="Close"
					size="xs"
					shape="square"
					variant="ghost"
					onclick={() => (selectedHexKey = null)}
				/>
			</div>
			<div class="mt-1 text-fg-muted">
				{#if selectedHexInfo.owner}
					EEZ of {selectedHexInfo.owner.stateName} · region #{selectedHexInfo.owner.regionId}
				{:else}
					Outside a coastal EEZ
				{/if}
			</div>
			<div class="mt-1">
				{seaHexes.find((h) => h.key === selectedHexKey)?.condition === "icy"
					? "Icy waters"
					: seaHexes.find((h) => h.key === selectedHexKey)?.condition === "stormy"
						? "Stormy seas"
						: "Calm seas"}
			</div>
			{#if selectedHexKeys.size > 1}
				<div class="mt-1 text-primary-fg">{selectedHexKeys.size} hexes selected for a fleet order</div>
			{/if}
			{#if selectedHexInfo.port}
				<div class="mt-2">Port <span class="font-medium">{selectedHexInfo.port.name}</span></div>
			{/if}
			{#if selectedHexInfo.ships.length}
				<div class="mt-1">
					Ships: {selectedHexInfo.ships.map((s) => SHIP_CLASSES[s.shipClass]?.short ?? s.shipClass).join(", ")}
				</div>
			{/if}
			{#if selectedHexInfo.mines.length}
				<div class="mt-1 text-error">
					{selectedHexInfo.mines.length} minefield{selectedHexInfo.mines.length === 1 ? "" : "s"}
				</div>
			{/if}
			<div class="mt-2 border-t border-line/20 pt-2">
				<div class="mb-1 font-semibold text-heading">Sea intel</div>
				{#if selectedHexInfo.intel}
					<div class="text-fg-muted">
						{selectedHexInfo.intel.sensor} · {Object.entries(selectedHexInfo.intel.contacts ?? {})
							.map(([kind, n]) => `${kind} ×${n}`)
							.join(", ") || "no contacts"} ·
						{selectedHexInfo.intel.mines} mines · {selectedHexInfo.intel.confidence}% confidence
					</div>
				{:else}
					<div class="text-fg-muted">No fresh pass over this hex.</div>
				{/if}
				{#if seaImagery}
					<button
						type="button"
						class="mt-1 text-[11px] text-primary-fg hover:underline"
						onclick={() => (showSeaImage = !showSeaImage)}
					>
						{showSeaImage ? "Hide imagery" : "View imagery"} →
					</button>
					{#if showSeaImage}
						<div class="mt-1 overflow-hidden rounded-sm border border-line/20">
							<SensorImage input={seaImagery.input} scene={seaImagery.scene} variant="mini" />
						</div>
					{/if}
				{/if}
				{#if data.sea.sensors?.length}
					<form
						method="POST"
						action="?/launchSeaIntel"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								toastResult(result);
							}}
						class="mt-2 space-y-1.5"
					>
						<input type="hidden" name="q" value={selectedHexInfo.q} />
						<input type="hidden" name="r" value={selectedHexInfo.r} />
						<select
							name="sensor"
							bind:value={seaSensor}
							class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
						>
							{#each data.sea.sensors as sensor (sensor.id)}
								<option value={sensor.id} disabled={!!sensor.cooldownEndsAt}>
									{sensor.label} · ${sensor.cost.toLocaleString()} · {sensor.durationMinutes}m{sensor.cooldownEndsAt
										? " · cooling down"
										: ""}
								</option>
							{/each}
						</select>
						<p class="text-[10px] leading-tight text-fg-muted">
							EO names hulls · IR sees at night · SAR sees through cloud · sonar finds submarines · radar sweeps wide.
						</p>
						<Button type="submit" size="sm" variant="ghost" block>Collect intel</Button>
					</form>
				{/if}
			</div>
			{#if data.canCommand && data.sea.fleets?.length && assignedHexes.length}
				<form
					method="POST"
					action="?/assignFleet"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							toastResult(result);
						}}
					class="mt-2 space-y-1 border-t border-line/20 pt-2"
				>
					<div class="font-semibold text-heading">Hold area with a fleet</div>
					<input type="hidden" name="hexes" value={JSON.stringify(assignedHexes)} />
					<select name="fleetId" required class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
						<option value="">Fleet…</option>
						{#each data.sea.fleets as fleet (fleet.id)}
							<option value={fleet.id}>{fleet.name}</option>
						{/each}
					</select>
					<Button type="submit" size="sm" variant="ghost" block>Assign {assignedHexes.length} hex(es)</Button>
				</form>
			{/if}
			<a
				href="/training?view=navy&hex={selectedHexInfo.q},{selectedHexInfo.r}"
				class="mt-3 inline-block rounded-sm bg-primary/20 px-2 py-1 text-primary-fg hover:bg-primary/30"
			>
				Open in fleet console →
			</a>
		</div>
	{/if}

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
							<span class="font-mono text-[10px] uppercase text-fg-faint w-10">
								{r.kind === "state" ? "STATE" : "RGN"}
							</span>
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
		<Button
			size="xs"
			variant={data.history?.requested || historyOpen ? "primary" : "ghost"}
			icon={IconHistory}
			title="Map history · replay a saved day"
			class="mb-0.5 whitespace-nowrap"
			data-tutorial="map-history"
			onclick={() => (historyOpen = !historyOpen)}
		>
			History
		</Button>
		<div class="mx-1 h-px bg-line/20"></div>
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

	{#if data.history?.requested}
		<div
			class="panel absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-sm px-3 py-1.5 text-xs {data
				.history.nearest
				? 'text-warning'
				: 'text-fg-body'}"
		>
			<IconHistory class="size-3.5 shrink-0" />
			<span>
				{data.history.nearest ? "Nearest saved day" : "Historic map"} ·
				<span class="font-mono">{data.history.selected?.at.slice(0, 10) ?? data.history.requested}</span>
			</span>
			<Button href="/map" size="xs" variant="ghost">Back to live</Button>
		</div>
	{/if}

	{#if historyOpen && data.history}
		<div class="panel absolute right-14 top-14 z-20 w-72 space-y-2 rounded-sm p-3">
			<div class="flex items-center justify-between">
				<h2 class="section-title text-sm">Map history</h2>
				<IconButton
					icon={IconDismiss}
					label="Close history"
					size="xs"
					shape="square"
					onclick={() => (historyOpen = false)}
				/>
			</div>
			<form method="GET" action="/map" class="flex items-end gap-2">
				<label class="min-w-0 flex-1">
					<span class="section-title text-[10px] uppercase tracking-wide">Saved day</span>
					<input
						type="date"
						name="history"
						value={data.history.requested || data.history.selected?.at.slice(0, 10) || ""}
						min={data.history.minDate || undefined}
						max={data.history.maxDate || undefined}
						class="field-control w-full rounded-sm px-2 py-1.5 text-sm"
					/>
				</label>
				<Button type="submit" size="sm">Show</Button>
			</form>
			{#if data.history.nearest && data.history.requested}
				<p class="text-xs text-fg-muted">
					No snapshot for {data.history.requested} — showing {data.history.selected?.at.slice(0, 10)}.
				</p>
			{/if}
			<div class="flex gap-1 overflow-x-auto pb-1">
				{#each data.history.dates as date (date)}
					<a
						href="/map?history={date}"
						class="press-spring shrink-0 rounded-sm border px-2 py-1 text-xs {data.history.selected?.at.startsWith(date)
							? 'border-primary bg-primary/12 text-primary-fg'
							: 'border-line/20 text-fg-muted hover:border-primary/40'}"
					>
						{date}
					</a>
				{/each}
			</div>
			{#if !data.history.dates.length}
				<p class="text-xs text-fg-muted">No snapshots yet — the first is captured at midnight.</p>
			{/if}
			<Button href="/map" size="sm" variant="ghost" block>Latest (live map)</Button>
		</div>
	{/if}

	<!-- Legend -->
	<div class="panel absolute left-16 bottom-9 z-10 hidden rounded-sm px-2.5 py-1.5 text-[11px] text-fg-soft sm:block">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span class="inline-flex items-center gap-1 text-fg">
				{mode === "naval"
					? "NAVAL · sea + coasts"
					: mode === "aerial"
						? "AERIAL · Luftraum sectors"
						: "LAND · regions + forces"}
			</span>
			{#if mode === "aerial"}
				<span class="inline-flex items-center gap-1">
					<span class="h-2.5 w-3.5 rounded-[2px] border border-primary/70 bg-primary/10"></span>Sector
				</span>
			{/if}
			{#if showSea && overlays.sea}
				<span class="inline-flex items-center gap-1">
					<span class="h-2 w-3.5 rounded-[2px] border border-sky-300/80 bg-sky-400/25"></span>EEZ
				</span>
				<span class="inline-flex items-center gap-1">
					<svg viewBox="0 0 14 12" class="h-3 w-3.5" aria-hidden="true">
						<polygon
							points="3.5,0.5 10.5,0.5 13.5,6 10.5,11.5 3.5,11.5 0.5,6"
							fill="none"
							stroke="#7dd3fc"
							stroke-opacity="0.6"
						/>
					</svg>Open sea
				</span>
				<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rounded-[2px] border border-sky-100/40 bg-sky-100/15"></span>Ice
				</span>
				<span class="inline-flex items-center gap-1">
					<span
						class="size-2.5 rounded-[2px] border border-amber-400/50 bg-[repeating-linear-gradient(45deg,rgb(251_191_36/0.5)_0_1px,transparent_1px_3px)]"
					></span>Storm
				</span>
				<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rounded-full border border-sky-400"></span>Port
				</span>
				<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rounded-full border border-error bg-base-100"></span>Mines
				</span>
			{/if}
			{#if mode !== "naval" && overlays.friendly}<span class="inline-flex items-center gap-1">
					<UnitBadge affiliation="friend" size={14} />Own
				</span>{/if}
			{#if mode !== "naval" && overlays.hostile}
				<span class="inline-flex items-center gap-1"><UnitBadge affiliation="hostile" size={14} />Hostile (intel)</span>
				<span class="inline-flex items-center gap-1"><UnitBadge affiliation="unknown" size={14} />Unknown</span>
			{/if}
			{#if mode !== "naval" && overlays.battles}<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rounded-full border border-error"></span>Battle
				</span>{/if}
			{#if mode !== "naval" && overlays.recon}<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rounded-full bg-primary/40"></span>Recon cover
				</span>{/if}
			{#if mode !== "naval" && overlays.strikes && strikeMarkers.length}<span class="inline-flex items-center gap-1">
					<span class="size-2.5 rotate-45 bg-warning"></span>Airstrike
				</span>{/if}
			{#if base === "weather"}<span class="text-fg-muted">· grey cloud/fog, blue rain</span>{/if}
			{#if base === "terrain"}<span class="text-fg-muted">· green forest, grey urban, amber mountains</span>{/if}
			{#if isHeat}<span class="text-fg-muted">
					· {HEAT_LAYERS.find((h) => h.value === base)?.label}: low → high
				</span>{/if}
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
		{#if hoverSector}
			{@const sector = airspaces.find((x) => x.id === hoverSector)}
			{#if sector}
				<span class="hidden sm:inline" style:color={sector.hue}>
					{sector.id} · {sector.regions.length} regions · {sector.air} own air · {sector.ships} ships
				</span>
			{/if}
		{/if}
		{#if hoverHexKey}
			<span class="text-fg-faint">
				HEX {hoverHexKey}
				· {eezByHex.has(hoverHexKey) ? "EEZ" : "open sea"}
				· {SEA_CONDITION_LABEL[seaHexes.find((h) => h.key === hoverHexKey)?.condition ?? "calm"].toLowerCase()}
				{selectedHexKeys.has(hoverHexKey) ? " · in order" : ""}
			</span>
		{/if}
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
	{:else if isDesktop && selSector}
		<aside
			class="panel absolute right-14 top-14 bottom-9 z-10 w-80 overflow-y-auto rounded-sm p-4 animate-pop-in"
			aria-label="Air sector {selSector.id}"
		>
			{@render sectorPanel(selSector)}
		</aside>
	{/if}
</div>

{#if !isDesktop}
	<BottomSheet bind:open={sheetOpen}>
		<div bind:this={panelEl}>
			{#if sel && selectedId != null}{@render regionPanel()}
			{:else if selSector}{@render sectorPanel(selSector)}{/if}
		</div>
	</BottomSheet>
{/if}

{#snippet sectorPanel(s: (typeof airspaces)[number])}
	{@const tone = { contested: "amber", ours: "blue", hostile: "red", neutral: "neutral" } as const}
	{@const label = { contested: "Contested", ours: "Our airspace", hostile: "Hostile airspace", neutral: "Neutral" }}
	<div class="flex items-start gap-3">
		<span
			class="grid size-10 shrink-0 place-items-center rounded-sm border font-mono text-sm font-semibold"
			style:border-color={s.hue}
			style:color={s.hue}
			style:background="color-mix(in oklab, {s.hue} 14%, transparent)"
		>
			{s.id.replace("LR-", "")}
		</span>
		<div class="min-w-0 flex-1">
			<p class="section-title">Air sector</p>
			<h2 class="truncate text-lg font-bold text-fg">{s.id}</h2>
		</div>
		{#if isDesktop}
			<IconButton icon={IconDismiss} label="Close" size="xs" shape="square" onclick={() => (selectedSectorId = null)} />
		{/if}
	</div>
	<div class="mt-2"><Badge tone={tone[s.control]} size="xs">{label[s.control]}</Badge></div>

	<dl class="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line/15 bg-line/15 text-center">
		{#each [{ k: "Regions", v: s.regions.length }, { k: "EEZ cells", v: s.eezHexes.length }, { k: "Open sea", v: s.openHexes.length }, { k: "Own air", v: s.air }, { k: "Ships", v: s.ships }, { k: "Ports", v: s.ports }] as st (st.k)}
			<div class="bg-surface-1 px-2 py-2">
				<dd class="data text-base text-fg">{st.v}</dd>
				<dt class="text-[10px] tracking-wide text-fg-muted uppercase">{st.k}</dt>
			</div>
		{/each}
	</dl>

	{#if s.states.length}
		<h3 class="section-title mt-4 mb-1.5">Who holds the ground</h3>
		<ul class="space-y-1.5">
			{#each s.states.slice(0, 5) as st (st.stateId)}
				<li class="text-xs">
					<div class="flex items-center justify-between gap-2">
						<span class="flex min-w-0 items-center gap-1.5 text-fg-soft">
							<span
								class="size-2 shrink-0 rounded-full"
								style:background={data.stateColorMap[st.stateId] ?? "var(--color-fg-muted)"}
							></span>
							<span class="truncate">{st.name}</span>
						</span>
						<span class="data text-fg-muted">{st.count}</span>
					</div>
					<div class="mt-0.5 h-1 rounded-full bg-surface-6">
						<div
							class="h-full rounded-full"
							style:width="{Math.round((st.count / s.regions.length) * 100)}%"
							style:background={data.stateColorMap[st.stateId] ?? "var(--color-fg-muted)"}
						></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if s.regions.length}
		<h3 class="section-title mt-4 mb-1.5">Regions in sector</h3>
		<ul class="max-h-64 divide-y divide-line/10 overflow-y-auto rounded-sm border border-line/15">
			{#each s.regions
				.map((id) => ({ id, name: getRegionName(id), stateId: data.regionMap[id]?.stateId ?? null }))
				.sort((a, b) => a.name.localeCompare(b.name)) as r (r.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-fg-soft hover:bg-surface-5 hover:text-fg"
						onclick={() => focusRegion(r.id)}
					>
						<span
							class="size-1.5 shrink-0 rounded-full"
							style:background={r.stateId
								? (data.stateColorMap[r.stateId] ?? "var(--color-fg-faint)")
								: "var(--color-fg-faint)"}
						></span>
						<span class="min-w-0 flex-1 truncate">{r.name}</span>
						{#if coastalIds.has(r.id)}<span class="text-[10px] text-sky-300/80">coast</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-xs text-fg-muted">Open sea only: no land in this sector.</p>
	{/if}
{/snippet}

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
							{#if selOwn}<Badge tone="blue" size="xs">
									own side
								</Badge>{:else if sel.stateId && enemyStates.has(sel.stateId)}<Badge tone="red" size="xs">
									hostile
								</Badge>{/if}
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

			{#if coastalImagery}
				<section class="rounded-sm border border-line/20 p-2">
					<button
						type="button"
						class="text-xs font-semibold text-primary-fg hover:underline"
						onclick={() => (showCoastImage = !showCoastImage)}
					>
						{showCoastImage ? "Hide coastal imagery" : "View coastal imagery"} →
					</button>
					{#if showCoastImage}
						<div class="mt-2 overflow-hidden rounded-sm border border-line/20">
							<SensorImage input={coastalImagery.input} scene={coastalImagery.scene} variant="mini" />
						</div>
					{/if}
				</section>
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
							{#if selPicture.observedAt}<span class="font-mono text-fg-muted">
									{ageLabel(selPicture.observedAt, now) === "now"
										? "just now"
										: `${ageLabel(selPicture.observedAt, now)} ago`}
								</span>{/if}
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
				<dl class="grid grid-cols-3 gap-1 text-center font-mono">
					{#each [["FORT", sel.fortifications], ["INFRA", sel.infrastructure], ["PWR", sel.economy], ["EDU", sel.education], ["MED", sel.hospitals], ["RADAR", sel.radar]] as [label, v] (label)}
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
					<p class="mt-1.5 text-xs text-fg-muted">
						{sel.terrain ? sel.terrain[0]!.toUpperCase() + sel.terrain.slice(1).replace("_", " ") : "Unknown"} · {COVER_LABEL[
							selConditions.cover
						]} cover.
					</p>
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
					<p class="text-[10px] text-fg-muted">
						Satellites reach any enemy region. Fresh UAV passes spot for artillery near the front.
					</p>
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

			{#if coastalIds.has(selectedId) && data.canCommand}
				<section class="mt-3 border-t border-line/20 pt-2">
					<div class="mb-1 font-semibold text-heading">Beach operations</div>
					<p class="text-[10px] leading-tight text-fg-muted">
						Landings need sea dominance; paradrops need air dominance. Beach AA and fortifications raise the failure
						risk.
					</p>
					<form
						method="POST"
						action="?/navalLanding"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								toastResult(result);
							}}
						class="mt-2 space-y-1"
					>
						<input type="hidden" name="regionId" value={selectedId} />
						<div class="max-h-16 overflow-y-auto rounded border border-line/20 p-1">
							{#each data.sea.ships.filter((s) => sideStates.has(s.stateId)) as ship (ship.id)}
								<label class="flex items-center gap-1 text-[11px]">
									<input type="checkbox" name="shipIds" value={ship.id} />
									{SHIP_CLASSES[ship.shipClass]?.short ?? ship.shipClass}
								</label>
							{/each}
						</div>
						<Button type="submit" size="xs" variant="ghost" block>Naval landing</Button>
					</form>
					<form
						method="POST"
						action="?/paradrop"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								toastResult(result);
							}}
						class="mt-1.5 space-y-1"
					>
						<input type="hidden" name="regionId" value={selectedId} />
						<div class="max-h-16 overflow-y-auto rounded border border-line/20 p-1">
							{#each data.sea.aircraft.filter((a) => sideStates.has(a.stateId) && a.fuel > 0) as unit (unit.id)}
								<label class="flex items-center gap-1 text-[11px]">
									<input type="checkbox" name="unitIds" value={unit.id} />
									{unit.unitType}
								</label>
							{/each}
						</div>
						<Button type="submit" size="xs" variant="ghost" block>Paradrop</Button>
					</form>
				</section>
			{/if}

			<div class="flex gap-2">
				<Button href="/region/{selectedId}" size="sm" variant="secondary" grow>Region page</Button>
				<Button href="/intel" size="sm" variant="ghost" icon={IconDocument}>Intel</Button>
			</div>
		</div>
	{/if}
{/snippet}

<Tutorial id="map" title="Karten-Kurzanleitung" steps={mapSteps} />

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
	/* Naval mode: inland regions still cover the EEZ shapes beneath them (so
	   a click there never reaches the sea) but do not react themselves. */
	:global(#panzoom-element path.region-inland:hover) {
		filter: none;
		cursor: default;
	}
	:global(#panzoom-element path.region-highlight) {
		animation: region-pulse 900ms ease-in-out 3;
	}
	/* Selection ring: one path over every region, so shared borders do not
	   clip it. `non-scaling-stroke` keeps it 0.75 px wide at any zoom. */
	:global(#panzoom-element .region-outline) {
		stroke-width: 0.75px;
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
