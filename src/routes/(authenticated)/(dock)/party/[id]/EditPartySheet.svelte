<!-- src/routes/(authenticated)/(dock)/party/[id]/EditPartySheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createPartySchema } from "../create/schema";
	import { useImageUpload } from "#lib/utils/edit/useImageUpload.svelte.js";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import {
		EditSection,
		EditImageUpload,
		EditColorPicker,
		EditCooldownWarning,
		EditInsufficientFundsWarning,
		EditMessage,
		EditFormActions,
		EditInfoBox
	} from "#lib/component/edit/index.js";
	import { PARTY_IDEOLOGIES } from "#lib/config/index.js";

	let {
		open = $bindable(false),
		editForm,
		currentLogo,
		editCost,
		userBalance,
		canAfford,
		isOnCooldown,
		cooldownEndsAt,
		cooldownHours
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		currentLogo: string | null;
		editCost: number;
		userBalance: number;
		canAfford: boolean;
		isOnCooldown: boolean;
		cooldownEndsAt: string | null;
		cooldownHours: number;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(createPartySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed|wait|insufficient/i.test(form.message)) {
				open = false;
			}
		}
	});

	// Image upload handling — mirrors the party create/edit page's cropper flow.
	const imageUpload = useImageUpload(currentLogo);
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	$effect(() => {
		return () => imageUpload.cleanup(currentLogo);
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
				const croppedFile = new File([blob], "party-logo.png", { type: "image/png" });
				$form.logo = croppedFile;
				imageUpload.currentFile = croppedFile;
				if (imageUpload.previewUrl && imageUpload.previewUrl !== currentLogo) {
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

	const ideologies = PARTY_IDEOLOGIES;

	const canEdit = $derived(!isOnCooldown && canAfford);
</script>

<BottomSheet bind:open title="Edit Party">
	<div class="space-y-5">
		<!-- Insufficient Funds Warning -->
		{#if !canAfford && !isOnCooldown}
			<EditInsufficientFundsWarning {editCost} {userBalance} />
		{/if}

		<!-- Messages -->
		<EditMessage message={$message} />

		<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-5">
			<!-- Party Name -->
			<EditSection title="Party Details" icon={FluentFlag20Filled}>
				<div class="space-y-4">
					<div>
						<label for="name" class="field-label">
							Party Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={$form.name}
							placeholder="e.g., Progressive Alliance Party"
							maxlength="100"
							class="field-control rounded-sm px-3 py-2.5 w-full"
							class:border-red-500={$errors.name}
							disabled={$submitting || !canEdit}
						/>
						{#if $errors.name}
							<p class="field-error">{$errors.name}</p>
						{:else}
							<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
						{/if}
					</div>

					<div>
						<label for="abbreviation" class="field-label"> Abbreviation (Optional) </label>
						<input
							type="text"
							id="abbreviation"
							name="abbreviation"
							bind:value={$form.abbreviation}
							placeholder="e.g., PROG"
							maxlength="4"
							class="field-control rounded-sm px-3 py-2.5 w-full"
							class:border-red-500={$errors.abbreviation}
							disabled={$submitting || !canEdit}
						/>
						{#if $errors.abbreviation}
							<p class="field-error">{$errors.abbreviation}</p>
						{:else}
							<p class="field-hint">
								{$form.abbreviation?.length || 0}/4 characters • Alphanumeric only
							</p>
						{/if}
					</div>
				</div>
			</EditSection>

			<!-- Party Logo -->
			<EditSection title="Party Logo" icon={FluentImage20Filled}>
				<EditImageUpload
					bind:previewUrl={imageUpload.previewUrl}
					bind:dragActive={imageUpload.dragActive}
					bind:fileInputElement={imageUpload.fileInput}
					disabled={$submitting || !canEdit}
					error={$errors.logo}
					entityName="party logo"
					file={imageUpload.currentFile}
					onFileSelect={handleFileSelectWithCrop}
					onDrop={handleDropWithCrop}
					onDragOver={imageUpload.handleDragOver}
					onDragLeave={imageUpload.handleDragLeave}
					onClearImage={() => {
						imageUpload.clearImage(currentLogo);
						$form.logo = undefined;
					}}
					onClickUpload={() => imageUpload.fileInput?.click()}
					onCropComplete={handleCropComplete}
				/>
			</EditSection>

			<!-- Party Color -->
			<EditSection title="Party Color" icon={FluentColor20Filled}>
				<EditColorPicker
					bind:color={$form.color}
					disabled={$submitting || !canEdit}
					error={$errors.color}
					previewIcon={FluentPeople20Filled}
					previewTitle={$form.name || "Your Party Name"}
					previewSubtitle={$form.abbreviation || "Abbreviation"}
					previewImageUrl={imageUpload.previewUrl}
				/>
			</EditSection>

			<!-- Ideology -->
			<EditSection title="Political Alignment" icon={FluentBuildingGovernment20Filled}>
				<div>
					<label for="ideology" class="field-label">
						Ideology <span class="text-red-400">*</span>
					</label>
					<select
						id="ideology"
						name="ideology"
						bind:value={$form.ideology}
						class="field-control rounded-sm px-3 py-2.5 w-full"
						class:border-red-500={$errors.ideology}
						disabled={$submitting || !canEdit}
					>
						<option value="">Select an ideology...</option>
						{#each ideologies as ideologyOption}
							<option value={ideologyOption.toLowerCase()}>{ideologyOption}</option>
						{/each}
					</select>
					{#if $errors.ideology}
						<p class="field-error">{$errors.ideology}</p>
					{/if}
				</div>
			</EditSection>

			<!-- Description -->
			<EditSection title="Party Description" icon={FluentDocument20Filled}>
				<textarea
					id="description"
					name="description"
					bind:value={$form.description}
					rows="6"
					placeholder="Describe your party's mission, values, and political platform..."
					class="field-control rounded-sm px-3 py-2.5 w-full"
					disabled={$submitting || !canEdit}
				></textarea>
			</EditSection>

			<!-- Cost & Cooldown -->
			<div class="panel rounded-sm p-5 space-y-2">
				<ResourceRequirements costs={{ currency: editCost }} available={{ currency: userBalance }} />
				{#if isOnCooldown && cooldownEndsAt}
					<EditCooldownWarning {cooldownEndsAt} entityName="party" />
				{/if}
				<EditFormActions
					onCancel={() => (open = false)}
					submitting={$submitting}
					delayed={$delayed}
					disabled={!canEdit}
				/>
			</div>

			<!-- Info Box -->
			<EditInfoBox {editCost} {cooldownHours} />
		</form>
	</div>
</BottomSheet>

{#if showCropper && cropImageUrl}
	<ImageCropper
		imageUrl={cropImageUrl}
		aspectRatio={1}
		title="Crop Party Logo"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
