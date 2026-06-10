<script lang="ts">
	import type { Snippet, Component } from "svelte";

	interface Props {
		icon?: Component;
		title: string;
		subtitle?: string;
		actions?: Snippet;
		class?: string;
	}

	let { icon, title, subtitle, actions, class: className = "" }: Props = $props();
</script>

<div class="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-12 sm:p-16 text-center {className}">
	{#if icon}
		<svelte:component this={icon} class="size-14 sm:size-16 mx-auto mb-4 opacity-20" />
	{/if}
	<p class="text-slate-400 text-base sm:text-lg">{title}</p>
	{#if subtitle}
		<p class="text-sm text-slate-500 mt-2">{subtitle}</p>
	{/if}
	{#if actions}
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
