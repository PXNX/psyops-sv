<!-- src/routes/bloc/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editBlocSchema } from "./schema";
	import { enhance as svelteEnhance } from "$app/forms";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, buttonClass } from "#lib/component/ui/index.js";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editBlocSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(data.bloc.logoUrl);
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
				if (previewUrl && previewUrl !== data.bloc.logoUrl) URL.revokeObjectURL(previewUrl);
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

		if (previewUrl && previewUrl !== data.bloc.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.bloc.logoUrl;

		if (fileInput) {
			fileInput.value = "";
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.bloc.logoUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

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

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader title="Edit Bloc" subtitle={data.bloc.name} backHref="/bloc/{data.bloc.id}" backLabel={data.bloc.name} />

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

	<!-- Basic Info Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Bloc Name -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-[#ffd35c]" />
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
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#ffd35c]" />
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
					disabled={$submitting}
				/>

				<button type="button" onclick={() => fileInput?.click()} disabled={$submitting} class={dropzoneClass}>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#f2b01e]/15 p-3 transition-colors group-hover:bg-[#f2b01e]/20">
								<FluentImage20Filled class="size-8 text-[#ffd35c]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#f5efd8]">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload bloc logo
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
								<img src={previewUrl} alt="Bloc logo preview" class="size-24 object-contain rounded-sm" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#12150f]/60 opacity-0 transition-opacity group-hover:opacity-100"
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
				<p class="field-hint">
					Upload a new logo to replace the current one • Will be converted to 96x96 WebP • Max 5MB
				</p>
			{/if}
		</div>

		<!-- Bloc Color -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-[#ffd35c]" />
				<h2 class="section-title">Bloc Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-sm transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b01e]"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-[#f5efd8]={$form.color === color.value}
						title={color.name}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-[#d3caa9]">Custom:</label>
				<input
					type="color"
					id="color"
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
			<div class="p-4 rounded-sm" style="background-color: {$form.color}20; border: 2px solid {$form.color}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-sm flex items-center justify-center" style="background-color: {$form.color}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentFlag20Filled class="size-6 text-[#f5efd8]" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-[#f5efd8]">{$form.name || "Your Bloc Name"}</p>
						<p class="text-sm" style="color: {$form.color}">Political-Military Alliance</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Visa-Free for Members -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBookCompass24Filled class="size-5 text-[#6fd14a]" />
				<h2 class="section-title">Visa Policy</h2>
			</div>

			<label class="flex items-start gap-4 cursor-pointer">
				<input
					type="checkbox"
					name="visaFreeForMembers"
					bind:checked={$form.visaFreeForMembers}
					class="toggle toggle-success mt-1"
					disabled={$submitting}
				/>
				<div>
					<span class="font-medium text-[#f5efd8]">Visa-Free Travel for Member States</span>
					<p class="text-sm text-[#a8a083] mt-1">
						When enabled, residents of member states can travel to any other member state without a visa, overriding
						individual state visa policies.
					</p>
				</div>
			</label>
		</div>

		<!-- Description -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#ffd35c]" />
				<h2 class="section-title">Bloc Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe the bloc's purpose, values, and strategic objectives..."
				class="field-control rounded-sm px-3 py-2.5 w-full"
				disabled={$submitting}></textarea>
		</div>

		<!-- Resource Requirements & Submit -->
		{#if data.editCost !== undefined && data.userBalance !== undefined}
			<div class="panel rounded-sm p-5 space-y-2">
				<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
				<div class="flex gap-3">
					<Button href="/bloc/{data.bloc.id}" variant="secondary" grow disabled={$submitting}>Cancel</Button>
					<Button
						type="submit"
						grow
						disabled={$submitting}
						loading={$delayed}
						loadingText="Saving..."
						icon={FluentCheckmark20Filled}
					>
						Save Changes
					</Button>
				</div>
			</div>
		{:else}
			<!-- Submit -->
			<div class="flex gap-3">
				<Button href="/bloc/{data.bloc.id}" variant="secondary" grow disabled={$submitting}>Cancel</Button>
				<Button
					type="submit"
					grow
					disabled={$submitting}
					loading={$delayed}
					loadingText="Saving..."
					icon={FluentCheckmark20Filled}
				>
					Save Changes
				</Button>
			</div>
		{/if}
	</form>

	<!-- Info Box -->
	<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
		<p class="text-sm text-[#b3dcff]">
			💡 <strong>Note:</strong> As a president of a member state, you can manage the bloc's name, color, description, logo,
			and recommended military units. These recommendations will be highlighted to all member states during unit training.
		</p>
	</div>
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
