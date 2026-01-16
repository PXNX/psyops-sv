<!-- src/routes/(authenticated)/(dock)/state/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editStateSchema } from "./schema";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editStateSchema)
	});

	let previewUrl = $state<string | null>(data.state.logoUrl);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" }
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
		if (previewUrl && previewUrl !== data.state.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if ($submitting) return;

		$form.logo = undefined;

		if (previewUrl && previewUrl !== data.state.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.state.logoUrl;

		if (fileInput) {
			fileInput.value = "";
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.state.logoUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/state/{data.state.id}" class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit State</h1>
				<p class="text-gray-400">{data.state.name}</p>
			</div>
		</div>
	</div>

	{#if data.onCooldown}
		<div class="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
			<p class="text-orange-300 text-sm">⏰ Wait {data.timeRemaining}h before editing again</p>
		</div>
	{/if}

	{#if $message}
		<div
			class="bg-{$message.includes('success') || $message.includes('updated')
				? 'green'
				: 'red'}-600/20 border border-{$message.includes('success') || $message.includes('updated')
				? 'green'
				: 'red'}-500/30 rounded-xl p-4"
		>
			<p
				class="text-{$message.includes('success') || $message.includes('updated')
					? 'green'
					: 'red'}-300 text-sm font-medium"
			>
				{$message}
			</p>
		</div>
	{/if}

	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- State Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentGlobe20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">State Name</h2>
			</div>
			<input
				type="text"
				name="name"
				bind:value={$form.name}
				placeholder="e.g., Republic of Liberty"
				maxlength="100"
				class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
				class:input-error={$errors.name}
				disabled={$submitting || data.onCooldown}
			/>
			{#if $errors.name}
				<p class="text-xs text-red-400">{$errors.name}</p>
			{:else}
				<p class="text-xs text-gray-400">{$form.name?.length || 0}/100 characters</p>
			{/if}
		</div>

		<!-- State Logo -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">State Logo</h2>
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
					disabled={$submitting || data.onCooldown}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting || data.onCooldown}
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-purple-500={dragActive}
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-purple-500-50={!$submitting && !previewUrl && !data.onCooldown}
					class:hover:bg-purple-600-10={!$submitting && !previewUrl && !data.onCooldown}
					class:opacity-50={$submitting || data.onCooldown}
					class:input-error={$errors.logo}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-purple-600/20 p-3 transition-transform group-hover:scale-110">
								<FluentImage20Filled class="size-8 text-purple-400" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-white">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload state logo
									{/if}
								</p>
								{#if !$submitting && !data.onCooldown}
									<p class="mt-1 text-sm text-gray-400">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-slate-900/50">
								<img src={previewUrl} alt="State logo preview" class="size-24 object-contain rounded-lg" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-white">Tap to change</p>
							</div>
							{#if $form.logo && !data.onCooldown}
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
						{#if $form.logo}
							<div class="border-t border-slate-700 p-3 bg-slate-900/30">
								<p class="truncate text-sm font-medium text-white" title={$form.logo.name}>
									{$form.logo.name}
								</p>
								<p class="text-xs text-gray-400">
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
				<p class="text-xs text-gray-400">
					Upload a new logo to replace the current one • Will be converted to 96x96 WebP • Max 5MB
				</p>
			{/if}
		</div>

		<!-- State Color -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">State Color</h2>
			</div>

			<div class="grid grid-cols-6 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg transition-all hover:scale-110"
						style="background: {color.value}"
						class:ring-4={$form.background === color.value}
						class:ring-white={$form.background === color.value}
						onclick={() => ($form.background = color.value)}
						disabled={$submitting || data.onCooldown}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="background" class="text-sm font-medium text-gray-300">Custom:</label>
				<input
					type="color"
					id="background"
					name="background"
					bind:value={$form.background}
					class="h-10 w-20 rounded-lg border-2 border-slate-600 bg-slate-700 cursor-pointer"
					disabled={$submitting || data.onCooldown}
				/>
				<span class="text-sm text-gray-400">{$form.background}</span>
			</div>

			<!-- Preview -->
			<div
				class="p-4 rounded-lg mt-4"
				style="background-color: {$form.background}20; border: 2px solid {$form.background}40"
			>
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {$form.background}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentGlobe20Filled class="size-6 text-white" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-white">{$form.name || "Your State Name"}</p>
						<p class="text-sm" style="color: {$form.background}">Sovereign State</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/state/{data.state.id}"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				class:btn-disabled={$submitting}
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting || data.onCooldown}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
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

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Changes have a 24-hour cooldown to prevent frequent modifications.
			</p>
		</div>
	</form>
</div>
