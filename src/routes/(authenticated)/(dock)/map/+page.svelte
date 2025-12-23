<!-- src/routes/(unauthenticated)/map/+page.svelte -->
<script lang="ts">
	import panzoom, { type PanZoom } from "panzoom";
	import WorldMap from "$lib/assets/worldmap.svg?raw"; // note suffix ?raw or ?component
	import type { MouseEventHandler } from "svelte/elements";
	import * as m from "$lib/paraglide/messages";

	import FluentEmojiMagnifyingGlassTiltedLeft from "~icons/fluent-emoji/magnifying-glass-tilted-left";

	let selectedRegion = $state(-1);
	let instance: null | PanZoom = $state(null);
	let regionModal: HTMLDialogElement;

	function initPanzoom(node: HTMLElement | SVGElement) {
		instance = panzoom(node, { bounds: true, maxZoom: 15, minZoom: 1, boundsPadding: 0.1 });

		instance.on("transform", function (e) {
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

	function onClick(e: Event & { target: EventTarget & HTMLInputElement }) {
		console.log(e.target.id);

		if (typeof e.target.id != "string") return;

		if (!isNaN(Number(e.target.id)) && !isNaN(parseFloat(e.target.id))) {
			selectedRegion = Number(e.target.id);
			regionModal.showModal();
		}
	}
	function onKeyDown(e: any) {
		// analogous logic to onClick, but check if `Enter` (and no modifier) was pressed
	}

	const regionName = $derived(() => {
		const key = `region_${selectedRegion}`;
		return m[key]?.() || "";
	});

	// Get the region logo path
	const regionLogoPath = $derived(`/coats/${selectedRegion}.svg`);
</script>

<header class="sticky top-0 flex items-center justify-end gap-2 p-2 bg-base-100 touch-none">
	<form class="flex-1">
		<label class="input">
			<input type="search" required placeholder="Search" />
			<button class="btn btn-ghost btn-sm btn-circle"><FluentEmojiMagnifyingGlassTiltedLeft /></button>
		</label>
	</form>

	<select class="select select-ghost">
		<option disabled selected>Filter</option>
		<option>Political</option>
		<option>Geology</option>
	</select>
</header>

<main class="flex-1 w-full pb-16">
	<div use:initPanzoom onclick={onClick} onkeydown={onKeyDown} role="button" tabindex="0">
		{@html WorldMap}
	</div>
</main>

<dialog bind:this={regionModal} class="modal">
	<div class="bg-gradient-to-br from-fuchsia-800 to-purple-800 p-px rounded-lg w-3/4 m-2 mt-auto">
		<div
			class="relative rounded-lg bg-gradient-to-r from-slate-800 via-slate-800 to-purple-800 overflow-hidden w-full pr-4"
		>
			<div class="flex items-center">
				<div class=" w-24 h-24 flex justify-center relative overflow-hidden rounded-md">
					<img src={regionLogoPath} class="w-full h-full object-cover" />

					<div class="absolute inset-0 mt-auto bg-gradient-to-r to-slate-800 from-transparent w-24" />
				</div>

				<div class="-m-4 flex flex-col z-10">
					<h3 class="text-lg font-bold">Region {selectedRegion} - {regionName()}</h3>
					<a class="text-md text-secondary" href="/state/4">State of Kaan</a>
				</div>

				<a class="ml-auto btn btn-primary my-4" href="/region/{selectedRegion}">Details</a>
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<style>
	/*svg {
		width: 100%;
		height: calc(100dvh-56px);
	}

	.province {
		stroke: #1d232a;
		stroke-width: 0.5;
		opacity: 1;
	}

	path:hover {
		fill: #fff;
	}

	.city {
		fill: #a59890;
	}

	.wasteland {
		fill: #91847c;
	}

	.uncolonized {
		fill: #a59890;
	}*/
</style>
