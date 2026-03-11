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
		EditCooldownWarning,
		EditMessage,
		EditFormActions,
		EditInfoBox
	} from "$lib/component/edit";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import ImageCropper from "$lib/component/ImageCropper.svelte";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editStateSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	// Image upload handling
	const imageUpload = useImageUpload(data.state.logoUrl);
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	$effect(() => {
		return () => imageUpload.cleanup(data.state.logoUrl);
	});

	function handleFileSelectWithCrop(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			cropImageUrl = URL.createObjectURL(file);
			showCropper = true;
		}
	}

	function handleDropWithCrop(event: DragEvent) {
		event.preventDefault();
		imageUpload.handleDragLeave();
		const file = event.dataTransfer?.files[0];
		if (file) {
			cropImageUrl = URL.createObjectURL(file);
			showCropper = true;
		}
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
				const croppedFile = new File([blob], 'state-logo.png', { type: 'image/png' });
				$form.logo = croppedFile;
				imageUpload.currentFile = croppedFile;
				if (imageUpload.previewUrl && imageUpload.previewUrl !== data.state.logoUrl) {
					URL.revokeObjectURL(imageUpload.previewUrl);
				}
				imageUpload.previewUrl = croppedDataUrl;
			});
	}

	function handleCropCancel() {
		showCropper = false;
		if (cropImageUrl) {
			URL.revokeObjectURL(cropImageUrl);
			cropImageUrl = null;
		}
		if (imageUpload.fileInput) imageUpload.fileInput.value = '';
	}

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" }
	];

	// Store initial form values
	const initialName = data.form.data.name;
	const initialBackground = data.form.data.background;

	// Track if form has changes
	const hasChanges = $derived(
		$form.name !== initialName ||
		$form.background !== initialBackground ||
		imageUpload.currentFile !== null
	);

	// Check if user has sufficient funds
	const hasSufficientFunds = $derived(
		data.editCost === undefined || data.userBalance === undefined || data.userBalance >= data.editCost
	);

	// Determine if submit should be disabled
	const submitDisabled = $derived(
		data.onCooldown || !hasSufficientFunds || !hasChanges || $submitting
	);
</script>

<EditPageLayout title="Edit State" subtitle={data.state.name} backHref="/state/{data.state.id}">
	<!-- Cooldown Warning -->
	{#if data.onCooldown && data.cooldownEndsAt}
		<EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="state" />
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
				disabled={$submitting === true || data.onCooldown}
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
				disabled={$submitting === true || data.onCooldown}
				error={$errors.logo}
				entityName="state logo"
				file={imageUpload.currentFile}
				onFileSelect={handleFileSelectWithCrop}
				onDrop={handleDropWithCrop}
				onDragOver={imageUpload.handleDragOver}
				onDragLeave={imageUpload.handleDragLeave}
				onClearImage={() => {
					imageUpload.clearImage(data.state.logoUrl);
					$form.logo = undefined;
				}}
				onClickUpload={() => imageUpload.fileInput?.click()}
				onCropComplete={handleCropComplete}
			/>
		</EditSection>

		<!-- State Color -->
		<EditSection title="State Color" icon={FluentColor20Filled}>
			<EditColorPicker
				bind:color={$form.background}
				disabled={$submitting === true || data.onCooldown}
				previewIcon={FluentGlobe20Filled}
				previewTitle={$form.name || "Your State Name"}
				previewSubtitle="Sovereign State"
				previewImageUrl={imageUpload.previewUrl}
				{colorPresets}
			/>
		</EditSection>

		<!-- Resource Requirements -->
		{#if data.editCost !== undefined && data.userBalance !== undefined}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-2">
				<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
				<EditFormActions
					cancelHref="/state/{data.state.id}"
					submitting={$submitting}
					delayed={$delayed}
					disabled={submitDisabled}
				/>
			</div>
		{:else}
			<!-- Submit -->
			<EditFormActions
				cancelHref="/state/{data.state.id}"
				submitting={$submitting}
				delayed={$delayed}
				disabled={submitDisabled}
			/>
		{/if}

		<!-- Info Box -->
		<EditInfoBox cooldownHours={24} />
	</form>
</EditPageLayout>

{#if showCropper && cropImageUrl}
	<ImageCropper
		imageUrl={cropImageUrl}
		aspectRatio={1}
		title="Crop State Logo"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
