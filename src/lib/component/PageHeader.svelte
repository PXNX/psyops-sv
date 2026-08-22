<script lang="ts">
	import type { Snippet, Component } from "svelte";

	interface Props {
		title: string;
		subtitle?: string;
		icon?: Component;
		actions?: Snippet;
		class?: string;
	}

	let { title, subtitle, icon, actions, class: className = "" }: Props = $props();
</script>

	<div class="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 {className}">
	<div class="min-w-0">
			<h1 class="editorial-title text-3xl sm:text-4xl font-normal text-[#fff7e8] flex items-center gap-3 flex-wrap">
			{#if icon}
				<svelte:component this={icon} class="size-7 sm:size-8 shrink-0" />
			{/if}
			<span class="break-words">{title}</span>
		</h1>
		{#if subtitle}
				<p class="text-[#c7bda9] mt-1 text-sm sm:text-base">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap gap-2 shrink-0">
			{@render actions()}
		</div>
	{/if}
</div>

<style>
	@reference "../../app.css";
	.page-header { padding-bottom: 1rem; border-bottom: 1px solid rgb(223 206 176 / 18%); }
	.editorial-title :global(svg) { color: #e6a527; }
</style>
