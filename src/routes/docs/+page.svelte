<script lang="ts">
	import { groupedDocs } from "#lib/docs/index.js";

	const { data } = $props();
	const groups = $derived(groupedDocs(data.docs));
	const launches = [
		{ href: "/training?view=navy&tutorial=navy", title: "Flotten-Tutorial", text: "Hafen, Dock, Schiffe, Minen und Seeaufklärung interaktiv üben." },
		{ href: "/training?view=aviation&tutorial=air", title: "Luftwaffen-Tutorial", text: "Geschwader auswählen und Einsätze beauftragen." },
		{ href: "/map?tutorial=map", title: "Karten-Tutorial", text: "See-, Land- und Luftraum-Modus sowie Hex-Auswahl." }
	];
</script>

<svelte:head>
	<title>Dokumentation – Psyops</title>
</svelte:head>

<h1>Dokumentation</h1>
<p>
	Anleitungen für alle Bereiche des Spiels. Die Tutorials lassen sich direkt starten; die Seiten
	dahinter erklären die Mechaniken im Detail.
</p>

<h2>Interaktive Tutorials</h2>
<div class="not-prose mt-4 grid gap-3 sm:grid-cols-3">
	{#each launches as launch}
		<a href={launch.href} class="panel-interactive block rounded-sm p-3 no-underline">
			<h3 class="section-title text-sm">{launch.title}</h3>
			<p class="mt-1 text-xs text-fg-muted">{launch.text}</p>
		</a>
	{/each}
</div>

{#each groups as group (group.category)}
	<h2 class="mt-8">{group.category}</h2>
	<div class="not-prose mt-3 grid gap-4 sm:grid-cols-2">
		{#each group.items as doc (doc.slug)}
			<a href={`/docs/${doc.slug}`} class="panel-interactive block rounded-sm p-4 no-underline">
				<h3 class="section-title text-base">{doc.title}</h3>
				{#if doc.description}
					<p class="mt-1 text-sm text-fg-muted">{doc.description}</p>
				{/if}
			</a>
		{/each}
	</div>
{/each}
