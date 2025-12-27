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

<main class="relative min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 overflow-hidden">
	{@render children()}
</main>
