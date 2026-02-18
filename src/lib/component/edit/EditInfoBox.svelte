<script lang="ts">
	interface Props {
		editCost?: number;
		cooldownHours?: number;
		message?: string;
	}

	let { editCost, cooldownHours, message }: Props = $props();

	const defaultMessage = $derived(() => {
		if (!editCost && !cooldownHours) return null;

		const parts = [];
		if (editCost) parts.push(`Changes cost ${editCost.toLocaleString()} currency`);
		if (cooldownHours)
			parts.push(`have a ${cooldownHours}-hour cooldown to prevent frequent modifications`);

		return parts.join(" and ") + ".";
	});

	const displayMessage = $derived(message || defaultMessage());
</script>

{#if displayMessage}
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<p class="text-sm text-blue-300">
			💡 <strong>Note:</strong>
			{displayMessage}
		</p>
	</div>
{/if}
