<!-- src/routes/(authenticated)/(fullscreen)/posts/new/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import FluentEmojiFloppyDisk from "~icons/fluent-emoji/floppy-disk";
	import MdiWindowClose from "~icons/mdi/window-close";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import WysiwygEditor from "$lib/component/WysiwygEditor.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";

	const { data } = $props();

	let editorComponent = $state(null);
	let publishModal: HTMLDialogElement;
	let cancelModal: HTMLDialogElement;
	let title = $state("");
	let selectedNewspaperId = $state("");
	let isSubmitting = $state(false);

	const handlePublish = async () => {
		const content = editorComponent?.getContent();

		if (!title.trim()) {
			alert("Please enter a title");
			return;
		}

		if (!content || content.trim().length < 50) {
			alert("Please write at least 50 characters of content");
			return;
		}

		if (title.length > 200) {
			alert("Title must be 200 characters or less");
			return;
		}

		publishModal.showModal();
	};

	const handleCancel = () => {
		if (title || editorComponent?.getContent()) {
			cancelModal.showModal();
		} else {
			history.back();
		}
	};
</script>

<svelte:head>
	<title>Create Post</title>
</svelte:head>

<header class="sticky top-0 z-10 bg-base-100 shadow-sm">
	<div class="flex items-center gap-2 p-2 sm:p-3">
		<button onclick={handlePublish} class="btn btn-circle btn-sm sm:btn-md btn-primary" title="Publish">
			<FluentEmojiFloppyDisk class="text-xl sm:text-2xl" />
		</button>

		{#if editorComponent}
			<button class="btn btn-circle btn-sm sm:btn-md" onclick={() => editorComponent.undo()} title="Undo">
				<FluentArrowHookUpLeft20Regular class="w-5 h-5" />
			</button>
			<button class="btn btn-circle btn-sm sm:btn-md" onclick={() => editorComponent.redo()} title="Redo">
				<FluentArrowHookUpRight20Regular class="w-5 h-5" />
			</button>
		{/if}

		<button onclick={handleCancel} class="btn btn-circle btn-sm sm:btn-md btn-ghost ml-auto" title="Cancel">
			<MdiWindowClose class="w-5 h-5" />
		</button>
	</div>
	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

<main class="container mx-auto px-2 sm:px-4 py-4 max-w-4xl">
	<!-- Title Input -->
	<input
		class="input input-bordered w-full text-lg sm:text-2xl font-bold mb-4"
		placeholder="Enter your title..."
		type="text"
		bind:value={title}
		maxlength="200"
	/>

	<!-- Character Count -->
	<div class="text-xs sm:text-sm text-gray-500 mb-4 text-right">
		{title.length}/200 characters
	</div>

	<!-- Editor -->
	<div class="bg-base-100 rounded-lg shadow-sm min-h-[50vh]">
		<WysiwygEditor bind:this={editorComponent} placeholder="Start writing your article..." />
	</div>
</main>

<!-- Publish Modal -->
<dialog class="modal" bind:this={publishModal}>
	<div class="modal-box w-11/12 max-w-md">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<MdiWindowClose />
			</button>
		</form>

		<h3 class="font-bold text-lg mb-4">Ready to publish?</h3>

		<form
			method="POST"
			action="?/publish"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			<input type="hidden" name="title" value={title} />
			<input type="hidden" name="content" value={editorComponent?.getContent() || ""} />

			<!-- Preview -->
			<div class="bg-base-200 p-3 rounded-lg mb-4">
				<p class="text-sm font-semibold line-clamp-2">{title || "Untitled"}</p>
			</div>

			{#if data.newspapers.length > 0}
				<label class="form-control w-full mb-4">
					<div class="label">
						<span class="label-text">Publish as</span>
					</div>
					<select class="select select-bordered w-full" name="newspaperId" bind:value={selectedNewspaperId}>
						<option value="">Personal Post</option>
						{#each data.newspapers as newspaper}
							<option value={newspaper.id}>
								{newspaper.name}
								{#if newspaper.rank === "owner"}
									<span class="badge badge-primary badge-xs">Owner</span>
								{:else if newspaper.rank === "editor"}
									<span class="badge badge-secondary badge-xs">Editor</span>
								{/if}
							</option>
						{/each}
					</select>
				</label>

				{#if selectedNewspaperId}
					{@const selectedNewspaper = data.newspapers.find((n) => n.id === parseInt(selectedNewspaperId))}
					{#if selectedNewspaper}
						<div class="alert alert-info mb-4">
							<FluentEmojiRolledUpNewspaper class="w-6 h-6" />
							<div class="text-sm">
								Publishing to <strong>{selectedNewspaper.name}</strong>
							</div>
						</div>
					{/if}
				{/if}
			{/if}

			<button class="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
				{isSubmitting ? "Publishing..." : "Publish Article"}
			</button>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<!-- Cancel Modal -->
<dialog class="modal" bind:this={cancelModal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
				<MdiWindowClose />
			</button>
		</form>

		<h3 class="font-bold text-lg">Discard changes?</h3>
		<p class="py-4">Your unsaved work will be lost.</p>

		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Keep Editing</button>
			</form>
			<button class="btn btn-error" onclick={() => history.back()}> Discard </button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
