<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentTimer20Filled from "~icons/fluent/timer-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";

	const { data, form } = $props();

	let selectedProposal = $state(data.userVote?.proposalId || null);
	let isSubmitting = $state(false);

	function getTimeRemaining() {
		if (!data.formationPeriod) return "";

		const now = new Date();
		const end = new Date(data.formationPeriod.endsAt);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return "Ended";

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function getProgressPercentage() {
		if (!data.formationPeriod) return 0;

		const now = new Date();
		const end = new Date(data.formationPeriod.endsAt);
		const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before end

		const total = end.getTime() - start.getTime();
		const elapsed = now.getTime() - start.getTime();

		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	}

	let timeRemaining = $state(getTimeRemaining());
	let progress = $state(getProgressPercentage());

	// Update every second
	let interval: any;
	$effect(() => {
		if (data.formationPeriod) {
			interval = setInterval(() => {
				timeRemaining = getTimeRemaining();
				progress = getProgressPercentage();
			}, 1000);
		}

		return () => clearInterval(interval);
	});
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-3">
		<div
			class="size-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentBuildingGovernment20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">
			{data.formationPeriod ? "State Formation in Progress" : "Form a New State"}
		</h1>
		<p class="text-gray-400">
			{data.formationPeriod
				? `${data.region.name} is forming a new democratic state`
				: `${data.region.name} is ready to become a democratic state`}
		</p>
	</div>

	{#if !data.formationPeriod}
		<!-- No Formation Period - Call to Action -->
		<div
			class="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-8 text-center space-y-4"
		>
			<div
				class="size-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto"
			>
				<FluentAdd20Filled class="size-8 text-white" />
			</div>
			<h2 class="text-2xl font-bold text-white">No State Formation in Progress</h2>
			<p class="text-gray-300 max-w-2xl mx-auto">
				This region doesn't have a state yet! To start the state formation process, you need to be a resident of this
				region and create a political party here. Once a party is created by a resident, a 3-day formation period will
				begin where parties can propose state names and citizens can vote.
			</p>

			<div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
				{#if data.userResidence}
					<a
						href="/region/{data.region.id}/parties/create"
						class="btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
					>
						<FluentAdd20Filled class="size-5" />
						Create a Political Party
					</a>
				{:else}
					<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-4 text-left max-w-md mx-auto">
						<div class="flex items-start gap-3">
							<div class="size-10 bg-amber-600/30 rounded-lg flex items-center justify-center shrink-0">
								<FluentTimer20Filled class="size-5 text-amber-400" />
							</div>
							<div>
								<p class="font-semibold text-amber-300 mb-1">Residence Required</p>
								<p class="text-sm text-amber-200/80">
									You must be a resident of {data.region.name} to create a political party and start state formation. Visit
									the region page to request residence.
								</p>
							</div>
						</div>
					</div>
				{/if}
				<a
					href="/region/{data.region.id}"
					class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				>
					Back to Region
				</a>
			</div>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-5">
			<h3 class="font-semibold text-blue-400 mb-3">How to Form a State</h3>
			<ul class="text-sm text-gray-300 space-y-2">
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">1.</span>
					<span>Travel to this region and request residence to become eligible</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">2.</span>
					<span>Create a political party in this region to trigger a 3-day state formation period</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">3.</span>
					<span>Political parties propose state names, colors, and descriptions</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">4.</span>
					<span>Citizens vote for their preferred proposal during the 3-day period</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">5.</span>
					<span
						>The proposal with the most votes becomes the official state, and all parties compete in the first election</span
					>
				</li>
			</ul>
		</div>
	{:else}
		<!-- Formation Period Active -->
		<!-- Timer Card -->
		<div class="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<FluentTimer20Filled class="size-6 text-amber-400" />
					<div>
						<p class="text-sm text-amber-300 font-medium">Formation Period</p>
						<p class="text-2xl font-bold text-white">{timeRemaining}</p>
					</div>
				</div>
				<div class="text-right">
					<p class="text-sm text-gray-400">Ends</p>
					<p class="text-white font-medium">
						{new Date(data.formationPeriod.endsAt).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit"
						})}
					</p>
				</div>
			</div>

			<div class="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
				<div
					class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
					style="width: {progress}%"
				/>
			</div>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-5">
			<h3 class="font-semibold text-blue-400 mb-3">How State Formation Works</h3>
			<ul class="text-sm text-gray-300 space-y-2">
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">1.</span>
					<span>Political parties propose state names and designs during this 3-day period</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">2.</span>
					<span>Citizens can move to {data.region.name} and vote for their preferred proposal</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">3.</span>
					<span>After 3 days, the proposal with the most votes wins</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-400 mt-0.5">4.</span>
					<span>All parties will compete in the first democratic election to form the government</span>
				</li>
			</ul>
		</div>

		<!-- Proposals Section -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white flex items-center gap-2">
					<FluentFlag20Filled class="size-6 text-purple-400" />
					State Name Proposals
				</h2>
				<span class="text-sm text-gray-400">{data.proposals.length} proposals</span>
			</div>

			{#if data.proposals.length === 0}
				<div class="bg-slate-800/50 border border-white/5 rounded-xl p-8 text-center">
					<p class="text-gray-400">No proposals yet. Political parties can submit their state name proposals!</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.proposals as proposal}
						<form
							method="POST"
							action="?/vote"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									await update();
									isSubmitting = false;
									selectedProposal = proposal.id;
								};
							}}
							class="bg-slate-800/50 border-2 rounded-xl p-5 transition-all hover:border-purple-500/30"
							class:border-purple-500={selectedProposal === proposal.id}
							class:border-white-5={selectedProposal !== proposal.id}
						>
							<input type="hidden" name="proposalId" value={proposal.id} />

							<div class="flex items-start gap-4">
								<!-- State Color/Logo -->
								<div
									class="size-16 rounded-xl flex items-center justify-center shrink-0"
									style="background-color: {proposal.mapColor}"
								>
									{#if proposal.logo}
										<img src={proposal.logo} alt="Logo" class="size-12 object-contain" />
									{:else}
										<FluentBuildingGovernment20Filled class="size-8 text-white" />
									{/if}
								</div>

								<!-- Proposal Details -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-3 mb-2">
										<div>
											<h3 class="text-xl font-bold text-white">{proposal.stateName}</h3>
											<p class="text-sm text-gray-400">Proposed by {proposal.proposer.name}</p>
										</div>

										<!-- Vote Count -->
										<div class="text-right shrink-0">
											<div class="flex items-center gap-2">
												<FluentCheckmark20Filled class="size-5 text-purple-400" />
												<span class="text-2xl font-bold text-purple-400">
													{proposal.voteCount}
												</span>
											</div>
											<p class="text-xs text-gray-400">votes</p>
										</div>
									</div>

									{#if proposal.description}
										<p class="text-sm text-gray-300 mb-3">{proposal.description}</p>
									{/if}

									{#if data.formationPeriod.isActive}
										<button
											type="submit"
											disabled={isSubmitting || selectedProposal === proposal.id}
											class="btn btn-sm gap-2"
											class:bg-purple-600={selectedProposal !== proposal.id}
											class:hover:bg-purple-500={selectedProposal !== proposal.id}
											class:bg-purple-500-30={selectedProposal === proposal.id}
											class:border-purple-500={selectedProposal === proposal.id}
											class:text-purple-300={selectedProposal === proposal.id}
											class:border-0={selectedProposal !== proposal.id}
											class:text-white={selectedProposal !== proposal.id}
										>
											{#if isSubmitting}
												<span class="loading loading-spinner loading-xs"></span>
											{:else if selectedProposal === proposal.id}
												<FluentCheckmark20Filled class="size-4" />
												Your Vote
											{:else}
												Vote
											{/if}
										</button>
									{/if}
								</div>
							</div>
						</form>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex gap-3">
			{#if !data.formationPeriod.isActive && data.formationPeriod.status === "active"}
				<form
					method="POST"
					action="?/finalize"
					use:enhance={({ cancel }) => {
						if (!confirm("Are you sure you want to finalize state formation? This cannot be undone.")) {
							cancel();
						}
						return async ({ result, update }) => {
							await update();
							if (result.type === "success" && result.data?.stateId) {
								goto(`/state/${result.data.stateId}`);
							}
						};
					}}
					class="flex-1"
				>
					<button
						type="submit"
						class="btn w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0 text-white gap-2"
					>
						<FluentCheckmark20Filled class="size-5" />
						Finalize State Formation
					</button>
				</form>
			{/if}

			<a
				href="/region/{data.region.id}"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
			>
				Back to Region
			</a>
		</div>
	{/if}

	<!-- Political Parties -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-bold text-white flex items-center gap-2">
				<FluentPeople20Filled class="size-6 text-blue-400" />
				Political Parties
			</h2>
			<span class="text-sm text-gray-400">{data.parties.length} parties</span>
		</div>

		{#if data.parties.length === 0}
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-8 text-center space-y-3">
				<p class="text-gray-400">No parties yet</p>
				{#if !data.formationPeriod}
					<a href="/party/create" class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2 mx-auto">
						<FluentAdd20Filled class="size-4" />
						Create First Party
					</a>
				{/if}
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.parties as party}
					<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
						<div class="flex items-center gap-3">
							<div
								class="size-12 rounded-lg flex items-center justify-center shrink-0"
								style="background-color: {party.color}"
							>
								<FluentPeople20Filled class="size-6 text-white" />
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-white truncate">{party.name}</h3>
								{#if party.abbreviation}
									<p class="text-sm" style="color: {party.color}">{party.abbreviation}</p>
								{/if}
								<p class="text-xs text-gray-400">
									Founded by
									<a href="/profile/{party.founder.id}" class="text-blue-400 hover:text-blue-300 hover:underline">
										{party.founder.name}
									</a>
								</p>
								<p class="text-xs text-gray-400">{party.memberCount} members</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
