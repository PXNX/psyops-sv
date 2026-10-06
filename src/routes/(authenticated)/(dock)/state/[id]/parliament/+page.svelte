<!-- src/routes/(authenticated)/(dock)/state/[id]/parliament/+page.svelte -->
<script lang="ts">
	import SquareLogo from "#lib/component/SquareLogo.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFilterDismiss20Filled from "~icons/fluent/filter-dismiss-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDate, formatDateTime } from "#lib/utils/formatting.js";

	const { data } = $props();

	let selectedParty = $state<string | null>(null);

	const proposalTypeColors: Record<string, string> = {
		budget: "bg-[#3f8a2a]/20 text-[#b9f29a] border-[#6fd14a]/30",
		tax: "bg-[#f2b01e]/15 text-[#ffd35c] border-[#f2b01e]/35",
		infrastructure: "bg-[#2369b5]/20 text-[#b3dcff] border-[#5eaef5]/30",
		hospital: "bg-red-600/10 text-red-300 border-red-500/30",
		school: "bg-[#8a4fc0]/20 text-[#e3cbfb] border-[#c08cf0]/30",
		power_plant: "bg-[#f2b01e]/12 text-[#ffd35c] border-[#f2b01e]/35"
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

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Parliament"
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<!-- Election Banner -->
	{#if data.nextElection}
		{@const now = new Date()}
		{@const start = new Date(data.nextElection.startDate)}
		{@const end = new Date(data.nextElection.endDate)}
		{@const isScheduled = now < start}
		{@const isActive = now >= start && now <= end}

		{#if data.nextElection.isInaugural && isScheduled}
			<!-- Inaugural Election - Scheduled -->
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5 space-y-3">
				<div class="flex items-start gap-3">
					<div class="size-12 bg-[#f2b01e]/20 rounded-sm flex items-center justify-center shrink-0">
						<FluentVote20Filled class="size-6 text-[#ffd35c]" />
					</div>
					<div class="flex-1 space-y-2">
						<h3 class="font-bold text-[#f5efd8] text-lg">Inaugural Election Scheduled! 🎉</h3>
						<p class="text-[#ffe58f]/90 text-sm">
							This state is brand new! The first democratic election will establish the founding parliament of
							<strong>{data.nextElection.totalSeats} seats</strong>.
						</p>

						<div class="panel-muted rounded-sm p-3 space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<FluentCalendar20Filled class="size-4 text-[#ffd35c]" />
								<span class="text-[#ffe58f]">
									<strong>Voting starts in:</strong>
									{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
								</span>
							</div>
							<div class="text-xs text-[#ffe58f]/70">
								<strong>Start:</strong>
								{formatDate(data.nextElection.startDate)}<br />
								<strong>End:</strong>
								{formatDate(data.nextElection.endDate)}
							</div>
						</div>

						<div class="flex gap-2 pt-2">
							<Button
								href="/state/{data.state.id}/election/{data.nextElection.id}"
								variant="primary"
								size="sm"
								icon={FluentVote20Filled}
							>
								View Election Details
							</Button>
							<Button href="/party/create" variant="secondary" size="sm">Create a Party</Button>
						</div>
					</div>
				</div>
			</div>
		{:else if data.nextElection.isInaugural && isActive}
			<!-- Inaugural Election - Active -->
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<FluentVote20Filled class="size-6 text-[#6fd14a] animate-pulse" />
						<div>
							<p class="font-semibold text-[#f5efd8]">Inaugural Election Now Active!</p>
							<p class="text-sm text-[#b9f29a]">Help establish the founding parliament - vote now!</p>
						</div>
					</div>
					<Button
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						variant="primary"
						size="sm"
						icon={FluentVote20Filled}
						class="animate-pulse"
					>
						Vote Now
					</Button>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isScheduled}
			<!-- Regular Election - Scheduled -->
			<div class="panel rounded-sm p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3 flex-1">
						<FluentCalendar20Filled class="size-5 text-[#b3dcff] shrink-0" />
						<div>
							<h3 class="text-sm font-bold text-[#f5efd8]">Upcoming Election</h3>
							<p class="text-xs text-[#a8a083]">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats • starts in {getTimeRemaining(data.nextElection.startDate)}
							</p>
						</div>
					</div>
					<Button href="/state/{data.state.id}/election/{data.nextElection.id}" variant="soft-blue" size="sm">
						View Election
					</Button>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isActive}
			<!-- Regular Election - Active -->
			<div class="bg-[#3f8a2a]/18 rounded-sm border border-[#6fd14a]/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-[#3f8a2a]/30 rounded-sm flex items-center justify-center shrink-0">
							<FluentVote20Filled class="size-6 text-[#6fd14a]" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-[#f5efd8]">Election Active</h3>
								<Badge tone="green">Voting Now</Badge>
							</div>
							<p class="text-sm text-[#a8a083]">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats •
								{getTimeRemaining(data.nextElection.endDate)} remaining
							</p>
						</div>
					</div>
					<Button
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						variant="primary"
						size="sm"
						icon={FluentVote20Filled}
						class="animate-pulse"
					>
						Vote Now
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Parliament Composition -->
	{#if data.totalSeats > 0}
		<div class="panel rounded-sm overflow-hidden">
			<!-- Header -->
			<div class="p-5 border-b border-[#c8b47a]/15">
				<div class="flex items-center justify-between gap-3 mb-4">
					<h2 class="section-title">
						{#if selectedParty}
							{@const partyData =
								selectedParty === "independent" ? null : data.parties?.find((p) => String(p.id) === selectedParty)}
							{partyData?.name ?? "Independent"} Members
						{:else}
							Seat Distribution
						{/if}
					</h2>
					{#if selectedParty}
						<Button type="button" variant="ghost" size="xs" icon={FluentFilterDismiss20Filled} onclick={clearFilter}>
							Clear Filter
						</Button>
					{/if}
				</div>

				<!-- Seat Bar -->
				<div class="flex w-full h-12 rounded-sm overflow-hidden mb-4">
					{#each Object.entries(data.partyDistribution) as [partyKey, seats]}
						{@const partyData =
							partyKey === "independent" ? null : data.parties?.find((p) => String(p.id) === partyKey)}
						{@const partyName = partyData?.name ?? "Independent"}
						<button
							type="button"
							onclick={() => togglePartyFilter(partyKey)}
							style="width: {(seats / data.totalSeats) * 100}%; background-color: {data.partyColors[partyKey] ||
								'#a8a083'}"
							class="flex items-center justify-center text-[#f5efd8] font-semibold text-sm transition-all hover:brightness-110 {selectedParty ===
							partyKey
								? 'ring-2 ring-[#f5efd8] ring-inset'
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
								class="flex items-center gap-2 p-3 rounded-sm border border-transparent transition-colors hover:bg-[#2e3524] hover:border-[#c8b47a]/15"
							>
								<div
									class="size-8 rounded-sm flex-shrink-0"
									style="background-color: {data.partyColors[partyKey] || '#a8a083'}"
								/>

								<div class="flex-1 min-w-0 text-left">
									<p class="text-sm font-medium text-[#f5efd8] truncate">{partyData?.abbreviation || partyName}</p>
									<p class="text-xs text-[#a8a083]">{seats} ({Math.round((seats / data.totalSeats) * 100)}%)</p>
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
							class="group flex items-center gap-3 p-4 rounded-sm border border-[#c8b47a]/15 hover:border-[#f2b01e]/55 transition-colors"
							style="background-color: {data.partyColors[selectedParty]}20"
						>
							{#if partyData?.logo}
								<Logo src={partyData.logo} alt={partyName} class="size-12 rounded-sm flex-shrink-0" />
							{:else}
								<div
									class="size-12 rounded-sm flex-shrink-0"
									style="background-color: {data.partyColors[selectedParty] || '#a8a083'}"
								></div>
							{/if}
							<div class="flex-1 min-w-0">
								<h3 class="font-bold text-lg text-[#f5efd8] mb-1">{partyName}</h3>
								<div class="flex items-center gap-2 flex-wrap text-sm">
									{#if partyData?.ideology}
										<span
											class="px-2 py-0.5 rounded-sm border border-[#c8b47a]/20 bg-[#242a1d] text-[#d3caa9] text-xs font-medium"
										>
											{partyData.ideology}
										</span>
									{/if}
									<span class="text-[#a8a083]">
										{filteredMembers.length} seat{filteredMembers.length !== 1 ? "s" : ""}
									</span>
									<span class="text-[#a8a083]/60">•</span>
									<span class="text-[#a8a083]">
										{Math.round((filteredMembers.length / data.totalSeats) * 100)}% of parliament
									</span>
								</div>
							</div>

							<FluentChevronRight20Filled class="size-4 text-[#a8a083] group-hover:text-[#ffcf47] flex-shrink-0" />
						</a>
					{:else}
						<!-- Independent members banner -->
						<div class="panel-muted rounded-sm p-4">
							<h3 class="font-bold text-lg text-[#f5efd8] mb-1">Independent Members</h3>
							<div class="flex items-center gap-2 flex-wrap text-sm">
								<span class="text-[#a8a083]">
									{filteredMembers.length} seat{filteredMembers.length !== 1 ? "s" : ""}
								</span>
								<span class="text-[#a8a083]/60">•</span>
								<span class="text-[#a8a083]">
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
								class="flex items-center gap-3 group rounded-sm border p-3 transition-colors {isLeader
									? 'bg-[#f2b01e]/12 border-[#f2b01e]/35 hover:border-[#f2b01e]/60'
									: isDeputy
										? 'border-[#5eaef5]/30 hover:bg-[#2e3524]'
										: 'border-transparent hover:bg-[#2e3524] hover:border-[#c8b47a]/15'}"
							>
								<div class="relative">
									<Logo src={member.logo} alt={member.name} />
								</div>
								<div class="flex-1 min-w-0">
									<p
										class="font-medium text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate {isLeader
											? 'font-bold'
											: ''}"
									>
										{member.name}
									</p>
									{#if isLeader}
										<p class="text-xs text-[#ffd35c]">Party Leader</p>
									{:else if isDeputy}
										<p class="text-xs text-[#b3dcff]">Deputy</p>
									{/if}
								</div>
								<FluentChevronRight20Filled class="size-4 text-[#a8a083] group-hover:text-[#ffcf47] flex-shrink-0" />
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Parliament -->
		<div class="panel-muted rounded-sm p-12 text-center">
			<FluentPeople20Filled class="size-16 text-[#a8a083] mx-auto mb-3" />
			<h3 class="text-xl font-bold text-[#f5efd8] mb-2">Parliament Not Yet Formed</h3>
			<p class="text-[#a8a083]">
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
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5 space-y-3">
				<div class="flex items-start gap-3">
					<div class="size-12 bg-[#f2b01e]/20 rounded-sm flex items-center justify-center shrink-0">
						<FluentVote20Filled class="size-6 text-[#ffd35c]" />
					</div>
					<div class="flex-1 space-y-2">
						<h3 class="font-bold text-[#f5efd8] text-lg">Inaugural Election Scheduled! 🎉</h3>
						<p class="text-[#ffe58f]/90 text-sm">
							This state is brand new! The first democratic election will establish the founding parliament of
							<strong>{data.nextElection.totalSeats} seats</strong>.
						</p>

						<div class="panel-muted rounded-sm p-3 space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<FluentCalendar20Filled class="size-4 text-[#ffd35c]" />
								<span class="text-[#ffe58f]">
									<strong>Voting starts in:</strong>
									{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
								</span>
							</div>
							<div class="text-xs text-[#ffe58f]/70">
								<strong>Start:</strong>
								{formatDate(data.nextElection.startDate)}<br />
								<strong>End:</strong>
								{formatDate(data.nextElection.endDate)}
							</div>
						</div>

						<div class="flex gap-2 pt-2">
							<Button
								href="/state/{data.state.id}/election/{data.nextElection.id}"
								variant="primary"
								size="sm"
								icon={FluentVote20Filled}
							>
								View Election Details
							</Button>
							<Button href="/party/create" variant="secondary" size="sm">Create a Party</Button>
						</div>
					</div>
				</div>
			</div>
		{:else if data.nextElection.isInaugural && isActive}
			<!-- Inaugural Election - Active -->
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<FluentVote20Filled class="size-6 text-[#6fd14a] animate-pulse" />
						<div>
							<p class="font-semibold text-[#f5efd8]">Inaugural Election Now Active!</p>
							<p class="text-sm text-[#b9f29a]">Help establish the founding parliament - vote now!</p>
						</div>
					</div>
					<Button
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						variant="primary"
						size="sm"
						icon={FluentVote20Filled}
						class="animate-pulse"
					>
						Vote Now
					</Button>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isScheduled}
			<!-- Regular Election - Scheduled -->
			<div class="panel rounded-sm p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div
							class="size-12 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentCalendar20Filled class="size-6 text-[#b3dcff]" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-[#f5efd8]">Upcoming Election</h3>
							</div>
							<p class="text-sm text-[#a8a083]">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats • starts in {getTimeRemaining(data.nextElection.startDate)}
							</p>
						</div>
					</div>
					<Button href="/state/{data.state.id}/election/{data.nextElection.id}" variant="soft-blue" size="sm">
						View Election
					</Button>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && isActive}
			<!-- Regular Election - Active -->
			<div class="bg-[#3f8a2a]/18 rounded-sm border border-[#6fd14a]/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-[#3f8a2a]/30 rounded-sm flex items-center justify-center shrink-0">
							<FluentVote20Filled class="size-6 text-[#6fd14a]" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-[#f5efd8]">Election Active</h3>
								<Badge tone="green">Voting Now</Badge>
							</div>
							<p class="text-sm text-[#a8a083]">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats •
								{getTimeRemaining(data.nextElection.endDate)} remaining
							</p>
						</div>
					</div>
					<Button
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						variant="primary"
						size="sm"
						icon={FluentVote20Filled}
						class="animate-pulse"
					>
						Vote Now
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	<!-- User Status -->
	{#if data.totalSeats > 0 && data.isParliamentMember}
		<div class="bg-[#2369b5]/18 rounded-sm border border-[#5eaef5]/30 p-4">
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-3">
					<FluentCheckmark20Filled class="size-5 text-[#b3dcff]" />
					<div class="text-sm">
						<span class="text-[#f5efd8] font-semibold">Parliament Member</span>
						<span class="text-[#a8a083]"> • {data.userParty || "Independent"}</span>
						{#if data.userMinistry}
							<span class="text-[#a8a083]"> • Minister of {data.userMinistry}</span>
						{/if}
						{#if data.isPresident}
							<span class="text-[#a8a083]"> • President</span>
						{/if}
					</div>
				</div>
				<Button href="/state/{data.state.id}/proposal/create" variant="primary" size="sm" icon={FluentAdd20Filled}>
					Create Proposal
				</Button>
			</div>
		</div>
	{/if}

	<!-- Active Proposals -->
	{#if data.totalSeats > 0}
		<div class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="section-title">
					<FluentDocument20Filled class="size-5 text-[#c08cf0]" />
					Active Proposals
				</h2>
				<div class="flex gap-2">
					<Button href="/state/{data.state.id}/proposal" variant="ghost" size="sm" icon={FluentHistory20Filled}>
						View History
					</Button>
				</div>
			</div>

			{#if data.proposals.length === 0}
				<div class="panel-muted rounded-sm p-8 text-center">
					<p class="text-[#a8a083]">No active proposals</p>
				</div>
			{:else}
				{#each data.proposals as proposal}
					<div class="panel rounded-sm overflow-hidden">
						<!-- Header -->
						<div class="p-4 border-b border-[#c8b47a]/10">
							<div class="flex items-center justify-between gap-3 mb-3">
								<span
									class="px-2 py-1 rounded-sm text-xs font-semibold border {proposalTypeColors[proposal.proposalType]}"
								>
									{proposalTypeIcons[proposal.proposalType]}
									{proposal.proposalType.replace("_", " ").toUpperCase()}
								</span>
								<span class="text-xs font-mono text-[#a8a083] flex items-center gap-1">
									<FluentClock20Filled class="size-3" />
									{getTimeRemaining(proposal.votingEndsAt)}
								</span>
							</div>

							<!-- Proposal Details -->
							<div class="mb-3">
								<h3 class="text-lg font-bold text-[#f5efd8] mb-1">{proposal.changeTitle}</h3>
								<p class="text-sm text-[#a8a083]">{proposal.changeDescription}</p>

								{#if proposal.region}
									<a
										href="/region/{proposal.region.id}"
										class="inline-flex items-center gap-2 mt-2 text-sm text-[#b3dcff] hover:text-[#f5efd8] transition-colors w-fit"
									>
										<Logo
											src="/coats/{proposal.region.id}.svg"
											alt={proposal.region.name}
											class="size-6 rounded-sm"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-[#2369b5] to-[#2369b5]"
										/>
										<span>in {proposal.region.name}</span>
									</a>
								{/if}
							</div>

							<a
								href="/user/{proposal.proposedBy.id}"
								class="flex items-center gap-2 text-sm text-[#a8a083] hover:text-[#f5efd8] transition-colors w-fit"
							>
								<Logo src={proposal.proposedBy.logo} alt={proposal.proposedBy.name} />
								<span class="inline-flex items-center gap-1.5">
									by <span class="text-[#f5efd8] font-medium">{proposal.proposedBy.name}</span>
									{#if proposal.proposedBy.party}
										<PartyTag
											abbreviation={proposal.proposedBy.party.abbreviation}
											color={proposal.proposedBy.party.color}
										/>
									{/if}
								</span>
							</a>
						</div>

						<!-- Votes -->
						<div class="p-4 space-y-3">
							<div>
								<div class="flex items-center justify-between text-sm mb-1 gap-2">
									<span class="text-[#b9f29a] font-medium flex items-center gap-1">
										<FluentCheckmark20Filled class="size-4" />
										For: {proposal.voteCounts.for} ({proposal.percentageFor.toFixed(1)}%)
									</span>
									<span class="text-red-300 font-medium flex items-center gap-1">
										Against: {proposal.voteCounts.against} ({proposal.percentageAgainst.toFixed(1)}%)
										<FluentDismiss20Filled class="size-4" />
									</span>
								</div>
								<div class="w-full bg-[#0f120c] rounded-full h-3 flex overflow-hidden">
									<div class="bg-[#6fd14a] h-full transition-all" style="width: {proposal.percentageFor}%"></div>
									<div class="bg-red-500 h-full transition-all" style="width: {proposal.percentageAgainst}%"></div>
								</div>
							</div>

							<div
								class="pt-2 border-t border-[#c8b47a]/10 text-xs text-[#a8a083] flex items-center justify-between gap-2 flex-wrap"
							>
								<span>{proposal.totalVotes} / {data.totalSeats} votes • {proposal.requiredMajority}% required</span>
								<span class="text-[#b3dcff]">Voting ends {formatDateTime(proposal.votingEndsAt)}</span>
							</div>
						</div>

						<!-- Voting / Auto-Accept -->
						{#if data.isParliamentMember}
							<div class="p-4 border-t border-[#c8b47a]/10 space-y-3">
								{#if proposal.userVote}
									<p class="text-xs text-center text-[#a8a083] mb-3">
										You voted: <span class="font-semibold text-[#f5efd8] capitalize">{proposal.userVote}</span>
									</p>
								{/if}

								<!-- Auto-Accept/Reject Buttons (Ministers/President) -->
								{#if data.canAutoAccept}
									<div class="grid grid-cols-2 gap-2 mb-2">
										<form method="POST" action="?/acceptProposal" use:enhance>
											<input type="hidden" name="proposalId" value={proposal.id} />
											<Button type="submit" variant="soft-emerald" size="sm" block icon={FluentCheckmarkCircle20Filled}>
												Auto-Accept
											</Button>
										</form>
										<form method="POST" action="?/rejectProposal" use:enhance>
											<input type="hidden" name="proposalId" value={proposal.id} />
											<Button type="submit" variant="soft-red" size="sm" block icon={FluentDismiss20Filled}>
												Auto-Reject
											</Button>
										</form>
									</div>
								{/if}

								<!-- Regular Voting -->
								<form method="POST" action="?/vote" use:enhance class="flex gap-2">
									<input type="hidden" name="proposalId" value={proposal.id} />

									<Button
										type="submit"
										name="voteType"
										value="for"
										variant="soft-emerald"
										size="sm"
										grow
										icon={FluentCheckmark20Filled}
										class={proposal.userVote === "for" ? "ring-2 ring-[#6fd14a]" : ""}
									>
										For
									</Button>

									<Button
										type="submit"
										name="voteType"
										value="against"
										variant="soft-red"
										size="sm"
										grow
										icon={FluentDismiss20Filled}
										class={proposal.userVote === "against" ? "ring-2 ring-red-400" : ""}
									>
										Against
									</Button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</PageContainer>
