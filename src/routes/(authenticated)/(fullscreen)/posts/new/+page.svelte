<!-- src/routes/(authenticated)/(fullscreen)/posts/new/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import WysiwygEditor from "#lib/component/WysiwygEditor.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import PostEditor from "#lib/component/press/PostEditor.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { SCHEMA_LIMITS } from "#lib/config/validation/schema-limits.js";
	import { toast, toastResult } from "#lib/ui/toast.svelte.js";

	const { data } = $props();

	let editorComponent = $state<WysiwygEditor | null>(null);
	let isPublishModalOpen = $state(false);
	let isCancelModalOpen = $state(false);
	let title = $state("");
	let content = $state("");
	// "Write" on a newspaper's front page links here with ?newspaper=<id>.
	const requested = page.url.searchParams.get("newspaper") ?? "";
	let selectedNewspaperId = $state(data.newspapers.some((n) => String(n.id) === requested) ? requested : "");
	let isSubmitting = $state(false);

	const rankLabel = { owner: "Publisher", editor: "Editor", author: "Writer" } as const;
	const publishOptions = $derived([
		{ id: "", name: "Personal post", logo: null as string | null, rank: null as keyof typeof rankLabel | null },
		...data.newspapers.map((n) => ({ id: String(n.id), name: n.name, logo: n.logo, rank: n.rank }))
	]);

	const handlePublish = () => {
		content = editorComponent?.getContent() ?? content;

		if (!title.trim()) {
			toast.error("Please enter a headline");
			return;
		}
		if (content.trim().length < SCHEMA_LIMITS.MIN_CONTENT_LENGTH) {
			toast.error(`Please write at least ${SCHEMA_LIMITS.MIN_CONTENT_LENGTH} characters of content`);
			return;
		}
		if (title.length > SCHEMA_LIMITS.ARTICLE_TITLE_MAX) {
			toast.error(`Headline must be ${SCHEMA_LIMITS.ARTICLE_TITLE_MAX} characters or less`);
			return;
		}

		isPublishModalOpen = true;
	};

	const handleCancel = () => {
		if (title.trim() || editorComponent?.getContent().replace(/<[^>]*>/g, "").trim()) {
			isCancelModalOpen = true;
		} else {
			history.back();
		}
	};
</script>

<svelte:head>
	<title>New post · PsyOps</title>
</svelte:head>

<PostEditor
	bind:title
	bind:content
	bind:editor={editorComponent}
	actionLabel="Publish"
	onAction={handlePublish}
	onCancel={handleCancel}
	disabled={isSubmitting}
/>

<!-- Publish -->
<Modal bind:open={isPublishModalOpen} title="Publish">
	<form
		method="POST"
		action="?/publish"
		class="space-y-4"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				toastResult(result);
				await update();
				isSubmitting = false;
			};
		}}
	>
		<input type="hidden" name="title" value={title} />
		<input type="hidden" name="content" value={content} />

		<p class="font-serif text-xl leading-tight text-fg break-words">{title}</p>

		{#if data.newspapers.length > 0}
			<fieldset class="space-y-2">
				<legend class="field-label">Publish as</legend>
				{#each publishOptions as option (option.id)}
					<label
						class="flex items-center gap-3 rounded-sm border px-3 py-2 cursor-pointer transition-colors {selectedNewspaperId ===
						option.id
							? 'border-friendly/50 bg-friendly-bg/15'
							: 'border-white/10 hover:border-white/20'}"
					>
						<input
							type="radio"
							name="newspaperId"
							value={option.id}
							bind:group={selectedNewspaperId}
							class="sr-only"
						/>
						{#if option.id}
							<Logo
								src={option.logo}
								alt=""
								class="size-8 shrink-0 rounded-sm"
								placeholderIcon={MdiNewspaper}
								placeholderGradient="from-surface-6 to-surface-6"
							/>
						{:else}
							<span class="size-8 shrink-0 rounded-sm border border-white/10 flex items-center justify-center">
								<FluentPerson20Filled class="size-4 text-fg-soft" />
							</span>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-semibold text-fg truncate">{option.name}</span>
							{#if option.rank}
								<span class="block text-xs text-fg-muted">{rankLabel[option.rank]}</span>
							{/if}
						</span>
						{#if selectedNewspaperId === option.id}
							<FluentCheckmarkCircle20Filled class="size-5 shrink-0 text-friendly" />
						{/if}
					</label>
				{/each}
			</fieldset>
		{/if}

		<Button type="submit" variant="primary" block loading={isSubmitting} loadingText="Publishing…">Publish</Button>
	</form>
</Modal>

<!-- Discard -->
<Modal bind:open={isCancelModalOpen} title="Discard this draft?" size="small">
	<div class="flex gap-2 justify-end">
		<Button variant="secondary" size="sm" onclick={() => (isCancelModalOpen = false)}>Keep writing</Button>
		<Button variant="soft-red" size="sm" onclick={() => history.back()}>Discard</Button>
	</div>
</Modal>
