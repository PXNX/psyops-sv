<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { newspaperSchema } from "./schema";
	import { enhance as svelteEnhance } from "$app/forms";
	import Modal from "$lib/component/Modal.svelte";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(newspaperSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(data.newspaper.logoUrl);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);

	const canEdit = $derived(data.canAfford);

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
		if (previewUrl && previewUrl !== data.newspaper.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if ($submitting) return;

		$form.logo = undefined;

		if (previewUrl && previewUrl !== data.newspaper.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.newspaper.logoUrl;

		if (fileInput) {
			fileInput.value = "";
		}
	}

	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.newspaper.logoUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/newspaper/{data.newspaper.id}" class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit Newspaper</h1>
				<p class="text-gray-400">{data.newspaper.name}</p>
			</div>
		</div>
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
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<MdiNewspaper class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Edit Cost</p>
					<p class="text-lg font-bold text-white">{data.editCost.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
					<p class="text-amber-200/90 text-sm leading-relaxed">
						You need <strong>{data.editCost.toLocaleString()}</strong> currency to edit the newspaper. You currently
						have <strong>{data.userBalance.toLocaleString()}</strong>.
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
	{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("Insufficient")}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("Insufficient"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Basic Information -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">Basic Information</h2>
			</div>

			<div class="space-y-4">
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
						disabled={$submitting || !canEdit}
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
						disabled={$submitting || !canEdit}
					></textarea>
				</div>
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
					disabled={$submitting || !canEdit}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={$submitting || !canEdit}
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-blue-500={dragActive}
					class:bg-blue-600-10={dragActive}
					class:border-blue-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-blue-500-50={!$submitting && !previewUrl && canEdit}
					class:hover:bg-blue-600-10={!$submitting && !previewUrl && canEdit}
					class:opacity-50={$submitting || !canEdit}
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
										Tap to upload new logo
									{/if}
								</p>
								{#if !$submitting && canEdit}
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
							{#if $form.logo && canEdit}
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

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/newspaper/{data.newspaper.id}"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				class:btn-disabled={$submitting}
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting || !canEdit}
				class="btn flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Saving...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Save Changes ({data.editCost.toLocaleString()})
				{/if}
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Changes cost {data.editCost.toLocaleString()} currency to prevent frequent modifications.
			</p>
		</div>
	</form>

	<!-- Danger Zone -->
	<div class="bg-red-600/10 border border-red-500/20 rounded-xl p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentWarning20Filled class="size-5 text-red-400" />
			<h2 class="text-lg font-semibold text-red-300">Danger Zone</h2>
		</div>

		<div class="space-y-4">
			<div>
				<h3 class="text-base font-semibold text-white mb-1">Delete Newspaper</h3>
				<p class="text-sm text-gray-400 mb-3">
					Permanently delete this newspaper and all associated articles. This action cannot be undone.
				</p>
				<button
					type="button"
					onclick={() => (showDeleteModal = true)}
					class="btn btn-sm bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200 gap-2"
				>
					<FluentDelete20Filled class="size-4" />
					Delete Newspaper
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete Newspaper?" size="default">
	<div class="space-y-4">
		<p class="text-gray-300">
			Are you sure you want to delete <strong>{data.newspaper.name}</strong>?
		</p>
		<div class="alert alert-warning bg-yellow-600/20 border-yellow-500/30">
			<FluentWarning20Filled class="size-5 text-yellow-400" />
			<p class="text-yellow-200 text-sm">
				<strong>Warning:</strong> This will permanently delete all articles and members. This action cannot be undone.
			</p>
		</div>
		<div class="flex justify-end gap-3 mt-6">
			<button type="button" onclick={() => (showDeleteModal = false)} class="btn btn-ghost" disabled={isDeleting}>
				Cancel
			</button>
			<form
				method="POST"
				action="?/delete"
				use:svelteEnhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						await update();
						isDeleting = false;
					};
				}}
			>
				<button type="submit" class="btn btn-error gap-2" disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<FluentDelete20Filled class="size-4" />
					{/if}
					Delete Newspaper
				</button>
			</form>
		</div>
	</div>
</Modal>
