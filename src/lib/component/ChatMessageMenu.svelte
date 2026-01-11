<script lang="ts">
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";

	interface Props {
		messageId: number;
		senderId: string;
		senderName: string;
		allowBlock?: boolean; // Only true for direct messages
		onReport?: () => void;
		onBlock?: () => void;
	}

	let { messageId, senderId, senderName, allowBlock = false, onReport, onBlock }: Props = $props();

	let showMenu = $state(false);
	let menuButton: HTMLButtonElement;

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function handleClickOutside(event: MouseEvent) {
		if (menuButton && !menuButton.contains(event.target as Node)) {
			showMenu = false;
		}
	}

	$effect(() => {
		if (showMenu) {
			document.addEventListener("click", handleClickOutside);
			return () => document.removeEventListener("click", handleClickOutside);
		}
	});
</script>

// src/lib/component/ChatMessageMenu.svelte
<div class="relative">
	<button
		bind:this={menuButton}
		onclick={toggleMenu}
		class="btn btn-ghost btn-xs text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
		type="button"
	>
		<FluentMoreVertical20Filled class="size-4" />
	</button>

	{#if showMenu}
		<div class="absolute right-0 top-8 z-50 bg-slate-700 border border-white/10 rounded-lg shadow-xl min-w-40 py-1">
			{#if onReport}
				<button
					onclick={() => {
						onReport?.();
						showMenu = false;
					}}
					class="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-slate-600 flex items-center gap-2"
				>
					<FluentFlag20Filled class="size-4 text-yellow-400" />
					Report Message
				</button>
			{/if}

			{#if allowBlock && onBlock}
				<button
					onclick={() => {
						onBlock?.();
						showMenu = false;
					}}
					class="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-slate-600 flex items-center gap-2"
				>
					<FluentPersonProhibited20Filled class="size-4 text-red-400" />
					Block User
				</button>
			{/if}
		</div>
	{/if}
</div>
