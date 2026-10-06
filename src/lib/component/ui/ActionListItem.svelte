<!-- src/lib/component/ui/ActionListItem.svelte -->
<script lang="ts">
	import type { Component } from "svelte";

	type Tone = "blue" | "purple" | "green" | "emerald" | "amber" | "yellow" | "red" | "slate";

	interface Props {
		icon: Component;
		title: string;
		description?: string;
		/** Colour of the leading icon tile. */
		tone?: Tone;
		/** Highlights the title, e.g. for destructive actions. */
		danger?: boolean;
		/** Overrides the icon tile classes (for gradients and other one-offs). */
		iconTileClass?: string;
		href?: string;
		onclick?: () => void;
		disabled?: boolean;
		class?: string;
	}

	let {
		icon: Icon,
		title,
		description,
		tone = "slate",
		danger = false,
		iconTileClass,
		href,
		onclick,
		disabled = false,
		class: className = ""
	}: Props = $props();

	const tones: Record<Tone, string> = {
		blue: "bg-[#2369b5]/18 text-[#b3dcff]",
		purple: "bg-[#8a4fc0]/15 text-[#e3cbfb]",
		green: "bg-[#3f8a2a]/18 text-[#b9f29a]",
		emerald: "bg-[#3f8a2a]/18 text-[#b9f29a]",
		amber: "bg-[#f2b01e]/12 text-[#ffd35c]",
		yellow: "bg-[#f2b01e]/12 text-[#ffd35c]",
		red: "bg-red-600/10 text-red-400",
		slate: "bg-[#1a1f15]/70 text-[#d3caa9]"
	};

	const rowClass =
		"flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left transition-colors hover:bg-[#2e3524] disabled:opacity-50";
	const tile = $derived(iconTileClass ?? tones[tone]);
</script>

{#snippet body()}
	<div class="flex size-10 shrink-0 items-center justify-center rounded-sm {tile}">
		<Icon class="size-5" />
	</div>
	<div class="min-w-0">
		<p class="font-medium {danger ? 'text-red-300' : 'text-[#f5efd8]'}">{title}</p>
		{#if description}
			<p class="text-xs text-[#a8a083]">{description}</p>
		{/if}
	</div>
{/snippet}

{#if href}
	<a {href} class="{rowClass} {className}">
		{@render body()}
	</a>
{:else}
	<button type="button" {onclick} {disabled} class="{rowClass} {className}">
		{@render body()}
	</button>
{/if}
