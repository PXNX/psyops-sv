<!-- src/routes/map/+page.svelte -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "#lib/assets/worldmap3.svg?raw";
	import type { Region, State } from "#lib/server/schema.js";
	import * as m from "#lib/paraglide/messages.js";
	import IconSearch from "~icons/fluent/search-20-regular";
	import IconZoomIn from "~icons/fluent/zoom-in-20-regular";
	import IconZoomOut from "~icons/fluent/zoom-out-20-regular";
	import IconMyLocation from "~icons/fluent/my-location-20-regular";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import IconMapPin from "~icons/fluent/location-24-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-24-regular";
	import { goto } from "$app/navigation";
	import type { PageData } from "./$types";
	import { getRegionName } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import { Badge } from "#lib/component/ui/index.js";

	let { data }: { data: PageData } = $props();

	let selectedRegion = $state<Region | null>(null);
	let selectedState = $state<State | null>(null);
	let showSheet = $state(false);
	let instance: PanZoom | null = $state(null);
	let searchQuery = $state("");
	let showSearchResults = $state(false);
	let mapFilter = $state<string>("political");
	let searchInputRef: HTMLInputElement | null = $state(null);
	let highlightedRegionId: number | null = $state(null);
	let highlightTimeout: ReturnType<typeof setTimeout> | null = null;
	let stateColor = $state<string | null>(null);
	let selectedRegionData = $state<(typeof data.regionMap)[number] | null>(null);

	// War-room map palette (see docs/UI_STYLE_GUIDE.md): olive land, dark
	// borders, gold highlights; layers use the guide's signal colours.
	const LAND = "#2b3322";
	const BORDER = "#0f120c";
	const HIGHLIGHT = "#ffd35c";
	const ATTACKER = "#dc2626";
	const DEFENDER = "#2f7fd6";

	/** Mix two hex colours: t=0 → a, t=1 → b. */
	function mix(a: string, b: string, t: number) {
		const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
		const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
		const [r, g, bl] = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
		return `rgb(${r},${g},${bl})`;
	}

	// Heatmap ramps, low → high.
	const RAMPS = {
		resource: ["#3a3f22", "#ffd35c"],
		residents: ["#24361c", "#8ae35f"],
		powerplants: ["#3d3015", "#ffb02e"]
	} as const;

	// Size of the world map's viewBox; the panned scene is laid out at exactly
	// this size (see the markup), so map units and CSS pixels agree at zoom 1.
	const SVG_WIDTH = 1400;
	const SVG_HEIGHT = 600;

	// Pointer tracking so we can tell a tap/click apart from a drag/pan.
	// The sheet should only open on a genuine click, never after panning.
	let pointerDownX = 0;
	let pointerDownY = 0;
	let pointerDownTime = 0;
	// Movement (in px) beyond which the gesture is treated as a drag.
	const DRAG_THRESHOLD = 8;

	// Filter options: map layers then resources
	const filterOptions = [
		{ value: "political", label: "Political" },
		{ value: "blocs", label: "Blocs" },
		{ value: "wars", label: "Active Wars" },
		{ value: "residents", label: "Residents" },
		{ value: "powerplants", label: "Power Plants" },
		{ value: "oil", label: "Oil" },
		{ value: "aluminium", label: "Aluminium" },
		{ value: "rubber", label: "Rubber" },
		{ value: "tungsten", label: "Tungsten" },
		{ value: "steel", label: "Steel" },
		{ value: "chromium", label: "Chromium" },
		{ value: "iron", label: "Iron" },
		{ value: "copper", label: "Copper" },
		{ value: "coal", label: "Coal" },
		{ value: "wood", label: "Wood" }
	];

	// Special layers that are not simple numeric resource heatmaps
	const specialLayers = new Set(["political", "blocs", "wars", "residents", "powerplants"]);

	// Get all region names for search
	const allRegionNames = $derived(() => {
		const regions: { id: number; name: string; stateName?: string }[] = [];
		for (const [id, regionData] of Object.entries(data.regionMap)) {
			const regionId = parseInt(id);

			let stateName: string | undefined;
			if (regionData.stateId) {
				const state = data.states.find((s) => s.id === regionData.stateId);
				if (state) {
					stateName = state.name;
				}
			}

			regions.push({ id: regionId, name: getRegionName(regionId), stateName });
		}
		return regions;
	});

	// Filter regions based on search query
	const searchResults = $derived(() => {
		if (!searchQuery.trim()) return [];

		const query = searchQuery.toLowerCase().trim();
		return allRegionNames()
			.filter((region) => region.name.toLowerCase().includes(query) || region.stateName?.toLowerCase().includes(query))
			.slice(0, 8);
	});

	// The panzoom container is sized by flexbox to fill whatever space its
	// parent <main> has left (which already accounts for the dock nav and the
	// mobile-safe dvh viewport). Reading window.innerWidth/innerHeight instead
	// drifts from that on mobile browsers where the address bar shows/hides
	// (vh vs dvh), which threw the "centre on my region" math off-screen.
	function getViewportSize(node: Element) {
		const rect = (node.parentElement ?? node).getBoundingClientRect();
		// A 0×0 read can happen on the very first layout pass (mobile dvh units
		// can take an extra reflow to settle). Falling through that zero would
		// make minZoomToFit 0, which zooms the whole map down to an invisible
		// point — fall back to the window size instead of trusting it blindly.
		if (rect.width < 1 || rect.height < 1) {
			return { width: window.innerWidth, height: window.innerHeight };
		}
		return { width: rect.width, height: rect.height };
	}

	function initPanzoom(node: HTMLElement | SVGElement) {
		colorRegions(node);

		const svgWidth = SVG_WIDTH;
		const svgHeight = SVG_HEIGHT;

		const { width: viewportWidth, height: viewportHeight } = getViewportSize(node);

		const scaleX = viewportWidth / svgWidth;
		const scaleY = viewportHeight / svgHeight;
		// Math.max: fill whichever dimension is larger so the map never
		// shrinks smaller than the screen on tall/narrow mobile viewports.
		// The overflow on the other axis is handled by constrainToBounds.
		// Floor it well above 0: a 0 (or near-0) zoom would render the whole
		// map as an invisible point, which is unrecoverable since every re-fit
		// (e.g. on resize) keeps computing off the same degenerate viewport.
		const minZoomToFit = Math.max(scaleX, scaleY, 0.1);

		instance = panzoom(node, {
			// panzoom's own built-in bounds clamping measures the pannable
			// element's clientWidth/clientHeight, which for us is just the
			// viewport size (the div is w-full h-full), not the 1400x600 scene.
			// Multiplied by the live zoom scale that math is wrong and silently
			// overrides our moveTo() calls (visible as the map snapping back to
			// zoomed-out and pinned to one edge). We do our own correct bounds
			// clamping in constrainToBounds() below, so disable panzoom's.
			bounds: false,
			maxZoom: 60,
			minZoom: minZoomToFit,
			smoothScroll: false
		});

		// Open centred on the user's current region, if we know it; otherwise
		// just fit the whole map.
		const initialRegionId = data.currentUserRegionId;
		const initialRegionPath = initialRegionId
			? (node.querySelector(`path[id="${initialRegionId}"]`) as SVGPathElement | null)
			: null;

		if (initialRegionPath) {
			const bbox = initialRegionPath.getBBox();
			const regionCenterX = bbox.x + bbox.width / 2;
			const regionCenterY = bbox.y + bbox.height / 2;
			const targetZoom = Math.max(minZoomToFit, 5);

			instance.zoomAbs(0, 0, targetZoom);
			instance.moveTo(viewportWidth / 2 - regionCenterX * targetZoom, viewportHeight / 2 - regionCenterY * targetZoom);
		} else {
			instance.zoomAbs(0, 0, minZoomToFit);
			centerMap(minZoomToFit);
		}

		instance.on("transform", constrainToBounds);
		instance.on("zoom", constrainToBounds);

		function centerMap(scale?: number) {
			if (!instance) return;

			const transform = instance.getTransform();
			const currentScale = scale || transform.scale;
			const { width: viewportWidth, height: viewportHeight } = getViewportSize(node);

			const scaledWidth = svgWidth * currentScale;
			const scaledHeight = svgHeight * currentScale;

			const centerX = (viewportWidth - scaledWidth) / 2;
			const centerY = (viewportHeight - scaledHeight) / 2;

			instance.moveTo(centerX, centerY);
		}

		function constrainToBounds() {
			if (!instance) return;

			const transform = instance.getTransform();
			const { width: viewportWidth, height: viewportHeight } = getViewportSize(node);

			const scaledWidth = svgWidth * transform.scale;
			const scaledHeight = svgHeight * transform.scale;

			let newX = transform.x;
			let newY = transform.y;

			if (scaledWidth > viewportWidth) {
				const maxX = 0;
				const minX = viewportWidth - scaledWidth;
				newX = Math.max(minX, Math.min(maxX, transform.x));
			} else {
				newX = (viewportWidth - scaledWidth) / 2;
			}

			if (scaledHeight > viewportHeight) {
				const maxY = 0;
				const minY = viewportHeight - scaledHeight;
				newY = Math.max(minY, Math.min(maxY, transform.y));
			} else {
				newY = (viewportHeight - scaledHeight) / 2;
			}

			if (newX !== transform.x || newY !== transform.y) {
				instance.moveTo(newX, newY);
			}
		}

		constrainToBounds();

		function handleResize() {
			const { width: newViewportWidth, height: newViewportHeight } = getViewportSize(node);

			const newScaleX = newViewportWidth / svgWidth;
			const newScaleY = newViewportHeight / svgHeight;
			// Same Math.max/floor as the initial computation above
			const newMinZoom = Math.max(newScaleX, newScaleY, 0.1);

			if (instance) {
				const currentTransform = instance.getTransform();

				if (currentTransform.scale <= minZoomToFit * 1.01) {
					instance.zoomAbs(0, 0, newMinZoom);
					centerMap(newMinZoom);
				}
			}

			constrainToBounds();
		}

		window.addEventListener("resize", handleResize);
		// Mobile browsers resize the visual viewport (address bar show/hide)
		// without always firing window "resize", so listen for that too.
		window.visualViewport?.addEventListener("resize", handleResize);

		return {
			destroy() {
				window.removeEventListener("resize", handleResize);
				window.visualViewport?.removeEventListener("resize", handleResize);
			}
		};
	}

	function colorRegions(svgElement: HTMLElement | SVGElement) {
		const paths = svgElement.querySelectorAll("path[id]");

		// For numeric heatmap layers, pre-scan to find the max so we can normalise
		let maxResourceValue = 0;
		if (!specialLayers.has(mapFilter)) {
			paths.forEach((path) => {
				const regionId = parseInt(path.id, 10);
				if (isNaN(regionId)) return;
				const regionData = data.regionMap[regionId];
				if (!regionData) return;
				const v = getResourceValue(regionData, mapFilter);
				if (v > maxResourceValue) maxResourceValue = v;
			});
		}

		// For residents / powerplants we also need a max for normalisation
		let maxResidents = 0;
		let maxPowerplants = 0;
		if (mapFilter === "residents") {
			for (const rd of Object.values(data.regionMap)) {
				const v = rd.residentCount ?? 0;
				if (v > maxResidents) maxResidents = v;
			}
		}
		if (mapFilter === "powerplants") {
			for (const rd of Object.values(data.regionMap)) {
				const v = rd.powerplantCount ?? 0;
				if (v > maxPowerplants) maxPowerplants = v;
			}
		}

		paths.forEach((path) => {
			const el = path as SVGElement;
			const regionId = parseInt(path.id, 10);
			if (isNaN(regionId)) {
				// Named shapes (e.g. "Malaya") aren't game regions: plain land
				// that doesn't react to hover or taps.
				if (!path.closest("defs")) {
					el.style.fill = LAND;
					el.classList.add("region-inert");
				}
				return;
			}

			const regionData = data.regionMap[regionId];
			if (!regionData) {
				// Land the game doesn't track (yet): plain olive.
				el.style.fill = LAND;
				return;
			}

			let color = LAND;

			switch (mapFilter) {
				// ── Political: state colours ──
				case "political":
					color = regionData.stateId ? data.stateColorMap[regionData.stateId] || LAND : LAND;
					break;

				// ── Blocs: bloc colours, states without a bloc are neutral ──
				case "blocs":
					if (regionData.stateId) {
						color = data.blocColorMap?.[regionData.stateId] || LAND;
					}
					break;

				// ── Wars: red = attacker, blue = defender, neutral otherwise ──
				case "wars":
					if (regionData.stateId) {
						if (data.warAttackerStateIds?.has(regionData.stateId)) {
							color = ATTACKER;
						} else if (data.warDefenderStateIds?.has(regionData.stateId)) {
							color = DEFENDER;
						}
					}
					break;

				// ── Residents / power plants: green and amber heatmaps ──
				case "residents": {
					const count = regionData.residentCount ?? 0;
					color = count && maxResidents ? mix(...RAMPS.residents, Math.min(count / maxResidents, 1)) : LAND;
					break;
				}

				case "powerplants": {
					const count = regionData.powerplantCount ?? 0;
					color = count && maxPowerplants ? mix(...RAMPS.powerplants, Math.min(count / maxPowerplants, 1)) : LAND;
					break;
				}

				// ── Resource heatmaps: olive → gold ──
				default:
					color = getResourceColor(regionData, mapFilter, maxResourceValue);
					break;
			}

			el.style.fill = color;

			if (regionId === highlightedRegionId) {
				el.style.stroke = HIGHLIGHT;
				el.style.strokeWidth = "1.2";
				el.classList.add("region-highlight");
			} else {
				el.style.stroke = BORDER;
				el.style.strokeWidth = "0.3";
				el.classList.remove("region-highlight");
			}
		});
	}

	function getResourceValue(regionData: any, resource: string): number {
		if (regionData.resources && regionData.resources[resource] !== undefined) {
			return regionData.resources[resource] || 0;
		}
		if (regionData.regionalResources && regionData.regionalResources[resource]) {
			return regionData.regionalResources[resource].remaining || 0;
		}
		return 0;
	}

	function getResourceColor(regionData: any, resource: string, maxValue: number): string {
		const amount = getResourceValue(regionData, resource);
		if (!amount || !maxValue) return LAND;
		return mix(...RAMPS.resource, Math.min(amount / maxValue, 1));
	}

	$effect(() => {
		if (instance) {
			const svgElement = document.getElementById("panzoom-element");
			if (svgElement) {
				colorRegions(svgElement);
			}
		}
	});

	function onPointerDown(e: PointerEvent) {
		if (!e.isPrimary) return;
		pointerDownX = e.clientX;
		pointerDownY = e.clientY;
		pointerDownTime = Date.now();
	}

	function onPointerUp(e: PointerEvent) {
		// Only handle primary pointer (left click or single touch)
		if (!e.isPrimary) return;

		// Distinguish a tap/click from a drag/pan: if the pointer moved more
		// than DRAG_THRESHOLD px between pointerdown and pointerup, the user was
		// panning the map, so we must NOT open the region sheet.
		const dx = e.clientX - pointerDownX;
		const dy = e.clientY - pointerDownY;
		const movedDistance = Math.hypot(dx, dy);
		if (movedDistance > DRAG_THRESHOLD) return;

		e.stopPropagation();
		const target = e.target as SVGElement;
		let element: SVGElement | null = target;
		let regionId: number | null = null;
		let depth = 0;
		while (element && element !== e.currentTarget && depth < 5) {
			if (element && element.id && element.id !== "panzoom-element") {
				const id = parseInt(element.id, 10);
				if (!isNaN(id) && id > 0) {
					regionId = id;
					break;
				}
			}
			element = element?.parentElement as SVGElement;
			depth++;
		}
		if (regionId !== null) {
			const regionData = data.regionMap[regionId];
			if (!regionData) return;

			selectedRegion = {
				id: regionId,
				rating: regionData.rating || 0,
				development: regionData.development || 0,
				infrastructure: regionData.infrastructure || 0,
				economy: regionData.economy || 0,
				oil: regionData.resources.oil,
				aluminium: regionData.resources.aluminium,
				rubber: regionData.resources.rubber,
				tungsten: regionData.resources.tungsten,
				steel: regionData.resources.steel,
				chromium: regionData.resources.chromium,
				stateId: regionData.stateId,
				createdAt: new Date()
			} as Region;

			selectedRegionData = regionData;

			if (regionData.stateId) {
				const stateInfo = data.states.find((s) => s.id === regionData.stateId);
				if (stateInfo) {
					selectedState = stateInfo as State;
					stateColor = data.stateColorMap[regionData.stateId] || null;
				}
			} else {
				selectedState = null;
				stateColor = null;
			}

			showSheet = true;
		}
	}

	let viewportEl = $state<HTMLElement | null>(null);

	/** Zoom around the centre of the visible map (buttons, keyboard). */
	function zoomBy(factor: number) {
		if (!instance || !viewportEl) return;
		const rect = viewportEl.getBoundingClientRect();
		instance.smoothZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
	}

	function focusMyRegion() {
		if (data.currentUserRegionId) selectSearchResult(data.currentUserRegionId);
	}

	// Legend for the active layer (political/bloc colours speak for themselves).
	const legend = $derived.by(() => {
		if (mapFilter === "wars") return { kind: "sides" as const };
		if (mapFilter === "residents") return { kind: "ramp" as const, label: "Residents", ramp: RAMPS.residents };
		if (mapFilter === "powerplants") return { kind: "ramp" as const, label: "Power plants", ramp: RAMPS.powerplants };
		if (!specialLayers.has(mapFilter)) {
			return { kind: "ramp" as const, label: resourceLabels[mapFilter] ?? mapFilter, ramp: RAMPS.resource };
		}
		return null;
	});

	function selectSearchResult(regionId: number) {
		const svgElement = document.getElementById("panzoom-element");
		if (!svgElement || !instance) return;

		const pathElement = svgElement.querySelector(`path[id="${regionId}"]`) as SVGPathElement;
		if (!pathElement) {
			console.error(`Could not find path element with id: ${regionId}`);
			return;
		}

		const bbox = pathElement.getBBox();
		const regionCenterX = bbox.x + bbox.width / 2;
		const regionCenterY = bbox.y + bbox.height / 2;

		const { width: viewportWidth, height: viewportHeight } = getViewportSize(svgElement.parentElement ?? svgElement);

		const targetZoom = 5;

		const currentTransform = instance.getTransform();
		const currentScreenX = regionCenterX * currentTransform.scale + currentTransform.x;
		const currentScreenY = regionCenterY * currentTransform.scale + currentTransform.y;

		instance.smoothZoom(currentScreenX, currentScreenY, targetZoom / currentTransform.scale);

		setTimeout(() => {
			if (!instance) return;

			const newX = viewportWidth / 2 - regionCenterX * targetZoom;
			const newY = viewportHeight / 2 - regionCenterY * targetZoom;

			instance.smoothMoveTo(newX, newY);
		}, 300);

		highlightedRegionId = regionId;

		if (highlightTimeout) {
			clearTimeout(highlightTimeout);
		}

		highlightTimeout = setTimeout(() => {
			highlightedRegionId = null;
		}, 3000);

		showSearchResults = false;
		searchQuery = "";
	}

	function handleSearchFocus() {
		if (searchQuery.trim()) {
			showSearchResults = true;
		}
	}

	function handleSearchInput() {
		showSearchResults = searchQuery.trim().length > 0;
	}

	function handleSearchSubmit(e: Event) {
		e.preventDefault();
		if (searchResults().length > 0) {
			selectSearchResult(searchResults()[0].id);
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (searchInputRef && !searchInputRef.contains(e.target as Node)) {
			showSearchResults = false;
		}
	}

	const regionName = $derived(() => {
		if (!selectedRegion) return "";
		else return getRegionName(selectedRegion.id);
	});

	// Human-readable labels for the resource layers.
	const resourceLabels: Record<string, string> = {
		oil: "Oil",
		aluminium: "Aluminium",
		rubber: "Rubber",
		tungsten: "Tungsten",
		steel: "Steel",
		chromium: "Chromium",
		iron: "Iron",
		copper: "Copper",
		coal: "Coal",
		wood: "Wood"
	};

	function formatNumber(value: number): string {
		return new Intl.NumberFormat().format(value);
	}

	// The war role of the currently selected region's state, if any.
	const selectedWarRole = $derived(() => {
		const stateId = selectedRegionData?.stateId;
		if (!stateId) return null;
		if (data.warAttackerStateIds?.has(stateId)) return "attacker";
		if (data.warDefenderStateIds?.has(stateId)) return "defender";
		return null;
	});

	// The bloc name of the currently selected region's state, if any.
	const selectedBlocName = $derived(() => {
		const stateId = selectedRegionData?.stateId;
		if (!stateId) return null;
		return data.blocNameMap?.[stateId] ?? null;
	});
</script>

<svelte:head>
	<title>World Map · PsyOps</title>
	<style>
		body {
			overflow: hidden;
			touch-action: pan-x pan-y;
		}
	</style>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<!-- Dark Mode Toolbar -->
<header
	class="panel fixed top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3.5 py-1.5 w-[calc(100%-24px)] max-w-[520px] rounded-sm backdrop-blur-xl touch-action-pan-x touch-action-pan-y"
>
	<form class="flex-1 relative min-w-0" onsubmit={handleSearchSubmit}>
		<div class="flex items-center gap-2">
			<IconSearch class="size-4 flex-shrink-0 text-[#a8a083]" />
			<input
				type="search"
				bind:value={searchQuery}
				bind:this={searchInputRef}
				oninput={handleSearchInput}
				onfocus={handleSearchFocus}
				placeholder="Search regions…"
				class="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-sm font-medium text-[#f5efd8] placeholder:text-[#ab9f7c]/55 px-0 py-1.5 tracking-tight leading-none"
			/>
		</div>

		{#if showSearchResults && searchResults().length > 0}
			<div
				class="panel absolute top-[calc(100%+10px)] -left-3.5 -right-3.5 rounded-sm overflow-hidden max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-200"
			>
				{#each searchResults() as result, i}
					<button
						class="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-b border-[#c8b47a]/10 last:border-b-0 cursor-pointer text-left text-[#f5efd8] transition-colors hover:bg-[#2e3524] hover:text-[#ffcf47] animate-in fade-in slide-in-from-top-1"
						style="animation-delay: {i * 0.03}s"
						onclick={() => selectSearchResult(result.id)}
					>
						<IconMapPin class="w-4 h-4 flex-shrink-0 text-[#a8a083]" />
						<div class="flex flex-col gap-px min-w-0">
							<span class="text-[13.5px] font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
								>{result.name}</span
							>
							{#if result.stateName}
								<span class="text-[11.5px] text-[#a8a083] whitespace-nowrap overflow-hidden text-ellipsis"
									>{result.stateName}</span
								>
							{:else}
								<span class="text-[11.5px] text-[#a8a083] italic whitespace-nowrap overflow-hidden text-ellipsis"
									>Independent</span
								>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</form>

	<div class="flex-shrink-0">
		<select
			bind:value={mapFilter}
			class="field-control appearance-none rounded-sm px-3 pr-7 py-1.5 text-xs font-semibold tracking-wide cursor-pointer bg-[length:10px_6px] bg-no-repeat bg-[right_9px_center]"
			style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='white' opacity='.4'/%3E%3C/svg%3E&quot;)"
		>
			{#each filterOptions as option}
				<option value={option.value} class="bg-[#0f120c] text-[#f5efd8]">{option.label}</option>
			{/each}
		</select>
	</div>
</header>

<!-- The viewport: fills the space above the dock and clips the scene. -->
<div bind:this={viewportEl} class="map-viewport relative flex-1 w-full overflow-hidden touch-none">
	<!-- The scene panzoom moves. It is exactly SVG_WIDTH x SVG_HEIGHT so one
	     unit of the map's viewBox is one CSS pixel at zoom 1; every centring
	     and bounds calculation below relies on that. -->
	<div
		use:initPanzoom
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		role="application"
		aria-label="World map. Drag to pan, pinch or scroll to zoom, tap a region for details."
		class="map-scene absolute top-0 left-0 cursor-grab active:cursor-grabbing"
		style:width="{SVG_WIDTH}px"
		style:height="{SVG_HEIGHT}px"
	>
		{@html WorldMap}
	</div>

	<!-- Zoom / locate controls -->
	<div class="panel absolute right-3 bottom-3 z-10 flex flex-col rounded-sm p-1 gap-1">
		<IconButton icon={IconZoomIn} label="Zoom in" shape="square" size="sm" onclick={() => zoomBy(1.6)} />
		<IconButton icon={IconZoomOut} label="Zoom out" shape="square" size="sm" onclick={() => zoomBy(1 / 1.6)} />
		{#if data.currentUserRegionId}
			<div class="mx-1 h-px bg-[#c8b47a]/20"></div>
			<IconButton icon={IconMyLocation} label="Go to my region" shape="square" size="sm" onclick={focusMyRegion} />
		{/if}
	</div>

	<!-- Layer legend -->
	{#if legend}
		<div class="panel animate-pop-in absolute left-3 bottom-3 z-10 rounded-sm px-3 py-2 text-[11px] text-[#d3caa9]">
			{#if legend.kind === "sides"}
				<div class="flex items-center gap-3">
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-full" style:background={ATTACKER}></span>Attacker</span
					>
					<span class="flex items-center gap-1.5"
						><span class="size-2.5 rounded-full" style:background={DEFENDER}></span>Defender</span
					>
				</div>
			{:else}
				<p class="mb-1 font-semibold uppercase tracking-wide text-[10px] text-[#a8a083]">{legend.label}</p>
				<div
					class="h-1.5 w-28 rounded-full"
					style:background="linear-gradient(90deg, {legend.ramp[0]}, {legend.ramp[1]})"
				></div>
				<div class="mt-0.5 flex justify-between text-[10px] text-[#a8a083]"><span>Low</span><span>High</span></div>
			{/if}
		</div>
	{/if}
</div>

<!-- Region Sheet -->
<BottomSheet bind:open={showSheet}>
	{#if selectedRegion}
		<a
			href="/region/{selectedRegion.id}"
			class="group w-full flex items-center gap-4 hover:bg-[#2e3524] transition-colors rounded-sm p-2 -mx-2"
		>
			<Logo
				src={`/coats/${selectedRegion.id}.svg`}
				alt={getRegionName(selectedRegion.id)}
				class="size-16 object-cover rounded-sm"
			/>

			<div class="flex-1 text-left">
				<h2 class="text-xl font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors">{regionName()}</h2>
				{#if selectedState}
					<p class="text-[#d3caa9]" style="color: {stateColor}">{selectedState.name}</p>
				{:else}
					<p class="text-[#ffd35c] italic">Independent</p>
				{/if}
			</div>

			<IconChevronRight class="text-2xl flex-shrink-0" style="color: {stateColor || 'currentColor'}" />
		</a>

		<!-- Filter-dependent info -->
		{#if selectedRegionData}
			<div class="mt-4 space-y-4">
				{#if mapFilter === "political"}
					<div class="grid grid-cols-2 gap-2">
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Rating</p>
							<p class="text-lg font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.rating)}</p>
						</div>
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Economy</p>
							<p class="text-lg font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.economy)}</p>
						</div>
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Infrastructure</p>
							<p class="text-lg font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.infrastructure)}</p>
						</div>
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Education</p>
							<p class="text-lg font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.education)}</p>
						</div>
					</div>
				{:else if mapFilter === "blocs"}
					<div class="panel-muted rounded-sm p-4">
						<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Bloc</p>
						{#if selectedBlocName()}
							<div class="mt-1 flex items-center gap-2">
								<span class="inline-block size-3 rounded-full" style="background-color: {stateColor || 'currentColor'}"
								></span>
								<p class="text-lg font-bold text-[#f5efd8]">{selectedBlocName()}</p>
							</div>
						{:else}
							<p class="text-lg font-bold italic text-[#a8a083]">Non-aligned</p>
						{/if}
					</div>
				{:else if mapFilter === "wars"}
					<div class="panel-muted rounded-sm p-4">
						<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">War status</p>
						{#if selectedWarRole() === "attacker"}
							<Badge tone="red" class="mt-1">Attacking in an active war</Badge>
						{:else if selectedWarRole() === "defender"}
							<Badge tone="blue" class="mt-1">Defending in an active war</Badge>
						{:else}
							<p class="text-lg font-bold text-[#a8a083]">At peace</p>
						{/if}
					</div>
				{:else if mapFilter === "residents"}
					<div class="panel-muted rounded-sm p-4">
						<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Residents</p>
						<p class="text-2xl font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.residentCount)}</p>
					</div>
				{:else if mapFilter === "powerplants"}
					<div class="panel-muted rounded-sm p-4">
						<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Power plants (state-wide)</p>
						<p class="text-2xl font-bold text-[#f5efd8]">{formatNumber(selectedRegionData.powerplantCount)}</p>
					</div>
				{:else if resourceLabels[mapFilter]}
					<!-- Resource layer: highlight the active resource -->
					<div class="panel-muted rounded-sm p-4">
						<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">{resourceLabels[mapFilter]}</p>
						<p class="text-2xl font-bold text-[#f5efd8]">
							{formatNumber((selectedRegionData.resources as Record<string, number>)[mapFilter] ?? 0)}
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Resources: always shown regardless of the active map layer -->
		{#if selectedRegionData}
			<div class="mt-4">
				<h3 class="section-title mb-2 text-xs">Resources</h3>
				<div class="grid grid-cols-3 gap-2">
					{#each Object.entries(selectedRegionData.resources) as [key, value]}
						<div
							class="rounded-sm border p-2 text-center {key === mapFilter
								? 'bg-[#f2b01e]/12 border-[#f2b01e]/35'
								: 'bg-[#1a1f15]/70 border-[#c8b47a]/10'}"
						>
							<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">
								{resourceLabels[key] ?? key}
							</p>
							<p class="text-sm font-bold text-[#f5efd8]">{formatNumber(value)}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</BottomSheet>

<style>
	/* ─── SVG Styles ─── */
	:global(#panzoom-element) {
		display: block;
		width: 100%;
		height: 100%;
	}

	/* Sea: a deep, slightly cool green-black under the olive land. */
	.map-viewport {
		background: radial-gradient(ellipse at 50% 40%, rgba(70, 90, 70, 0.18), transparent 70%), #0b100d;
	}

	:global(#panzoom-element path) {
		stroke: #0f120c;
		stroke-width: 0.3;
		transition:
			filter 0.15s ease,
			opacity 0.15s ease;
	}

	:global(#panzoom-element path.region-inert) {
		pointer-events: none;
	}

	:global(#panzoom-element path:hover) {
		filter: brightness(1.25) saturate(1.1);
		cursor: pointer;
	}

	/* The region you searched for / jumped to pulses gold for a moment. */
	:global(#panzoom-element path.region-highlight) {
		animation: region-pulse 900ms ease-in-out 3;
	}

	@keyframes region-pulse {
		50% {
			filter: brightness(1.6) drop-shadow(0 0 2px #ffd35c);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(#panzoom-element path.region-highlight) {
			animation: none;
		}
	}
</style>
