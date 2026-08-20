<script lang="ts">
	import type { Snippet } from "svelte";
	import BackLink from "$lib/component/ui/BackLink.svelte";

	interface Props {
		title: string;
		subtitle?: string;
		backHref: string;
		children: Snippet;
		stats?: Snippet;
	}

	let { title, subtitle, backHref, children, stats }: Props = $props();
</script>

<div class="mx-auto max-w-3xl space-y-6 px-4 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<BackLink href={backHref} />
			<div>
				<h1 class="text-3xl font-bold text-white">{title}</h1>
				{#if subtitle}
					<p class="text-gray-400">{subtitle}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Optional Stats Section -->
	{#if stats}
		{@render stats()}
	{/if}

	<!-- Main Content -->
	{@render children()}
</div>
