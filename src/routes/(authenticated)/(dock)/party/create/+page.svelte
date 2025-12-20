<!-- src/routes/party/create/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import { page } from "$app/state";

	let { data } = $props();
	let form = page.form;
	let isSubmitting = $state(false);

	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let dragActive = $state(false);

	// Form values
	let partyName = $state("");
	let abbreviation = $state("");
	let partyColor = $state("#6366f1");
	let ideology = $state("");
	let description = $state("");

	const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		processImage(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files[0];
		processImage(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function processImage(file: File | undefined) {
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}

		if (file.size > MAX_IMAGE_SIZE) {
			alert("Image size must be less than 5MB");
			return;
		}

		if (file.size === 0) {
			alert("Image file is empty");
			return;
		}

		selectedFile = file;

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		previewUrl = URL.createObjectURL(file);
	}

	function removeFile() {
		if (isSubmitting) return;

		selectedFile = null;
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

	<!-- Independent Region Warning -->
	{#if data.isIndependentRegion}
		<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
				<div class="space-y-2 flex-1">
					<h3 class="font-semibold text-amber-300 text-lg">Independent Region</h3>
					<p class="text-amber-200/90 text-sm leading-relaxed">
						{data.userRegion.name} is not part of any state. Creating a party here will automatically establish
						<strong class="text-amber-100">the State of {data.userRegion.name}</strong> with democratic governance.
					</p>
					<div class="bg-amber-900/30 rounded-lg p-3">
						<p class="text-amber-100 text-sm font-medium mb-2">What happens when you create this party:</p>
						<ul class="text-amber-200/90 text-sm space-y-1 list-disc list-inside">
							<li>A new state is formed: "State of {data.userRegion.name}"</li>
							<li>Your party becomes the founding political party</li>
							<li>Other citizens can join or create competing parties</li>
							<li>Democratic elections will determine government positions</li>
						</ul>
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

	<!-- Error Display -->
	{#if form?.message}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{form.message}</p>
		</div>
	{/if}

	<!-- Form -->
	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="space-y-6"
	>
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
						bind:value={partyName}
						placeholder="e.g., Progressive Alliance Party"
						required
						maxlength="100"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={form?.field === "name"}
					/>
					{#if form?.field === "name"}
						<p class="text-xs text-red-400 mt-1">{form.message}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{partyName.length}/100 characters</p>
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
						bind:value={abbreviation}
						placeholder="e.g., PAP"
						maxlength="10"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={form?.field === "abbreviation"}
					/>
					{#if form?.field === "abbreviation"}
						<p class="text-xs text-red-400 mt-1">{form.message}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{abbreviation.length}/10 characters</p>
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

			<input
				bind:this={fileInput}
				type="file"
				id="logo"
				name="logo"
				accept="image/*"
				class="hidden"
				onchange={handleFileSelect}
				disabled={isSubmitting}
			/>

			<div class="relative" ondrop={handleDrop} ondragover={handleDragOver} ondragleave={handleDragLeave}>
				{#if previewUrl}
					<div class="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
						<img src={previewUrl} alt="Party logo preview" class="size-16 object-contain rounded-lg bg-white/5" />
						<div class="flex-1">
							<p class="text-sm font-medium text-white">{selectedFile?.name}</p>
							<p class="text-xs text-gray-400">
								{selectedFile ? Math.round(selectedFile.size / 1024) : 0} KB
							</p>
						</div>
						<button
							type="button"
							onclick={removeFile}
							disabled={isSubmitting}
							class="btn btn-sm bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200"
						>
							<FluentDismiss20Filled class="size-4" />
							Remove
						</button>
					</div>
				{:else}
					<button
						type="button"
						onclick={() => fileInput?.click()}
						disabled={isSubmitting}
						class="w-full p-4 border-2 border-dashed rounded-lg transition-all flex items-center justify-center gap-2 group"
						class:border-purple-500-50={dragActive}
						class:bg-purple-600-10={dragActive}
						class:border-purple-500-30={!dragActive}
						class:hover:border-purple-500-50={!isSubmitting}
						class:hover:bg-purple-600-10={!isSubmitting}
						class:opacity-50={isSubmitting}
					>
						<FluentImage20Filled class="size-5 text-purple-400 group-hover:text-purple-300" />
						<span class="text-purple-400 group-hover:text-purple-300 font-medium">
							{dragActive ? "Drop logo here" : "Select Logo"}
						</span>
					</button>
				{/if}
			</div>

			<p class="text-xs text-gray-400">Recommended: 96x96 pixels, PNG or JPG, max 5MB</p>
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
						class:ring-4={partyColor === color.value}
						class:ring-white={partyColor === color.value}
						title={color.name}
						onclick={() => (partyColor = color.value)}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-gray-300">Custom:</label>
				<input
					type="color"
					id="color"
					name="color"
					bind:value={partyColor}
					class="h-10 w-20 rounded-lg border-2 border-slate-600 bg-slate-700 cursor-pointer"
				/>
				<span class="text-sm text-gray-400">{partyColor}</span>
			</div>

			<!-- Preview -->
			<div class="p-4 rounded-lg" style="background-color: {partyColor}20; border: 2px solid {partyColor}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {partyColor}">
						{#if previewUrl}
							<img src={previewUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentPeople20Filled class="size-6 text-white" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-white">{partyName || "Your Party Name"}</p>
						<p class="text-sm" style="color: {partyColor}">{abbreviation || "Abbreviation"}</p>
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

			<select
				id="ideology"
				name="ideology"
				bind:value={ideology}
				class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
			>
				<option value="">Select an ideology...</option>
				{#each ideologies as ideologyOption}
					<option value={ideologyOption.toLowerCase()}>{ideologyOption}</option>
				{/each}
			</select>
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
				bind:value={description}
				rows="6"
				placeholder="Describe your party's mission, values, and political platform..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
			></textarea>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/user"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={isSubmitting}
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					Creating...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					{data.isIndependentRegion ? "Create Party & Form State" : "Create Party"}
				{/if}
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong>
				{data.isIndependentRegion
					? "Creating this party will immediately establish a new state. You'll be the founding party leader and can begin recruiting members."
					: "Once created, you will be the party leader. You can recruit members, participate in elections, and shape your state's political landscape."}
			</p>
		</div>
	</form>
</div>
