<!-- src/routes/(authenticated)/(dock)/state/[id]/election/[electionId]/+page.svelte -->
<!-- A ballot paper: one box per party to mark, a "VOTED" stamp once cast,
     and the count printed on the same paper after the polls close. -->
<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { onMount } from "svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { formatDateTime } from "#lib/utils/formatting.js";

	const { data } = $props();

	let currentTime = $state(new Date());
	let isSubmittingVote = $state(false);
	let ballotEl = $state<HTMLElement | null>(null);
	// Pending selection before the voter confirms — once `data.userVote` is set
	// server-side, the vote is final and this no longer changes.
	let selectedPartyId = $state<number | null>(null);

	onMount(() => {
		const interval = setInterval(() => (currentTime = new Date()), 1000);
		return () => clearInterval(interval);
	});

	const isActive = $derived(
		currentTime >= new Date(data.election.startDate) && currentTime <= new Date(data.election.endDate)
	);
	const hasEnded = $derived(currentTime > new Date(data.election.endDate));
	const hasStarted = $derived(currentTime >= new Date(data.election.startDate));
	const canVote = $derived(data.voterEligible && isActive);

	const countdown = $derived.by(() => {
		const target = !hasStarted ? new Date(data.election.startDate) : !hasEnded ? new Date(data.election.endDate) : null;
		if (!target) return null;
		const diff = target.getTime() - currentTime.getTime();
		if (diff <= 0) return null;
		const pad = (n: number) => String(n).padStart(2, "0");
		const days = Math.floor(diff / 86_400_000);
		const hms = `${pad(Math.floor((diff % 86_400_000) / 3_600_000))}:${pad(Math.floor((diff % 3_600_000) / 60_000))}:${pad(Math.floor((diff % 60_000) / 1000))}`;
		return days > 0 ? `${days}d ${hms}` : hms;
	});

	const votesByParty = $derived(data.votesByParty as Record<number, number>);
	const votesFor = (partyId: number) => votesByParty[partyId] || 0;
	const percentOf = (partyId: number) =>
		data.resultsVisible && data.totalVotes ? (votesFor(partyId) / data.totalVotes) * 100 : 0;

	// Ranked by votes once results are out; alphabetical before, so the order
	// itself doesn't give the standings away.
	const sortedParties = $derived(
		[...data.parties].sort((a, b) =>
			data.resultsVisible ? votesFor(b.id) - votesFor(a.id) : a.name.localeCompare(b.name)
		)
	);

	const selectedParty = $derived(data.parties.find((p) => p.id === selectedPartyId));

	// When the countdown runs out, fetch the results without a manual reload.
	$effect(() => {
		if (hasEnded && !data.resultsVisible) invalidateAll();
	});
</script>

<svelte:head>
	<title>{`Election · ${data.state.name} · PsyOps`}</title>
</svelte:head>

