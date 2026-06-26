<!-- src/lib/component/ReportModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";

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

<BottomSheet bind:open={show} title="Report {targetType === 'account' ? 'User' : 'Party'}">
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center shrink-0">
				<FluentWarning20Filled class="size-6 text-red-400" />
			</div>
			<p class="text-gray-300">
				Reporting: <strong class="text-white">{targetName}</strong>
			</p>
		</div>

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

			<div class="space-y-4">
				<div>
					<label class="label">
						<span class="label-text text-gray-300">Violation Type</span>
					</label>
					<select
						name="violationType"
						bind:value={violationType}
						class="select select-bordered w-full bg-slate-800 border-slate-700 text-white"
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
						class="textarea textarea-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
						required></textarea>
					<p class="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
				</div>

				<div class="flex gap-3 pt-2">
					<button type="button" onclick={closeModal} class="btn flex-1 btn-ghost"> Cancel </button>
					<button type="submit" class="btn flex-1 bg-red-600 hover:bg-red-700 border-0 text-white">
						Submit Report
					</button>
				</div>
			</div>
		</form>
	</div>
</BottomSheet>
