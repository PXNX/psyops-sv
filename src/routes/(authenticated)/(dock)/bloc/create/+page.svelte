<!-- src/routes/(authenticated)/(dock)/bloc/create/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createBlocSchema } from "./schema";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createBlocSchema),
		multipleSubmits: "prevent"
	});

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
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Create New Bloc</h1>
			<p class="text-gray-400">Found a political-military alliance</p>
		</div>
	</div>

	{#if data.onCooldown}
		<div class="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
			<p class="text-orange-300 text-sm font-medium">
				⏰ You must wait {data.timeRemaining} hours before creating, joining, or leaving a bloc.
			</p>
		</div>
	{/if}

	{#if $message}
		<div
			class="bg-{$message.includes('success') ? 'green' : 'red'}-600/20 border border-{$message.includes('success')
				? 'green'
				: 'red'}-500/30 rounded-xl p-4"
		>
			<p class="text-{$message.includes('success') ? 'green' : 'red'}-300 text-sm font-medium">{$message}</p>
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
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
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
					class:input-error={$errors.name}
					disabled={$submitting || data.onCooldown}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/100 characters</p>
				{/if}
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentColor20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Bloc Color</h2>
			</div>

			<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg transition-all hover:scale-110"
						style="background-color: {color.value}"
						class:ring-4={$form.color === color.value}
						class:ring-white={$form.color === color.value}
						onclick={() => ($form.color = color.value)}
						disabled={$submitting || data.onCooldown}
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
					disabled={$submitting || data.onCooldown}
				/>
				<span class="text-sm text-gray-400">{$form.color}</span>
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentDocument20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Description</h2>
			</div>

			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe the bloc's purpose, values, and strategic objectives..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white"
				disabled={$submitting || data.onCooldown}
			></textarea>
		</div>

		<button
			type="submit"
			disabled={$submitting || data.onCooldown}
			class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
		>
			{#if $delayed}
				<span class="loading loading-spinner loading-sm"></span>
				Creating...
			{:else}
				<FluentCheckmark20Filled class="size-5" />
				Create Bloc
			{/if}
		</button>
	</form>
</div>
