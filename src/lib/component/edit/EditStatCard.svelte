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
		green: "bg-[#587252]/20 text-[#c6dfbf]",
		purple: "bg-[#8c709b]/20 text-[#d5c4df]",
		blue: "bg-[#315d8d]/20 text-[#b7d0e6]",
		red: "bg-red-600/20 text-red-300",
		amber: "bg-[#e6a527]/15 text-[#f7c56b]"
	};
</script>

<div class="panel rounded-xl p-4">
	<div class="flex items-center gap-3">
		<div class="size-10 rounded-lg flex items-center justify-center {colorClasses[color]}">
			<Icon class="size-5" />
		</div>
		<div>
			<p class="text-xs text-[#a89e8e]">{label}</p>
			<p class="text-lg font-bold text-[#fff7e8]">{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	</div>
</div>
