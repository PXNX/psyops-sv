<!-- src/lib/component/UserLink.svelte -->
<!-- The one way to show a player: avatar + name (+ party tag, + a short
     line underneath) linking to their profile. Use it wherever a user is
     named so every page looks and behaves the same. -->
<script lang="ts">
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import Logo from "./Logo.svelte";
	import PartyTag from "./PartyTag.svelte";

	interface Props {
		id: string | null | undefined;
		name: string | null | undefined;
		avatar?: string | null;
		party?: { abbreviation?: string | null; color?: string | null } | null;
		/** A short line under the name, e.g. a role or date. */
		subtitle?: string | null;
		/** xs: inline in text · sm: lists · md: cards. */
		size?: "xs" | "sm" | "md";
		/** Hide the avatar, e.g. inside running text. */
		plain?: boolean;
		class?: string;
	}

	let {
		id,
		name,
		avatar = null,
		party = null,
		subtitle = null,
		size = "sm",
		plain = false,
		class: className = ""
	}: Props = $props();

	const avatarSize = { xs: "size-5", sm: "size-8", md: "size-11" }[size];
	const nameSize = { xs: "text-sm", sm: "text-sm", md: "text-base" }[size];
	const label = $derived(name?.trim() || "Unknown");
</script>

<svelte:element
	this={id ? "a" : "span"}
	href={id ? `/user/${id}` : undefined}
	class="group inline-flex items-center gap-2 min-w-0 align-middle {className}"
>
	{#if !plain}
		<Logo
			src={avatar}
			alt=""
			class="{avatarSize} shrink-0 rounded-full ring-1 ring-[#8ea6e0]/20 transition-transform duration-200 group-hover:scale-105 group-hover:ring-[#f5a524]/55"
			placeholderIcon={FluentPerson20Filled}
			placeholderGradient="from-[#33456f] to-[#1b2641]"
		/>
	{/if}
	<span class="min-w-0 {subtitle ? 'flex flex-col leading-tight' : 'inline-flex items-center gap-1.5'}">
		<span class="inline-flex items-center gap-1.5 min-w-0">
			<span
				class="{nameSize} font-semibold text-[#eef2ff] truncate transition-colors {id
					? 'group-hover:text-[#ffc857]'
					: ''}">{label}</span
			>
			{#if party?.abbreviation}
				<PartyTag abbreviation={party.abbreviation} color={party.color} />
			{/if}
		</span>
		{#if subtitle}
			<span class="text-xs text-[#8e9abb] truncate">{subtitle}</span>
		{/if}
	</span>
</svelte:element>
