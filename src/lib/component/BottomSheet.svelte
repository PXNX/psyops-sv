<!-- src/lib/component/BottomSheet.svelte -->
<script lang="ts">
	import IconDismiss from "~icons/fluent/dismiss-24-regular";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import { fade, fly } from "svelte/transition";
	import { cubicIn } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";

	let {
		open = $bindable(false),
		title = "",
		children
	}: {
		open: boolean;
		title?: string;
		children: any;
	} = $props();

	// A punchier "back" overshoot than svelte/easing's backOut (s ~1.7) — bigger
	// s means the sheet overshoots further past rest before settling, reading as
	// a livelier, jumpier pop instead of a gentle slide.
	function bounceOut(t: number) {
		const s = 2.4;
		return --t * t * ((s + 1) * t + s) + 1;
	}

	// Spring up with a pronounced overshoot, drop away quickly on close.
	const motion = $derived(prefersReducedMotion.current ? 0 : 1);

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === "Escape") handleClose();
	}

	let panel = $state<HTMLElement | null>(null);

	// While open: move focus into the sheet (so keyboard and screen-reader
	// users land in it), stop the page behind from scrolling, and hand focus
	// back to whatever opened it on close.
	$effect(() => {
		if (!open) return;
		const opener = document.activeElement as HTMLElement | null;
		const { overflow } = document.body.style;
		document.body.style.overflow = "hidden";
		queueMicrotask(() => panel?.focus({ preventScroll: true }));
		return () => {
			document.body.style.overflow = overflow;
			opener?.focus?.({ preventScroll: true });
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-[5100]" role="dialog" aria-modal="true" aria-label={title || undefined}>
		<div
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={handleBackdropClick}
			role="presentation"
			transition:fade={{ duration: 150 * motion }}
		></div>

		<div
			class="absolute inset-x-0 -bottom-12"
			in:fly={{ y: 420, duration: 300 * motion, easing: bounceOut, opacity: 1 }}
			out:fly={{ y: 420, duration: 160 * motion, easing: cubicIn, opacity: 1 }}
		>
			<div
				bind:this={panel}
				tabindex="-1"
				class="outline-none bg-gradient-to-b from-[#2a3121] to-surface-3 border-t-2 border-line/50 shadow-[0_-12px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(220,230,255,0.12)] rounded-t-md max-h-[calc(85vh+3rem)] pb-12 flex flex-col"
			>
				<div class="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
					<div class="mx-auto w-10 h-1 rounded-full bg-line/25 absolute top-2 left-1/2 -translate-x-1/2"></div>
					{#if title}
						<h3 class="text-lg font-bold text-fg">{title}</h3>
					{:else}
						<div></div>
					{/if}
					<IconButton icon={IconDismiss} label="Close" variant="subtle" size="sm" onclick={handleClose} />
				</div>

				<div class="px-5 pb-5 overflow-y-auto">
					{@render children()}
				</div>
			</div>
		</div>
	</div>
{/if}
