<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import SquareAvatar from "./SquareAvatar.svelte";
	import type { SvelteHTMLElements, SVGAttributes } from "svelte/elements";
	import type { Component } from "svelte";

	let {
		name,
		avatar,
		description,
		date,
		href,
		bgColor,
		Component
	}: {
		name: string;
		description: string;
		date: Date;
		avatar: string;
		href: string;
		bgColor: string;
		Component: Component;
	} = $props();
</script>

<a
	class={`flinch flex items-center justify-between group ${bgColor}/50 hover:${bgColor}/20 rounded-lg px-2 py-1 transition-colors `}
	{href}
>
	<div class="flex items-center space-x-4">
		<div class={`size-12 ${bgColor} rounded-full flex items-center justify-center shadow-inner overflow-hidden`}>
			<SquareAvatar src={avatar} {bgColor} />
		</div>
		<div>
			<p class="font-medium">{name}</p>
			<p class="text-xs text-gray-400 flex items-center">
				{description} • {date.toLocaleDateString()}
			</p>
		</div>
	</div>
	<Component class="size-5 text-gray-200 group-hover:text-yellow-500 transition-colors" />
</a>
