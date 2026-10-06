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
		yellow: "group-hover:text-[#ffd35c]",
		blue: "group-hover:text-[#b3dcff]",
		purple: "group-hover:text-[#e3cbfb]",
		emerald: "group-hover:text-[#b9f29a]",
		red: "group-hover:text-red-400"
	};

	const tileColors: Record<string, string> = {
		yellow: "bg-[#f2b01e]/15",
		blue: "bg-[#2369b5]/18",
		purple: "bg-[#8a4fc0]/15",
		emerald: "bg-[#3f8a2a]/18",
		red: "bg-red-600/20"
	};

	const Component = href ? "a" : "div";
</script>

<svelte:element
	this={Component}
	{href}
	{onclick}
	class="flex items-center gap-3 group hover:bg-[#2e3524] rounded-sm p-2 -m-2 transition-all"
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
		<p class="font-semibold text-[#f5efd8] {hoverColors[hoverColor]} transition-colors truncate">
			{#if partyAbbreviation}
				<PartyTag abbreviation={partyAbbreviation} color={partyColor} />
			{/if}
			{title}
		</p>
		<p class="text-xs text-[#a8a083] truncate">
			{subtitle}
		</p>
	</div>

	{#if href || onclick}
		<FluentChevronRight20Filled class="size-5 text-[#a8a083] {hoverColors[hoverColor]} transition-colors" />
	{/if}
</svelte:element>
