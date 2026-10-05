<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
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
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";

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

<PageContainer maxWidth="5xl">
	<!-- Hero -->
	<div class="panel rounded-sm p-5 space-y-5">
		<div class="flex items-center gap-4">
			<a href="/state/{data.state.id}" class="flex-shrink-0">
				<Logo
					src={data.state.logo}
					alt={data.state.name}
					class="size-14 sm:size-18 rounded-sm border border-[#dfceb0]/15 hover:border-[#e6a527]/55 transition-colors"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-[#315d8d] to-[#315d8d]"
				/>
			</a>
			<div class="flex-1 min-w-0">
				<div class="flex flex-wrap items-center gap-2 mb-1">
					<h1 class="text-3xl font-bold {data.election.isInaugural ? 'text-[#f7c56b]' : 'text-[#fff7e8]'}">
						{data.election.isInaugural ? "Founding" : "Parliamentary"} Election
					</h1>
					{#if hasEnded}
						<Badge tone="neutral">CONCLUDED</Badge>
					{/if}
				</div>
				<a href="/state/{data.state.id}" class="text-sm text-[#a89e8e] hover:text-[#f2c463] transition-colors">
					{data.state.name}
				</a>
			</div>
		</div>

		<!-- Founding Election Banner -->
		{#if data.election.isInaugural}
			<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-4 sm:p-5 text-center">
				<div class="flex items-center justify-center gap-2 text-[#f7c56b]">
					<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
					<span class="text-sm sm:text-lg font-bold uppercase tracking-[0.2em]">A Nation Is Born</span>
					<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
				</div>
				<p class="mt-2 text-xs sm:text-sm text-[#ffe2a4]/80">
					The first free election of the independent state of
					<span class="text-[#ffe2a4] font-bold">{data.state.name}</span>
				</p>
			</div>
		{/if}

		<!-- Countdown Timer -->
		{#if countdown}
			<div class="panel-muted rounded-sm p-3 sm:p-4">
				<div class="text-[10px] sm:text-xs text-[#a89e8e] uppercase tracking-wide text-center mb-2 sm:mb-3">
					{!hasStarted ? "Voting Opens In" : "Voting Closes In"}
				</div>
				<div class="flex items-center justify-center gap-2 sm:gap-3">
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#fff7e8] bg-[#0d1d31] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#dfceb0]/15"
						>
							{String(countdown.days).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1 sm:mt-1.5">DAYS</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a89e8e]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#fff7e8] bg-[#0d1d31] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#dfceb0]/15"
						>
							{String(countdown.hours).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1 sm:mt-1.5">HRS</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a89e8e]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#fff7e8] bg-[#0d1d31] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#dfceb0]/15"
						>
							{String(countdown.minutes).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1 sm:mt-1.5">MIN</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a89e8e]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#fff7e8] bg-[#0d1d31] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#dfceb0]/15"
						>
							{String(countdown.seconds).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide mt-1 sm:mt-1.5">SEC</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Voter Status -->
	{#if !data.userResidence}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center justify-center gap-3">
			<p class="text-sm">You must be a resident of {data.state.name} to vote</p>
		</div>
	{:else if data.userVote && isActive}
		<div
			class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center justify-center gap-3"
		>
			<FluentCheckmark20Filled class="size-4" />
			<span class="text-sm">Vote cast. You can change your vote until the election ends.</span>
		</div>
	{:else if canVote}
		<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm p-4 text-center">
			<p class="text-sm text-[#d5c4df]">
				{data.election.isInaugural ? "Cast your vote in the inaugural election" : "Cast your vote below"}
			</p>
		</div>
	{/if}

	<!-- Stats Strip -->
	<div class="grid grid-cols-3 gap-3">
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentVote20Filled class="size-4 text-[#b7a0c5] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Votes</p>
				<p class="text-sm sm:text-xl font-bold text-[#fff7e8] font-mono truncate">{data.totalVotes.toLocaleString()}</p>
			</div>
		</div>
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentFlag20Filled class="size-4 text-[#7ba0c8] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Parties</p>
				<p class="text-sm sm:text-xl font-bold text-[#fff7e8] truncate">{data.parties.length}</p>
			</div>
		</div>
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentPeople20Filled class="size-4 text-[#8fae88] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Seats</p>
				<p class="text-sm sm:text-xl font-bold text-[#fff7e8] truncate">{data.election.totalSeats}</p>
			</div>
		</div>
	</div>

	<!-- Parties -->
	{#if data.parties.length === 0}
		<div class="panel-muted rounded-sm p-8 sm:p-12 text-center">
			<div class="text-4xl sm:text-6xl mb-4 opacity-20">🗳️</div>
			<p class="text-lg text-[#a89e8e]">No political parties registered</p>
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
					class="panel rounded-sm overflow-hidden transition-colors {isUserVote
						? 'border-[#8fae88]/50 ring-1 ring-[#8fae88]/20'
						: 'hover:border-[#dfceb0]/25'}"
				>
					<div class="p-4 sm:p-5">
						<div class="flex items-start gap-4">
							<!-- Rank + Logo -->
							<div class="flex flex-col items-center gap-2 flex-shrink-0">
								{#if hasStarted && index < 3}
									<div
										class="size-6 rounded-full flex items-center justify-center font-bold text-xs {index === 0
											? 'bg-[#e6a527] text-[#172a45]'
											: index === 1
												? 'bg-[#a89e8e] text-[#172a45]'
												: 'bg-[#8c6a43] text-[#fff7e8]'}"
									>
										{index + 1}
									</div>
								{/if}
								<a href="/party/{party.id}" class="group/logo">
									{#if party.logo}
										<Logo
											src={party.logo}
											alt={party.name}
											class="size-14 sm:size-16 rounded-sm border border-[#dfceb0]/20 group-hover/logo:border-[#e6a527]/55 transition-colors"
											placeholderIcon={FluentFlag20Filled}
										/>
									{:else}
										<div
											class="size-14 sm:size-16 rounded-sm flex items-center justify-center text-lg font-bold text-[#fff7e8] border border-[#dfceb0]/20"
											style="background-color: {party.color}"
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
												class="text-lg sm:text-xl font-bold text-[#fff7e8] group-hover/link:text-[#f2c463] transition-colors flex items-center gap-2 truncate"
											>
												{party.name}
												{#if isUserVote}
													<FluentCheckmark20Filled class="size-4 text-[#8fae88] flex-shrink-0" />
												{/if}
											</h3>
										</a>
										{#if party.ideology}
											<span
												class="inline-block px-2 py-0.5 rounded-sm text-xs mt-1"
												style="background-color: {party.color}20; color: {party.color}; border: 1px solid {party.color}30"
											>
												{party.ideology}
											</span>
										{/if}
									</div>

									{#if hasStarted}
										<div class="text-right flex-shrink-0">
											<div class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">{votes}</div>
											<div class="text-xs text-[#a89e8e] font-mono">{percentage.toFixed(1)}%</div>
										</div>
									{/if}
								</div>

								<div class="flex items-center gap-4 text-sm flex-wrap mt-2">
									{#if party.leader}
										<a
											href="/user/{party.leader.accountId}"
											class="flex items-center gap-2 text-[#d9ccb7] hover:text-[#fff7e8] transition-colors"
										>
											<Logo
												src={party.leader.logo}
												alt={party.leader.name}
												placeholderIcon={FluentPerson20Filled}
												class="size-6 rounded-sm"
											/>
											<span class="text-xs">{party.leader.name}</span>
										</a>
									{/if}
									<span
										class="text-xs flex items-center gap-1.5 {hasEnoughMembers ? 'text-[#a89e8e]' : 'text-red-400'}"
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
										<div class="w-full bg-[#0d1d31] rounded-full h-2 overflow-hidden">
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
						<div class="border-t border-[#dfceb0]/15 px-4 sm:px-5 py-3 bg-[#102239]/70">
							{#if !hasEnoughMembers}
								<p class="text-xs text-red-400/70 text-center">Needs 3+ members to participate</p>
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
										class="w-full py-2 rounded-sm border text-sm font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[#fff7e8] hover:brightness-110 {isUserVote &&
										canVote
											? 'bg-[#587252] border-[#8fae88]/50'
											: 'border-[#dfceb0]/20'}"
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
</PageContainer>


{#if showVoteAnim}
	<ThreeAnimation variant="vote" onComplete={() => (showVoteAnim = false)} />
{/if}
