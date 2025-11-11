<!-- src/routes/(authenticated)/(dock)/state/new/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibot } from "sveltekit-superforms/adapters";
	import { goto } from "$app/navigation";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentTextDescription20Filled from "~icons/fluent/text-description-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import { foundStateSchema } from "./schema";

	const { data } = $props();

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		validators: valibot(foundStateSchema),
		onResult: ({ result }) => {
			if (result.type === "success" && result.data?.stateId) {
				goto(`/state/${result.data.stateId}`);
			}
		}
	});

	// Predefined color palette
	const colorPalette = [
		{ name: "Ruby Red", hex: "#E63946" },
		{ name: "Orange Peel", hex: "#F77F00" },
		{ name: "Golden Yellow", hex: "#FCBF49" },
		{ name: "Forest Green", hex: "#2A9D8F" },
		{ name: "Ocean Blue", hex: "#264653" },
		{ name: "Royal Purple", hex: "#7209B7" },
		{ name: "Magenta", hex: "#F72585" },
		{ name: "Teal", hex: "#06A77D" },
		{ name: "Crimson", hex: "#9D0208" },
		{ name: "Amber", hex: "#FF9F1C" },
		{ name: "Emerald", hex: "#10B981" },
		{ name: "Sapphire", hex: "#3B82F6" }
	];

	let selectedRegion = $state(null);

	$effect(() => {
		if ($form.regionId) {
			selectedRegion = data.regions.find((r) => r.id === $form.regionId);
		}
	});
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-3">
		<div
			class="inline-flex items-center justify-center size-16 bg-gradient-to-br from-amber-600 to-rose-600 rounded-2xl"
		>
			<FluentBuildingGovernment20Filled class="size-8 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Found a New State</h1>
		<p class="text-gray-400 max-w-2xl mx-auto">
			Establish your sovereignty by founding a new state. Choose an unclaimed region, design your identity, and begin
			your journey to greatness.
		</p>
	</div>

	<!-- Success/Error Messages -->
	{#if $message}
		<div class="alert alert-error bg-red-500/10 border-red-500/20 text-red-400">
			<FluentDismiss20Filled class="size-5" />
			<span>{$message}</span>
		</div>
	{/if}

	<!-- Form -->
	<form method="POST" use:enhance class="space-y-6">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 space-y-6">
			<!-- State Name -->
			<div class="form-control">
				<label class="label" for="name">
					<span class="label-text text-white font-semibold flex items-center gap-2">
						<FluentBuildingGovernment20Filled class="size-5 text-amber-400" />
						State Name
					</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Republic of Nebaria"
					class="input input-bordered w-full bg-slate-700/50 border-slate-600 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
					class:input-error={$errors.name}
				/>
				{#if $errors.name}
					<label class="label">
						<span class="label-text-alt text-error">{$errors.name}</span>
					</label>
				{/if}
			</div>

			<!-- Region Selection -->
			<div class="form-control">
				<label class="label" for="regionId">
					<span class="label-text text-white font-semibold flex items-center gap-2">
						<FluentGlobe20Filled class="size-5 text-purple-400" />
						Founding Region
					</span>
				</label>
				{#if data.regions.length === 0}
					<div class="alert alert-warning bg-amber-500/10 border-amber-500/20 text-amber-400">
						<span>No unclaimed regions available. All regions currently belong to existing states.</span>
					</div>
				{:else}
					<select
						id="regionId"
						name="regionId"
						bind:value={$form.regionId}
						class="select select-bordered w-full bg-slate-700/50 border-slate-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
						class:select-error={$errors.regionId}
					>
						<option value="" disabled selected>Select a region to claim</option>
						{#each data.regions as region}
							<option value={region.id}>{region.name}</option>
						{/each}
					</select>
					{#if $errors.regionId}
						<label class="label">
							<span class="label-text-alt text-error">{$errors.regionId}</span>
						</label>
					{/if}

					{#if selectedRegion}
						<div class="mt-3 p-3 bg-slate-700/30 rounded-lg border border-purple-500/20">
							<p class="text-sm text-gray-300">
								You are claiming <span class="font-semibold text-purple-400">{selectedRegion.name}</span> as your founding
								region.
							</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Map Color -->
			<div class="form-control">
				<label class="label" for="mapColor">
					<span class="label-text text-white font-semibold flex items-center gap-2">
						<FluentColor20Filled class="size-5 text-blue-400" />
						Map Color
					</span>
				</label>
				<div class="space-y-3">
					<div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
						{#each colorPalette as color}
							<button
								type="button"
								class="group relative aspect-square rounded-lg border-2 transition-all hover:scale-105"
								class:border-white={$form.mapColor === color.hex}
								class:border-transparent={$form.mapColor !== color.hex}
								style="background-color: {color.hex}"
								onclick={() => ($form.mapColor = color.hex)}
								title={color.name}
							>
								{#if $form.mapColor === color.hex}
									<div class="absolute inset-0 flex items-center justify-center">
										<FluentCheckmark20Filled class="size-6 text-white drop-shadow-lg" />
									</div>
								{/if}
								<div
									class="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs text-gray-300 pointer-events-none"
								>
									{color.name}
								</div>
							</button>
						{/each}
					</div>

					<div class="flex items-center gap-2">
						<input
							type="text"
							id="mapColor"
							name="mapColor"
							bind:value={$form.mapColor}
							placeholder="#FF5733"
							class="input input-bordered flex-1 bg-slate-700/50 border-slate-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
							class:input-error={$errors.mapColor}
						/>
						<!-- pattern="^#[0-9A-Fa-f]{6}$" -->
						{#if $form.mapColor && /^#[0-9A-Fa-f]{6}$/.test($form.mapColor)}
							<div
								class="size-12 rounded-lg border-2 border-white/20 shrink-0"
								style="background-color: {$form.mapColor}"
							/>
						{/if}
					</div>
					{#if $errors.mapColor}
						<label class="label">
							<span class="label-text-alt text-error">{$errors.mapColor}</span>
						</label>
					{/if}
				</div>
			</div>

			<!-- Logo URL -->
			<div class="form-control">
				<label class="label" for="logo">
					<span class="label-text text-white font-semibold flex items-center gap-2">
						<FluentImage20Filled class="size-5 text-emerald-400" />
						State Logo (Optional)
					</span>
				</label>
				<input
					type="url"
					id="logo"
					name="logo"
					bind:value={$form.logo}
					placeholder="https://example.com/logo.png"
					class="input input-bordered w-full bg-slate-700/50 border-slate-600 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
					class:input-error={$errors.logo}
				/>
				{#if $errors.logo}
					<label class="label">
						<span class="label-text-alt text-error">{$errors.logo}</span>
					</label>
				{/if}
				{#if $form.logo && !$errors.logo}
					<div class="mt-3 flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-emerald-500/20">
						<img
							src={$form.logo}
							alt="State logo preview"
							class="size-16 object-contain rounded-lg bg-white/5"
							onerror={(e) => (e.target.style.display = "none")}
						/>
						<span class="text-sm text-gray-400">Logo preview</span>
					</div>
				{/if}
			</div>

			<!-- Description -->
			<div class="form-control">
				<label class="label" for="description">
					<span class="label-text text-white font-semibold flex items-center gap-2">
						<FluentTextDescription20Filled class="size-5 text-rose-400" />
						Description (Optional)
					</span>
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={$form.description}
					placeholder="Describe your state's vision, values, and goals..."
					rows="4"
					class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600 text-white placeholder-gray-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
					class:textarea-error={$errors.description}
				/>
				{#if $errors.description}
					<label class="label">
						<span class="label-text-alt text-error">{$errors.description}</span>
					</label>
				{/if}
				<label class="label">
					<span class="label-text-alt text-gray-500">
						{$form.description?.length || 0} / 500 characters
					</span>
				</label>
			</div>
		</div>

		<!-- Preview Card -->
		{#if $form.name && $form.mapColor}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
				<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Preview</h3>
				<div class="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-white/5">
					<div
						class="size-16 rounded-xl flex items-center justify-center shrink-0"
						style="background-color: {$form.mapColor}"
					>
						{#if $form.logo}
							<img
								src={$form.logo}
								alt="Logo"
								class="size-12 object-contain"
								onerror={(e) => (e.target.style.display = "none")}
							/>
						{:else}
							<FluentBuildingGovernment20Filled class="size-8 text-white" />
						{/if}
					</div>
					<div class="flex-1">
						<h4 class="text-xl font-bold text-white">{$form.name}</h4>
						{#if selectedRegion}
							<p class="text-sm text-gray-400">Founded in {selectedRegion.name}</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex gap-3">
			<button
				type="submit"
				disabled={$delayed || data.regions.length === 0}
				class="btn flex-1 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-0 text-white gap-2"
			>
				{#if $delayed}
					<span class="loading loading-spinner loading-sm"></span>
					Founding State...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Found State
				{/if}
			</button>
			<a
				href="/states"
				class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
			>
				<FluentDismiss20Filled class="size-5" />
				Cancel
			</a>
		</div>
	</form>

	<!-- Info Box -->
	<div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
		<h3 class="font-semibold text-blue-400 mb-2">What happens when you found a state?</h3>
		<ul class="text-sm text-gray-300 space-y-1 list-disc list-inside">
			<li>You become the founding President with full authority</li>
			<li>The chosen region becomes part of your new state</li>
			<li>You can appoint ministers and establish a parliament</li>
			<li>Your state will appear on the world map with your chosen color</li>
			<li>You can expand by claiming additional unclaimed regions</li>
		</ul>
	</div>
</div>
