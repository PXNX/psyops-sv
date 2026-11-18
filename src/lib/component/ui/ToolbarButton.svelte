<!-- src/lib/component/ui/ToolbarButton.svelte -->
<script lang="ts">
	import type { Component } from "svelte";

	interface Props {
		icon: Component;
		/** Accessible name and tooltip. */
		label: string;
		/** Renders the pressed/toggled state. */
		active?: boolean;
		disabled?: boolean;
		size?: "xs" | "sm";
		onclick?: () => void;
		class?: string;
	}

	let {
		icon: Icon,
		label,
		active = false,
		disabled = false,
		size = "sm",
		onclick,
		class: className = ""
	}: Props = $props();

	const sizeClass = $derived(size === "xs" ? "size-7" : "size-7 sm:size-8");
</script>

<button
	type="button"
	{onclick}
	{disabled}
	title={label}
	aria-label={label}
	aria-pressed={active}
	class="flex {sizeClass} shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {active
		? 'bg-accent/20 text-accent-fg'
		: 'text-fg-muted hover:bg-accent/10 hover:text-fg'} {className}"
>
	<Icon class="size-4" />
</button>
