<!-- src/routes/map/+page.svelte -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "$lib/assets/worldmap.svg?raw";
	import type { Region, State, UserTravel } from "$lib/server/schema";
	import * as m from "$lib/paraglide/messages";
	import FluentEmojiMagnifyingGlassTiltedLeft from "~icons/fluent-emoji/magnifying-glass-tilted-left";
	import IconMapPin from "~icons/fluent/location-24-regular";
	import IconChevronRight from "~icons/fluent/chevron-right-24-regular";
	import { goto } from "$app/navigation";
	import type { PageData } from "./$types";

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

	// Filter options combining political and all resources
	const filterOptions = [
		{ value: "political", label: "Political" },
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

	// Get all region names for search
	const allRegionNames = $derived(() => {
		const regions: { id: number; name: string; stateName?: string }[] = [];
		for (const [id, regionData] of Object.entries(data.regionMap)) {
			const regionId = parseInt(id, 10);
			const key = `region_${regionId}` as keyof typeof m;
			const name = m[key]?.() ?? `Region ${regionId}`;

			let stateName: string | undefined;
			if (regionData.stateId) {
				const state = data.states.find((s) => s.id === regionData.stateId);
				if (state) {
					stateName = state.name;
				}
			}

			regions.push({ id: regionId, name, stateName });
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

		const svgWidth = 5632;
		const svgHeight = 2048;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight - 56;

		const scaleX = viewportWidth / svgWidth;
		const scaleY = viewportHeight / svgHeight;
		const minZoomToFit = Math.min(scaleX, scaleY);

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
			const newMinZoom = Math.min(newScaleX, newScaleY);

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

		let maxResourceValue = 0;
		if (mapFilter !== "political") {
			paths.forEach((path) => {
				const regionId = parseInt(path.id, 10);
				if (isNaN(regionId)) return;

				const regionData = data.regionMap[regionId];
				if (!regionData) return;

				const resourceValue = getResourceValue(regionData, mapFilter);
				if (resourceValue > maxResourceValue) {
					maxResourceValue = resourceValue;
				}
			});
		}

		paths.forEach((path) => {
			const regionId = parseInt(path.id, 10);
			if (isNaN(regionId)) return;

			const regionData = data.regionMap[regionId];
			if (!regionData) return;

			let color = "#ffffff";

			if (mapFilter === "political") {
				if (regionData.stateId) {
					color = data.stateColorMap[regionData.stateId] || "#ffffff";
				}
			} else {
				color = getResourceColor(regionData, mapFilter, maxResourceValue);
			}

			(path as SVGElement).style.fill = color;

			if (regionId === highlightedRegionId) {
				(path as SVGElement).style.stroke = "#fbbf24";
				(path as SVGElement).style.strokeWidth = "3";
			} else {
				(path as SVGElement).style.stroke = "#1d232a";
				(path as SVGElement).style.strokeWidth = "0.5";
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

	let stateColor = $state<string | null>(null);

	function onClick(e: MouseEvent) {
		e.stopPropagation();

		const target = e.target as SVGElement;
		let element: SVGElement | null = target;
		let regionId: number | null = null;

		let depth = 0;
		while (element && element !== e.currentTarget && depth < 5) {
			if (element.id && element.id !== "panzoom-element") {
				const id = parseInt(element.id, 10);
				if (!isNaN(id) && id > 0) {
					regionId = id;
					break;
				}
			}
			element = element.parentElement as SVGElement;
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

	function viewRegionDetail() {
		if (selectedRegion) {
			goto(`/region/${selectedRegion.id}`);
			closeSheet();
		}
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
		const key = `region_${selectedRegion.id}` as keyof typeof m;
		return m[key]?.() ?? `Region ${selectedRegion.id}`;
	});
</script>

<svelte:window onclick={handleClickOutside} />

<header class="sticky top-0 flex items-center justify-end gap-2 p-2 bg-base-100 z-10 touch-action-header">
	<form class="flex-1 relative" onsubmit={handleSearchSubmit}>
		<label class="input">
			<input
				type="search"
				bind:value={searchQuery}
				bind:this={searchInputRef}
				oninput={handleSearchInput}
				onfocus={handleSearchFocus}
				placeholder="Search regions..."
			/>
			<button type="submit" class="btn btn-ghost btn-sm btn-circle">
				<FluentEmojiMagnifyingGlassTiltedLeft />
			</button>
		</label>

		{#if showSearchResults && searchResults().length > 0}
			<div
				class="absolute top-full left-0 right-0 mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-96 overflow-y-auto z-50"
			>
				{#each searchResults() as result}
					<button
						class="w-full px-4 py-3 text-left hover:bg-base-200 transition-colors flex items-center gap-3 border-b border-base-300 last:border-b-0"
						onclick={() => selectSearchResult(result.id)}
					>
						<IconMapPin class="text-lg flex-shrink-0" />
						<div class="flex-1">
							<div class="font-medium">{result.name}</div>
							{#if result.stateName}
								<div class="text-sm text-base-content/70">{result.stateName}</div>
							{:else}
								<div class="text-sm text-base-content/70 italic">Independent</div>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</form>

	<select class="select select-ghost" bind:value={mapFilter}>
		{#each filterOptions as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</header>

<main class="flex-1 w-full pb-16 overflow-hidden relative">
	<div use:initPanzoom onclick={onClick} role="button" tabindex="0" class="map-container">
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
				<button
					class="w-full flex items-center gap-4 hover:bg-base-200 transition-colors rounded-lg p-4"
					onclick={viewRegionDetail}
				>
					<div class="w-16 h-16 flex-shrink-0 bg-base-300 rounded-lg overflow-hidden flex items-center justify-center">
						<img
							src={`/coats/${selectedRegion.id}.svg`}
							alt="Region {selectedRegion.id}"
							class="w-full h-full object-cover"
							onerror={(e) => {
								e.currentTarget.style.display = "none";
								e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl">📍</span>';
							}}
						/>
					</div>

					<div class="flex-1 text-left">
						<h2 class="text-xl font-bold">{regionName()}</h2>
						{#if selectedState}
							<p class="text-base-content/70" style="color: {stateColor}">{selectedState.name}</p>
						{:else}
							<p class="text-base-content/70 italic">Independent</p>
						{/if}
					</div>

					<IconChevronRight class="text-2xl flex-shrink-0" style="color: {stateColor || 'currentColor'}" />
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
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

	.map-container {
		width: 100%;
		height: calc(100dvh - 56px);
		cursor: grab;
		overflow: hidden;
		touch-action: none;
	}

	.map-container:active {
		cursor: grabbing;
	}

	:global(#panzoom-element) {
		width: 100%;
		height: 100%;
	}

	:global(#panzoom-element path) {
		stroke: #1d232a;
		stroke-width: 0.5;
		transition: opacity 0.2s;
	}

	:global(#panzoom-element path:hover) {
		opacity: 0.8;
		cursor: pointer;
	}

	.travel-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	:global(body) {
		overflow: hidden;
		touch-action: pan-x pan-y;
	}

	main {
		overflow: hidden;
	}

	.touch-action-header {
		touch-action: pan-x pan-y;
	}

	header * {
		touch-action: pan-x pan-y;
	}
</style>
