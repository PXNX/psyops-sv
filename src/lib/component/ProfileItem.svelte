<!-- src/lib/component/ProfileItem.svelte -->
<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "$lib/component/Logo.svelte";

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
		onclick
	}: Props = $props();

	const hoverColors: Record<string, string> = {
		yellow: "group-hover:text-yellow-400",
		blue: "group-hover:text-blue-400",
		purple: "group-hover:text-purple-400",
		emerald: "group-hover:text-emerald-400",
		red: "group-hover:text-red-400"
	};

	const Component = href ? "a" : "div";
</script>

<svelte:element
	this={Component}
	{href}
	{onclick}
	class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all"
	class:cursor-pointer={onclick}
>
	{#if logo !== undefined}
		<Logo src={logo} alt={logoAlt} {placeholderIcon} {placeholderGradient} />
	{:else if icon}
		<div class="size-12 bg-{hoverColor}-600/20 rounded-lg flex items-center justify-center">
			<span class="text-2xl">{icon}</span>
		</div>
	{/if}

	<div class="flex-1 min-w-0">
		<p class="font-semibold text-white {hoverColors[hoverColor]} transition-colors truncate">
			{title}
		</p>
		<p class="text-xs text-gray-400 truncate">
			{subtitle}
		</p>
	</div>

	{#if href || onclick}
		<FluentChevronRight20Filled class="size-5 text-gray-500 {hoverColors[hoverColor]} transition-colors" />
	{/if}
</svelte:element>
