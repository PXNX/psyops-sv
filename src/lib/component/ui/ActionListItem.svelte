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
		blue: "bg-[#315d8d]/18 text-[#b7d0e6]",
		purple: "bg-[#8c709b]/15 text-[#d5c4df]",
		green: "bg-[#587252]/18 text-[#c6dfbf]",
		emerald: "bg-emerald-600/20 text-emerald-400",
		amber: "bg-[#e6a527]/12 text-[#f7c56b]",
		yellow: "bg-yellow-600/20 text-yellow-400",
		red: "bg-red-600/20 text-red-400",
		slate: "bg-[#102239]/70 text-[#d9ccb7]"
	};

	const rowClass =
		"flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-[#19304b] disabled:opacity-50";
	const tile = $derived(iconTileClass ?? tones[tone]);
</script>

{#snippet body()}
	<div class="flex size-10 shrink-0 items-center justify-center rounded-lg {tile}">
		<Icon class="size-5" />
	</div>
	<div class="min-w-0">
		<p class="font-medium {danger ? 'text-red-300' : 'text-[#fff7e8]'}">{title}</p>
		{#if description}
			<p class="text-xs text-[#a89e8e]">{description}</p>
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
