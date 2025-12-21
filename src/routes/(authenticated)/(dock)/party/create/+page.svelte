<!-- src/routes/party/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createPartySchema } from "./schema";
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
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createPartySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let previewUrl = $state<string | null>(null);
	let dragActive = $state(false);
	let fileInput: HTMLInputElement;

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

	const ideologies = [
		"Liberal",
		"Conservative",
		"Socialist",
		"Libertarian",
		"Green",
		"Nationalist",
		"Progressive",
		"Centrist",
		"Social Democrat",
		"Other"
	];

	// Calculate time remaining for cooldown
	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) {
			return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
		} else if (hours > 0) {
			return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
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

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	});

	const canCreate = !data.isOnCooldown && data.canAfford;
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<div
			class="size-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentPeople20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Create Political Party</h1>
		<p class="text-gray-400">Start your own political movement and shape the future</p>
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
					<FluentFlag20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Creation Cost</p>
					<p class="text-lg font-bold text-white">{data.creationCost.toLocaleString()}</p>
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
					<h3 class="font-semibold text-red-300 text-lg">Party Creation Cooldown Active</h3>
					<p class="text-red-200/90 text-sm leading-relaxed">
						You must wait before creating another political party. This cooldown period helps maintain political
						stability.
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
						You need <strong>{data.creationCost.toLocaleString()}</strong> currency to create a political party. You
						currently have <strong>{data.userBalance.toLocaleString()}</strong>.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium">
							Needed: {(data.creationCost - data.userBalance).toLocaleString()} more currency
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Independent Region Warning -->
	{#if data.isIndependentRegion}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-amber-300 text-lg">Independent Region - State Formation</h3>
					<p class="text-amber-200/90 text-sm leading-relaxed">
						{data.userRegion.name} is not part of any state. Creating a party here will automatically establish
						<strong class="text-amber-100">the State of {data.userRegion.name}</strong> with democratic governance.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3 space-y-3">
						<div>
							<p class="text-amber-100 text-sm font-medium mb-2">What happens when you create this party:</p>
							<ul class="text-amber-200/90 text-sm space-y-1 list-disc list-inside">
								<li>A new state is formed: "State of {data.userRegion.name}"</li>
								<li>Your party becomes the founding political party</li>
								<li>Other citizens can join or create competing parties</li>
							</ul>
						</div>
						<div class="border-t border-amber-500/30 pt-3">
							<p class="text-amber-100 text-sm font-semibold mb-2 flex items-center gap-2">
								<FluentEmojiBallotBoxWithBallot class="size-4" />
								Inaugural Election Schedule:
							</p>
							<ul class="text-amber-200/90 text-sm space-y-1 list-disc list-inside">
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
		<!-- Current State Info -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<FluentLocation20Filled class="size-5 text-blue-400" />
				<div>
					<p class="text-sm text-blue-300">Your party will be created in:</p>
					<p class="font-semibold text-white">{data.userState.name}</p>
					<p class="text-xs text-gray-400">Based on your residence in {data.userRegion.name}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Party Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Party Details</h2>
			</div>

			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
						Party Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Progressive Alliance Party"
						maxlength="100"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={$errors.name}
						disabled={$submitting || !canCreate}
					/>
					{#if $errors.name}
						<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>

				<div>
					<label for="abbreviation" class="block text-sm font-medium text-gray-300 mb-2">
						Abbreviation (Optional)
					</label>
					<input
						type="text"
						id="abbreviation"
						name="abbreviation"
						bind:value={$form.abbreviation}
						placeholder="e.g., PROG"
						maxlength="4"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={$errors.abbreviation}
						disabled={$submitting || !canCreate}
					/>
					{#if $errors.abbreviation}
						<p class="text-xs text-red-400 mt-1">{$errors.abbreviation}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{$form.abbreviation?.length || 0}/4 characters • Alphanumeric only</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Party Logo -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Party Logo (Optional)</h2>
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
					class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
					class:border-purple-500={dragActive}
					class:bg-purple-600-10={dragActive}
					class:border-purple-500-30={!dragActive && !$form.logo}
					class:border-success={$form.logo && !dragActive}
					class:bg-success-5={$form.logo && !dragActive}
					class:hover:border-purple-500-50={!$submitting && !$form.logo && canCreate}
					class:hover:bg-purple-600-10={!$submitting && !$form.logo && canCreate}
					class:opacity-50={$submitting || !canCreate}
					class:input-error={$errors.logo}
				>
					{#if !$form.logo}
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
										Tap to upload party logo
									{/if}
								</p>
								{#if !$submitting && canCreate}
									<p class="mt-1 text-sm text-gray-400">Images only • 5MB max</p>
								{/if}
							</div>
						</div>
					{:else}
						<div class="relative">
							<div class="flex items-center justify-center p-6 bg-slate-900/50">
								<img src={previewUrl} alt="Party logo preview" class="size-24 object-contain rounded-lg" />
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
								disabled={$submitting || !canCreate}
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
				<p class="text-xs text-gray-400">Will be converted to 96x96 WebP • Max 5MB</p>
			{/if}
		</div>

		<!-- Party Color -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Party Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg transition-all hover:scale-110 focus:scale-110 focus:outline-none"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-white={$form.color === color.value}
						class:opacity-50={!canCreate}
						title={color.name}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting || !canCreate}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-gray-300">Custom:</label>
				<input
					type="color"
					id="color"
					name="color"
					bind:value={$form.color}
					class="h-10 w-20 rounded-lg border-2 border-slate-600 bg-slate-700 cursor-pointer"
					disabled={$submitting || !canCreate}
				/>
				<span class="text-sm text-gray-400">{$form.color}</span>
			</div>

			{#if $errors.color}
				<p class="text-xs text-red-400">{$errors.color}</p>
			{/if}

			<!-- Preview -->
			<div class="p-4 rounded-lg" style="background-color: {$form.color}20; border: 2px solid {$form.color}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {$form.color}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentPeople20Filled class="size-6 text-white" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-white">{$form.name || "Your Party Name"}</p>
						<p class="text-sm" style="color: {$form.color}">{$form.abbreviation || "Abbreviation"}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Ideology -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuildingGovernment20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Political Alignment</h2>
			</div>

			<div>
				<label for="ideology" class="block text-sm font-medium text-gray-300 mb-2">
					Ideology <span class="text-red-400">*</span>
				</label>
				<select
					id="ideology"
					name="ideology"
					bind:value={$form.ideology}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.ideology}
					disabled={$submitting || !canCreate}
				>
					<option value="">Select an ideology...</option>
					{#each ideologies as ideologyOption}
						<option value={ideologyOption.toLowerCase()}>{ideologyOption}</option>
					{/each}
				</select>
				{#if $errors.ideology}
					<p class="text-xs text-red-400 mt-1">{$errors.ideology}</p>
				{/if}
			</div>
		</div>

		<!-- Description -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Party Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe your party's mission, values, and political platform..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={$submitting || !canCreate}
			></textarea>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/user"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				class:btn-disabled={$submitting}
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting || !canCreate}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					{data.isIndependentRegion
						? "Create Party & Form State"
						: `Create Party (${data.creationCost.toLocaleString()})`}
				{/if}
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong>
				{data.isIndependentRegion
					? "Creating this party will immediately establish a new state. You'll be the founding party leader and can begin recruiting members."
					: "Once created, you will be the party leader. You can recruit members, participate in elections, and shape your state's political landscape."}
			</p>
			<p class="text-xs text-blue-300/70">
				<strong>Cooldown:</strong> After creating a party, you must wait {data.cooldownDays} days before creating another
				one.
			</p>
		</div>
	</form>
</div>
