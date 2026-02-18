<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		title: string;
		subtitle?: string;
		backHref: string;
		children: Snippet;
		stats?: Snippet;
	}

	let { title, subtitle, backHref, children, stats }: Props = $props();
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href={backHref} class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
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
