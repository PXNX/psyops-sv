<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import SquareAvatar from "./SquareAvatar.svelte";

	let {
		name,
		avatar,
		description,
		bgColor
	}: {
		name: string;
		description: string;
		avatar: string;
		bgColor: string;
	} = $props();
</script>

<a
	class={`flinch flex items-center justify-between group ${bgColor}/50 hover:${bgColor}/20 rounded-lg p-3 transition-colors `}
	href="/team/1"
>
	<div class="flex items-center space-x-4">
		<div class={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center shadow-inner overflow-hidden`}>
			<SquareAvatar src={avatar} {bgColor} />
		</div>
		<div>
			<p class="font-medium">{name}</p>
			<p class="text-xs text-gray-400 flex items-center">
				{description}
			</p>
		</div>
	</div>
	<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
</a>
