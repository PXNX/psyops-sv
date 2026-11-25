<!-- One cropper for every image file input in the app. Forms that already
     drive their own cropper opt out with data-crop="own". -->
<script lang="ts">
	import { onMount } from "svelte";
	import ImageCropper from "./ImageCropper.svelte";

	let source = $state<string | null>(null);
	let target: HTMLInputElement | null = null;
	// Inputs we just filled from a crop are skipped once, so the change event
	// reaches the form without opening the cropper again.
	const cropped = new WeakSet<HTMLInputElement>();

	onMount(() => {
		const onChange = (event: Event) => {
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
			if (input.dataset.crop === "own" || cropped.has(input)) return;
			const file = input.files?.[0];
			if (!file || !file.type.startsWith("image/")) return;
			target = input;
			source = URL.createObjectURL(file);
		};
		document.addEventListener("change", onChange, true);
		return () => document.removeEventListener("change", onChange, true);
	});

	function cleanup() {
		if (source) URL.revokeObjectURL(source);
		source = null;
		target = null;
	}

	function cancel() {
		if (target) target.value = "";
		cleanup();
	}

	function crop(dataUrl: string) {
		const input = target;
		if (!input || !source) return;
		fetch(dataUrl)
			.then((r) => r.blob())
			.then((blob) => {
				const name = (input.files?.[0]?.name ?? "image").replace(/\.[^.]+$/, "");
				const file = new File([blob], `${name}.png`, { type: "image/png" });
				const transfer = new DataTransfer();
				transfer.items.add(file);
				Object.defineProperty(input, "files", { value: transfer.files, configurable: true, writable: true });
				cropped.add(input);
				input.dispatchEvent(new Event("change", { bubbles: true }));
				cropped.delete(input);
				cleanup();
			});
	}
</script>

{#if source}
	<!-- Keep the crop above every sheet, toast and confirmation dialog. -->
	<div class="relative" style="z-index: 2147483000;">
		<ImageCropper
			imageUrl={source}
			aspectRatio={1}
			title="Crop image"
			cropButtonText="Use this crop"
			onCrop={crop}
			onCancel={cancel}
		/>
	</div>
{/if}
