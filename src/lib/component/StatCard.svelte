<script lang="ts">
	import { get } from "svelte/store";
	import type { Component } from "svelte";
	import { viewTransitionActive } from "#lib/utils/motion.js";

	interface Props {
		icon?: Component;
		iconClass?: string;
		label: string;
		value: string | number;
		color?: "blue" | "purple" | "green" | "emerald" | "amber" | "red";
		href?: string;
		class?: string;
	}

	let { icon: Icon, iconClass = "", label, value, color = "blue", href, class: className = "" }: Props = $props();

	const colorMap: Record<string, { bg: string; border: string; iconColor: string; labelColor: string }> = {
		blue: {
			bg: "bg-[#2f6be0]/18",
			border: "border-[#6aa8ff]/30 hover:border-[#6aa8ff]/45",
			iconColor: "text-[#6aa8ff]",
			labelColor: "text-[#c3dbff]"
		},
		purple: {
			bg: "bg-[#7451e6]/15",
			border: "border-[#b9a1ff]/30 hover:border-[#b9a1ff]/45",
			iconColor: "text-[#b9a1ff]",
			labelColor: "text-[#e6dcff]"
		},
		green: {
			bg: "bg-[#1f9d62]/18",
			border: "border-[#4fd88a]/30 hover:border-[#4fd88a]/45",
			iconColor: "text-[#4fd88a]",
			labelColor: "text-[#aef3c9]"
		},
		emerald: {
			bg: "bg-[#1f9d62]/18",
			border: "border-[#4fd88a]/30 hover:border-[#4fd88a]/45",
			iconColor: "text-[#4fd88a]",
			labelColor: "text-[#aef3c9]"
		},
		amber: {
			bg: "bg-[#f5a524]/12",
			border: "border-[#f5a524]/35 hover:border-[#f5a524]/50",
			iconColor: "text-[#ffcb6b]",
			labelColor: "text-[#ffcb6b]"
		},
		red: {
			bg: "bg-red-600/15",
			border: "border-red-500/20 hover:border-red-500/30",
			iconColor: "text-red-400",
			labelColor: "text-red-300"
		}
	};

	const colors = $derived(colorMap[color]);
	const Tag = href ? "a" : "div";

	// Entrance animation defers to the view transition when one is mid-swap
	// (see lib/utils/motion.ts).
	const entrance = !get(viewTransitionActive);
</script>

<svelte:element
	this={Tag}
	{href}
	class="{colors.bg} rounded-sm border {colors.border} p-4 sm:p-5 transition-all {href ? 'press-spring' : ''} {entrance
		? 'animate-pop-in'
		: ''} {className}"
>
	<div class="flex items-center gap-2 mb-1">
		{#if Icon}
			<Icon class="size-4 sm:size-5 {iconClass || colors.iconColor}" />
		{/if}
		<p class="text-xs sm:text-sm {colors.labelColor} font-medium">{label}</p>
	</div>
	<p class="text-2xl sm:text-4xl font-bold text-[#eef2ff]">
		{typeof value === "number" ? value.toLocaleString() : value}
	</p>
</svelte:element>
