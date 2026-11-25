<script lang="ts">
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import { buttonClass } from "#lib/component/ui/styles.js";

	interface Props {
		previewUrl: string | null;
		dragActive: boolean;
		fileInputElement: HTMLInputElement | undefined;
		disabled: boolean;
		error?: string;
		entityName?: string;
		aspectRatio?: number;
		onFileSelect: (event: Event) => void;
		onDrop: (event: DragEvent) => void;
		onDragOver: (event: DragEvent) => void;
		onDragLeave: () => void;
		onClearImage: () => void;
		onClickUpload: () => void;
		onCropComplete?: (croppedDataUrl: string) => void;
		file?: File;
	}

	let {
		previewUrl = $bindable(),
		dragActive = $bindable(),
		fileInputElement = $bindable(),
		disabled,
		error,
		entityName = "logo",
		aspectRatio = 1,
		onFileSelect,
		onDrop,
		onDragOver,
		onDragLeave,
		onClearImage,
		onClickUpload,
		onCropComplete,
		file
	}: Props = $props();

	// Cropping belongs to the sheet that owns the form: this component only
	// hands the picked file over. A second, nested cropper used to open here
	// and swallow the form's file value.
	const dropzoneClass = $derived(
		[
			"group relative w-full overflow-hidden rounded-sm border-2 border-dashed transition-all duration-200",
			dragActive
				? "border-primary bg-primary/10"
				: previewUrl
					? "border-positive/50 bg-positive-bg/10"
					: "border-primary/30",
			!disabled && !previewUrl ? "hover:border-primary/50 hover:bg-primary/10" : "",
			disabled ? "opacity-50" : "",
			error ? "border-red-500/50" : ""
		]
			.filter(Boolean)
			.join(" ")
	);
</script>

<div
	class="relative"
	ondrop={(event) => {
		event.preventDefault();
		dragActive = false;
		onDrop(event);
	}}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
>
	<input
		bind:this={fileInputElement}
		type="file"
		data-crop="own"
		id="logo"
		name="logo"
		accept="image/*"
		class="hidden"
		onchange={onFileSelect}
		{disabled}
	/>

	<button type="button" onclick={onClickUpload} {disabled} class={dropzoneClass}>
		{#if !previewUrl}
			<div class="flex min-h-[120px] flex-col items-center justify-center gap-3 p-6">
				<div class="rounded-full bg-primary/15 p-3">
					<FluentImage20Filled class="size-8 text-primary-fg" />
				</div>
				<div class="text-center">
					<p class="text-base font-semibold text-fg">
						{#if dragActive}
							Drop {entityName} here
						{:else if disabled}
							Uploading...
						{:else}
							Tap to upload {entityName}
						{/if}
					</p>
					{#if !disabled}
						<p class="mt-1 text-sm text-fg-muted">Images only • 5MB max</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="relative">
				<div class="flex items-center justify-center p-6 bg-surface-4/70">
					<img
						loading="lazy"
						decoding="async"
						src={previewUrl}
						alt="{entityName} preview"
						class="size-24 object-contain rounded-sm"
					/>
				</div>
				<div
					class="absolute inset-0 flex items-center justify-center bg-surface-1/60 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<p class="text-base font-semibold text-fg">Tap to change</p>
				</div>
			</div>
			{#if file}
				<div class="border-t border-line/15 p-3 bg-surface-4/70">
					<p class="truncate text-sm font-medium text-fg" title={file.name}>
						{file.name}
					</p>
					<p class="text-xs text-fg-muted">
						{Math.round(file.size / 1024)} KB
					</p>
				</div>
			{/if}
		{/if}
	</button>
	{#if file && !disabled}
		<button
			aria-label="Remove image"
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onClearImage();
			}}
			{disabled}
			class="{buttonClass({ variant: 'secondary', size: 'sm', shape: 'circle' })} absolute top-2 right-2"
		>
			✕
		</button>
	{/if}
</div>

{#if error}
	<p class="text-xs text-red-400 mt-2">{error}</p>
{:else}
	<p class="text-xs text-fg-muted mt-2">
		Upload a new {entityName} to replace the current one • Will be converted to 96x96 WebP • Max 5MB
	</p>
{/if}
