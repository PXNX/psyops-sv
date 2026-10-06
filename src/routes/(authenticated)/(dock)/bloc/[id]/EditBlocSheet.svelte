<!-- src/routes/(authenticated)/(dock)/bloc/[id]/EditBlocSheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import { editBlocSchema } from "./schema.js";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { buttonClass } from "#lib/component/ui/styles.js";

	let {
		open = $bindable(false),
		editForm,
		currentLogo
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		currentLogo: string | null;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(editBlocSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed/i.test(form.message)) {
				open = false;
			}
		}
	});

	let previewUrl = $state<string | null>(currentLogo);
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
				if (previewUrl && previewUrl !== currentLogo) URL.revokeObjectURL(previewUrl);
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
		if (previewUrl && previewUrl !== currentLogo) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = currentLogo;
		if (fileInput) fileInput.value = "";
	}

	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-all duration-200 active:scale-[0.98]",
			dragActive
				? "border-[#f2b01e] bg-[#f2b01e]/10"
				: previewUrl
					? "border-[#6fd14a]/50 bg-[#3f8a2a]/10"
					: "border-[#f2b01e]/30",
			!$submitting && !previewUrl ? "hover:border-[#f2b01e]/50 hover:bg-[#f2b01e]/10" : "",
			$submitting ? "opacity-50" : "",
			$errors.logo ? "input-error" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<BottomSheet bind:open title="Edit Bloc">
	<div class="space-y-5">
		<form method="POST" action="?/updateBloc" enctype="multipart/form-data" use:enhance class="space-y-5">
			<!-- Bloc Name -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentFlag20Filled class="size-4 text-[#ffd35c]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Bloc Details</h2>
				</div>
				<div>
					<label for="edit-bloc-name" class="field-label">
						Bloc Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="edit-bloc-name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Eastern Defense Alliance"
						maxlength="100"
						class="field-control w-full rounded-sm px-3 py-2.5"
						class:border-red-500={$errors.name}
						disabled={$submitting}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>
			</div>

			<!-- Bloc Logo -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentImage20Filled class="size-4 text-[#ffd35c]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Bloc Logo</h2>
				</div>

				<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
					<input
						bind:this={fileInput}
						type="file"
						id="edit-bloc-logo"
						name="logo"
						accept="image/*"
						class="hidden"
						onchange={handleFileSelect}
						disabled={$submitting}
					/>

					<button type="button" onclick={() => fileInput?.click()} disabled={$submitting} class={dropzoneClass}>
						{#if !previewUrl}
							<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
								<div class="rounded-full bg-[#f2b01e]/15 p-3 transition-colors group-hover:bg-[#f2b01e]/20">
									<FluentImage20Filled class="size-8 text-[#ffd35c]" />
								</div>
								<div class="text-center">
									<p class="text-sm font-semibold text-[#f5efd8]">
										{#if dragActive}
											Drop logo here
										{:else if $submitting}
											Uploading...
										{:else}
											Tap to upload bloc logo
										{/if}
									</p>
									{#if !$submitting}
										<p class="mt-1 text-xs text-[#a8a083]">Images only • 5MB max</p>
									{/if}
								</div>
							</div>
						{:else}
							<div class="relative">
								<div class="flex items-center justify-center p-6 bg-[#1a1f15]/70">
									<img src={previewUrl} alt="Bloc logo preview" class="size-24 object-contain rounded-sm" />
								</div>
								<div
									class="absolute inset-0 flex items-center justify-center bg-[#12150f]/60 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<p class="text-sm font-semibold text-[#f5efd8]">Tap to change</p>
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

			<!-- Bloc Color -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentColor20Filled class="size-4 text-[#ffd35c]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Bloc Color</h2>
				</div>

				<div class="grid grid-cols-5 gap-2">
					{#each colorPresets as color}
						<button
							type="button"
							class="size-10 rounded-sm transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b01e]"
							style="background-color: {color.value}"
							class:ring-4={$form.color === color.value}
							class:ring-[#f5efd8]={$form.color === color.value}
							title={color.name}
							onclick={() => ($form.color = color.value)}
							disabled={$submitting}
						></button>
					{/each}
				</div>

				<div class="flex items-center gap-3 pt-1">
					<label for="edit-bloc-color" class="text-sm font-medium text-[#d3caa9]">Custom:</label>
					<input
						type="color"
						id="edit-bloc-color"
						name="color"
						bind:value={$form.color}
						class="field-control h-10 w-20 rounded-sm cursor-pointer"
						disabled={$submitting}
					/>
					<span class="text-sm text-[#a8a083]">{$form.color}</span>
				</div>

				{#if $errors.color}
					<p class="field-error">{$errors.color}</p>
				{/if}

				<!-- Preview -->
				<div class="p-3 rounded-sm" style="background-color: {$form.color}20; border: 2px solid {$form.color}40">
					<div class="flex items-center gap-3">
						<div class="size-10 rounded-sm flex items-center justify-center" style="background-color: {$form.color}">
							{#if previewUrl}
								<img src={previewUrl} alt="Logo preview" class="size-8 object-contain" />
							{:else}
								<FluentFlag20Filled class="size-5 text-[#f5efd8]" />
							{/if}
						</div>
						<div>
							<p class="text-sm font-semibold text-[#f5efd8]">{$form.name || "Your Bloc Name"}</p>
							<p class="text-xs" style="color: {$form.color}">Political-Military Alliance</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Visa-Free for Members -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentBookCompass24Filled class="size-4 text-[#6fd14a]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Visa Policy</h2>
				</div>

				<label class="flex items-start gap-3 cursor-pointer">
					<input
						type="checkbox"
						name="visaFreeForMembers"
						bind:checked={$form.visaFreeForMembers}
						class="toggle toggle-success mt-1"
						disabled={$submitting}
					/>
					<div>
						<span class="text-sm font-medium text-[#f5efd8]">Visa-Free Travel for Member States</span>
						<p class="text-xs text-[#a8a083] mt-1">
							When enabled, residents of member states can travel to any other member state without a visa, overriding
							individual state visa policies.
						</p>
					</div>
				</label>
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentDocument20Filled class="size-4 text-[#ffd35c]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Bloc Description</h2>
				</div>

				<textarea
					id="edit-bloc-description"
					name="description"
					bind:value={$form.description}
					rows="4"
					placeholder="Describe the bloc's purpose, values, and strategic objectives..."
					class="field-control w-full rounded-sm px-3 py-2.5"
					disabled={$submitting}
				></textarea>
			</div>

			<Button
				type="submit"
				variant="primary"
				block
				disabled={$submitting}
				loading={$delayed}
				loadingText="Saving..."
				icon={FluentCheckmark20Filled}
			>
				Save Changes
			</Button>
		</form>

		<!-- Success Message -->
		{#if $message && !$message.includes("error") && !$message.includes("failed")}
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}

		<!-- Error Message -->
		{#if $message && ($message.includes("error") || $message.includes("failed"))}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}
	</div>
</BottomSheet>

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
