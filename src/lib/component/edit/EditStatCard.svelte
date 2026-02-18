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
		green: "bg-green-600/20 text-green-400",
		purple: "bg-purple-600/20 text-purple-400",
		blue: "bg-blue-600/20 text-blue-400",
		red: "bg-red-600/20 text-red-400",
		amber: "bg-amber-600/20 text-amber-400"
	};
</script>

<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
	<div class="flex items-center gap-3">
		<div class="size-10 rounded-lg flex items-center justify-center {colorClasses[color]}">
			<Icon class="size-5" />
		</div>
		<div>
			<p class="text-xs text-gray-400">{label}</p>
			<p class="text-lg font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	</div>
</div>
