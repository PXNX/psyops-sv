<!-- src/lib/component/GlobalImageCropper.svelte -->
<!-- One cropper for every image file input in the app. Forms that already
     drive their own cropper opt out with data-crop="own". Image validation is
     also central here, so every pick gets the same visible rejection reason. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "#lib/ui/toast.svelte.js";
	import ImageCropper from "./ImageCropper.svelte";

	const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

	let source = $state<string | null>(null);
	let target: HTMLInputElement | null = null;
	// Inputs we just filled from a crop are skipped once, so the change event
	// reaches the form without opening the cropper again.
	const cropped = new WeakSet<HTMLInputElement>();

	function problem(file: File): string | null {
		if (!file.type.startsWith("image/")) return "Images only — please choose an image file.";
		if (file.size > MAX_IMAGE_BYTES) return "Images must be 5MB or smaller.";
		if (file.size === 0) return "That image is empty.";
		return null;
	}

	onMount(() => {
		const onChange = (event: Event) => {
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
			const file = input.files?.[0];
			if (!file) return;
			const issue = problem(file);
			if (issue) {
				toast.error(issue);
				input.value = "";
				return;
			}
			if (input.dataset.crop === "own" || cropped.has(input)) return;
			target = input;
			source = URL.createObjectURL(file);
		};

		// Drop zones call their own handler; reject bad drops before they see
		// the file so the reason is shown instead of silently failing later.
		const onDrop = (event: DragEvent) => {
			const file = event.dataTransfer?.files?.[0];
			if (!file) return;
			const issue = problem(file);
			if (issue) {
				event.preventDefault();
				event.stopPropagation();
				toast.error(issue);
			}
		};

		document.addEventListener("change", onChange, true);
		document.addEventListener("drop", onDrop, true);
		return () => {
			document.removeEventListener("change", onChange, true);
			document.removeEventListener("drop", onDrop, true);
		};
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
