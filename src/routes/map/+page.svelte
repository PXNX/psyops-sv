<script>
	import panzoom from "panzoom";

	let instance;

	function initPanzoom(node) {
		instance = panzoom(node, { bounds: true });
	}

	import WorldMap from "$lib/assets/worldmap.svg?component"; // note suffix ?raw

	function onClick(e) {
		console.log(e.target.id);

		e.target;
		if (e.target.id == "...") {
			// ...
		}
	}
	function onKeyDown(e) {
		// analogous logic to onClick, but check if `Enter` (and no modifier) was pressed
	}
</script>

<div use:initPanzoom on:click={onClick} on:keydown={onKeyDown}><WorldMap /></div>

<style>
	svg {
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
	}
</style>
