<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		variant?: "default" | "gradient";
		gradientFrom?: string;
		gradientTo?: string;
		borderColor?: string;
		padding?: "sm" | "md" | "lg";
		children: Snippet;
		class?: string;
	}

	let {
		variant = "default",
		gradientFrom = "",
		gradientTo = "",
		borderColor = "",
		padding = "md",
		children,
		class: className = ""
	}: Props = $props();

	const paddingClasses: Record<string, string> = {
		sm: "p-3 md:p-4",
		md: "p-4 md:p-5",
		lg: "p-5 md:p-6"
	};

	const cardClass = $derived.by(() => {
		const base = `panel rounded-sm ${paddingClasses[padding]}`;

		if (variant === "gradient" && gradientFrom) {
			return `${base} ${borderColor} ${className}`.trim();
		}

		return `${base} ${className}`.trim();
	});
</script>

<div class={cardClass}>
	{@render children()}
</div>
