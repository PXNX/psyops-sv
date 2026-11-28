<!-- src/lib/component/RelatedLinks.svelte -->
<!-- A small footer of sibling pages, so detail pages don't become dead ends. -->
<script lang="ts">
	interface RelatedLink {
		href: string;
		label: string;
	}

	let { links, title = "Related pages" }: { links: RelatedLink[]; title?: string } = $props();
</script>

{#if links.length}
	<nav class="panel rounded-sm p-3 sm:p-4 mt-4" aria-label={title}>
		<h2 class="section-title mb-2 text-xs">{title}</h2>
		<div class="flex flex-wrap gap-2">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="soft-lift rounded-sm border border-line/20 bg-surface-2 px-3 py-1.5 text-xs text-fg-soft transition-colors hover:border-primary/40 hover:text-primary-fg"
				>
					{link.label}
				</a>
			{/each}
		</div>
	</nav>
{/if}
