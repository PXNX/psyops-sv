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
			: 'bg-[#587252]/18 border-[#8fae88]/30 text-[#c6dfbf]'}"
	>
		<p class="text-sm font-medium">
			{message}
		</p>
	</div>
{/if}
