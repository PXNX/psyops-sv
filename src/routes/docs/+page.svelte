<script lang="ts">
	const { data } = $props();
</script>

<svelte:head>
	<title>Dokumentation – PsyOps SV</title>
</svelte:head>

<h1>Dokumentation</h1>
<p>Willkommen in der Dokumentation von PsyOps-SV. Wählen Sie ein Thema aus.</p>

<div class="not-prose mt-6 grid gap-4 sm:grid-cols-2">
	{#each data.docs as doc (doc.slug)}
		<a href={`/docs/${doc.slug}`} class="gaming-card gaming-card-hover block rounded-lg p-4 no-underline">
			<h2 class="text-base font-semibold text-cyan-200">{doc.title}</h2>
			{#if doc.description}
				<p class="mt-1 text-sm text-gray-400">{doc.description}</p>
			{/if}
		</a>
	{/each}
</div>
