<script lang="ts">
	const { children } = $props();
</script>

<svelte:head>
	<title>PsyOps | About</title>
	<meta
		content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
		name="viewport"
	/>
</svelte:head>

<main class="p-2 font-bold text-white bg-gradient-to-r from-amber-800 to-zinc-800">
	{@render children()}
</main>
