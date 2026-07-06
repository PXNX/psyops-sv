<script lang="ts">
	import { page } from "$app/state";

	const { data, children } = $props();
</script>

<div class="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-4 md:flex-row md:p-6">
	<aside class="md:w-64 md:shrink-0">
		<div class="gaming-card rounded-lg p-4 md:sticky md:top-6">
			<a href="/docs" class="gaming-header mb-3 block text-lg">Dokumentation</a>
			<nav class="flex flex-col gap-1">
				{#each data.docs as doc (doc.slug)}
					{@const active = page.url.pathname === `/docs/${doc.slug}`}
					<a
						href={`/docs/${doc.slug}`}
						class="rounded-sm px-3 py-2 text-sm transition-colors {active
							? 'bg-cyan-900/40 text-cyan-200'
							: 'text-gray-300 hover:bg-slate-800/60 hover:text-cyan-200'}"
						aria-current={active ? "page" : undefined}
					>
						{doc.title}
					</a>
				{/each}
			</nav>
		</div>
	</aside>

	<main class="min-w-0 flex-1">
		<article
			class="gaming-card prose prose-invert max-w-none rounded-lg p-6 prose-headings:text-cyan-200 prose-a:text-cyan-400"
		>
			{@render children()}
		</article>
	</main>
</div>
