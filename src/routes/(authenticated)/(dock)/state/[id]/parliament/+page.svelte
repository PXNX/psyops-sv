<!-- src/routes/(authenticated)/(dock)/state/[id]/parliament/+page.svelte -->
<script lang="ts">
	import SquareLogo from "$lib/component/SquareLogo.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentSubtractCircle20Filled from "~icons/fluent/subtract-circle-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFilterDismiss20Filled from "~icons/fluent/filter-dismiss-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import { enhance } from "$app/forms";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	let selectedParty = $state<string | null>(null);

	const proposalTypeColors: Record<string, string> = {
		budget: "bg-green-600/20 text-green-400 border-green-500/30",
		tax: "bg-amber-600/20 text-amber-400 border-amber-500/30",
		infrastructure: "bg-blue-600/20 text-blue-400 border-blue-500/30",
		hospital: "bg-pink-600/20 text-pink-400 border-pink-500/30",
		school: "bg-purple-600/20 text-purple-400 border-purple-500/30",
		power_plant: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
	};

	const proposalTypeIcons: Record<string, string> = {
		budget: "💰",
		tax: "📊",
		infrastructure: "🏗️",
		hospital: "⚕️",
		school: "🎓",
		power_plant: "⚡"
	};

	function getTimeRemaining(endDate: string | Date) {
		const now = new Date();
		const end = new Date(endDate);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return "Voting ended";

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const filteredMembers = $derived(
		selectedParty
			? data.parliamentMembers
					.filter((m) => {
						const memberPartyKey = m.partyId ? String(m.partyId) : "independent";
						return memberPartyKey === selectedParty;
					})
					.sort((a, b) => {
						// Leader first
						if (a.partyRole === "leader") return -1;
						if (b.partyRole === "leader") return 1;
						// Deputy second
						if (a.partyRole === "deputy") return -1;
						if (b.partyRole === "deputy") return 1;
						// Then by elected date (earliest first for seniority)
						return new Date(a.electedAt).getTime() - new Date(b.electedAt).getTime();
					})
			: data.parliamentMembers
	);

	function togglePartyFilter(partyKey: string) {
		selectedParty = selectedParty === partyKey ? null : partyKey;
	}

	function clearFilter() {
		selectedParty = null;
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Simple Header -->
	<div class="flex items-center justify-between">
		<div>
			<a href="/state/{data.state.id}" class="text-sm text-gray-400 hover:text-white mb-2 inline-block">
				← {data.state.name}
			</a>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentPeople20Filled class="size-8 text-blue-400" />
				Parliament
			</h1>
		</div>
		{#if data.totalSeats > 0}
			<div class="text-right">
				<p class="text-sm text-gray-400">Total Seats</p>
				<p class="text-3xl font-bold text-white">{data.totalSeats}</p>
			</div>
		{/if}
	</div>

	<!-- Parliament Composition -->
	{#if data.totalSeats > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
			<!-- Header -->
			<div class="p-5 border-b border-white/10">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-white">
						{#if selectedParty}
							{@const partyData =
								selectedParty === "independent" ? null : data.parties?.find((p) => String(p.id) === selectedParty)}
							{partyData?.name ?? "Independent"} Members
						{:else}
							Seat Distribution
						{/if}
					</h2>
					{#if selectedParty}
						<button type="button" onclick={clearFilter} class="btn btn-xs btn-ghost gap-1 text-gray-400">
							<FluentFilterDismiss20Filled class="size-3" />
							Clear Filter
						</button>
					{/if}
				</div>

				<!-- Seat Bar -->
				<div class="flex w-full h-12 rounded-lg overflow-hidden mb-4">
					{#each Object.entries(data.partyDistribution) as [partyKey, seats]}
						{@const partyData =
							partyKey === "independent" ? null : data.parties?.find((p) => String(p.id) === partyKey)}
						{@const partyName = partyData?.name ?? "Independent"}
						<button
							type="button"
							onclick={() => togglePartyFilter(partyKey)}
							style="width: {(seats / data.totalSeats) * 100}%; background-color: {data.partyColors[partyKey] ||
								'#6b7280'}"
							class="flex items-center justify-center text-white font-semibold text-sm transition-all hover:brightness-110 {selectedParty ===
							partyKey
								? 'ring-2 ring-white ring-inset'
								: ''}"
							title="{partyName}: {seats} seats"
						>
							{seats}
						</button>
					{/each}
				</div>

				<!-- Party List -->
				{#if !selectedParty}
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
						{#each Object.entries(data.partyDistribution).sort((a, b) => b[1] - a[1]) as [partyKey, seats]}
							{@const partyData =
								partyKey === "independent" ? null : data.parties?.find((p) => String(p.id) === partyKey)}
							{@const partyName = partyData?.name ?? "Independent"}
							<button
								type="button"
								onclick={() => togglePartyFilter(partyKey)}
								class="flex items-center gap-2 p-3 rounded-lg transition-all hover:bg-slate-700/30"
							>
								<div
									class="size-8 rounded flex-shrink-0"
									style="background-color: {data.partyColors[partyKey] || '#6b7280'}"
								/>

								<div class="flex-1 min-w-0 text-left">
									<p class="text-sm font-medium text-white truncate">{partyData?.abbreviation || partyName}</p>
									<p class="text-xs text-gray-400">{seats} ({Math.round((seats / data.totalSeats) * 100)}%)</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Members Grid (when party selected) -->
			{#if selectedParty}
				{@const partyData =
					selectedParty === "independent" ? null : data.parties?.find((p) => String(p.id) === selectedParty)}
				{@const partyName = partyData?.name ?? "Independent"}

				<div class="p-5 space-y-4" style="background-color: {data.partyColors[selectedParty]}05">
					<!-- Party Info Banner -->
					{#if selectedParty !== "independent"}
						<a
							href="/party/{selectedParty}"
							class="flex items-center gap-3 p-4 rounded-lg border border-white/10"
							style="background-color: {data.partyColors[selectedParty]}20"
						>
							{#if partyData?.logo}
								<Logo src={partyData.logo} alt={partyName} class="size-12 rounded flex-shrink-0" />
							{:else}
								<div
									class="size-12 rounded flex-shrink-0"
									style="background-color: {data.partyColors[selectedParty] || '#6b7280'}"
								></div>
							{/if}
							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-lg text-white mb-1">{partyName}</h3>
								<div class="flex items-center gap-2 flex-wrap text-sm">
									{#if partyData?.ideology}
										<span class="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium">
											{partyData.ideology}
										</span>
									{/if}
									<span class="text-gray-400">
										{filteredMembers.length} seat{filteredMembers.length !== 1 ? "s" : ""}
									</span>
									<span class="text-gray-600">•</span>
									<span class="text-gray-400">
										{Math.round((filteredMembers.length / data.totalSeats) * 100)}% of parliament
									</span>
								</div>
							</div>

							<FluentChevronRight20Filled class="size-4 text-gray-500 group-hover:text-blue-400 flex-shrink-0" />
						</a>
					{:else}
						<!-- Independent members banner -->
						<div class="p-4 rounded-lg border border-white/10 bg-gray-600/20">
							<h3 class="font-bold text-lg text-white mb-1">Independent Members</h3>
							<div class="flex items-center gap-2 flex-wrap text-sm">
								<span class="text-gray-400">
									{filteredMembers.length} seat{filteredMembers.length !== 1 ? "s" : ""}
								</span>
								<span class="text-gray-600">•</span>
								<span class="text-gray-400">
									{Math.round((filteredMembers.length / data.totalSeats) * 100)}% of parliament
								</span>
							</div>
						</div>
					{/if}

					<!-- All Members Grid -->
					<div class="grid grid-cols-1 lg:grid-cols-3 gap-2">
						{#each filteredMembers as member}
							{@const isLeader = member.partyRole === "leader"}
							{@const isDeputy = member.partyRole === "deputy"}
							<a
								href="/user/{member.userId}"
								class="flex items-center gap-3 group rounded-lg p-3 transition-all {isLeader
									? 'bg-gradient-to-r from-yellow-600/10 to-amber-600/10 border-2 border-yellow-500/50 hover:border-yellow-400/70 hover:from-yellow-600/20 hover:to-amber-600/20'
									: isDeputy
										? 'border border-blue-500/30 hover:bg-slate-700/50'
										: 'hover:bg-slate-700/50'}"
							>
								<div class="relative">
									<Logo src={member.logo} alt={member.name} />
								</div>
								<div class="flex-1 min-w-0">
									<p
										class="font-medium text-white group-hover:text-blue-400 transition-colors truncate {isLeader
											? 'font-bold'
											: ''}"
									>
										{member.name}
									</p>
									{#if isLeader}
										<p class="text-xs text-yellow-400">Party Leader</p>
									{:else if isDeputy}
										<p class="text-xs text-blue-400">Deputy</p>
									{/if}
								</div>
								<FluentChevronRight20Filled class="size-4 text-gray-500 group-hover:text-blue-400 flex-shrink-0" />
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Parliament -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
			<FluentPeople20Filled class="size-16 text-gray-600 mx-auto mb-3" />
			<h3 class="text-xl font-bold text-white mb-2">Parliament Not Yet Formed</h3>
			<p class="text-gray-400">
				{#if data.nextElection?.isInaugural}
					The inaugural election is in progress. Parliament will be formed once voting concludes.
				{:else}
					Parliament has not yet been established for this state.
				{/if}
			</p>
		</div>
	{/if}

	<!-- Election Banner -->
	{#if data.nextElection}
		{@const now = new Date()}
		{@const start = new Date(data.nextElection.startDate)}
		{@const end = new Date(data.nextElection.endDate)}
		{@const isScheduled = now < start}
		{@const isActive = now >= start && now <= end}

		{#if data.nextElection.isInaugural && isScheduled}
			<!-- Inaugural Election - Scheduled -->
			<div
				class="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-5 space-y-3"
			>
				<div class="flex items-start gap-3">
					<div class="size-12 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
						<FluentVote20Filled class="size-6 text-purple-400" />
					</div>
					<div class="flex-1 space-y-2">
						<h3 class="font-bold text-white text-lg">Inaugural Election Scheduled! 🎉</h3>
						<p class="text-purple-200 text-sm">
							This state is brand new! The first democratic election will establish the founding parliament of
							<strong>{data.nextElection.totalSeats} seats</strong>.
						</p>

						<div class="bg-purple-900/30 rounded-lg p-3 space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<FluentCalendar20Filled class="size-4 text-purple-400" />
								<span class="text-purple-100">
									<strong>Voting starts in:</strong>
									{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
								</span>
							</div>
							<div class="text-xs text-purple-200/80">
								<strong>Start:</strong>
								{formatDate(data.nextElection.startDate)}<br />
								<strong>End:</strong>
								{formatDate(data.nextElection.endDate)}
							</div>
						</div>

						<div class="flex gap-2 pt-2">
							<a
								href="/state/{data.state.id}/election/{data.nextElection.id}"
								class="btn btn-sm bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
							>
								<FluentVote20Filled class="size-4" />
								View Election Details
							</a>
							<a href="/party/create" class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white">
								Create a Party
							</a>
						</div>
					</div>
				</div>
			</div>
		{:else if data.nextElection.isInaugural && isActive}
			<!-- Inaugural Election - Active -->
			<div class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<FluentVote20Filled class="size-6 text-green-400 animate-pulse" />
						<div>
							<p class="font-semibold text-white">Inaugural Election Now Active!</p>
							<p class="text-sm text-green-200">Help establish the founding parliament - vote now!</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-green-600 hover:bg-green-500 border-0 text-white gap-2 animate-pulse"
					>
						<FluentVote20Filled class="size-4" />
						Vote Now
					</a>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isScheduled}
			<!-- Regular Election - Scheduled -->
			<div class="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-500/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-blue-600/30 rounded-xl flex items-center justify-center">
							<FluentCalendar20Filled class="size-6 text-blue-400" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-white">Upcoming Election</h3>
							</div>
							<p class="text-sm text-gray-400">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats • starts in {getTimeRemaining(data.nextElection.startDate)}
							</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white"
					>
						View Election
					</a>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isActive}
			<!-- Regular Election - Active -->
			<div class="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl border border-green-500/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-green-600/30 rounded-xl flex items-center justify-center">
							<FluentVote20Filled class="size-6 text-green-400" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-white">Election Active</h3>
								<span
									class="px-2 py-1 rounded-lg text-xs font-semibold border bg-green-600/20 text-green-400 border-green-500/30"
								>
									Voting Now
								</span>
							</div>
							<p class="text-sm text-gray-400">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats •
								{getTimeRemaining(data.nextElection.endDate)} remaining
							</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-green-600 hover:bg-green-500 border-0 text-white gap-2 animate-pulse"
					>
						<FluentVote20Filled class="size-4" />
						Vote Now
					</a>
				</div>
			</div>
		{/if}
	{/if}

	<!-- User Status -->
	{#if data.totalSeats > 0 && data.isParliamentMember}
		<div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/20 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<FluentCheckmark20Filled class="size-5 text-blue-400" />
					<div class="text-sm">
						<span class="text-white font-semibold">Parliament Member</span>
						<span class="text-gray-400"> • {data.userParty || "Independent"}</span>
						{#if data.userMinistry}
							<span class="text-gray-400"> • Minister of {data.userMinistry}</span>
						{/if}
					</div>
				</div>
				<a
					href="/state/{data.state.id}/proposal/create"
					class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2"
				>
					<FluentAdd20Filled class="size-4" />
					Create Proposal
				</a>
			</div>
		</div>
	{/if}

	<!-- Active Proposals -->
	{#if data.totalSeats > 0}
		<div class="space-y-4">
			<h2 class="text-xl font-bold text-white flex items-center gap-2">
				<FluentDocument20Filled class="size-6 text-purple-400" />
				Active Proposals
			</h2>

			{#if data.proposals.length === 0}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
					<p class="text-gray-400">No active proposals</p>
				</div>
			{:else}
				{#each data.proposals as proposal}
					<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
						<!-- Header -->
						<div class="p-4 border-b border-white/5">
							<div class="flex items-center justify-between gap-3 mb-3">
								<span
									class="px-2 py-1 rounded-lg text-xs font-semibold border {proposalTypeColors[proposal.proposalType]}"
								>
									{proposalTypeIcons[proposal.proposalType]}
									{proposal.proposalType.replace("_", " ").toUpperCase()}
								</span>
								<span class="text-xs text-gray-400 flex items-center gap-1">
									<FluentClock20Filled class="size-3" />
									{getTimeRemaining(proposal.votingEndsAt)}
								</span>
							</div>

							<a
								href="/user/{proposal.proposedBy.id}"
								class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
							>
								<Logo src={proposal.proposedBy.logo} alt={proposal.proposedBy.name} />
								<span>by <span class="text-white font-medium">{proposal.proposedBy.name}</span></span>
							</a>
						</div>

						<!-- Votes -->
						<div class="p-4 space-y-3">
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-green-400 font-medium flex items-center gap-1">
										<FluentCheckmark20Filled class="size-4" />
										For
									</span>
									<span class="text-white">{proposal.voteCounts.for} ({proposal.percentageFor.toFixed(1)}%)</span>
								</div>
								<div class="w-full bg-slate-700 rounded-full h-2">
									<div class="bg-green-500 h-2 rounded-full transition-all" style="width: {proposal.percentageFor}%" />
								</div>
							</div>

							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-red-400 font-medium flex items-center gap-1">
										<FluentDismiss20Filled class="size-4" />
										Against
									</span>
									<span class="text-white">{proposal.voteCounts.against}</span>
								</div>
								<div class="w-full bg-slate-700 rounded-full h-2">
									<div
										class="bg-red-500 h-2 rounded-full transition-all"
										style="width: {(proposal.voteCounts.against / proposal.totalVotes) * 100 || 0}%"
									/>
								</div>
							</div>

							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-gray-400 font-medium flex items-center gap-1">
										<FluentSubtractCircle20Filled class="size-4" />
										Abstain
									</span>
									<span class="text-white">{proposal.voteCounts.abstain}</span>
								</div>
								<div class="w-full bg-slate-700 rounded-full h-2">
									<div
										class="bg-gray-500 h-2 rounded-full transition-all"
										style="width: {(proposal.voteCounts.abstain / proposal.totalVotes) * 100 || 0}%"
									/>
								</div>
							</div>

							<div class="pt-2 border-t border-white/5 text-xs text-gray-400">
								{proposal.totalVotes} / {data.totalSeats} votes • {proposal.requiredMajority}% required
							</div>
						</div>

						<!-- Voting -->
						{#if data.isParliamentMember}
							<div class="p-4 border-t border-white/5">
								{#if proposal.userVote}
									<p class="text-xs text-center text-gray-400 mb-3">
										You voted: <span class="font-semibold text-white capitalize">{proposal.userVote}</span>
									</p>
								{/if}

								<form method="POST" action="?/vote" use:enhance class="flex gap-2">
									<input type="hidden" name="proposalId" value={proposal.id} />

									<button
										type="submit"
										name="voteType"
										value="for"
										class="btn btn-sm flex-1 bg-green-600 hover:bg-green-500 border-0 text-white {proposal.userVote ===
										'for'
											? 'ring-2 ring-green-400'
											: ''}"
									>
										<FluentCheckmark20Filled class="size-4" />
										For
									</button>

									<button
										type="submit"
										name="voteType"
										value="against"
										class="btn btn-sm flex-1 bg-red-600 hover:bg-red-500 border-0 text-white {proposal.userVote ===
										'against'
											? 'ring-2 ring-red-400'
											: ''}"
									>
										<FluentDismiss20Filled class="size-4" />
										Against
									</button>

									<button
										type="submit"
										name="voteType"
										value="abstain"
										class="btn btn-sm flex-1 bg-gray-600 hover:bg-gray-500 border-0 text-white {proposal.userVote ===
										'abstain'
											? 'ring-2 ring-gray-400'
											: ''}"
									>
										<FluentSubtractCircle20Filled class="size-4" />
										Abstain
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>
