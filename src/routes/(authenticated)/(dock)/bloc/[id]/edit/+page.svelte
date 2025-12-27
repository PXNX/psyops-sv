<!-- src/routes/bloc/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editBlocSchema } from "./schema";
	import { enhance as svelteEnhance } from "$app/forms";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editBlocSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	let selectedTemplates = $state<Set<number>>(new Set(data.recommendedTemplateIds));
	let isSavingRecommendations = $state(false);

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

	const unitTypeIcons: Record<string, string> = {
		heavy_armor: "🚜",
		ifv: "🚙",
		artillery: "🎯",
		air_defence: "🛡️",
		light_infantry: "🪖",
		fighter_squadron: "✈️",
		bomber_squadron: "🛩️"
	};

	function toggleTemplate(templateId: number) {
		if (selectedTemplates.has(templateId)) {
			selectedTemplates.delete(templateId);
		} else {
			selectedTemplates.add(templateId);
		}
		selectedTemplates = selectedTemplates; // Trigger reactivity
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/bloc/{data.bloc.id}" class="btn btn-circle btn-ghost hover:bg-slate-700/50"> ← </a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit Bloc</h1>
				<p class="text-gray-400">{data.bloc.name}</p>
			</div>
		</div>
	</div>

	<!-- Success Message -->
	{#if $message && !$message.includes("error") && !$message.includes("failed")}
		<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
			<p class="text-green-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if $message && ($message.includes("error") || $message.includes("failed"))}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<p class="text-red-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<!-- Basic Info Form -->
	<form method="POST" action="?/update" use:enhance class="space-y-6">
		<!-- Bloc Name -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentFlag20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Bloc Details</h2>
			</div>

			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Bloc Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Eastern Defense Alliance"
					maxlength="100"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.name}
					disabled={$submitting}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/100 characters</p>
				{/if}
			</div>
		</div>

		<!-- Bloc Color -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Bloc Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg transition-all hover:scale-110 focus:scale-110 focus:outline-none"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-white={$form.color === color.value}
						title={color.name}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting}
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
					disabled={$submitting}
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
						<FluentFlag20Filled class="size-6 text-white" />
					</div>
					<div>
						<p class="font-semibold text-white">{$form.name || "Your Bloc Name"}</p>
						<p class="text-sm" style="color: {$form.color}">Political-Military Alliance</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Description -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Bloc Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe the bloc's purpose, values, and strategic objectives..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={$submitting}
			></textarea>
		</div>

		<!-- Submit -->
		<div class="flex gap-3">
			<a
				href="/bloc/{data.bloc.id}"
				class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
				class:btn-disabled={$submitting}
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={$submitting}
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
	</form>

	<!-- Recommended Units -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FluentShield20Filled class="size-5 text-purple-400" />
				<div>
					<h2 class="text-lg font-semibold text-white">Recommended Military Units</h2>
					<p class="text-xs text-gray-400">Select units to recommend to member states</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each data.allTemplates as template}
				<button
					type="button"
					onclick={() => toggleTemplate(template.id)}
					class="text-left bg-slate-700/30 rounded-lg p-4 border-2 transition-all hover:bg-slate-700/50"
					class:border-purple-500={selectedTemplates.has(template.id)}
					class:border-white/5={!selectedTemplates.has(template.id)}
					disabled={isSavingRecommendations}
				>
					<div class="flex items-start gap-3">
						<div class="flex items-center gap-2">
							<span class="text-2xl">{unitTypeIcons[template.unitType] || "🎖️"}</span>
							{#if selectedTemplates.has(template.id)}
								<div class="size-5 bg-purple-600 rounded flex items-center justify-center shrink-0">
									<FluentCheckmark20Filled class="size-3 text-white" />
								</div>
							{:else}
								<div class="size-5 border-2 border-slate-500 rounded shrink-0"></div>
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-white text-sm">{template.displayName}</p>
							{#if template.description}
								<p class="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>

		<form
			method="POST"
			action="?/updateRecommendations"
			use:svelteEnhance={() => {
				isSavingRecommendations = true;
				return async ({ update }) => {
					await update();
					isSavingRecommendations = false;
				};
			}}
		>
			{#each Array.from(selectedTemplates) as templateId}
				<input type="hidden" name="templateIds" value={templateId} />
			{/each}

			<button
				type="submit"
				disabled={isSavingRecommendations}
				class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
			>
				{#if isSavingRecommendations}
					<span class="loading loading-spinner loading-sm"></span>
					Saving...
				{:else}
					<FluentCheckmark20Filled class="size-5" />
					Update Recommended Units ({selectedTemplates.size} selected)
				{/if}
			</button>
		</form>
	</div>

	<!-- Info Box -->
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<p class="text-sm text-blue-300">
			💡 <strong>Note:</strong> As a president of a member state, you can manage the bloc's name, color, description,
			and recommended military units. These recommendations will be highlighted to all member states during unit training.
		</p>
	</div>
</div>