<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/EditNewspaperSheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { enhance as svelteEnhance } from "$app/forms";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import { newspaperSchema } from "./schema";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { buttonClass } from "#lib/component/ui/styles.js";

	let {
		open = $bindable(false),
		editForm,
		newspaperName,
		currentLogo,
		editCost,
		userBalance,
		canAfford
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		newspaperName: string;
		currentLogo: string | null;
		editCost: number;
		userBalance: number;
		canAfford: boolean;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(newspaperSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed|insufficient/i.test(form.message)) {
				open = false;
			}
		}
	});

	let previewUrl = $state<string | null>(currentLogo);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);

	const canEdit = $derived(canAfford);

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

	function clearImage() {
		if ($submitting) return;

		$form.logo = undefined;

		if (previewUrl && previewUrl !== currentLogo) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = currentLogo;

		if (fileInput) {
			fileInput.value = "";
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

	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-colors duration-200 hover:border-[#f2b01e]/55",
			dragActive ? "border-[#f2b01e] bg-[#f2b01e]/10" : previewUrl ? "border-[#6fd14a]/60" : "border-[#c8b47a]/25",
			$submitting || !canEdit ? "opacity-50" : "",
			$errors.logo ? "border-red-500" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<BottomSheet bind:open title="Edit Newspaper">
	<div class="space-y-5">
		<!-- Insufficient Funds Warning -->
		{#if !canAfford}
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4 space-y-2">
				<div class="flex items-start gap-3">
					<FluentMoney20Filled class="size-5 text-[#ffd35c] shrink-0 mt-0.5" />
					<div class="space-y-1.5 flex-1">
						<h3 class="font-semibold text-[#ffd35c] text-sm">Insufficient Funds</h3>
						<p class="text-[#e6ddbf] text-xs leading-relaxed">
							You need <strong>{editCost.toLocaleString()}</strong> currency to edit the newspaper. You currently have
							<strong>{userBalance.toLocaleString()}</strong>.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/updateNewspaper" enctype="multipart/form-data" use:enhance class="space-y-5">
			<!-- Basic Information -->
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<FluentDocument20Filled class="size-4 text-[#5eaef5]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Basic Information</h2>
				</div>

				<div>
					<label for="edit-newspaper-name" class="field-label">
						Newspaper Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="edit-newspaper-name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., The Daily Chronicle"
						maxlength="40"
						class="field-control w-full rounded-sm px-3 py-2.5"
						class:border-red-500={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/40 characters</p>
					{/if}
				</div>

				<div>
					<label for="edit-newspaper-background" class="field-label">Background Description (Optional)</label>
					<textarea
						id="edit-newspaper-background"
						name="background"
						bind:value={$form.background}
						rows="3"
						placeholder="Describe your newspaper's mission and values..."
						class="field-control w-full rounded-sm px-3 py-2.5"
						disabled={$submitting || !canEdit}
					></textarea>
				</div>
			</div>

			<!-- Logo Upload -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentImage20Filled class="size-4 text-[#5eaef5]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Newspaper Logo</h2>
				</div>

				<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
					<input
						bind:this={fileInput}
						type="file"
						id="edit-newspaper-logo"
						name="logo"
						accept="image/*"
						class="hidden"
						onchange={handleFileSelect}
						disabled={$submitting || !canEdit}
					/>

					<button
						type="button"
						onclick={() => fileInput?.click()}
						disabled={$submitting || !canEdit}
						class={dropzoneClass}
					>
						{#if !previewUrl}
							<div class="flex min-h-[140px] flex-col items-center justify-center gap-2 p-6">
								<div class="rounded-full bg-[#2369b5]/18 border border-[#5eaef5]/30 p-3">
									<FluentImage20Filled class="size-8 text-[#5eaef5]" />
								</div>
								<div class="text-center">
									<p class="text-sm font-semibold text-[#f5efd8]">
										{#if dragActive}
											Drop logo here
										{:else if $submitting}
											Uploading...
										{:else}
											Tap to upload new logo
										{/if}
									</p>
									{#if !$submitting && canEdit}
										<p class="mt-1 text-xs text-[#a8a083]">Images only • 5MB max</p>
									{/if}
								</div>
							</div>
						{:else}
							<div class="relative">
								<div class="flex items-center justify-center p-6 bg-[#1a1f15]/70">
									<img src={previewUrl} alt="Logo preview" class="size-28 object-contain rounded-sm" />
								</div>
								<div
									class="absolute inset-0 flex items-center justify-center bg-[#12150f]/70 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<p class="text-sm font-semibold text-[#f5efd8]">Tap to change</p>
								</div>
								{#if $form.logo && canEdit}
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
						{/if}
					</button>
				</div>

				{#if $errors.logo}
					<p class="field-error">{$errors.logo}</p>
				{:else}
					<p class="field-hint">
						Upload a new logo to replace the current one • Will be converted to 96x96 WebP • Max 5MB
					</p>
				{/if}
			</div>

			<ResourceRequirements costs={{ currency: editCost }} available={{ currency: userBalance }} />

			<Button
				type="submit"
				variant="primary"
				block
				disabled={$submitting || !canEdit}
				loading={$delayed}
				loadingText="Saving..."
				icon={FluentCheckmark20Filled}
			>
				Save Changes
			</Button>
		</form>

		<!-- Success Message -->
		{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("Insufficient")}
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}

		<!-- Error Message -->
		{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("Insufficient"))}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}

		<!-- Danger Zone -->
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4 space-y-3">
			<div class="flex items-center gap-2">
				<FluentWarning20Filled class="size-4 text-red-400" />
				<h2 class="text-sm font-semibold text-red-300">Danger Zone</h2>
			</div>
			<div>
				<p class="text-xs text-[#a8a083] mb-3">
					Permanently delete this newspaper and all associated articles. This action cannot be undone.
				</p>
				<Button
					type="button"
					variant="soft-red"
					size="sm"
					icon={FluentDelete20Filled}
					onclick={() => (showDeleteModal = true)}
				>
					Delete Newspaper
				</Button>
			</div>
		</div>
	</div>
</BottomSheet>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete Newspaper?" size="default">
	<div class="space-y-4">
		<p class="text-[#d3caa9]">
			Are you sure you want to delete <strong>{newspaperName}</strong>?
		</p>
		<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 text-[#ffd35c] rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 shrink-0" />
			<p class="text-sm">
				<strong>Warning:</strong> This will permanently delete all articles and members. This action cannot be undone.
			</p>
		</div>
		<div class="flex justify-end gap-3 mt-6">
			<Button type="button" variant="ghost" onclick={() => (showDeleteModal = false)} disabled={isDeleting}>
				Cancel
			</Button>
			<form
				method="POST"
				action="?/deleteNewspaper"
				use:svelteEnhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						await update();
						isDeleting = false;
					};
				}}
			>
				<Button type="submit" variant="danger" icon={FluentDelete20Filled} loading={isDeleting}>
					Delete Newspaper
				</Button>
			</form>
		</div>
	</div>
</Modal>

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
