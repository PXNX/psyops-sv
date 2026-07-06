<script lang="ts">
	import { settings } from "$lib/settings.svelte";

	const { children, data } = $props();

	// The stored profile is the source of truth for authenticated users.
	$effect(() => {
		settings.hydrateFromServer(data.profile?.theme, data.profile?.loadImages);
	});
</script>

{@render children()}
