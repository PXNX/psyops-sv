<script lang="ts">
	import { onMount } from "svelte";
	import IconClose from "~icons/fluent/dismiss-20-filled";
	import IconCheck from "~icons/fluent/checkmark-20-filled";

	interface Props {
		imageUrl: string;
		aspectRatio?: number; // e.g., 1 for square, 16/9 for widescreen
		onCrop?: (croppedDataUrl: string) => void;
		onCancel?: () => void;
		title?: string;
		cropButtonText?: string;
	}

	let {
		imageUrl,
		aspectRatio = 1,
		onCrop,
		onCancel,
		title = "Crop Image",
		cropButtonText = "Crop"
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let img: HTMLImageElement;
	let container: HTMLDivElement;

	let cropX = $state(0);
	let cropY = $state(0);
	let cropWidth = $state(0);
	let cropHeight = $state(0);
	let isDragging = $state(false);
	let dragHandle = $state<"move" | "se" | null>(null);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let startCropX = $state(0);
	let startCropY = $state(0);
	let startCropWidth = $state(0);
	let startCropHeight = $state(0);

	const MIN_SIZE = 50;
	const HANDLE_SIZE = 12;

	onMount(() => {
		img.onload = () => {
			initializeCrop();
			drawCanvas();
		};

		if (img.complete) {
			initializeCrop();
			drawCanvas();
		}
	});

	function initializeCrop() {
		if (!img) return;
		const imgRect = img.getBoundingClientRect();

		const displayWidth = imgRect.width;
		const displayHeight = imgRect.height;

		if (displayWidth === 0 || displayHeight === 0) return;

		// Calculate initial crop area (80% of image, centered)
		const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
		cropWidth = initialSize;
		cropHeight = aspectRatio ? initialSize / aspectRatio : initialSize;

		// Ensure crop area fits within image
		if (cropHeight > displayHeight) {
			cropHeight = displayHeight;
			cropWidth = cropHeight * (aspectRatio || 1);
		}
		if (cropWidth > displayWidth) {
			cropWidth = displayWidth;
			cropHeight = cropWidth / (aspectRatio || 1);
		}

		cropX = (displayWidth - cropWidth) / 2;
		cropY = (displayHeight - cropHeight) / 2;
	}

	function drawCanvas() {
		if (!canvas || !img) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const imgRect = img.getBoundingClientRect();
		const displayWidth = imgRect.width;
		const displayHeight = imgRect.height;

		if (displayWidth === 0 || displayHeight === 0) return;

		canvas.width = displayWidth;
		canvas.height = displayHeight;

		// Draw semi-transparent overlay
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.fillRect(0, 0, displayWidth, displayHeight);

		// Clear crop area
		ctx.clearRect(cropX, cropY, cropWidth, cropHeight);

		// Draw crop border
		ctx.strokeStyle = "#3b82f6";
		ctx.lineWidth = 2;
		ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

		// Draw grid lines
		ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
		ctx.lineWidth = 1;
		for (let i = 1; i < 3; i++) {
			const x = cropX + (cropWidth / 3) * i;
			const y = cropY + (cropHeight / 3) * i;
			ctx.beginPath();
			ctx.moveTo(x, cropY);
			ctx.lineTo(x, cropY + cropHeight);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(cropX, y);
			ctx.lineTo(cropX + cropWidth, y);
			ctx.stroke();
		}

		// Draw resize handle
		const handleX = cropX + cropWidth;
		const handleY = cropY + cropHeight;
		ctx.fillStyle = "#3b82f6";
		ctx.fillRect(handleX - HANDLE_SIZE / 2, handleY - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
		ctx.strokeStyle = "white";
		ctx.lineWidth = 2;
		ctx.strokeRect(handleX - HANDLE_SIZE / 2, handleY - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
	}

	function getMousePos(event: MouseEvent) {
		const imgRect = img.getBoundingClientRect();
		return {
			x: event.clientX - imgRect.left,
			y: event.clientY - imgRect.top
		};
	}

	function isNearHandle(x: number, y: number): boolean {
		const handleX = cropX + cropWidth;
		const handleY = cropY + cropHeight;
		const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));
		return distance < HANDLE_SIZE + 10;
	}

	function isInCropArea(x: number, y: number): boolean {
		return x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight;
	}

	function handleMouseDown(event: MouseEvent) {
		const pos = getMousePos(event);

		if (isNearHandle(pos.x, pos.y)) {
			isDragging = true;
			dragHandle = "se";
			dragStartX = event.clientX;
			dragStartY = event.clientY;
			startCropWidth = cropWidth;
			startCropHeight = cropHeight;
			event.preventDefault();
		} else if (isInCropArea(pos.x, pos.y)) {
			isDragging = true;
			dragHandle = "move";
			dragStartX = event.clientX;
			dragStartY = event.clientY;
			startCropX = cropX;
			startCropY = cropY;
			event.preventDefault();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;

		const deltaX = event.clientX - dragStartX;
		const deltaY = event.clientY - dragStartY;

		const imgRect = img.getBoundingClientRect();
		const displayWidth = imgRect.width;
		const displayHeight = imgRect.height;

		if (dragHandle === "se") {
			let newWidth = startCropWidth + deltaX;
			let newHeight = startCropHeight + deltaY;

			// Maintain aspect ratio
			if (aspectRatio) {
				newHeight = newWidth / aspectRatio;
			}

			// Enforce minimum size
			newWidth = Math.max(MIN_SIZE, newWidth);
			newHeight = Math.max(MIN_SIZE, newHeight);

			// Enforce maximum size
			if (cropX + newWidth > displayWidth) {
				newWidth = displayWidth - cropX;
				if (aspectRatio) newHeight = newWidth / aspectRatio;
			}
			if (cropY + newHeight > displayHeight) {
				newHeight = displayHeight - cropY;
				if (aspectRatio) newWidth = newHeight * aspectRatio;
			}

			cropWidth = newWidth;
			cropHeight = newHeight;
		} else if (dragHandle === "move") {
			let newX = startCropX + deltaX;
			let newY = startCropY + deltaY;

			// Constrain to image bounds
			newX = Math.max(0, Math.min(newX, displayWidth - cropWidth));
			newY = Math.max(0, Math.min(newY, displayHeight - cropHeight));

			cropX = newX;
			cropY = newY;
		}

		drawCanvas();
	}

	function handleMouseUp() {
		isDragging = false;
		dragHandle = null;
	}

	function handleCrop() {
		if (!img || !canvas) return;

		// Create a temporary canvas for the cropped image
		const tempCanvas = document.createElement("canvas");
		const ctx = tempCanvas.getContext("2d");
		if (!ctx) return;

		// Calculate scale from display coordinates to actual image coordinates
		const scaleX = img.naturalWidth / img.width;
		const scaleY = img.naturalHeight / img.height;

		const actualCropX = cropX * scaleX;
		const actualCropY = cropY * scaleY;
		const actualCropWidth = cropWidth * scaleX;
		const actualCropHeight = cropHeight * scaleY;

		tempCanvas.width = actualCropWidth;
		tempCanvas.height = actualCropHeight;

		ctx.drawImage(
			img,
			actualCropX,
			actualCropY,
			actualCropWidth,
			actualCropHeight,
			0,
			0,
			actualCropWidth,
			actualCropHeight
		);

		const croppedDataUrl = tempCanvas.toDataURL("image/png");
		onCrop?.(croppedDataUrl);
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="modal modal-open">
	<div class="modal-box w-full max-w-2xl">
		<h3 class="font-bold text-lg mb-4">{title}</h3>

		<div class="relative bg-black rounded-lg overflow-hidden mb-4" bind:this={container}>
			<img
				bind:this={img}
				src={imageUrl}
				alt="Crop preview"
				class="w-full h-auto block pointer-events-none"
			/>
			<canvas
				bind:this={canvas}
				class="absolute top-0 left-0 cursor-move"
				style="display: block; width: 100%; height: 100%;"
				onmousedown={handleMouseDown}
			/>
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" onclick={onCancel}>
				<IconClose class="w-5 h-5" />
				Cancel
			</button>
			<button class="btn btn-primary" onclick={handleCrop}>
				<IconCheck class="w-5 h-5" />
				{cropButtonText}
			</button>
		</div>
	</div>
</div>

<style>
	canvas {
		cursor: move;
		touch-action: none;
	}
</style>
