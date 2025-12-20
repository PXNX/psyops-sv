<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentSubtractCircle20Filled from "~icons/fluent/subtract-circle-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import { enhance } from "$app/forms";

	const { data } = $props();

	const proposalTypeColors: Record<string, string> = {
		budget: "bg-green-600/20 text-green-400 border-green-500/30",
		tax: "bg-amber-600/20 text-amber-400 border-amber-500/30",
		infrastructure: "bg-blue-600/20 text-blue-400 border-blue-500/30",
		education: "bg-purple-600/20 text-purple-400 border-purple-500/30",
		defense: "bg-red-600/20 text-red-400 border-red-500/30",
		healthcare: "bg-pink-600/20 text-pink-400 border-pink-500/30",
		environment: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
		justice: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
		general: "bg-gray-600/20 text-gray-400 border-gray-500/30"
	};

	const proposalTypeIcons: Record<string, string> = {
		budget: "💰",
		tax: "📊",
		infrastructure: "🏗️",
		education: "🎓",
		defense: "🛡️",
		healthcare: "⚕️",
		environment: "🌍",
		justice: "⚖️",
		general: "📋"
	};

	function getTimeRemaining(endDate: string) {
		const now = new Date();
		const end = new Date(endDate);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return "Voting ended";

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) return `${days}d ${hours}h remaining`;
		return `${hours}h remaining`;
	}

	// Generate party colors for visualization
	const partyColors: Record<string, string> = {};
	const colorPalette = [
		"#ef4444",
		"#f59e0b",
		"#10b981",
		"#3b82f6",
		"#8b5cf6",
		"#ec4899",
		"#14b8a6",
		"#f97316",
		"#06b6d4",
		"#a855f7"
	];
	let colorIndex = 0;
	Object.keys(data.partyDistribution).forEach((party) => {
		partyColors[party] = colorPalette[colorIndex % colorPalette.length];
		colorIndex++;
	});
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<a href="/state/{data.state.id}" class="text-sm text-gray-400 hover:text-white mb-1 inline-block">
				← Back to {data.state.name}
			</a>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentPeople20Filled class="size-8 text-blue-400" />
				Parliament
			</h1>
		</div>
		<div class="text-right">
			<p class="text-sm text-gray-400">Total Seats</p>
			<p class="text-3xl font-bold text-white">{data.totalSeats}</p>
		</div>
	</div>

	<!-- Parliament Composition -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		<h2 class="text-xl font-semibold text-white mb-4">Seat Distribution</h2>

		<!-- Visual bar chart -->
		<div class="flex w-full h-12 rounded-lg overflow-hidden mb-4">
			{#each Object.entries(data.partyDistribution) as [party, seats]}
				<div
					style="width: {(seats / data.totalSeats) * 100}%; background-color: {partyColors[party]}"
					class="flex items-center justify-center text-white font-semibold text-sm"
					title="{party}: {seats} seats"
				>
					{seats}
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
			{#each Object.entries(data.partyDistribution).sort((a, b) => b[1] - a[1]) as [party, seats]}
				<div class="flex items-center gap-2">
					<div class="size-4 rounded" style="background-color: {partyColors[party]}" />
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-white truncate">{party}</p>
						<p class="text-xs text-gray-400">{seats} seats ({Math.round((seats / data.totalSeats) * 100)}%)</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- User Status -->
	{#if data.isParliamentMember}
		<div class="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 p-4">
			<div class="flex items-center gap-3">
				<FluentCheckmark20Filled class="size-6 text-blue-400" />
				<div>
					<p class="font-semibold text-white">You are a Parliament Member</p>
					<p class="text-sm text-gray-300">
						Party: <span class="font-medium">{data.userParty || "Independent"}</span>
					</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<p class="text-sm text-gray-400 text-center">You must be a parliament member to vote on proposals</p>
		</div>
	{/if}

	<!-- Active Proposals -->
	<div class="space-y-4">
		<h2 class="text-2xl font-bold text-white flex items-center gap-2">
			<FluentDocument20Filled class="size-6 text-purple-400" />
			Active Proposals
		</h2>

		{#if data.proposals.length === 0}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
				<p class="text-gray-400">No active proposals at this time</p>
			</div>
		{:else}
			{#each data.proposals as proposal}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
					<!-- Header -->
					<div class="p-5 border-b border-white/5">
						<div class="flex items-start justify-between gap-4 mb-3">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<span
										class="px-2 py-1 rounded-lg text-xs font-semibold border {proposalTypeColors[
											proposal.proposalType
										]}"
									>
										{proposalTypeIcons[proposal.proposalType]}
										{proposal.proposalType.replace("_", " ").toUpperCase()}
									</span>
									<span class="text-xs text-gray-400 flex items-center gap-1">
										<FluentClock20Filled class="size-3" />
										{getTimeRemaining(proposal.votingEndsAt)}
									</span>
								</div>
								<h3 class="text-xl font-bold text-white mb-2">{proposal.title}</h3>
								<p class="text-sm text-gray-300">{proposal.description}</p>
							</div>
						</div>

						<div class="flex items-center gap-2 text-sm text-gray-400">
							<CircleAvatar src={proposal.proposedBy.avatar} size="xs" />
							<span>Proposed by <span class="text-white">{proposal.proposedBy.name}</span></span>
						</div>
					</div>

					<!-- Vote Progress -->
					<div class="p-5 bg-slate-700/30">
						<div class="space-y-3">
							<!-- For votes -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-green-400 font-medium flex items-center gap-1">
										<FluentCheckmark20Filled class="size-4" />
										For
									</span>
									<span class="text-white">{proposal.voteCounts.for} votes ({proposal.percentageFor.toFixed(1)}%)</span>
								</div>
								<div class="w-full bg-slate-600 rounded-full h-2">
									<div class="bg-green-500 h-2 rounded-full transition-all" style="width: {proposal.percentageFor}%" />
								</div>
							</div>

							<!-- Against votes -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-red-400 font-medium flex items-center gap-1">
										<FluentDismiss20Filled class="size-4" />
										Against
									</span>
									<span class="text-white">{proposal.voteCounts.against} votes</span>
								</div>
								<div class="w-full bg-slate-600 rounded-full h-2">
									<div
										class="bg-red-500 h-2 rounded-full transition-all"
										style="width: {(proposal.voteCounts.against / proposal.totalVotes) * 100 || 0}%"
									/>
								</div>
							</div>

							<!-- Abstain votes -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-gray-400 font-medium flex items-center gap-1">
										<FluentSubtractCircle20Filled class="size-4" />
										Abstain
									</span>
									<span class="text-white">{proposal.voteCounts.abstain} votes</span>
								</div>
								<div class="w-full bg-slate-600 rounded-full h-2">
									<div
										class="bg-gray-500 h-2 rounded-full transition-all"
										style="width: {(proposal.voteCounts.abstain / proposal.totalVotes) * 100 || 0}%"
									/>
								</div>
							</div>

							<div class="pt-2 border-t border-white/5">
								<p class="text-xs text-gray-400">
									Total votes: {proposal.totalVotes} / {data.totalSeats}
									• Required majority: {proposal.requiredMajority}%
								</p>
							</div>
						</div>
					</div>

					<!-- Voting Actions -->
					{#if data.isParliamentMember}
						<div class="p-5 border-t border-white/5">
							{#if proposal.userVote}
								<div class="bg-slate-700/50 rounded-lg p-3 mb-3">
									<p class="text-sm text-center">
										You voted: <span class="font-semibold text-white capitalize">{proposal.userVote}</span>
										<span class="text-gray-400"> • You can change your vote</span>
									</p>
								</div>
							{/if}

							<form method="POST" action="?/vote" use:enhance class="flex gap-2">
								<input type="hidden" name="proposalId" value={proposal.id} />

								<button
									type="submit"
									name="voteType"
									value="for"
									class="btn flex-1 bg-green-600 hover:bg-green-500 border-0 text-white gap-2"
									class:ring-2={proposal.userVote === "for"}
									class:ring-green-400={proposal.userVote === "for"}
								>
									<FluentCheckmark20Filled class="size-5" />
									Vote For
								</button>

								<button
									type="submit"
									name="voteType"
									value="against"
									class="btn flex-1 bg-red-600 hover:bg-red-500 border-0 text-white gap-2"
									class:ring-2={proposal.userVote === "against"}
									class:ring-red-400={proposal.userVote === "against"}
								>
									<FluentDismiss20Filled class="size-5" />
									Vote Against
								</button>

								<button
									type="submit"
									name="voteType"
									value="abstain"
									class="btn flex-1 bg-gray-600 hover:bg-gray-500 border-0 text-white gap-2"
									class:ring-2={proposal.userVote === "abstain"}
									class:ring-gray-400={proposal.userVote === "abstain"}
								>
									<FluentSubtractCircle20Filled class="size-5" />
									Abstain
								</button>
							</form>
						</div>
					{:else}
						<div class="p-5 border-t border-white/5 text-center">
							<p class="text-sm text-gray-400">Parliament members only</p>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- All Members -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<h2 class="text-xl font-semibold text-white mb-4">All Parliament Members</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{#each data.parliamentMembers as member}
				<a
					href="/user/{member.userId}"
					class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
				>
					<CircleAvatar src={member.avatar} size="sm" />
					<div class="flex-1 min-w-0">
						<p class="font-medium text-white group-hover:text-blue-400 transition-colors truncate">
							{member.name}
						</p>
						<p class="text-xs text-gray-400 truncate">
							{member.partyAffiliation || "Independent"}
						</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0"
					/>
				</a>
			{/each}
		</div>
	</div>
</div>
