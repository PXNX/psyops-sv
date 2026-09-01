<!-- src/routes/(authenticated)/(fullscreen)/posts/new/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSave20Filled from "~icons/fluent/save-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import WysiwygEditor from "$lib/component/WysiwygEditor.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import { SCHEMA_LIMITS } from "$lib/config/validation/schema-limits";
	import { buttonClass } from "$lib/component/ui/styles";

	const { data } = $props();

	let editorComponent = $state<WysiwygEditor | null>(null);
	let isPublishModalOpen = $state(false);
	let isCancelModalOpen = $state(false);
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

		if (title.length > SCHEMA_LIMITS.ARTICLE_TITLE_MAX) {
			alert(`Title must be ${SCHEMA_LIMITS.ARTICLE_TITLE_MAX} characters or less`);
			return;
		}

		isPublishModalOpen = true;
	};

	const handleCancel = () => {
		if (title || editorComponent?.getContent()) {
			isCancelModalOpen = true;
		} else {
			history.back();
		}
	};

	const confirmDiscard = () => {
		history.back();
	};
</script>

<svelte:head>
	<title>Create Post</title>
</svelte:head>

<div class="min-h-screen bg-[#0c1929] flex flex-col">
	<!-- Editor Header -->
	<header class="sticky top-0 z-10 border-b border-[#dfceb0]/15 bg-[#0e1d2f]/95 backdrop-blur-xl">
		<div class="w-full px-3 sm:px-6 py-3 sm:py-4">
			<div class="flex items-center gap-2 sm:gap-3">
				<button
					onclick={handlePublish}
					class="p-2 sm:p-2.5 rounded-lg bg-[#e6a527] hover:bg-[#f2b940] border border-[#f2c463] text-[#172a45] transition-all"
					title="Publish"
				>
					<FluentSave20Filled class="size-5" />
				</button>

				{#if editorComponent}
					<button
						class="p-2 sm:p-2.5 rounded-lg bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8] transition-all"
						onclick={() => editorComponent?.undo()}
						title="Undo"
					>
						<FluentArrowHookUpLeft20Regular class="size-5" />
					</button>
					<button
						class="p-2 sm:p-2.5 rounded-lg bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8] transition-all"
						onclick={() => editorComponent?.redo()}
						title="Redo"
					>
						<FluentArrowHookUpRight20Regular class="size-5" />
					</button>
				{/if}

				<div class="flex-1"></div>

				<span class="text-xs text-[#a89e8e] font-mono hidden sm:inline">
					{title.length}/{SCHEMA_LIMITS.ARTICLE_TITLE_MAX}
				</span>

				<button
					onclick={handleCancel}
					class="p-2 sm:p-2.5 rounded-lg bg-[#14283f] hover:bg-red-950/40 border border-[#dfceb0]/25 hover:border-red-500/30 text-[#e5d8c1] hover:text-red-400 transition-all"
					title="Cancel"
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
			class="w-full bg-transparent text-xl sm:text-3xl font-bold text-[#fff7e8] placeholder-[#a89e8e] border-none outline-none mb-2 tracking-wide"
			placeholder="Enter your title..."
			type="text"
			bind:value={title}
			maxlength={SCHEMA_LIMITS.ARTICLE_TITLE_MAX}
		/>

		<div class="text-xs text-[#a89e8e] font-mono mb-6">
			{title.length}/{SCHEMA_LIMITS.ARTICLE_TITLE_MAX} characters
		</div>

		<!-- Divider -->
		<div class="border-t border-[#dfceb0]/15 mb-6"></div>

		<!-- Editor -->
		<div class="min-h-[50vh]">
			<WysiwygEditor bind:this={editorComponent} placeholder="Start writing your article..." />
		</div>
	</main>
</div>

<!-- Publish Modal -->
<Modal bind:open={isPublishModalOpen} title="Ready to publish?">
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
		<div class="panel-muted rounded-sm p-3 mb-4">
			<p class="text-sm font-bold text-[#fff7e8] line-clamp-2">{title || "Untitled"}</p>
		</div>

		{#if data.newspapers.length > 0}
			<div class="mb-4">
				<label class="field-label uppercase tracking-wider">Publish as</label>
				<select class="field-control w-full rounded-sm px-3 py-2.5 text-sm" name="newspaperId" bind:value={selectedNewspaperId}>
					<option value="">Personal Post</option>
					{#each data.newspapers as newspaper}
						<option value={newspaper.id}>
							{newspaper.name}
							{#if newspaper.rank === "owner"}
								— Owner
							{:else if newspaper.rank === "editor"}
								— Editor
							{/if}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedNewspaperId}
				{@const selectedNewspaper = data.newspapers.find((n) => n.id === parseInt(selectedNewspaperId))}
				{#if selectedNewspaper}
					<div class="flex items-center gap-3 bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-3 mb-4">
						<FluentEmojiRolledUpNewspaper class="size-5 flex-shrink-0" />
						<span class="text-sm text-[#b7d0e6]">
							Publishing to <span class="font-bold">{selectedNewspaper.name}</span>
						</span>
					</div>
				{/if}
			{/if}
		{/if}

		<button
			class={buttonClass({ variant: "primary", block: true, class: "font-mono uppercase tracking-wide" })}
			type="submit"
			disabled={isSubmitting}
		>
			{isSubmitting ? "Publishing..." : "Publish Article"}
		</button>
	</form>
</Modal>

<!-- Cancel Modal -->
<Modal bind:open={isCancelModalOpen} title="Discard changes?">
	<p class="text-sm text-[#c7bda9] mb-4">Your unsaved work will be lost.</p>

	<div class="flex gap-2 justify-end">
		<button class={buttonClass({ variant: "secondary", size: "sm", class: "font-mono" })} onclick={() => (isCancelModalOpen = false)}>
			Keep Editing
		</button>
		<button class={buttonClass({ variant: "soft-red", size: "sm", class: "font-mono font-bold" })} onclick={confirmDiscard}>
			Discard
		</button>
	</div>
</Modal>
