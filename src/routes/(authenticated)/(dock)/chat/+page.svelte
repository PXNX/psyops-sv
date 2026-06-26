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

<div class="max-w-4xl mx-auto px-4 md:px-6 py-6">
	<div class="flex items-center gap-3 mb-6">
		<div class="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
			<FluentChat20Filled class="size-6 text-blue-400" />
		</div>
		<h1 class="text-2xl md:text-3xl font-bold text-white">Messages</h1>
	</div>

	<div class="space-y-4">
		<!-- Global Chat -->
		<button
			onclick={() => goto("/chat/en")}
			class="w-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 rounded-xl p-4 transition-all duration-200 text-left group shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.01] active:scale-[0.99]"
		>
			<div class="flex items-center gap-3 md:gap-4">
				<div
					class="size-14 md:size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20"
				>
					<FluentEarth20Filled class="size-6 md:size-5 text-white" />
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1.5">
						<h3 class="font-semibold text-white text-base md:text-sm">Global Chat (English)</h3>
						<span class="hidden sm:inline badge badge-xs bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium"
							>Global</span
						>
					</div>
					{#if data.globalChat?.lastMessage}
						<p class="text-sm md:text-xs text-gray-400 truncate leading-relaxed">
							<span class="font-medium text-gray-300">{data.globalChat.lastMessage.senderName}:</span>
							{data.globalChat.lastMessage.content}
						</p>
						<p class="text-xs text-gray-500 mt-1">{formatTime(data.globalChat.lastMessage.sentAt)}</p>
					{:else}
						<p class="text-sm md:text-xs text-gray-500">No messages yet</p>
					{/if}
				</div>

				<div class="flex items-center gap-2 flex-shrink-0">
					{#if data.globalChat?.unreadCount > 0}
						<div
							class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
						>
							{data.globalChat.unreadCount > 99 ? "99+" : data.globalChat.unreadCount}
						</div>
					{/if}
					<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
				</div>
			</div>
		</button>

		<!-- Party Chat -->
		{#if data.partyChat}
			<button
				onclick={() => goto("/chat/party")}
				class="w-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 rounded-xl p-4 transition-all duration-200 text-left group shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.01] active:scale-[0.99]"
			>
				<div class="flex items-center gap-3 md:gap-4">
					{#if data.partyChat.logo}
						<img
							src={data.partyChat.logo}
							alt={data.partyChat.name}
							class="size-14 md:size-12 rounded-full flex-shrink-0"
						/>
					{:else}
						<div
							class="size-14 md:size-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
						>
							<FluentPeople20Filled class="size-6 md:size-5 text-white" />
						</div>
					{/if}

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1.5">
							<h3 class="font-semibold text-white text-base md:text-sm truncate">{data.partyChat.name}</h3>
							<span
								class="hidden sm:inline badge badge-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-medium flex-shrink-0"
								>Party</span
							>
						</div>
						{#if data.partyChat.lastMessage}
							<p class="text-sm md:text-xs text-gray-400 truncate leading-relaxed">
								<span class="font-medium text-gray-300">{data.partyChat.lastMessage.senderName}:</span>
								{data.partyChat.lastMessage.content}
							</p>
							<p class="text-xs text-gray-500 mt-1">{formatTime(data.partyChat.lastMessage.sentAt)}</p>
						{:else}
							<p class="text-sm md:text-xs text-gray-500">No messages yet</p>
						{/if}
					</div>

					<div class="flex items-center gap-2 flex-shrink-0">
						{#if data.partyChat.unreadCount > 0}
							<div
								class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
							>
								{data.partyChat.unreadCount > 99 ? "99+" : data.partyChat.unreadCount}
							</div>
						{/if}
						<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
					</div>
				</div>
			</button>
		{/if}

		<!-- Direct Messages -->
		<div class="space-y-3">
			<h2 class="text-base md:text-lg font-semibold text-white flex items-center gap-2 mt-6 px-1">
				<FluentPerson20Filled class="size-5" />
				Direct Messages
			</h2>

			{#if data.directChats.length === 0}
				<div class="bg-slate-800/30 border border-white/10 rounded-xl p-8 text-center">
					<FluentPerson20Filled class="size-12 text-gray-600 mx-auto mb-3" />
					<p class="text-gray-400">No direct messages yet</p>
					<p class="text-sm text-gray-500 mt-1">Start a conversation with someone!</p>
				</div>
			{:else}
				{#each data.directChats as chat}
					<button
						onclick={() => goto(`/chat/user/${chat.otherUserId}`)}
						class="w-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 rounded-xl p-4 transition-all duration-200 text-left group shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.01] active:scale-[0.99] {chat.isBlocked
							? 'opacity-60'
							: ''}"
					>
						<div class="flex items-center gap-3 md:gap-4">
							{#if chat.otherUserLogo}
								<img
									src={chat.otherUserLogo}
									alt={chat.otherUserName}
									class="size-14 md:size-12 rounded-full flex-shrink-0 {chat.isBlocked ? 'opacity-50' : ''}"
								/>
							{:else}
								<div
									class="size-14 md:size-12 rounded-full bg-slate-700/80 flex items-center justify-center flex-shrink-0 {chat.isBlocked
										? 'opacity-50'
										: ''}"
								>
									<FluentImageOff20Filled class="size-6 md:size-5 text-gray-500" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1.5">
									<h3 class="font-semibold text-white text-base md:text-sm truncate">
										{chat.otherUserName || "Anonymous"}
									</h3>
									{#if chat.isBlocked}
										<span
											class="badge badge-xs bg-red-600/20 text-red-400 border-red-600/30 flex items-center gap-1 flex-shrink-0"
										>
											<FluentProhibited20Filled class="size-3" />
											Blocked
										</span>
									{/if}
								</div>
								{#if chat.lastMessage}
									<p class="text-sm md:text-xs text-gray-400 truncate leading-relaxed">
										{#if chat.lastMessage.isFromCurrentUser}<span class="font-medium text-gray-300">You:</span>
										{/if}{chat.lastMessage.content}
									</p>
									<p class="text-xs text-gray-500 mt-1">{formatTime(chat.lastMessage.sentAt)}</p>
								{:else}
									<p class="text-sm md:text-xs text-gray-500">No messages yet</p>
								{/if}
							</div>

							<div class="flex items-center gap-2 flex-shrink-0">
								{#if chat.unreadCount > 0 && !chat.isBlocked}
									<div
										class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
									>
										{chat.unreadCount > 99 ? "99+" : chat.unreadCount}
									</div>
								{/if}
								<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>
