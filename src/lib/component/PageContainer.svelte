<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
		children: Snippet;
		class?: string;
	}

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

	let { maxWidth = "4xl", children, class: className = "" }: Props = $props();

	const containerClass = $derived(
		maxWidth === "full"
			? `w-full px-4 py-6 space-y-6 ${className}`.trim()
			: `${maxWidthClasses[maxWidth]} mx-auto px-4 py-6 space-y-6 ${className}`.trim()
	);
</script>

<div class={containerClass}>
	{@render children()}
</div>
