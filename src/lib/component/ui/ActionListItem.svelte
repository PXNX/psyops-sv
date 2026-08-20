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
		blue: "bg-blue-600/20 text-blue-400",
		purple: "bg-purple-600/20 text-purple-400",
		green: "bg-green-600/20 text-green-400",
		emerald: "bg-emerald-600/20 text-emerald-400",
		amber: "bg-amber-600/20 text-amber-400",
		yellow: "bg-yellow-600/20 text-yellow-400",
		red: "bg-red-600/20 text-red-400",
		slate: "bg-slate-700/50 text-gray-300"
	};

	const rowClass =
		"flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-slate-800 disabled:opacity-50";
	const tile = $derived(iconTileClass ?? tones[tone]);
</script>

{#snippet body()}
	<div class="flex size-10 shrink-0 items-center justify-center rounded-lg {tile}">
		<Icon class="size-5" />
	</div>
	<div class="min-w-0">
		<p class="font-medium {danger ? 'text-red-300' : 'text-white'}">{title}</p>
		{#if description}
			<p class="text-xs text-gray-400">{description}</p>
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
