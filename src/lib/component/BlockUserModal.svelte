<!-- src/lib/component/BlockUserModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";
	import FormActions from "$lib/component/ui/FormActions.svelte";

	interface Props {
		open: boolean;
		userId: string | null;
		userName: string | null;
		onClose: () => void;
	}

	let { open = $bindable(), userId, userName, onClose }: Props = $props();

	let isSubmitting = $state(false);

	function handleClose() {
		open = false;
		onClose();
	}
</script>

{#if userId}
	<BottomSheet bind:open title="Block User">
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center shrink-0">
					<FluentPersonProhibited20Filled class="size-6 text-red-400" />
				</div>
				<p class="text-gray-300">
					Are you sure you want to block <strong class="text-white">{userName || "this user"}</strong>?
				</p>
			</div>

			<div class="bg-slate-800/80 border border-yellow-600/30 rounded-xl p-4">
				<p class="text-sm text-gray-300 font-medium mb-2">Blocking will:</p>
				<ul class="list-disc list-inside text-sm text-gray-400 space-y-1">
					<li>Hide their messages from you</li>
					<li>Prevent them from sending you direct messages</li>
					<li>You can unblock them later from your settings</li>
				</ul>
			</div>

			<form
				method="POST"
				action="?/blockUser"
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
				<input type="hidden" name="blockedUserId" value={userId || ""} />

				<FormActions
					submitLabel="Block User"
					submittingLabel="Blocking..."
					submitVariant="danger"
					submitting={isSubmitting}
					onCancel={handleClose}
				/>
			</form>
		</div>
	</BottomSheet>
{/if}
