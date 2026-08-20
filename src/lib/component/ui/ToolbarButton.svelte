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
	class="flex {sizeClass} shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {active
		? 'bg-purple-600/30 text-purple-200'
		: 'text-gray-400 hover:bg-white/10 hover:text-white'} {className}"
>
	<Icon class="size-4" />
</button>
