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
		class="rounded-xl p-4 border"
		class:bg-green-600-20={!isError}
		class:border-green-500-30={!isError}
		class:bg-red-600-20={isError}
		class:border-red-500-30={isError}
	>
		<p class="text-sm font-medium" class:text-green-300={!isError} class:text-red-300={isError}>
			{message}
		</p>
	</div>
{/if}
