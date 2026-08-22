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
		const base = `rounded-md border ${paddingClasses[padding]} shadow-[0_14px_32px_rgba(2,10,21,0.18)]`;

		if (variant === "gradient" && gradientFrom) {
			return `${base} bg-[#14283f]/92 ${borderColor || "border-[#dfceb0]/20"} ${className}`.trim();
		}

		return `${base} bg-[#14283f]/92 border-[#dfceb0]/20 ${className}`.trim();
	});
</script>

<div class={cardClass}>
	{@render children()}
</div>
