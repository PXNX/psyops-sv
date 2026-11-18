<!-- src/routes/(authenticated)/(dock)/state/[id]/proposal/+page.svelte -->
<!-- The archive: every decided bill, with its final tally and the rubber
     stamp it got. -->
<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import { formatDate, regionCoatUrl } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	const { data } = $props();

	let selectedTab = $state<"all" | "passed" | "rejected">("all");

	const displayedProposals = $derived(
		selectedTab === "passed"
			? data.passedProposals
			: selectedTab === "rejected"
				? data.rejectedProposals
				: data.allProposals
	);

	const tabs = $derived([
		{ key: "all" as const, label: "All", count: data.allProposals.length },
		{ key: "passed" as const, label: "Passed", count: data.passedProposals.length },
		{ key: "rejected" as const, label: "Rejected", count: data.rejectedProposals.length }
	]);

	type Outcome = "passed" | "rejected" | "failed";
	function outcomeOf(p: { status: string; votingEnded: boolean; didPass: boolean }): Outcome {
		if (p.status === "failed") return "failed";
		if (p.status === "passed") return "passed";
		if (p.status === "rejected") return "rejected";
		return p.votingEnded && p.didPass ? "passed" : "rejected";
	}

	const stamps: Record<Outcome, { label: string; cls: string; tilt: string }> = {
		passed: { label: "Passed", cls: "border-[#6fd14a]/75 text-[#b9f29a]", tilt: "-9deg" },
		rejected: { label: "Rejected", cls: "border-red-500/75 text-red-300", tilt: "7deg" },
		failed: { label: "Failed", cls: "border-[#f2b01e]/75 text-[#ffd35c]", tilt: "-5deg" }
	};
</script>

<PageContainer maxWidth="4xl">
	<PageHeader
		title="Bill Archive"
		subtitle={data.state.name}
		icon={FluentHistory20Filled}
		backHref="/state/{data.state.id}/parliament"
		backLabel="Parliament"
	/>

	<!-- Drawer tabs -->
	<div class="flex gap-1 border-b border-[#c8b47a]/20" role="tablist">
		{#each tabs as tab (tab.key)}
			<button
				type="button"
				role="tab"
				aria-selected={selectedTab === tab.key}
				onclick={() => (selectedTab = tab.key)}
				class="tap-target flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap {selectedTab ===
				tab.key
					? 'text-[#f5efd8] border-[#f2b01e]'
					: 'text-[#a8a083] border-transparent hover:text-[#f5efd8]'}"
			>
				{tab.label}
				<span class="font-mono text-xs text-[#a8a083]">{tab.count}</span>
			</button>
		{/each}
	</div>

	{#if displayedProposals.length === 0}
		<EmptyState icon={FluentDocument20Filled} title="Nothing filed here yet" />
	{:else}
		<ol class="space-y-3">
			{#each displayedProposals as proposal, i (proposal.id)}
				{@const outcome = outcomeOf(proposal)}
				{@const stamp = stamps[outcome]}
				<li class="panel rounded-sm p-4 sm:p-5 relative overflow-hidden">
					<!-- Rubber stamp -->
					<span
						class="animate-stamp absolute top-4 right-3 sm:right-5 border-[3px] rounded-sm px-2 py-0.5 font-serif text-sm sm:text-base font-black uppercase tracking-[0.2em] opacity-90 pointer-events-none {stamp.cls}"
						style="--stamp-tilt: {stamp.tilt}; --rise-delay: {Math.min(120 + i * 60, 600)}ms"
					>
						{stamp.label}
					</span>

					<p class="font-serif text-[10px] uppercase tracking-[0.2em] text-[#a8a083] pr-28">
						Bill No. {proposal.id} · {formatDate(proposal.createdAt)}
					</p>
					<h3 class="mt-1 font-serif text-lg font-black text-[#f5efd8] leading-snug break-words pr-24 sm:pr-32">
						{proposal.changeTitle}
					</h3>
					<p class="mt-1 text-sm text-[#d3caa9]">
						<span class="font-serif font-bold text-[#a8a083] mr-1">§ 1</span
						>{proposal.changeDescription}{#if proposal.region}
							in
							<a
								href="/region/{proposal.region.id}"
								class="inline-flex items-center gap-1 align-middle text-[#b3dcff] hover:text-[#e3f2ff]"
							>
								<Logo
									src={regionCoatUrl(proposal.region.id)}
									alt=""
									class="size-4 rounded-sm"
									placeholderIcon={FluentShield20Filled}
								/>{proposal.region.name}</a
							>{/if}.
					</p>

					<div class="mt-3 flex items-center gap-2 flex-wrap text-xs text-[#a8a083]">
						<span>Sponsored by</span>
						<UserLink
							id={proposal.proposedBy.id}
							name={proposal.proposedBy.name}
							avatar={proposal.proposedBy.logo}
							party={proposal.proposedBy.party}
							size="xs"
						/>
					</div>

					<!-- Final tally -->
					<div class="mt-3 pt-3 border-t border-dashed border-[#c8b47a]/15 space-y-1.5">
						<div class="relative h-2 rounded-full bg-[#0f120c] flex overflow-hidden">
							<div class="bg-[#6fd14a] h-full" style="width: {proposal.percentageFor}%"></div>
							<div class="bg-red-500 h-full ml-auto" style="width: {proposal.percentageAgainst}%"></div>
							<div
								class="absolute inset-y-0 w-0.5 bg-[#f5efd8]/80"
								style="left: {proposal.requiredMajority ?? 50}%"
							></div>
						</div>
						<p class="flex items-center justify-between gap-2 text-xs font-mono">
							<span class="text-[#b9f29a]">Ayes {proposal.voteCounts.for}</span>
							<span class="text-[#a8a083]">
								{proposal.percentageFor.toFixed(0)}% · {proposal.requiredMajority ?? 50}% needed
							</span>
							<span class="text-red-300">Noes {proposal.voteCounts.against}</span>
						</p>
						{#if outcome === "failed"}
							<p class="text-xs text-[#ffd35c]">Passed the vote, but couldn't be carried out.</p>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</PageContainer>
