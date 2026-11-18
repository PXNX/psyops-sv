<script lang="ts">
	interface Props {
		message: string | undefined;
	}

	let { message }: Props = $props();

	const isError = $derived(
		message &&
			(message.includes("error") ||
				message.includes("failed") ||
				message.includes("wait") ||
				message.includes("Insufficient"))
	);
</script>

{#if message}
	<div
		class="rounded-sm p-4 border {isError
			? 'bg-red-600/10 border-red-500/30 text-red-300'
			: 'bg-[#1f9d62]/18 border-[#4fd88a]/30 text-[#aef3c9]'}"
	>
		<p class="text-sm font-medium">
			{message}
		</p>
	</div>
{/if}
