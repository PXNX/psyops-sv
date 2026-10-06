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
		green: "bg-[#3f8a2a]/20 text-[#b9f29a]",
		purple: "bg-[#8a4fc0]/20 text-[#e3cbfb]",
		blue: "bg-[#2369b5]/20 text-[#b3dcff]",
		red: "bg-red-600/20 text-red-300",
		amber: "bg-[#f2b01e]/15 text-[#ffd35c]"
	};
</script>

<div class="panel rounded-sm p-4">
	<div class="flex items-center gap-3">
		<div class="size-10 rounded-sm flex items-center justify-center {colorClasses[color]}">
			<Icon class="size-5" />
		</div>
		<div>
			<p class="text-xs text-[#a8a083]">{label}</p>
			<p class="text-lg font-bold text-[#f5efd8]">{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	</div>
</div>
