<!-- src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { is } from "drizzle-orm";
	import { goto } from "$app/navigation";
	import FluentEmojiFloppyDisk from "~icons/fluent-emoji/floppy-disk";
	import MdiWindowClose from "~icons/mdi/window-close";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import WysiwygEditor from "$lib/component/WysiwygEditor.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import { onMount } from "svelte";
	import { superForm } from "sveltekit-superforms";
	import { valibot } from "sveltekit-superforms/adapters";
	import { editArticleSchema } from "./schema";
	import { redirect } from "@sveltejs/kit";

	const { data } = $props();

	const form = superForm(data.form, {
		validators: valibot(editArticleSchema),
		dataType: "json",
		onUpdated: ({ form }) => {
			// Handle validation errors
			if (!form.valid) {
				const firstError = Object.values(form.errors)[0];
				if (firstError) {
					alert(firstError[0]);
				}
			}
		}
	});

	const { form: formData, enhance, errors, delayed, submitting, allErrors } = form;

	let editorComponent = $state<WysiwygEditor | null>(null);
	let isPublishModalOpen = $state(false);
	let isCancelModalOpen = $state(false);
	let initialContent = $state("");

	const handlePublish = () => {
		const content = editorComponent?.getContent();

		if (content) {
			$formData.content = content;
		}

		// Trigger form validation
		if (!$formData.title.trim()) {
			alert("Please enter a title");
			return;
		}

		if (!content || content.trim().length < 50) {
			alert("Please write at least 50 characters of content");
			return;
		}

		if ($formData.title.length > 200) {
			alert("Title must be 200 characters or less");
			return;
		}

		isPublishModalOpen = true;
	};

	const handleCancel = () => {
		const currentContent = editorComponent?.getContent() || "";
		if ($formData.title !== data.form.data.title || currentContent !== initialContent) {
			isCancelModalOpen = true;
		} else {
			redirect(303, "/posts/" + data.articleId);
		}
	};

	const confirmDiscard = () => {
		redirect(303, "/posts/" + data.articleId);
	};

	onMount(() => {
		if (data.form.data.content) {
			initialContent = data.form.data.content;
			editorComponent?.setContent(data.form.data.content);
		}
	});

	let hasChanges = $derived(() => {
		const currentContent = editorComponent?.getContent() || "";
		return $formData.title !== data.form.data.title || currentContent !== initialContent;
	});

	let canSave = $derived(() => {
		const currentContent = editorComponent?.getContent() || "";
		return (
			$formData.title && currentContent && $formData.title.length > 0 && currentContent.length >= 50 && hasChanges()
		);
	});
</script>

<svelte:head>
	<title>Edit Post</title>
</svelte:head>

<header class="sticky top-0 z-10 bg-base-100 shadow-sm">
	<div class="flex items-center gap-2 p-2 sm:p-3">
		<button
			onclick={handlePublish}
			class="btn btn-circle btn-sm sm:btn-md btn-primary"
			title="Save Changes"
			disabled={!canSave() || $submitting === true}
		>
			<FluentEmojiFloppyDisk class="text-xl sm:text-2xl" />
		</button>

		{#if editorComponent}
			<button
				class="btn btn-circle btn-sm sm:btn-md"
				onclick={() => editorComponent?.undo()}
				title="Undo"
				disabled={$submitting === true}
			>
				<FluentArrowHookUpLeft20Regular class="w-5 h-5" />
			</button>
			<button
				class="btn btn-circle btn-sm sm:btn-md"
				onclick={() => editorComponent?.redo()}
				title="Redo"
				disabled={$submitting === true}
			>
				<FluentArrowHookUpRight20Regular class="w-5 h-5" />
			</button>
		{/if}

		<button
			onclick={handleCancel}
			class="btn btn-circle btn-sm sm:btn-md btn-ghost ml-auto"
			title="Cancel"
			disabled={$submitting === true}
		>
			<MdiWindowClose class="w-5 h-5" />
		</button>
	</div>
	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

<main class="container mx-auto px-2 sm:px-4 py-4 max-w-4xl">
	<!-- Title Input -->
	<input
		class="input input-bordered w-full text-lg sm:text-2xl font-bold mb-4"
		class:input-error={$errors.title}
		placeholder="Enter your title..."
		type="text"
		bind:value={$formData.title}
		maxlength="200"
		disabled={$submitting === true}
	/>

	{#if $errors.title}
		<div class="text-error text-sm mb-2">{$errors.title[0]}</div>
	{/if}

	<!-- Character Count -->
	<div class="text-xs sm:text-sm text-gray-500 mb-4 text-right">
		{$formData.title.length}/200 characters
	</div>

	<!-- Editor -->
	<div class="bg-base-100 rounded-lg shadow-sm min-h-[50vh]">
		<WysiwygEditor bind:this={editorComponent} placeholder="Start writing your article..." />
	</div>

	{#if $errors.content}
		<div class="text-error text-sm mt-2">{$errors.content[0]}</div>
	{/if}
</main>

<!-- Publish Modal -->
<Modal bind:open={isPublishModalOpen} title="Save your changes?">
	<form method="POST" action="?/publish" use:enhance>
		<input type="hidden" name="title" value={$formData.title} />
		<input type="hidden" name="content" value={editorComponent?.getContent() || ""} />

		<div class="bg-base-200 p-3 rounded-lg mb-4">
			<p class="text-sm font-semibold line-clamp-2">{$formData.title}</p>
		</div>

		<button class="btn btn-primary w-full" type="submit" disabled={$submitting === true || $delayed === true}>
			{#if $submitting === true || $delayed === true}
				<span class="loading loading-spinner loading-sm"></span>
				Saving...
			{:else}
				Save Changes
			{/if}
		</button>
	</form>
</Modal>

<!-- Cancel Modal -->
<Modal bind:open={isCancelModalOpen} title="Discard changes?">
	<p class="mb-4">Your unsaved work will be lost.</p>

	<div class="flex gap-2 justify-end">
		<button class="btn btn-ghost" onclick={() => (isCancelModalOpen = false)}> Keep Editing </button>
		<button class="btn btn-error" onclick={confirmDiscard}> Discard Changes </button>
	</div>
</Modal>
