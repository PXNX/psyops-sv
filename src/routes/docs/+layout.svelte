<script lang="ts">
	import { page } from "$app/state";
	import { groupedDocs } from "#lib/docs/index.js";

	const { data, children } = $props();
	const groups = $derived(groupedDocs(data.docs));
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
	<aside class="md:w-64 md:shrink-0">
		<div class="panel rounded-sm p-4 md:sticky md:top-6">
			<a href="/docs" class="section-title mb-3 block text-lg">Dokumentation</a>
			<nav class="flex flex-col gap-3">
				{#each groups as group (group.category)}
					<div>
						<div class="mb-1 px-3 text-[10px] uppercase tracking-[0.16em] text-fg-muted">{group.category}</div>
						<div class="flex flex-col gap-1">
							{#each group.items as doc (doc.slug)}
								{@const active = page.url.pathname === `/docs/${doc.slug}`}
								<a
									href={`/docs/${doc.slug}`}
									class="rounded-sm px-3 py-2 text-sm transition-colors {active
										? 'bg-primary/12 text-primary-fg'
										: 'text-fg-dim hover:bg-surface-9 hover:text-fg'}"
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

	<main class="min-w-0 flex-1">
		<article
			class="panel prose prose-invert max-w-none rounded-sm p-6 prose-headings:text-fg prose-p:text-fg-soft prose-a:text-primary-fg hover:prose-a:text-primary-hover"
		>
			{@render children()}
		</article>
	</main>
</div>
