<!-- src/routes/(authenticated)/(fullscreen)/welcome/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createProfileSchema } from "./schema";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import PsyopsLogo from "$lib/assets/logo.svg";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createProfileSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	const politicalViewsOptions = [
		"Liberal",
		"Conservative",
		"Socialist",
		"Libertarian",
		"Progressive",
		"Centrist",
		"Nationalist",
		"Green",
		"Social Democrat",
		"Other"
	];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			$form.logo = file;
			updatePreview(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		if (file) {
			$form.logo = file;
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

	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Header -->
	<div class="text-center space-y-3">
		<div class="flex justify-center">
			<div
				class="size-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20"
			>
				<PsyopsLogo class="size-10 text-white" />
			</div>
		</div>
		<h1 class="text-3xl font-bold text-white">Complete Your Profile</h1>
		<p class="text-gray-400 max-w-md mx-auto">Tell us about yourself to get started in PsyOps</p>
	</div>

	<!-- Error Message -->
	{#if $message}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Profile Picture -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Profile Picture (Optional)</h2>
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

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting}
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-purple-500={dragActive}
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !$form.logo}
					class:border-success={$form.logo && !dragActive}
					class:bg-success-5={$form.logo && !dragActive}
					class:hover:border-purple-500-50={!$submitting && !$form.logo}
					class:hover:bg-purple-600-10={!$submitting && !$form.logo}
					class:opacity-50={$submitting}
					class:input-error={$errors.logo}
				>
					{#if !$form.logo}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-purple-600/20 p-3 transition-transform group-hover:scale-110">
								<FluentPerson20Filled class="size-8 text-purple-400" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-white">
									{#if dragActive}
										Drop image here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload logo
									{/if}
								</p>
								{#if !$submitting}
									<p class="mt-1 text-sm text-gray-400">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-slate-900/50">
								<img src={previewUrl} alt="Logo preview" class="size-32 object-cover rounded-full" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-white">Tap to change</p>
							</div>
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
						</div>
						<div class="border-t border-slate-700 p-3 bg-slate-900/30">
							<p class="truncate text-sm font-medium text-white" title={$form.logo.name}>
								{$form.logo.name}
							</p>
							<p class="text-xs text-gray-400">
								{Math.round($form.logo.size / 1024)} KB
							</p>
						</div>
					{/if}
				</button>
			</div>

			{#if $errors.logo}
				<p class="text-xs text-red-400">{$errors.logo}</p>
			{:else}
				<p class="text-xs text-gray-400">Will be converted to 128x128 WebP</p>
			{/if}
		</div>

		<!-- Username -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentPerson20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Your Identity</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Username <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="Enter your username"
					maxlength="50"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/50 characters</p>
				{/if}
			</div>
		</div>

		<!-- Political Views -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuildingGovernment20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Political Alignment (Optional)</h2>
			</div>

			<div>
				<label for="politicalViews" class="block text-sm font-medium text-gray-300 mb-2"> Your Political Views </label>
				<select
					id="politicalViews"
					name="politicalViews"
					bind:value={$form.politicalViews}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					disabled={$submitting}
				>
					<option value="">Select your political alignment...</option>
					{#each politicalViewsOptions as option}
						<option value={option.toLowerCase()}>{option}</option>
					{/each}
				</select>
				<p class="text-xs text-gray-400 mt-1">This helps others understand your political stance</p>
			</div>
		</div>

		<!-- Bio -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">About You (Optional)</h2>
			</div>

			<div>
				<label for="bio" class="block text-sm font-medium text-gray-300 mb-2"> Short Bio </label>
				<textarea
					id="bio"
					name="bio"
					bind:value={$form.bio}
					rows="4"
					placeholder="Tell others about yourself, your goals, and what you hope to achieve in PsyOps..."
					maxlength="500"
					class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.bio}
					disabled={$submitting}
				></textarea>
				{#if $errors.bio}
					<p class="text-xs text-red-400 mt-1">{$errors.bio}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.bio?.length || 0}/500 characters</p>
				{/if}
			</div>
		</div>

		<!-- Submit Buttons -->
		<div class="flex gap-3">
			<button
				type="submit"
				disabled={$submitting}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating Profile...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Create Profile
				{/if}
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> You can update your profile information later from your account settings.
			</p>
			<p class="text-xs text-blue-300/70">
				<strong>Privacy:</strong> Your email address is never displayed publicly. Only your username and chosen information
				is visible to others.
			</p>
		</div>
	</form>
</div>
