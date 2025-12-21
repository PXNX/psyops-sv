<!-- src/routes/company/create/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentClipboardTextEdit20Regular from "~icons/fluent/clipboard-text-edit-20-regular";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";

	let { data } = $props();

	let companyName = $state("");
	let description = $state("");
	let logo = $state("");
	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

	const COMPANY_COST = 100000;
	const COOLDOWN_DAYS = 30;

	const canAfford = $derived(data.userBalance >= COMPANY_COST);
	const isOnCooldown = $derived(data.isOnCooldown);
	const canCreate = $derived(canAfford && !isOnCooldown && companyName.trim());

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) {
			return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
		}
		return `${hours} hour${hours !== 1 ? "s" : ""}`;
	}

	function formatCooldownDate(cooldownEnd: string): string {
		return new Date(cooldownEnd).toLocaleString("en-US", {
			month: "long",
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
		if (file && file.type.startsWith("image/")) {
			updatePreview(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		if (file && file.type.startsWith("image/")) {
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
		logo = previewUrl;
	}

	function clearImage() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		logo = "";
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
		<div
			class="size-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentBuilding20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Register Company</h1>
		<p class="text-gray-400">Establish your business empire and build industrial power</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentBuilding20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Registration Cost</p>
					<p class="text-lg font-bold text-white">{COMPANY_COST.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	{#if isOnCooldown && data.cooldownEndsAt}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-red-300 text-lg">Company Registration Cooldown Active</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						You must wait before registering another company. This cooldown period prevents rapid company creation.
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

	{#if !canAfford && !isOnCooldown}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2">
					<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
					<p class="text-amber-200/90 text-sm">
						You need <strong>{COMPANY_COST.toLocaleString()}</strong> to register a company. You currently have
						<strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium">
							Needed: {(COMPANY_COST - data.userBalance).toLocaleString()} more
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
		<!-- Company Details -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuilding20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Details</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Company Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={companyName}
					placeholder="e.g., Acme Industrial Group"
					maxlength="100"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					disabled={!canCreate}
				/>
				<p class="text-xs text-gray-400 mt-1">{companyName.length}/100 characters</p>
			</div>
		</div>

		<!-- Company Logo -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Logo (Optional)</h2>
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
					disabled={!canCreate}
				/>

				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={!canCreate}
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-purple-500={dragActive}
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !previewUrl}
					class:border-success={previewUrl && !dragActive}
					class:bg-success-5={previewUrl && !dragActive}
					class:hover:border-purple-500-50={canCreate && !previewUrl}
					class:hover:bg-purple-600-10={canCreate && !previewUrl}
					class:opacity-50={!canCreate}
				>
					{#if !previewUrl}
						<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
							<div class="rounded-full bg-purple-600/20 p-3 transition-transform group-hover:scale-110">
								<FluentImage20Filled class="size-8 text-purple-400" />
							</div>
							<div class="text-center">
								<p class="text-base font-semibold text-white">
									{dragActive ? "Drop logo here" : "Tap to upload company logo"}
								</p>
								{#if canCreate}
									<p class="mt-1 text-sm text-gray-400">Images only • Recommended 256x256px</p>
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
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									clearImage();
								}}
								disabled={!canCreate}
								class="btn absolute top-2 right-2 btn-circle btn-sm bg-slate-800 hover:bg-slate-700"
							>
								✕
							</button>
						</div>
					{/if}
				</button>
			</div>

			<p class="text-xs text-gray-400">
				Upload an image to represent your company • Will be displayed on factories and market listings
			</p>
		</div>

		<!-- Description -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentClipboardTextEdit20Regular class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Company Description (Optional)</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={description}
				rows="6"
				placeholder="Describe your company's mission, industry focus, and business goals..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={!canCreate}
			></textarea>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/company"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={!canCreate}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				<FluentCheckmark20Filled class="size-5" />
				Register Company ({COMPANY_COST.toLocaleString()})
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Company registration costs {COMPANY_COST.toLocaleString()} currency and has a {COOLDOWN_DAYS}-day
				cooldown. Your company can operate across any region but must pay taxes to the states where your factories are
				located.
			</p>
			<div class="flex items-start gap-2 mt-3 pt-3 border-t border-blue-500/20">
				<FluentFactory20Filled class="size-5 text-blue-400 shrink-0 mt-0.5" />
				<p class="text-xs text-blue-300/90">
					<strong>After Registration:</strong> You can create factories in any region, hire workers, and produce resources
					for the market. Each factory requires energy from its state's power grid.
				</p>
			</div>
		</div>
	</form>
</div>
