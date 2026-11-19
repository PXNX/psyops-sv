<!-- src/lib/component/ProfileItem.svelte -->
<!-- One row of a profile list: logo (or emoji tile), title, subtitle, an
     optional key figure on the right and a chevron when the row links somewhere.
     Meant to sit in a `divide-y` list inside a panel. -->
<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";

	interface Props {
		href?: string;
		logo?: string | null;
		logoAlt?: string | null;
		placeholderIcon?: Component;
		placeholderGradient?: string;
		title: string;
		subtitle?: string | null;
		icon?: string;
		onclick?: () => void;
		partyAbbreviation?: string | null;
		partyColor?: string | null;
		/** Optional content on the right (a key figure, a badge). */
		aside?: Snippet;
	}

	let {
		href,
		logo = undefined,
		logoAlt = "",
		placeholderIcon,
		placeholderGradient = "from-surface-4 to-surface-2",
		title,
		subtitle,
		icon,
		onclick,
		partyAbbreviation,
		partyColor,
		aside
	}: Props = $props();

	const tag = $derived(href ? "a" : onclick ? "button" : "div");
	const interactive = $derived(!!(href || onclick));
</script>

<svelte:element
	this={tag}
	{href}
	{onclick}
	type={tag === "button" ? "button" : undefined}
	class="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors {interactive
		? 'hover:bg-surface-5'
		: ''}"
>
	{#if logo !== undefined}
		<Logo
			src={logo}
			alt={logoAlt ?? ""}
			{placeholderIcon}
			{placeholderGradient}
			class="size-9! rounded-sm! shrink-0 border border-line/15"
		/>
	{:else if icon}
		<div class="size-9 shrink-0 rounded-sm border border-line/15 flex items-center justify-center">
			<span class="text-lg">{icon}</span>
		</div>
	{/if}

	<div class="flex-1 min-w-0">
		<p
			class="truncate text-sm font-medium text-fg-body transition-colors {interactive
				? 'group-hover:text-fg group-hover:underline'
				: ''}"
		>
			{#if partyAbbreviation}
				<PartyTag abbreviation={partyAbbreviation} color={partyColor} />
			{/if}
			{title}
		</p>
		{#if subtitle}
			<p class="truncate text-xs text-fg-muted">{subtitle}</p>
		{/if}
	</div>

	{#if aside}
		<div class="shrink-0 text-right">{@render aside()}</div>
	{/if}

	{#if interactive}
		<FluentChevronRight20Filled class="size-4 shrink-0 text-fg-muted" />
	{/if}
</svelte:element>
