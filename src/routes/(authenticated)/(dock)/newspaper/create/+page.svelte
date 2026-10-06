<!-- src/routes/(authenticated)/(dock)/newspaper/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { newspaperSchema } from "./schema";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { buttonClass } from "#lib/component/ui/styles.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(newspaperSchema),
		multipleSubmits: "prevent"
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			cropImageUrl = URL.createObjectURL(file);
			showCropper = true;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			cropImageUrl = URL.createObjectURL(file);
			showCropper = true;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function updatePreview(file: File) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if ($submitting) return;
		$form.logo = undefined;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = null;
		if (fileInput) {
			fileInput.value = "";
		}
	}

	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	function handleCropComplete(croppedDataUrl: string) {
		showCropper = false;
		if (cropImageUrl) {
			URL.revokeObjectURL(cropImageUrl);
			cropImageUrl = null;
		}
		fetch(croppedDataUrl)
			.then((r) => r.blob())
			.then((blob) => {
				const croppedFile = new File([blob], "newspaper-logo.png", { type: "image/png" });
				$form.logo = croppedFile;
				if (previewUrl && !previewUrl.startsWith("http")) URL.revokeObjectURL(previewUrl);
				previewUrl = croppedDataUrl;
			});
	}

	function handleCropCancel() {
		showCropper = false;
		if (cropImageUrl) {
			URL.revokeObjectURL(cropImageUrl);
			cropImageUrl = null;
		}
		if (fileInput) fileInput.value = "";
	}
</script>

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader
		title="Create Newspaper"
		subtitle="Start your own news publication"
		icon={FluentEmojiRolledUpNewspaper}
		backHref="/newspaper"
		backLabel="Newspapers"
	/>

	<!-- Success/Error Messages -->
	{#if $message && !$message.includes("error") && !$message.includes("failed")}
		<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	{#if $message && ($message.includes("error") || $message.includes("failed"))}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Newspaper Name -->
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentDocument20Filled class="size-5 text-[#5eaef5]" />
				Basic Information
			</h2>

			<div>
				<label for="name" class="field-label">
					Newspaper Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., The Daily Chronicle"
					maxlength="40"
					class="field-control w-full rounded-sm px-3 py-2.5"
					class:border-red-500={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint">{$form.name?.length || 0}/40 characters</p>
				{/if}
			</div>

			<div>
				<label for="background" class="field-label">Background Description (Optional)</label>
				<textarea
					id="background"
					name="background"
					bind:value={$form.background}
					rows="4"
					placeholder="Describe your newspaper's mission and values..."
					class="field-control w-full rounded-sm px-3 py-2.5"
					disabled={$submitting}></textarea>
			</div>
		</div>

		<!-- Logo Upload -->
		<div class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentImage20Filled class="size-5 text-[#5eaef5]" />
				Newspaper Logo
			</h2>

			<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
				<input
					bind:this={fileInput}
					type="file"
					id="logo"
					name="logo"
					accept="image/*"
					class="hidden"
					onchange={handleFileSelect}
					disabled={$submitting}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting}
					class="group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-colors duration-200 {dragActive
						? 'border-[#f2b01e]/70 bg-[#f2b01e]/10'
						: previewUrl
							? 'border-[#6fd14a]/40 bg-[#3f8a2a]/10'
							: 'border-[#c8b47a]/20 bg-[#1a1f15]/70'} {!$submitting && !previewUrl
						? 'hover:border-[#f2b01e]/55 hover:bg-[#2e3524]'
						: ''}"
					class:opacity-50={$submitting}
					class:border-red-500={$errors.logo}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#2369b5]/18 border border-[#5eaef5]/30 p-3">
								<FluentImage20Filled class="size-8 text-[#5eaef5]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#f5efd8]">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload newspaper logo
									{/if}
								</p>
								{#if !$submitting}
									<p class="mt-1 text-sm text-[#a8a083]">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-[#1a1f15]/70">
								<img src={previewUrl} alt="Logo preview" class="size-24 object-contain rounded-sm" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#12150f]/70 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-[#f5efd8]">Tap to change</p>
							</div>
							{#if $form.logo}
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										clearImage();
									}}
									disabled={$submitting}
									class={buttonClass({
										variant: "secondary",
										size: "sm",
										shape: "circle",
										class: "absolute top-2 right-2"
									})}
								>
									✕
								</button>
							{/if}
						</div>
						{#if $form.logo}
							<div class="border-t border-[#c8b47a]/15 p-3 bg-[#1a1f15]/70">
								<p class="truncate text-sm font-medium text-[#f5efd8]" title={$form.logo.name}>
									{$form.logo.name}
								</p>
								<p class="text-xs text-[#a8a083]">
									{Math.round($form.logo.size / 1024)} KB
								</p>
							</div>
						{/if}
					{/if}
				</button>
			</div>

			{#if $errors.logo}
				<p class="field-error">{$errors.logo}</p>
			{:else}
				<p class="field-hint">Logo will be converted to 96x96 WebP format • Max 5MB</p>
			{/if}
		</div>

		<!-- Submit Buttons -->
		<div class="flex gap-3">
			<Button href="/newspaper" variant="secondary" grow disabled={$submitting}>Cancel</Button>
			<Button
				type="submit"
				variant="primary"
				grow
				disabled={$submitting}
				loading={$delayed}
				loadingText="Creating..."
				icon={FluentCheckmark20Filled}
			>
				Create Newspaper
			</Button>
		</div>
	</form>
</PageContainer>

{#if showCropper && cropImageUrl}
	<ImageCropper
		imageUrl={cropImageUrl}
		aspectRatio={1}
		title="Crop Image"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
