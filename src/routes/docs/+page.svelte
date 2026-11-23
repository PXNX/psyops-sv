<script lang="ts">
	import { groupedDocs } from "#lib/docs/index.js";
	import { Badge } from "#lib/component/ui/index.js";
	import FluentRocket20Filled from "~icons/fluent/rocket-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import TutorialArt from "#lib/component/docs/TutorialArt.svelte";
	import DocArt from "#lib/component/docs/DocArt.svelte";
	import type { TutorialArtKind } from "#lib/component/docs/art.js";

	const { data } = $props();
	const groups = $derived(groupedDocs(data.docs));
	const launches: { href: string; title: string; text: string; art: TutorialArtKind }[] = [
		{ href: "/training?view=navy&tutorial=navy", title: "Flotten-Tutorial", text: "Hafen, Dock, Schiffe, Minen und Seeaufklärung interaktiv üben.", art: "naval" },
		{ href: "/training?view=aviation&tutorial=air", title: "Luftwaffen-Tutorial", text: "Geschwader auswählen und Einsätze beauftragen.", art: "squadron" },
		{ href: "/map?tutorial=map", title: "Karten-Tutorial", text: "See-, Land- und Luftraum-Modus, Hex-Auswahl und Kartenhistorie.", art: "history" }
	];

	const tile = (category: string) =>
		category.startsWith("Conflict") || category.startsWith("Konflikt")
			? "border-error/30 bg-error/18 text-error"
			: category.startsWith("Politics") || category.startsWith("Politik")
				? "border-politics/30 bg-politics-bg/15 text-politics-fg"
				: category.startsWith("Everyday") || category.startsWith("Wirtschaft")
					? "border-positive/30 bg-positive-bg/18 text-positive-fg"
					: "border-friendly/30 bg-friendly-bg/18 text-friendly-fg";
</script>

<svelte:head>
	<title>Dokumentation – Psyops</title>
</svelte:head>

<div class="animate-soft-in">
	<div class="mb-6 flex items-start gap-3">
		<span class="flex size-11 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/12">
			<FluentDocument20Filled class="size-5 text-primary-fg" />
		</span>
		<div>
			<h1 class="font-serif text-3xl text-heading">Dokumentation</h1>
			<p class="mt-1 max-w-2xl text-sm text-fg-soft">
				Anleitungen für alle Bereiche des Spiels. Die Tutorials lassen sich direkt starten; die Seiten
				dahinter erklären die Mechaniken im Detail.
			</p>
		</div>
	</div>

	<div class="not-prose mt-4">
		<DocArt kind="levers" label="The four levers of power" caption="Every guide below teaches one way to apply pressure. The interactive tours show where the controls are." />
	</div>

	<h2 class="section-title">Interaktive Tutorials</h2>
	<div class="not-prose mt-3 grid gap-3 sm:grid-cols-3">
		{#each launches as launch, i}
			<a
				href={launch.href}
				class="panel-interactive soft-lift animate-rise-in group block rounded-sm p-4 no-underline"
				style="--rise-delay: {i * 60}ms"
			>
				<span class="flex size-9 items-center justify-center rounded-sm border border-warning/30 bg-warning/12">
					<FluentRocket20Filled class="size-4 text-warning" />
				</span>
				<div class="mt-2 overflow-hidden rounded-sm border border-line/15 bg-surface-0/60">
					<TutorialArt kind={launch.art} />
				</div>
				<h3 class="mt-2 text-sm font-semibold text-heading group-hover:text-primary-hover">{launch.title}</h3>
				<p class="mt-1 text-xs text-fg-muted">{launch.text}</p>
			</a>
		{/each}
	</div>

	{#each groups as group (group.category)}
		<div class="mt-8">
			<h2 class="section-title">{group.category}</h2>
			<div class="not-prose mt-3 grid gap-3 sm:grid-cols-2">
				{#each group.items as doc, i (doc.slug)}
					<a
						href={`/docs/${doc.slug}`}
						class="panel-interactive soft-lift animate-rise-in group flex items-start gap-3 rounded-sm p-4 no-underline"
						style="--rise-delay: {i * 40}ms"
					>
						<span class="flex size-9 shrink-0 items-center justify-center rounded-sm border {tile(group.category)}">
							<FluentDocument20Filled class="size-4" />
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-semibold text-heading group-hover:text-primary-hover">{doc.title}</span>
								<Badge tone="neutral" size="xs">{group.category}</Badge>
							</span>
							{#if doc.description}
								<span class="mt-1 block text-xs text-fg-muted">{doc.description}</span>
							{/if}
						</span>
						<FluentChevronRight20Filled class="mt-2 size-4 shrink-0 text-fg-faint group-hover:text-primary-hover" />
					</a>
				{/each}
			</div>
		</div>
	{/each}
</div>
