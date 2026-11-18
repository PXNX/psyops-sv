<!-- src/routes/party/[id]/+page.svelte -->
<!-- A party as a rally poster: emblem, name, manifesto, leader and the
     roster of membership cards. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import EditPartySheet from "./EditPartySheet.svelte";

	const { data, form } = $props();

	let showEditPartySheet = $state(false);
	let joining = $state(false);

	const leader = $derived(data.members.find((m) => m.role === "leader"));
	const roster = $derived(data.members.filter((m) => m.role !== "leader"));
	const ROSTER_LIMIT = 12;
	const tag = $derived({ abbreviation: data.party.abbreviation, color: data.party.color });
</script>

<svelte:head>
	<title>{data.party.name}</title>
	<meta
		name="description"
		content={data.party.description ||
			`${data.party.name} (${data.party.abbreviation || ""}) political party in ${data.party.state.name} on PsyOps.`}
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.party.name} />
	<meta
		property="og:description"
		content={data.party.description ||
			`${data.party.name} (${data.party.abbreviation || ""}) political party in ${data.party.state.name} on PsyOps.`}
	/>
	{#if data.party.logoUrl}
		<meta property="og:image" content={data.party.logoUrl} />
	{/if}
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.party.name} />
	<meta
		name="twitter:description"
		content={data.party.description ||
			`${data.party.name} (${data.party.abbreviation || ""}) political party in ${data.party.state.name} on PsyOps.`}
	/>
	{#if data.party.logoUrl}
		<meta name="twitter:image" content={data.party.logoUrl} />
	{/if}
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Rally poster -->
	<article id="party-poster" class="panel relative overflow-hidden rounded-sm">
		<div class="h-2" style:background-color={data.party.color}></div>
		{#if data.isLeader}
			<IconButton
				icon={FluentEdit20Filled}
				label="Edit Party"
				variant="secondary"
				size="sm"
				class="absolute top-5 right-3"
				onclick={() => (showEditPartySheet = true)}
			/>
		{/if}

		<div class="px-5 pt-6 pb-5 text-center">
			<div
				class="mx-auto mb-4 size-24 overflow-hidden rounded-full border-4 animate-pop-in"
				style="background-color: {data.party.color}; border-color: {data.party.color}"
			>
				{#if data.party.logoUrl}
					<img decoding="async" src={data.party.logoUrl} alt={data.party.name} class="size-full object-cover" />
				{:else}
					<div class="flex size-full items-center justify-center">
						<FluentPeople20Filled class="size-10 text-[#eef2ff]" />
					</div>
				{/if}
			</div>

			<h1
				class="mx-auto max-w-3xl break-words font-serif text-3xl font-black uppercase leading-none tracking-tight text-[#eef2ff] sm:text-5xl"
			>
				{data.party.name}
			</h1>
			<div class="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-[#8e9abb]">
				<PartyTag abbreviation={data.party.abbreviation} color={data.party.color} />
				{#if data.party.ideology}<Badge tone="purple" size="xs">{data.party.ideology}</Badge>{/if}
				<a href="/state/{data.party.state.id}" class="flex items-center gap-1 hover:text-[#ffc857]">
					{#if data.party.state.logo}
						<img decoding="async" src={data.party.state.logo} alt="" class="size-4 rounded-sm" />
					{:else}
						<FluentBuildingGovernment20Filled class="size-3.5" />
					{/if}
					{data.party.state.name}
				</a>
				<span>· Est. {formatDate(data.party.foundedAt)}</span>
			</div>

			{#if data.party.description}
				<figure class="mx-auto mt-5 max-w-2xl border-y border-[#8ea6e0]/15 py-4">
					<figcaption class="mb-2 text-[10px] uppercase tracking-[0.25em]" style:color={data.party.color}>
						Manifesto
					</figcaption>
					<blockquote class="whitespace-pre-line font-serif text-base italic leading-relaxed text-[#dbe2f4]">
						{data.party.description}
					</blockquote>
				</figure>
			{/if}

			<!-- Join / membership -->
			<div class="mt-5 flex flex-wrap items-center justify-center gap-2">
				{#if !data.isMember && data.canJoin}
					<form
						method="POST"
						action="?/join"
						use:enhance={() => {
							joining = true;
							return async ({ result, update }) => {
								await update();
								joining = false;
								if (result.type === "success") celebrate(document.getElementById("party-poster"));
							};
						}}
					>
						<Button type="submit" variant="primary" icon={FluentPersonAdd20Filled} loading={joining}>
							{data.party.autoAcceptMembers ? "Join the party" : "Apply to join"}
						</Button>
					</form>
				{:else if data.hasApplied}
					<Badge tone="amber" size="md">Application pending</Badge>
				{/if}
				{#if data.isMember}
					<Button href="/chat?type=party" variant="soft-emerald" size="sm" icon={FluentChat20Filled}>Party chat</Button>
				{/if}
				{#if data.isLeader}
					<Button href="/inbox" variant="soft-blue" size="sm" icon={FluentMail20Filled}>Broadcast</Button>
				{/if}
			</div>
		</div>

		<!-- Stats strip -->
		<div class="grid grid-cols-3 divide-x divide-[#8ea6e0]/15 border-t border-[#8ea6e0]/15 text-center">
			<a href="/party/{data.party.id}/member" class="p-3 hover:bg-[#f5a524]/5">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Members</p>
				<p class="text-xl font-bold text-[#eef2ff]">{data.party.memberCount}</p>
			</a>
			<a href="/state/{data.party.state.id}/parliament" class="p-3 hover:bg-[#f5a524]/5">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Seats</p>
				<p class="text-xl font-bold text-[#eef2ff]">{data.parliamentSeats || 0}</p>
			</a>
			<div class="p-3">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Rank</p>
				<p class="text-xl font-bold text-[#eef2ff]">#{data.partyRank || "—"}</p>
			</div>
		</div>
	</article>

	<!-- Feedback -->
	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="bg-[#1f9d62]/18 border border-[#4fd88a]/30 text-[#aef3c9] rounded-sm p-4 flex items-center gap-3 text-sm animate-rise-in"
		>
			{form.success}
		</div>
	{/if}

	<!-- Leader + roster -->
	<section class="panel rounded-sm p-5 space-y-4">
		<div class="flex items-center justify-between gap-2">
			<h2 class="section-title">Roster</h2>
			<Button href="/party/{data.party.id}/member" variant="ghost" size="xs" icon={FluentArrowRight20Filled}>
				{data.isLeader ? "Manage" : "All members"}
			</Button>
		</div>

		{#if leader}
			<div class="panel-muted rounded-sm p-3 flex items-center gap-3" style="border-color: {data.party.color}66">
				<UserLink
					size="md"
					id={leader.userId}
					name={leader.user.profile?.name}
					avatar={leader.user.profile?.logo}
					party={tag}
					subtitle="Party leader"
					class="flex-1"
				/>
			</div>
		{/if}

		{#if roster.length}
			<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each roster.slice(0, ROSTER_LIMIT) as member (member.id)}
					<li
						out:vanish
						class="panel-muted rounded-sm p-2.5 flex items-center gap-2 border-l-2"
						style="border-left-color: {data.party.color}"
					>
						<UserLink
							size="sm"
							id={member.userId}
							name={member.user.profile?.name}
							avatar={member.user.profile?.logo}
							subtitle="{member.role === 'deputy' ? 'Deputy · ' : ''}since {formatDate(member.joinedAt)}"
						/>
					</li>
				{/each}
			</ul>
			{#if roster.length > ROSTER_LIMIT}
				<a href="/party/{data.party.id}/member" class="block text-center text-xs text-[#8e9abb] hover:text-[#ffc857]">
					+{roster.length - ROSTER_LIMIT} more
				</a>
			{/if}
		{:else if !leader}
			<p class="text-sm text-[#8e9abb]">No members yet.</p>
		{/if}
	</section>

	<!-- Leave -->
	{#if data.isMember && !data.isLeader}
		<form
			method="POST"
			action="?/leave"
			use:enhance
			class="flex items-center justify-between gap-3 px-1 text-xs text-[#8e9abb]"
		>
			<span>Member since {formatDate(data.memberSince!)}</span>
			<Button type="submit" variant="soft-red" size="xs" icon={FluentDismiss20Filled}>Leave party</Button>
		</form>
	{/if}
</PageContainer>

<!-- Edit Party Bottom Sheet -->
{#if data.isLeader && data.editForm}
	<EditPartySheet
		bind:open={showEditPartySheet}
		editForm={data.editForm}
		currentLogo={data.party.logoUrl}
		editCost={data.partyEditCost}
		userBalance={data.partyEditUserBalance}
		canAfford={data.canAffordPartyEdit}
		isOnCooldown={data.isPartyEditOnCooldown}
		cooldownEndsAt={data.partyEditCooldownEndsAt}
		cooldownHours={data.partyEditCooldownHours}
	/>
{/if}
