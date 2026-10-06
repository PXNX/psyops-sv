<script lang="ts">
	import type { Snippet, Component } from "svelte";
	import BackLink from "./ui/BackLink.svelte";

	interface Props {
		title: string;
		subtitle?: string;
		icon?: Component;
		/** Renders a "← label" link above the title (e.g. back to the parent entity). */
		backHref?: string;
		backLabel?: string;
		actions?: Snippet;
		class?: string;
	}

	let { title, subtitle, icon: Icon, backHref, backLabel = "Back", actions, class: className = "" }: Props = $props();
</script>

<div class="space-y-2 {className}">
	{#if backHref}
		<BackLink href={backHref} label={backLabel} class="-ml-3" />
	{/if}
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div class="min-w-0">
			<h1 class="text-3xl font-bold text-[#fff4d6] flex items-center gap-3 flex-wrap">
				{#if Icon}
					<Icon class="size-7 shrink-0 text-[#f2b01e]" />
				{/if}
				<span class="break-words">{title}</span>
			</h1>
			{#if subtitle}
				<p class="text-[#a8a083] mt-1">{subtitle}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex flex-wrap gap-2 shrink-0">
				{@render actions()}
			</div>
		{/if}
	</div>
	<!-- Brass trim under the title bar. -->
	<div class="h-0.5 bg-gradient-to-r from-[#f2b01e]/80 via-[#c8b47a]/30 to-transparent"></div>
</div>
