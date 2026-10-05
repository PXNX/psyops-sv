<script lang="ts">
	const { children } = $props();

	export const prerender = true;
</script>

<svelte:head>
	<title>PsyOps | About</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<main class="w-full">
	{@render children()}
</main>
