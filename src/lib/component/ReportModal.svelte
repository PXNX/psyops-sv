<!-- src/lib/component/ReportModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	interface Props {
		show: boolean;
		targetType: "account" | "party";
		targetId: string;
		targetName: string;
	}

	let { show = $bindable(), targetType, targetId, targetName }: Props = $props();

	let reason = $state("");
	let violationType = $state("other");

	const violationTypes = [
		{ value: "insult", label: "Insults / Harassment" },
		{ value: "spam", label: "Spam" },
		{ value: "pornography", label: "Pornographic Content" },
		{ value: "hate_speech", label: "Hate Speech / Illegal Symbols" },
		{ value: "graphic_violence", label: "Graphic Violence" },
		{ value: "privacy_violation", label: "Privacy Violation" },
		{ value: "other", label: "Other" }
	];

	function closeModal() {
		show = false;
		reason = "";
		violationType = "other";
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-slate-800 rounded-2xl border border-white/5 p-6 max-w-md w-full">
			<h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentWarning20Filled class="size-6 text-red-400" />
				Report {targetType === "account" ? "User" : "Party"}
			</h2>

			<p class="text-gray-300 mb-4">
				You are reporting: <strong class="text-white">{targetName}</strong>
			</p>

			<form
				method="POST"
				action="/report?/report{targetType === 'account' ? 'Account' : 'Party'}"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === "success") {
							closeModal();
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="targetId" value={targetId} />

				<div class="space-y-4 mb-6">
					<div>
						<label class="label">
							<span class="label-text text-gray-300">Violation Type</span>
						</label>
						<select
							name="violationType"
							bind:value={violationType}
							class="select select-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
						>
							{#each violationTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="label">
							<span class="label-text text-gray-300">Reason for reporting</span>
						</label>
						<textarea
							name="reason"
							bind:value={reason}
							placeholder="Please describe the violation..."
							rows="4"
							maxlength="500"
							class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
							required
						></textarea>
						<p class="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
					</div>
				</div>

				<div class="flex gap-3">
					<button
						type="button"
						onclick={closeModal}
						class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300"
					>
						Cancel
					</button>
					<button type="submit" class="btn flex-1 bg-red-600 hover:bg-red-700 border-0 text-white">
						Submit Report
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
