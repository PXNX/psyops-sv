<!-- src/lib/component/AddAuthorModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import Modal from "#lib/component/Modal.svelte";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import Button from "#lib/component/ui/Button.svelte";

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
				<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm">
					<span>{error}</span>
				</div>
			{/if}

			{#if newspapers.length === 0}
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3 text-sm">
					<span>You don't own any newspapers. Create one first to add authors.</span>
				</div>
			{:else}
				<div>
					<label class="field-label">Select Newspaper</label>
					<select
						name="newspaperId"
						class="field-control rounded-sm px-3 py-2.5 w-full"
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

				<div>
					<label class="field-label">Rank</label>
					<select
						name="rank"
						class="field-control rounded-sm px-3 py-2.5 w-full"
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
				<Button type="button" variant="ghost" disabled={isSubmitting} onclick={closeModal}>Cancel</Button>
				<Button
					type="submit"
					variant="primary"
					icon={MdiNewspaperPlus}
					disabled={!selectedNewspaper || newspapers.length === 0}
					loading={isSubmitting}
					loadingText="Adding..."
				>
					Add Author
				</Button>
			</div>
		</div>
	</form>
</Modal>
