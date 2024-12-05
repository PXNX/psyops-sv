<script lang="ts">
	import panzoom from "panzoom";
	import WorldMap from "$lib/assets/worldmap.svg?raw"; // note suffix ?raw or ?component
	import type { MouseEventHandler } from "svelte/elements";
	import FluentEmojiMagnifyingGlassTiltedLeft from "~icons/fluent-emoji/magnifying-glass-tilted-left";

	let selectedRegion = $state(-1);
	let instance;
	let regionModal: HTMLDialogElement;

	function initPanzoom(node: HTMLElement | SVGElement) {
		instance = panzoom(node, { bounds: true });
	}

	function onClick(e: Event & { target: EventTarget & HTMLInputElement }) {
		console.log(e.target.id);

		if (typeof e.target.id != "string") return false;

		if (!isNaN(Number(e.target.id)) && !isNaN(parseFloat(e.target.id))) {
			selectedRegion = Number(e.target.id);
			regionModal.showModal();
		}
	}
	function onKeyDown(e: any) {
		// analogous logic to onClick, but check if `Enter` (and no modifier) was pressed
	}
</script>

<dialog bind:this={regionModal} class="modal">
	<div class="border rounded-lg modal-box border-fuchsia-900">
		<form method="dialog">
			<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">✕</button>
		</form>
		<h3 class="text-lg font-bold">Selected region {selectedRegion}</h3>
		<p class="py-4">Press ESC key or click on ✕ button to close</p>
	</div>
</dialog>

<header class="sticky top-0 flex items-center justify-end gap-2 p-2 bg-base-100 touch-none">
	<form class="flex-1">
		<div class="relative">
			<FluentEmojiMagnifyingGlassTiltedLeft class="w-5 h-5" />

			<input
				class="flex w-full h-10 px-3 py-2 pl-8 text-sm bg-white border rounded-md border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				placeholder="Search locations..."
				type="search"
			/>
		</div>
	</form>

	<select class="select select-ghost">
		<option disabled selected>Filter</option>
		<option>Political</option>
		<option>Geology</option>
	</select>
</header>

<main class="flex-1 w-full pb-16">
	<div use:initPanzoom onclick={onClick} onkeydown={onKeyDown}>
		{@html WorldMap}
	</div>
</main>

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
