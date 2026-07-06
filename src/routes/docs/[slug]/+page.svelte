<script lang="ts">
	const { data } = $props();

	const Content = $derived(data.component);
</script>

<svelte:head>
	<title>{data.meta.title} – PsyOps SV</title>
	{#if data.meta.description}
		<meta name="description" content={data.meta.description} />
	{/if}
</svelte:head>

<Content />
