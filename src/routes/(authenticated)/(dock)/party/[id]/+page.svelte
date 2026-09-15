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
	import Logo from "$lib/component/Logo.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";

	const { data, form } = $props();
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

<PageContainer maxWidth="4xl">
	<!-- Hero Section -->
	<div class="relative">
		<div
			class="w-full rounded-sm p-8 flex flex-col items-center relative overflow-hidden border border-[#dfceb0]/15 shadow-2xl"
			style="background: linear-gradient(135deg, {data.party.color}20 0%, {data.party.color}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.party
					.color}20 35px, {data.party.color}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-sm"></div>

			{#if data.isLeader}
				<a
					href="/party/{data.party.id}/edit"
					class="absolute top-3 right-3 z-20 p-2 bg-black/30 hover:bg-black/50 border border-[#dfceb0]/25 hover:border-[#dfceb0]/40 rounded-lg text-[#d9ccb7] hover:text-[#fff7e8] transition-all backdrop-blur-sm"
					title="Edit Party"
					aria-label="Edit Party"
				>
					<FluentEdit20Filled class="size-4" />
				</a>
			{/if}

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<!-- Party Logo -->
				<div
					class="size-24 rounded-full flex items-center justify-center overflow-hidden"
					style="background-color: {data.party.color}"
				>
					{#if data.party.logoUrl}
						<img src={data.party.logoUrl} alt={data.party.name} class="size-full object-cover" />
					{:else}
						<FluentPeople20Filled class="size-8 text-[#fff7e8]" />
					{/if}
				</div>

				<div class="text-center space-y-1">
					<div class="flex flex-wrap items-center justify-center gap-2">
						<h1 class="text-3xl font-bold text-[#fff7e8] tracking-tight">{data.party.name}</h1>
						{#if data.party.abbreviation}
							<span
								class="px-2 py-0.5 rounded text-xs font-mono font-bold"
								style="background-color: {data.party.color}25; color: {data.party.color}"
							>
								{data.party.abbreviation}
							</span>
						{/if}
					</div>
					<div class="flex flex-wrap items-center justify-center gap-3 text-xs text-[#a89e8e] font-mono">
						{#if data.party.ideology}
							<span class="flex items-center gap-1">
								<FluentFlag20Filled class="size-3" />
								{data.party.ideology}
							</span>
						{/if}
						<a
							href="/state/{data.party.state.id}"
							class="flex items-center gap-1 hover:text-[#d5c4df] transition-colors"
						>
							{#if data.party.state.logo}
								<img src={data.party.state.logo} alt={data.party.state.name} class="size-4 rounded" />
							{:else}
								<FluentBuildingGovernment20Filled class="size-3" />
							{/if}
							{data.party.state.name}
						</a>
					</div>
					{#if data.party.description}
						<p class="text-sm text-[#c7bda9] max-w-md mt-2">{data.party.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="space-y-4 sm:space-y-5">
		<!-- Stats Strip -->
		<div class="grid grid-cols-3 gap-3">
			<a
				href="/party/{data.party.id}/member"
				class="panel rounded-xl p-3 sm:p-4 hover:border-[#dfceb0]/30 transition-all group"
			>
				<div class="flex items-center gap-2 mb-1.5">
					<FluentPeople20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] sm:text-xs text-[#a89e8e] font-mono uppercase tracking-wider">Members</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">{data.party.memberCount}</div>
			</a>

			<a
				href="/state/{data.party.state.id}/parliament"
				class="panel rounded-xl p-3 sm:p-4 hover:border-[#dfceb0]/30 transition-all"
			>
				<div class="flex items-center gap-2 mb-1.5">
					<FluentBuildingGovernment20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] sm:text-xs text-[#a89e8e] font-mono uppercase tracking-wider">Seats</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">{data.parliamentSeats || 0}</div>
			</a>

			<div class="panel rounded-xl p-3 sm:p-4">
				<div class="flex items-center gap-2 mb-1.5">
					<FluentCrown20Filled class="size-4" style="color: {data.party.color}" />
					<span class="text-[10px] sm:text-xs text-[#a89e8e] font-mono uppercase tracking-wider">Rank</span>
				</div>
				<div class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">#{data.partyRank || "—"}</div>
			</div>
		</div>

		<!-- Join/Leave Party -->
		{#if !data.isMember && data.canJoin}
			<div
				class="bg-[#14283f]/85 border rounded-xl p-4 sm:p-5"
				style="border-color: {data.party.color}30"
			>
				<form method="POST" action="?/join" use:enhance>
					<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div class="flex-1">
							<h3 class="text-sm sm:text-base font-bold text-[#fff7e8]">
								{data.party.autoAcceptMembers ? "Join This Party" : "Apply to Join"}
							</h3>
							<p class="text-xs text-[#a89e8e] font-mono mt-0.5">
								{data.party.autoAcceptMembers ? "Become a member instantly" : "Application reviewed by leadership"}
							</p>
						</div>
						<button
							type="submit"
							class="w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono font-bold text-sm text-white transition-all flex items-center justify-center gap-2 hover:brightness-110"
							style="background-color: {data.party.color}"
						>
							<FluentPersonAdd20Filled class="size-4" />
							{data.party.autoAcceptMembers ? "Join" : "Apply"}
						</button>
					</div>
				</form>
			</div>
		{:else if data.hasApplied}
			<div class="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
				<div class="flex items-center gap-3">
					<FluentPersonAvailable20Filled class="size-5 text-amber-400 flex-shrink-0" />
					<div>
						<span class="text-sm font-bold text-amber-300">Application Pending</span>
						<p class="text-xs text-[#a89e8e] font-mono mt-0.5">Awaiting review from party leadership</p>
					</div>
				</div>
			</div>
		{:else if data.isMember && !data.isLeader}
			<div class="panel rounded-xl p-4">
				<form method="POST" action="?/leave" use:enhance>
					<div class="flex items-center justify-between gap-3">
						<div>
							<span class="text-sm font-bold text-[#fff7e8]">Member</span>
							<p class="text-xs text-[#a89e8e] font-mono mt-0.5">
								Since {(() => {
									const d = new Date(data.memberSince!);
									const p = (n: number) => String(n).padStart(2, "0");
									return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
								})()}
							</p>
						</div>
						<button
							type="submit"
							class="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
						>
							<FluentDismiss20Filled class="size-3.5" />
							Leave
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Error/Success -->
		{#if form?.error}
			<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 font-mono">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300 font-mono">
				{form.success}
			</div>
		{/if}

		<!-- Party Leadership -->
		<div
			class="panel rounded-xl overflow-hidden"
		>
			<div class="bg-[#0e1d2f]/95 border-b border-[#dfceb0]/15 px-4 sm:px-5 py-3">
				<h2 class="text-sm font-bold text-[#e5d8c1] font-mono uppercase tracking-wide flex items-center gap-2">
					<FluentCrown20Filled class="size-4" style="color: {data.party.color}" />
					Leadership
				</h2>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.members.filter((m) => m.role === "leader") as member}
					<a
						href="/user/{member.userId}"
						class="flex items-center gap-3 p-3 panel-muted rounded-lg hover:border-[#dfceb0]/25 transition-all group"
					>
						<Logo
							src={member.user.profile.logo}
							alt={member.user.profile.name}
							placeholderIcon={FluentPeople20Filled}
							class="size-10 rounded-lg"
						/>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-bold text-[#fff7e8] group-hover:text-[#d5c4df] transition-colors truncate">
								{member.user.profile?.name}
							</p>
							<p class="text-xs font-mono mt-0.5" style="color: {data.party.color}">Party Leader</p>
						</div>
						<span class="text-[#a89e8e]/60 group-hover:text-[#a89e8e] transition-colors text-sm">→</span>
					</a>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		{#if data.isLeader}
			<div class="flex flex-wrap gap-2">
				<a
					href="/party/{data.party.id}/member"
					class="px-3 py-2 bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 rounded-lg text-[#e5d8c1] hover:text-[#fff7e8] transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentPeople20Filled class="size-3.5" />
					Members
				</a>
				<a
					href="/chat?type=party"
					class="px-3 py-2 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/20 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentChat20Filled class="size-3.5" />
					Chat
				</a>
				<a
					href="/inbox"
					class="px-3 py-2 bg-blue-950/40 hover:bg-blue-950/60 border border-blue-500/20 rounded-lg text-blue-300 hover:text-blue-200 transition-all flex items-center gap-2 text-xs font-mono"
				>
					<FluentMail20Filled class="size-3.5" />
					Broadcast
				</a>
			</div>
		{:else if data.isMember}
			<a
				href="/chat?type=party"
				class="inline-flex px-3 py-2 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/20 rounded-lg text-emerald-300 hover:text-emerald-200 transition-all items-center gap-2 text-xs font-mono"
			>
				<FluentChat20Filled class="size-3.5" />
				Party Chat
			</a>
		{/if}
	</div>
</PageContainer>
