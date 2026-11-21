<!-- /lib/component/ResourceIcon.svelte -->
<script lang="ts">
	import { isometricIconMarkup, isometricIconNames } from "#lib/icons/isometric";

	type Props = {
		name: string;
		class?: string;
	};

	let { name, class: className = "" }: Props = $props();

	// Every resource/product has a 3D-rendered raster icon. Unknown names fall
	// back to the vector set so an unexpected resource never renders blank.
	const hasRaster = $derived(name !== "package" && isometricIconNames.includes(name));
	const markup = $derived(hasRaster ? "" : isometricIconMarkup(name));
</script>

{#if hasRaster}
	<img
		src="/icons/resources/{name}.webp"
		alt=""
		width="20"
		height="20"
		class={className}
		draggable="false"
		decoding="async"
	/>
{:else}
	<svg class={className} viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true" focusable="false">
		{@html markup}
	</svg>
{/if}
