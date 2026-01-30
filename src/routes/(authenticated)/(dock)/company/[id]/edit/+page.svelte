<!-- src/routes/company/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editCompanySchema } from "./schema";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editCompanySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(data.company.logoUrl);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours >= 24) {
			const days = Math.floor(hours / 24);
			const remainingHours = hours % 24;
			return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
		} else if (hours >= 1) {
			return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		return new Date(cooldownEnd).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
	}

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
		if (previewUrl && previewUrl !== data.company.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = URL.createObjectURL(file);
	}

	function clearImage() {
		if ($submitting) return;

		$form.logo = undefined;

		if (previewUrl && previewUrl !== data.company.logoUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = data.company.logoUrl;

		if (fileInput) {
			fileInput.value = "";
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl && previewUrl !== data.company.logoUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const canEdit = $derived(!data.isOnCooldown && data.canAfford);
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/company/{data.company.id}" class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit Company</h1>
				<p class="text-gray-400">{data.company.name}</p>
			</div>
		</div>
	</div>

	<!-- Company Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
		<!-- Factories -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentFactory20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Factories</p>
					<p class="text-lg font-bold text-white">{data.company.factoryCount}</p>
				</div>
			</div>
		</div>

		<!-- Workers -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentPeople20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Workers</p>
					<p class="text-lg font-bold text-white">{data.company.workerCount}</p>
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
					<h3 class="font-semibold text-red-300 text-lg">Edit Cooldown Active</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						This company was recently edited. You must wait before making another change.
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
						You need <strong>{data.editCost.toLocaleString()}</strong> currency to edit the company. You currently have
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

	<!-- Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Company Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuilding20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Details</h2>
			</div>

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
						Company Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Acme Industrial Corp"
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
			</div>
		</div>

		<!-- Company Logo -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Logo</h2>
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
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-purple-500-50={!$submitting && !previewUrl && canEdit}
					class:hover:bg-purple-600-10={!$submitting && !previewUrl && canEdit}
					class:opacity-50={$submitting || !canEdit}
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
										Tap to upload company logo
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
								<img src={previewUrl} alt="Company logo preview" class="size-24 object-contain rounded-lg" />
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

		<!-- Logo Preview -->
		{#if previewUrl}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<h3 class="text-sm font-semibold text-gray-300 mb-3">Preview</h3>
				<div class="bg-gradient-to-br from-purple-600/40 to-blue-600/20 rounded-lg p-6">
					<div class="flex items-center gap-4">
						<div class="size-16 rounded-xl bg-slate-800 border-2 border-white/10 flex items-center justify-center">
							<img src={previewUrl} alt="Logo preview" class="size-14 object-contain" />
						</div>
						<div>
							<p class="font-bold text-white text-xl">{$form.name || "Your Company Name"}</p>
							<p class="text-sm text-gray-300">Founded {new Date(data.company.foundedAt).toLocaleDateString()}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Description -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe your company's mission, industry, and operations..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={$submitting || !canEdit}
			></textarea>
			{#if $errors.description}
				<p class="text-xs text-red-400">{$errors.description}</p>
			{/if}
		</div>

		<!-- Resource Requirements -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-2">
			<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
			<div class="flex gap-3">
				<a
					href="/company/{data.company.id}"
					class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
					class:btn-disabled={$submitting}
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={$submitting || !canEdit}
					class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
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
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Changes cost {data.editCost.toLocaleString()} currency and have a {data.cooldownHours}-hour
				cooldown to prevent frequent modifications.
			</p>
		</div>
	</form>
</div>
