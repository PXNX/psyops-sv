<!-- src/lib/component/ProfileItem.svelte -->
<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";

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
		yellow: "group-hover:text-[#ffcb6b]",
		blue: "group-hover:text-[#c3dbff]",
		purple: "group-hover:text-[#e6dcff]",
		emerald: "group-hover:text-[#aef3c9]",
		red: "group-hover:text-red-400"
	};

	const tileColors: Record<string, string> = {
		yellow: "bg-[#f5a524]/15",
		blue: "bg-[#2f6be0]/18",
		purple: "bg-[#7451e6]/15",
		emerald: "bg-[#1f9d62]/18",
		red: "bg-red-600/20"
	};

	const Component = href ? "a" : "div";
</script>

<svelte:element
	this={Component}
	{href}
	{onclick}
	class="flex items-center gap-3 group hover:bg-[#233154] rounded-sm p-2 -m-2 transition-all"
	class:cursor-pointer={onclick}
>
	{#if logo !== undefined}
		<Logo src={logo} alt={logoAlt} {placeholderIcon} {placeholderGradient} />
	{:else if icon}
		<div class="size-12 {tileColors[hoverColor] ?? tileColors.purple} rounded-sm flex items-center justify-center">
			<span class="text-2xl">{icon}</span>
		</div>
	{/if}

	<div class="flex-1 min-w-0">
		<p class="font-semibold text-[#eef2ff] {hoverColors[hoverColor]} transition-colors truncate">
			{#if partyAbbreviation}
				<PartyTag abbreviation={partyAbbreviation} color={partyColor} />
			{/if}
			{title}
		</p>
		<p class="text-xs text-[#8e9abb] truncate">
			{subtitle}
		</p>
	</div>

	{#if href || onclick}
		<FluentChevronRight20Filled class="size-5 text-[#8e9abb] {hoverColors[hoverColor]} transition-colors" />
	{/if}
</svelte:element>
