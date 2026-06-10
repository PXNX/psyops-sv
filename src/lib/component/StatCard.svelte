<script lang="ts">
	import type { Component } from "svelte";

	interface Props {
		icon?: Component;
		iconClass?: string;
		label: string;
		value: string | number;
		color?: "blue" | "purple" | "green" | "emerald" | "amber" | "red";
		href?: string;
		class?: string;
	}

	let { icon, iconClass = "", label, value, color = "blue", href, class: className = "" }: Props = $props();

	const colorMap: Record<string, { bg: string; border: string; iconColor: string; labelColor: string }> = {
		blue: {
			bg: "from-blue-600/20 to-blue-700/10",
			border: "border-blue-500/20 hover:border-blue-500/30",
			iconColor: "text-blue-400",
			labelColor: "text-blue-300"
		},
		purple: {
			bg: "from-purple-600/20 to-purple-700/10",
			border: "border-purple-500/20 hover:border-purple-500/30",
			iconColor: "text-purple-400",
			labelColor: "text-purple-300"
		},
		green: {
			bg: "from-green-600/20 to-green-700/10",
			border: "border-green-500/20 hover:border-green-500/30",
			iconColor: "text-green-400",
			labelColor: "text-green-300"
		},
		emerald: {
			bg: "from-emerald-600/20 to-emerald-700/10",
			border: "border-emerald-500/20 hover:border-emerald-500/30",
			iconColor: "text-emerald-400",
			labelColor: "text-emerald-300"
		},
		amber: {
			bg: "from-amber-600/20 to-amber-700/10",
			border: "border-amber-500/20 hover:border-amber-500/30",
			iconColor: "text-amber-400",
			labelColor: "text-amber-300"
		},
		red: {
			bg: "from-red-600/20 to-red-700/10",
			border: "border-red-500/20 hover:border-red-500/30",
			iconColor: "text-red-400",
			labelColor: "text-red-300"
		}
	};

	const colors = $derived(colorMap[color]);
	const Tag = href ? "a" : "div";
</script>

<svelte:element
	this={Tag}
	{href}
	class="bg-gradient-to-br {colors.bg} rounded-xl border {colors.border} p-4 sm:p-5 transition-all {className}"
>
	<div class="flex items-center gap-2 mb-1">
		{#if icon}
			<svelte:component this={icon} class="size-4 sm:size-5 {iconClass || colors.iconColor}" />
		{/if}
		<p class="text-xs sm:text-sm {colors.labelColor} font-medium">{label}</p>
	</div>
	<p class="text-2xl sm:text-4xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
</svelte:element>
