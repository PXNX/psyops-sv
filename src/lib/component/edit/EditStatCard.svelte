<script lang="ts">
	import type { ComponentType } from "svelte";

	interface Props {
		label: string;
		value: string | number;
		icon: ComponentType;
		color?: "green" | "purple" | "blue" | "red" | "amber";
	}

	let { label, value, icon: Icon, color = "purple" }: Props = $props();

	const colorClasses = {
		green: "bg-positive-bg/20 text-positive-fg",
		purple: "bg-politics-bg/20 text-politics-fg",
		blue: "bg-friendly-bg/20 text-friendly-fg",
		red: "bg-red-600/20 text-red-300",
		amber: "bg-accent/15 text-accent-fg"
	};
</script>

<div class="panel rounded-sm p-4">
	<div class="flex items-center gap-3">
		<div class="size-10 rounded-sm flex items-center justify-center {colorClasses[color]}">
			<Icon class="size-5" />
		</div>
		<div>
			<p class="text-xs text-fg-muted">{label}</p>
			<p class="text-lg font-bold text-fg">{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	</div>
</div>
