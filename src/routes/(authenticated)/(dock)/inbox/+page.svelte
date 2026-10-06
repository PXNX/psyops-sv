<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";

	const { data, form } = $props();

	let broadcastType = $state<"state" | "party">("state");
	let broadcastSubject = $state("");
	let broadcastContent = $state("");
	let isSubmitting = $state(false);

	$effect(() => {
		if (data.canBroadcastState && !data.canBroadcastParty) {
			broadcastType = "state";
		} else if (!data.canBroadcastState && data.canBroadcastParty) {
			broadcastType = "party";
		}
	});
</script>

{#if !data.canBroadcastState && !data.canBroadcastParty}
	<PageContainer maxWidth="4xl">
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#102239] mb-4">
				<FluentMail20Filled class="size-8 text-[#a89e8e]" />
			</div>
			<h2 class="text-xl font-bold text-[#fff7e8] mb-2">No Broadcast Access</h2>
			<p class="text-[#a89e8e]">Only presidents and party leaders can send broadcast messages.</p>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="3xl">
		<PageHeader
			title="Broadcast"
			icon={FluentMegaphone20Filled}
			subtitle="Publish a broadcast shown on the dashboard of {data.canBroadcastState
				? 'state residents'
				: ''}{data.canBroadcastState && data.canBroadcastParty ? ' or ' : ''}{data.canBroadcastParty
				? 'party members'
				: ''}"
		/>

		<!-- Active Broadcasts -->
		{#if data.activeStateBroadcast}
			<div class="bg-[#8c709b]/15 rounded-sm border border-[#b7a0c5]/30 p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingGovernment20Filled class="size-5 text-[#b7a0c5]" />
							<h3 class="font-semibold text-[#d5c4df]">Active State Broadcast</h3>
						</div>
						<h4 class="text-[#fff7e8] font-bold mb-1">{data.activeStateBroadcast.title}</h4>
						<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{data.activeStateBroadcast.content}</p>
						<p class="text-xs text-[#a89e8e] mt-2">
							{formatDateTime(data.activeStateBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokeStateBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activeStateBroadcast.id} />
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</div>
			</div>
		{/if}

		{#if data.activePartyBroadcast}
			<div class="bg-[#587252]/18 rounded-sm border border-[#8fae88]/30 p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2">
							<FluentPeople20Filled class="size-5 text-[#8fae88]" />
							<h3 class="font-semibold text-[#c6dfbf]">Active Party Broadcast</h3>
						</div>
						<h4 class="text-[#fff7e8] font-bold mb-1">{data.activePartyBroadcast.title}</h4>
						<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{data.activePartyBroadcast.content}</p>
						<p class="text-xs text-[#a89e8e] mt-2">
							{formatDateTime(data.activePartyBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokePartyBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activePartyBroadcast.id} />
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</div>
			</div>
		{/if}

		<!-- Broadcast Form -->
		<div class="panel rounded-sm p-5">
			<h2 class="section-title mb-4">New Broadcast</h2>

			<form
				method="POST"
				action="?/broadcast{broadcastType === 'state' ? 'State' : 'Party'}"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === "success") {
							broadcastSubject = "";
							broadcastContent = "";
						}
						await update();
					};
				}}
			>
				<div class="space-y-4">
					{#if data.canBroadcastState && data.canBroadcastParty}
						<div>
							<span class="field-label">Broadcast To</span>
							<div class="flex gap-2">
								<Button
									type="button"
									grow
									variant={broadcastType === "state" ? "soft-purple" : "subtle"}
									icon={FluentBuildingGovernment20Filled}
									onclick={() => (broadcastType = "state")}
								>
									State Residents
								</Button>
								<Button
									type="button"
									grow
									variant={broadcastType === "party" ? "soft-emerald" : "subtle"}
									icon={FluentPeople20Filled}
									onclick={() => (broadcastType = "party")}
								>
									Party Members
								</Button>
							</div>
						</div>
					{/if}

					<div>
						<label class="field-label" for="broadcast-subject">Subject</label>
						<input
							id="broadcast-subject"
							type="text"
							name="subject"
							bind:value={broadcastSubject}
							placeholder="Enter broadcast subject..."
							maxlength="200"
							class="field-control w-full rounded-sm px-3 py-2.5"
							required
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label class="field-label" for="broadcast-content">Message</label>
						<textarea
							id="broadcast-content"
							name="content"
							bind:value={broadcastContent}
							placeholder="Enter your broadcast message..."
							rows="8"
							maxlength="2000"
							class="field-control w-full rounded-sm px-3 py-2.5"
							required
							disabled={isSubmitting}></textarea>
						<p class="field-hint">{broadcastContent.length}/2000 characters</p>
					</div>

					{#if form?.error}
						<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
							<FluentWarning20Filled class="size-5 shrink-0" />
							<p class="text-sm">{form.error}</p>
						</div>
					{/if}

					{#if form?.success}
						<div
							class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center gap-3"
						>
							<FluentSend20Filled class="size-5 shrink-0" />
							<p class="text-sm">Broadcast published!</p>
						</div>
					{/if}

					<Button
						type="submit"
						variant="primary"
						block
						icon={FluentSend20Filled}
						disabled={isSubmitting || !broadcastSubject || !broadcastContent}
					>
						{isSubmitting ? "Publishing..." : "Publish Broadcast"}
					</Button>
				</div>
			</form>
		</div>
	</PageContainer>
{/if}
