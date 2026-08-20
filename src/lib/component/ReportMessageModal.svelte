<!-- src/lib/component/ReportMessageModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";
	import FormActions from "$lib/component/ui/FormActions.svelte";

	interface Props {
		open: boolean;
		messageId: number | null;
		senderId: string | null;
		onClose: () => void;
	}

	let { open = $bindable(), messageId, senderId, onClose }: Props = $props();

	let violationType = $state("");
	let description = $state("");
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
		violationType = "";
		description = "";
		onClose();
	}
</script>

{#if messageId}
	<BottomSheet bind:open title="Report Message">
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-yellow-600/20 rounded-xl flex items-center justify-center shrink-0">
					<FluentWarning20Filled class="size-6 text-yellow-400" />
				</div>
				<p class="text-sm text-gray-300">Help us understand what's wrong with this message.</p>
			</div>

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

				<div class="space-y-4">
					<div class="form-control w-full">
						<label class="label">
							<span class="label-text text-gray-300">Reason *</span>
						</label>
						<select
							name="violationType"
							bind:value={violationType}
							class="select select-bordered field-control"
							required
						>
							<option value="" disabled>Select a reason</option>
							{#each reasons as r}
								<option value={r.value}>{r.label}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label">
							<span class="label-text text-gray-300">Additional details (optional)</span>
						</label>
						<textarea
							name="description"
							bind:value={description}
							class="textarea textarea-bordered field-control"
							placeholder="Provide any additional context..."
							rows="3"
							maxlength="500"></textarea>
						<label class="label">
							<span class="label-text-alt text-gray-500">{description.length}/500 characters</span>
						</label>
					</div>

					<FormActions
						submitLabel="Submit Report"
						submittingLabel="Submitting..."
						submitVariant="danger"
						submitting={isSubmitting}
						submitDisabled={!violationType}
						onCancel={handleClose}
					/>
				</div>
			</form>
		</div>
	</BottomSheet>
{/if}
