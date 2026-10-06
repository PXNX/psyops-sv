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
			bg: "bg-[#2369b5]/18",
			border: "border-[#5eaef5]/30 hover:border-[#5eaef5]/45",
			iconColor: "text-[#5eaef5]",
			labelColor: "text-[#b3dcff]"
		},
		purple: {
			bg: "bg-[#8a4fc0]/15",
			border: "border-[#c08cf0]/30 hover:border-[#c08cf0]/45",
			iconColor: "text-[#c08cf0]",
			labelColor: "text-[#e3cbfb]"
		},
		green: {
			bg: "bg-[#3f8a2a]/18",
			border: "border-[#6fd14a]/30 hover:border-[#6fd14a]/45",
			iconColor: "text-[#6fd14a]",
			labelColor: "text-[#b9f29a]"
		},
		emerald: {
			bg: "bg-[#3f8a2a]/18",
			border: "border-[#6fd14a]/30 hover:border-[#6fd14a]/45",
			iconColor: "text-[#6fd14a]",
			labelColor: "text-[#b9f29a]"
		},
		amber: {
			bg: "bg-[#f2b01e]/12",
			border: "border-[#f2b01e]/35 hover:border-[#f2b01e]/50",
			iconColor: "text-[#ffd35c]",
			labelColor: "text-[#ffd35c]"
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
	class="{colors.bg} rounded-sm border {colors.border} p-4 sm:p-5 transition-all {className}"
>
	<div class="flex items-center gap-2 mb-1">
		{#if icon}
			<svelte:component this={icon} class="size-4 sm:size-5 {iconClass || colors.iconColor}" />
		{/if}
		<p class="text-xs sm:text-sm {colors.labelColor} font-medium">{label}</p>
	</div>
	<p class="text-2xl sm:text-4xl font-bold text-[#f5efd8]">
		{typeof value === "number" ? value.toLocaleString() : value}
	</p>
</svelte:element>
