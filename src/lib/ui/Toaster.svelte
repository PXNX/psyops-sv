<!-- src/lib/ui/Toaster.svelte — renders the toast stack; mount once in the root layout. -->
<script lang="ts">
	import { flip } from "svelte/animate";
	import { fly, scale } from "svelte/transition";
	import { backOut, cubicIn } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";
	import { MediaQuery } from "svelte/reactivity";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import FluentErrorCircle20Filled from "~icons/fluent/error-circle-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDismiss16Filled from "~icons/fluent/dismiss-16-filled";
	import { toast, type ToastTone } from "./toast.svelte";

	const tones: Record<ToastTone, { icon: typeof FluentInfo20Filled; box: string; icon_: string; bar: string }> = {
		success: {
			icon: FluentCheckmarkCircle20Filled,
			box: "border-[#4fd88a]/45",
			icon_: "text-[#4fd88a]",
			bar: "bg-[#4fd88a]"
		},
		error: { icon: FluentErrorCircle20Filled, box: "border-red-500/50", icon_: "text-red-400", bar: "bg-red-500" },
		info: { icon: FluentInfo20Filled, box: "border-[#6aa8ff]/45", icon_: "text-[#6aa8ff]", bar: "bg-[#6aa8ff]" },
		warning: {
			icon: FluentWarning20Filled,
			box: "border-[#f5a524]/55",
			icon_: "text-[#ffcb6b]",
			bar: "bg-[#f5a524]"
		}
	};

	const motion = $derived(prefersReducedMotion.current ? 0 : 1);

	// Toasts drop in from the top on mobile and rise from below on desktop.
	const desktop = new MediaQuery("min-width: 640px");
	const fromBelow = $derived(desktop.current);
</script>

<!-- Top of the screen on mobile (clear of the dock and of bottom sheets),
     bottom-right on desktop. Polite region so screen readers announce
     messages without interrupting. -->
<div
	class="toaster pointer-events-none fixed inset-x-0 top-0 z-[6000] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:top-auto sm:bottom-20 sm:items-end sm:px-5 sm:pt-0"
	role="status"
	aria-live="polite"
>
	{#each toast.items as item (item.id)}
		{@const tone = tones[item.tone]}
		<div
			animate:flip={{ duration: 220 * motion }}
			in:fly={{ y: fromBelow ? 24 : -24, duration: 340 * motion, easing: backOut }}
			out:scale={{ start: 0.92, duration: 160 * motion, easing: cubicIn }}
			class="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-sm border-2 {tone.box} toast-plate"
			role={item.tone === "error" ? "alert" : undefined}
			onpointerenter={() => toast.hold(item.id)}
			onpointerleave={() => toast.release(item.id)}
		>
			<div class="flex items-start gap-3 py-3 pr-2 pl-3.5">
				<tone.icon class="mt-0.5 size-5 shrink-0 toast-icon {tone.icon_}" />
				<p class="min-w-0 flex-1 text-sm font-medium break-words text-[#eef2ff]">{item.message}</p>
				<button
					type="button"
					class="press-spring -my-1 grid size-8 shrink-0 place-items-center rounded-sm text-[#8e9abb] hover:bg-[#f5a524]/10 hover:text-[#eef2ff]"
					aria-label="Dismiss"
					onclick={() => toast.dismiss(item.id)}
				>
					<FluentDismiss16Filled class="size-4" />
				</button>
			</div>
			{#if item.duration > 0}
				<!-- Fuse: shows how long the toast has left. -->
				<div
					class="toast-fuse absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-60 {tone.bar}"
					style:animation-duration="{item.duration}ms"
				></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	@reference "../../app.css";

	.toast-plate {
		background: linear-gradient(180deg, rgba(28, 38, 66, 0.98) 0%, rgba(19, 28, 51, 0.98) 100%);
		box-shadow:
			0 12px 30px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(220, 230, 255, 0.12);
	}

	.toast-fuse {
		animation: toast-fuse linear forwards;
	}

	/* Hovering pauses the timer (see toast.hold), so pause the fuse too. */
	.toast-plate:hover .toast-fuse {
		animation-play-state: paused;
	}

	@keyframes toast-fuse {
		to {
			transform: scaleX(0);
		}
	}

	:global(.toast-icon) {
		animation: pop-in 360ms cubic-bezier(0.34, 1.8, 0.5, 1) 80ms backwards;
	}

	@media (prefers-reduced-motion: reduce) {
		.toast-fuse,
		:global(.toast-icon) {
			animation: none;
		}
	}
</style>
