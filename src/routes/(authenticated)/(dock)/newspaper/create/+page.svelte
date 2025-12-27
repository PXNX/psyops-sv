<!-- src/routes/(authenticated)/(dock)/newspaper/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { newspaperSchema } from "./schema";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(newspaperSchema),
		multipleSubmits: "prevent"
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

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
		}
		previewUrl = null;
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

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<FluentEmojiRolledUpNewspaper class="size-16 mx-auto" />
		<h1 class="text-3xl font-bold text-white">Create Newspaper</h1>
		<p class="text-gray-400">Start your own news publication</p>
	</div>

	<!-- Success/Error Messages -->
	{#if $message && !$message.includes("error") && !$message.includes("failed")}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	{#if $message && ($message.includes("error") || $message.includes("failed"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Newspaper Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">Basic Information</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Newspaper Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., The Daily Chronicle"
					maxlength="40"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
					class:input-error={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/40 characters</p>
				{/if}
			</div>

			<div>
				<label for="background" class="block text-sm font-medium text-gray-300 mb-2">
					Background Description (Optional)
				</label>
				<textarea
					id="background"
					name="background"
					bind:value={$form.background}
					rows="4"
					placeholder="Describe your newspaper's mission and values..."
					class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
					disabled={$submitting}
				></textarea>
			</div>
		</div>

		<!-- Logo Upload -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">Newspaper Logo</h2>
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
					class:border-blue-500={dragActive}
					class:bg-blue-600-10={dragActive}
					class:border-blue-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-blue-500-50={!$submitting && !previewUrl}
					class:hover:bg-blue-600-10={!$submitting && !previewUrl}
					class:opacity-50={$submitting}
					class:input-error={$errors.logo}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-blue-600/20 p-3 transition-transform group-hover:scale-110">
								<FluentImage20Filled class="size-8 text-blue-400" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-white">
									{#if dragActive}
										Drop logo here
									{:else if $submitting}
										Uploading...
									{:else}
										Tap to upload newspaper logo
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
								<img src={previewUrl} alt="Logo preview" class="size-24 object-contain rounded-lg" />
							</div>
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<p class="text-base font-semibold text-white">Tap to change</p>
							</div>
							{#if $form.logo}
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
				<p class="text-xs text-gray-400">Logo will be converted to 96x96 WebP format • Max 5MB</p>
			{/if}
		</div>

		<!-- Submit Buttons -->
		<div class="flex gap-3">
			<a
				href="/newspaper"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				class:btn-disabled={$submitting}
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting}
				class="btn flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white gap-2"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Create Newspaper
				{/if}
			</button>
		</div>
	</form>
</div>
