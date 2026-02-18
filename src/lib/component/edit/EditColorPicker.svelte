<script lang="ts">
	import type { ComponentType } from "svelte";

	interface ColorPreset {
		name: string;
		value: string;
	}

	interface Props {
		color: string;
		disabled?: boolean;
		error?: string;
		previewIcon?: ComponentType;
		previewTitle?: string;
		previewSubtitle?: string;
		previewImageUrl?: string | null;
		colorPresets?: ColorPreset[];
	}

	let {
		color = $bindable(),
		disabled = false,
		error,
		previewIcon: PreviewIcon,
		previewTitle = "Preview",
		previewSubtitle = "Subtitle",
		previewImageUrl,
		colorPresets = [
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
		]
	}: Props = $props();
</script>

<div class="space-y-4">
	<!-- Color Presets -->
	<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
		{#each colorPresets as colorOption}
			<button
				type="button"
				class="size-12 rounded-lg transition-all hover:scale-110 focus:scale-110 focus:outline-none"
				style="background-color: {colorOption.value}"
				class:ring-4={color === colorOption.value}
				class:ring-white={color === colorOption.value}
				class:opacity-50={disabled}
				title={colorOption.name}
				onclick={() => (color = colorOption.value)}
				{disabled}
			/>
		{/each}
	</div>

	<!-- Custom Color Picker -->
	<div class="flex items-center gap-3 pt-2">
		<label for="color" class="text-sm font-medium text-gray-300">Custom:</label>
		<input
			type="color"
			id="color"
			name="color"
			bind:value={color}
			class="h-10 w-20 rounded-lg border-2 border-slate-600 bg-slate-700 cursor-pointer"
			{disabled}
		/>
		<span class="text-sm text-gray-400">{color}</span>
	</div>

	{#if error}
		<p class="text-xs text-red-400">{error}</p>
	{/if}

	<!-- Preview -->
	<div class="p-4 rounded-lg" style="background-color: {color}20; border: 2px solid {color}40">
		<div class="flex items-center gap-3">
			<div class="size-12 rounded-lg flex items-center justify-center" style="background-color: {color}">
				{#if previewImageUrl}
					<img src={previewImageUrl} alt="Logo preview" class="size-10 object-contain" />
				{:else if PreviewIcon}
					<PreviewIcon class="size-6 text-white" />
				{/if}
			</div>
			<div>
				<p class="font-semibold text-white">{previewTitle}</p>
				<p class="text-sm" style="color: {color}">{previewSubtitle}</p>
			</div>
		</div>
	</div>
</div>
