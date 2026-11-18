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
			bg: "bg-friendly-bg/18",
			border: "border-friendly/30 hover:border-friendly/45",
			iconColor: "text-friendly",
			labelColor: "text-friendly-fg"
		},
		purple: {
			bg: "bg-politics-bg/15",
			border: "border-politics/30 hover:border-politics/45",
			iconColor: "text-politics",
			labelColor: "text-politics-fg"
		},
		green: {
			bg: "bg-positive-bg/18",
			border: "border-positive/30 hover:border-positive/45",
			iconColor: "text-positive",
			labelColor: "text-positive-fg"
		},
		emerald: {
			bg: "bg-positive-bg/18",
			border: "border-positive/30 hover:border-positive/45",
			iconColor: "text-positive",
			labelColor: "text-positive-fg"
		},
		amber: {
			bg: "bg-accent/12",
			border: "border-accent/35 hover:border-accent/50",
			iconColor: "text-accent-fg",
			labelColor: "text-accent-fg"
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
	<p class="text-2xl sm:text-4xl font-bold text-fg">
		{typeof value === "number" ? value.toLocaleString() : value}
	</p>
</svelte:element>
