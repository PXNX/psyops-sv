<!-- src/routes/party/[id]/member/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentArrowUp20Filled from "~icons/fluent/arrow-up-20-filled";
	import FluentArrowDown20Filled from "~icons/fluent/arrow-down-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPersonAvailable20Filled from "~icons/fluent/person-available-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	let kickModalOpen = $state(false);
	let disbandModalOpen = $state(false);
	let memberToKick = $state<{ id: string; name: string } | null>(null);
	let kickingMemberId = $state<string | null>(null);
	let promotingMemberId = $state<string | null>(null);
	let demotingMemberId = $state<string | null>(null);
	let disbanding = $state(false);
	let togglingAutoAccept = $state(false);
	let processingApplicationId = $state<number | null>(null);

	const canManageMembers = $derived(data.isLeader || data.isDeputy);
	const isOnlyMember = $derived(data.members.length === 1 && data.isLeader);

	function openKickModal(userId: string, name: string) {
		memberToKick = { id: userId, name };
		kickModalOpen = true;
	}
</script>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<div class="size-14 rounded-xl overflow-hidden ring-2 ring-white/10">
			<Logo
				src={data.party.logoUrl}
				alt={data.party.name}
				class="size-full"
				placeholderIcon={FluentShield20Filled}
				placeholderGradient="from-slate-600 to-slate-700"
			/>
		</div>
		<div>
			<a href="/party/{data.party.id}" class="text-sm text-gray-400 hover:text-purple-400 transition-colors">
				{data.party.name}
			</a>
			<h1 class="text-2xl font-bold text-white">Members</h1>
		</div>
	</div>

	<!-- Auto-Accept Settings (Leader only) -->
	{#if data.isLeader}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-lg flex items-center justify-center bg-blue-600/20">
						<FluentSettings20Filled class="size-5 text-blue-400" />
					</div>
					<div>
						<h3 class="font-bold text-white">Membership Settings</h3>
						<p class="text-sm text-gray-400">
							{#if data.party.autoAcceptMembers}
								New members are automatically accepted
							{:else}
								New members require approval from leadership
							{/if}
						</p>
					</div>
				</div>
				<form
					method="POST"
					action="?/toggleAutoAccept"
					use:enhance={() => {
						togglingAutoAccept = true;
						return async ({ update }) => {
							await update();
							togglingAutoAccept = false;
						};
					}}
				>
					<label class="label cursor-pointer gap-3">
						<span class="label-text text-gray-300">Auto-accept members</span>
						<input
							type="checkbox"
							class="toggle toggle-success"
							checked={data.party.autoAcceptMembers}
							disabled={togglingAutoAccept}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</label>
				</form>
			</div>
		</div>
	{/if}

	<!-- Pending Applications (Leader/Deputy only) -->
	{#if canManageMembers && data.pendingApplications.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-orange-500/30 p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="size-10 rounded-lg flex items-center justify-center bg-orange-600/20">
					<FluentPersonAvailable20Filled class="size-5 text-orange-400" />
				</div>
				<div>
					<h3 class="font-bold text-white">Pending Applications</h3>
					<p class="text-sm text-gray-400">{data.pendingApplications.length} member(s) waiting for approval</p>
				</div>
			</div>

			<div class="space-y-2">
				{#each data.pendingApplications as application}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<div class="flex items-center gap-4">
							<!-- Applicant Avatar -->
							<div class="size-12 rounded-lg overflow-hidden ring-2 ring-orange-500/30">
								<Logo
									src={application.user.logo}
									alt={application.user.name}
									class="size-full"
									placeholderIcon={FluentPeople20Filled}
									placeholderGradient="from-slate-600 to-slate-700"
								/>
							</div>

							<!-- Applicant Info -->
							<div class="flex-1 min-w-0">
								<p class="text-base font-semibold text-white truncate">{application.user.name}</p>
								<div class="flex items-center gap-1 text-xs text-gray-500">
									<FluentCalendar20Filled class="size-3" />
									<span>Applied {formatDate(application.appliedAt)}</span>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-2">
								<form
									method="POST"
									action="?/acceptApplication"
									use:enhance={() => {
										processingApplicationId = application.id;
										return async ({ update }) => {
											await update();
											processingApplicationId = null;
										};
									}}
								>
									<input type="hidden" name="applicationId" value={application.id} />
									<button
										type="submit"
										class="btn btn-sm btn-success gap-2"
										disabled={processingApplicationId === application.id}
									>
										<FluentCheckmark20Filled class="size-4" />
										Accept
									</button>
								</form>
								<form
									method="POST"
									action="?/rejectApplication"
									use:enhance={() => {
										processingApplicationId = application.id;
										return async ({ update }) => {
											await update();
											processingApplicationId = null;
										};
									}}
								>
									<input type="hidden" name="applicationId" value={application.id} />
									<button
										type="submit"
										class="btn btn-sm btn-error gap-2"
										disabled={processingApplicationId === application.id}
									>
										<FluentDismiss20Filled class="size-4" />
										Reject
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Disband Warning (only for solo leader) -->
	{#if isOnlyMember}
		<div class="alert alert-warning bg-orange-600/10 border-orange-500/30">
			<FluentWarning20Filled class="size-5" />
			<div class="flex-1">
				<h3 class="font-bold">You are the only member</h3>
				<div class="text-sm">
					You can disband the party.
					{#if data.isOnlyPartyInState}
						<span class="font-semibold text-orange-400"
							>Warning: This is the only party in {data.party.state.name}. Disbanding will abolish the state and all
							regions will become independent.</span
						>
					{/if}
				</div>
			</div>
			<button onclick={() => (disbandModalOpen = true)} class="btn btn-sm btn-error gap-2">
				<FluentDelete20Filled class="size-4" />
				Disband Party
			</button>
		</div>
	{/if}

	<!-- Party Members Section -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl font-bold text-white flex items-center gap-3">
				<div class="size-10 rounded-lg flex items-center justify-center" style="background-color: {data.party.color}40">
					<FluentPeople20Filled class="size-5" style="color: {data.party.color}" />
				</div>
				Party Members
			</h2>
		</div>

		<div class="space-y-2">
			{#each data.members as member}
				<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-all">
					<div class="flex items-center gap-4">
						<!-- Member Avatar -->
						<a href="/user/{member.userId}" class="shrink-0">
							<div class="relative">
								<div class="size-14 rounded-lg overflow-hidden ring-2 ring-white/5 hover:ring-white/10 transition-all">
									<Logo
										src={member.user.logo}
										alt={member.user.name || "Member"}
										class="size-full"
										placeholderIcon={FluentPeople20Filled}
										placeholderGradient="from-slate-600 to-slate-700"
									/>
								</div>
								{#if member.role === "leader"}
									<div
										class="absolute -top-1 -right-1 size-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-800"
										style="background-color: {data.party.color}"
									>
										<FluentCrown20Filled class="size-3 text-white" />
									</div>
								{:else if member.role === "deputy"}
									<div
										class="absolute -top-1 -right-1 size-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-800"
										style="background-color: {data.party.color}CC"
									>
										<FluentShield20Filled class="size-3 text-white" />
									</div>
								{/if}
							</div>
						</a>

						<!-- Member Info -->
						<div class="flex-1 min-w-0">
							<a href="/user/{member.userId}" class="block group">
								<p class="text-base font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
									{member.user.name || "Anonymous"}
								</p>
							</a>
							<div class="flex items-center gap-3 mt-1 flex-wrap">
								{#if member.role === "leader"}
									<div class="badge badge-sm border-0" style="background-color: {data.party.color}; color: white">
										<FluentCrown20Filled class="size-3 mr-1" />
										Party Leader
									</div>
								{:else if member.role === "deputy"}
									<div class="badge badge-sm border-0" style="background-color: {data.party.color}CC; color: white">
										<FluentShield20Filled class="size-3 mr-1" />
										Deputy Leader
									</div>
								{:else}
									<span class="text-xs text-gray-500">Member</span>
								{/if}
								<span class="text-xs text-gray-500">•</span>
								<div class="flex items-center gap-1 text-xs text-gray-500">
									<FluentCalendar20Filled class="size-3" />
									<span>Joined {formatDate(member.joinedAt)}</span>
								</div>
								{#if member.acceptedByName}
									<span class="text-xs text-gray-500">•</span>
									<span class="text-xs text-gray-400">
										Accepted by <span class="text-gray-300 font-medium">{member.acceptedByName}</span>
									</span>
								{/if}
							</div>
						</div>

						<!-- Actions (only for leaders/deputies, not for themselves) -->
						{#if canManageMembers && member.userId !== data.members.find((m) => m.role === "leader")?.userId}
							<div class="flex items-center gap-2">
								{#if data.isLeader && member.role !== "leader"}
									<!-- Promote/Demote (only leader can do this) -->
									{#if member.role === "member"}
										<form
											method="POST"
											action="?/promote"
											use:enhance={() => {
												promotingMemberId = member.userId;
												return async ({ update }) => {
													await update();
													promotingMemberId = null;
												};
											}}
										>
											<input type="hidden" name="userId" value={member.userId} />
											<button
												type="submit"
												class="btn btn-sm btn-ghost gap-1 text-green-400 hover:bg-green-400/10"
												disabled={promotingMemberId === member.userId}
											>
												<FluentArrowUp20Filled class="size-4" />
												Promote
											</button>
										</form>
									{:else if member.role === "deputy"}
										<form
											method="POST"
											action="?/demote"
											use:enhance={() => {
												demotingMemberId = member.userId;
												return async ({ update }) => {
													await update();
													demotingMemberId = null;
												};
											}}
										>
											<input type="hidden" name="userId" value={member.userId} />
											<button
												type="submit"
												class="btn btn-sm btn-ghost gap-1 text-orange-400 hover:bg-orange-400/10"
												disabled={demotingMemberId === member.userId}
											>
												<FluentArrowDown20Filled class="size-4" />
												Demote
											</button>
										</form>
									{/if}
								{/if}

								<!-- Kick (leader can kick anyone except themselves, deputy can only kick regular members) -->
								{#if (data.isLeader && member.userId !== data.members.find((m) => m.role === "leader")?.userId) || (data.isDeputy && member.role === "member")}
									<button
										onclick={() => openKickModal(member.userId, member.user.name || "this member")}
										class="btn btn-sm btn-ghost gap-1 text-red-400 hover:bg-red-400/10"
									>
										<FluentDismiss20Filled class="size-4" />
										Kick
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Join/Apply Button (if applicable) -->
	{#if data.canJoin && !data.isMember}
		<div class="card bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-white/5 shadow-xl">
			<div class="card-body items-center text-center">
				<div
					class="size-16 rounded-full flex items-center justify-center mb-2"
					style="background-color: {data.party.color}20"
				>
					<FluentPersonAdd20Filled class="size-8" style="color: {data.party.color}" />
				</div>
				<h3 class="card-title text-white">Interested in joining?</h3>
				<p class="text-gray-400 max-w-md">
					{#if data.party.autoAcceptMembers}
						Become a member of <span class="font-semibold" style="color: {data.party.color}">{data.party.name}</span>
						and help shape the political landscape of {data.party.state.name}
					{:else}
						Apply to join <span class="font-semibold" style="color: {data.party.color}">{data.party.name}</span>. Your
						application will be reviewed by party leadership.
					{/if}
				</p>
				<div class="card-actions justify-center mt-4">
					<form method="POST" action="/party/{data.party.id}?/join">
						<button
							type="submit"
							class="btn btn-lg gap-2 border-0 text-white"
							style="background-color: {data.party.color}"
						>
							<FluentPersonAdd20Filled class="size-5" />
							{data.party.autoAcceptMembers ? "Join" : "Apply to Join"}
							{data.party.name}
						</button>
					</form>
				</div>
			</div>
		</div>
	{:else if data.hasApplied}
		<div class="alert alert-info bg-blue-600/10 border-blue-500/30">
			<FluentPersonAvailable20Filled class="size-5" />
			<div>
				<h3 class="font-bold">Application Pending</h3>
				<p class="text-sm">Your membership application is awaiting review from party leadership.</p>
			</div>
		</div>
	{/if}
</div>

<!-- Kick Confirmation Modal -->
<Modal bind:open={kickModalOpen} title="Confirm Kick Member" size="default">
	{#if memberToKick}
		<div class="space-y-4">
			<div class="alert alert-warning bg-orange-600/10 border-orange-500/30">
				<FluentWarning20Filled class="size-5" />
				<span class="text-sm">
					Are you sure you want to kick <strong>{memberToKick.name}</strong> from the party? This action cannot be undone.
				</span>
			</div>

			<div class="flex gap-3 justify-end">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={() => {
						kickModalOpen = false;
						memberToKick = null;
					}}
				>
					Cancel
				</button>
				<form
					method="POST"
					action="?/kick"
					use:enhance={() => {
						kickingMemberId = memberToKick?.id || null;
						return async ({ update }) => {
							await update();
							kickingMemberId = null;
							kickModalOpen = false;
							memberToKick = null;
						};
					}}
				>
					<input type="hidden" name="userId" value={memberToKick.id} />
					<button type="submit" class="btn btn-error gap-2" disabled={kickingMemberId === memberToKick.id}>
						<FluentDismiss20Filled class="size-4" />
						{kickingMemberId === memberToKick.id ? "Kicking..." : "Kick Member"}
					</button>
				</form>
			</div>
		</div>
	{/if}
</Modal>

<!-- Disband Party Modal -->
<Modal bind:open={disbandModalOpen} title="Disband Party" size="default">
	<div class="space-y-4">
		<div class="alert alert-error bg-red-600/10 border-red-500/30">
			<FluentWarning20Filled class="size-5" />
			<div class="text-sm">
				<p class="font-bold mb-1">This action is permanent and cannot be undone!</p>
				{#if data.isOnlyPartyInState}
					<p class="text-red-400 font-semibold">
						⚠️ This is the only political party in {data.party.state.name}. Disbanding will:
					</p>
					<ul class="list-disc list-inside mt-2 space-y-1">
						<li>Abolish the state of {data.party.state.name}</li>
						<li>Convert all {data.stateRegionCount} regions to independent territories</li>
						<li>Remove all state government positions</li>
						<li>This will affect {data.statePopulation} citizens</li>
					</ul>
				{:else}
					<p>You are about to disband <strong>{data.party.name}</strong>. This will permanently delete the party.</p>
				{/if}
			</div>
		</div>

		<div class="form-control">
			<label class="label" for="confirm-text">
				<span class="label-text">Type <strong class="text-error">{data.party.name}</strong> to confirm:</span>
			</label>
			<input id="confirm-text" type="text" class="input input-bordered" placeholder="Party name" />
		</div>

		<div class="flex gap-3 justify-end">
			<button type="button" class="btn btn-ghost" onclick={() => (disbandModalOpen = false)}> Cancel </button>
			<form
				method="POST"
				action="?/disband"
				use:enhance={() => {
					const input = document.getElementById("confirm-text") as HTMLInputElement;
					if (input.value !== data.party.name) {
						alert("Please type the party name correctly to confirm.");
						return () => {};
					}
					disbanding = true;
					return async ({ update }) => {
						await update();
						disbanding = false;
					};
				}}
			>
				<button type="submit" class="btn btn-error gap-2" disabled={disbanding}>
					<FluentDelete20Filled class="size-4" />
					{disbanding ? "Disbanding..." : "Disband Party"}
				</button>
			</form>
		</div>
	</div>
</Modal>
