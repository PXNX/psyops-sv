<!-- src/routes/(authenticated)/(dock)/user/[id]/EditProfileSheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import { updateProfileSchema } from "./schema.js";
	import BottomSheet from "$lib/component/BottomSheet.svelte";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import ImageCropper from "$lib/component/ImageCropper.svelte";
	import Button from "$lib/component/ui/Button.svelte";

	let {
		open = $bindable(false),
		editForm,
		currentLogo,
		editCost,
		userBalance,
		canAfford,
		isOnCooldown,
		cooldownEndsAt
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		currentLogo: string | null;
		editCost: number;
		userBalance: number;
		canAfford: boolean;
		isOnCooldown: boolean;
		cooldownEndsAt: string | null;
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(updateProfileSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed|wait|insufficient/i.test(form.message)) {
				open = false;
			}
		}
	});

	let previewUrl = $state<string | null>(currentLogo);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showCropper = $state(false);
	let cropImageUrl = $state<string | null>(null);

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();
		const minutes = Math.floor(diff / (1000 * 60));
		if (minutes >= 60) {
			return "1 hour";
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		return new Date(cooldownEnd).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
	}

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
				const croppedFile = new File([blob], "profile-picture.png", { type: "image/png" });
				$form.logo = croppedFile;
				if (previewUrl && previewUrl !== currentLogo) {
					URL.revokeObjectURL(previewUrl);
				}
				previewUrl = croppedDataUrl;
			});
	}

	function handleCropCancel() {
		showCropper = false;
		if (cropImageUrl) {
			URL.revokeObjectURL(cropImageUrl);
			cropImageUrl = null;
		}
		if (fileInput) {
			fileInput.value = "";
		}
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

	const canEdit = !isOnCooldown && canAfford;

	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]",
			dragActive ? "border-[#e6a527] bg-[#e6a527]/10" : previewUrl ? "border-[#8fae88]/60" : "border-[#dfceb0]/25",
			$submitting || !canEdit ? "opacity-50" : "",
			$errors.logo ? "input-error" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<BottomSheet bind:open title="Edit Profile">
	<div class="space-y-5">
		<!-- Cooldown Warning -->
		{#if isOnCooldown && cooldownEndsAt}
			<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4 space-y-2">
				<div class="flex items-start gap-3">
					<FluentClock20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
					<div class="space-y-1.5 flex-1">
						<h3 class="font-semibold text-red-300 text-sm">Profile Edit Cooldown Active</h3>
						<div class="flex items-center justify-between text-xs">
							<span class="text-red-100/90 font-medium">Time Remaining:</span>
							<span class="text-red-100 font-bold">{formatTimeRemaining(cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-red-200/70">Available on:</span>
							<span class="text-red-200/90">{formatCooldownDate(cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance class="space-y-5">
			<!-- Profile Picture -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<FluentImage20Filled class="size-4 text-[#d5c4df]" />
					<h2 class="text-sm font-semibold text-[#fff7e8]">Profile Picture</h2>
				</div>

				<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
					<input
						bind:this={fileInput}
						type="file"
						id="edit-logo"
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
								<div class="rounded-full bg-[#8c709b]/20 p-3 transition-transform group-hover:scale-110">
									<FluentImageOff20Filled class="size-8 text-[#d5c4df]" />
								</div>
								<div class="text-center">
									<p class="text-sm font-semibold text-[#fff7e8]">
										{#if dragActive}
											Drop image here
										{:else if $submitting}
											Uploading...
										{:else}
											Tap to upload profile picture
										{/if}
									</p>
									{#if !$submitting && canEdit}
										<p class="mt-1 text-xs text-[#a89e8e]">Images only • 5MB max</p>
									{/if}
								</div>
							</div>
						{:else}
							<div class="relative">
								<div class="flex items-center justify-center p-6 bg-[#102239]/70">
									<img src={previewUrl} alt="Profile picture preview" class="size-28 object-cover rounded-full" />
								</div>
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<p class="text-sm font-semibold text-[#fff7e8]">Tap to change</p>
								</div>
								{#if previewUrl !== currentLogo && canEdit}
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
						{/if}
					</button>
				</div>

				{#if $errors.logo}
					<p class="text-xs text-red-400">{$errors.logo}</p>
				{:else}
					<p class="text-xs text-[#a89e8e]">Will be converted to 96x96 WebP • Max 5MB</p>
				{/if}
			</div>

			<!-- Name & Bio -->
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<FluentPerson20Filled class="size-4 text-[#d5c4df]" />
					<h2 class="text-sm font-semibold text-[#fff7e8]">Profile Information</h2>
				</div>

				<div>
					<label for="edit-name" class="field-label">
						Display Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="edit-name"
						name="name"
						bind:value={$form.name}
						placeholder="Your display name"
						maxlength="50"
						class="input w-full field-control"
						class:input-error={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/50 characters</p>
					{/if}
				</div>

				<div>
					<label for="edit-bio" class="field-label"> Bio (Optional) </label>
					<textarea
						id="edit-bio"
						name="bio"
						bind:value={$form.bio}
						rows="3"
						placeholder="Tell others about yourself..."
						maxlength="500"
						class="textarea w-full field-control"
						class:input-error={$errors.bio}
						disabled={$submitting || !canEdit}></textarea>
					{#if $errors.bio}
						<p class="field-error">{$errors.bio}</p>
					{:else}
						<p class="field-hint">{$form.bio?.length || 0}/500 characters</p>
					{/if}
				</div>
			</div>

			<ResourceRequirements costs={{ currency: editCost }} available={{ currency: userBalance }} />

			<Button type="submit" variant="primary" block disabled={$submitting || !canEdit} loading={$delayed} loadingText="Saving...">
				<FluentCheckmark20Filled class="size-5" />
				Save Changes
			</Button>
		</form>

		<!-- Success Message -->
		{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("wait") && !$message.includes("Insufficient")}
			<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-xl p-4">
				<p class="text-[#c6dfbf] text-sm font-medium">{$message}</p>
			</div>
		{/if}

		<!-- Error Message -->
		{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("wait") || $message.includes("Insufficient"))}
			<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
				<p class="text-red-300 text-sm font-medium">{$message}</p>
			</div>
		{/if}
	</div>
</BottomSheet>

{#if showCropper && cropImageUrl}
	<ImageCropper
		imageUrl={cropImageUrl}
		aspectRatio={1}
		title="Crop Profile Picture"
		cropButtonText="Use this crop"
		onCrop={handleCropComplete}
		onCancel={handleCropCancel}
	/>
{/if}
