<!-- src/routes/(authenticated)/(dock)/newspaper/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters/valibot";
	import { newspaperSchema } from "./schema";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
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
	<PageHeader title="Found a newspaper" backHref="/newspaper" backLabel="Newspapers" />

	<!-- Success redirects to the new paper, so any message here is an error. -->
	{#if $message}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm px-4 py-3 text-sm">{$message}</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Newspaper Name -->
		<div class="panel rounded-sm p-4 sm:p-5 space-y-4">
			<h2 class="section-title">Masthead</h2>

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
					<p class="field-hint font-mono">{$form.name?.length || 0}/40</p>
				{/if}
			</div>

			<div>
				<label for="background" class="field-label">
					Tagline <span class="text-fg-muted font-normal">(optional)</span>
				</label>
				<textarea
					id="background"
					name="background"
					bind:value={$form.background}
					rows="3"
					placeholder="What your paper stands for"
					class="field-control w-full rounded-sm px-3 py-2.5"
					disabled={$submitting}></textarea>
			</div>
		</div>

		<!-- Logo Upload -->
		<div class="panel rounded-sm p-4 sm:p-5 space-y-4">
			<h2 class="section-title">Logo</h2>

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
					class="group relative w-full overflow-hidden rounded-sm border border-dashed transition-colors duration-200 {dragActive
						? 'border-friendly/70 bg-friendly-bg/10'
						: previewUrl
							? 'border-positive/40'
							: 'border-white/15'} {!$submitting && !previewUrl ? 'hover:border-friendly/55' : ''}"
					class:opacity-50={$submitting}
					class:border-red-500={$errors.logo}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<FluentImage20Filled class="size-8 text-friendly" />
							<div class="text-center">
								<p class="text-sm font-semibold text-fg">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Upload logo
									{/if}
								</p>
								{#if !$submitting}
									<p class="mt-1 font-mono text-xs text-fg-muted">PNG / JPG / WEBP · 5 MB</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6">
								<img
									loading="lazy"
									decoding="async"
									src={previewUrl}
									alt="Logo preview"
									class="size-24 object-contain rounded-sm"
								/>
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-surface-1/70 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-fg">Tap to change</p>
							</div>
						</div>
						{#if $form.logo}
							<div class="border-t border-white/10 p-3">
								<p class="truncate text-sm font-medium text-fg" title={$form.logo.name}>
									{$form.logo.name}
								</p>
								<p class="font-mono text-xs text-fg-muted">
									{Math.round($form.logo.size / 1024)} KB
								</p>
							</div>
						{/if}
					{/if}
				</button>
				{#if previewUrl && $form.logo}
					<button
						aria-label="Remove image"
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

			{#if $errors.logo}
				<p class="field-error">{$errors.logo}</p>
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
				Found newspaper
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
