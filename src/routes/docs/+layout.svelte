<script lang="ts">
	import { page } from "$app/state";

	const { data, children } = $props();
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
	<aside class="md:w-64 md:shrink-0">
		<div class="panel rounded-sm p-4 md:sticky md:top-6">
			<a href="/docs" class="section-title mb-3 block text-lg">Dokumentation</a>
			<nav class="flex flex-col gap-1">
				{#each data.docs as doc (doc.slug)}
					{@const active = page.url.pathname === `/docs/${doc.slug}`}
					<a
						href={`/docs/${doc.slug}`}
						class="rounded-sm px-3 py-2 text-sm transition-colors {active
							? 'bg-[#f5a524]/12 text-[#ffcb6b]'
							: 'text-[#a9b4d0] hover:bg-[#233154] hover:text-[#eef2ff]'}"
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
			class="panel prose prose-invert max-w-none rounded-sm p-6 prose-headings:text-[#eef2ff] prose-p:text-[#c2cbe3] prose-a:text-[#ffcb6b] hover:prose-a:text-[#ffc857]"
		>
			{@render children()}
		</article>
	</main>
</div>
