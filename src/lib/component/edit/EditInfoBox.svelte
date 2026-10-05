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
		if (cooldownHours) parts.push(`have a ${cooldownHours}-hour cooldown to prevent frequent modifications`);

		return parts.join(" and ") + ".";
	});

	const displayMessage = $derived(message || defaultMessage());
</script>

{#if displayMessage}
	<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-4">
		<p class="text-sm text-[#b7d0e6]">
			💡 <strong>Note:</strong>
			{displayMessage}
		</p>
	</div>
{/if}
