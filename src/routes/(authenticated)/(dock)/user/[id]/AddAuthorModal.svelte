<!-- src/lib/component/AddAuthorModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import Modal from "$lib/component/Modal.svelte";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";

	interface Props {
		show: boolean;
		userId: string;
		userName: string;
		newspapers: Array<{
			id: number;
			name: string;
		}>;
	}

	let { show = $bindable(), userId, userName, newspapers }: Props = $props();

	let selectedNewspaper = $state("");
	let selectedRank = $state("author");
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	function closeModal() {
		show = false;
		selectedNewspaper = "";
		selectedRank = "author";
		error = null;
	}
</script>

<Modal bind:open={show} title="Add {userName} as Author">
	<form
		method="POST"
		action="?/addAuthor"
		use:enhance={() => {
			isSubmitting = true;
			error = null;
			return async ({ result, update }) => {
				isSubmitting = false;

				if (result.type === "success") {
					closeModal();
				} else if (result.type === "failure") {
					error = result.data?.error || "Failed to add author";
				}
				await update();
			};
		}}
	>
		<input type="hidden" name="userId" value={userId} />

		<div class="space-y-4">
			{#if error}
				<div class="alert alert-error bg-red-600/10 border-red-500/20 text-red-300">
					<span>{error}</span>
				</div>
			{/if}

			{#if newspapers.length === 0}
				<div class="alert alert-warning bg-yellow-600/10 border-yellow-500/20 text-yellow-300">
					<span>You don't own any newspapers. Create one first to add authors.</span>
				</div>
			{:else}
				<div class="form-control">
					<label class="label">
						<span class="label-text text-gray-300">Select Newspaper</span>
					</label>
					<select
						name="newspaperId"
						class="select select-bordered bg-slate-900 text-white border-white/10"
						bind:value={selectedNewspaper}
						disabled={isSubmitting}
						required
					>
						<option value="" disabled>Choose a newspaper...</option>
						{#each newspapers as newspaper}
							<option value={newspaper.id}>
								{newspaper.name}
							</option>
						{/each}
					</select>
				</div>

				<div class="form-control">
					<label class="label">
						<span class="label-text text-gray-300">Rank</span>
					</label>
					<select
						name="rank"
						class="select select-bordered bg-slate-900 text-white border-white/10"
						bind:value={selectedRank}
						disabled={isSubmitting}
						required
					>
						<option value="author">Author</option>
						<option value="editor">Editor</option>
					</select>
				</div>
			{/if}

			<div class="flex gap-2 justify-end">
				<button type="button" class="btn btn-ghost" disabled={isSubmitting} onclick={closeModal}> Cancel </button>
				<button
					type="submit"
					class="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none gap-2"
					disabled={!selectedNewspaper || isSubmitting || newspapers.length === 0}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Adding...
					{:else}
						<MdiNewspaperPlus class="size-4" />
						Add Author
					{/if}
				</button>
			</div>
		</div>
	</form>
</Modal>
