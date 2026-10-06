<!-- src/routes/party/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentPersonAvailable20Filled from "~icons/fluent/person-available-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import EditPartySheet from "./EditPartySheet.svelte";

	const { data, form } = $props();

	let showEditPartySheet = $state(false);
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
	<!-- Hero Section -->
	<div
		class="panel rounded-sm p-5 relative overflow-hidden"
		style="background-color: {data.party.color}0d; background-image: radial-gradient(circle at top, {data.party.color}40, transparent 70%);"
	>
		{#if data.isLeader}
			<div class="absolute top-4 right-4">
				<IconButton
					icon={FluentEdit20Filled}
					label="Edit Party"
					variant="secondary"
					size="sm"
					shape="square"
					onclick={() => (showEditPartySheet = true)}
				/>
			</div>
		{/if}

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-12">
			<!-- Party Logo -->
			<div
				class="size-20 rounded-full flex items-center justify-center overflow-hidden shrink-0"
				style="background-color: {data.party.color}"
			>
				{#if data.party.logoUrl}
					<img src={data.party.logoUrl} alt={data.party.name} class="size-full object-cover" />
				{:else}
					<FluentPeople20Filled class="size-8 text-[#f5efd8]" />
				{/if}
			</div>

			<div class="min-w-0 space-y-1">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-3xl font-bold text-[#f5efd8]">{data.party.name}</h1>
					{#if data.party.abbreviation}
						<span
							class="px-2 py-0.5 rounded-sm text-xs font-bold"
							style="background-color: {data.party.color}25; color: {data.party.color}"
						>
							{data.party.abbreviation}
						</span>
					{/if}
				</div>
				<div class="flex flex-wrap items-center gap-3 text-xs text-[#a8a083]">
					{#if data.party.ideology}
						<span class="flex items-center gap-1">
							<FluentFlag20Filled class="size-3.5 text-[#c08cf0]" />
							{data.party.ideology}
						</span>
					{/if}
					<a href="/state/{data.party.state.id}" class="flex items-center gap-1 hover:text-[#ffcf47] transition-colors">
						{#if data.party.state.logo}
							<img src={data.party.state.logo} alt={data.party.state.name} class="size-4 rounded-sm" />
						{:else}
							<FluentBuildingGovernment20Filled class="size-3.5" />
						{/if}
						{data.party.state.name}
					</a>
				</div>
				{#if data.party.description}
					<p class="text-sm text-[#d3caa9] max-w-xl pt-1">{data.party.description}</p>
				{/if}
				<p class="text-xs text-[#a8a083]">Founded {formatDate(data.party.foundedAt)}</p>
			</div>
		</div>
	</div>

	<div class="space-y-4 sm:space-y-5">
		<!-- Stats Strip -->
		<div class="grid grid-cols-3 gap-3">
			<a href="/party/{data.party.id}/member" class="panel-interactive rounded-sm p-3 sm:p-4 group">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentPeople20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] text-[#a8a083] uppercase tracking-wide">Members</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#f5efd8]">{data.party.memberCount}</div>
			</a>

			<a href="/state/{data.party.state.id}/parliament" class="panel-interactive rounded-sm p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentBuildingGovernment20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] text-[#a8a083] uppercase tracking-wide">Seats</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#f5efd8]">{data.parliamentSeats || 0}</div>
			</a>

			<div class="panel rounded-sm p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentCrown20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] text-[#a8a083] uppercase tracking-wide">Rank</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#f5efd8]">#{data.partyRank || "—"}</div>
			</div>
		</div>

		<!-- Join/Leave Party -->
		{#if !data.isMember && data.canJoin}
			<div class="panel rounded-sm p-4 sm:p-5">
				<form method="POST" action="?/join" use:enhance>
					<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div class="flex-1">
							<h3 class="text-sm sm:text-base font-bold text-[#f5efd8]">
								{data.party.autoAcceptMembers ? "Join This Party" : "Apply to Join"}
							</h3>
							<p class="text-xs text-[#a8a083] mt-0.5">
								{data.party.autoAcceptMembers ? "Become a member instantly" : "Application reviewed by leadership"}
							</p>
						</div>
						<Button type="submit" variant="primary" icon={FluentPersonAdd20Filled} class="w-full sm:w-auto">
							{data.party.autoAcceptMembers ? "Join" : "Apply"}
						</Button>
					</div>
				</form>
			</div>
		{:else if data.hasApplied}
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 text-[#ffd35c] rounded-sm p-4 flex items-center gap-3">
				<FluentPersonAvailable20Filled class="size-5 shrink-0" />
				<div>
					<span class="text-sm font-bold">Application Pending</span>
					<p class="text-xs text-[#a8a083] mt-0.5">Awaiting review from party leadership</p>
				</div>
			</div>
		{:else if data.isMember && !data.isLeader}
			<div class="panel rounded-sm p-4">
				<form method="POST" action="?/leave" use:enhance>
					<div class="flex items-center justify-between gap-3">
						<div>
							<span class="text-sm font-bold text-[#f5efd8]">Member</span>
							<p class="text-xs text-[#a8a083] mt-0.5">
								Since {(() => {
									const d = new Date(data.memberSince!);
									const p = (n: number) => String(n).padStart(2, "0");
									return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
								})()}
							</p>
						</div>
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Leave</Button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Error/Success -->
		{#if form?.error}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div
				class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3 text-sm"
			>
				{form.success}
			</div>
		{/if}

		<!-- Party Leadership -->
		<div class="panel rounded-sm p-5 space-y-3">
			<h2 class="section-title">
				<FluentCrown20Filled class="size-5" style="color: {data.party.color}" />
				Leadership
			</h2>
			<div class="space-y-2">
				{#each data.members.filter((m) => m.role === "leader") as member}
					<a
						href="/user/{member.userId}"
						class="flex items-center gap-3 p-3 panel-muted rounded-sm hover:border-[#f2b01e]/40 transition-colors group"
					>
						<Logo
							src={member.user.profile.logo}
							alt={member.user.profile.name}
							placeholderIcon={FluentPeople20Filled}
							class="size-10"
						/>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
								{member.user.profile?.name}
							</p>
							<p class="text-xs mt-0.5" style="color: {data.party.color}">Party Leader</p>
						</div>
						<span class="text-[#a8a083]/60 group-hover:text-[#ffcf47] transition-colors text-sm">→</span>
					</a>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		{#if data.isLeader}
			<div class="flex flex-wrap gap-2">
				<Button href="/party/{data.party.id}/member" variant="secondary" size="sm" icon={FluentPeople20Filled}>
					Members
				</Button>
				<Button href="/chat?type=party" variant="soft-emerald" size="sm" icon={FluentChat20Filled}>Chat</Button>
				<Button href="/inbox" variant="soft-blue" size="sm" icon={FluentMail20Filled}>Broadcast</Button>
			</div>
		{:else if data.isMember}
			<Button href="/chat?type=party" variant="soft-emerald" size="sm" icon={FluentChat20Filled}>Party Chat</Button>
		{/if}
	</div>
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
