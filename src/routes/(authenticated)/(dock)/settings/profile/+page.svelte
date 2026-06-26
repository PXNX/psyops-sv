<!-- src/routes/(authenticated)/(dock)/settings/profile/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import { updateProfileSchema } from "./schema.js";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import ImageCropper from "$lib/component/ImageCropper.svelte";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(updateProfileSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(data.profile.logo);
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
				if (previewUrl && previewUrl !== data.profile.logo) {
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
		if (previewUrl && previewUrl !== data.profile.logo) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.profile.logo;
		if (fileInput) {
			fileInput.value = "";
		}
	}

	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.profile.logo) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const canEdit = !data.isOnCooldown && data.canAfford;
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/settings" class="btn btn-sm btn-ghost gap-2 text-gray-400 hover:text-white">
			<FluentArrowLeft20Filled class="size-4" />
			Back
		</a>
		<div>
			<h1 class="text-2xl font-bold text-white">Edit Profile</h1>
			<p class="text-gray-400 text-sm">Update your display name, bio and picture</p>
		</div>
	</div>

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Profile Edit Cooldown Active</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						Your profile was recently edited. You must wait before making another change.
					</p>
					<div class="bg-red-900/30 rounded-lg p-3 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-red-100 text-sm font-medium">Time Remaining:</span>
							<span class="text-red-100 text-sm font-bold">{formatTimeRemaining(data.cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-red-200/70">Available on:</span>
							<span class="text-red-200/90">{formatCooldownDate(data.cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Profile Form -->
	<form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Profile Picture -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Profile Picture</h2>
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
					disabled={$submitting || !canEdit}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting || !canEdit}
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-purple-500={dragActive}
					class:border-success={previewUrl && !dragActive}
					class:opacity-50={$submitting || !canEdit}
					class:input-error={$errors.logo}
				>
					{#if !previewUrl}
						<div class="flex min-h-[160px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-purple-600/20 p-3 transition-transform group-hover:scale-110">
								<FluentImageOff20Filled class="size-10 text-purple-400" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-white">
									{#if dragActive}
										Drop image here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload profile picture
									{/if}
								</p>
								{#if !$submitting && canEdit}
									<p class="mt-1 text-sm text-gray-400">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-8 bg-slate-900/50">
								<img src={previewUrl} alt="Profile picture preview" class="size-32 object-cover rounded-full" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-white">Tap to change</p>
							</div>
							{#if previewUrl !== data.profile.logo && canEdit}
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										clearImage();
									}}
									disabled={$submitting}
									class="btn absolute top-2 right-2 btn-circle btn-sm bg-slate-800 hover:bg-slate-700"
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
				<p class="text-xs text-gray-400">Will be converted to 96x96 WebP • Max 5MB</p>
			{/if}
		</div>

		<!-- Name & Bio -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentPerson20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Profile Information</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Display Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="Your display name"
					maxlength="50"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.name}
					disabled={$submitting || !canEdit}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/50 characters</p>
				{/if}
			</div>

			<div>
				<label for="bio" class="block text-sm font-medium text-gray-300 mb-2"> Bio (Optional) </label>
				<textarea
					id="bio"
					name="bio"
					bind:value={$form.bio}
					rows="4"
					placeholder="Tell others about yourself..."
					maxlength="500"
					class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.bio}
					disabled={$submitting || !canEdit}></textarea>
				{#if $errors.bio}
					<p class="text-xs text-red-400 mt-1">{$errors.bio}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.bio?.length || 0}/500 characters</p>
				{/if}
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />

			<!-- Save Button -->
			<button
				type="submit"
				disabled={$submitting || !canEdit}
				class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Saving...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Save Changes
				{/if}
			</button>
		</div>
	</form>

	<!-- Telegram Connection -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<svg class="size-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
				/>
			</svg>
			<h2 class="text-lg font-semibold text-white">Telegram Account</h2>
		</div>

		{#if data.profile.telegramUsername}
			<div class="bg-slate-900/50 rounded-lg p-4 space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-400">Connected Telegram Account</p>
						<p class="text-base font-semibold text-white mt-1">@{data.profile.telegramUsername}</p>
					</div>
					<div class="badge badge-success">Connected</div>
				</div>
				<form method="POST" action="?/disconnectTelegram" use:enhance>
					<button type="submit" class="btn btn-sm btn-outline btn-error w-full"> Disconnect Telegram </button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-gray-400">
				Connect your Telegram account to receive notifications and use Telegram-based features.
			</p>
			<a href="/auth/login/telegram?next=/settings/profile" class="btn btn-primary w-full gap-2">
				<svg class="size-5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
					/>
				</svg>
				Connect Telegram Account
			</a>
		{/if}
	</div>

	<!-- Success Message -->
	{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("wait") && !$message.includes("Insufficient")}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("wait") || $message.includes("Insufficient"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}
</div>

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
