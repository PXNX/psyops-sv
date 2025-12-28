<script lang="ts">
	import Logo from "$lib/component/Logo.svelte";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import { enhance } from "$app/forms";
	import { onMount, onDestroy } from "svelte";

	const { data } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;

	onMount(() => {
		interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	const isActive = $derived(
		currentTime >= new Date(data.election.startDate) && currentTime <= new Date(data.election.endDate)
	);
	const hasEnded = $derived(currentTime > new Date(data.election.endDate));
	const hasStarted = $derived(currentTime >= new Date(data.election.startDate));
	const canVote = $derived(data.userResidence && isActive);

	function getCountdown() {
		const now = currentTime;
		const start = new Date(data.election.startDate);
		const end = new Date(data.election.endDate);

		let targetDate: Date;
		let label: string;

		if (now < start) {
			targetDate = start;
			label = "until voting opens";
		} else if (now < end) {
			targetDate = end;
			label = "until voting closes";
		} else {
			return null;
		}

		const diff = targetDate.getTime() - now.getTime();
		if (diff <= 0) return null;

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		return { days, hours, minutes, seconds, label };
	}

	const countdown = $derived(getCountdown());

	function getVotePercentage(partyId: string) {
		if (data.totalVotes === 0) return 0;
		return ((data.votesByParty[partyId] || 0) / data.totalVotes) * 100;
	}

	const sortedParties = $derived(
		[...data.parties].sort((a, b) => (data.votesByParty[b.id] || 0) - (data.votesByParty[a.id] || 0))
	);
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}/parliament" class="text-sm text-gray-400 hover:text-white mb-2 inline-block">
			← Back to Parliament
		</a>
		<div class="flex items-center gap-4">
			<a href="/state/{data.state.id}">
				<Logo
					src={data.state.logo}
					alt={data.state.name}
					class="size-16 rounded-xl border-2 border-white/10 hover:border-white/30 transition-all shadow-lg"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-amber-500 to-rose-500"
				/>
			</a>

			<div class="flex-1">
				<h1 class="text-3xl font-bold text-white flex items-center gap-3">
					<FluentVote20Filled class="size-8 text-purple-400" />
					{data.election.isInaugural ? "Inaugural" : "Parliamentary"} Elections
				</h1>
				<a href="/state/{data.state.id}" class="text-lg text-gray-400 hover:text-white mt-1 inline-block">
					{data.state.name}
				</a>
			</div>

			<!-- Status Badge -->
			{#if isActive}
				<div class="bg-green-600/20 border border-green-500/30 rounded-lg px-4 py-2">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2 rounded-full bg-green-500 animate-pulse"></div>
						<p class="text-sm font-semibold text-green-400">Live</p>
					</div>
					<p class="text-xs text-gray-400">Voting Active</p>
				</div>
			{:else if hasEnded}
				<div class="bg-slate-700/50 border border-slate-600/30 rounded-lg px-4 py-2">
					<div class="flex items-center gap-2 mb-1">
						<FluentCheckmark20Filled class="size-4 text-gray-400" />
						<p class="text-sm font-semibold text-gray-400">Concluded</p>
					</div>
					<p class="text-xs text-gray-500">Final Results</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Countdown -->
	{#if countdown}
		<div
			class="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6"
		>
			<div class="text-center">
				<p class="text-sm text-blue-300 font-medium mb-3">
					{!hasStarted ? "⏰ Election starts soon" : "⏰ Voting closes soon"}
				</p>
				<div class="flex items-center justify-center gap-3">
					<div class="bg-slate-900/50 rounded-lg p-3 min-w-[70px]">
						<div class="text-3xl font-bold text-white tabular-nums">{countdown.days}</div>
						<div class="text-xs text-gray-400 mt-1">Days</div>
					</div>
					<div class="text-2xl text-gray-500">:</div>
					<div class="bg-slate-900/50 rounded-lg p-3 min-w-[70px]">
						<div class="text-3xl font-bold text-white tabular-nums">{countdown.hours.toString().padStart(2, "0")}</div>
						<div class="text-xs text-gray-400 mt-1">Hours</div>
					</div>
					<div class="text-2xl text-gray-500">:</div>
					<div class="bg-slate-900/50 rounded-lg p-3 min-w-[70px]">
						<div class="text-3xl font-bold text-white tabular-nums">
							{countdown.minutes.toString().padStart(2, "0")}
						</div>
						<div class="text-xs text-gray-400 mt-1">Minutes</div>
					</div>
					<div class="text-2xl text-gray-500">:</div>
					<div class="bg-slate-900/50 rounded-lg p-3 min-w-[70px]">
						<div class="text-3xl font-bold text-white tabular-nums">
							{countdown.seconds.toString().padStart(2, "0")}
						</div>
						<div class="text-xs text-gray-400 mt-1">Seconds</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Voter Status -->
	{#if !data.userResidence}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4 text-center">
			<p class="text-sm text-red-300">⚠️ You must be a resident of {data.state.name} to vote</p>
		</div>
	{:else if data.userVote && isActive}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4 text-center">
			<div class="flex items-center justify-center gap-2 text-green-300">
				<FluentCheckmark20Filled class="size-5" />
				<span class="text-sm font-medium">You have voted! You can change your vote until the election ends.</span>
			</div>
		</div>
	{:else if canVote}
		<div class="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
			<p class="text-sm text-blue-300 font-medium">
				{data.election.isInaugural ? "🎉 Cast your vote in the inaugural election!" : "Cast your vote below"}
			</p>
		</div>
	{/if}

	<!-- Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-gradient-to-br from-purple-600/20 to-purple-700/10 rounded-xl border border-purple-500/20 p-5">
			<p class="text-sm text-purple-300 mb-1 font-medium">Total Votes</p>
			<p class="text-4xl font-bold text-white">{data.totalVotes.toLocaleString()}</p>
		</div>
		<div class="bg-gradient-to-br from-blue-600/20 to-blue-700/10 rounded-xl border border-blue-500/20 p-5">
			<p class="text-sm text-blue-300 mb-1 font-medium">Parties</p>
			<p class="text-4xl font-bold text-white">{data.parties.length}</p>
		</div>
		<div class="bg-gradient-to-br from-green-600/20 to-green-700/10 rounded-xl border border-green-500/20 p-5">
			<p class="text-sm text-green-300 mb-1 font-medium">Seats</p>
			<p class="text-4xl font-bold text-white">{data.election.totalSeats}</p>
		</div>
	</div>

	<!-- Parties -->
	<div class="space-y-4">
		{#if data.parties.length === 0}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-12 text-center">
				<FluentPeople20Filled class="size-12 text-gray-600 mx-auto mb-3" />
				<p class="text-gray-400 text-lg">No political parties registered yet</p>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each sortedParties as party, index}
					{@const votes = data.votesByParty[party.id] || 0}
					{@const percentage = getVotePercentage(party.id)}
					{@const isUserVote = data.userVote === party.id}
					{@const hasEnoughMembers = party.memberCount >= 3}
					{@const canVoteForParty = canVote && hasEnoughMembers}

					<div
						class="group bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border overflow-hidden transition-all relative"
						class:border-white-5={!isUserVote}
						class:border-green-500-50={isUserVote}
						class:ring-2={isUserVote}
						class:ring-green-500-30={isUserVote}
					>
						<!-- Position Badge -->
						{#if hasStarted && index < 3}
							<div class="absolute top-4 left-4 z-10">
								<div
									class="size-8 rounded-full flex items-center justify-center font-bold text-sm"
									class:bg-yellow-500={index === 0}
									class:text-yellow-900={index === 0}
									class:bg-gray-400={index === 1}
									class:text-gray-900={index === 1}
									class:bg-orange-600={index === 2}
									class:text-orange-100={index === 2}
								>
									{index + 1}
								</div>
							</div>
						{/if}

						<div class="p-6">
							<div class="flex items-start gap-5">
								<!-- Party Logo -->
								<a href="/party/{party.id}" class="flex-shrink-0 group/logo">
									{#if party.logo}
										<Logo
											src={party.logo}
											alt={party.name}
											class="size-20 rounded-xl border-3 shadow-lg transition-transform group-hover/logo:scale-105"
											placeholderIcon={FluentFlag20Filled}
											placeholderGradient="from-{party.color}/80 to-{party.color}/60"
										/>
									{:else}
										<div
											class="size-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform group-hover/logo:scale-105"
											style="background: linear-gradient(135deg, {party.color}, {party.color}dd)"
										>
											{party.abbreviation || party.name.substring(0, 2)}
										</div>
									{/if}
								</a>

								<!-- Party Info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-4 mb-3">
										<div class="flex-1">
											<a href="/party/{party.id}" class="group/link">
												<h3
													class="text-2xl font-bold text-white group-hover/link:text-blue-400 transition-colors flex items-center gap-2"
												>
													{party.name}
													{#if isUserVote}
														<span class="badge badge-sm bg-green-600/30 text-green-300 border-green-500/50">✓</span>
													{/if}
													<FluentChevronRight20Filled
														class="size-5 opacity-0 group-hover/link:opacity-100 transition-opacity"
													/>
												</h3>
											</a>
											{#if party.abbreviation}
												<p class="text-sm text-gray-400 font-medium">{party.abbreviation}</p>
											{/if}
										</div>

										{#if hasStarted}
											<div class="text-right bg-slate-700/50 rounded-lg px-4 py-2">
												<p class="text-3xl font-bold text-white">{votes}</p>
												<p class="text-xs text-gray-400 font-medium">{percentage.toFixed(1)}%</p>
											</div>
										{/if}
									</div>

									{#if party.ideology}
										<span
											class="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3"
											style="background-color: {party.color}25; color: {party.color}; border: 1px solid {party.color}40"
										>
											{party.ideology}
										</span>
									{/if}

									{#if party.description}
										<p class="text-sm text-gray-300 leading-relaxed mb-4">{party.description}</p>
									{/if}

									<div class="flex items-center gap-5 text-sm flex-wrap">
										{#if party.leader}
											<a
												href="/user/{party.leader.accountId}"
												class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
											>
												<Logo
													src={party.leader.logo}
													alt={party.leader.name}
													placeholderIcon={FluentPerson20Filled}
													class="ring-2 ring-white/10 hover:ring-white/30 transition-all"
												/>
												<span class="font-medium text-white">{party.leader.name}</span>
											</a>
										{/if}
										<span class="text-gray-400 flex items-center gap-1.5" class:text-red-400={!hasEnoughMembers}>
											<FluentPeople20Filled class="size-4" />
											<span class="font-medium">{party.memberCount} member{party.memberCount !== 1 ? "s" : ""}</span>
											{#if !hasEnoughMembers}
												<span class="text-xs bg-red-600/20 border border-red-500/30 px-2 py-0.5 rounded">
													Needs {3 - party.memberCount} more
												</span>
											{/if}
										</span>
									</div>
								</div>
							</div>

							<!-- Vote Progress Bar -->
							{#if hasStarted && data.totalVotes > 0}
								<div class="mt-5">
									<div class="w-full bg-slate-700/50 rounded-full h-4 overflow-hidden shadow-inner">
										<div
											class="h-4 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
											style="width: {percentage}%; background: linear-gradient(90deg, {party.color}, {party.color}cc)"
										>
											<div
												class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
											></div>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Vote Button -->
						{#if data.userResidence}
							<div class="border-t border-white/10 p-4 bg-slate-900/30">
								{#if !hasEnoughMembers}
									<p class="text-sm text-red-400 text-center py-2">
										⚠️ This party needs at least 3 members to participate
									</p>
								{:else}
									<form method="POST" action="?/vote" use:enhance class="w-full">
										<input type="hidden" name="partyId" value={party.id} />
										<button
											type="submit"
											disabled={!canVoteForParty}
											class="btn w-full gap-2 font-semibold transition-all"
											class:bg-green-600={isUserVote && canVote}
											class:hover:bg-green-500={isUserVote && canVote}
											class:btn-disabled={!canVoteForParty}
											class:opacity-50={!canVoteForParty}
											style:background={!isUserVote && canVoteForParty ? party.color : ""}
											style:border-color={party.color}
											class:border-2={!isUserVote && canVoteForParty}
											class:text-white={true}
										>
											{#if !canVote && !hasStarted}
												<FluentClock20Filled class="size-5" />
												Voting Not Yet Open
											{:else if !canVote && hasEnded}
												<FluentCheckmark20Filled class="size-5" />
												Voting Closed
											{:else if isUserVote}
												<FluentCheckmark20Filled class="size-5" />
												Voted
											{:else}
												<FluentVote20Filled class="size-5" />
												Vote
											{/if}
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}
	.animate-shimmer {
		animation: shimmer 2s infinite;
	}
</style>
