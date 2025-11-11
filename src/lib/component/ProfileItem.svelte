<!-- src/lib/component/ProfileItem.svelte -->
<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import SquareAvatar from "./SquareAvatar.svelte";
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
	class="group flex items-center justify-between bg-slate-800/20 hover:bg-slate-700/30 rounded-lg px-3 py-3 transition-all duration-200 border border-transparent hover:border-white/5"
	{href}
>
	<div class="flex items-center gap-3 min-w-0">
		<div class="relative shrink-0">
			<div class="{bgColor} size-11 rounded-lg flex items-center justify-center shadow-lg ring-1 ring-white/10">
				<Component class="size-5 text-white" />
			</div>
		</div>
		<div class="min-w-0 flex-1">
			<p class="font-semibold text-gray-100 truncate">{name}</p>
			<p class="text-xs text-gray-400 flex items-center gap-1">
				<span class="truncate">{description}</span>
				<span class="text-gray-600">•</span>
				<time class="shrink-0">{date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</time>
			</p>
		</div>
	</div>
	<FluentChevronRight20Filled
		class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0 ml-2"
	/>
</a>
