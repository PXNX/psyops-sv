<!-- src/routes/bloc/[id]/+page.svelte -->
<script lang="ts">
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeopleTeam20Filled from "~icons/fluent/people-team-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentGlobeShield20Filled from "~icons/fluent/globe-shield-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentThumbLike20Filled from "~icons/fluent/thumb-like-20-filled";
	import FluentThumbDislike20Filled from "~icons/fluent/thumb-dislike-20-filled";
	import { enhance } from "$app/forms";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import ProfileItem from "#lib/component/ProfileItem.svelte";
	import { formatDate, formatDateTime } from "#lib/utils/formatting.js";

	const { data, form } = $props();
</script>

<svelte:head>
	<title>{data.bloc.name}</title>
	<meta name="description" content={data.bloc.description || `The ${data.bloc.name} alliance in PsyOps.`} />
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Hero Section -->
	<div class="panel rounded-sm p-5" style="border-top: 3px solid {data.bloc.color}">
		<div class="flex flex-col sm:flex-row sm:items-start gap-4">
			<div class="flex items-center gap-4 flex-1 min-w-0">
				<!-- Bloc Logo -->
				{#if data.bloc.logo}
					<div class="size-20 rounded-full overflow-hidden bg-[#102239] shrink-0">
						<img src={data.bloc.logo} alt={data.bloc.name} class="w-full h-full object-cover" />
					</div>
				{:else}
					<div
						class="size-20 rounded-full flex items-center justify-center shrink-0"
						style="background-color: {data.bloc.color}30;"
					>
						<FluentFlag20Filled class="size-8" style="color: {data.bloc.color}" />
					</div>
				{/if}

				<div class="min-w-0 space-y-1">
					<h1 class="text-3xl font-bold text-[#fff7e8] break-words">{data.bloc.name}</h1>
					<span class="text-xs text-[#a89e8e] uppercase tracking-wider">Alliance</span>
					{#if data.bloc.description}
						<p class="text-sm text-[#d9ccb7] max-w-xl">{data.bloc.description}</p>
					{/if}
				</div>
			</div>

			{#if data.isLeader}
				<IconButton
					href="/bloc/{data.bloc.id}/edit"
					icon={FluentEdit20Filled}
					label="Edit Bloc"
					variant="secondary"
					size="sm"
					shape="square"
					class="self-end sm:self-start"
				/>
			{:else if data.isMemberPresident}
				<form method="POST" action="?/leave" use:enhance class="self-end sm:self-start">
					<IconButton
						type="submit"
						icon={FluentDismiss20Filled}
						label="Leave Bloc"
						variant="soft-red"
						size="sm"
						shape="square"
						onclick={(e) => {
							if (!confirm(`Are you sure you want to leave ${data.bloc.name}?`)) {
								e.preventDefault();
							}
						}}
					/>
				</form>
			{/if}
		</div>
	</div>

	<!-- Leadership -->
	<section class="panel rounded-sm p-5 space-y-4">
		<h2 class="section-title">
			<FluentPeopleTeam20Filled class="size-5 text-[#f7c56b]" />
			Leadership
		</h2>

		{#if data.leader}
			<ProfileItem
				href="/user/{data.leader.userId}"
				logo={data.leader.logo}
				logoAlt={data.leader.name}
				placeholderIcon={FluentCrown20Filled}
				placeholderGradient="from-[#e6a527]/15 to-[#e6a527]/10"
				title={data.leader.name}
				subtitle="Bloc Leader • elected {formatDate(data.leader.appointedAt)}"
				hoverColor="yellow"
			/>
		{:else}
			<p class="text-sm text-[#a89e8e]">No bloc leader has been elected yet.</p>
		{/if}

		{#if data.diplomats.length > 0}
			<div class="space-y-2 pt-2 border-t border-[#dfceb0]/10">
				<h3 class="text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">Diplomats</h3>
				{#each data.diplomats as diplomat}
					<ProfileItem
						href="/user/{diplomat.userId}"
						logo={diplomat.logo}
						logoAlt={diplomat.name}
						placeholderIcon={FluentGlobeShield20Filled}
						placeholderGradient="from-[#315d8d]/20 to-[#315d8d]/10"
						title={diplomat.name}
						subtitle="Diplomat"
						hoverColor="blue"
					/>
				{/each}
			</div>
		{/if}

		{#if data.election}
			<div class="pt-3 border-t border-[#dfceb0]/10 space-y-3">
				{#if data.election.status === "active"}
					<div class="flex items-center justify-between gap-2 flex-wrap">
						<span class="text-xs font-semibold text-[#c6dfbf] uppercase tracking-wider flex items-center gap-1.5">
							<span class="size-1.5 bg-[#8fae88] rounded-full animate-pulse"></span>
							Leadership Election — Voting Open
						</span>
						<span class="text-[10px] text-[#a89e8e] font-mono">
							Ends {formatDateTime(data.election.votingEndsAt)}
						</span>
					</div>

					{#if data.candidates.length === 0}
						<p class="text-sm text-[#a89e8e]">
							No candidates nominated yet. A state president can nominate a citizen of any member state (not themselves)
							from that citizen's profile page.
						</p>
					{:else}
						<div class="space-y-2">
							{#each data.candidates as candidate}
								{@const isMyVote = data.myBlocLeaderVote === candidate.userId}
								<div
									class="panel-muted rounded-sm overflow-hidden {isMyVote ? 'border-[#8fae88]/50' : 'border-[#dfceb0]/10'}"
								>
									<ProfileItem
										href="/user/{candidate.userId}"
										logo={candidate.logo}
										logoAlt={candidate.name}
										placeholderIcon={FluentPerson20Filled}
										placeholderGradient="from-[#315d8d] to-[#315d8d]"
										title={candidate.name}
										subtitle="{candidate.votes} vote{candidate.votes === 1 ? '' : 's'}{isMyVote ? ' • your vote' : ''}"
										hoverColor="yellow"
									/>
									{#if data.canVoteForBlocLeader}
										<form method="POST" action="?/voteBlocLeader" use:enhance class="border-t border-[#dfceb0]/10 p-2">
											<input type="hidden" name="candidateUserId" value={candidate.userId} />
											<Button
												type="submit"
												size="xs"
												block
												variant={isMyVote ? "soft-emerald" : "subtle"}
												icon={FluentVote20Filled}
											>
												{isMyVote ? "Voted" : "Vote"}
											</Button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if !data.canVoteForBlocLeader}
						<p class="text-xs text-[#a89e8e]">Only presidents of this bloc's member states may vote.</p>
					{/if}
				{:else}
					<div class="flex items-center justify-between gap-2 flex-wrap">
						<span class="text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">Next Election</span>
						<span class="text-[10px] text-[#a89e8e] font-mono">
							Nominations open {formatDateTime(data.election.votingStartsAt)}
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Error/Success -->
	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center gap-3 text-sm">
			{form.message ?? "Bloc membership updated"}
		</div>
	{/if}

	<!-- Membership Applications -->
	{#if data.applications.length > 0}
		<section class="space-y-3">
			<h2 class="section-title">
				<FluentVote20Filled class="size-5 text-[#b7a0c5]" />
				Membership Applications
			</h2>
			<div class="panel rounded-sm p-3 space-y-2">
				{#each data.applications as application}
					<div class="panel-muted rounded-sm overflow-hidden">
						<ProfileItem
							href="/state/{application.state.id}"
							logo={application.state.logo}
							logoAlt={application.state.name}
							placeholderIcon={FluentGlobe20Filled}
							placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
							title={application.state.name}
							subtitle="{application.pro} pro • {application.contra} contra • of {data.memberCount} member state{data.memberCount ===
							1
								? ''
								: 's'} • closes {formatDateTime(application.expiresAt)}"
							hoverColor="blue"
						/>
						{#if data.isMemberPresident}
							<form
								method="POST"
								action="?/voteApplication"
								use:enhance
								class="border-t border-[#dfceb0]/10 p-2 flex gap-2"
							>
								<input type="hidden" name="applicationId" value={application.id} />
								<Button
									type="submit"
									name="vote"
									value="pro"
									size="xs"
									grow
									variant={application.myVote === "pro" ? "soft-emerald" : "subtle"}
									icon={FluentThumbLike20Filled}
								>
									Pro
								</Button>
								<Button
									type="submit"
									name="vote"
									value="contra"
									size="xs"
									grow
									variant={application.myVote === "contra" ? "soft-red" : "subtle"}
									icon={FluentThumbDislike20Filled}
								>
									Contra
								</Button>
							</form>
						{/if}
					</div>
				{/each}
				<p class="text-xs text-[#a89e8e] px-1">
					An application passes once more than half of the member states vote pro. When voting closes, the majority of
					cast votes decides (ties reject).{data.isMemberPresident
						? ""
						: " Only presidents of this bloc's member states may vote."}
				</p>
			</div>
		</section>
	{/if}

	<!-- Active Wars -->
	{#if data.activeWars.length > 0}
		<section class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="flex items-center gap-3 sm:gap-4 bg-red-600/10 border border-red-500/30 rounded-sm p-4 hover:border-red-400/50 transition-all group"
				>
					<div class="flex-shrink-0">
						<div
							class="size-10 sm:size-12 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center"
						>
							<span class="text-xl sm:text-2xl">⚔️</span>
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-300 uppercase tracking-widest">Active War</span>
						</div>
						<div class="text-sm text-[#d9ccb7]">
							<span class="font-bold text-red-400">{war.attacker.name}</span>
							<span class="text-[#a89e8e] mx-1">vs</span>
							<span class="font-bold text-[#b7d0e6]">{war.defender.name}</span>
						</div>
						{#if war.activeBattles > 0}
							<span class="text-[10px] text-[#f7c56b] mt-0.5 inline-block">
								{war.activeBattles} active {war.activeBattles === 1 ? "battle" : "battles"}
							</span>
						{/if}
					</div>
					<span class="text-[#a89e8e] group-hover:text-red-400 transition-colors">→</span>
				</a>
			{/each}
		</section>
	{/if}

	<!-- Member States -->
	<section class="space-y-3">
		<h2 class="section-title">
			<FluentGlobe20Filled class="size-5 text-[#7ba0c8]" />
			Member States
		</h2>
		<div class="panel rounded-sm p-3 space-y-2">
			{#each data.memberStates as state}
				<ProfileItem
					href="/state/{state.id}"
					logo={state.logo}
					logoAlt={state.name}
					placeholderIcon={FluentGlobe20Filled}
					placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
					title={state.name}
					subtitle="{state.population.toLocaleString()} population{state.president
						? ` • ${state.president.name}`
						: ''} • #{state.rating || '—'}"
					hoverColor="blue"
				/>
			{:else}
				<p class="text-sm text-[#a89e8e] text-center py-4">No member states yet</p>
			{/each}
		</div>
	</section>

	<!-- Join -->
	{#if data.myApplication}
		<section class="panel rounded-sm p-4 sm:p-5" style="border-color: {data.bloc.color}30">
			<form method="POST" action="?/withdrawApplication" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div class="flex-1">
						<span class="text-sm font-bold text-[#fff7e8]">Application Pending</span>
						<p class="text-xs text-[#a89e8e] mt-0.5">
							{data.myApplication.pro} pro • {data.myApplication.contra} contra • closes {formatDateTime(
								data.myApplication.expiresAt
							)}
						</p>
					</div>
					<Button type="submit" variant="soft-red" icon={FluentDismiss20Filled} class="w-full sm:w-auto">
						Withdraw
					</Button>
				</div>
			</form>
		</section>
	{:else if data.canJoin}
		<section class="panel rounded-sm p-4 sm:p-5" style="border-color: {data.bloc.color}30">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div class="flex-1">
						<span class="text-sm font-bold text-[#fff7e8]">Apply to join this Bloc</span>
						{#if data.userState}
							<p class="text-xs text-[#a89e8e] mt-0.5">
								Apply as president of {data.userState.name} — member states vote on admission
							</p>
						{/if}
					</div>
					<button
						type="submit"
						class="w-full sm:w-auto px-5 py-2.5 rounded-sm font-bold text-sm text-[#fff7e8] transition-all flex items-center justify-center gap-2 hover:brightness-110"
						style="background-color: {data.bloc.color}"
					>
						<FluentPersonAdd20Filled class="size-4" />
						Apply
					</button>
				</div>
			</form>
		</section>
	{/if}
</PageContainer>
