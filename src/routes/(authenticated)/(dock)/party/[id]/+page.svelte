<!-- src/routes/party/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentPersonAvailable20Filled from "~icons/fluent/person-available-20-filled";
	import Logo from "$lib/component/Logo.svelte";

	const { data, form } = $props();
</script>

<svelte:head>
	<title>{data.party.name}</title>
	<meta name="description" content={data.party.description || `${data.party.name} (${data.party.abbreviation || ''}) political party in ${data.party.state.name} on PsyOps.`} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.party.name} />
	<meta property="og:description" content={data.party.description || `${data.party.name} (${data.party.abbreviation || ''}) political party in ${data.party.state.name} on PsyOps.`} />
	{#if data.party.logoUrl}
		<meta property="og:image" content={data.party.logoUrl} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.party.name} />
	<meta name="twitter:description" content={data.party.description || `${data.party.name} (${data.party.abbreviation || ''}) political party in ${data.party.state.name} on PsyOps.`} />
	{#if data.party.logoUrl}
		<meta name="twitter:image" content={data.party.logoUrl} />
	{/if}
</svelte:head>

<div class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
	<!-- Party Header -->
	<div
		class="relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
		style="background: linear-gradient(135deg, {data.party.color}20 0%, {data.party.color}10 100%);"
	>
		<div
			class="absolute inset-0 opacity-10"
			style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.party.color}30 35px, {data.party.color}30 70px);"
		></div>
		<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
		<div class="relative z-10 p-5 sm:p-8">
			<div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
				<!-- Party Logo/Icon -->
				<div class="ring-4 ring-white/10 rounded-2xl shrink-0">
					<div
						class="size-20 sm:size-24 rounded-2xl flex items-center justify-center"
						style="background-color: {data.party.color}"
					>
						{#if data.party.logoUrl}
							<img src={data.party.logoUrl} alt={data.party.name} class="size-16 sm:size-20 object-contain" />
						{:else}
							<FluentPeople20Filled class="size-10 sm:size-12 text-white" />
						{/if}
					</div>
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex flex-col sm:flex-row items-start justify-between gap-3 mb-2">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2 mb-1">
								<h1 class="text-2xl sm:text-3xl font-bold text-white">{data.party.name}</h1>
								{#if data.party.abbreviation}
									<span
										class="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
										style="background-color: {data.party.color}30; color: {data.party.color}"
									>
										{data.party.abbreviation}
									</span>
								{/if}
							</div>
							<div class="flex flex-wrap items-center gap-3 text-xs text-gray-400">
								{#if data.party.ideology}
									<span class="flex items-center gap-1">
										<FluentFlag20Filled class="size-3.5" />
										{data.party.ideology}
									</span>
								{/if}
								<a
									href="/state/{data.party.state.id}"
									class="flex items-center gap-1 hover:text-purple-400 transition-colors"
								>
									{#if data.party.state.logo}
										<img src={data.party.state.logo} alt={data.party.state.name} class="size-4 rounded" />
									{:else}
										<FluentBuildingGovernment20Filled class="size-3.5" />
									{/if}
									{data.party.state.name}
								</a>
								<span class="flex items-center gap-1">
									<FluentCalendar20Filled class="size-3.5" />
									Founded {new Date(data.party.foundedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
								</span>
							</div>
						</div>
						{#if data.isLeader}
							<a
								href="/party/{data.party.id}/edit"
								class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
							>
								<FluentEdit20Filled class="size-4" />
								Edit Party
							</a>
						{/if}
					</div>
					{#if data.party.description}
						<p class="text-sm text-gray-300 mt-2 leading-relaxed">{data.party.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-2 sm:gap-4">
		<a
			href="/party/{data.party.id}/member"
			class="bg-slate-800/50 rounded-lg sm:rounded-xl border border-white/5 p-3 sm:p-5 hover:bg-slate-700/50 transition-colors"
		>
			<div class="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
				<div
					class="size-10 sm:size-12 rounded-lg flex items-center justify-center shrink-0"
					style="background-color: {data.party.color}20"
				>
					<FluentPeople20Filled class="size-5 sm:size-6" style="color: {data.party.color}" />
				</div>
				<div class="text-center sm:text-left">
					<p class="text-[10px] sm:text-xs text-gray-400">Members</p>
					<p class="text-xl sm:text-2xl font-bold text-white">{data.party.memberCount}</p>
				</div>
			</div>
		</a>

		<a
			href="/state/{data.party.state.id}/parliament"
			class="bg-slate-800/50 rounded-lg sm:rounded-xl border border-white/5 p-3 sm:p-5 hover:bg-slate-700/50 transition-colors"
		>
			<div class="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
				<div
					class="size-10 sm:size-12 rounded-lg flex items-center justify-center shrink-0"
					style="background-color: {data.party.color}20"
				>
					<FluentBuildingGovernment20Filled class="size-5 sm:size-6" style="color: {data.party.color}" />
				</div>
				<div class="text-center sm:text-left">
					<p class="text-[10px] sm:text-xs text-gray-400">Seats</p>
					<p class="text-xl sm:text-2xl font-bold text-white">{data.parliamentSeats || 0}</p>
				</div>
			</div>
		</a>

		<div class="bg-slate-800/50 rounded-lg sm:rounded-xl border border-white/5 p-3 sm:p-5">
			<div class="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
				<div
					class="size-10 sm:size-12 rounded-lg flex items-center justify-center shrink-0"
					style="background-color: {data.party.color}20"
				>
					<FluentCrown20Filled class="size-5 sm:size-6" style="color: {data.party.color}" />
				</div>
				<div class="text-center sm:text-left">
					<p class="text-[10px] sm:text-xs text-gray-400">Rank</p>
					<p class="text-xl sm:text-2xl font-bold text-white">#{data.partyRank || "N/A"}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Join/Leave Party -->
	{#if !data.isMember && data.canJoin}
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 sm:p-6">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div class="flex-1">
						<h3 class="text-base sm:text-lg font-semibold text-white mb-1">
							{data.party.autoAcceptMembers ? "Join This Party" : "Apply to Join"}
						</h3>
						<p class="text-xs sm:text-sm text-gray-400">
							{#if data.party.autoAcceptMembers}
								Become a member and help shape the political landscape
							{:else}
								Submit an application to join this party. Leadership will review your request.
							{/if}
						</p>
					</div>
					<button
						type="submit"
						class="btn btn-sm sm:btn-md w-full sm:w-auto gap-2"
						style="background-color: {data.party.color}; border: none;"
					>
						<FluentPersonAdd20Filled class="size-4 sm:size-5" />
						{data.party.autoAcceptMembers ? "Join Party" : "Apply"}
					</button>
				</div>
			</form>
		</div>
	{:else if data.hasApplied}
		<div class="bg-orange-600/10 border border-orange-500/20 rounded-xl p-4 sm:p-6">
			<div class="flex items-start gap-3">
				<FluentPersonAvailable20Filled class="size-6 sm:size-8 text-orange-400 shrink-0" />
				<div>
					<h3 class="text-base sm:text-lg font-semibold text-white mb-1">Application Pending</h3>
					<p class="text-xs sm:text-sm text-gray-400">
						Your membership application is awaiting review from party leadership.
					</p>
				</div>
			</div>
		</div>
	{:else if data.isMember && !data.isLeader}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4 sm:p-6">
			<form method="POST" action="?/leave" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h3 class="text-base sm:text-lg font-semibold text-white mb-1">You're a Member</h3>
						<p class="text-xs sm:text-sm text-gray-400">
							Active since {new Date(data.memberSince!).toLocaleDateString()}
						</p>
					</div>
					<button
						type="submit"
						class="btn btn-sm w-full sm:w-auto bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200 gap-2"
					>
						<FluentDismiss20Filled class="size-4" />
						Leave Party
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Error/Success Messages -->
	{#if form?.error}
		<div class="alert alert-error text-sm">
			<p>{form.error}</p>
		</div>
	{/if}
	{#if form?.success}
		<div class="alert alert-success text-sm">
			<p>{form.success}</p>
		</div>
	{/if}

	<!-- Party Leadership -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4 sm:p-6">
		<h2 class="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
			<FluentCrown20Filled class="size-4 sm:size-5" style="color: {data.party.color}" />
			Party Leadership
		</h2>

		<div class="space-y-3 sm:space-y-4">
			{#each data.members.filter((m) => m.role === "leader") as member}
				<div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-700/30 rounded-lg border border-white/5">
					<Logo src={member.user.profile.logo} alt={member.user.profile.name} placeholderIcon={FluentPeople20Filled} />

					<div class="flex-1 min-w-0">
						<a
							href="/user/{member.userId}"
							class="text-base sm:text-lg font-semibold text-white hover:text-purple-400 transition-colors truncate block"
						>
							{member.user.profile?.name}
						</a>
						<p class="text-xs sm:text-sm font-medium truncate" style="color: {data.party.color}">Party Leader</p>
						<p class="text-[10px] sm:text-xs text-gray-500">
							Since {new Date(member.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Action Buttons -->
	{#if data.isLeader}
		<div class="flex flex-col sm:flex-row gap-2">
			<a
				href="/party/{data.party.id}/edit"
				class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
			>
				<FluentEdit20Filled class="size-4" />
				Edit Party
			</a>
			<a
				href="/chat?type=party"
				class="btn btn-sm bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300 hover:text-emerald-200 gap-2"
			>
				<FluentChat20Filled class="size-4" />
				Party Chat
			</a>
			<a
				href="/inbox"
				class="btn btn-sm bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30 text-blue-300 hover:text-blue-200 gap-2"
			>
				<FluentMail20Filled class="size-4" />
				Broadcast
			</a>
		</div>
	{:else if data.isMember}
		<a
			href="/chat?type=party"
			class="btn btn-sm bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300 hover:text-emerald-200 gap-2 w-full sm:w-auto"
		>
			<FluentChat20Filled class="size-4" />
			Party Chat
		</a>
	{/if}
</div>
