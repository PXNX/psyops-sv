<!-- src/routes/(authenticated)/(dock)/state/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editStateSchema } from "./schema";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editStateSchema)
	});

	const colorPresets = [
		{ name: "Blue", value: "#3b82f6" },
		{ name: "Red", value: "#ef4444" },
		{ name: "Green", value: "#10b981" },
		{ name: "Purple", value: "#8b5cf6" },
		{ name: "Orange", value: "#f97316" },
		{ name: "Pink", value: "#ec4899" }
	];
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<h1 class="text-3xl font-bold text-white">Edit State</h1>

	{#if data.onCooldown}
		<div class="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4">
			<p class="text-orange-300 text-sm">⏰ Wait {data.timeRemaining}h before editing again</p>
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<div class="flex items-center gap-2">
				<FluentGlobe20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">State Name</h2>
			</div>

			<input
				type="text"
				name="name"
				bind:value={$form.name}
				class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
				disabled={$submitting || data.onCooldown}
			/>
			{#if $errors.name}
				<p class="text-xs text-red-400">{$errors.name}</p>
			{/if}
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
			<h2 class="text-lg font-semibold text-white">State Color</h2>

			<div class="grid grid-cols-6 gap-2">
				{#each colorPresets as color}
					<button
						type="button"
						class="size-12 rounded-lg"
						style="background: {color.value}"
						class:ring-4={$form.background === color.value}
						onclick={() => ($form.background = color.value)}
						disabled={$submitting || data.onCooldown}
					/>
				{/each}
			</div>

			<input
				type="color"
				name="background"
				bind:value={$form.background}
				class="h-10 w-20 rounded-lg"
				disabled={$submitting || data.onCooldown}
			/>
		</div>

		<button
			type="submit"
			disabled={$submitting || data.onCooldown}
			class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
		>
			{#if $delayed}
				<span class="loading loading-spinner loading-sm"></span>
				Saving...
			{:else}
				<FluentCheckmark20Filled class="size-5" />
				Save Changes
			{/if}
		</button>
	</form>
</div>
