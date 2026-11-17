<script lang="ts">
	import { untrack } from "svelte";
	import { get } from "svelte/store";
	import type { Snippet } from "svelte";
	import { viewTransitionActive } from "#lib/utils/motion.js";

	interface Props {
		maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
		children: Snippet;
		class?: string;
		/** Skip the entrance cascade (already inside a view transition, or testing). */
		animate?: boolean;
	}

	const { maxWidth = "4xl", children, class: className = "", animate = true }: Props = $props();

	// Read once at mount: if a view transition is mid-swap, the entrance
	// cascade would be frozen into its snapshot — skip it entirely.
	const entrance = untrack(() => animate) && !get(viewTransitionActive);

	const maxWidthClasses: Record<string, string> = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
		"2xl": "max-w-2xl",
		"3xl": "max-w-3xl",
		"4xl": "max-w-4xl",
		"5xl": "max-w-5xl",
		"6xl": "max-w-6xl",
		"7xl": "max-w-7xl",
		full: "w-full"
	};

	const containerClass = $derived(
		maxWidth === "full"
			? `w-full px-4 py-6 ${className}`.trim()
			: `w-full ${maxWidthClasses[maxWidth]} mx-auto px-4 py-6 ${className}`.trim()
	);
</script>

<div class={containerClass}>
	<div class="space-y-6 {entrance ? 'rise-stagger' : ''}">
		{@render children()}
	</div>
</div>
