<!-- src/routes/(authenticated)/(dock)/state/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editStateSchema } from "./schema";
	import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
	import {
		EditPageLayout,
		EditSection,
		EditImageUpload,
		EditColorPicker,
		EditMessage,
		EditFormActions,
		EditInfoBox
	} from "$lib/component/edit";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editStateSchema)
	});

	// Image upload handling
	const imageUpload = useImageUpload(data.state.logoUrl);

	$effect(() => {
		return () => imageUpload.cleanup(data.state.logoUrl);
	});

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" }
	];
</script>

<EditPageLayout title="Edit State" subtitle={data.state.name} backHref="/state/{data.state.id}">
	<!-- Cooldown Warning -->
	{#if data.onCooldown}
		<div class="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
			<p class="text-orange-300 text-sm">⏰ Wait {data.timeRemaining}h before editing again</p>
		</div>
	{/if}

	<!-- Messages -->
	<EditMessage message={$message} />

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- State Name -->
		<EditSection title="State Name" icon={FluentGlobe20Filled}>
			<input
				type="text"
				name="name"
				bind:value={$form.name}
				placeholder="e.g., Republic of Liberty"
				maxlength="100"
				class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
				class:input-error={$errors.name}
				disabled={$submitting || data.onCooldown}
			/>
			{#if $errors.name}
				<p class="text-xs text-red-400">{$errors.name}</p>
			{:else}
				<p class="text-xs text-gray-400">{$form.name?.length || 0}/100 characters</p>
			{/if}
		</EditSection>

		<!-- State Logo -->
		<EditSection title="State Logo" icon={FluentImage20Filled}>
			<EditImageUpload
				bind:previewUrl={imageUpload.previewUrl}
				bind:dragActive={imageUpload.dragActive}
				bind:fileInputElement={imageUpload.fileInput}
				disabled={$submitting || data.onCooldown}
				error={$errors.logo}
				entityName="state logo"
				file={imageUpload.currentFile}
				onFileSelect={(e) => {
					imageUpload.handleFileSelect(e, data.state.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDrop={(e) => {
					imageUpload.handleDrop(e, data.state.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDragOver={imageUpload.handleDragOver}
				onDragLeave={imageUpload.handleDragLeave}
				onClearImage={() => {
					imageUpload.clearImage(data.state.logoUrl);
					$form.logo = undefined;
				}}
				onClickUpload={() => imageUpload.fileInput?.click()}
			/>
		</EditSection>

		<!-- State Color -->
		<EditSection title="State Color" icon={FluentColor20Filled}>
			<EditColorPicker
				bind:color={$form.background}
				disabled={$submitting || data.onCooldown}
				previewIcon={FluentGlobe20Filled}
				previewTitle={$form.name || "Your State Name"}
				previewSubtitle="Sovereign State"
				previewImageUrl={imageUpload.previewUrl}
				{colorPresets}
			/>
		</EditSection>

		<!-- Submit -->
		<EditFormActions
			cancelHref="/state/{data.state.id}"
			{submitting}
			{delayed}
			disabled={data.onCooldown}
		/>

		<!-- Info Box -->
		<EditInfoBox message="Changes have a 24-hour cooldown to prevent frequent modifications." />
	</form>
</EditPageLayout>
