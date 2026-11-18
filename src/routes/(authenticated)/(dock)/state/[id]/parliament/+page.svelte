<!-- src/routes/(authenticated)/(dock)/state/[id]/parliament/+page.svelte -->
<!-- The chamber: a hemicycle of seats coloured by party, the members, and the
     bills on the order paper with their live tally. -->
<script lang="ts">
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDateTime, regionCoatUrl } from "#lib/utils/formatting.js";

	const { data } = $props();

	let selectedParty = $state<string | null>(null);
	const billEls: Record<number, HTMLElement> = {};

	/** Toast the result; on success give the bill a small celebration. */
	const onBill =
		(proposalId: number): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
			if (result.type === "success") celebrate(billEls[proposalId]);
		};

	let orderPaperEl = $state<HTMLElement | null>(null);
	const onEnact: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
			if (result.type === "success") celebrate(orderPaperEl);
		};

	const withToast: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
		};

	const billKinds: Record<string, { label: string; tone: "amber" | "green" | "blue" | "red" | "purple" | "neutral" }> =
		{
			tax: { label: "Taxation", tone: "amber" },
			budget: { label: "Budget", tone: "green" },
			infrastructure: { label: "Infrastructure", tone: "blue" },
			hospital: { label: "Health", tone: "red" },
			school: { label: "Education", tone: "purple" },
			power_plant: { label: "Energy", tone: "amber" },
			fortifications: { label: "Defence", tone: "red" },
			border_control: { label: "Borders", tone: "green" },
			exploitation: { label: "Resources", tone: "amber" },
			declare_war: { label: "War", tone: "red" }
		};

	function getTimeRemaining(endDate: string | Date) {
		const diff = new Date(endDate).getTime() - Date.now();
		if (diff <= 0) return "closed";
		const days = Math.floor(diff / 86_400_000);
		const hours = Math.floor((diff % 86_400_000) / 3_600_000);
		const minutes = Math.floor((diff % 3_600_000) / 60_000);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const partyKeyOf = (m: { partyId: number | null }) => (m.partyId ? String(m.partyId) : "independent");
	const partyOf = (key: string) =>
		key === "independent" ? null : (data.parties?.find((p) => String(p.id) === key) ?? null);
	const colorOf = (key: string) => data.partyColors[key] || "#8e9abb";

	// Parties largest first: the order of the seats in the chamber and legend.
	const partyOrder = $derived(
		Object.entries(data.partyDistribution as Record<string, number>).sort((a, b) => b[1] - a[1])
	);

	/** Seat positions on a half-circle, left to right, so parties form wedges. */
	const seats = $derived.by(() => {
		const n = data.totalSeats;
		if (!n) return [];
		const rows = Math.max(1, Math.min(8, Math.round(Math.sqrt(n / 4))));
		const inner = 38;
		const outer = 94;
		const step = rows > 1 ? (outer - inner) / (rows - 1) : 0;
		const radii = Array.from({ length: rows }, (_, i) => (rows > 1 ? inner + i * step : (inner + outer) / 2));
		const radiusSum = radii.reduce((s, r) => s + r, 0);
		const perRow = radii.map((r) => Math.max(1, Math.floor((n * r) / radiusSum)));
		perRow[rows - 1] += n - perRow.reduce((s, c) => s + c, 0);

		const positions: { x: number; y: number; angle: number; r: number }[] = [];
		radii.forEach((r, i) => {
			const k = perRow[i];
			for (let j = 0; j < k; j++) {
				const angle = k === 1 ? Math.PI / 2 : Math.PI - (j * Math.PI) / (k - 1);
				positions.push({ x: 100 + r * Math.cos(angle), y: 100 - r * Math.sin(angle), angle, r });
			}
		});
		positions.sort((a, b) => b.angle - a.angle || a.r - b.r);

		const keys = partyOrder.flatMap(([key, count]) => Array(count).fill(key) as string[]);
		const dot = Math.min(rows > 1 ? step * 0.42 : 6, 6, (Math.PI * outer) / (perRow[rows - 1] * 2.3));
		return positions.map((p, i) => ({ ...p, key: keys[i] ?? "independent", dot }));
	});

	const roleRank = (role: string | null) => (role === "leader" ? 0 : role === "deputy" ? 1 : 2);
	const members = $derived(
		data.parliamentMembers
			.filter((m) => !selectedParty || partyKeyOf(m) === selectedParty)
			.toSorted(
				(a, b) =>
					roleRank(a.partyRole) - roleRank(b.partyRole) ||
					new Date(a.electedAt).getTime() - new Date(b.electedAt).getTime()
			)
	);

	const canDraft = $derived(data.totalSeats > 0 && (data.isParliamentMember || data.canAutoAccept));

	const electionPhase = $derived.by(() => {
		if (!data.nextElection) return null;
		const now = new Date();
		if (now < new Date(data.nextElection.startDate)) return "scheduled";
		if (now <= new Date(data.nextElection.endDate)) return "active";
		return null;
	});
</script>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Parliament"
		subtitle={data.totalSeats > 0 ? `${data.totalSeats} seats · ${partyOrder.length} groups` : undefined}
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	>
		{#snippet actions()}
			<Button href="/state/{data.state.id}/proposal" variant="secondary" size="sm" icon={FluentHistory20Filled}>
				Archive
			</Button>
			{#if canDraft}
				<Button href="/state/{data.state.id}/proposal/create" variant="primary" size="sm" icon={FluentAdd20Filled}>
					Draft Bill
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Election notice -->
	{#if data.nextElection && electionPhase}
		{@const isActive = electionPhase === "active"}
		<a
			href="/state/{data.state.id}/election/{data.nextElection.id}"
			class="group flex items-center gap-3 rounded-sm p-3 sm:p-4 border transition-colors {isActive
				? 'bg-[#f5a524]/12 border-[#f5a524]/35 hover:border-[#f5a524]/60'
				: 'panel-interactive'}"
		>
			<FluentVote20Filled class="size-5 shrink-0 {isActive ? 'text-[#ffcb6b]' : 'text-[#6aa8ff]'}" />
			<div class="flex-1 min-w-0">
				<p class="text-sm font-bold text-[#eef2ff] flex items-center gap-2 flex-wrap">
					{data.nextElection.isInaugural ? "Founding election" : "General election"}
					{#if isActive}<Badge tone="amber" size="xs">Polls open</Badge>{/if}
				</p>
				<p class="text-xs text-[#8e9abb] truncate">
					{data.nextElection.totalSeats} seats ·
					{isActive
						? `closes in ${getTimeRemaining(data.nextElection.endDate)}`
						: `opens in ${getTimeRemaining(data.nextElection.startDate)}`}
				</p>
			</div>
			<span class="shrink-0 text-xs font-semibold text-[#ffcb6b] group-hover:text-[#ffe1a6]">
				{isActive ? "Vote →" : "Ballot →"}
			</span>
		</a>
	{/if}

	{#if data.totalSeats > 0}
		<!-- The chamber -->
		<section class="panel rounded-sm p-4 sm:p-5 space-y-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="section-title">The Chamber</h2>
				{#if data.isParliamentMember}
					<Badge tone="blue" size="xs" icon={FluentCheckmark20Filled}>You hold a seat</Badge>
				{:else if data.canAutoAccept}
					<Badge tone="amber" size="xs">Government</Badge>
				{/if}
			</div>

			<svg viewBox="0 0 200 104" class="w-full max-w-xl mx-auto block" role="img" aria-label="Seat distribution">
				{#each seats as seat, i (i)}
					<circle
						cx={seat.x}
						cy={seat.y}
						r={seat.dot}
						fill={colorOf(seat.key)}
						class="animate-pop-in transition-opacity duration-200"
						style="--rise-delay: {Math.min(
							i * 8,
							400
						)}ms; transform-origin: {seat.x}px {seat.y}px; opacity: {selectedParty && selectedParty !== seat.key
							? 0.18
							: 1}"
					/>
				{/each}
				<text x="100" y="98" text-anchor="middle" class="fill-[#eef2ff] font-mono font-bold" font-size="16">
					{selectedParty ? (data.partyDistribution[selectedParty] ?? 0) : data.totalSeats}
				</text>
			</svg>

			<!-- Legend / filter -->
			<div class="flex flex-wrap justify-center gap-2">
				{#each partyOrder as [key, count] (key)}
					{@const party = partyOf(key)}
					{@const active = selectedParty === key}
					<button
						type="button"
						onclick={() => (selectedParty = active ? null : key)}
						aria-pressed={active}
						class="press-spring tap-target inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs transition-colors {active
							? 'border-[#f5a524]/60 bg-[#f5a524]/12 text-[#eef2ff]'
							: 'border-[#8ea6e0]/20 bg-[#131c33]/60 text-[#c2cbe3] hover:border-[#f5a524]/40'}"
					>
						<span class="size-2.5 rounded-full shrink-0" style="background-color: {colorOf(key)}"></span>
						<span class="font-semibold truncate max-w-32">{party?.abbreviation || party?.name || "Independent"}</span>
						<span class="font-mono text-[#8e9abb]">{count}</span>
					</button>
				{/each}
			</div>

			<!-- Selected party card -->
			{#if selectedParty && selectedParty !== "independent"}
				{@const party = partyOf(selectedParty)}
				{#if party}
					<a
						href="/party/{selectedParty}"
						class="group panel-interactive rounded-sm p-3 flex items-center gap-3 animate-rise-in"
					>
						<Logo
							src={party.logo}
							alt=""
							class="size-10 rounded-sm shrink-0"
							placeholderGradient="from-[#33456f] to-[#1b2641]"
						/>
						<div class="flex-1 min-w-0">
							<p class="font-bold text-[#eef2ff] truncate group-hover:text-[#ffc857] transition-colors">
								{party.name}
							</p>
							<p class="text-xs text-[#8e9abb] truncate">
								{#if party.ideology}{party.ideology} ·
								{/if}{Math.round(((data.partyDistribution[selectedParty] ?? 0) / data.totalSeats) * 100)}% of seats
							</p>
						</div>
						<FluentChevronRight20Filled class="size-4 shrink-0 text-[#8e9abb] group-hover:text-[#ffc857]" />
					</a>
				{/if}
			{/if}

			<!-- Members -->
			<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 pt-4 border-t border-[#8ea6e0]/10">
				{#each members as member (member.userId)}
					{@const key = partyKeyOf(member)}
					{@const party = partyOf(key)}
					<li class="flex items-center gap-2 min-w-0">
						<span
							class="w-1 self-stretch rounded-full shrink-0"
							style="background-color: {colorOf(key)}"
							aria-hidden="true"
						></span>
						<UserLink
							id={member.userId}
							name={member.name}
							avatar={member.logo}
							party={party ? { abbreviation: party.abbreviation, color: party.color } : null}
							subtitle={member.partyRole === "leader"
								? "Party leader"
								: member.partyRole === "deputy"
									? "Deputy leader"
									: null}
						/>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Order paper: bills before the house -->
		<section bind:this={orderPaperEl} class="space-y-3 rounded-sm">
			<h2 class="section-title">
				<FluentDocument20Filled class="size-5 text-[#b9a1ff]" />
				Order Paper
			</h2>

			{#if data.proposals.length === 0}
				<EmptyState icon={FluentDocument20Filled} title="No bills before the house">
					{#snippet actions()}
						{#if canDraft}
							<Button
								href="/state/{data.state.id}/proposal/create"
								variant="secondary"
								size="sm"
								icon={FluentAdd20Filled}
							>
								Draft Bill
							</Button>
						{/if}
					{/snippet}
				</EmptyState>
			{:else}
				{#each data.proposals as proposal (proposal.id)}
					{@const kind = billKinds[proposal.proposalType] ?? {
						label: proposal.proposalType.replace(/_/g, " "),
						tone: "neutral"
					}}
					{@const required = proposal.requiredMajority ?? 50}
					<article bind:this={billEls[proposal.id]} class="panel rounded-sm overflow-hidden">
						<!-- Bill heading -->
						<div class="px-4 sm:px-5 pt-4 pb-3 border-b border-double border-[#8ea6e0]/25">
							<div
								class="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#8e9abb]"
							>
								<span></span>
								<span
									class="font-mono normal-case tracking-normal flex items-center gap-1"
									title="Voting ends {formatDateTime(proposal.votingEndsAt)}"
								>
									<FluentClock20Filled class="size-3" />
									{getTimeRemaining(proposal.votingEndsAt)}
								</span>
							</div>
							<h3 class="mt-1.5 font-serif text-xl font-black text-[#eef2ff] leading-snug break-words">
								{proposal.changeTitle}
							</h3>
							<div class="mt-2 flex items-center gap-2 flex-wrap text-xs text-[#8e9abb]">
								<Badge tone={kind.tone} size="xs">{kind.label}</Badge>
								<span>Sponsored by</span>
								<UserLink
									id={proposal.proposedBy.id}
									name={proposal.proposedBy.name}
									avatar={proposal.proposedBy.logo}
									party={proposal.proposedBy.party}
									size="xs"
								/>
							</div>
						</div>

						<!-- Clause -->
						<div class="px-4 sm:px-5 py-3 space-y-2">
							<p class="text-sm text-[#c2cbe3]">
								<span class="font-serif font-bold text-[#8e9abb] mr-1">§ 1</span
								>{proposal.changeDescription}{#if proposal.region}<span>
										in
										<a
											href="/region/{proposal.region.id}"
											class="inline-flex items-center gap-1 align-middle text-[#c3dbff] hover:text-[#e6f0ff]"
										>
											<Logo
												src={regionCoatUrl(proposal.region.id)}
												alt=""
												class="size-4 rounded-sm"
												placeholderIcon={FluentShield20Filled}
											/>{proposal.region.name}</a
										></span
									>{/if}.
							</p>
						</div>

						<!-- Tally -->
						<div class="px-4 sm:px-5 pb-4 space-y-1.5">
							<div class="flex items-center justify-between text-xs font-mono gap-2">
								<span class="text-[#aef3c9]">
									Ayes <strong>{proposal.voteCounts.for}</strong>
								</span>
								<span class="text-[#8e9abb]">{proposal.totalVotes}/{data.totalSeats} voted</span>
								<span class="text-red-300">
									Noes <strong>{proposal.voteCounts.against}</strong>
								</span>
							</div>
							<div class="relative h-2.5 rounded-full bg-[#0b1120] flex overflow-hidden">
								<div
									class="bg-[#4fd88a] h-full transition-all duration-500"
									style="width: {proposal.percentageFor}%"
								></div>
								<div
									class="bg-red-500 h-full ml-auto transition-all duration-500"
									style="width: {proposal.percentageAgainst}%"
								></div>
								<div
									class="absolute inset-y-0 w-0.5 bg-[#eef2ff]/80"
									style="left: {required}%"
									title="{required}% needed"
								></div>
							</div>
							<p class="text-[10px] text-[#8e9abb] text-center">{required}% of votes cast to pass</p>
						</div>

						<!-- Division -->
						{#if data.isParliamentMember || data.canAutoAccept}
							<div class="px-4 sm:px-5 py-3 border-t border-[#8ea6e0]/10 bg-[#131c33]/50 space-y-2">
								{#if data.isParliamentMember}
									<form method="POST" action="?/vote" use:enhance={onBill(proposal.id)} class="flex items-center gap-2">
										<input type="hidden" name="proposalId" value={proposal.id} />
										<Button
											type="submit"
											name="voteType"
											value="for"
											variant={proposal.userVote === "for" ? "success" : "soft-emerald"}
											size="sm"
											grow
											icon={FluentCheckmark20Filled}
										>
											Aye
										</Button>
										<Button
											type="submit"
											name="voteType"
											value="against"
											variant={proposal.userVote === "against" ? "danger" : "soft-red"}
											size="sm"
											grow
											icon={FluentDismiss20Filled}
										>
											No
										</Button>
										{#if proposal.userVote}
											{#key proposal.userVote}
												<span
													class="animate-stamp shrink-0 border-2 rounded-sm px-1.5 py-0.5 font-serif text-[10px] font-black uppercase tracking-widest {proposal.userVote ===
													'for'
														? 'border-[#4fd88a]/70 text-[#aef3c9]'
														: 'border-red-500/70 text-red-300'}"
													style="--stamp-tilt: -8deg; --rise-delay: 0ms"
												>
													{proposal.userVote === "for" ? "Aye" : "No"}
												</span>
											{/key}
										{/if}
									</form>
								{/if}

								{#if data.canAutoAccept}
									<div class="flex items-center gap-2">
										<form
											method="POST"
											action="?/acceptProposal"
											class="flex-1"
											use:confirmSubmit={{
												title: "Enact this bill now?",
												body: "It passes immediately, without waiting for the vote.",
												confirmLabel: "Enact"
											}}
											use:enhance={onEnact}
										>
											<input type="hidden" name="proposalId" value={proposal.id} />
											<Button type="submit" variant="soft-amber" size="sm" block icon={FluentCheckmarkCircle20Filled}>
												Enact now
											</Button>
										</form>
										<form
											method="POST"
											action="?/rejectProposal"
											class="flex-1"
											use:confirmSubmit={{
												title: "Strike down this bill?",
												body: "Voting ends and the bill is rejected.",
												confirmLabel: "Reject",
												danger: true
											}}
											use:enhance={withToast}
										>
											<input type="hidden" name="proposalId" value={proposal.id} />
											<Button type="submit" variant="soft-red" size="sm" block icon={FluentDismiss20Filled}>
												Strike down
											</Button>
										</form>
									</div>
								{/if}
							</div>
						{/if}
					</article>
				{/each}
			{/if}
		</section>
	{:else}
		<EmptyState
			icon={FluentPeople20Filled}
			title="The chamber is empty"
			subtitle={data.nextElection ? "Seats are filled when the election closes." : undefined}
		>
			{#snippet actions()}
				{#if data.nextElection?.isInaugural}
					<Button href="/party/create" variant="secondary" size="sm">Found a Party</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{/if}
</PageContainer>
