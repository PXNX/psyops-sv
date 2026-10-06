<!-- src/routes/company/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createCompanySchema } from "./schema";
	import { goto } from "$app/navigation";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { buttonClass } from "#lib/component/ui/styles.js";
	import Button from "#lib/component/ui/Button.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	let { data } = $props();

	let showCompanyAnim = $state(false);
	let pendingRedirect = $state("");

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createCompanySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onResult: ({ result, cancel }) => {
			if (result.type === "redirect") {
				cancel();
				pendingRedirect = result.location;
				showCompanyAnim = true;
			}
		}
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	// Calculate time remaining for cooldown
	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) {
			return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
		} else if (hours > 0) {
			return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		const d = new Date(cooldownEnd);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

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

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const canCreate = !data.isOnCooldown && data.canAfford;

	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-colors duration-200",
			dragActive
				? "border-[#f2b01e] bg-[#f2b01e]/12"
				: $form.logo
					? "border-[#6fd14a]/50 bg-[#3f8a2a]/10"
					: "border-[#c8b47a]/20",
			!$submitting && !$form.logo && canCreate ? "hover:border-[#f2b01e]/55 hover:bg-[#f2b01e]/10" : "",
			$submitting || !canCreate ? "opacity-50" : "",
			$errors.logo ? "border-red-500" : ""
		]
			.filter(Boolean)
			.join(" ")
	);

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

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader
		title="Create Company"
		subtitle="Establish your business empire"
		icon={FluentBriefcase20Filled}
		backHref="/company"
		backLabel="Companies"
	/>

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Company Creation Cooldown Active</h3>
					<p class="text-[#d3caa9] text-sm leading-relaxed">
						You must wait before creating another company. This cooldown period helps maintain economic stability.
					</p>
					<div class="panel-muted rounded-sm p-3 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[#e6ddbf] text-sm font-medium">Time Remaining:</span>
							<span class="text-red-300 text-sm font-bold font-mono">{formatTimeRemaining(data.cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-[#a8a083]">Available on:</span>
							<span class="text-[#d3caa9]">{formatCooldownDate(data.cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Company Name -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBriefcase20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Company Details</h2>
			</div>

			<div>
				<label for="name" class="field-label">
					Company Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Acme Corporation"
					maxlength="50"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					class:border-red-500={$errors.name}
					disabled={$submitting || !canCreate}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint">{$form.name?.length || 0}/50 characters</p>
				{/if}
			</div>
		</div>

		<!-- Company Logo -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Company Logo (Optional)</h2>
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
					disabled={$submitting || !canCreate}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting || !canCreate}
					class={dropzoneClass}
				>
					{#if !$form.logo}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#f2b01e]/15 p-3">
								<FluentImage20Filled class="size-8 text-[#ffd35c]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#f5efd8]">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload company logo
									{/if}
								</p>
								{#if !$submitting && canCreate}
									<p class="mt-1 text-sm text-[#a8a083]">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-[#1a1f15]/70">
								<img src={previewUrl} alt="Company logo preview" class="size-24 object-contain rounded-sm" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#12150f]/60 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-[#f5efd8]">Tap to change</p>
							</div>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									clearImage();
								}}
								disabled={$submitting || !canCreate}
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
				<p class="field-hint">Will be converted to 96x96 WebP • Max 5MB</p>
			{/if}
		</div>

		<!-- Description -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Company Description (Optional)</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="5"
				maxlength="500"
				placeholder="Describe your company's mission, vision, and business focus..."
				class="field-control rounded-sm px-3 py-2.5 w-full"
				class:border-red-500={$errors.description}
				disabled={$submitting || !canCreate}></textarea>
			{#if $errors.description}
				<p class="field-error">{$errors.description}</p>
			{:else}
				<p class="field-hint">{$form.description?.length || 0}/500 characters</p>
			{/if}
		</div>

		<!-- Cost -->
		<ResourceRequirements costs={{ currency: data.companyCost }} available={{ currency: data.userBalance }} />

		<!-- Submit -->
		<div class="flex gap-3">
			<Button href="/production" variant="secondary" grow disabled={$submitting}>Cancel</Button>
			<Button type="submit" variant="primary" grow disabled={$submitting || !canCreate}>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Create Company ({data.companyCost.toLocaleString()})
				{/if}
			</Button>
		</div>

		<!-- Info Box -->
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4 space-y-2">
			<p class="text-sm text-[#b3dcff]">
				💡 <strong>Note:</strong>
				Once created, you will own this company and can build factories to produce goods and resources.
			</p>
			<p class="text-xs text-[#b3dcff]/70">
				<strong>Cooldown:</strong> After creating a company, you must wait {data.cooldownDays} days before creating another
				one.
			</p>
		</div>
	</form>
</PageContainer>

{#if showCompanyAnim}
	<ThreeAnimation
		variant="company"
		onComplete={() => {
			showCompanyAnim = false;
			if (pendingRedirect) goto(pendingRedirect);
		}}
	/>
{/if}

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
