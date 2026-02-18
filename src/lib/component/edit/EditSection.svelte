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

<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
	<div class="flex items-center gap-2">
		{#if Icon}
			<Icon class="size-5 text-purple-400" />
		{/if}
		<h2 class="text-lg font-semibold text-white">{title}</h2>
	</div>
	{@render children()}
</div>
