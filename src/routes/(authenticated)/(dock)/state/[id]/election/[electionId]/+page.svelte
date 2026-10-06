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
	import { Badge, Button } from "#lib/component/ui/index.js";

	const { data } = $props();

	let currentTime = $state(new Date());
	let interval: ReturnType<typeof setInterval>;
	let showVoteAnim = $state(false);
	let isSubmittingVote = $state(false);
	// Pending selection before the voter confirms — once `data.userVote` is set
	// server-side, the vote is final and this no longer changes.
	let selectedPartyId = $state<number | null>(null);

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
					class="size-14 sm:size-18 rounded-sm border border-[#c8b47a]/15 hover:border-[#f2b01e]/55 transition-colors"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-[#2369b5] to-[#2369b5]"
				/>
			</a>
			<div class="flex-1 min-w-0">
				<div class="flex flex-wrap items-center gap-2 mb-1">
					<h1 class="text-3xl font-bold {data.election.isInaugural ? 'text-[#ffd35c]' : 'text-[#f5efd8]'}">
						{data.election.isInaugural ? "Founding" : "Parliamentary"} Election
					</h1>
					{#if hasEnded}
						<Badge tone="neutral">CONCLUDED</Badge>
					{/if}
				</div>
				<a href="/state/{data.state.id}" class="text-sm text-[#a8a083] hover:text-[#ffcf47] transition-colors">
					{data.state.name}
				</a>
			</div>
		</div>

		<!-- Founding Election Banner -->
		{#if data.election.isInaugural}
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4 sm:p-5 text-center">
				<div class="flex items-center justify-center gap-2 text-[#ffd35c]">
					<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
					<span class="text-sm sm:text-lg font-bold uppercase tracking-[0.2em]">A Nation Is Born</span>
					<FluentStar20Filled class="size-4 sm:size-5 animate-pulse" />
				</div>
				<p class="mt-2 text-xs sm:text-sm text-[#ffe58f]/80">
					The first free election of the independent state of
					<span class="text-[#ffe58f] font-bold">{data.state.name}</span>
				</p>
			</div>
		{/if}

		<!-- Countdown Timer -->
		{#if countdown}
			<div class="panel-muted rounded-sm p-3 sm:p-4">
				<div class="text-[10px] sm:text-xs text-[#a8a083] uppercase tracking-wide text-center mb-2 sm:mb-3">
					{!hasStarted ? "Voting Opens In" : "Voting Closes In"}
				</div>
				<div class="flex items-center justify-center gap-2 sm:gap-3">
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#f5efd8] bg-[#0f120c] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#c8b47a]/15"
						>
							{String(countdown.days).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">DAYS</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a8a083]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#f5efd8] bg-[#0f120c] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#c8b47a]/15"
						>
							{String(countdown.hours).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">HRS</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a8a083]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#f5efd8] bg-[#0f120c] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#c8b47a]/15"
						>
							{String(countdown.minutes).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">MIN</div>
					</div>
					<div class="text-xl sm:text-2xl font-bold text-[#a8a083]/50">:</div>
					<div class="text-center">
						<div
							class="text-2xl sm:text-4xl font-mono font-bold text-[#f5efd8] bg-[#0f120c] rounded-sm px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-[#c8b47a]/15"
						>
							{String(countdown.seconds).padStart(2, "0")}
						</div>
						<div class="text-[10px] text-[#a8a083] uppercase tracking-wide mt-1 sm:mt-1.5">SEC</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Voter Status -->
	{#if !data.userResidence}
		<div
			class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center justify-center gap-3"
		>
			<p class="text-sm">You must be a resident of {data.state.name} to vote</p>
		</div>
	{:else if data.userVote}
		<div
			class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center justify-center gap-3"
		>
			<FluentCheckmark20Filled class="size-4" />
			<span class="text-sm">Vote cast. Your vote is final and cannot be changed.</span>
		</div>
	{:else if canVote}
		<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-4 text-center">
			<p class="text-sm text-[#e3cbfb]">
				{data.election.isInaugural ? "Cast your vote in the inaugural election" : "Select a party, then confirm your vote below"}
				— your choice is final once confirmed.
			</p>
		</div>
	{/if}

	<!-- Stats Strip -->
	<div class="grid grid-cols-3 gap-3">
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentVote20Filled class="size-4 text-[#c08cf0] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Votes</p>
				<p class="text-sm sm:text-xl font-bold text-[#f5efd8] font-mono truncate">{data.totalVotes.toLocaleString()}</p>
			</div>
		</div>
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentFlag20Filled class="size-4 text-[#5eaef5] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Parties</p>
				<p class="text-sm sm:text-xl font-bold text-[#f5efd8] truncate">{data.parties.length}</p>
			</div>
		</div>
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentPeople20Filled class="size-4 text-[#6fd14a] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Seats</p>
				<p class="text-sm sm:text-xl font-bold text-[#f5efd8] truncate">{data.election.totalSeats}</p>
			</div>
		</div>
	</div>

	<!-- Parties -->
	{#if data.parties.length === 0}
		<div class="panel-muted rounded-sm p-8 sm:p-12 text-center">
			<div class="text-4xl sm:text-6xl mb-4 opacity-20">🗳️</div>
			<p class="text-lg text-[#a8a083]">No political parties registered</p>
		</div>
	{:else}
		<!-- Ballot sheet -->
		<div class="panel rounded-sm overflow-hidden">
			<div class="bg-[#1a1f15] border-b border-[#c8b47a]/20 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-[#d3caa9]">
					<FluentVote20Filled class="size-4 shrink-0" />
					<span class="text-[10px] sm:text-xs uppercase tracking-[0.25em] font-bold">Official Ballot</span>
				</div>
				{#if data.userResidence && !data.userVote}
					<span class="text-[10px] sm:text-xs text-[#a8a083] uppercase tracking-wide">Mark one choice</span>
				{/if}
			</div>

			<div role={canVote && !data.userVote ? "radiogroup" : undefined} aria-label="Party ballot">
				{#each sortedParties as party, index}
					{@const votes = data.votesByParty[party.id] || 0}
					{@const percentage = getVotePercentage(party.id)}
					{@const isUserVote = data.userVote === party.id}
					{@const isSelected = selectedPartyId === party.id}
					{@const hasEnoughMembers = party.memberCount >= 3}
					{@const canVoteForParty = canVote && hasEnoughMembers}
					{@const selectable = canVoteForParty && !data.userVote}

					<div
						class="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition-colors {index <
						sortedParties.length - 1
							? 'border-b border-dashed border-[#c8b47a]/15'
							: ''} {isUserVote
							? 'bg-[#3f8a2a]/10'
							: isSelected
								? 'bg-[#f2b01e]/10'
								: selectable
									? 'hover:bg-[#2e3524]'
									: ''} {selectable ? 'cursor-pointer' : ''}"
						role={selectable ? "radio" : undefined}
						aria-checked={selectable ? isSelected : undefined}
						tabindex={selectable ? 0 : undefined}
						onclick={selectable ? () => (selectedPartyId = party.id) : undefined}
						onkeydown={selectable
							? (e: KeyboardEvent) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										selectedPartyId = party.id;
									}
								}
							: undefined}
					>
						<!-- Ballot bubble: mark your choice with an X -->
						<div
							class="shrink-0 size-7 sm:size-8 rounded-full border-2 flex items-center justify-center {isUserVote
								? 'border-[#6fd14a] bg-[#3f8a2a]/25 text-[#6fd14a]'
								: isSelected
									? 'border-[#f2b01e] bg-[#f2b01e]/15 text-[#f2b01e]'
									: 'border-dashed border-[#c8b47a]/30 text-transparent'}"
							title={isUserVote ? "Your vote" : isSelected ? "Selected — not yet confirmed" : undefined}
						>
							<span class="text-sm sm:text-base font-black leading-none">✕</span>
						</div>

						<!-- Logo -->
						<a href="/party/{party.id}" class="group/logo shrink-0" onclick={(e) => e.stopPropagation()}>
							{#if party.logo}
								<Logo
									src={party.logo}
									alt={party.name}
									class="size-10 sm:size-12 rounded-sm border border-[#c8b47a]/20 group-hover/logo:border-[#f2b01e]/55 transition-colors"
									placeholderIcon={FluentFlag20Filled}
								/>
							{:else}
								<div
									class="size-10 sm:size-12 rounded-sm flex items-center justify-center text-sm font-bold text-[#f5efd8] border border-[#c8b47a]/20"
									style="background-color: {party.color}"
								>
									{party.abbreviation || party.name.substring(0, 2)}
								</div>
							{/if}
						</a>

						<!-- Party Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-3">
								<div class="flex-1 min-w-0">
									<a href="/party/{party.id}" class="group/link" onclick={(e) => e.stopPropagation()}>
										<h3
											class="text-sm sm:text-lg font-bold text-[#f5efd8] group-hover/link:text-[#ffcf47] transition-colors flex items-center gap-2 truncate"
										>
											{#if hasStarted && index < 3}
												<span
													class="shrink-0 size-4 sm:size-5 rounded-full flex items-center justify-center font-bold text-[10px] {index ===
													0
														? 'bg-[#f2b01e] text-[#1b1708]'
														: index === 1
															? 'bg-[#a8a083] text-[#1b1708]'
															: 'bg-[#8c6a43] text-[#f5efd8]'}"
												>
													{index + 1}
												</span>
											{/if}
											{party.name}
										</h3>
									</a>
									{#if party.ideology}
										<span
											class="inline-block px-2 py-0.5 rounded-sm text-[10px] sm:text-xs mt-1"
											style="background-color: {party.color}20; color: {party.color}; border: 1px solid {party.color}30"
										>
											{party.ideology}
										</span>
									{/if}
								</div>

								{#if hasStarted}
									<div class="text-right flex-shrink-0">
										<div class="text-base sm:text-2xl font-bold text-[#f5efd8] font-mono">{votes}</div>
										<div class="text-[10px] sm:text-xs text-[#a8a083] font-mono">{percentage.toFixed(1)}%</div>
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-4 text-sm flex-wrap mt-1.5">
								{#if party.leader}
									<a
										href="/user/{party.leader.accountId}"
										class="flex items-center gap-2 text-[#d3caa9] hover:text-[#f5efd8] transition-colors"
										onclick={(e) => e.stopPropagation()}
									>
										<Logo
											src={party.leader.logo}
											alt={party.leader.name}
											placeholderIcon={FluentPerson20Filled}
											class="size-5 sm:size-6 rounded-sm"
										/>
										<span class="text-xs">{party.leader.name}</span>
									</a>
								{/if}
								<span class="text-xs flex items-center gap-1.5 {hasEnoughMembers ? 'text-[#a8a083]' : 'text-red-400'}">
									<FluentPeople20Filled class="size-3.5" />
									{party.memberCount}
									{#if !hasEnoughMembers}
										<span class="text-red-400/70">(need {3 - party.memberCount} more)</span>
									{/if}
								</span>
							</div>

							<!-- Vote Bar -->
							{#if hasStarted && data.totalVotes > 0}
								<div class="mt-2">
									<div class="w-full bg-[#0f120c] rounded-full h-1.5 overflow-hidden">
										<div
											class="h-full rounded-full transition-all duration-700 ease-out"
											style="width: {percentage}%; background: {party.color}"
										></div>
									</div>
								</div>
							{/if}

							{#if data.userResidence && !hasEnoughMembers}
								<p class="text-[10px] sm:text-xs text-red-400/70 mt-1.5">Needs 3+ members to participate</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Confirm Vote -->
		{#if data.userResidence}
			{@const selectedParty = data.parties.find((p) => p.id === selectedPartyId)}
			{#if data.userVote}
				<p class="text-center text-sm text-[#a8a083]">Your vote has been cast and cannot be changed.</p>
			{:else}
				<form
					method="POST"
					action="?/vote"
					use:enhance={() => {
						isSubmittingVote = true;
						return async ({ update, result }) => {
							isSubmittingVote = false;
							await update();
							if (result.type === "success") showVoteAnim = true;
						};
					}}
					class="sticky bottom-4 z-10"
				>
					<input type="hidden" name="partyId" value={selectedPartyId ?? ""} />
					<Button
						type="submit"
						variant="primary"
						size="lg"
						block
						disabled={!canVote || !selectedPartyId || isSubmittingVote}
						loading={isSubmittingVote}
						loadingText="Casting Vote..."
					>
						{#if !canVote && !hasStarted}
							Voting Not Open
						{:else if !canVote && hasEnded}
							Voting Closed
						{:else if selectedParty}
							Confirm Vote for {selectedParty.name}
						{:else}
							Select a Party to Vote
						{/if}
					</Button>
				</form>
			{/if}
		{/if}
	{/if}
</PageContainer>

{#if showVoteAnim}
	<ThreeAnimation variant="vote" onComplete={() => (showVoteAnim = false)} />
{/if}
