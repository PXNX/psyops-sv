<!-- src/routes/map/+page.svelte -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "$lib/assets/worldmap3.svg?raw";
	import type { Region, State, UserTravel } from "$lib/server/schema";
	import * as m from "$lib/paraglide/messages";
	import FluentEmojiMagnifyingGlassTiltedLeft from "~icons/fluent-emoji/magnifying-glass-tilted-left";
	import IconMapPin from "~icons/fluent/location-24-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-24-regular";
	import { goto } from "$app/navigation";
	import type { PageData } from "./$types";
	import { getRegionName } from "$lib/utils/formatting";
	import Logo from "$lib/component/Logo.svelte";

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

	function initPanzoom(node: HTMLElement | SVGElement) {
		colorRegions(node);

		const svgWidth = 1400;
		const svgHeight = 600;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight - 56;

		const scaleX = viewportWidth / svgWidth;
		const scaleY = viewportHeight / svgHeight;
		// Math.max: fill whichever dimension is larger so the map never
		// shrinks smaller than the screen on tall/narrow mobile viewports.
		// The overflow on the other axis is handled by constrainToBounds.
		const minZoomToFit = Math.max(scaleX, scaleY);

		instance = panzoom(node, {
			bounds: true,
			maxZoom: 15,
			minZoom: minZoomToFit,
			boundsPadding: 0.1,
			smoothScroll: false
		});

		instance.zoomAbs(0, 0, minZoomToFit);
		centerMap(minZoomToFit);

		instance.on("transform", constrainToBounds);
		instance.on("zoom", constrainToBounds);

		function centerMap(scale?: number) {
			if (!instance) return;

			const transform = instance.getTransform();
			const currentScale = scale || transform.scale;
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight - 56;

			const scaledWidth = svgWidth * currentScale;
			const scaledHeight = svgHeight * currentScale;

			const centerX = (viewportWidth - scaledWidth) / 2;
			const centerY = (viewportHeight - scaledHeight) / 2;

			instance.moveTo(centerX, centerY);
		}

		function constrainToBounds() {
			if (!instance) return;

			const transform = instance.getTransform();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight - 56;

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
			const newViewportWidth = window.innerWidth;
			const newViewportHeight = window.innerHeight - 56;

			const newScaleX = newViewportWidth / svgWidth;
			const newScaleY = newViewportHeight / svgHeight;
			// Same Math.max here so resize recalculates consistently
			const newMinZoom = Math.max(newScaleX, newScaleY);

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

		return {
			destroy() {
				window.removeEventListener("resize", handleResize);
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
			const regionId = parseInt(path.id, 10);
			if (isNaN(regionId)) return;

			const regionData = data.regionMap[regionId];
			if (!regionData) return;

			let color = "#1e293b"; // default dark neutral for empty regions

			switch (mapFilter) {
				// ── Political: state colours ──
				case "political":
					color = regionData.stateId ? data.stateColorMap[regionData.stateId] || "#1e293b" : "#1e293b";
					break;

				// ── Blocs: bloc colours, states without a bloc are neutral ──
				case "blocs":
					if (regionData.stateId) {
						color = data.blocColorMap?.[regionData.stateId] || "#1e293b";
					}
					break;

				// ── Wars: red = attacker, blue = defender, neutral otherwise ──
				case "wars":
					if (regionData.stateId) {
						if (data.warAttackerStateIds?.has(regionData.stateId)) {
							color = "#dc2626"; // red-600
						} else if (data.warDefenderStateIds?.has(regionData.stateId)) {
							color = "#2563eb"; // blue-600
						}
					}
					break;

				// ── Residents: green heatmap ──
				case "residents": {
					const count = regionData.residentCount ?? 0;
					if (count === 0 || maxResidents === 0) {
						color = "#1e293b";
					} else {
						const n = Math.min(count / maxResidents, 1);
						// dark teal → bright green
						const r = Math.round(30 + (74 - 30) * n);
						const g = Math.round(58 + (222 - 58) * n);
						const b = Math.round(92 + (68 - 92) * n);
						color = `rgb(${r},${g},${b})`;
					}
					break;
				}

				// ── Power plants: amber heatmap ──
				case "powerplants": {
					const count = regionData.powerplantCount ?? 0;
					if (count === 0 || maxPowerplants === 0) {
						color = "#1e293b";
					} else {
						const n = Math.min(count / maxPowerplants, 1);
						// dark amber → bright yellow
						const r = Math.round(78 + (250 - 78) * n);
						const g = Math.round(55 + (204 - 55) * n);
						const b = Math.round(15 + (20 - 15) * n);
						color = `rgb(${r},${g},${b})`;
					}
					break;
				}

				// ── Resource heatmaps (existing green gradient) ──
				default:
					color = getResourceColor(regionData, mapFilter, maxResourceValue);
					break;
			}

			(path as SVGElement).style.fill = color;

			if (regionId === highlightedRegionId) {
				(path as SVGElement).style.stroke = "#fbbf24";
				(path as SVGElement).style.strokeWidth = "3";
			} else {
				(path as SVGElement).style.stroke = "#1d232a";
				(path as SVGElement).style.strokeWidth = "0.3";
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
		const resourceAmount = getResourceValue(regionData, resource);

		if (resourceAmount === 0) {
			return "#6b7280";
		}

		if (maxValue === 0) {
			return "#6b7280";
		}

		const normalized = Math.min(resourceAmount / maxValue, 1);

		const red = Math.round(134 - (134 - 22) * normalized);
		const green = Math.round(239 - (239 - 163) * normalized);
		const blue = Math.round(172 - (172 - 74) * normalized);

		return `rgb(${red}, ${green}, ${blue})`;
	}

	$effect(() => {
		if (instance) {
			const svgElement = document.getElementById("panzoom-element");
			if (svgElement) {
				colorRegions(svgElement);
			}
		}
	});

	function onPointerUp(e: PointerEvent) {
		// Only handle primary pointer (left click or single touch)
		if (!e.isPrimary) return;
		
		// If it was a drag, don't trigger click
		// We can check if the pointer moved significantly, but panzoom handles most of this.
		// For mobile, we want to ensure a tap triggers the sheet.
		
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
		if (regionId !== null) {) {
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

	function closeSheet() {
		showSheet = false;
	}

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

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight - 56;

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
</script>

<svelte:head>
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
	class="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3.5 py-1.5 w-[calc(100%-24px)] max-w-[520px] bg-gray-900/70 backdrop-blur-xl backdrop-saturate-[1.8] border border-white/10 rounded-[14px] shadow-lg shadow-black/20 touch-action-pan-x touch-action-pan-y"
>
	<form class="flex-1 relative min-w-0" onsubmit={handleSearchSubmit}>
		<div class="flex items-center gap-2">
			<FluentEmojiMagnifyingGlassTiltedLeft class="w-4 h-4 flex-shrink-0 opacity-40 text-white" />
			<input
				type="search"
				bind:value={searchQuery}
				bind:this={searchInputRef}
				oninput={handleSearchInput}
				onfocus={handleSearchFocus}
				placeholder="Search regions…"
				class="flex-1 w-full min-w-0 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-white/40 px-0 py-1.5 tracking-tight leading-none"
			/>
		</div>

		{#if showSearchResults && searchResults().length > 0}
			<div
				class="absolute top-[calc(100%+10px)] -left-3.5 -right-3.5 bg-gray-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/10 rounded-xl shadow-2xl shadow-black/20 overflow-hidden max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1 duration-200"
			>
				{#each searchResults() as result, i}
					<button
						class="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-b border-white/10 last:border-b-0 cursor-pointer text-left text-white transition-colors hover:bg-white/5 animate-in fade-in slide-in-from-top-1"
						style="animation-delay: {i * 0.03}s"
						onclick={() => selectSearchResult(result.id)}
					>
						<IconMapPin class="w-4 h-4 flex-shrink-0 opacity-35" />
						<div class="flex flex-col gap-px min-w-0">
							<span class="text-[13.5px] font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
								>{result.name}</span
							>
							{#if result.stateName}
								<span class="text-[11.5px] opacity-45 whitespace-nowrap overflow-hidden text-ellipsis"
									>{result.stateName}</span
								>
							{:else}
								<span class="text-[11.5px] opacity-45 italic whitespace-nowrap overflow-hidden text-ellipsis"
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
			class="appearance-none bg-white/10 border border-white/15 rounded-lg px-3 pr-7 py-1.5 text-xs font-semibold tracking-wide text-white cursor-pointer outline-none transition-colors hover:bg-white/15 bg-[length:10px_6px] bg-no-repeat bg-[right_9px_center]"
			style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='white' opacity='.4'/%3E%3C/svg%3E&quot;)"
		>
			{#each filterOptions as option}
				<option value={option.value} class="bg-gray-900 text-white">{option.label}</option>
			{/each}
		</select>
	</div>
</header>

	<main class="flex-1 w-full overflow-hidden">
		<div
			use:initPanzoom
			onpointerup={onPointerUp}
			role="button"
			tabindex="0"
			class="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing touch-action-none"
		>
			{@html WorldMap}
		</div>
	</main>

<!-- Region Sheet Modal -->
{#if showSheet && selectedRegion}
	<div class="fixed inset-0 z-[2000] bg-black/50" onclick={closeSheet}></div>
	<div class="fixed right-0 bottom-0 left-0 z-[2001] rounded-t-3xl shadow-2xl bg-base-100 animate-slide-up">
		<div class="container mx-auto max-w-2xl">
			<div class="flex justify-center pt-3 pb-2">
				<div class="h-1 w-12 rounded-full bg-base-300"></div>
			</div>

			<div class="p-6 space-y-4">
				<a
					href="/region/{selectedRegion.id}"
					class="w-full flex items-center gap-4 hover:bg-base-200 transition-colors rounded-lg p-4"
				>
					<Logo
						src={`/coats/${selectedRegion.id}.svg`}
						alt={getRegionName(selectedRegion.id)}
						class="size-16 object-cover"
					/>

					<div class="flex-1 text-left">
						<h2 class="text-xl font-bold">{regionName()}</h2>
						{#if selectedState}
							<p class="text-base-content/70" style="color: {stateColor}">{selectedState.name}</p>
						{:else}
							<p class="text-base-content/70 italic">Independent</p>
						{/if}
					</div>

					<IconChevronRight class="text-2xl flex-shrink-0" style="color: {stateColor || 'currentColor'}" />
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ─── SVG Styles ─── */
	:global(#panzoom-element) {
		width: 100%;
		height: 100%;
	}

	:global(#panzoom-element path) {
		stroke: #1d232a;
		stroke-width: 0.3;
		transition:
			filter 0.15s ease,
			opacity 0.15s ease;
	}

	:global(#panzoom-element path:hover) {
		filter: brightness(1.12) saturate(1.15);
		cursor: pointer;
	}

	/* ─── Sheet animation ─── */
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
