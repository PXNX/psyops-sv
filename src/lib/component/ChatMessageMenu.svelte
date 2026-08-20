<script lang="ts">
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";
	import IconButton from "$lib/component/ui/IconButton.svelte";
	import ActionListItem from "$lib/component/ui/ActionListItem.svelte";

	interface Props {
		messageId: number;
		senderId: string;
		senderName: string;
		allowBlock?: boolean;
		onReport?: () => void;
		onBlock?: () => void;
	}

	let { messageId, senderId, senderName, allowBlock = false, onReport, onBlock }: Props = $props();

	let showSheet = $state(false);
</script>

<div class="relative">
	<IconButton
		icon={FluentMoreVertical20Filled}
		label="Message actions"
		size="xs"
		class="opacity-0 transition-opacity group-hover:opacity-100"
		type="button"
		onclick={() => (showSheet = true)}
	/>

	<BottomSheet bind:open={showSheet} title="Message Actions">
		<div class="space-y-1">
			{#if onReport}
				<ActionListItem
					icon={FluentFlag20Filled}
					tone="yellow"
					title="Report Message"
					description="Flag this message for review"
					onclick={() => {
						onReport?.();
						showSheet = false;
					}}
				/>
			{/if}

			{#if allowBlock && onBlock}
				<ActionListItem
					icon={FluentPersonProhibited20Filled}
					tone="red"
					title="Block {senderName}"
					description="Hide messages and prevent contact"
					onclick={() => {
						onBlock?.();
						showSheet = false;
					}}
				/>
			{/if}
		</div>
	</BottomSheet>
</div>
