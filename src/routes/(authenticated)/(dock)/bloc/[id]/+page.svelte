<!-- src/routes/bloc/[id]/+page.svelte -->
<!-- A bloc as a treaty organisation: the charter with its signatories'
     flags, the leader, ballots on admissions and expulsions, and its wars. -->
<script lang="ts">
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentPersonDelete20Filled from "~icons/fluent/person-delete-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import type { SubmitFunction } from "$app/forms";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import WarHistory from "#lib/component/WarHistory.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import EditBlocSheet from "./EditBlocSheet.svelte";
	import { formatDate, formatDateTime } from "#lib/utils/formatting.js";

	const { data, form } = $props();

	let showEditBlocSheet = $state(false);

	const withToast: SubmitFunction =
		({ formElement }) =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
			if (result.type === "success") celebrate(formElement.closest("[data-ballot]"));
		};

	/** Marks the ballot that was just cast; feedback for errors stays in the banner. */
	const castBallot: SubmitFunction =
		({ formElement }) =>
		async ({ result, update }) => {
			await update();
			if (result.type === "success") celebrate(formElement.closest("[data-ballot]"));
		};

	const pastWars = $derived(data.warHistory.filter((w) => !data.activeWars.some((a) => a.id === w.id)));
</script>

<svelte:head>
	<title>{data.bloc.name}</title>
	<meta name="description" content={data.bloc.description || `The ${data.bloc.name} alliance in PsyOps.`} />
</svelte:head>

