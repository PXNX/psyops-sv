<!-- src/routes/map/+page.svelte -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "$lib/assets/worldmap.svg?raw";
	import type { Region, State } from "$lib/server/schema";
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
	let mapFilter = $state<string>("political");

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

	function initPanzoom(node: HTMLElement | SVGElement) {
		// Color the regions efficiently using CSS
		colorRegions(node);

		instance = panzoom(node, {
			bounds: true,
			maxZoom: 15,
			minZoom: 1,
			boundsPadding: 0.1
		});

		instance.on("transform", function () {
			const bounds = getViewportBounds();
			const { x, y } = instance!.getTransform();

			const constrainedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
			const constrainedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));

			if (x !== constrainedX || y !== constrainedY) {
				instance!.moveTo(constrainedX, constrainedY);
			}
		});

		function getViewportBounds() {
			const elementRect = node.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			return {
				minX: Math.min(0, viewportWidth - elementRect.width),
				maxX: 0,
				minY: Math.min(0, viewportHeight - elementRect.height),
				maxY: 0
			};
		}
	}

	function colorRegions(svgElement: HTMLElement | SVGElement) {
		// Get all path elements with numeric IDs
		const paths = svgElement.querySelectorAll("path[id]");

		// Calculate max resource value for normalization when in resource mode
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
			if (!regionData) {
				// Region not in database - keep as wasteland
				return;
			}

			let color = "#ffffff"; // Default white

			if (mapFilter === "political") {
				// Political mode - use state colors
				if (regionData.stateId) {
					color = data.stateColorMap[regionData.stateId] || "#ffffff";
				}
			} else {
				// Resource mode - color based on resource availability
				color = getResourceColor(regionData, mapFilter, maxResourceValue);
			}

			(path as SVGElement).style.fill = color;
		});
	}

	function getResourceValue(regionData: any, resource: string): number {
		// Check in basic resources
		if (regionData.resources && regionData.resources[resource] !== undefined) {
			return regionData.resources[resource] || 0;
		}
		// Check in regional resources (iron, copper, coal, wood)
		if (regionData.regionalResources && regionData.regionalResources[resource]) {
			return regionData.regionalResources[resource].remaining || 0;
		}
		return 0;
	}

	function getResourceColor(regionData: any, resource: string, maxValue: number): string {
		const resourceAmount = getResourceValue(regionData, resource);

		// If no resource, return grey
		if (resourceAmount === 0) {
			return "#6b7280"; // Gray-500
		}

		// If maxValue is 0 (no resources anywhere), return grey
		if (maxValue === 0) {
			return "#6b7280";
		}

		// Normalize to 0-1 based on actual max value
		const normalized = Math.min(resourceAmount / maxValue, 1);

		// Interpolate from light green to strong green
		// Light green: rgb(134, 239, 172) - green-300
		// Strong green: rgb(22, 163, 74) - green-600
		const red = Math.round(134 - (134 - 22) * normalized);
		const green = Math.round(239 - (239 - 163) * normalized);
		const blue = Math.round(172 - (172 - 74) * normalized);

		return `rgb(${red}, ${green}, ${blue})`;
	}

	// Re-color when filter changes
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

			// Create mock region object
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

			// Find the state if region belongs to one
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

	const regionName = $derived(() => {
		if (!selectedRegion) return "";
		const key = `region_${selectedRegion.id}` as keyof typeof m;
		return m[key]?.() ?? `Region ${selectedRegion.id}`;
	});
</script>

<header class="sticky top-0 flex items-center justify-end gap-2 p-2 bg-base-100 touch-none z-10">
	<form class="flex-1">
		<label class="input">
			<input type="search" bind:value={searchQuery} placeholder="Search regions..." />
			<button type="submit" class="btn btn-ghost btn-sm btn-circle">
				<FluentEmojiMagnifyingGlassTiltedLeft />
			</button>
		</label>
	</form>

	<select class="select select-ghost" bind:value={mapFilter}>
		{#each filterOptions as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</header>

<main class="flex-1 w-full pb-16 overflow-hidden">
	<div use:initPanzoom onclick={onClick} role="button" tabindex="0" class="map-container">
		{@html WorldMap}
	</div>
</main>

<!-- Region Sheet Modal -->
{#if showSheet && selectedRegion}
	<div class="fixed inset-0 z-[2000] bg-black/50" onclick={closeSheet}></div>
	<div class="fixed right-0 bottom-0 left-0 z-[2001] rounded-t-3xl shadow-2xl bg-base-100 animate-slide-up">
		<div class="container mx-auto max-w-2xl">
			<!-- Drag Handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="h-1 w-12 rounded-full bg-base-300"></div>
			</div>

			<button class="w-full p-6 flex items-center gap-4 hover:bg-base-200 transition-colors" onclick={viewRegionDetail}>
				<!-- Region Logo -->
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

				<!-- Region Info -->
				<div class="flex-1 text-left">
					<h2 class="text-xl font-bold">{regionName()}</h2>
					{#if selectedState}
						<p class="text-base-content/70" style="color: {stateColor}">{selectedState.name}</p>
					{:else}
						<p class="text-base-content/70 italic">Independent</p>
					{/if}
				</div>

				<!-- Chevron Right -->
				<IconChevronRight class="text-2xl flex-shrink-0" style="color: {stateColor || 'currentColor'}" />
			</button>
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
</style>
