<!-- src/routes/(authenticated)/(dock)/visas/PassportPage.svelte -->
<!-- A passport page: cream security paper with guilloche bands, a running
     header and a page number. Content (fields, stamps) goes in children. -->
<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		heading?: string;
		page?: string | number | null;
		class?: string;
		children: Snippet;
	}

	let { heading = "Visas", page = null, class: className = "", children }: Props = $props();
</script>

<div
	class="relative overflow-hidden rounded-sm text-[#3b2a14] {className}"
	style="background:
		radial-gradient(circle at 80% 20%, rgba(120, 160, 140, 0.12), transparent 55%),
		repeating-radial-gradient(circle at 15% 110%, transparent 0 7px, rgba(91, 61, 26, 0.045) 7px 8px),
		linear-gradient(145deg, #f5f0e4 0%, #ece5d3 55%, #e5dcc6 100%);
		box-shadow: 0 2px 14px rgba(0, 0, 0, 0.4), inset 0 0 50px rgba(91, 61, 26, 0.06);"
>
	<div class="pointer-events-none absolute inset-[5px] border border-[#7a5427]/20 rounded-sm"></div>
	<div
		class="relative flex items-center justify-between px-4 pt-3 text-[9px] font-bold uppercase tracking-[0.3em] text-[#7a5427]/60"
	>
		<span>{heading}</span>
		{#if page != null}
			<span class="font-mono tracking-normal">{page}</span>
		{/if}
	</div>
	<div class="relative p-4 pt-2">
		{@render children()}
	</div>
</div>
