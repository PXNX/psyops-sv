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
	class="flex {sizeClass} shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#f5a524] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {active
		? 'bg-[#f5a524]/20 text-[#ffcb6b]'
		: 'text-[#8e9abb] hover:bg-[#f5a524]/10 hover:text-[#eef2ff]'} {className}"
>
	<Icon class="size-4" />
</button>
