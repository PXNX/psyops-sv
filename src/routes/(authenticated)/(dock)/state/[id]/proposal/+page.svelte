<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/+page.svelte -->
<script lang="ts">
	import Logo from "$lib/component/Logo.svelte";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentSubtractCircle20Filled from "~icons/fluent/subtract-circle-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentCalendarClock20Filled from "~icons/fluent/calendar-clock-20-filled";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	let selectedTab = $state<"all" | "passed" | "rejected" | "expired">("all");

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

	const statusColors = {
		passed: "bg-green-600/20 text-green-400 border-green-500/30",
		rejected: "bg-red-600/20 text-red-400 border-red-500/30",
		expired: "bg-gray-600/20 text-gray-400 border-gray-500/30",
		active: "bg-blue-600/20 text-blue-400 border-blue-500/30"
	};

	const statusIcons = {
		passed: FluentCheckmarkCircle20Filled,
		rejected: FluentDismissCircle20Filled,
		expired: FluentCalendarClock20Filled,
		active: FluentClock20Filled
	};

	const displayedProposals = $derived.by(() => {
		switch (selectedTab) {
			case "passed":
				return data.passedProposals;
			case "rejected":
				return data.rejectedProposals;
			case "expired":
				return data.expiredProposals;
			default:
				return data.allProposals;
		}
	});

	function getVoteBadgeColor(voteType: string | null) {
		if (!voteType) return "";
		switch (voteType) {
			case "for":
				return "bg-green-600/20 text-green-400 border-green-500/50";
			case "against":
				return "bg-red-600/20 text-red-400 border-red-500/50";
			case "abstain":
				return "bg-gray-600/20 text-gray-400 border-gray-500/50";
			default:
				return "";
		}
	}

	function getStatusLabel(proposal: any) {
		if (proposal.isActive) return "Active";
		if (proposal.status === "passed") return "Passed";
		if (proposal.status === "rejected") return "Rejected";
		if (proposal.votingEnded && proposal.status === "active") return "Expired";
		return proposal.status;
	}

	function getStatusColor(proposal: any) {
		if (proposal.isActive) return statusColors.active;
		if (proposal.status === "passed") return statusColors.passed;
		if (proposal.status === "rejected") return statusColors.rejected;
		if (proposal.votingEnded && proposal.status === "active") return statusColors.expired;
		return statusColors.expired;
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}/parliament" class="text-sm text-gray-400 hover:text-purple-400 transition-colors">
			{data.state.name} — Parliament
		</a>
		<h1 class="text-3xl font-bold text-white flex items-center gap-3 mt-1">
			<FluentHistory20Filled class="size-8 text-purple-400" />
			Proposal History
		</h1>
	</div>

	<!-- Tabs -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
		<div class="flex overflow-x-auto border-b border-white/10">
			<button
				type="button"
				onclick={() => (selectedTab = "passed")}
				class="px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap {selectedTab === 'passed'
					? 'text-white border-green-500 bg-green-500/10'
					: 'text-gray-400 border-transparent hover:text-white hover:bg-slate-700/30'}"
			>
				Passed ({data.passedProposals.length})
			</button>
			<button
				type="button"
				onclick={() => (selectedTab = "rejected")}
				class="px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap {selectedTab === 'rejected'
					? 'text-white border-red-500 bg-red-500/10'
					: 'text-gray-400 border-transparent hover:text-white hover:bg-slate-700/30'}"
			>
				Rejected ({data.rejectedProposals.length})
			</button>
			<button
				type="button"
				onclick={() => (selectedTab = "expired")}
				class="px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap {selectedTab === 'expired'
					? 'text-white border-gray-500 bg-gray-500/10'
					: 'text-gray-400 border-transparent hover:text-white hover:bg-slate-700/30'}"
			>
				Expired ({data.expiredProposals.length})
			</button>
		</div>

		<!-- Proposals List -->
		<div class="p-4 space-y-4">
			{#if displayedProposals.length === 0}
				<div class="text-center py-12">
					<FluentDocument20Filled class="size-16 text-gray-600 mx-auto mb-3" />
					<p class="text-gray-400">No proposals in this category</p>
				</div>
			{:else}
				{#each displayedProposals as proposal}
					{@const StatusIcon = statusIcons[proposal.isActive ? "active" : proposal.status] || statusIcons.expired}

					<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
						<!-- Header -->
						<div class="p-4 border-b border-white/5">
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="flex items-center gap-2 flex-wrap">
									<!-- Proposal Type Badge -->
									<span
										class="px-2 py-1 rounded-lg text-xs font-semibold border {proposalTypeColors[
											proposal.proposalType
										]}"
									>
										{proposalTypeIcons[proposal.proposalType]}
										{proposal.proposalType.replace("_", " ").toUpperCase()}
									</span>

									<!-- Status Badge -->
									<span class="px-2 py-1 rounded-lg text-xs font-semibold border {getStatusColor(proposal)}">
										<StatusIcon class="inline size-3 mr-1" />
										{getStatusLabel(proposal)}
									</span>

									<!-- User's Vote Badge -->
									{#if proposal.userVote}
										<span
											class="px-2 py-1 rounded-lg text-xs font-semibold border {getVoteBadgeColor(proposal.userVote)}"
										>
											{#if proposal.userVote === "for"}
												<FluentCheckmark20Filled class="inline size-3 mr-1" />
											{:else if proposal.userVote === "against"}
												<FluentDismiss20Filled class="inline size-3 mr-1" />
											{:else}
												<FluentSubtractCircle20Filled class="inline size-3 mr-1" />
											{/if}
											You voted: {proposal.userVote.toUpperCase()}
										</span>
									{/if}
								</div>

								<div class="text-right">
									<p class="text-xs text-gray-500">Created</p>
									<p class="text-xs text-gray-400">{formatDate(proposal.createdAt)}</p>
								</div>
							</div>

							<!-- Proposal Details -->
							<div class="mb-3">
								<h3 class="text-lg font-bold text-white mb-1">{proposal.changeTitle}</h3>
								<p class="text-sm text-gray-400">{proposal.changeDescription}</p>
							</div>

							<!-- Proposer -->
							<a
								href="/user/{proposal.proposedBy.id}"
								class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit"
							>
								<Logo src={proposal.proposedBy.logo} alt={proposal.proposedBy.name} />
								<span>by <span class="text-white font-medium">{proposal.proposedBy.name}</span></span>
							</a>
						</div>

						<!-- Voting Results -->
						<div class="p-4 space-y-3">
							<div class="grid grid-cols-3 gap-4 text-center mb-4">
								<div>
									<p class="text-2xl font-bold text-green-400">{proposal.voteCounts.for}</p>
									<p class="text-xs text-gray-400">For ({proposal.percentageFor.toFixed(1)}%)</p>
								</div>
								<div>
									<p class="text-2xl font-bold text-red-400">{proposal.voteCounts.against}</p>
									<p class="text-xs text-gray-400">Against ({proposal.percentageAgainst.toFixed(1)}%)</p>
								</div>
								<div>
									<p class="text-2xl font-bold text-gray-400">{proposal.voteCounts.abstain}</p>
									<p class="text-xs text-gray-400">Abstain</p>
								</div>
							</div>

							<!-- Vote Bars -->
							<div class="space-y-2">
								<div>
									<div class="flex justify-between text-sm mb-1">
										<span class="text-green-400 font-medium flex items-center gap-1">
											<FluentCheckmark20Filled class="size-4" />
											For
										</span>
										<span class="text-white">{proposal.percentageFor.toFixed(1)}%</span>
									</div>
									<div class="w-full bg-slate-700 rounded-full h-2">
										<div
											class="bg-green-500 h-2 rounded-full transition-all"
											style="width: {proposal.percentageFor}%"
										/>
									</div>
								</div>

								<div>
									<div class="flex justify-between text-sm mb-1">
										<span class="text-red-400 font-medium flex items-center gap-1">
											<FluentDismiss20Filled class="size-4" />
											Against
										</span>
										<span class="text-white">{proposal.percentageAgainst.toFixed(1)}%</span>
									</div>
									<div class="w-full bg-slate-700 rounded-full h-2">
										<div
											class="bg-red-500 h-2 rounded-full transition-all"
											style="width: {proposal.percentageAgainst}%"
										/>
									</div>
								</div>
							</div>

							<!-- Summary -->
							<div class="pt-3 border-t border-white/5">
								<div class="flex items-center justify-between text-xs">
									<div class="flex items-center gap-4">
										<span class="text-gray-400">
											{proposal.totalVotes} total vote{proposal.totalVotes !== 1 ? "s" : ""}
										</span>
										<span class="text-gray-400">{proposal.requiredMajority}% required to pass</span>
									</div>
									{#if proposal.votingEnded}
										<span class="text-gray-500">Voting ended {formatDate(proposal.votingEndsAt)}</span>
									{:else}
										<span class="text-blue-400">Voting ends {formatDate(proposal.votingEndsAt)}</span>
									{/if}
								</div>

								<!-- Pass/Fail Indicator (for ended proposals) -->
								{#if proposal.votingEnded || proposal.status !== "active"}
									<div class="mt-2">
										{#if proposal.status === "passed" || (proposal.votingEnded && proposal.didPass)}
											<div class="flex items-center gap-2 text-green-400">
												<FluentCheckmarkCircle20Filled class="size-4" />
												<span class="text-sm font-semibold">
													Proposal passed with {proposal.percentageFor.toFixed(1)}% support
												</span>
											</div>
										{:else if proposal.status === "rejected" || (proposal.votingEnded && !proposal.didPass)}
											<div class="flex items-center gap-2 text-red-400">
												<FluentDismissCircle20Filled class="size-4" />
												<span class="text-sm font-semibold">
													Proposal rejected with only {proposal.percentageFor.toFixed(1)}% support
												</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
