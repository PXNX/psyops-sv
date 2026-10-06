<!-- src/routes/(authenticated)/(dock)/company/[id]/EditCompanySheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editCompanySchema } from "./schema.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import { useImageUpload } from "#lib/utils/edit/useImageUpload.svelte.js";
	import {
		EditSection,
		EditImageUpload,
		EditCooldownWarning,
		EditInsufficientFundsWarning,
		EditMessage,
		EditFormActions,
		EditInfoBox,
		EditStatCard
	} from "#lib/component/edit/index.js";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";

	let {
		open = $bindable(false),
		editForm,
		currentLogo,
		foundedAt,
		factoryCount,
		workerCount,
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
		foundedAt: string;
		factoryCount: number;
		workerCount: number;
		editCost: number;
		userBalance: number;
		canAfford: boolean;
		isOnCooldown: boolean;
		cooldownEndsAt: string | null;
		cooldownHours: number;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(editCompanySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed|wait|insufficient/i.test(form.message)) {
				open = false;
			}
		}
	});

	// Image upload handling — mirrors the previous full-page edit route exactly
	// (including routing the post-crop file back through EditImageUpload's own
	// onFileSelect/onCropComplete callbacks).
	const imageUpload = useImageUpload(currentLogo);
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	$effect(() => {
		return () => imageUpload.cleanup(currentLogo);
	});

	const canEdit = $derived(!isOnCooldown && canAfford);

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
				const croppedFile = new File([blob], "company-logo.png", { type: "image/png" });
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
</script>

<BottomSheet bind:open title="Edit Company">
	<div class="space-y-5">
		<div class="grid grid-cols-2 gap-3">
			<EditStatCard label="Factories" value={factoryCount} icon={FluentFactory20Filled} color="purple" />
			<EditStatCard label="Workers" value={workerCount} icon={FluentPeople20Filled} color="blue" />
		</div>

		<!-- Insufficient Funds Warning -->
		{#if !canAfford && !isOnCooldown}
			<EditInsufficientFundsWarning {editCost} {userBalance} />
		{/if}

		<!-- Messages -->
		<EditMessage message={$message} />

		<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-5">
			<!-- Company Name -->
			<EditSection title="Company Details" icon={FluentBuilding20Filled}>
				<div>
					<label for="name" class="field-label">
						Company Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Acme Industrial Corp"
						maxlength="50"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						class:border-red-500={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/50 characters</p>
					{/if}
				</div>
			</EditSection>

			<!-- Company Logo -->
			<EditSection title="Company Logo" icon={FluentImage20Filled}>
				<EditImageUpload
					bind:previewUrl={imageUpload.previewUrl}
					bind:dragActive={imageUpload.dragActive}
					bind:fileInputElement={imageUpload.fileInput}
					disabled={$submitting || !canEdit}
					error={$errors.logo}
					entityName="company logo"
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

			<!-- Logo Preview -->
			{#if imageUpload.previewUrl}
				<div class="panel rounded-sm p-5">
					<h3 class="text-sm font-semibold text-[#e6ddbf] mb-3">Preview</h3>
					<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-6">
						<div class="flex items-center gap-4">
							<div class="size-16 rounded-sm bg-[#0f120c] border border-[#c8b47a]/20 flex items-center justify-center">
								<img src={imageUpload.previewUrl} alt="Logo preview" class="size-14 object-contain" />
							</div>
							<div>
								<p class="font-bold text-[#f5efd8] text-xl">{$form.name || "Your Company Name"}</p>
								<p class="text-sm text-[#d3caa9]">Founded {formatDate(foundedAt)}</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Description -->
			<EditSection title="Company Description" icon={FluentDocument20Filled}>
				<textarea
					id="description"
					name="description"
					bind:value={$form.description}
					rows="4"
					placeholder="Describe your company's mission, industry, and operations..."
					class="field-control rounded-sm px-3 py-2.5 w-full"
					disabled={$submitting || !canEdit}></textarea>
				{#if $errors.description}
					<p class="field-error">{$errors.description}</p>
				{/if}
			</EditSection>

			<!-- Cost & Cooldown -->
			<div class="panel rounded-sm p-5 space-y-2">
				<ResourceRequirements costs={{ currency: editCost }} available={{ currency: userBalance }} />
				{#if isOnCooldown && cooldownEndsAt}
					<EditCooldownWarning {cooldownEndsAt} entityName="company" />
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
		title="Crop Company Logo"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
