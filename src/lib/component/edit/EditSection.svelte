<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ComponentType } from "svelte";

	interface Props {
		title: string;
		icon?: ComponentType;
		children: Snippet;
	}

	let { title, icon: Icon, children }: Props = $props();
</script>

<div class="panel rounded-xl p-5 space-y-3">
	<div class="flex items-center gap-2">
		{#if Icon}
			<Icon class="size-5 text-[#e6a527]" />
		{/if}
		<h2 class="text-lg font-semibold text-[#fff7e8]">{title}</h2>
	</div>
	{@render children()}
</div>
