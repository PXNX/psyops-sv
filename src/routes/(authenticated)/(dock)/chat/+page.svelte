<!-- src/routes/(authenticated)/chat/+page.svelte -->
<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentProhibited20Filled from "~icons/fluent/prohibited-20-filled";
	import { formatTime } from "$lib/utils/formatting.js";

	const { data } = $props();

	let eventSource: EventSource | null = null;

	onMount(() => {
		// Connect to SSE endpoint
		eventSource = new EventSource("/chat/stream");

		eventSource.addEventListener("message", (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "new_messages") {
				// Refresh data when new messages arrive
				invalidateAll();
			}
		});

		eventSource.addEventListener("error", () => {
			console.log("SSE connection lost, reconnecting...");
			// Auto-reconnect is handled by EventSource
		});
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});
</script>

<div class="flex items-center gap-3 mb-6">
	<FluentChat20Filled class="size-8 text-blue-400" />
	<h1 class="text-3xl font-bold text-white">Messages</h1>
</div>

<div class="space-y-4">
	<!-- Global Chat -->
	<button
		onclick={() => goto("/chat/en")}
		class="w-full bg-slate-700/50 hover:bg-slate-700 border border-white/5 rounded-lg p-4 transition-colors text-left group"
	>
		<div class="flex items-center gap-4">
			<div class="size-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
				<FluentEarth20Filled class="size-6 text-white" />
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1">
					<h3 class="font-semibold text-white">Global Chat (English)</h3>
					<span class="badge badge-sm bg-blue-600/20 text-blue-400 border-blue-600/30">Global</span>
				</div>
				{#if data.globalChat?.lastMessage}
					<p class="text-sm text-gray-400 truncate">
						{data.globalChat.lastMessage.senderName}: {data.globalChat.lastMessage.content}
					</p>
					<p class="text-xs text-gray-500 mt-1">{formatTime(data.globalChat.lastMessage.sentAt)}</p>
				{:else}
					<p class="text-sm text-gray-500">No messages yet</p>
				{/if}
			</div>

			<div class="flex items-center gap-2 flex-shrink-0">
				{#if data.globalChat?.unreadCount > 0}
					<div class="badge badge-sm bg-blue-600 text-white border-0">
						{data.globalChat.unreadCount}
					</div>
				{/if}
				<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-white transition-colors" />
			</div>
		</div>
	</button>

	<!-- Party Chat -->
	{#if data.partyChat}
		<button
			onclick={() => goto("/chat/party")}
			class="w-full bg-slate-700/50 hover:bg-slate-700 border border-white/5 rounded-lg p-4 transition-colors text-left group"
		>
			<div class="flex items-center gap-4">
				{#if data.partyChat.logo}
					<img src={data.partyChat.logo} alt={data.partyChat.name} class="size-12 rounded-full flex-shrink-0" />
				{:else}
					<div class="size-12 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
						<FluentPeople20Filled class="size-6 text-white" />
					</div>
				{/if}

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<h3 class="font-semibold text-white">{data.partyChat.name}</h3>
						<span class="badge badge-sm bg-emerald-600/20 text-emerald-400 border-emerald-600/30">Party</span>
					</div>
					{#if data.partyChat.lastMessage}
						<p class="text-sm text-gray-400 truncate">
							{data.partyChat.lastMessage.senderName}: {data.partyChat.lastMessage.content}
						</p>
						<p class="text-xs text-gray-500 mt-1">{formatTime(data.partyChat.lastMessage.sentAt)}</p>
					{:else}
						<p class="text-sm text-gray-500">No messages yet</p>
					{/if}
				</div>

				<div class="flex items-center gap-2 flex-shrink-0">
					{#if data.partyChat.unreadCount > 0}
						<div class="badge badge-sm bg-blue-600 text-white border-0">
							{data.partyChat.unreadCount}
						</div>
					{/if}
					<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-white transition-colors" />
				</div>
			</div>
		</button>
	{/if}

	<!-- Direct Messages -->
	<div class="space-y-3">
		<h2 class="text-lg font-semibold text-white flex items-center gap-2 mt-4">
			<FluentPerson20Filled class="size-5" />
			Direct Messages
		</h2>

		{#if data.directChats.length === 0}
			<div class="bg-slate-700/30 border border-white/5 rounded-lg p-8 text-center">
				<p class="text-gray-400">No direct messages yet</p>
			</div>
		{:else}
			{#each data.directChats as chat}
				<button
					onclick={() => goto(`/chat/user/${chat.otherUserId}`)}
					class="w-full bg-slate-700/50 hover:bg-slate-700 border border-white/5 rounded-lg p-4 transition-colors text-left group {chat.isBlocked
						? 'opacity-60'
						: ''}"
				>
					<div class="flex items-center gap-4">
						{#if chat.otherUserLogo}
							<img
								src={chat.otherUserLogo}
								alt={chat.otherUserName}
								class="size-12 rounded-full flex-shrink-0 {chat.isBlocked ? 'opacity-50' : ''}"
							/>
						{:else}
							<div
								class="size-12 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 {chat.isBlocked
									? 'opacity-50'
									: ''}"
							>
								<FluentImageOff20Filled class="size-6 text-gray-400" />
							</div>
						{/if}

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-semibold text-white">{chat.otherUserName || "Anonymous"}</h3>
								{#if chat.isBlocked}
									<span class="badge badge-sm bg-red-600/20 text-red-400 border-red-600/30 flex items-center gap-1">
										<FluentProhibited20Filled class="size-3" />
										Blocked
									</span>
								{/if}
							</div>
							{#if chat.lastMessage}
								<p class="text-sm text-gray-400 truncate">
									{chat.lastMessage.isFromCurrentUser ? "You: " : ""}{chat.lastMessage.content}
								</p>
								<p class="text-xs text-gray-500 mt-1">{formatTime(chat.lastMessage.sentAt)}</p>
							{:else}
								<p class="text-sm text-gray-500">No messages yet</p>
							{/if}
						</div>

						<div class="flex items-center gap-2 flex-shrink-0">
							{#if chat.unreadCount > 0 && !chat.isBlocked}
								<div class="badge badge-sm bg-blue-600 text-white border-0">
									{chat.unreadCount}
								</div>
							{/if}
							<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-white transition-colors" />
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>
