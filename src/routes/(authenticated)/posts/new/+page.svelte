<script>
	import { Editor } from "novel-svelte";
	import Tiptap from "$lib/component/Tiptap.svelte";

	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiFloppyDisk from "~icons/fluent-emoji/floppy-disk";
	import MdiWindowClose from "~icons/mdi/window-close";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let publishModal = $state();
	let cancelModal = $state();
</script>

<header class="sticky top-0 bg-base-100">
	<div class="flex p-2 space-x-2">
		<button onclick={() => cancelModal.showModal()} class="btn btn-ghost">
			<FluentEmojiLeftArrow />
		</button>
		<input class="w-full max-w-xs input" placeholder="Enter Title..." type="text" />

		<button onclick={() => publishModal.showModal()} class="btn btn-ghost">
			<FluentEmojiFloppyDisk />
		</button>
	</div>

	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

<dialog class="modal" bind:this={publishModal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"><MdiWindowClose /></button>
		</form>
		<h3 class="text-lg font-bold">Publish!</h3>

		{#if data.newspapers.length > 0}
			<label class="form-control w-full">
				Publish article as

				<select class="w-full max-w-sm select select-bordered">
					<option value="" selected disabled hidden>Select newspaper</option>
					{#each data.newspapers as newspaper}
						<option value={newspaper.id}>
							{newspaper.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}

		<p class="py-4">Press ESC key or click on ✕ button to close</p>

		<button class=" btn btn-primary">Publish article</button>
	</div>
</dialog>

<!-- todo: make this own componentn and also provide i18n to separeate header slot and children slot-->
<dialog class="modal" bind:this={cancelModal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"><MdiWindowClose /></button>
		</form>
		<h3 class="text-lg font-bold">Cancel!</h3>
		<p class="py-4">Press ESC key or click on ✕ button to close</p>

		<button class=" btn btn-primary" onclick={() => history.back()}>Revert changes</button>
	</div>
</dialog>

<Tiptap />
