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
			bg: "bg-[#315d8d]/18",
			border: "border-[#7ba0c8]/30 hover:border-[#7ba0c8]/45",
			iconColor: "text-[#7ba0c8]",
			labelColor: "text-[#b7d0e6]"
		},
		purple: {
			bg: "bg-[#8c709b]/15",
			border: "border-[#b7a0c5]/30 hover:border-[#b7a0c5]/45",
			iconColor: "text-[#b7a0c5]",
			labelColor: "text-[#d5c4df]"
		},
		green: {
			bg: "bg-[#587252]/18",
			border: "border-[#8fae88]/30 hover:border-[#8fae88]/45",
			iconColor: "text-[#8fae88]",
			labelColor: "text-[#c6dfbf]"
		},
		emerald: {
			bg: "bg-[#587252]/18",
			border: "border-[#8fae88]/30 hover:border-[#8fae88]/45",
			iconColor: "text-[#8fae88]",
			labelColor: "text-[#c6dfbf]"
		},
		amber: {
			bg: "bg-[#e6a527]/12",
			border: "border-[#e6a527]/35 hover:border-[#e6a527]/50",
			iconColor: "text-[#f7c56b]",
			labelColor: "text-[#f7c56b]"
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
</script>

<svelte:element
	this={Tag}
	{href}
	class="{colors.bg} rounded-xl border {colors.border} p-4 sm:p-5 transition-all {className}"
>
	<div class="flex items-center gap-2 mb-1">
		{#if icon}
			<svelte:component this={icon} class="size-4 sm:size-5 {iconClass || colors.iconColor}" />
		{/if}
		<p class="text-xs sm:text-sm {colors.labelColor} font-medium">{label}</p>
	</div>
	<p class="text-2xl sm:text-4xl font-bold text-[#fff7e8]">{typeof value === "number" ? value.toLocaleString() : value}</p>
</svelte:element>
