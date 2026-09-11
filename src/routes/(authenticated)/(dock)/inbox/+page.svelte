<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	import { formatDateTime } from "$lib/utils/formatting.js";

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
	<div class="max-w-4xl mx-auto px-4 py-12">
		<div class="panel-muted rounded-xl p-12 text-center">
			<FluentMail20Filled class="size-16 text-[#a89e8e] mx-auto mb-4" />
			<h2 class="text-2xl font-bold text-white mb-2">No Broadcast Access</h2>
			<p class="text-[#a89e8e]">Only presidents and party leaders can send broadcast messages.</p>
		</div>
	</div>
{:else}
	<div class="max-w-4xl mx-auto px-4 py-6">
		<div class="flex items-center gap-3 mb-6">
			<div class="size-12 bg-[#8c709b]/20 rounded-xl flex items-center justify-center">
				<FluentMegaphone20Filled class="size-6 text-[#d5c4df]" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-white">Broadcast</h1>
				<p class="text-sm text-[#a89e8e]">
					Publish a broadcast shown on the dashboard of
					{data.canBroadcastState ? "state residents" : ""}{data.canBroadcastState && data.canBroadcastParty
						? " or "
						: ""}{data.canBroadcastParty ? "party members" : ""}
				</p>
			</div>
		</div>

		<!-- Active Broadcasts -->
		{#if data.activeStateBroadcast}
			<div class="bg-[#8c709b]/12 rounded-xl border border-[#b7a0c5]/25 p-5 mb-4">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingGovernment20Filled class="size-5 text-[#d5c4df]" />
							<h3 class="font-semibold text-[#d5c4df]">Active State Broadcast</h3>
						</div>
						<h4 class="text-white font-bold mb-1">{data.activeStateBroadcast.title}</h4>
						<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{data.activeStateBroadcast.content}</p>
						<p class="text-xs text-[#a89e8e] mt-2">
							{formatDateTime(data.activeStateBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokeStateBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activeStateBroadcast.id} />
						<button type="submit" class="btn btn-sm bg-red-600/20 hover:bg-red-600/40 border-red-500/30 text-red-400">
							<FluentDismiss20Filled class="size-4" />
							Revoke
						</button>
					</form>
				</div>
			</div>
		{/if}

		{#if data.activePartyBroadcast}
			<div class="bg-emerald-600/10 rounded-xl border border-emerald-500/20 p-5 mb-4">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-2">
							<FluentPeople20Filled class="size-5 text-emerald-400" />
							<h3 class="font-semibold text-emerald-400">Active Party Broadcast</h3>
						</div>
						<h4 class="text-white font-bold mb-1">{data.activePartyBroadcast.title}</h4>
						<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{data.activePartyBroadcast.content}</p>
						<p class="text-xs text-[#a89e8e] mt-2">
							{formatDateTime(data.activePartyBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokePartyBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activePartyBroadcast.id} />
						<button type="submit" class="btn btn-sm bg-red-600/20 hover:bg-red-600/40 border-red-500/30 text-red-400">
							<FluentDismiss20Filled class="size-4" />
							Revoke
						</button>
					</form>
				</div>
			</div>
		{/if}

		<!-- Broadcast Form -->
		<div class="panel rounded-xl p-6">
			<h2 class="text-lg font-bold text-white mb-4">New Broadcast</h2>

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
							<label class="label">
								<span class="label-text text-[#d9ccb7]">Broadcast To</span>
							</label>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => (broadcastType = "state")}
									class="btn flex-1 {broadcastType === 'state'
										? 'bg-[#8c709b] text-white border-[#b7a0c5]'
										: 'bg-[#102239]/70 text-[#d9ccb7] border-[#dfceb0]/15'}"
								>
									<FluentBuildingGovernment20Filled class="size-5" />
									State Residents
								</button>
								<button
									type="button"
									onclick={() => (broadcastType = "party")}
									class="btn flex-1 {broadcastType === 'party'
										? 'bg-emerald-600 text-white border-emerald-500'
										: 'bg-[#102239]/70 text-[#d9ccb7] border-[#dfceb0]/15'}"
								>
									<FluentPeople20Filled class="size-5" />
									Party Members
								</button>
							</div>
						</div>
					{/if}

					<div>
						<label class="label">
							<span class="label-text text-[#d9ccb7]">Subject</span>
						</label>
						<input
							type="text"
							name="subject"
							bind:value={broadcastSubject}
							placeholder="Enter broadcast subject..."
							maxlength="200"
							class="input input-bordered w-full field-control"
							required
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label class="label">
							<span class="label-text text-[#d9ccb7]">Message</span>
						</label>
						<textarea
							name="content"
							bind:value={broadcastContent}
							placeholder="Enter your broadcast message..."
							rows="8"
							maxlength="2000"
							class="textarea textarea-bordered w-full field-control"
							required
							disabled={isSubmitting}
						></textarea>
						<p class="text-xs text-[#a89e8e] mt-1">{broadcastContent.length}/2000 characters</p>
					</div>

					{#if form?.error}
						<div class="alert alert-error">
							<FluentWarning20Filled class="size-5" />
							<p>{form.error}</p>
						</div>
					{/if}

					{#if form?.success}
						<div class="alert alert-success">
							<FluentSend20Filled class="size-5" />
							<p>Broadcast published!</p>
						</div>
					{/if}

					<button
						type="submit"
						class="btn w-full bg-blue-600 hover:bg-blue-500 border-0 text-white shadow-lg shadow-blue-600/20 gap-2"
						disabled={isSubmitting || !broadcastSubject || !broadcastContent}
					>
						<FluentSend20Filled class="size-5" />
						{isSubmitting ? "Publishing..." : "Publish Broadcast"}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
