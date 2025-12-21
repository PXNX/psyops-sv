<!-- src/routes/(authenticated)/(dock)/settings/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPaint20Filled from "~icons/fluent/paint-brush-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentDataUsage20Filled from "~icons/fluent/data-usage-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import { themes } from "$lib/themes";
	import { updateProfileSchema } from "./schema.js";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(updateProfileSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(data.profile.avatar);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let current_theme = $state("");
	let loadImages = $state(true);

	$effect(() => {
		if (typeof window !== "undefined") {
			const theme = window.localStorage.getItem("theme");
			if (theme && themes.includes(theme)) {
				document.documentElement.setAttribute("data-theme", theme);
				current_theme = theme;
			}

			// Load image preference
			const imagePreference = window.localStorage.getItem("loadImages");
			loadImages = imagePreference !== "false";
		}
	});

	function set_theme(event: Event) {
		const select = event.target as HTMLSelectElement;
		const theme = select.value;
		if (themes.includes(theme)) {
			const one_year = 60 * 60 * 24 * 365;
			window.localStorage.setItem("theme", theme);
			document.cookie = `theme=${theme}; max-age=${one_year}; path=/; SameSite=Lax`;
			document.documentElement.setAttribute("data-theme", theme);
			current_theme = theme;
		}
	}

	function toggleLoadImages() {
		loadImages = !loadImages;
		window.localStorage.setItem("loadImages", loadImages.toString());

		// Optional: Set a cookie for server-side rendering
		const one_year = 60 * 60 * 24 * 365;
		document.cookie = `loadImages=${loadImages}; max-age=${one_year}; path=/; SameSite=Lax`;
	}

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
			$form.avatar = file;
			updatePreview(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			$form.avatar = file;
			updatePreview(file);
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
		if (previewUrl && previewUrl !== data.profile.avatar) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if ($submitting) return;

		$form.avatar = undefined;

		if (previewUrl && previewUrl !== data.profile.avatar) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.profile.avatar;

		if (fileInput) {
			fileInput.value = "";
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.profile.avatar) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const canEdit = !data.isOnCooldown && data.canAfford;
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<div
			class="size-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentSettings20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Settings</h1>
		<p class="text-gray-400">Manage your account preferences</p>
	</div>

	<!-- Cost & Balance Info -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<!-- Balance -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Balance</p>
					<p class="text-lg font-bold text-white">{data.userBalance.toLocaleString()}</p>
				</div>
			</div>
		</div>

		<!-- Cost -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentPerson20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Profile Edit Cost</p>
					<p class="text-lg font-bold text-white">{data.editCost.toLocaleString()}</p>
				</div>
			</div>
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

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford && !data.isOnCooldown}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
					<p class="text-amber-200/90 text-sm leading-relaxed">
						You need <strong>{data.editCost.toLocaleString()}</strong> currency to edit your profile. You currently have
						<strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium">
							Needed: {(data.editCost - data.userBalance).toLocaleString()} more currency
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

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

	<!-- Profile Settings -->
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
					id="avatar"
					name="avatar"
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
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-purple-500-50={!$submitting && !previewUrl && canEdit}
					class:hover:bg-purple-600-10={!$submitting && !previewUrl && canEdit}
					class:opacity-50={$submitting || !canEdit}
					class:input-error={$errors.avatar}
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
								<img
									src={previewUrl}
									alt="Profile picture preview"
									class="size-32 object-cover rounded-full ring-4 ring-white/10"
								/>
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-white">Tap to change</p>
							</div>
							{#if previewUrl !== data.profile.avatar && canEdit}
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

			{#if $errors.avatar}
				<p class="text-xs text-red-400">{$errors.avatar}</p>
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
					disabled={$submitting || !canEdit}
				></textarea>
				{#if $errors.bio}
					<p class="text-xs text-red-400 mt-1">{$errors.bio}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.bio?.length || 0}/500 characters</p>
				{/if}
			</div>
		</div>

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
				Save Changes ({data.editCost.toLocaleString()})
			{/if}
		</button>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Profile changes cost {data.editCost.toLocaleString()} currency and have a
				{data.cooldownHours}-hour cooldown to prevent frequent modifications.
			</p>
		</div>
	</form>

	<!-- Application Settings -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentPaint20Filled class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Appearance</h2>
		</div>

		<div>
			<label for="theme" class="block text-sm font-medium text-gray-300 mb-2"> Theme </label>
			<select
				id="theme"
				bind:value={current_theme}
				data-choose-theme
				class="select w-full bg-slate-700/50 border-slate-600/30 text-white capitalize focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				onchange={set_theme}
			>
				{#each themes as theme}
					<option value={theme} class="capitalize">{theme}</option>
				{/each}
			</select>
		</div>

		<div class="pt-2">
			<label class="flex items-center justify-between cursor-pointer group">
				<div class="flex items-center gap-3">
					<FluentDataUsage20Filled class="size-5 text-purple-400" />
					<div>
						<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Load Images</p>
						<p class="text-xs text-gray-500">Disable to save data and improve performance</p>
					</div>
				</div>
				<input type="checkbox" bind:checked={loadImages} onchange={toggleLoadImages} class="toggle toggle-primary" />
			</label>
		</div>
	</div>

	<!-- Gift Code Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/giftcode"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
					<FluentGift20Filled class="size-5 text-white" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Gift Codes</p>
					<p class="text-xs text-gray-400">Redeem codes for exclusive rewards and bonuses</p>
				</div>
			</div>
			<svg
				class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>

	<!-- About Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/about"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-blue-600/20 p-2 rounded-lg">
					<FluentInfo20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
						About This Application
					</p>
					<p class="text-xs text-gray-400">Learn more about features, version, and terms</p>
				</div>
			</div>
			<svg
				class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>

	<!-- Account Actions -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
		<h2 class="text-lg font-semibold text-white">Account Actions</h2>

		<form method="POST" action="?/logout" use:enhance>
			<button
				type="submit"
				class="btn w-full justify-start bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-300 hover:text-red-200 gap-2"
			>
				<FluentArrowExit20Filled class="size-5" />
				Sign Out
			</button>
		</form>
	</div>

	<!-- Info Box -->
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<p class="text-sm text-blue-300">
			💡 <strong>Tip:</strong> Your profile information will be visible to other users. Make sure to choose a name and avatar
			that represent you well in the political landscape!
		</p>
	</div>
</div>
