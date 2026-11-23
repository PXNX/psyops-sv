<!-- OG-style card for links that point inside the game. Fetches only from the
     app's own resolver, which never contacts external sites. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";

	let { href }: { href: string } = $props();
	let preview = $state<{ title: string | null; description: string | null; image: string | null; href: string } | null>(null);

	onMount(async () => {
		if (!browser) return;
		try {
			const response = await fetch(`/api/link-preview?url=${encodeURIComponent(href)}`);
			if (!response.ok) return;
			const data = await response.json();
			if (data.title) preview = data;
		} catch {
			/* previews are decorative — a failed fetch just leaves the link */
		}
	});
</script>

{#if preview}
	<a href={preview.href} class="link-preview soft-lift my-3 flex gap-3 rounded-sm border border-line/25 bg-surface-1 p-3 no-underline">
		{#if preview.image}
			<img src={preview.image} alt="" loading="lazy" class="size-20 shrink-0 rounded-sm object-cover" />
		{:else}
			<span class="flex size-20 shrink-0 items-center justify-center rounded-sm bg-primary/12 text-xl text-primary-fg">↗</span>
		{/if}
		<span class="min-w-0">
			<span class="block truncate text-sm font-semibold text-heading">{preview.title}</span>
			{#if preview.description}<span class="mt-1 line-clamp-2 block text-xs text-fg-muted">{preview.description}</span>{/if}
			<span class="mt-1 block font-mono text-[10px] text-fg-faint">{preview.href}</span>
		</span>
	</a>
{/if}
