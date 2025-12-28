<!-- src/routes/(authenticated)/inbox/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";

	const { data, form } = $props();

	let showBroadcastModal = $state(false);
	let broadcastType = $state<"state" | "party">("state");
	let broadcastSubject = $state("");
	let broadcastContent = $state("");
	let isSubmitting = $state(false);

	// Auto-select the only available broadcast type
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
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-12 text-center">
			<FluentMail20Filled class="size-16 text-gray-500 mx-auto mb-4" />
			<h2 class="text-2xl font-bold text-white mb-2">No Broadcast Access</h2>
			<p class="text-gray-400">Only presidents and party leaders can send broadcast messages.</p>
		</div>
	</div>
{:else}
	<div class="max-w-4xl mx-auto px-4 py-6">
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
					<FluentSend20Filled class="size-6 text-purple-400" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white">Broadcast Messages</h1>
					<p class="text-sm text-gray-400">
						Send messages to {data.canBroadcastState ? "state residents" : ""}{data.canBroadcastState &&
						data.canBroadcastParty
							? " or "
							: ""}{data.canBroadcastParty ? "party members" : ""}
					</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-6">Send New Broadcast</h2>

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
								<span class="label-text text-gray-300">Broadcast To</span>
							</label>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => (broadcastType = "state")}
									class="btn flex-1 {broadcastType === 'state'
										? 'bg-purple-600 text-white border-purple-500'
										: 'bg-slate-700/50 text-gray-300 border-slate-600/30'}"
								>
									<FluentBuildingGovernment20Filled class="size-5" />
									State Residents
								</button>
								<button
									type="button"
									onclick={() => (broadcastType = "party")}
									class="btn flex-1 {broadcastType === 'party'
										? 'bg-emerald-600 text-white border-emerald-500'
										: 'bg-slate-700/50 text-gray-300 border-slate-600/30'}"
								>
									<FluentPeople20Filled class="size-5" />
									Party Members
								</button>
							</div>
						</div>
					{/if}

					<div>
						<label class="label">
							<span class="label-text text-gray-300">Subject</span>
						</label>
						<input
							type="text"
							name="subject"
							bind:value={broadcastSubject}
							placeholder="Enter message subject..."
							maxlength="200"
							class="input input-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
							required
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label class="label">
							<span class="label-text text-gray-300">Message</span>
						</label>
						<textarea
							name="content"
							bind:value={broadcastContent}
							placeholder="Enter your message..."
							rows="8"
							maxlength="2000"
							class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
							required
							disabled={isSubmitting}
						></textarea>
						<p class="text-xs text-gray-500 mt-1">{broadcastContent.length}/2000 characters</p>
					</div>

					{#if form?.error}
						<div class="alert alert-error">
							<p>{form.error}</p>
						</div>
					{/if}

					{#if form?.success}
						<div class="alert alert-success">
							<p>
								Broadcast sent successfully to {form.recipientCount} recipient{form.recipientCount !== 1 ? "s" : ""}!
							</p>
						</div>
					{/if}

					<button
						type="submit"
						class="btn w-full bg-blue-600 hover:bg-blue-700 border-0 text-white gap-2"
						disabled={isSubmitting}
					>
						<FluentSend20Filled class="size-5" />
						{isSubmitting ? "Sending..." : "Send Broadcast"}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
