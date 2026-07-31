<!-- src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import FluentSave20Filled from "~icons/fluent/save-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import WysiwygEditor from "$lib/component/WysiwygEditor.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import { superForm } from "sveltekit-superforms";
	import { valibot } from "sveltekit-superforms/adapters";
	import { editArticleSchema } from "./schema";

	const { data } = $props();

	const form = superForm(data.form, {
		validators: valibot(editArticleSchema),
		dataType: "json",
		onUpdated: ({ form }) => {
			if (!form.valid) {
				const firstError = Object.values(form.errors)[0];
				if (firstError) {
					alert(firstError[0]);
				}
			}
		}
	});

	const { form: formData, enhance, errors, delayed, submitting } = form;

	let editorComponent = $state<WysiwygEditor | null>(null);
	let isPublishModalOpen = $state(false);
	let isCancelModalOpen = $state(false);
	let initialContent = $state(data.form.data.content || "");

	const handlePublish = () => {
		const content = editorComponent?.getContent();

		if (content) {
			$formData.content = content;
		}

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
			goto("/posts/" + data.articleId);
		}
	};

	const confirmDiscard = () => {
		goto("/posts/" + data.articleId);
	};

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

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
	<!-- Editor Header -->
	<header class="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-3 sm:px-6 py-3 sm:py-4">
			<div class="flex items-center gap-2 sm:gap-3">
				<button
					onclick={handlePublish}
					class="p-2 sm:p-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 text-white transition-all"
					title="Save Changes"
					disabled={!canSave() || $submitting === true}
				>
					<FluentSave20Filled class="size-5" />
				</button>

				{#if editorComponent}
					<button
						class="p-2 sm:p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 text-slate-300 hover:text-white transition-all"
						onclick={() => editorComponent?.undo()}
						title="Undo"
						disabled={$submitting === true}
					>
						<FluentArrowHookUpLeft20Regular class="size-5" />
					</button>
					<button
						class="p-2 sm:p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 text-slate-300 hover:text-white transition-all"
						onclick={() => editorComponent?.redo()}
						title="Redo"
						disabled={$submitting === true}
					>
						<FluentArrowHookUpRight20Regular class="size-5" />
					</button>
				{/if}

				<div class="flex-1"></div>

				<span class="text-xs text-slate-500 font-mono hidden sm:inline">
					{$formData.title.length}/200
				</span>

				<button
					onclick={handleCancel}
					class="p-2 sm:p-2.5 rounded-lg bg-slate-800/60 hover:bg-red-950/40 border border-slate-600/30 hover:border-red-500/30 text-slate-300 hover:text-red-400 transition-all"
					title="Cancel"
					disabled={$submitting === true}
				>
					<FluentDismiss20Filled class="size-5" />
				</button>
			</div>
		</div>
	</header>

	<!-- Editor Content -->
	<main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<!-- Title Input -->
		<input
			class="w-full bg-transparent text-xl sm:text-3xl font-bold text-white placeholder-slate-600 border-none outline-none mb-2 tracking-wide"
			class:text-red-400={$errors.title}
			placeholder="Enter your title..."
			type="text"
			bind:value={$formData.title}
			maxlength="200"
			disabled={$submitting === true}
		/>

		{#if $errors.title}
			<div class="text-red-400 text-xs font-mono mb-3">{$errors.title[0]}</div>
		{/if}

		<div class="text-xs text-slate-600 font-mono mb-6">
			{$formData.title.length}/200 characters
		</div>

		<!-- Divider -->
		<div class="border-t border-slate-700/50 mb-6"></div>

		<!-- Editor -->
		<div class="min-h-[50vh]">
			<WysiwygEditor
				bind:this={editorComponent}
				initialContent={data.form.data.content || ""}
				placeholder="Start writing your article..."
			/>
		</div>

		{#if $errors.content}
			<div class="text-red-400 text-xs font-mono mt-3">{$errors.content[0]}</div>
		{/if}
	</main>
</div>

<!-- Save Modal -->
<Modal bind:open={isPublishModalOpen} title="Save your changes?">
	<form method="POST" action="?/publish" use:enhance>
		<input type="hidden" name="title" value={$formData.title} />
		<input type="hidden" name="content" value={editorComponent?.getContent() || ""} />

		<div class="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 mb-4">
			<p class="text-sm font-bold text-white line-clamp-2">{$formData.title}</p>
		</div>

		<button
			class="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold font-mono uppercase tracking-wide transition-all"
			type="submit"
			disabled={$submitting === true || $delayed === true}
		>
			{#if $submitting === true || $delayed === true}
				Saving...
			{:else}
				Save Changes
			{/if}
		</button>
	</form>
</Modal>

<!-- Cancel Modal -->
<Modal bind:open={isCancelModalOpen} title="Discard changes?">
	<p class="text-sm text-slate-400 mb-4">Your unsaved work will be lost.</p>

	<div class="flex gap-2 justify-end">
		<button
			class="px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-slate-300 text-sm font-mono transition-all"
			onclick={() => (isCancelModalOpen = false)}
		>
			Keep Editing
		</button>
		<button
			class="px-4 py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-sm font-mono font-bold transition-all"
			onclick={confirmDiscard}
		>
			Discard
		</button>
	</div>
</Modal>
