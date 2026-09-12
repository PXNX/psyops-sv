<!-- src/lib/component/ProfileItem.svelte -->
<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import PartyTag from "$lib/component/PartyTag.svelte";

	interface Props {
		href?: string;
		logo?: string | null;
		logoAlt?: string;
		placeholderIcon?: any;
		placeholderGradient?: string;
		title: string;
		subtitle: string;
		hoverColor?: string;
		icon?: string;
		onclick?: () => void;
		partyAbbreviation?: string | null;
		partyColor?: string | null;
	}

	let {
		href,
		logo = null,
		logoAlt = "",
		placeholderIcon,
		placeholderGradient,
		title,
		subtitle,
		hoverColor = "purple",
		icon,
		onclick,
		partyAbbreviation,
		partyColor
	}: Props = $props();

	const hoverColors: Record<string, string> = {
		yellow: "group-hover:text-[#f7c56b]",
		blue: "group-hover:text-[#b7d0e6]",
		purple: "group-hover:text-[#d5c4df]",
		emerald: "group-hover:text-[#c6dfbf]",
		red: "group-hover:text-red-400"
	};

	const tileColors: Record<string, string> = {
		yellow: "bg-[#e6a527]/15",
		blue: "bg-[#315d8d]/18",
		purple: "bg-[#8c709b]/15",
		emerald: "bg-[#587252]/18",
		red: "bg-red-600/20"
	};

	const Component = href ? "a" : "div";
</script>

<svelte:element
	this={Component}
	{href}
	{onclick}
	class="flex items-center gap-3 group hover:bg-[#19304b] rounded-lg p-2 -m-2 transition-all"
	class:cursor-pointer={onclick}
>
	{#if logo !== undefined}
		<Logo src={logo} alt={logoAlt} {placeholderIcon} {placeholderGradient} />
	{:else if icon}
		<div class="size-12 {tileColors[hoverColor] ?? tileColors.purple} rounded-lg flex items-center justify-center">
			<span class="text-2xl">{icon}</span>
		</div>
	{/if}

	<div class="flex-1 min-w-0">
		<p class="font-semibold text-[#fff7e8] {hoverColors[hoverColor]} transition-colors truncate">
			{#if partyAbbreviation}
				<PartyTag abbreviation={partyAbbreviation} color={partyColor} />
			{/if}
			{title}
		</p>
		<p class="text-xs text-[#a89e8e] truncate">
			{subtitle}
		</p>
	</div>

	{#if href || onclick}
		<FluentChevronRight20Filled class="size-5 text-[#a89e8e] {hoverColors[hoverColor]} transition-colors" />
	{/if}
</svelte:element>
