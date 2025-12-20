<script lang="ts">
	import { enhance } from "$app/forms";
	import FileUpload from "$lib/component/FileUpload.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";

	const { data, form } = $props();

	let selectedColor = $state("#6366f1");
	let partyName = $state("");
	let abbreviation = $state("");
	let uploadedLogoFileId = $state<string | null>(null);
	let uploadedLogoUrl = $state<string | null>(null);
	let uploadError = $state<string | null>(null);

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

	function handleLogoUploadSuccess(data: { url: string; fileName: string; fileId: string }) {
		uploadedLogoFileId = data.fileId;
		uploadedLogoUrl = data.url;
		uploadError = null;
	}

	function handleLogoUploadError(error: string) {
		uploadError = error;
	}

	function removeLogo() {
		uploadedLogoFileId = null;
		uploadedLogoUrl = null;
		uploadError = null;
	}
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

	<!-- Error Display -->
	{#if form?.error}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{form.error}</p>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" action="?/create" use:enhance class="space-y-6">
		<!-- Hidden input for logo file ID -->
		{#if uploadedLogoFileId}
			<input type="hidden" name="logoFileId" value={uploadedLogoFileId} />
		{/if}

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
					/>
					<p class="text-xs text-gray-400 mt-1">{partyName.length}/100 characters</p>
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
					/>
					<p class="text-xs text-gray-400 mt-1">{abbreviation.length}/10 characters</p>
				</div>
			</div>
		</div>

		<!-- Party Logo -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentImage20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Party Logo (Optional)</h2>
			</div>

			{#if uploadError}
				<div class="bg-red-600/20 border border-red-500/30 rounded-lg p-3">
					<p class="text-red-300 text-sm">{uploadError}</p>
				</div>
			{/if}

			{#if uploadedLogoUrl}
				<div class="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
					<img src={uploadedLogoUrl} alt="Party logo" class="size-16 object-contain rounded-lg bg-white/5" />
					<div class="flex-1">
						<p class="text-sm font-medium text-white">Logo uploaded</p>
						<p class="text-xs text-gray-400">96x96 pixels</p>
					</div>
					<button
						type="button"
						onclick={removeLogo}
						class="btn btn-sm bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 hover:text-red-200"
					>
						<FluentDismiss20Filled class="size-4" />
						Remove
					</button>
				</div>
			{:else}
				<FileUpload
					action="?/uploadLogo"
					acceptedTypes="image/*"
					maxSizeBytes={5 * 1024 * 1024}
					onSuccess={handleLogoUploadSuccess}
					onError={handleLogoUploadError}
				/>
			{/if}

			<p class="text-xs text-gray-400">
				Recommended: 96x96 pixels, PNG or JPG, max 5MB. If no logo is provided, a default icon will be used.
			</p>
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
						class:ring-4={selectedColor === color.value}
						class:ring-white={selectedColor === color.value}
						title={color.name}
						onclick={() => (selectedColor = color.value)}
					/>
				{/each}
			</div>

			<div class="flex items-center gap-3 pt-2">
				<label for="color" class="text-sm font-medium text-gray-300">Custom Color:</label>
				<input
					type="color"
					id="color"
					name="color"
					bind:value={selectedColor}
					class="h-10 w-20 rounded-lg border-2 border-slate-600 bg-slate-700 cursor-pointer"
				/>
				<span class="text-sm text-gray-400">{selectedColor}</span>
			</div>

			<!-- Color Preview -->
			<div class="p-4 rounded-lg" style="background-color: {selectedColor}20; border: 2px solid {selectedColor}40">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {selectedColor}">
						{#if uploadedLogoUrl}
							<img src={uploadedLogoUrl} alt="Logo preview" class="size-10 object-contain" />
						{:else}
							<FluentPeople20Filled class="size-6 text-white" />
						{/if}
					</div>
					<div>
						<p class="font-semibold text-white">{partyName || "Your Party Name"}</p>
						<p class="text-sm" style="color: {selectedColor}">{abbreviation || "Abbreviation"}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Ideology & State -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentBuildingGovernment20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Political Alignment</h2>
			</div>

			<div class="space-y-4">
				<div>
					<label for="ideology" class="block text-sm font-medium text-gray-300 mb-2">
						Political Ideology (Optional)
					</label>
					<select
						id="ideology"
						name="ideology"
						class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					>
						<option value="">Select an ideology...</option>
						{#each ideologies as ideology}
							<option value={ideology.toLowerCase()}>{ideology}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="stateId" class="block text-sm font-medium text-gray-300 mb-2">
						State <span class="text-red-400">*</span>
					</label>
					<select
						id="stateId"
						name="stateId"
						required
						class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					>
						<option value="">Select a state...</option>
						{#each data.states as state}
							<option value={state.id}>{state.name}</option>
						{/each}
					</select>
					<p class="text-xs text-gray-400 mt-1">Choose which state your party will operate in</p>
				</div>
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
				class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
			>
				<FluentCheckmark20Filled class="size-5" />
				Create Party
			</button>
		</div>

		<!-- Info Box -->
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<p class="text-sm text-blue-300">
				💡 <strong>Note:</strong> Once created, you will be the party leader. You can recruit members, participate in elections,
				and shape your state's political landscape.
			</p>
		</div>
	</form>
</div>
