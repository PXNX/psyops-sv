<script lang="ts">
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import { enhance } from "$app/forms";

	const { data } = $props();

	function getTimeRemaining() {
		if (!data.isActive) return null;

		const now = new Date();
		const end = new Date(data.election.endDate);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return "Voting ended";

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) return `${hours}h ${minutes}m remaining`;
		return `${minutes}m remaining`;
	}

	function getStartsIn() {
		const now = new Date();
		const start = new Date(data.election.startDate);
		const diff = start.getTime() - now.getTime();

		if (diff <= 0) return null;

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) return `Starts in ${days}d ${hours}h`;
		return `Starts in ${hours}h`;
	}

	const timeRemaining = $derived(data.isActive ? getTimeRemaining() : null);
	const startsIn = $derived(!data.hasStarted ? getStartsIn() : null);

	function getVotePercentage(partyId: string) {
		if (data.totalVotes === 0) return 0;
		return ((data.votesByParty[partyId] || 0) / data.totalVotes) * 100;
	}

	// Sort parties by votes
	const sortedParties = $derived(
		[...data.parties].sort((a, b) => (data.votesByParty[b.id] || 0) - (data.votesByParty[a.id] || 0))
	);
</script>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}/parliament" class="text-sm text-gray-400 hover:text-white mb-1 inline-block">
			← Back to Parliament
		</a>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-white flex items-center gap-3">
					<FluentVote20Filled class="size-8 text-purple-400" />
					{data.election.isInaugural ? "Inaugural" : "Parliamentary"} Elections
				</h1>
				<p class="text-gray-400 mt-1">{data.state.name}</p>
				{#if data.election.isInaugural}
					<p class="text-sm text-purple-400 mt-1 flex items-center gap-1">
						<span class="badge badge-sm bg-purple-600/20 border-purple-500/30">First Election</span>
						Establishing the founding parliament
					</p>
				{/if}
			</div>

			<div class="text-right">
				{#if data.isActive}
					<div class="bg-green-600/20 border border-green-500/30 rounded-lg px-4 py-2">
						<p class="text-sm text-green-400 font-medium flex items-center gap-2 justify-end">
							<FluentClock20Filled class="size-4" />
							Voting Active
						</p>
						<p class="text-xs text-green-300 mt-1">{timeRemaining}</p>
					</div>
				{:else if !data.hasStarted}
					<div class="bg-blue-600/20 border border-blue-500/30 rounded-lg px-4 py-2">
						<p class="text-sm text-blue-400 font-medium">Upcoming Election</p>
						<p class="text-xs text-blue-300 mt-1">{startsIn}</p>
					</div>
				{:else if data.hasEnded}
					<div class="bg-gray-600/20 border border-gray-500/30 rounded-lg px-4 py-2">
						<p class="text-sm text-gray-400 font-medium">Election Ended</p>
						<p class="text-xs text-gray-500 mt-1">Final Results</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Voter Status -->
	{#if !data.userResidence}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-sm text-red-300 text-center">
				⚠️ You must be a resident of {data.state.name} to vote in these elections
			</p>
		</div>
	{:else if data.userVote}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<div class="flex items-center justify-center gap-2 text-green-300">
				<FluentCheckmark20Filled class="size-5" />
				<span class="text-sm font-medium"> You have voted! You can change your vote until the election ends. </span>
			</div>
		</div>
	{:else if data.canVote}
		<div class="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
			<p class="text-sm text-blue-300 text-center font-medium">
				{#if data.election.isInaugural}
					🎉 Cast your vote in the inaugural election to establish {data.state.name}'s first parliament!
				{:else}
					Cast your vote below to help decide the next parliament
				{/if}
			</p>
		</div>
	{/if}

	<!-- Election Info -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<p class="text-sm text-gray-400 mb-1">Total Votes Cast</p>
			<p class="text-3xl font-bold text-white">{data.totalVotes}</p>
		</div>
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<p class="text-sm text-gray-400 mb-1">Competing Parties</p>
			<p class="text-3xl font-bold text-white">{data.parties.length}</p>
		</div>
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<p class="text-sm text-gray-400 mb-1">Available Seats</p>
			<p class="text-3xl font-bold text-white">{data.election.totalSeats}</p>
		</div>
	</div>

	<!-- Parties -->
	<div class="space-y-4">
		<h2 class="text-2xl font-bold text-white flex items-center gap-2">
			<FluentPeople20Filled class="size-6 text-blue-400" />
			Political Parties
		</h2>

		{#if data.parties.length === 0}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
				<p class="text-gray-400">No political parties registered yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each sortedParties as party, index}
					{@const votes = data.votesByParty[party.id] || 0}
					{@const percentage = getVotePercentage(party.id)}
					{@const isUserVote = data.userVote === party.id}

					<div
						class="bg-slate-800/50 rounded-xl border overflow-hidden transition-all"
						class:border-white-5={!isUserVote}
						class:border-green-500-50={isUserVote}
						class:ring-2={isUserVote}
						class:ring-green-500-30={isUserVote}
					>
						<div class="p-5">
							<div class="flex items-start gap-4">
								<!-- Party Logo -->
								<div class="flex-shrink-0">
									{#if party.logo}
										<img
											src={party.logo}
											alt={party.name}
											class="size-16 rounded-lg object-cover border-2"
											style="border-color: {party.color}"
										/>
									{:else}
										<div
											class="size-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
											style="background-color: {party.color}"
										>
											{party.abbreviation || party.name.substring(0, 2)}
										</div>
									{/if}
								</div>

								<!-- Party Info -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-4 mb-2">
										<div>
											<h3 class="text-xl font-bold text-white flex items-center gap-2">
												{party.name}
												{#if isUserVote}
													<span class="badge badge-sm bg-green-600/20 text-green-400 border-green-500/30">
														Your Vote
													</span>
												{/if}
											</h3>
											{#if party.abbreviation}
												<p class="text-sm text-gray-400">{party.abbreviation}</p>
											{/if}
										</div>

										{#if data.hasStarted}
											<div class="text-right">
												<p class="text-2xl font-bold text-white">{votes}</p>
												<p class="text-xs text-gray-400">
													{percentage.toFixed(1)}% of votes
												</p>
											</div>
										{/if}
									</div>

									{#if party.ideology}
										<span
											class="inline-block px-2 py-1 rounded text-xs font-medium mb-2"
											style="background-color: {party.color}20; color: {party.color}"
										>
											{party.ideology}
										</span>
									{/if}

									{#if party.description}
										<p class="text-sm text-gray-300 mb-3">{party.description}</p>
									{/if}

									<div class="flex items-center gap-4 text-sm">
										{#if party.leader}
											<a
												href="/user/{party.leader.accountId}"
												class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
											>
												<SquareAvatar src={party.leader.avatar} size="xs" />
												<span>Leader: <span class="text-white">{party.leader.name}</span></span>
											</a>
										{/if}
										<span class="text-gray-400 flex items-center gap-1">
											<FluentPeople20Filled class="size-4" />
											{party.memberCount} member{party.memberCount !== 1 ? "s" : ""}
										</span>
									</div>
								</div>
							</div>

							<!-- Vote Progress Bar -->
							{#if data.hasStarted && data.totalVotes > 0}
								<div class="mt-4">
									<div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
										<div
											class="h-3 rounded-full transition-all duration-500"
											style="width: {percentage}%; background-color: {party.color}"
										/>
									</div>
								</div>
							{/if}
						</div>

						<!-- Vote Button -->
						{#if data.canVote}
							<div class="border-t border-white/5 p-4 bg-slate-700/30">
								<form method="POST" action="?/vote" use:enhance class="w-full">
									<input type="hidden" name="partyId" value={party.id} />
									<button
										type="submit"
										class="btn w-full gap-2"
										class:bg-green-600={isUserVote}
										class:hover:bg-green-500={isUserVote}
										class:bg-blue-600={!isUserVote}
										class:hover:bg-blue-500={!isUserVote}
										style:border-color={party.color}
										class:border-2={!isUserVote}
										class:border-0={isUserVote}
										class:text-white={true}
									>
										{#if isUserVote}
											<FluentCheckmark20Filled class="size-5" />
											Voted for {party.name}
										{:else}
											<FluentVote20Filled class="size-5" />
											Vote for {party.name}
										{/if}
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Election Timeline -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<h3 class="text-lg font-semibold text-white mb-4">Election Timeline</h3>
		<div class="space-y-3">
			<div class="flex items-start gap-3">
				<div
					class="size-8 rounded-full flex items-center justify-center flex-shrink-0"
					class:bg-green-600={data.hasStarted}
					class:bg-gray-600={!data.hasStarted}
				>
					{#if data.hasStarted}
						<FluentCheckmark20Filled class="size-4 text-white" />
					{:else}
						<FluentClock20Filled class="size-4 text-white" />
					{/if}
				</div>
				<div>
					<p class="font-medium text-white">Voting Opens</p>
					<p class="text-sm text-gray-400">
						{new Date(data.election.startDate).toLocaleString()}
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3">
				<div
					class="size-8 rounded-full flex items-center justify-center flex-shrink-0"
					class:bg-green-600={data.hasEnded}
					class:bg-blue-600={data.isActive}
					class:bg-gray-600={!data.hasStarted}
				>
					{#if data.hasEnded}
						<FluentCheckmark20Filled class="size-4 text-white" />
					{:else if data.isActive}
						<FluentVote20Filled class="size-4 text-white" />
					{:else}
						<FluentClock20Filled class="size-4 text-white" />
					{/if}
				</div>
				<div>
					<p class="font-medium text-white">Voting Closes</p>
					<p class="text-sm text-gray-400">
						{new Date(data.election.endDate).toLocaleString()}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
