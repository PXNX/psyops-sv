<!-- src/routes/party/[id]/member/+page.svelte -->
<script lang="ts">
	import { vanish } from "#lib/utils/motion.js";
	import { toast, toastResult } from "#lib/ui/toast.svelte.js";
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentArrowUp20Filled from "~icons/fluent/arrow-up-20-filled";
	import FluentArrowDown20Filled from "~icons/fluent/arrow-down-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPersonAvailable20Filled from "~icons/fluent/person-available-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import { celebrate } from "#lib/utils/celebrate.js";
	import Modal from "#lib/component/Modal.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, IconButton, Badge } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	const { data } = $props();

	let kickModalOpen = $state(false);
	let disbandModalOpen = $state(false);
	let memberToKick = $state<{ id: string; name: string } | null>(null);
	let kickingMemberId = $state<string | null>(null);
	let promotingMemberId = $state<string | null>(null);
	let demotingMemberId = $state<string | null>(null);
	let disbanding = $state(false);
	let disbandConfirmText = $state("");
	const disbandConfirmed = $derived(disbandConfirmText.trim() === data.party.name);
	let togglingAutoAccept = $state(false);
	let processingApplicationId = $state<number | null>(null);

	const canManageMembers = $derived(data.isLeader || data.isDeputy);
	const isOnlyMember = $derived(data.members.length === 1 && data.isLeader);

	function openKickModal(userId: string, name: string) {
		memberToKick = { id: userId, name };
		kickModalOpen = true;
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader
		title="Roster"
		subtitle="{data.members.length} {data.members.length === 1 ? 'member' : 'members'}"
		icon={FluentPeople20Filled}
		backHref="/party/{data.party.id}"
		backLabel={data.party.name}
	>
		{#snippet actions()}
			<a href="/party/{data.party.id}" class="shrink-0" aria-label={data.party.name}>
				<div
					class="size-12 rounded-sm overflow-hidden border border-[#8ea6e0]/15 flex items-center justify-center"
					style="background-color: {data.party.color}"
				>
					{#if data.party.logoUrl}
						<img
							loading="lazy"
							decoding="async"
							src={data.party.logoUrl}
							alt={data.party.name}
							class="size-10 object-contain"
						/>
					{:else}
						<FluentShield20Filled class="size-6 text-[#eef2ff]" />
					{/if}
				</div>
			</a>
		{/snippet}
	</PageHeader>

	<div class="space-y-4 sm:space-y-5">
		<!-- Auto-Accept Settings -->
		{#if data.isLeader}
			<div class="panel rounded-sm p-4">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<FluentSettings20Filled class="size-4 text-[#6aa8ff] shrink-0" />
						<div>
							<span class="text-sm font-bold text-[#eef2ff]">Auto-accept</span>
							<p class="text-xs text-[#8e9abb] mt-0.5">
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
							class="toggle toggle-sm border-[#8ea6e0]/25 checked:border-[#4fd88a]/50 checked:bg-[#1f9d62] checked:text-[#aef3c9]"
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
			<div class="panel rounded-sm p-5 space-y-3 border-[#f5a524]/35">
				<div class="flex items-center justify-between">
					<h2 class="section-title">
						<FluentPersonAvailable20Filled class="size-5 text-[#ffcb6b]" />
						Applications
					</h2>
					<Badge tone="amber">{data.pendingApplications.length}</Badge>
				</div>
				<div class="space-y-2">
					{#each data.pendingApplications as application (application.id)}
						<div out:vanish class="flex items-center gap-3 panel-muted rounded-sm p-3">
							<UserLink
								size="sm"
								id={application.userId}
								name={application.user.name}
								avatar={application.user.logo}
								subtitle="Applied {formatDate(application.appliedAt)}"
								class="flex-1"
							/>
							<div class="flex items-center gap-1.5">
								<form
									method="POST"
									action="?/acceptApplication"
									use:enhance={() => {
										processingApplicationId = application.id;
										return async ({ result, update }) => {
											await update();
											processingApplicationId = null;
											if (result.type === "success") celebrate(document.getElementById("party-roster"));
										};
									}}
								>
									<input type="hidden" name="applicationId" value={application.id} />
									<IconButton
										type="submit"
										icon={FluentCheckmark20Filled}
										label="Accept"
										variant="soft-emerald"
										size="sm"
										shape="square"
										disabled={processingApplicationId === application.id}
									/>
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
									<IconButton
										type="submit"
										icon={FluentDismiss20Filled}
										label="Reject"
										variant="soft-red"
										size="sm"
										shape="square"
										disabled={processingApplicationId === application.id}
									/>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Disband Warning -->
		{#if isOnlyMember}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-start gap-3">
				<FluentWarning20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
				<div class="flex-1">
					<span class="text-sm font-bold">Only member — party can be disbanded</span>
					{#if data.isOnlyPartyInState}
						<p class="text-xs text-red-300/80 mt-1">
							This will abolish {data.party.state.name} and make all regions independent.
						</p>
					{/if}
				</div>
				<Button
					variant="soft-red"
					size="sm"
					icon={FluentDelete20Filled}
					class="shrink-0"
					onclick={() => (disbandModalOpen = true)}
				>
					Disband
				</Button>
			</div>
		{/if}

		<!-- Membership cards -->
		<section id="party-roster" class="space-y-3">
			<h2 class="section-title">
				<FluentPeople20Filled class="size-5" style="color: {data.party.color}" />
				Membership cards
			</h2>
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.members as member, i (member.userId)}
					<li out:vanish class="panel rounded-sm overflow-hidden flex flex-col">
						<div
							class="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]"
							style="background-color: {data.party.color}33; color: {data.party.color}"
						>
							<span class="flex min-w-0 items-center gap-1.5 font-bold">
								<PartyTag abbreviation={data.party.abbreviation} color={data.party.color} />
								<span class="truncate">Member card</span>
							</span>
							<span class="font-mono shrink-0">No. {String(i + 1).padStart(3, "0")}</span>
						</div>
						<div class="flex items-center gap-3 p-3">
							<UserLink
								size="md"
								id={member.userId}
								name={member.user.name || "Anonymous"}
								avatar={member.user.logo}
								subtitle="Since {formatDate(member.joinedAt)}{member.acceptedByName
									? ` · by ${member.acceptedByName}`
									: ''}"
								class="flex-1"
							/>
							{#if member.role === "leader" || member.role === "deputy"}
								<span
									class="shrink-0 animate-stamp rounded-sm border-2 px-1.5 py-0.5 font-serif text-[10px] font-black uppercase tracking-widest"
									style="border-color: {data.party.color}; color: {data.party.color}; --stamp-tilt: -8deg"
								>
									{member.role === "leader" ? "Leader" : "Deputy"}
								</span>
							{/if}
						</div>

						{#if canManageMembers && member.userId !== data.members.find((m) => m.role === "leader")?.userId}
							<div class="mt-auto flex items-center justify-end gap-1 border-t border-[#8ea6e0]/10 px-3 py-2">
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
											<IconButton
												type="submit"
												icon={FluentArrowUp20Filled}
												label="Promote"
												variant="soft-emerald"
												size="sm"
												shape="square"
												disabled={promotingMemberId === member.userId}
											/>
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
											<IconButton
												type="submit"
												icon={FluentArrowDown20Filled}
												label="Demote"
												variant="soft-amber"
												size="sm"
												shape="square"
												disabled={demotingMemberId === member.userId}
											/>
										</form>
									{/if}
								{/if}

								{#if (data.isLeader && member.userId !== data.members.find((m) => m.role === "leader")?.userId) || (data.isDeputy && member.role === "member")}
									<IconButton
										icon={FluentDismiss20Filled}
										label="Kick"
										variant="soft-red"
										size="sm"
										shape="square"
										onclick={() => openKickModal(member.userId, member.user.name || "this member")}
									/>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		<!-- Join CTA -->
		{#if data.canJoin && !data.isMember}
			<div
				class="panel rounded-sm p-4 sm:p-5 overflow-hidden relative"
				style="background-color: {data.party.color}0d; background-image: radial-gradient(circle at top, {data.party
					.color}40, transparent 70%);"
			>
				<form
					method="POST"
					action="/party/{data.party.id}?/join"
					use:enhance={() => {
						return async ({ result, update }) => {
							// The action lives on the parent /party/[id] route; stay on this
							// member list page instead of navigating there after joining.
							await update({ navigate: false });
							if (result.type === "success") celebrate(document.getElementById("party-roster"));
						};
					}}
				>
					<div class="flex flex-col sm:flex-row items-center justify-between gap-3">
						<div class="text-center sm:text-left">
							<span class="text-sm font-bold text-[#eef2ff]">Join {data.party.name}</span>
							<p class="text-xs text-[#8e9abb] mt-0.5">
								{data.party.autoAcceptMembers ? "Instant membership" : "Leadership approves"}
							</p>
						</div>
						<Button type="submit" variant="primary" icon={FluentPersonAdd20Filled} class="w-full sm:w-auto">
							{data.party.autoAcceptMembers ? "Join" : "Apply"}
						</Button>
					</div>
				</form>
			</div>
		{:else if data.hasApplied}
			<div
				class="bg-[#f5a524]/12 border border-[#f5a524]/35 text-[#ffcb6b] rounded-sm p-4 flex items-center justify-center gap-3"
			>
				<span class="text-sm">Application pending review</span>
			</div>
		{/if}
	</div>
</PageContainer>

<!-- Kick Modal -->
<Modal bind:open={kickModalOpen} title="Kick Member" size="default">
	{#if memberToKick}
		<div class="space-y-4">
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm">
					Kick <strong>{memberToKick.name}</strong> from the party? This cannot be undone.
				</p>
			</div>
			<div class="flex gap-3 justify-end">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => {
						kickModalOpen = false;
						memberToKick = null;
					}}
				>
					Cancel
				</Button>
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
					<Button
						type="submit"
						variant="danger"
						size="sm"
						icon={FluentDismiss20Filled}
						disabled={kickingMemberId === memberToKick.id}
					>
						{kickingMemberId === memberToKick.id ? "Kicking..." : "Kick"}
					</Button>
				</form>
			</div>
		</div>
	{/if}
</Modal>

<!-- Disband Modal -->
<Modal bind:open={disbandModalOpen} title="Disband Party" size="default">
	<div class="space-y-4">
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4">
			<p class="text-sm font-bold mb-1">This is permanent.</p>
			{#if data.isOnlyPartyInState}
				<p class="text-xs text-red-300/80">
					This will abolish {data.party.state.name}, make {data.stateRegionCount} regions independent, and affect {data.statePopulation}
					citizens.
				</p>
			{:else}
				<p class="text-xs text-red-300/80">This will permanently delete {data.party.name}.</p>
			{/if}
		</div>

		<div>
			<label class="field-label" for="confirm-text">
				Type <strong class="text-red-400">{data.party.name}</strong> to confirm
			</label>
			<input
				id="confirm-text"
				name="confirmName"
				form="disband-form"
				type="text"
				autocomplete="off"
				bind:value={disbandConfirmText}
				class="field-control rounded-sm px-3 py-2.5 w-full text-sm"
				placeholder="Party name"
			/>
		</div>

		<div class="flex gap-3 justify-end">
			<Button type="button" variant="secondary" size="sm" onclick={() => (disbandModalOpen = false)}>Cancel</Button>
			<form
				id="disband-form"
				method="POST"
				action="?/disband"
				use:enhance={({ cancel }) => {
					// The button is disabled until the name matches; this is the backstop
					// (returning early without cancel() would still submit the form).
					if (!disbandConfirmed) {
						toast.error("Type the party name exactly to confirm.");
						cancel();
						return;
					}
					disbanding = true;
					return async ({ result, update }) => {
						await update();
						toastResult(result);
						disbanding = false;
					};
				}}
			>
				<Button
					type="submit"
					variant="danger"
					size="sm"
					icon={FluentDelete20Filled}
					disabled={!disbandConfirmed}
					loading={disbanding}
					loadingText="Disbanding..."
				>
					Disband
				</Button>
			</form>
		</div>
	</div>
</Modal>
