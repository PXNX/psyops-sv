<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";

	interface Props {
		open: boolean;
		messageId: number | null;
		senderId: string | null;
		onClose: () => void;
	}

	let { open = $bindable(), messageId, senderId, onClose }: Props = $props();

	let reason = $state("");
	let isSubmitting = $state(false);

	const reasons = [
		{ value: "insult", label: "Insults or harassment" },
		{ value: "spam", label: "Spam or advertising" },
		{ value: "hate_speech", label: "Hate speech" },
		{ value: "pornography", label: "Pornography or sexual content" },
		{ value: "graphic_violence", label: "Graphic violence" },
		{ value: "privacy_violation", label: "Privacy violation" },
		{ value: "other", label: "Other" }
	];

	function handleClose() {
		open = false;
		reason = "";
		onClose();
	}
</script>

// src/lib/component/ReportMessageModal.svelte
{#if open && messageId}
	<div class="modal modal-open">
		<div class="modal-box bg-slate-800 border border-white/10">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg text-white">Report Message</h3>
				<button onclick={handleClose} class="btn btn-ghost btn-sm btn-circle text-gray-400 hover:text-white">
					<FluentDismiss20Filled class="size-5" />
				</button>
			</div>

			<p class="text-gray-400 mb-4">Help us understand what's wrong with this message.</p>

			<form
				method="POST"
				action="?/reportMessage"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						await update();
						if (result.type === "success") {
							handleClose();
						}
						isSubmitting = false;
					};
				}}
			>
				<input type="hidden" name="messageId" value={messageId} />
				<input type="hidden" name="reportedUserId" value={senderId || ""} />

				<div class="form-control w-full mb-4">
					<label class="label">
						<span class="label-text text-gray-300">Reason</span>
					</label>
					<select
						name="violationType"
						bind:value={reason}
						class="select select-bordered bg-slate-700/50 border-slate-600/30 text-white"
						required
					>
						<option value="" disabled>Select a reason</option>
						{#each reasons as r}
							<option value={r.value}>{r.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-control w-full mb-4">
					<label class="label">
						<span class="label-text text-gray-300">Additional details (optional)</span>
					</label>
					<textarea
						name="description"
						class="textarea textarea-bordered bg-slate-700/50 border-slate-600/30 text-white"
						placeholder="Provide any additional context..."
						rows="3"
					></textarea>
				</div>

				<div class="modal-action">
					<button type="button" onclick={handleClose} class="btn btn-ghost" disabled={isSubmitting}> Cancel </button>
					<button
						type="submit"
						class="btn bg-red-600 hover:bg-red-700 border-0 text-white"
						disabled={isSubmitting || !reason}
					>
						{isSubmitting ? "Submitting..." : "Submit Report"}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={handleClose}></div>
	</div>
{/if}
