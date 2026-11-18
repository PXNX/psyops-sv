<!-- src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { superForm } from "sveltekit-superforms";
	import { valibot } from "sveltekit-superforms/adapters";
	import WysiwygEditor from "#lib/component/WysiwygEditor.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import PostEditor from "#lib/component/press/PostEditor.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { toast } from "#lib/ui/toast.svelte.js";
	import { editArticleSchema } from "./schema";

	const { data } = $props();

	const form = superForm(data.form, {
		validators: valibot(editArticleSchema),
		dataType: "json",
		onUpdated: ({ form }) => {
			if (!form.valid) {
				const firstError = Object.values(form.errors).flat()[0];
				toast.error(typeof firstError === "string" ? firstError : "Please check the headline and text.");
			}
		},
		onError: () => {
			toast.error("Couldn't save your changes. Please try again.");
		}
	});

	const { form: formData, enhance, errors, submitting } = form;

	const original = { title: data.form.data.title, content: data.form.data.content || "" };
	let editorComponent = $state<WysiwygEditor | null>(null);
	let content = $state(original.content);
	let isCancelModalOpen = $state(false);

	const hasChanges = $derived($formData.title !== original.title || content !== original.content);

	const handleSave = () => {
		$formData.content = editorComponent?.getContent() ?? content;
		form.submit();
	};

	const handleCancel = () => {
		if (hasChanges) isCancelModalOpen = true;
		else goto(`/posts/${data.articleId}`);
	};
</script>

<svelte:head>
	<title>Edit post · PsyOps</title>
</svelte:head>

<!-- Superforms posts $formData (JSON) through this form. -->
<form method="POST" action="?/publish" use:enhance hidden></form>

<PostEditor
	bind:title={$formData.title}
	bind:content
	bind:editor={editorComponent}
	initialContent={original.content}
	actionLabel="Save"
	onAction={handleSave}
	onCancel={handleCancel}
	actionDisabled={!hasChanges || !$formData.title.trim()}
	disabled={$submitting}
	titleError={$errors.title?.[0] ?? null}
	contentError={$errors.content?.[0] ?? null}
/>

<!-- Discard -->
<Modal bind:open={isCancelModalOpen} title="Discard your changes?" size="small">
	<div class="flex gap-2 justify-end">
		<Button variant="secondary" size="sm" onclick={() => (isCancelModalOpen = false)}>Keep editing</Button>
		<Button variant="soft-red" size="sm" onclick={() => goto(`/posts/${data.articleId}`)}>Discard</Button>
	</div>
</Modal>