<PageContainer maxWidth="3xl">
	<article bind:this={ballotEl} class="panel rounded-sm overflow-hidden relative">
		<!-- Ballot heading -->
		<header class="px-5 pt-5 pb-4 text-center border-b-2 border-double border-line/30">
			<a href="/state/{data.state.id}" class="inline-block">
				<Logo
					src={data.state.logo}
					alt={data.state.name}
					class="size-12 rounded-sm mx-auto"
					placeholderIcon={FluentBuildingGovernment20Filled}
				/>
			</a>
			<p class="mt-2 text-[10px] uppercase tracking-[0.3em] text-fg-muted">Official Ballot</p>
			<h1
				class="mt-1 font-serif text-2xl sm:text-3xl font-black leading-tight {data.election.isInaugural
					? 'text-primary-fg'
					: 'text-fg'}"
			>
				{data.election.isInaugural ? "Founding" : "General"} Election
			</h1>
			<p class="mt-1 text-sm text-fg-soft">
				Parliament of <a href="/state/{data.state.id}" class="hover:text-primary-hover">{data.state.name}</a>
				· {data.election.totalSeats} seats
			</p>
			<p class="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-fg-muted">
				{#if hasEnded}
					<Badge tone="neutral" size="xs">Polls closed</Badge>
					<span>{data.totalVotes.toLocaleString()} ballots counted</span>
				{:else if countdown}
					<Badge tone={hasStarted ? "amber" : "blue"} size="xs">{hasStarted ? "Polls open" : "Opens soon"}</Badge>
					<span>{hasStarted ? "closes in" : "opens in"}</span>
					<span class="font-mono text-sm text-fg tabular-nums">{countdown}</span>
				{/if}
			</p>
			<p class="mt-1 text-[10px] text-fg-muted/80">
				{formatDateTime(data.election.startDate)} – {formatDateTime(data.election.endDate)}
			</p>
			{#if hasEnded}
				<a
					href="/state/{data.state.id}/history"
					class="mt-2 inline-block text-[11px] text-fg-muted hover:text-primary-fg hover:underline"
				>
					State timeline →
				</a>
			{/if}
		</header>

		{#if data.userVote}
			<span
				class="animate-stamp absolute top-4 right-3 border-[3px] border-positive/75 text-positive-fg rounded-sm px-2 py-0.5 font-serif text-base font-black uppercase tracking-[0.25em] pointer-events-none"
				style="--stamp-tilt: 9deg"
			>
				Voted
			</span>
		{/if}

		{#if data.parties.length === 0}
			<div class="p-5">
				<EmptyState icon={FluentFlag20Filled} title="No parties on the ballot" />
			</div>
		{:else}
			<!-- Instruction line, as printed on real ballots -->
			<p class="px-5 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-fg-muted bg-surface-4/60">
				{#if data.resultsVisible}
					Result
				{:else if data.userVote}
					Your ballot is in the box
				{:else if data.voterIssue}
					<span class="text-red-300 normal-case tracking-normal text-xs">{data.voterIssue}</span>
				{:else}
					Mark one box only
				{/if}
			</p>

			<ol role={canVote && !data.userVote ? "radiogroup" : undefined} aria-label="Ballot">
				{#each sortedParties as party, index (party.id)}
					{@const votes = votesFor(party.id)}
					{@const percentage = percentOf(party.id)}
					{@const isUserVote = data.userVote === party.id}
					{@const isSelected = selectedPartyId === party.id}
					{@const hasEnoughMembers = party.memberCount >= 3}
					{@const selectable = canVote && hasEnoughMembers && !data.userVote}
					{@const marked = isUserVote || isSelected}
					<li
						class="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b border-dashed border-line/20 last:border-0 transition-colors {isUserVote
							? 'bg-positive-bg/10'
							: isSelected
								? 'bg-primary/8'
								: selectable
									? 'hover:bg-surface-9/60 cursor-pointer'
									: ''} {!hasEnoughMembers ? 'opacity-60' : ''}"
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
						<span class="w-5 shrink-0 text-center font-serif text-sm font-bold text-fg-muted">{index + 1}</span>

						<a href="/party/{party.id}" class="shrink-0" onclick={(e) => e.stopPropagation()}>
							{#if party.logo}
								<Logo
									src={party.logo}
									alt={party.name}
									class="size-11 sm:size-12 rounded-sm"
									placeholderIcon={FluentFlag20Filled}
								/>
							{:else}
								<span
									class="size-11 sm:size-12 rounded-sm flex items-center justify-center text-sm font-bold text-fg"
									style="background-color: {party.color}"
								>
									{party.abbreviation || party.name.substring(0, 2)}
								</span>
							{/if}
						</a>

						<div class="flex-1 min-w-0 space-y-1">
							<a
								href="/party/{party.id}"
								class="block font-serif text-base sm:text-lg font-black text-fg hover:text-primary-hover transition-colors truncate"
								onclick={(e) => e.stopPropagation()}
							>
								{party.name}
							</a>
							{#if data.resultsVisible}
								<a
									href="/party/{party.id}/history"
									class="text-[10px] text-fg-muted hover:text-primary-fg hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									Party timeline →
								</a>
							{/if}
							<div class="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-fg-muted">
								{#if party.leader?.accountId}
									<span class="min-w-0" onclick={(e) => e.stopPropagation()} role="presentation">
										<UserLink
											id={party.leader.accountId}
											name={party.leader.name}
											avatar={party.leader.logo}
											size="xs"
										/>
									</span>
								{/if}
								<span class="inline-flex items-center gap-1 {hasEnoughMembers ? '' : 'text-red-300'}">
									<FluentPeople20Filled class="size-3.5" />
									{party.memberCount}{#if !hasEnoughMembers}&nbsp;· needs 3{/if}
								</span>
								{#if party.ideology}
									<span class="truncate" style="color: {party.color}">{party.ideology}</span>
								{/if}
							</div>
							{#if data.resultsVisible && data.totalVotes}
								<div class="flex items-center gap-2 pt-0.5">
									<div class="flex-1 h-1.5 rounded-full bg-surface-0 overflow-hidden">
										<div
											class="h-full rounded-full transition-all duration-700 ease-out"
											style="width: {percentage}%; background: {party.color}"
										></div>
									</div>
									<span class="shrink-0 font-mono text-xs text-fg">
										{votes} · {percentage.toFixed(1)}%
									</span>
								</div>
							{/if}
						</div>

						<!-- The box to mark -->
						{#if !data.resultsVisible || isUserVote}
							<span
								class="shrink-0 size-9 rounded-[2px] border-2 flex items-center justify-center {isUserVote
									? 'border-positive text-positive-fg'
									: isSelected
										? 'border-primary text-primary-fg'
										: 'border-line/45 text-transparent'}"
								aria-hidden="true"
							>
								{#if marked}
									<span
										class="font-serif text-2xl font-black leading-none animate-stamp"
										style="--stamp-tilt: -6deg; --rise-delay: 0ms"
									>
										✕
									</span>
								{/if}
							</span>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</article>

	<!-- Cast -->
	{#if data.userResidence && !data.userVote && data.parties.length > 0}
		<form
			method="POST"
			action="?/vote"
			use:enhance={() => {
				isSubmittingVote = true;
				return async ({ update, result }) => {
					isSubmittingVote = false;
					await update();
					toastResult(result);
					if (result.type === "success") celebrate(ballotEl);
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
				icon={FluentVote20Filled}
				disabled={!canVote || !selectedPartyId || isSubmittingVote}
				loading={isSubmittingVote}
				loadingText="Casting..."
			>
				{#if !canVote && !hasStarted}
					Polls not open yet
				{:else if !canVote && hasEnded}
					Polls closed
				{:else if selectedParty}
					Cast ballot for {selectedParty.name}
				{:else}
					Mark a box
				{/if}
			</Button>
			{#if selectedParty}
				<p class="mt-1.5 text-center text-[10px] text-fg-muted">Final once cast</p>
			{/if}
		</form>
	{/if}
</PageContainer>
