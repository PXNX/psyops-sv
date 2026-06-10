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
		const base = `rounded-xl border ${paddingClasses[padding]}`;

		if (variant === "gradient" && gradientFrom) {
			return `${base} bg-gradient-to-br ${gradientFrom} ${gradientTo} ${borderColor || "border-white/10"} ${className}`.trim();
		}

		return `${base} bg-slate-800/50 border-white/5 ${className}`.trim();
	});
</script>

<div class={cardClass}>
	{@render children()}
</div>
