<!-- src/routes/party/[id]/member/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Header -->
	<div class="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-5">
			<div class="flex items-center gap-3 sm:gap-4">
				<a href="/party/{data.party.id}" class="relative flex-shrink-0">
					<div class="absolute inset-0 blur-xl rounded-full" style="background-color: {data.party.color}30"></div>
					<div
						class="relative size-12 sm:size-14 rounded-xl overflow-hidden border-2 flex items-center justify-center"
						style="background-color: {data.party.color}; border-color: {data.party.color}60"
					>
						{#if data.party.logoUrl}
							<img src={data.party.logoUrl} alt={data.party.name} class="size-10 object-contain" />
						{:else}
							<FluentShield20Filled class="size-6 text-white" />
						{/if}
					</div>
				</a>
				<div class="flex-1 min-w-0">
					<a
						href="/party/{data.party.id}"
						class="text-xs text-slate-400 hover:text-purple-400 transition-colors font-mono"
					>
						{data.party.name}
					</a>
					<h1 class="text-lg sm:text-xl font-bold text-white tracking-wide font-mono uppercase">Members</h1>
				</div>
				<div class="px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded text-xs font-mono text-slate-400">
					{data.members.length}
				</div>
			</div>
		</div>
	</div>

	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
		<!-- Auto-Accept Settings -->
		{#if data.isLeader}
			<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-4">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<FluentSettings20Filled class="size-4 text-blue-400 flex-shrink-0" />
						<div>
							<span class="text-sm font-bold text-white">Auto-accept</span>
							<p class="text-xs text-slate-500 font-mono mt-0.5">
								{data.party.autoAcceptMembers ? "Members join instantly" : "Requires approval"}
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
						<input
							type="checkbox"
							class="toggle toggle-success toggle-sm"
							checked={data.party.autoAcceptMembers}
							disabled={togglingAutoAccept}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</form>
				</div>
			</div>
		{/if}

		<!-- Pending Applications -->
		{#if canManageMembers && data.pendingApplications.length > 0}
			<div
				class="bg-gradient-to-br from-amber-950/20 to-slate-950/50 border border-amber-500/30 rounded-xl overflow-hidden"
			>
				<div class="bg-amber-950/30 border-b border-amber-500/20 px-4 sm:px-5 py-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<FluentPersonAvailable20Filled class="size-4 text-amber-400" />
							<span class="text-sm font-bold text-amber-300 font-mono uppercase tracking-wide">Pending</span>
						</div>
						<span
							class="px-2 py-0.5 bg-amber-950/50 border border-amber-500/30 rounded text-amber-400 font-mono text-xs"
						>
							{data.pendingApplications.length}
						</span>
					</div>
				</div>
				<div class="p-3 sm:p-4 space-y-2">
					{#each data.pendingApplications as application}
						<div class="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3">
							<Logo
								src={application.user.logo}
								alt={application.user.name}
								class="size-10 rounded-lg"
								placeholderIcon={FluentPeople20Filled}
								placeholderGradient="from-slate-600 to-slate-700"
							/>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-bold text-white truncate">{application.user.name}</p>
								<p class="text-xs text-slate-500 font-mono">{formatDate(application.appliedAt)}</p>
							</div>
							<div class="flex items-center gap-1.5">
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
										class="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-mono font-bold transition-all"
										disabled={processingApplicationId === application.id}
									>
										<FluentCheckmark20Filled class="size-3.5" />
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
										class="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-xs font-mono font-bold transition-all"
										disabled={processingApplicationId === application.id}
									>
										<FluentDismiss20Filled class="size-3.5" />
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Disband Warning -->
		{#if isOnlyMember}
			<div class="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
				<div class="flex items-start gap-3">
					<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<span class="text-sm font-bold text-red-300">Only member — party can be disbanded</span>
						{#if data.isOnlyPartyInState}
							<p class="text-xs text-red-400/70 font-mono mt-1">
								This will abolish {data.party.state.name} and make all regions independent.
							</p>
						{/if}
					</div>
					<button
						onclick={() => (disbandModalOpen = true)}
						class="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
					>
						<FluentDelete20Filled class="size-3.5" />
						Disband
					</button>
				</div>
			</div>
		{/if}

		<!-- Members List -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
		>
			<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-5 py-3">
				<h2 class="text-sm font-bold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-2">
					<FluentPeople20Filled class="size-4" style="color: {data.party.color}" />
					All Members
				</h2>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.members as member}
					<div
						class="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 hover:border-slate-600/60 transition-all"
					>
						<!-- Avatar -->
						<a href="/user/{member.userId}" class="relative flex-shrink-0">
							<Logo
								src={member.user.logo}
								alt={member.user.name || "Member"}
								class="size-10 sm:size-12 rounded-lg"
								placeholderIcon={FluentPeople20Filled}
								placeholderGradient="from-slate-600 to-slate-700"
							/>
							{#if member.role === "leader"}
								<div
									class="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center ring-2 ring-slate-900"
									style="background-color: {data.party.color}"
								>
									<FluentCrown20Filled class="size-2.5 text-white" />
								</div>
							{:else if member.role === "deputy"}
								<div
									class="absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center ring-2 ring-slate-900"
									style="background-color: {data.party.color}CC"
								>
									<FluentShield20Filled class="size-2.5 text-white" />
								</div>
							{/if}
						</a>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<a href="/user/{member.userId}" class="group">
								<p class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
									{member.user.name || "Anonymous"}
								</p>
							</a>
							<div class="flex items-center gap-2 mt-0.5 flex-wrap">
								{#if member.role === "leader"}
									<span
										class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
										style="background-color: {data.party.color}25; color: {data.party.color}"
									>
										LEADER
									</span>
								{:else if member.role === "deputy"}
									<span
										class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
										style="background-color: {data.party.color}18; color: {data.party.color}CC"
									>
										DEPUTY
									</span>
								{/if}
								<span class="text-[10px] text-slate-500 font-mono">{formatDate(member.joinedAt)}</span>
								{#if member.acceptedByName}
									<span class="text-[10px] text-slate-600 font-mono">by {member.acceptedByName}</span>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						{#if canManageMembers && member.userId !== data.members.find((m) => m.role === "leader")?.userId}
							<div class="flex items-center gap-1 flex-shrink-0">
								{#if data.isLeader && member.role !== "leader"}
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
												class="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
												disabled={promotingMemberId === member.userId}
												title="Promote"
											>
												<FluentArrowUp20Filled class="size-4" />
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
												class="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all"
												disabled={demotingMemberId === member.userId}
												title="Demote"
											>
												<FluentArrowDown20Filled class="size-4" />
											</button>
										</form>
									{/if}
								{/if}

								{#if (data.isLeader && member.userId !== data.members.find((m) => m.role === "leader")?.userId) || (data.isDeputy && member.role === "member")}
									<button
										onclick={() => openKickModal(member.userId, member.user.name || "this member")}
										class="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
										title="Kick"
									>
										<FluentDismiss20Filled class="size-4" />
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Join CTA -->
		{#if data.canJoin && !data.isMember}
			<div
				class="bg-gradient-to-r from-slate-900/50 to-slate-950/50 border rounded-xl p-4 sm:p-5"
				style="border-color: {data.party.color}30"
			>
				<form method="POST" action="/party/{data.party.id}?/join">
					<div class="flex flex-col sm:flex-row items-center justify-between gap-3">
						<div class="text-center sm:text-left">
							<span class="text-sm font-bold text-white">Join {data.party.name}</span>
							<p class="text-xs text-slate-400 font-mono mt-0.5">
								{data.party.autoAcceptMembers ? "Instant membership" : "Application reviewed by leadership"}
							</p>
						</div>
						<button
							type="submit"
							class="w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono font-bold text-sm text-white transition-all flex items-center justify-center gap-2 hover:brightness-110"
							style="background-color: {data.party.color}"
						>
							<FluentPersonAdd20Filled class="size-4" />
							{data.party.autoAcceptMembers ? "Join" : "Apply"}
						</button>
					</div>
				</form>
			</div>
		{:else if data.hasApplied}
			<div class="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-center">
				<span class="text-sm text-amber-300 font-mono">Application pending review</span>
			</div>
		{/if}
	</div>
</div>

<!-- Kick Modal -->
<Modal bind:open={kickModalOpen} title="Kick Member" size="default">
	{#if memberToKick}
		<div class="space-y-4">
			<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
				<p class="text-sm text-red-300">
					Kick <strong>{memberToKick.name}</strong> from the party? This cannot be undone.
				</p>
			</div>
			<div class="flex gap-3 justify-end">
				<button
					type="button"
					class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm"
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
					<button
						type="submit"
						class="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold flex items-center gap-1.5"
						disabled={kickingMemberId === memberToKick.id}
					>
						<FluentDismiss20Filled class="size-3.5" />
						{kickingMemberId === memberToKick.id ? "Kicking..." : "Kick"}
					</button>
				</form>
			</div>
		</div>
	{/if}
</Modal>

<!-- Disband Modal -->
<Modal bind:open={disbandModalOpen} title="Disband Party" size="default">
	<div class="space-y-4">
		<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
			<p class="text-sm text-red-300 font-bold mb-1">This is permanent.</p>
			{#if data.isOnlyPartyInState}
				<p class="text-xs text-red-400/80">
					This will abolish {data.party.state.name}, make {data.stateRegionCount} regions independent, and affect {data.statePopulation}
					citizens.
				</p>
			{:else}
				<p class="text-xs text-red-400/80">This will permanently delete {data.party.name}.</p>
			{/if}
		</div>

		<div>
			<label class="text-xs text-slate-400 font-mono mb-1 block" for="confirm-text">
				Type <strong class="text-red-400">{data.party.name}</strong> to confirm
			</label>
			<input
				id="confirm-text"
				type="text"
				class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
				placeholder="Party name"
			/>
		</div>

		<div class="flex gap-3 justify-end">
			<button
				type="button"
				class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm"
				onclick={() => (disbandModalOpen = false)}
			>
				Cancel
			</button>
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
				<button
					type="submit"
					class="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold flex items-center gap-1.5"
					disabled={disbanding}
				>
					<FluentDelete20Filled class="size-3.5" />
					{disbanding ? "Disbanding..." : "Disband"}
				</button>
			</form>
		</div>
	</div>
</Modal>
