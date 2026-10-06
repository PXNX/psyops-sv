<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createBlocSchema } from "./schema";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, buttonClass } from "#lib/component/ui/index.js";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createBlocSchema),
		multipleSubmits: "prevent"
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" },
		{ name: "Yellow", value: "#eab308" },
		{ name: "Indigo", value: "#6366f1" },
		{ name: "Teal", value: "#14b8a6" },
		{ name: "Amber", value: "#f59e0b" }
	];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			cropImageUrl = objectUrl;
			showCropper = true;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			cropImageUrl = objectUrl;
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

	function handleCropComplete(croppedDataUrl: string) {
		showCropper = false;
		if (cropImageUrl) {
			URL.revokeObjectURL(cropImageUrl);
			cropImageUrl = null;
		}
		fetch(croppedDataUrl)
			.then((r) => r.blob())
			.then((blob) => {
				const croppedFile = new File([blob], "bloc-logo.png", { type: "image/png" });
				$form.logo = croppedFile;
				if (previewUrl) URL.revokeObjectURL(previewUrl);
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

	function clearImage() {
		if ($submitting) return;

		$form.logo = undefined;

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}

		if (fileInput) {
			fileInput.value = "";
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-all duration-200 active:scale-[0.98]",
			dragActive
				? "border-[#e6a527] bg-[#e6a527]/10"
				: previewUrl
					? "border-[#8fae88]/50 bg-[#587252]/10"
					: "border-[#e6a527]/30",
			!$submitting && !previewUrl ? "hover:border-[#e6a527]/50 hover:bg-[#e6a527]/10" : "",
			$submitting || data.onCooldown ? "opacity-50" : "",
			$errors.logo ? "input-error" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<PageContainer maxWidth="3xl">
	<PageHeader
		title="Create New Bloc"
		subtitle="Found a political-military alliance"
		icon={FluentFlag20Filled}
		backHref="/bloc"
		backLabel="Blocs"
	/>

	{#if data.onCooldown}
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-4 flex items-center gap-3">
			<p class="text-[#f7c56b] text-sm font-medium">
				⏰ You must wait {data.timeRemaining} hours before creating, joining, or leaving a bloc.
			</p>
		</div>
	{/if}

	{#if $message}
		<div
			class="rounded-sm p-4 flex items-center gap-3 border {$message.includes('success')
				? 'bg-[#587252]/18 border-[#8fae88]/30 text-[#c6dfbf]'
				: 'bg-red-600/10 border-red-500/30 text-red-300'}"
		>
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="section-title">Bloc Details</h2>
			</div>

			<div>
				<label for="name" class="field-label">
					Bloc Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Eastern Defense Alliance"
					maxlength="100"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					class:input-error={$errors.name}
					disabled={$submitting || data.onCooldown}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
				{/if}
			</div>
		</div>

		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="section-title">Bloc Logo</h2>
			</div>

			<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
				<input
					bind:this={fileInput}
					type="file"
					id="logo"
					name="logo"
					accept="image/*"
					class="hidden"
					onchange={handleFileSelect}
					disabled={$submitting || data.onCooldown}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting || data.onCooldown}
					class={dropzoneClass}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#e6a527]/15 p-3 transition-colors group-hover:bg-[#e6a527]/20">
								<FluentImage20Filled class="size-8 text-[#f7c56b]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#fff7e8]">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload bloc logo
									{/if}
								</p>
								{#if !$submitting}
									<p class="mt-1 text-sm text-[#a89e8e]">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-[#102239]/70">
								<img src={previewUrl} alt="Bloc logo preview" class="size-24 object-contain rounded-sm" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#0c1929]/60 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-[#fff7e8]">Tap to change</p>
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
							<div class="border-t border-[#dfceb0]/15 p-3 bg-[#102239]/70">
								<p class="truncate text-sm font-medium text-[#fff7e8]" title={$form.logo.name}>
									{$form.logo.name}
								</p>
								<p class="text-xs text-[#a89e8e]">
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
				<p class="field-hint">Optional • Will be converted to 96x96 WebP • Max 5MB</p>
			{/if}
		</div>

		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="section-title">Bloc Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-sm transition-all hover:brightness-110"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-[#fff7e8]={$form.color === color.value}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting || data.onCooldown}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-[#d9ccb7]">Custom:</label>
				<input
					type="color"
					id="color"
					name="color"
					bind:value={$form.color}
					class="field-control h-10 w-20 rounded-sm cursor-pointer"
					disabled={$submitting || data.onCooldown}
				/>
				<span class="text-sm text-[#a89e8e]">{$form.color}</span>
			</div>

			<!-- Preview -->
			<div class="p-4 rounded-sm mt-4" style="background-color: {$form.color}20; border: 2px solid {$form.color}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-sm flex items-center justify-center" style="background-color: {$form.color}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentFlag20Filled class="size-6 text-[#fff7e8]" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-[#fff7e8]">{$form.name || "Your Bloc Name"}</p>
						<p class="text-sm" style="color: {$form.color}">Political-Military Alliance</p>
					</div>
				</div>
			</div>
		</div>

		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="section-title">Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe the bloc's purpose, values, and strategic objectives..."
				class="field-control rounded-sm px-3 py-2.5 w-full"
				disabled={$submitting || data.onCooldown}></textarea>
		</div>

		<Button
			type="submit"
			block
			disabled={$submitting || data.onCooldown}
			loading={$delayed}
			loadingText="Creating..."
			icon={FluentCheckmark20Filled}
		>
			Create Bloc
		</Button>
	</form>
</PageContainer>

{#if showCropper && cropImageUrl}
	<ImageCropper
		imageUrl={cropImageUrl}
		aspectRatio={1}
		title="Crop Bloc Logo"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
