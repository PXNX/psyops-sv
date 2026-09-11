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
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import ImageCropper from "$lib/component/ImageCropper.svelte";
	import BackLink from "$lib/component/ui/BackLink.svelte";
	import { buttonClass } from "$lib/component/ui/styles";

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
			"group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]",
			dragActive
				? "border-[#e6a527] bg-[#e6a527]/10"
				: previewUrl
					? "border-emerald-500/50 bg-emerald-500/5"
					: "border-[#e6a527]/30",
			!$submitting && !previewUrl ? "hover:border-[#e6a527]/50 hover:bg-[#e6a527]/10" : "",
			$submitting ? "opacity-50" : "",
			$errors.logo ? "input-error" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<BackLink href="/bloc/{data.bloc.id}" />
			<div>
				<h1 class="text-3xl font-bold text-[#fff7e8]">Edit Bloc</h1>
				<p class="text-[#a89e8e]">{data.bloc.name}</p>
			</div>
		</div>
	</div>

	<!-- Success Message -->
	{#if $message && !$message.includes("error") && !$message.includes("failed")}
		<div class="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
			<p class="text-emerald-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Basic Info Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Bloc Name -->
		<div class="panel rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="text-lg font-semibold text-[#fff7e8]">Bloc Details</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-[#e5d8c1] mb-2">
					Bloc Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Eastern Defense Alliance"
					maxlength="100"
					class="input w-full field-control"
					class:input-error={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-[#a89e8e] mt-1">{$form.name?.length || 0}/100 characters</p>
				{/if}
			</div>
		</div>

		<!-- Bloc Logo -->
		<div class="panel rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="text-lg font-semibold text-[#fff7e8]">Bloc Logo</h2>
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
							<div class="rounded-full bg-[#e6a527]/15 p-3 transition-transform group-hover:scale-110">
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
								<img src={previewUrl} alt="Bloc logo preview" class="size-24 object-contain rounded-lg" />
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
									class="btn absolute top-2 right-2 btn-circle btn-sm bg-[#14283f] hover:bg-[#19304b]"
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
				<p class="text-xs text-red-400">{$errors.logo}</p>
			{:else}
				<p class="text-xs text-[#a89e8e]">
					Upload a new logo to replace the current one • Will be converted to 96x96 WebP • Max 5MB
				</p>
			{/if}
		</div>

		<!-- Bloc Color -->
		<div class="panel rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="text-lg font-semibold text-[#fff7e8]">Bloc Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg transition-all hover:scale-110 focus:scale-110 focus:outline-none"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-white={$form.color === color.value}
						title={color.name}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting}
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
					class="h-10 w-20 rounded-lg border-2 border-[#dfceb0]/25 bg-[#14283f] cursor-pointer"
					disabled={$submitting}
				/>
				<span class="text-sm text-[#a89e8e]">{$form.color}</span>
			</div>

			{#if $errors.color}
				<p class="text-xs text-red-400">{$errors.color}</p>
			{/if}

			<!-- Preview -->
			<div class="p-4 rounded-lg" style="background-color: {$form.color}20; border: 2px solid {$form.color}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {$form.color}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentFlag20Filled class="size-6 text-white" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-[#fff7e8]">{$form.name || "Your Bloc Name"}</p>
						<p class="text-sm" style="color: {$form.color}">Political-Military Alliance</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Visa-Free for Members -->
		<div class="panel rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBookCompass24Filled class="size-5 text-emerald-400" />
				<h2 class="text-lg font-semibold text-[#fff7e8]">Visa Policy</h2>
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
					<span class="font-medium text-[#fff7e8]">Visa-Free Travel for Member States</span>
					<p class="text-sm text-[#a89e8e] mt-1">
						When enabled, residents of member states can travel to any other member state without a visa, overriding
						individual state visa policies.
					</p>
				</div>
			</label>
		</div>

		<!-- Description -->
		<div class="panel rounded-xl p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#f7c56b]" />
				<h2 class="text-lg font-semibold text-[#fff7e8]">Bloc Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe the bloc's purpose, values, and strategic objectives..."
				class="textarea w-full field-control"
				disabled={$submitting}></textarea>
		</div>

		<!-- Resource Requirements & Submit -->
		{#if data.editCost !== undefined && data.userBalance !== undefined}
			<div class="panel rounded-xl p-5 space-y-2">
				<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
				<div class="flex gap-3">
					<a
						href="/bloc/{data.bloc.id}"
						class={buttonClass({ variant: "secondary", grow: true })}
						class:btn-disabled={$submitting}
					>
						Cancel
					</a>
					<button type="submit" disabled={$submitting} class={buttonClass({ variant: "primary", grow: true })}>
						{#if $delayed}
							<span class="loading loading-spinner loading-sm"></span>
							Saving...
						{:else}
							<FluentCheckmark20Filled class="size-5" />
							Save Changes
						{/if}
					</button>
				</div>
			</div>
		{:else}
			<!-- Submit -->
			<div class="flex gap-3">
				<a
					href="/bloc/{data.bloc.id}"
					class={buttonClass({ variant: "secondary", grow: true })}
					class:btn-disabled={$submitting}
				>
					Cancel
				</a>
				<button type="submit" disabled={$submitting} class={buttonClass({ variant: "primary", grow: true })}>
					{#if $delayed}
						<span class="loading loading-spinner loading-sm"></span>
						Saving...
					{:else}
						<FluentCheckmark20Filled class="size-5" />
						Save Changes
					{/if}
				</button>
			</div>
		{/if}
	</form>

	<!-- Info Box -->
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<p class="text-sm text-blue-300">
			💡 <strong>Note:</strong> As a president of a member state, you can manage the bloc's name, color, description, logo,
			and recommended military units. These recommendations will be highlighted to all member states during unit training.
		</p>
	</div>
</div>

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
