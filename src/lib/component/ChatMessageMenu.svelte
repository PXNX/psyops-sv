<script lang="ts">
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";

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
	<button
		onclick={() => (showSheet = true)}
		class="btn btn-ghost btn-xs text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
		type="button"
	>
		<FluentMoreVertical20Filled class="size-4" />
	</button>

	<BottomSheet bind:open={showSheet} title="Message Actions">
		<div class="space-y-1">
			{#if onReport}
				<button
					onclick={() => {
						onReport?.();
						showSheet = false;
					}}
					class="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-colors"
				>
					<div class="size-10 bg-yellow-600/20 rounded-lg flex items-center justify-center shrink-0">
						<FluentFlag20Filled class="size-5 text-yellow-400" />
					</div>
					<div>
						<p class="font-medium text-white">Report Message</p>
						<p class="text-xs text-gray-400">Flag this message for review</p>
					</div>
				</button>
			{/if}

			{#if allowBlock && onBlock}
				<button
					onclick={() => {
						onBlock?.();
						showSheet = false;
					}}
					class="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-colors"
				>
					<div class="size-10 bg-red-600/20 rounded-lg flex items-center justify-center shrink-0">
						<FluentPersonProhibited20Filled class="size-5 text-red-400" />
					</div>
					<div>
						<p class="font-medium text-white">Block {senderName}</p>
						<p class="text-xs text-gray-400">Hide messages and prevent contact</p>
					</div>
				</button>
			{/if}
		</div>
	</BottomSheet>
</div>
