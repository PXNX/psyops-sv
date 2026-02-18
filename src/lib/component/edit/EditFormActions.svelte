<script lang="ts">
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	interface Props {
		cancelHref: string;
		submitting: boolean;
		delayed: boolean;
		disabled: boolean;
		editCost?: number;
		submitLabel?: string;
	}

	let {
		cancelHref,
		submitting,
		delayed,
		disabled,
		editCost,
		submitLabel = "Save Changes"
	}: Props = $props();

	const submitText = $derived(
		editCost ? `${submitLabel} (${editCost.toLocaleString()})` : submitLabel
	);
</script>

<div class="flex gap-3">
	<a
		href={cancelHref}
		class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white"
		class:btn-disabled={submitting}
	>
		Cancel
	</a>
	<button
		type="submit"
		disabled={submitting || disabled}
		class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
	>
		{#if delayed === true}
			<span class="loading loading-spinner loading-sm"></span>
			Saving...
		{:else}
			<FluentCheckmark20Filled class="size-5" />
			{submitText}
		{/if}
	</button>
</div>
