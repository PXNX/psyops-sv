<!-- src/routes/(authenticated)/(fullscreen)/welcome/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProfileSchema } from "./schema";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import PsyopsLogo from "#lib/assets/logo.svg";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import { buttonClass } from "#lib/component/ui/styles.js";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createProfileSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	const politicalViewsOptions = [
		"Liberal",
		"Conservative",
		"Socialist",
		"Libertarian",
		"Progressive",
		"Centrist",
		"Nationalist",
		"Green",
		"Social Democrat",
		"Other"
	];

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

	const uploadBoxClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-colors duration-200",
			$errors.logo
				? "border-red-500/50"
				: dragActive
					? "border-[#f2b01e] bg-[#f2b01e]/10"
					: $form.logo
						? "border-[#3f8a2a]/60 bg-[#3f8a2a]/5"
						: `border-[#f2b01e]/30${$submitting ? "" : " hover:border-[#f2b01e]/50 hover:bg-[#f2b01e]/10"}`,
			$submitting ? "opacity-50" : ""
		]
			.filter(Boolean)
			.join(" ")
	);

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
			previewUrl = null;
		}

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
				const croppedFile = new File([blob], "profile-picture.png", { type: "image/png" });
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

<div class="w-full max-w-2xl mx-auto space-y-6">
	<!-- Header -->
	<div class="text-center space-y-3">
		<div class="flex justify-center">
			<div class="size-16 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm flex items-center justify-center">
				<PsyopsLogo class="size-10 text-[#c08cf0]" />
			</div>
		</div>
		<h1 class="text-3xl font-bold text-[#f5efd8]">Complete Your Profile</h1>
		<p class="text-[#d3caa9] max-w-md mx-auto">Tell us about yourself to get started in PsyOps</p>
	</div>

	<!-- Error Message -->
	{#if $message}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Profile Picture -->
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">Profile Picture (Optional)</h2>
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
					disabled={$submitting}
				/>

				<button type="button" onclick={() => fileInput?.click()} disabled={$submitting} class={uploadBoxClass}>
					{#if !$form.logo}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#f2b01e]/12 border border-[#f2b01e]/35 p-3">
								<FluentPerson20Filled class="size-8 text-[#ffd35c]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#f5efd8]">
									{#if dragActive}
										Drop image here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload logo
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
								<img src={previewUrl} alt="Logo preview" class="size-32 object-cover rounded-full" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#12150f]/70 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-[#f5efd8]">Tap to change</p>
							</div>
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
						</div>
						<div class="border-t border-[#c8b47a]/15 p-3 bg-[#1a1f15]/70">
							<p class="truncate text-sm font-medium text-[#f5efd8]" title={$form.logo.name}>
								{$form.logo.name}
							</p>
							<p class="text-xs text-[#a8a083]">
								{Math.round($form.logo.size / 1024)} KB
							</p>
						</div>
					{/if}
				</button>
			</div>

			{#if $errors.logo}
				<p class="field-error">{$errors.logo}</p>
			{:else}
				<p class="field-hint">Will be converted to 128x128 WebP</p>
			{/if}
		</div>

		<!-- Username -->
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentPerson20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">Your Identity</h2>
			</div>

			<div>
				<label for="name" class="field-label">
					Username <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="Enter your username"
					maxlength="50"
					class="field-control w-full rounded-sm px-3 py-2.5"
					class:border-red-500={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint">{$form.name?.length || 0}/50 characters</p>
				{/if}
			</div>
		</div>

		<!-- Political Views -->
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentBuildingGovernment20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">Political Alignment (Optional)</h2>
			</div>

			<div>
				<label for="politicalViews" class="field-label"> Your Political Views </label>
				<select
					id="politicalViews"
					name="politicalViews"
					bind:value={$form.politicalViews}
					class="field-control w-full rounded-sm px-3 py-2.5"
					disabled={$submitting}
				>
					<option value="">Select your political alignment...</option>
					{#each politicalViewsOptions as option}
						<option value={option.toLowerCase()}>{option}</option>
					{/each}
				</select>
				<p class="field-hint">This helps others understand your political stance</p>
			</div>
		</div>

		<!-- Bio -->
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">About You (Optional)</h2>
			</div>

			<div>
				<label for="bio" class="field-label"> Short Bio </label>
				<textarea
					id="bio"
					name="bio"
					bind:value={$form.bio}
					rows="4"
					placeholder="Tell others about yourself, your goals, and what you hope to achieve in PsyOps..."
					maxlength="500"
					class="field-control w-full rounded-sm px-3 py-2.5"
					class:border-red-500={$errors.bio}
					disabled={$submitting}></textarea>
				{#if $errors.bio}
					<p class="field-error">{$errors.bio}</p>
				{:else}
					<p class="field-hint">{$form.bio?.length || 0}/500 characters</p>
				{/if}
			</div>
		</div>

		<!-- Submit Buttons -->
		<div class="flex gap-3">
			<button type="submit" disabled={$submitting} class={buttonClass({ variant: "primary", block: true })}>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating Profile...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Create Profile
				{/if}
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4 space-y-2">
			<p class="text-sm text-[#b3dcff]">
				💡 <strong>Note:</strong> You can update your profile information later from your account settings.
			</p>
			<p class="text-xs text-[#b3dcff]/70">
				<strong>Privacy:</strong> Your email address is never displayed publicly. Only your username and chosen information
				is visible to others.
			</p>
		</div>
	</form>
</div>

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
