<!-- src/routes/(authenticated)/(dock)/state/[id]/EditStateSheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editStateSchema } from "./schema";
	import { useImageUpload } from "#lib/utils/edit/useImageUpload.svelte.js";
	import { EditSection, EditImageUpload, EditColorPicker, EditCooldownWarning, EditMessage, EditFormActions } from "#lib/component/edit/index.js";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";

	let {
		open = $bindable(false),
		editForm,
		stateName,
		logoUrl,
		onCooldown,
		cooldownEndsAt
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		stateName: string;
		logoUrl: string | null;
		onCooldown: boolean;
		cooldownEndsAt: string | null;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(editStateSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && !form.message) {
				open = false;
			}
		}
	});

	const imageUpload = useImageUpload(logoUrl);
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

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
				const croppedFile = new File([blob], "state-logo.png", { type: "image/png" });
				$form.logo = croppedFile;
				imageUpload.currentFile = croppedFile;
				if (imageUpload.previewUrl && imageUpload.previewUrl !== logoUrl) {
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
		if (imageUpload.fileInput) imageUpload.fileInput.value = "";
	}

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" }
	];

	const initialName = editForm.data.name;
	const initialBackground = editForm.data.background;

	const hasChanges = $derived(
		$form.name !== initialName || $form.background !== initialBackground || imageUpload.currentFile !== null
	);

	const submitDisabled = $derived(onCooldown || !hasChanges || $submitting);
</script>

<BottomSheet bind:open title="Edit State">
	<div class="space-y-5">
		<EditMessage message={$message} />

		<form method="POST" action="?/updateState" enctype="multipart/form-data" use:enhance class="space-y-5">
			<EditSection title="State Name" icon={FluentGlobe20Filled}>
				<input
					type="text"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Republic of Liberty"
					maxlength="100"
					class="field-control w-full rounded-sm px-3 py-2"
					class:input-error={$errors.name}
					disabled={$submitting === true || onCooldown}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
				{/if}
			</EditSection>

			<EditSection title="State Logo" icon={FluentImage20Filled}>
				<EditImageUpload
					bind:previewUrl={imageUpload.previewUrl}
					bind:dragActive={imageUpload.dragActive}
					bind:fileInputElement={imageUpload.fileInput}
					disabled={$submitting === true || onCooldown}
					error={$errors.logo}
					entityName="state logo"
					file={imageUpload.currentFile}
					onFileSelect={handleFileSelectWithCrop}
					onDrop={handleDropWithCrop}
					onDragOver={imageUpload.handleDragOver}
					onDragLeave={imageUpload.handleDragLeave}
					onClearImage={() => {
						imageUpload.clearImage(logoUrl);
						$form.logo = undefined;
					}}
					onClickUpload={() => imageUpload.fileInput?.click()}
					onCropComplete={handleCropComplete}
				/>
			</EditSection>

			<EditSection title="State Color" icon={FluentColor20Filled}>
				<EditColorPicker
					bind:color={$form.background}
					disabled={$submitting === true || onCooldown}
					previewIcon={FluentGlobe20Filled}
					previewTitle={$form.name || stateName}
					previewSubtitle="Sovereign State"
					previewImageUrl={imageUpload.previewUrl}
					{colorPresets}
				/>
			</EditSection>

			{#if onCooldown && cooldownEndsAt}
				<EditCooldownWarning {cooldownEndsAt} entityName="state" />
			{/if}

			<EditFormActions
				onCancel={() => (open = false)}
				submitting={$submitting}
				delayed={$delayed}
				disabled={submitDisabled}
			/>
		</form>
	</div>
</BottomSheet>

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
