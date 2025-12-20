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

	const { data, form } = $props();
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Party Header -->
	<div class="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
		<div
			class="h-32 relative"
			style="background: linear-gradient(135deg, {data.party.color}40 0%, {data.party.color}10 100%)"
		>
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-800/50"></div>
		</div>

		<div class="p-6 -mt-16 relative">
			<div class="flex items-start gap-6">
				<!-- Party Logo/Icon -->
				<div
					class="size-24 rounded-2xl flex items-center justify-center border-4 border-slate-800 relative z-10"
					style="background-color: {data.party.color}"
				>
					{#if data.party.logoUrl}
						<img src={data.party.logoUrl} alt={data.party.name} class="size-20 object-contain" />
					{:else}
						<FluentPeople20Filled class="size-12 text-white" />
					{/if}
				</div>

				<div class="flex-1 mt-8">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-3 mb-2">
								<h1 class="text-3xl font-bold text-white">{data.party.name}</h1>
								{#if data.party.abbreviation}
									<span
										class="px-3 py-1 rounded-lg text-sm font-semibold"
										style="background-color: {data.party.color}20; color: {data.party.color}"
									>
										{data.party.abbreviation}
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-4 text-sm text-gray-400">
								{#if data.party.ideology}
									<span class="flex items-center gap-1">
										<FluentFlag20Filled class="size-4" />
										{data.party.ideology}
									</span>
								{/if}
								<span class="flex items-center gap-1">
									<FluentBuildingGovernment20Filled class="size-4" />
									{data.party.state.name}
								</span>
								<span class="flex items-center gap-1">
									<FluentCalendar20Filled class="size-4" />
									Founded {new Date(data.party.foundedAt).toLocaleDateString()}
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
						<p class="text-gray-300 mt-4 max-w-3xl">{data.party.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {data.party.color}20">
					<FluentPeople20Filled class="size-6" style="color: {data.party.color}" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Total Members</p>
					<p class="text-2xl font-bold text-white">{data.party.memberCount}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {data.party.color}20">
					<FluentBuildingGovernment20Filled class="size-6" style="color: {data.party.color}" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Parliament Seats</p>
					<p class="text-2xl font-bold text-white">{data.parliamentSeats || 0}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {data.party.color}20">
					<FluentCrown20Filled class="size-6" style="color: {data.party.color}" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Party Rank</p>
					<p class="text-2xl font-bold text-white">#{data.partyRank || "N/A"}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Join/Leave Party -->
	{#if !data.isMember && data.canJoin}
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-6">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-white mb-1">Join This Party</h3>
						<p class="text-sm text-gray-400">Become a member and help shape the political landscape</p>
					</div>
					<button type="submit" class="btn gap-2" style="background-color: {data.party.color}; border: none;">
						<FluentPersonAdd20Filled class="size-5" />
						Join Party
					</button>
				</div>
			</form>
		</div>
	{:else if data.isMember && !data.isLeader}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<form method="POST" action="?/leave" use:enhance>
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-white mb-1">You're a Member</h3>
						<p class="text-sm text-gray-400">Active since {new Date(data.memberSince!).toLocaleDateString()}</p>
					</div>
					<button
						type="submit"
						class="btn btn-sm bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200 gap-2"
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
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{form.error}</p>
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{form.success}</p>
		</div>
	{/if}

	<!-- Party Leadership -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
			<FluentCrown20Filled class="size-5" style="color: {data.party.color}" />
			Party Leadership
		</h2>

		<div class="space-y-4">
			{#each data.members.filter((m) => m.role === "leader") as member}
				<div class="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-white/5">
					{#if member.user.profile?.avatar}
						<img
							src={member.user.profile.avatar}
							alt={member.user.profile.name || "Leader"}
							class="size-16 rounded-xl border-2"
							style="border-color: {data.party.color}40"
						/>
					{:else}
						<div
							class="size-16 rounded-xl flex items-center justify-center"
							style="background-color: {data.party.color}"
						>
							<FluentPeople20Filled class="size-8 text-white" />
						</div>
					{/if}

					<div class="flex-1">
						<a
							href="/user/{member.userId}"
							class="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
						>
							{member.user.profile?.name || member.user.email}
						</a>
						<p class="text-sm font-medium" style="color: {data.party.color}">Party Leader & Founder</p>
						<p class="text-xs text-gray-500">
							Since {new Date(member.joinedAt).toLocaleDateString()}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Party Members -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
			<FluentPeople20Filled class="size-5" style="color: {data.party.color}" />
			Party Members ({data.members.length})
		</h2>

		{#if data.members.length > 0}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each data.members.filter((m) => m.role !== "leader") as member}
					<a
						href="/user/{member.userId}"
						class="bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-all group"
					>
						{#if member.user.profile?.avatar}
							<img
								src={member.user.profile.avatar}
								alt={member.user.profile.name || "Member"}
								class="size-16 rounded-lg mb-2 mx-auto"
							/>
						{:else}
							<div
								class="size-16 rounded-lg flex items-center justify-center mb-2 mx-auto"
								style="background-color: {data.party.color}40"
							>
								<FluentPeople20Filled class="size-8" style="color: {data.party.color}" />
							</div>
						{/if}
						<p
							class="text-sm font-medium text-white text-center truncate group-hover:text-purple-400 transition-colors"
						>
							{member.user.profile?.name || member.user.email}
						</p>
						{#if member.role === "deputy"}
							<p class="text-xs text-center mt-1" style="color: {data.party.color}">Deputy</p>
						{/if}
					</a>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-gray-400">No other members yet</p>
			</div>
		{/if}
	</div>
</div>
