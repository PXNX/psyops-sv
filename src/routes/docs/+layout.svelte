<script lang="ts">
	import { page } from "$app/state";
	import { groupedDocs } from "#lib/docs/index.js";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";

	const { data, children } = $props();
	const groups = $derived(groupedDocs(data.docs));
	const flat = $derived(data.docs);
	const currentIndex = $derived(flat.findIndex((d) => `/docs/${d.slug}` === page.url.pathname));
	const previous = $derived(currentIndex > 0 ? flat[currentIndex - 1] : null);
	const next = $derived(currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null);
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
	<aside class="md:w-64 md:shrink-0">
		<div class="panel animate-soft-in rounded-sm p-4 md:sticky md:top-6">
			<a href="/docs" class="mb-3 flex items-center gap-2 text-lg font-semibold text-heading">
				<span class="flex size-8 items-center justify-center rounded-sm border border-friendly/30 bg-friendly-bg/18">
					<FluentDocument20Filled class="size-4 text-friendly-fg" />
				</span>
				Dokumentation
			</a>
			<nav class="flex flex-col gap-3">
				{#each groups as group (group.category)}
					<div>
						<div class="section-title mb-1 px-2 text-[10px] uppercase tracking-[0.16em]">{group.category}</div>
						<div class="flex flex-col gap-0.5">
							{#each group.items as doc (doc.slug)}
								{@const active = page.url.pathname === `/docs/${doc.slug}`}
								<a
									href={`/docs/${doc.slug}`}
									class="soft-lift rounded-sm border-l-2 px-3 py-2 text-sm transition-colors {active
										? 'border-primary bg-primary/12 text-primary-fg'
										: 'border-transparent text-fg-dim hover:bg-surface-9 hover:text-fg'}"
									aria-current={active ? "page" : undefined}
								>
									{doc.title}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</nav>
		</div>
	</aside>

	<main class="min-w-0 flex-1 space-y-5">
		<article
			class="panel prose prose-invert max-w-none rounded-sm p-6 prose-headings:font-serif prose-headings:text-heading prose-p:text-fg-soft prose-a:text-primary-fg hover:prose-a:text-primary-hover"
		>
			{@render children()}
		</article>

		{#if previous || next}
			<nav class="grid gap-3 sm:grid-cols-2" aria-label="More documentation">
				{#if previous}
					<a class="panel-interactive soft-lift flex items-center gap-2 rounded-sm p-3" href="/docs/{previous.slug}">
						<FluentChevronLeft20Filled class="size-4 shrink-0 text-fg-muted" />
						<span class="min-w-0"><span class="block text-[10px] uppercase tracking-wide text-fg-muted">Previous</span><span class="block truncate text-sm text-fg">{previous.title}</span></span>
					</a>
				{/if}
				{#if next}
					<a class="panel-interactive soft-lift flex items-center justify-end gap-2 rounded-sm p-3 text-right sm:col-start-2" href="/docs/{next.slug}">
						<span class="min-w-0"><span class="block text-[10px] uppercase tracking-wide text-fg-muted">Next</span><span class="block truncate text-sm text-fg">{next.title}</span></span>
						<FluentChevronRight20Filled class="size-4 shrink-0 text-fg-muted" />
					</a>
				{/if}
			</nav>
		{/if}
	</main>
</div>

<style>
	article :global(h2) {
		font-family: var(--font-serif);
		border-bottom: 1px solid color-mix(in oklab, var(--color-line) 25%, transparent);
		padding-bottom: 0.35rem;
	}
	article :global(h3) {
		font-family: var(--font-serif);
	}
	article :global(code) {
		font-family: var(--font-mono);
		border-radius: 0.25rem;
		background: var(--color-surface-2);
		padding: 0.1rem 0.3rem;
		font-size: 0.85em;
	}
	article :global(table) {
		width: 100%;
		font-size: 0.85rem;
	}
	article :global(th),
	article :global(td) {
		border: 1px solid color-mix(in oklab, var(--color-line) 25%, transparent);
		padding: 0.4rem 0.6rem;
	}
	article :global(blockquote) {
		border-left: 2px solid color-mix(in oklab, var(--color-primary) 45%, transparent);
		padding-left: 0.9rem;
		font-style: italic;
	}
</style>
