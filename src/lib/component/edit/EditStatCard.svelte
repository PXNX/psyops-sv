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
		green: "bg-[#1f9d62]/20 text-[#aef3c9]",
		purple: "bg-[#7451e6]/20 text-[#e6dcff]",
		blue: "bg-[#2f6be0]/20 text-[#c3dbff]",
		red: "bg-red-600/20 text-red-300",
		amber: "bg-[#f5a524]/15 text-[#ffcb6b]"
	};
</script>

<div class="panel rounded-sm p-4">
	<div class="flex items-center gap-3">
		<div class="size-10 rounded-sm flex items-center justify-center {colorClasses[color]}">
			<Icon class="size-5" />
		</div>
		<div>
			<p class="text-xs text-[#8e9abb]">{label}</p>
			<p class="text-lg font-bold text-[#eef2ff]">{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	</div>
</div>