{#snippet tally(pro: number, contra: number, of: number, proLabel: string, contraLabel: string, proTone: string)}
	<div>
		<div class="flex h-2 overflow-hidden rounded-full bg-surface-0">
			<div class="{proTone} transition-[width] duration-500" style:width="{(pro / Math.max(1, of)) * 100}%"></div>
			<div
				class="ml-auto bg-fg-muted/50 transition-[width] duration-500"
				style:width="{(contra / Math.max(1, of)) * 100}%"
			></div>
		</div>
		<div class="mt-1 flex justify-between text-[11px] text-fg-muted">
			<span><span class="font-mono font-bold text-fg">{pro}</span> {proLabel}</span>
			<span>of {of}</span>
			<span>{contraLabel} <span class="font-mono font-bold text-fg">{contra}</span></span>
		</div>
	</div>
{/snippet}

{#snippet box(marked: boolean)}
	<span
		class="grid size-6 shrink-0 place-items-center rounded-sm border-2 border-line/50 bg-surface-0 font-serif text-base font-black leading-none text-primary-fg"
	>
		{#if marked}<span class="animate-stamp" style="--stamp-tilt: -10deg; --rise-delay: 0ms">✗</span>{/if}
	</span>
{/snippet}

<PageContainer maxWidth="5xl">
	<!-- Charter -->
	<article class="panel relative overflow-hidden rounded-sm">
		<div class="h-2" style:background-color={data.bloc.color}></div>
		<div class="p-5 text-center">
			<div class="absolute right-3 top-5 flex gap-2">
				{#if data.isLeader}
					<IconButton icon={FluentMegaphone20Filled} label="Broadcast" variant="soft-amber" size="sm" href="/inbox" />
					<IconButton
						icon={FluentEdit20Filled}
						label="Edit Bloc"
						variant="secondary"
						size="sm"
						onclick={() => (showEditBlocSheet = true)}
					/>
				{:else if data.isMemberPresident}
					<form
						method="POST"
						action="?/leave"
						use:confirmSubmit={{
							title: `Leave ${data.bloc.name}?`,
							body: "Your state will no longer be part of this bloc.",
							confirmLabel: "Leave bloc",
							danger: true
						}}
						use:enhance
					>
						<IconButton type="submit" icon={FluentDismiss20Filled} label="Leave Bloc" variant="soft-red" size="sm" />
					</form>
				{/if}
			</div>

			<div
				class="mx-auto mb-3 size-20 overflow-hidden rounded-full border-2 animate-pop-in"
				style="border-color: {data.bloc.color}; background-color: {data.bloc.color}26;"
			>
				{#if data.bloc.logo}
					<img decoding="async" src={data.bloc.logo} alt={data.bloc.name} class="size-full object-cover" />
				{:else}
					<div class="flex size-full items-center justify-center">
						<FluentFlag20Filled class="size-9" style="color: {data.bloc.color}" />
					</div>
				{/if}
			</div>

			<h1 class="mx-auto max-w-2xl break-words font-serif text-3xl font-black leading-tight text-fg sm:text-4xl">
				{data.bloc.name}
			</h1>
			<p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-fg-muted">
				Signed {formatDate(data.bloc.createdAt)} · {data.memberCount}
				{data.memberCount === 1 ? "signatory" : "signatories"}
			</p>
			{#if data.bloc.description}
				<p
					class="mx-auto mt-4 max-w-xl border-t border-line/15 pt-4 font-serif text-sm italic text-fg-soft sm:text-base"
				>
					{data.bloc.description}
				</p>
			{/if}
			{#if data.bloc.defenceSpendingGuideline != null}
				<p class="mt-3 text-xs text-fg-muted">
					Defence guideline: <span class="font-semibold text-fg">{data.bloc.defenceSpendingGuideline}%</span> of state income
					(last 30 days)
				</p>
			{/if}

			<!-- Signatories' flags -->
			{#if data.memberStates.length}
				<div class="mt-5 flex flex-wrap justify-center gap-2">
					{#each data.memberStates as state, i (state.id)}
						<a
							href="/state/{state.id}"
							title={state.name}
							class="animate-pop-in transition-transform hover:-translate-y-0.5"
							style="--rise-delay: {Math.min(i, 10) * 40}ms"
						>
							<Logo
								src={state.logo}
								alt={state.name}
								class="size-9 rounded-sm"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</article>

	<!-- Combined weight of the signatories, in the same power units as the state pages. -->
	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Bloc strength</h2>
			<p class="font-mono text-sm text-fg-muted">
				{data.memberCount}
				{data.memberCount === 1 ? "member" : "members"} ·
				<a href="/state/{data.strength.topMember?.id}" class="hover:text-primary-fg">
					strongest: {data.strength.topMember?.name ?? "—"}
				</a>
			</p>
		</div>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Combined power</p>
				<p class="font-mono text-lg font-bold text-positive-fg">{data.strength.power.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Avg. stability</p>
				<p class="font-mono text-lg font-bold text-fg">{data.strength.stability}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Population</p>
				<p class="font-mono text-lg font-bold text-fg">{data.strength.population.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Top member power</p>
				<p class="font-mono text-lg font-bold text-fg">{data.strength.topMember?.score ?? 0}</p>
			</div>
		</div>
		{#if data.strength.members.length}
			<ul class="space-y-1.5">
				{#each data.strength.members as member (member.id)}
					<li class="rounded-sm panel-muted px-3 py-2">
						<a href="/state/{member.id}" class="flex items-center gap-2 text-sm group">
							<Logo
								src={member.logo}
								alt={member.name}
								class="size-6! rounded-[2px]! shrink-0"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
							<span class="truncate group-hover:text-primary-fg">{member.name}</span>
							<span class="ml-auto font-mono text-xs text-fg-muted">{member.population.toLocaleString()} people</span>
							<span class="font-mono text-xs text-fg-muted">stability {member.stability}</span>
							<span class="w-28 shrink-0 font-mono text-xs text-positive-fg text-right">{member.score} pts</span>
						</a>
						<div class="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
							<div
								class="h-full bg-primary/70"
								style="width: {Math.min(100, (member.score / Math.max(1, data.strength.topMember?.score ?? 1)) * 100)}%"
							></div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Feedback from plain form posts -->
	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-4 flex items-center gap-3 text-sm animate-rise-in"
		>
			{form.message ?? "Bloc membership updated"}
		</div>
	{/if}

	<!-- Join / pending application -->
	{#if data.myApplication}
		<section class="panel rounded-sm p-4 sm:p-5" style="border-color: {data.bloc.color}55">
			<form method="POST" action="?/withdrawApplication" use:enhance>
				<div class="flex flex-col sm:flex-row sm:items-center gap-3">
					<div class="flex-1 space-y-2">
						<p class="text-sm font-bold text-fg">
							Application of {data.userState?.name ?? "your state"}
							<Badge tone="amber" size="xs">Pending</Badge>
						</p>
						{@render tally(
							data.myApplication.pro,
							data.myApplication.contra,
							data.memberCount,
							"admit",
							"refuse",
							"bg-positive"
						)}
						<p class="text-[11px] text-fg-muted">
							Closes <span class="font-mono">{formatDateTime(data.myApplication.expiresAt)}</span>
						</p>
					</div>
					<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Withdraw</Button>
				</div>
			</form>
		</section>
	{:else if data.canJoin}
		<section class="panel rounded-sm p-4 sm:p-5" style="border-color: {data.bloc.color}55">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						{#if data.userState}
							<Logo
								src={data.userState.logo}
								alt={data.userState.name}
								class="size-10 rounded-sm"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
						{/if}
						<div>
							<p class="text-sm font-bold text-fg">Sign the charter</p>
							{#if data.userState}
								<p class="text-xs text-fg-muted">As {data.userState.name} · members vote on admission</p>
							{/if}
						</div>
					</div>
					<Button type="submit" variant="primary" icon={FluentPersonAdd20Filled} class="w-full sm:w-auto">Apply</Button>
				</div>
			</form>
		</section>
	{/if}

	<!-- Leadership -->
	<section class="panel rounded-sm p-5 space-y-4">
		<h2 class="section-title">Leadership</h2>

		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			{#if data.leader}
				<UserLink
					size="md"
					id={data.leader.userId}
					name={data.leader.name}
					avatar={data.leader.logo}
					subtitle="Bloc leader · elected {formatDate(data.leader.appointedAt)}"
				/>
			{:else}
				<p class="text-sm text-fg-muted">No leader elected yet.</p>
			{/if}
			{#each data.diplomats as diplomat (diplomat.id)}
				<UserLink size="sm" id={diplomat.userId} name={diplomat.name} avatar={diplomat.logo} subtitle="Diplomat" />
			{/each}
		</div>

		{#if data.election}
			{#if data.election.status === "active"}
				<!-- Ballot paper -->
				<div class="panel-muted rounded-sm p-4 space-y-3">
					<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-line/25 pb-2">
						<p class="font-serif text-base font-bold uppercase tracking-wide text-fg">Ballot · Bloc leader</p>
						<p class="text-[11px] text-fg-muted">
							<span class="font-mono">{data.blocLeaderVotesCast}</span> cast · closes
							<span class="font-mono">{formatDateTime(data.election.votingEndsAt)}</span>
						</p>
					</div>

					{#if data.candidates.length === 0}
						<p class="text-sm text-fg-muted">No candidates yet. Presidents nominate from a citizen's profile.</p>
					{:else}
						<ul class="divide-y divide-dashed divide-line/15">
							{#each data.candidates as candidate (candidate.userId)}
								{@const isMyVote = data.myBlocLeaderVote === candidate.userId}
								<li class="flex items-center gap-3 rounded-sm py-2" data-ballot>
									<UserLink
										size="sm"
										id={candidate.userId}
										name={candidate.name}
										avatar={candidate.logo}
										class="flex-1"
									/>
									{#if data.canVoteForBlocLeader}
										<form method="POST" action="?/voteBlocLeader" use:enhance={castBallot}>
											<input type="hidden" name="candidateUserId" value={candidate.userId} />
											<button
												type="submit"
												class="tap-target press-spring flex items-center gap-2 rounded-sm px-1 text-xs text-fg-muted hover:text-primary-hover"
												aria-label="Vote for {candidate.name}"
												aria-pressed={isMyVote}
											>
												{isMyVote ? "Your vote" : "Mark"}
												{@render box(isMyVote)}
											</button>
										</form>
									{:else}
										{@render box(isMyVote)}
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
					<p class="text-[11px] text-fg-muted">
						{data.canVoteForBlocLeader ? "Secret until it closes." : "Member presidents vote."}
					</p>
				</div>
			{:else}
				<p class="text-xs text-fg-muted">
					Next election · nominations open <span class="font-mono">{formatDateTime(data.election.votingStartsAt)}</span>
				</p>
			{/if}
		{/if}
	</section>

	<!-- Membership applications -->
	{#if data.applications.length > 0}
		<section class="space-y-3">
			<h2 class="section-title">Applications</h2>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.applications as application (application.id)}
					<article out:vanish class="panel rounded-sm p-4 space-y-3" data-ballot>
						<a href="/state/{application.state.id}" class="group flex items-center gap-3">
							<Logo
								src={application.state.logo}
								alt={application.state.name}
								class="size-11 rounded-sm"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
							<div class="min-w-0">
								<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Application for membership</p>
								<p class="truncate font-serif text-lg font-bold text-fg group-hover:text-primary-hover">
									{application.state.name}
								</p>
							</div>
						</a>
						{@render tally(application.pro, application.contra, data.memberCount, "admit", "refuse", "bg-positive")}
						<p class="text-[11px] text-fg-muted">
							Majority admits · closes <span class="font-mono">{formatDateTime(application.expiresAt)}</span>
						</p>
						{#if data.isMemberPresident}
							<form
								method="POST"
								action="?/voteApplication"
								use:enhance={castBallot}
								class="grid grid-cols-2 gap-2 border-t border-dashed border-line/20 pt-3"
							>
								<input type="hidden" name="applicationId" value={application.id} />
								{#each [["pro", "Admit"], ["contra", "Refuse"]] as [value, label] (value)}
									<button
										type="submit"
										name="vote"
										{value}
										aria-pressed={application.myVote === value}
										class="tap-target press-spring flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors {application.myVote ===
										value
											? 'border-primary/50 bg-primary/12 text-primary-fg'
											: 'border-line/20 text-fg-soft hover:border-primary/40'}"
									>
										{@render box(application.myVote === value)}
										{label}
									</button>
								{/each}
							</form>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Expulsion votes -->
	{#if data.expulsions.length > 0}
		<section class="space-y-3">
			<h2 class="section-title text-red-300">Expulsion votes</h2>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.expulsions as expulsion (expulsion.id)}
					{@const needed = Math.floor(expulsion.voters / 2) + 1}
					<article out:vanish class="panel rounded-sm border-red-500/30 p-4 space-y-3" data-ballot>
						<a href="/state/{expulsion.state.id}" class="group flex items-center gap-3">
							<Logo
								src={expulsion.state.logo}
								alt={expulsion.state.name}
								class="size-11 rounded-sm grayscale"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
							<div class="min-w-0">
								<p class="text-[10px] uppercase tracking-[0.2em] text-red-300">Motion to expel</p>
								<p class="truncate font-serif text-lg font-bold text-fg group-hover:text-primary-hover">
									{expulsion.state.name}
								</p>
							</div>
						</a>
						{#if expulsion.reason}
							<p class="border-l-2 border-red-500/40 pl-2 font-serif text-sm italic text-fg-soft">
								“{expulsion.reason}”
							</p>
						{/if}
						{@render tally(expulsion.pro, expulsion.contra, expulsion.voters, "expel", "keep", "bg-red-400")}
						<p class="text-[11px] text-fg-muted">
							{needed} of {expulsion.voters} needed · closes
							<span class="font-mono">{formatDateTime(expulsion.expiresAt)}</span>
						</p>
						{#if expulsion.canVote}
							<form
								method="POST"
								action="?/voteExpulsion"
								use:enhance={withToast}
								class="grid grid-cols-2 gap-2 border-t border-dashed border-line/20 pt-3"
							>
								<input type="hidden" name="expulsionId" value={expulsion.id} />
								{#each [["pro", "Expel"], ["contra", "Keep"]] as [value, label] (value)}
									<button
										type="submit"
										name="vote"
										{value}
										aria-pressed={expulsion.myVote === value}
										class="tap-target press-spring flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors {expulsion.myVote ===
										value
											? value === 'pro'
												? 'border-red-500/50 bg-red-600/10 text-red-300'
												: 'border-friendly/50 bg-friendly-bg/18 text-friendly-fg'
											: 'border-line/20 text-fg-soft hover:border-primary/40'}"
									>
										{@render box(expulsion.myVote === value)}
										{label}
									</button>
								{/each}
							</form>
						{:else if expulsion.isTarget}
							<p class="text-xs text-primary-fg">Your state can't vote on its own expulsion.</p>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Active wars -->
	{#if data.activeWars.length > 0}
		<section class="space-y-2">
			{#each data.activeWars as war (war.id)}
				<a
					href="/war/{war.id}"
					class="panel-interactive flex items-center gap-3 rounded-sm border-red-500/35 p-3 sm:p-4"
				>
					<Logo
						src={war.attacker.logo}
						alt={war.attacker.name}
						class="size-9 rounded-sm"
						placeholderIcon={FluentBuildingGovernment20Filled}
					/>
					<div class="min-w-0 flex-1 text-center">
						<p class="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-red-300">
							<span class="size-1.5 rounded-full bg-red-500 animate-pulse"></span>At war
						</p>
						<p class="truncate text-sm">
							<span class="font-bold text-red-300">{war.attacker.name}</span>
							<span class="mx-1 font-serif italic text-fg-muted">vs</span>
							<span class="font-bold text-friendly-fg">{war.defender.name}</span>
						</p>
						{#if war.activeBattles > 0}
							<p class="text-[10px] text-primary-fg">
								{war.activeBattles}
								{war.activeBattles === 1 ? "battle" : "battles"} on
							</p>
						{/if}
					</div>
					<Logo
						src={war.defender.logo}
						alt={war.defender.name}
						class="size-9 rounded-sm"
						placeholderIcon={FluentBuildingGovernment20Filled}
					/>
				</a>
			{/each}
		</section>
	{/if}

	<!-- Signatories -->
	<section class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			Signatories
			<span class="ml-auto text-xs font-normal normal-case tracking-normal text-fg-muted">{data.memberCount}</span>
		</h2>
		{#if data.memberStates.length}
			<ul class="divide-y divide-line/10">
				{#each data.memberStates as state (state.id)}
					<li out:vanish class="flex items-center gap-3 py-2.5">
						<a href="/state/{state.id}" class="shrink-0">
							<Logo
								src={state.logo}
								alt={state.name}
								class="size-10 rounded-sm"
								placeholderIcon={FluentBuildingGovernment20Filled}
							/>
						</a>
						<div class="min-w-0 flex-1">
							<a href="/state/{state.id}" class="block truncate font-semibold text-fg hover:text-primary-hover">
								{state.name}
							</a>
							<div class="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-fg-muted">
								{#if state.president}
									<UserLink
										size="xs"
										id={state.president.userId}
										name={state.president.name}
										avatar={state.presidentAvatar}
									/>
								{/if}
								<span>{state.population.toLocaleString()} citizens</span>
								{#if state.rating}<span>· #{state.rating}</span>{/if}
								{#if data.bloc.defenceSpendingGuideline != null}
									{@const guideline = data.bloc.defenceSpendingGuideline}
									<Badge
										tone={state.defence.income > 0 && state.defence.percent >= guideline ? "green" : "amber"}
										size="xs"
									>
										{state.defence.income > 0 ? `${state.defence.percent}% / ${guideline}% defence` : "No budget data"}
									</Badge>
								{/if}
							</div>
						</div>
						{#if data.expellableStateIds.includes(state.id)}
							<form
								method="POST"
								action="?/proposeExpulsion"
								use:confirmSubmit={{
									title: `Vote on expelling ${state.name}?`,
									body: "The other member states vote for 3 days. Your state's vote counts as in favour.",
									confirmLabel: "Open vote",
									danger: true
								}}
								use:enhance={withToast}
							>
								<input type="hidden" name="stateId" value={state.id} />
								<IconButton
									type="submit"
									icon={FluentPersonDelete20Filled}
									label="Propose expelling {state.name}"
									variant="soft-red"
									size="sm"
								/>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-center text-sm text-fg-muted">No signatories yet.</p>
		{/if}
	</section>

	<!-- Trade embargoes -->
	<section class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">Trade embargoes</h2>
		{#if data.embargoes.length}
			<ul class="space-y-2">
				{#each data.embargoes as embargo (embargo.id)}
					<li class="panel-muted flex flex-wrap items-center gap-2 rounded-sm p-3 text-sm">
						<a href="/state/{embargo.targetStateId}" class="font-medium text-fg hover:text-primary-hover">
							{embargo.targetName}
						</a>
						<Badge tone="red" size="xs">embargo</Badge>
						<span class="text-xs text-fg-muted">{embargo.reason}</span>
						{#if data.isLeader}
							<form method="POST" action="?/liftEmbargo" use:enhance={withToast} class="ml-auto">
								<input type="hidden" name="embargoId" value={embargo.id} />
								<Button type="submit" size="xs" variant="ghost">Lift</Button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-xs text-fg-muted">No embargoes in force.</p>
		{/if}
		{#if data.isLeader}
			<form
				method="POST"
				action="?/declareEmbargo"
				use:enhance={withToast}
				class="flex flex-wrap items-end gap-2 border-t border-line/20 pt-3"
			>
				<label class="min-w-40 flex-1">
					<span class="field-label">Target state</span>
					<select name="targetStateId" required class="field-control mt-1 w-full rounded-sm px-2 py-1.5 text-sm">
						<option value="">State…</option>
						{#each data.embargoTargets as target (target.id)}<option value={target.id}>{target.name}</option>{/each}
					</select>
				</label>
				<label class="min-w-40 flex-1">
					<span class="field-label">Reason</span>
					<input
						name="reason"
						required
						maxlength="500"
						class="field-control mt-1 w-full rounded-sm px-2 py-1.5 text-sm"
					/>
				</label>
				<Button type="submit" size="sm" variant="secondary">Declare embargo</Button>
			</form>
		{/if}
	</section>

	<!-- War record -->
	{#if pastWars.length}
		<section class="panel rounded-sm p-5 space-y-3">
			<h2 class="section-title">War record</h2>
			<WarHistory wars={pastWars} />
		</section>
	{/if}

	<div class="mt-4">
		<Button href="/bloc/{data.bloc.id}/history" size="sm" variant="secondary">Full history →</Button>
	</div>
</PageContainer>

<!-- Edit Bloc Bottom Sheet -->
{#if data.isLeader && data.editForm}
	<EditBlocSheet bind:open={showEditBlocSheet} editForm={data.editForm} currentLogo={data.bloc.logo} />
{/if}
