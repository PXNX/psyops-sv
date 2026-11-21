<!-- /lib/component/ResourceIcon.svelte -->
<script lang="ts">
	import { isometricIconMarkup } from "#lib/icons/isometric";

	type Props = {
		name: string;
		class?: string;
	};

	let { name, class: className = "" }: Props = $props();

	const markup = $derived(isometricIconMarkup(name));
</script>

<svg class={className} viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true" focusable="false">
	{@html markup}
</svg>
