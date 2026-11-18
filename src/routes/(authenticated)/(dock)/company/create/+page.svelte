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
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
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
	<PageHeader title="Register a Company" icon={FluentBriefcase20Filled} backHref="/company" backLabel="Register" />

	{#if data.isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-start gap-3">
			<FluentClock20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
			<div class="min-w-0 text-sm">
				<p class="font-semibold">You can register again in {formatTimeRemaining(data.cooldownEndsAt)}</p>
				<p class="text-xs text-[#d3caa9] mt-0.5">
					From <span class="font-mono">{formatCooldownDate(data.cooldownEndsAt)}</span>
				</p>
			</div>
		</div>
	{/if}

	{#if $message}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 shrink-0" />
			<p class="text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- The application form, laid out like a registry filing -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="panel rounded-sm p-5 sm:p-7">
		<div class="text-center border-b-2 border-double border-[#c8b47a]/40 pb-3">
			<p class="text-[10px] uppercase tracking-[0.25em] text-[#a8a083]">Commercial Register · Form HR-1</p>
			<h2 class="mt-1 font-serif text-xl sm:text-2xl font-bold text-[#f5efd8]">Application for Registration</h2>
		</div>

		<div class="mt-5 grid grid-cols-[1fr_auto] gap-4 items-start">
			<!-- 1. Name -->
			<div class="min-w-0">
				<label for="name" class="field-label"><span class="font-mono text-[#a8a083]">1.</span> Company name</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g. Acme Corporation"
					maxlength="50"
					class="field-control rounded-sm px-3 py-2.5 w-full font-serif text-lg"
					class:border-red-500={$errors.name}
					disabled={$submitting || !canCreate}
				/>
				{#if $errors.name}
					<p class="field-error">{$errors.name}</p>
				{:else}
					<p class="field-hint text-right font-mono">{$form.name?.length || 0}/50</p>
				{/if}
			</div>

			<!-- 2. Seal / logo -->
			<div class="w-24 sm:w-28">
				<span class="field-label"><span class="font-mono text-[#a8a083]">2.</span> Seal</span>
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
						class="{dropzoneClass} aspect-square tap-target"
						aria-label={$form.logo ? "Change logo" : "Upload logo"}
					>
						{#if !$form.logo}
							<div class="size-full flex flex-col items-center justify-center gap-1 p-2 text-center">
								<FluentImage20Filled class="size-7 text-[#ffd35c]" />
								<span class="text-[10px] text-[#a8a083] leading-tight">
									{dragActive ? "Drop here" : "Optional"}
								</span>
							</div>
						{:else}
							<img
								decoding="async"
								src={previewUrl}
								alt="Logo preview"
								class="size-full object-contain p-1.5 animate-pop-in"
							/>
						{/if}
					</button>
					{#if $form.logo}
						<button
							type="button"
							onclick={clearImage}
							disabled={$submitting || !canCreate}
							aria-label="Remove logo"
							class={buttonClass({
								variant: "secondary",
								size: "xs",
								shape: "circle",
								class: "absolute -top-2 -right-2"
							})}
						>
							✕
						</button>
					{/if}
				</div>
			</div>
		</div>
		{#if $errors.logo}
			<p class="field-error">{$errors.logo}</p>
		{/if}

		<!-- 3. Objects -->
		<div class="mt-4">
			<label for="description" class="field-label">
				<span class="font-mono text-[#a8a083]">3.</span> Objects of the company
			</label>
			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="4"
				maxlength="500"
				placeholder="What the company does (optional)"
				class="field-control rounded-sm px-3 py-2.5 w-full"
				class:border-red-500={$errors.description}
				disabled={$submitting || !canCreate}></textarea>
			{#if $errors.description}
				<p class="field-error">{$errors.description}</p>
			{:else}
				<p class="field-hint text-right font-mono">{$form.description?.length || 0}/500</p>
			{/if}
		</div>

		<!-- Fee -->
		<div class="mt-5 pt-3 border-t border-dashed border-[#c8b47a]/25 space-y-1 text-sm">
			<div class="flex justify-between gap-3">
				<span class="text-[#d3caa9]">Registration fee</span>
				<span class="font-mono font-bold text-[#f5efd8]">{data.companyCost.toLocaleString()}</span>
			</div>
			<div class="flex justify-between gap-3 text-xs">
				<span class="text-[#a8a083]">Your wallet</span>
				<span class="font-mono {data.canAfford ? 'text-[#b9f29a]' : 'text-red-300'}">
					{data.userBalance.toLocaleString()}
				</span>
			</div>
			{#if !data.canAfford}
				<p class="field-error">Not enough money for the fee.</p>
			{/if}
		</div>

		<div class="mt-5 flex gap-3">
			<Button href="/company" variant="secondary" grow disabled={$submitting}>Cancel</Button>
			<Button
				type="submit"
				variant="primary"
				grow
				icon={FluentCheckmark20Filled}
				loading={$delayed}
				loadingText="Filing…"
				disabled={$submitting || !canCreate}
			>
				File &amp; pay
			</Button>
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
