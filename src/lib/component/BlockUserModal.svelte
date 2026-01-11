<!-- src/lib/component/BlockUserModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";

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

{#if open && userId}
	<div class="modal modal-open">
		<div class="modal-box bg-slate-800 border border-white/10">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg text-white flex items-center gap-2">
					<FluentPersonProhibited20Filled class="size-6 text-red-400" />
					Block User
				</h3>
				<button onclick={handleClose} class="btn btn-ghost btn-sm btn-circle text-gray-400 hover:text-white">
					<FluentDismiss20Filled class="size-5" />
				</button>
			</div>

			<p class="text-gray-400 mb-4">
				Are you sure you want to block <strong class="text-white">{userName || "this user"}</strong>?
			</p>

			<div class="bg-slate-700/50 border border-yellow-600/30 rounded-lg p-3 mb-4">
				<p class="text-sm text-gray-300">Blocking will:</p>
				<ul class="list-disc list-inside text-sm text-gray-400 mt-2 space-y-1">
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

				<div class="modal-action">
					<button type="button" onclick={handleClose} class="btn btn-ghost" disabled={isSubmitting}> Cancel </button>
					<button type="submit" class="btn bg-red-600 hover:bg-red-700 border-0 text-white" disabled={isSubmitting}>
						{isSubmitting ? "Blocking..." : "Block User"}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={handleClose}></div>
	</div>
{/if}
