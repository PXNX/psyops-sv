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
		blue: "bg-friendly-bg/18 text-friendly-fg",
		purple: "bg-politics-bg/15 text-politics-fg",
		green: "bg-positive-bg/18 text-positive-fg",
		emerald: "bg-positive-bg/18 text-positive-fg",
		amber: "bg-primary/12 text-primary-fg",
		yellow: "bg-primary/12 text-primary-fg",
		red: "bg-red-600/10 text-red-400",
		slate: "bg-surface-4/70 text-fg-soft"
	};

	const rowClass =
		"flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left transition-colors hover:bg-surface-9 disabled:opacity-50";
	const tile = $derived(iconTileClass ?? tones[tone]);
</script>

{#snippet body()}
	<div class="flex size-10 shrink-0 items-center justify-center rounded-sm {tile}">
		<Icon class="size-5" />
	</div>
	<div class="min-w-0">
		<p class="font-medium {danger ? 'text-red-300' : 'text-fg'}">{title}</p>
		{#if description}
			<p class="text-xs text-fg-muted">{description}</p>
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
