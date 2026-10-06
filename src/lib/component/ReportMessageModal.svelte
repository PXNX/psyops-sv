<!-- src/lib/component/ReportMessageModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import FormActions from "#lib/component/ui/FormActions.svelte";

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
				<div
					class="size-12 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm flex items-center justify-center shrink-0"
				>
					<FluentWarning20Filled class="size-6 text-[#ffd35c]" />
				</div>
				<p class="text-sm text-[#d3caa9]">Help us understand what's wrong with this message.</p>
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
					<div class="w-full">
						<label for="report-message-reason" class="field-label">Reason *</label>
						<select
							id="report-message-reason"
							name="violationType"
							bind:value={violationType}
							class="field-control rounded-sm px-3 py-2.5 w-full"
							required
						>
							<option value="" disabled>Select a reason</option>
							{#each reasons as r}
								<option value={r.value}>{r.label}</option>
							{/each}
						</select>
					</div>

					<div class="w-full">
						<label for="report-message-description" class="field-label">Additional details (optional)</label>
						<textarea
							id="report-message-description"
							name="description"
							bind:value={description}
							class="field-control rounded-sm px-3 py-2.5 w-full"
							placeholder="Provide any additional context..."
							rows="3"
							maxlength="500"></textarea>
						<p class="field-hint">{description.length}/500 characters</p>
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
