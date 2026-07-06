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
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import { enhance } from "$app/forms";
	import { onMount, onDestroy } from "svelte";
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";

	const { data } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;
	let showVoteAnim = $state(false);

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

		if (now < start) {
			targetDate = start;
		} else if (now < end) {
			targetDate = end;
		} else {
			return null;
		}

		const diff = targetDate.getTime() - now.getTime();
		if (diff <= 0) return null;

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		return { days, hours, minutes, seconds };
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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Command Header -->
	<div class="border-b border-purple-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div class="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
					<a href="/state/{data.state.id}" class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
						<Logo
							src={data.state.logo}
							alt={data.state.name}
							class="relative size-14 sm:size-18 rounded-lg border-2 border-purple-500/30 hover:border-purple-500/50 transition-colors"
							placeholderIcon={FluentBuildingGovernment20Filled}
							placeholderGradient="from-purple-500 to-blue-500"
						/>
					</a>
					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-2 mb-1">
							<h1
								class="text-xl sm:text-2xl font-bold tracking-wider uppercase font-mono {data.election.isInaugural
									? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400'
									: 'text-purple-400'}"
							>
								{data.election.isInaugural ? "Founding" : "Parliamentary"} Election
							</h1>
							{#if hasEnded}
								<span
									class="px-2 py-1 bg-slate-500/20 border border-slate-400/40 rounded text-slate-300 font-bold text-xs font-mono"
								>
									CONCLUDED
								</span>
							{/if}
						</div>
						<a
							href="/state/{data.state.id}"
							class="text-sm text-slate-400 hover:text-purple-400 transition-colors font-mono"
						>
							{data.state.name}
						</a>
					</div>
				</div>
			</div>

			<!-- Founding Election Banner -->
			{#if data.election.isInaugural}
				<div
					class="mt-4 sm:mt-6 relative overflow-hidden bg-gradient-to-r from-amber-950/50 via-yellow-900/25 to-amber-950/50 border border-amber-500/30 rounded-lg p-4 sm:p-5 text-center"
				>
					<div
						class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.12),_transparent_70%)]"
					></div>
					<div class="relative flex items-center justify-center gap-2 text-amber-300 font-mono">
						<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
						<span class="text-sm sm:text-lg font-bold uppercase tracking-[0.2em]">A Nation Is Born</span>
						<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
					</div>
					<p class="relative mt-2 text-xs sm:text-sm text-amber-200/70 font-mono">
						The first free election of the independent state of
						<span class="text-amber-200 font-bold">{data.state.name}</span>
					</p>
				</div>
			{/if}

			<!-- Countdown Timer -->
			{#if countdown}
				<div
					class="mt-4 sm:mt-6 bg-gradient-to-r from-purple-950/50 to-slate-950/50 border border-purple-500/20 rounded-lg p-3 sm:p-4"
				>
					<div
						class="text-purple-400 font-mono text-xs sm:text-sm font-medium uppercase tracking-wide text-center mb-2 sm:mb-3"
					>
						{!hasStarted ? "Voting Opens In" : "Voting Closes In"}
					</div>
					<div class="flex items-center justify-center gap-2 sm:gap-3">
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-purple-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-purple-500/20"
							>
								{String(countdown.days).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">DAYS</div>
						</div>
						<div class="text-xl sm:text-2xl font-bold text-purple-500/50">:</div>
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-purple-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-purple-500/20"
							>
								{String(countdown.hours).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">HRS</div>
						</div>
						<div class="text-xl sm:text-2xl font-bold text-purple-500/50">:</div>
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-purple-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-purple-500/20"
							>
								{String(countdown.minutes).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">MIN</div>
						</div>
						<div class="text-xl sm:text-2xl font-bold text-purple-500/50">:</div>
						<div class="text-center">
							<div
								class="text-2xl sm:text-4xl font-mono font-bold text-purple-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-purple-500/20"
							>
								{String(countdown.seconds).padStart(2, "0")}
							</div>
							<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">SEC</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
		<!-- Voter Status -->
		{#if !data.userResidence}
			<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-center">
				<p class="text-sm text-red-300 font-mono">You must be a resident of {data.state.name} to vote</p>
			</div>
		{:else if data.userVote && isActive}
			<div class="bg-green-950/30 border border-green-500/30 rounded-lg p-3 text-center">
				<div class="flex items-center justify-center gap-2 text-green-300 font-mono text-sm">
					<FluentCheckmark20Filled class="size-4" />
					<span>Vote cast. You can change your vote until the election ends.</span>
				</div>
			</div>
		{:else if canVote}
			<div class="bg-purple-950/30 border border-purple-500/30 rounded-lg p-3 text-center">
				<p class="text-sm text-purple-300 font-mono">
					{data.election.isInaugural ? "Cast your vote in the inaugural election" : "Cast your vote below"}
				</p>
			</div>
		{/if}

		<!-- Stats Strip -->
		<div class="grid grid-cols-3 gap-3 text-center">
			<div class="bg-purple-950/30 border border-purple-500/20 rounded-lg p-3 sm:p-4">
				<div class="text-xl sm:text-2xl font-bold text-purple-400 font-mono">{data.totalVotes.toLocaleString()}</div>
				<div class="text-[10px] sm:text-xs text-purple-400/60 font-mono uppercase tracking-wider">Votes</div>
			</div>
			<div class="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3 sm:p-4">
				<div class="text-xl sm:text-2xl font-bold text-blue-400 font-mono">{data.parties.length}</div>
				<div class="text-[10px] sm:text-xs text-blue-400/60 font-mono uppercase tracking-wider">Parties</div>
			</div>
			<div class="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 sm:p-4">
				<div class="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">{data.election.totalSeats}</div>
				<div class="text-[10px] sm:text-xs text-emerald-400/60 font-mono uppercase tracking-wider">Seats</div>
			</div>
		</div>

		<!-- Parties -->
		{#if data.parties.length === 0}
			<div class="bg-slate-900/30 border border-slate-700/30 rounded-xl p-8 sm:p-12 text-center">
				<div class="text-4xl sm:text-6xl mb-4 opacity-20">🗳️</div>
				<p class="text-lg text-slate-400 font-mono">No political parties registered</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each sortedParties as party, index}
					{@const votes = data.votesByParty[party.id] || 0}
					{@const percentage = getVotePercentage(party.id)}
					{@const isUserVote = data.userVote === party.id}
					{@const hasEnoughMembers = party.memberCount >= 3}
					{@const canVoteForParty = canVote && hasEnoughMembers}

					<div
						class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border rounded-xl overflow-hidden transition-all {isUserVote
							? 'border-green-500/50 ring-1 ring-green-500/20'
							: 'border-slate-700/50 hover:border-slate-600/60'}"
					>
						<div class="p-4 sm:p-5">
							<div class="flex items-start gap-4">
								<!-- Rank + Logo -->
								<div class="flex flex-col items-center gap-2 flex-shrink-0">
									{#if hasStarted && index < 3}
										<div
											class="size-6 rounded-full flex items-center justify-center font-bold text-xs font-mono"
											class:bg-yellow-500={index === 0}
											class:text-yellow-900={index === 0}
											class:bg-gray-400={index === 1}
											class:text-gray-900={index === 1}
											class:bg-orange-600={index === 2}
											class:text-orange-100={index === 2}
										>
											{index + 1}
										</div>
									{/if}
									<a href="/party/{party.id}" class="group/logo">
										{#if party.logo}
											<Logo
												src={party.logo}
												alt={party.name}
												class="size-14 sm:size-16 rounded-lg border-2 border-slate-700/50 group-hover/logo:border-purple-500/50 transition-colors"
												placeholderIcon={FluentFlag20Filled}
											/>
										{:else}
											<div
												class="size-14 sm:size-16 rounded-lg flex items-center justify-center text-lg font-bold text-white border-2 border-slate-700/50"
												style="background: linear-gradient(135deg, {party.color}, {party.color}dd)"
											>
												{party.abbreviation || party.name.substring(0, 2)}
											</div>
										{/if}
									</a>
								</div>

								<!-- Party Info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-3 mb-2">
										<div class="flex-1 min-w-0">
											<a href="/party/{party.id}" class="group/link">
												<h3
													class="text-lg sm:text-xl font-bold text-white group-hover/link:text-purple-400 transition-colors flex items-center gap-2 truncate"
												>
													{party.name}
													{#if isUserVote}
														<FluentCheckmark20Filled class="size-4 text-green-400 flex-shrink-0" />
													{/if}
												</h3>
											</a>
											{#if party.ideology}
												<span
													class="inline-block px-2 py-0.5 rounded text-xs font-mono mt-1"
													style="background-color: {party.color}20; color: {party.color}; border: 1px solid {party.color}30"
												>
													{party.ideology}
												</span>
											{/if}
										</div>

										{#if hasStarted}
											<div class="text-right flex-shrink-0">
												<div class="text-xl sm:text-2xl font-bold text-white font-mono">{votes}</div>
												<div class="text-xs text-slate-500 font-mono">{percentage.toFixed(1)}%</div>
											</div>
										{/if}
									</div>

									<div class="flex items-center gap-4 text-sm flex-wrap mt-2">
										{#if party.leader}
											<a
												href="/user/{party.leader.accountId}"
												class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
											>
												<Logo
													src={party.leader.logo}
													alt={party.leader.name}
													placeholderIcon={FluentPerson20Filled}
													class="size-6 rounded"
												/>
												<span class="text-xs font-mono">{party.leader.name}</span>
											</a>
										{/if}
										<span
											class="text-xs font-mono flex items-center gap-1.5"
											class:text-slate-500={hasEnoughMembers}
											class:text-red-400={!hasEnoughMembers}
										>
											<FluentPeople20Filled class="size-3.5" />
											{party.memberCount}
											{#if !hasEnoughMembers}
												<span class="text-red-400/70">(need {3 - party.memberCount} more)</span>
											{/if}
										</span>
									</div>

									<!-- Vote Bar -->
									{#if hasStarted && data.totalVotes > 0}
										<div class="mt-3">
											<div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-700 ease-out"
													style="width: {percentage}%; background: {party.color}"
												></div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Vote Action -->
						{#if data.userResidence}
							<div class="border-t border-slate-700/40 px-4 sm:px-5 py-3 bg-slate-950/30">
								{#if !hasEnoughMembers}
									<p class="text-xs text-red-400/70 text-center font-mono">Needs 3+ members to participate</p>
								{:else}
									<form
										method="POST"
										action="?/vote"
										use:enhance={() => {
											return async ({ update, result }) => {
												await update();
												if (result.type === "success") showVoteAnim = true;
											};
										}}
										class="w-full"
									>
										<input type="hidden" name="partyId" value={party.id} />
										<button
											type="submit"
											disabled={!canVoteForParty}
											class="w-full py-2 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
											class:bg-green-600={isUserVote && canVote}
											class:hover:bg-green-500={isUserVote && canVote}
											class:text-white={true}
											style:background={!isUserVote && canVoteForParty ? party.color : ""}
											style:border-color={party.color}
										>
											{#if !canVote && !hasStarted}
												VOTING NOT OPEN
											{:else if !canVote && hasEnded}
												VOTING CLOSED
											{:else if isUserVote}
												✓ VOTED
											{:else}
												VOTE
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

{#if showVoteAnim}
	<ThreeAnimation variant="vote" onComplete={() => (showVoteAnim = false)} />
{/if}
