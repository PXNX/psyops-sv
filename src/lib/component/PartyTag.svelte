<!-- src/lib/component/PartyTag.svelte -->
<script lang="ts">
	interface Props {
		abbreviation?: string | null;
		color?: string | null;
	}

	let { abbreviation, color = "#6366f1" }: Props = $props();
</script>

{#if abbreviation}
	<span
		class="inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide align-middle"
		style="background-color: {color}22; color: {color}; border: 1px solid {color}55"
	>
		{abbreviation}
	</span>
{/if}
