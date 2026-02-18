<script lang="ts">
	import FluentImage20Filled from "~icons/fluent/image-20-filled";

	interface Props {
		previewUrl: string | null;
		dragActive: boolean;
		fileInputElement: HTMLInputElement | undefined;
		disabled: boolean;
		error?: string;
		entityName?: string;
		onFileSelect: (event: Event) => void;
		onDrop: (event: DragEvent) => void;
		onDragOver: (event: DragEvent) => void;
		onDragLeave: () => void;
		onClearImage: () => void;
		onClickUpload: () => void;
		file?: File;
	}

	let {
		previewUrl = $bindable(),
		dragActive = $bindable(),
		fileInputElement = $bindable(),
		disabled,
		error,
		entityName = "logo",
		onFileSelect,
		onDrop,
		onDragOver,
		onDragLeave,
		onClearImage,
		onClickUpload,
		file
	}: Props = $props();
</script>

<div class="relative" ondrop={onDrop} ondragover={onDragOver} ondragleave={onDragLeave}>
	<input
		bind:this={fileInputElement}
		type="file"
		id="logo"
		name="logo"
		accept="image/*"
		class="hidden"
		onchange={onFileSelect}
		{disabled}
	/>

	<button
		type="button"
		onclick={onClickUpload}
		{disabled}
		class="group relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 active:scale-[0.98]"
		class:border-purple-500={dragActive}
		class:bg-purple-600-10={dragActive}
		class:border-purple-500-30={!dragActive && !previewUrl}
		class:border-success={previewUrl && !dragActive}
		class:bg-success-5={previewUrl && !dragActive}
		class:hover:border-purple-500-50={!disabled && !previewUrl}
		class:hover:bg-purple-600-10={!disabled && !previewUrl}
		class:opacity-50={disabled}
		class:input-error={error}
	>
		{#if !previewUrl}
			<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
				<div class="rounded-full bg-purple-600/20 p-3 transition-transform group-hover:scale-110">
					<FluentImage20Filled class="size-8 text-purple-400" />
				</div>
				<div class="text-center">
					<p class="text-base font-semibold text-white">
						{#if dragActive}
							Drop {entityName} here
						{:else if disabled}
							Uploading...
						{:else}
							Tap to upload {entityName}
						{/if}
					</p>
					{#if !disabled}
						<p class="mt-1 text-sm text-gray-400">Images only • 5MB max</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="relative">
				<div class="flex items-center justify-center p-6 bg-slate-900/50">
					<img src={previewUrl} alt="{entityName} preview" class="size-24 object-contain rounded-lg" />
				</div>
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<p class="text-base font-semibold text-white">Tap to change</p>
				</div>
				{#if file && !disabled}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							onClearImage();
						}}
						disabled={disabled}
						class="btn absolute top-2 right-2 btn-circle btn-sm bg-slate-800 hover:bg-slate-700"
					>
						✕
					</button>
				{/if}
			</div>
			{#if file}
				<div class="border-t border-slate-700 p-3 bg-slate-900/30">
					<p class="truncate text-sm font-medium text-white" title={file.name}>
						{file.name}
					</p>
					<p class="text-xs text-gray-400">
						{Math.round(file.size / 1024)} KB
					</p>
				</div>
			{/if}
		{/if}
	</button>
</div>

{#if error}
	<p class="text-xs text-red-400 mt-2">{error}</p>
{:else}
	<p class="text-xs text-gray-400 mt-2">
		Upload a new {entityName} to replace the current one • Will be converted to 96x96 WebP • Max 5MB
	</p>
{/if}
