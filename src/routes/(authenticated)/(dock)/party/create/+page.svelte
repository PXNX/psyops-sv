<!-- src/routes/party/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createPartySchema } from "./schema";
	import { goto } from "$app/navigation";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentEmojiBallotBoxWithBallot from "~icons/fluent-emoji/ballot-box-with-ballot";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import ImageCropper from "#lib/component/ImageCropper.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { PARTY_IDEOLOGIES } from "#lib/config/index.js";
	import { EditCooldownWarning } from "#lib/component/edit/index.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, buttonClass } from "#lib/component/ui/index.js";

	let { data } = $props();

	let showPartyAnim = $state(false);
	let pendingRedirect = $state("");

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createPartySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onResult: ({ result, cancel }) => {
			if (result.type === "redirect") {
				cancel();
				pendingRedirect = result.location;
				showPartyAnim = true;
			}
		}
	});

	let previewUrl = $state<string | null>(null);
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

	const ideologies = PARTY_IDEOLOGIES;

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
		title="Create Political Party"
		subtitle="Start your own political movement and shape the future"
		icon={FluentPeople20Filled}
		backHref="/party"
		backLabel="Parties"
	/>

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="party" />
	{/if}

	<!-- Independent Region Warning -->
	{#if data.isIndependentRegion}
		<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-[#ffd35c] shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-[#ffd35c] text-lg">Independent Region - State Formation</h3>
					<p class="text-[#d3caa9] text-sm leading-relaxed">
						{data.userRegion.name} is not part of any state. Creating a party here will automatically establish
						<strong class="text-[#f5efd8]">the State of {data.userRegion.name}</strong> with democratic governance.
					</p>
					<div class="panel-muted rounded-sm p-3 space-y-3">
						<div>
							<p class="text-[#e6ddbf] text-sm font-medium mb-2">What happens when you create this party:</p>
							<ul class="text-[#d3caa9] text-sm space-y-1 list-disc list-inside">
								<li>A new state is formed: "State of {data.userRegion.name}"</li>
								<li>Your party becomes the founding political party</li>
								<li>Other citizens can join or create competing parties</li>
							</ul>
						</div>
						<div class="border-t border-[#c8b47a]/15 pt-3">
							<p class="text-[#e6ddbf] text-sm font-semibold mb-2 flex items-center gap-2">
								<FluentEmojiBallotBoxWithBallot class="size-4" />
								Inaugural Election Schedule:
							</p>
							<ul class="text-[#d3caa9] text-sm space-y-1 list-disc list-inside">
								<li><strong>Start:</strong> 3 days after state formation</li>
								<li><strong>Duration:</strong> 2 days of voting</li>
								<li><strong>Seats:</strong> 50 parliament seats available</li>
								<li><strong>Purpose:</strong> Allows other parties time to establish themselves</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else if data.userState}
		<!-- Home (Citizenship) State Info -->
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
			<div class="flex items-center gap-3">
				<FluentLocation20Filled class="size-5 text-[#5eaef5]" />
				<div>
					<p class="text-sm text-[#b3dcff]">Your party will be created in:</p>
					<p class="font-semibold text-[#f5efd8]">{data.userState.name}</p>
					<p class="text-xs text-[#a8a083]">Based on your residence in {data.userRegion.name}</p>
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
		<!-- Party Name -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Party Details</h2>
			</div>

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
						disabled={$submitting || !canCreate}
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
						disabled={$submitting || !canCreate}
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
		</div>

		<!-- Party Logo -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Party Logo (Optional)</h2>
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
					class={[
						"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-colors duration-200",
						dragActive
							? "border-[#f2b01e] bg-[#f2b01e]/12"
							: $form.logo
								? "border-[#6fd14a]/50 bg-[#3f8a2a]/10"
								: "border-[#c8b47a]/20",
						!$submitting && !$form.logo && canCreate && "hover:border-[#f2b01e]/55 hover:bg-[#f2b01e]/10"
					]}
					class:opacity-50={$submitting || !canCreate}
					class:border-red-500={$errors.logo}
				>
					{#if !$form.logo}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-[#f2b01e]/12 p-3">
								<FluentImage20Filled class="size-8 text-[#ffd35c]" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-[#f5efd8]">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload party logo
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
								<img src={previewUrl} alt="Party logo preview" class="size-24 object-contain rounded-sm" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-[#12150f]/70 opacity-0 transition-opacity group-hover:opacity-100"
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

		<!-- Party Color -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Party Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class={[
							"size-12 rounded-sm border border-[#c8b47a]/15 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b01e]",
							$form.color === color.value && "ring-2 ring-[#f5efd8] ring-offset-2 ring-offset-[#242a1d]"
						]}
						style="background-color: {color.value}"
						class:opacity-50={!canCreate}
						title={color.name}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting || !canCreate}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-[#e6ddbf]">Custom:</label>
				<input
					type="color"
					id="color"
					name="color"
					bind:value={$form.color}
					class="h-10 w-20 rounded-sm border border-[#c8b47a]/20 bg-[#0f120c] cursor-pointer"
					disabled={$submitting || !canCreate}
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
							<FluentPeople20Filled class="size-6 text-[#f5efd8]" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-[#f5efd8]">{$form.name || "Your Party Name"}</p>
						<p class="text-sm" style="color: {$form.color}">{$form.abbreviation || "Abbreviation"}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Ideology -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuildingGovernment20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Political Alignment</h2>
			</div>

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
					disabled={$submitting || !canCreate}
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
		</div>

		<!-- Description -->
		<div class="panel rounded-sm p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-[#f2b01e]" />
				<h2 class="text-lg font-semibold text-[#f5efd8]">Party Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe your party's mission, values, and political platform..."
				class="field-control rounded-sm px-3 py-2.5 w-full"
				disabled={$submitting || !canCreate}></textarea>
		</div>

		<!-- Cost & Cooldown -->
		<ResourceRequirements costs={{ currency: data.creationCost }} available={{ currency: data.userBalance }} />

		<div class="flex items-center justify-between p-3 md:p-4 panel-muted rounded-sm">
			<div class="flex items-center gap-2">
				<FluentClock20Filled class="size-4 md:size-5 text-[#a8a083]" />
				<span class="text-xs md:text-sm text-[#a8a083]">Creation Cooldown</span>
			</div>
			<span class="font-bold text-[#f5efd8] text-base md:text-lg">
				{data.cooldownDays} days
			</span>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<Button href="/user" variant="secondary" grow disabled={$submitting}>Cancel</Button>
			<Button type="submit" variant="primary" grow disabled={$submitting || !canCreate}>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					{data.isIndependentRegion
						? "Create Party & Form State"
						: `Create Party (${data.creationCost.toLocaleString()})`}
				{/if}
			</Button>
		</div>
	</form>
</PageContainer>

{#if showPartyAnim}
	<ThreeAnimation
		variant="party"
		onComplete={() => {
			showPartyAnim = false;
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
