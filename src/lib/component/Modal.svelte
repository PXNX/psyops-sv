<!-- /src/lib/component/Modal.svelte -->
<script lang="ts">
	import IconDismiss from "~icons/fluent/dismiss-24-regular";
	import IconArrowLeft from "~icons/fluent/arrow-left-24-regular";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import { fade, scale } from "svelte/transition";
	import { backOut, cubicIn } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";

	let {
		open = $bindable(false),
		title = "",
		onBack = null,
		size = "default",
		children
	}: {
		open: boolean;
		title?: string;
		onBack?: (() => void) | null;
		size?: "default" | "small" | "large";
		children: any;
	} = $props();

	const sizeClasses = {
		small: "max-w-sm",
		default: "max-w-lg",
		large: "max-w-2xl"
	};

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === "Escape") handleClose();
	}

	const motion = $derived(prefersReducedMotion.current ? 0 : 1);
	let box = $state<HTMLElement | null>(null);

	// Focus moves into the dialog and back to its opener; the page behind
	// doesn't scroll while it's open.
	$effect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		const { overflow } = document.body.style;
		document.body.style.overflow = "hidden";
		queueMicrotask(() => box?.focus({ preventScroll: true }));
		return () => {
			document.body.style.overflow = overflow;
			opener?.focus?.({ preventScroll: true });
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal-open modal z-5003"
		role="dialog"
		aria-modal="true"
		aria-label={title || undefined}
		transition:fade={{ duration: 140 * motion }}
	>
		<div
			bind:this={box}
			tabindex="-1"
			class="modal-box {sizeClasses[size]} rounded-sm panel outline-none"
			in:scale={{ start: 0.9, duration: 300 * motion, easing: backOut }}
			out:scale={{ start: 0.96, duration: 120 * motion, easing: cubicIn }}
		>
			<!-- Header with back button (optional) and close button -->
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if onBack}
						<IconButton icon={IconArrowLeft} label="Go back" size="sm" onclick={onBack} />
					{/if}
					{#if title}
						<h3 class="text-xl font-bold text-fg">{title}</h3>
					{/if}
				</div>
				<IconButton icon={IconDismiss} label="Close" size="sm" onclick={handleClose} />
			</div>

			<!-- Modal content -->
			<div class="modal-content">
				{@render children()}
			</div>
		</div>
		<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation"></div>
	</div>
{/if}
