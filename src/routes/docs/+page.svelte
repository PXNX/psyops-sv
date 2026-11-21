<script lang="ts">
	const { data } = $props();
</script>

<svelte:head>
	<title>Dokumentation – Psyops</title>
</svelte:head>

<h1>Dokumentation</h1>
<p>Willkommen in der Dokumentation von Psyops. Wählen Sie ein Thema aus.</p>

<div class="not-prose mt-4 grid gap-3 sm:grid-cols-3">
	<a href="/navy?tutorial=navy" class="panel-interactive block rounded-sm p-3 no-underline">
		<h2 class="section-title text-sm">Flotten-Tutorial starten</h2>
		<p class="mt-1 text-xs text-fg-muted">Hafen, Dock, Schiffe, Minen und Seeaufklärung interaktiv üben.</p>
	</a>
	<a href="/navy?tutorial=air" class="panel-interactive block rounded-sm p-3 no-underline">
		<h2 class="section-title text-sm">Luftwaffen-Tutorial starten</h2>
		<p class="mt-1 text-xs text-fg-muted">Geschwader auswählen und Einsätze beauftragen.</p>
	</a>
	<a href="/map?tutorial=map" class="panel-interactive block rounded-sm p-3 no-underline">
		<h2 class="section-title text-sm">Karten-Tutorial starten</h2>
		<p class="mt-1 text-xs text-fg-muted">See-, Land- und Luftraum-Modus sowie Hex-Auswahl.</p>
	</a>
</div>

<div class="not-prose mt-6 grid gap-4 sm:grid-cols-2">
	{#each data.docs as doc (doc.slug)}
		<a href={`/docs/${doc.slug}`} class="panel-interactive block rounded-sm p-4 no-underline">
			<h2 class="section-title text-base">{doc.title}</h2>
			{#if doc.description}
				<p class="mt-1 text-sm text-fg-muted">{doc.description}</p>
			{/if}
		</a>
	{/each}
</div>
