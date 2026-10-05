<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/+page.svelte -->
<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	const { data } = $props();

	let selectedTab = $state<"all" | "passed" | "rejected">("all");

	const displayedProposals = $derived.by(() => {
		switch (selectedTab) {
			case "passed":
				return data.passedProposals;
			case "rejected":
				return data.rejectedProposals;
			default:
				return data.allProposals;
		}
	});
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader
		title="Proposal History"
		icon={FluentHistory20Filled}
		backHref="/state/{data.state.id}/parliament"
		backLabel="{data.state.name} — Parliament"
	/>

	<!-- Tabs -->
	<div class="panel rounded-sm overflow-hidden">
		<div class="flex border-b border-[#dfceb0]/15">
			<button
				type="button"
				onclick={() => (selectedTab = "all")}
				class="flex-1 px-3 sm:px-6 py-4 text-sm font-medium text-center transition-colors border-b-2 whitespace-nowrap {selectedTab ===
				'all'
					? 'text-[#fff7e8] border-[#e6a527] bg-[#e6a527]/10'
					: 'text-[#a89e8e] border-transparent hover:text-[#fff7e8] hover:bg-[#19304b]'}"
			>
				All ({data.allProposals.length})
			</button>
			<button
				type="button"
				onclick={() => (selectedTab = "passed")}
				class="flex-1 px-3 sm:px-6 py-4 text-sm font-medium text-center transition-colors border-b-2 whitespace-nowrap {selectedTab ===
				'passed'
					? 'text-[#fff7e8] border-[#8fae88] bg-[#587252]/15'
					: 'text-[#a89e8e] border-transparent hover:text-[#fff7e8] hover:bg-[#19304b]'}"
			>
				Passed ({data.passedProposals.length})
			</button>
			<button
				type="button"
				onclick={() => (selectedTab = "rejected")}
				class="flex-1 px-3 sm:px-6 py-4 text-sm font-medium text-center transition-colors border-b-2 whitespace-nowrap {selectedTab ===
				'rejected'
					? 'text-[#fff7e8] border-red-500 bg-red-600/10'
					: 'text-[#a89e8e] border-transparent hover:text-[#fff7e8] hover:bg-[#19304b]'}"
			>
				Rejected ({data.rejectedProposals.length})
			</button>
		</div>

		<!-- Proposals List -->
		<div class="p-4 space-y-4">
			{#if displayedProposals.length === 0}
				<div class="text-center py-12">
					<FluentDocument20Filled class="size-16 text-[#a89e8e]/60 mx-auto mb-3" />
					<p class="text-[#a89e8e]">No proposals in this category</p>
				</div>
			{:else}
				{#each displayedProposals as proposal}
					<div class="panel-muted rounded-sm overflow-hidden">
						<!-- Header -->
						<div class="p-4 border-b border-[#dfceb0]/10">
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="text-right ml-auto">
									<p class="text-xs text-[#a89e8e]/70">Created</p>
									<p class="text-xs text-[#a89e8e]">{formatDateTime(proposal.createdAt)}</p>
								</div>
							</div>

							<!-- Proposal Details -->
							<div class="mb-3">
								<h3 class="text-lg font-bold text-[#fff7e8] mb-1">{proposal.changeTitle}</h3>
								<p class="text-sm text-[#a89e8e]">{proposal.changeDescription}</p>

								{#if proposal.region}
									<a
										href="/region/{proposal.region.id}"
										class="inline-flex items-center gap-2 mt-2 text-sm text-[#b7d0e6] hover:text-[#fff7e8] transition-colors w-fit"
									>
										<Logo
											src="/coats/{proposal.region.id}.svg"
											alt={proposal.region.name}
											class="size-6 rounded-sm"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-[#315d8d] to-[#315d8d]"
										/>
										<span>in {proposal.region.name}</span>
									</a>
								{/if}
							</div>

							<!-- Proposer -->
							<a
								href="/user/{proposal.proposedBy.id}"
								class="flex items-center gap-2 text-sm text-[#a89e8e] hover:text-[#fff7e8] transition-colors w-fit"
							>
								<Logo src={proposal.proposedBy.logo} alt={proposal.proposedBy.name} />
								<span class="inline-flex items-center gap-1.5">
									by <span class="text-[#fff7e8] font-medium">{proposal.proposedBy.name}</span>
									{#if proposal.proposedBy.party}
										<PartyTag
											abbreviation={proposal.proposedBy.party.abbreviation}
											color={proposal.proposedBy.party.color}
										/>
									{/if}
								</span>
							</a>
						</div>

						<!-- Voting Results -->
						<div class="p-4 space-y-3">
							<!-- Combined Vote Bar -->
							<div>
								<div class="flex items-center justify-between text-sm mb-1 gap-2">
									<span class="text-[#c6dfbf] font-medium flex items-center gap-1">
										<FluentCheckmark20Filled class="size-4" />
										For: {proposal.voteCounts.for} ({proposal.percentageFor.toFixed(1)}%)
									</span>
									<span class="text-red-300 font-medium flex items-center gap-1">
										Against: {proposal.voteCounts.against} ({proposal.percentageAgainst.toFixed(1)}%)
										<FluentDismiss20Filled class="size-4" />
									</span>
								</div>
								<div class="w-full bg-[#0d1d31] rounded-full h-3 flex overflow-hidden">
									<div class="bg-[#8fae88] h-full transition-all" style="width: {proposal.percentageFor}%"></div>
									<div class="bg-red-500 h-full transition-all" style="width: {proposal.percentageAgainst}%"></div>
								</div>
							</div>

							<!-- Summary -->
							<div class="pt-3 border-t border-[#dfceb0]/10">
								<div class="flex items-center justify-between gap-2 flex-wrap text-xs">
									<div class="flex items-center gap-4 flex-wrap">
										<span class="text-[#a89e8e]">
											{proposal.totalVotes} total vote{proposal.totalVotes !== 1 ? "s" : ""}
										</span>
										<span class="text-[#a89e8e]">{proposal.requiredMajority}% required to pass</span>
									</div>
									{#if proposal.votingEnded}
										<span class="text-[#a89e8e]/70">Voting ended {formatDateTime(proposal.votingEndsAt)}</span>
									{:else}
										<span class="text-[#b7d0e6]">Voting ends {formatDateTime(proposal.votingEndsAt)}</span>
									{/if}
								</div>

								<!-- Pass/Fail Indicator (for ended proposals) -->
								{#if proposal.votingEnded || proposal.status !== "active"}
									<div class="mt-2">
										{#if proposal.status === "passed" || (proposal.votingEnded && proposal.didPass)}
											<div class="flex items-center gap-2 text-[#c6dfbf]">
												<FluentCheckmarkCircle20Filled class="size-4" />
												<span class="text-sm font-semibold">
													Proposal passed with {proposal.percentageFor.toFixed(1)}% support
												</span>
											</div>
										{:else if proposal.status === "rejected" || (proposal.votingEnded && !proposal.didPass)}
											<div class="flex items-center gap-2 text-red-300">
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
</PageContainer>
