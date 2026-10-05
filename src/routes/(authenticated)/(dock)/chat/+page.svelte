<!-- src/routes/(authenticated)/chat/+page.svelte -->
<script lang="ts">
	import { goto, invalidate } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentProhibited20Filled from "~icons/fluent/prohibited-20-filled";
	import { formatTime } from "#lib/utils/formatting.js";
	import { settings } from "#lib/settings.svelte.js";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	let eventSource: EventSource | null = null;

	onMount(() => {
		// Connect to SSE endpoint
		eventSource = new EventSource("/chat/stream");

		eventSource.addEventListener("message", (event) => {
			const data = JSON.parse(event.data);

			if (data.type === "new_messages") {
				// Refresh only chat data when new messages arrive
				invalidate("app:chat");
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


<PageContainer maxWidth="4xl">
	<PageHeader title="Messages" icon={FluentChat20Filled} />

	<div class="space-y-4">
		<!-- Global Chat -->
		<button onclick={() => goto("/chat/en")} class="w-full panel-interactive rounded-sm p-4 text-left group">
			<div class="flex items-center gap-3 md:gap-4">
				<div
					class="size-14 md:size-12 rounded-full bg-[#315d8d]/18 border border-[#7ba0c8]/30 flex items-center justify-center flex-shrink-0"
				>
					<FluentEarth20Filled class="size-6 md:size-5 text-[#7ba0c8]" />
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1.5">
						<h3
							class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors text-base md:text-sm"
						>
							Global Chat (English)
						</h3>
						<Badge tone="blue" size="xs" class="hidden sm:inline-flex">Global</Badge>
					</div>
					{#if data.globalChat?.lastMessage}
						<p class="text-sm md:text-xs text-[#a89e8e] truncate leading-relaxed">
							<span class="font-medium text-[#d9ccb7]"
								>{#if data.globalChat.lastMessage.senderPartyAbbreviation}<PartyTag
										abbreviation={data.globalChat.lastMessage.senderPartyAbbreviation}
										color={data.globalChat.lastMessage.senderPartyColor}
									/>{/if}{data.globalChat.lastMessage.senderName}:</span
							>
							{data.globalChat.lastMessage.content}
						</p>
						<p class="text-xs text-[#a89e8e] mt-1">{formatTime(data.globalChat.lastMessage.sentAt)}</p>
					{:else}
						<p class="text-sm md:text-xs text-[#a89e8e]">No messages yet</p>
					{/if}
				</div>

				<div class="flex items-center gap-2 flex-shrink-0">
					{#if data.globalChat?.unreadCount > 0}
						<div
							class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#e6a527] text-[#172a45] text-xs font-bold"
						>
							{data.globalChat.unreadCount > 99 ? "99+" : data.globalChat.unreadCount}
						</div>
					{/if}
					<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
				</div>
			</div>
		</button>

		<!-- Party Chat -->
		{#if data.partyChat}
			<button onclick={() => goto("/chat/party")} class="w-full panel-interactive rounded-sm p-4 text-left group">
				<div class="flex items-center gap-3 md:gap-4">
					{#if data.partyChat.logo}
						<img
							src={data.partyChat.logo}
							alt={data.partyChat.name}
							class="size-14 md:size-12 rounded-full flex-shrink-0"
						/>
					{:else}
						<div
							class="size-14 md:size-12 rounded-full bg-[#587252]/18 border border-[#8fae88]/30 flex items-center justify-center flex-shrink-0"
						>
							<FluentPeople20Filled class="size-6 md:size-5 text-[#8fae88]" />
						</div>
					{/if}

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1.5">
							<h3
								class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors text-base md:text-sm truncate"
							>
								{data.partyChat.name}
							</h3>
							<Badge tone="green" size="xs" class="hidden sm:inline-flex flex-shrink-0">Party</Badge>
						</div>
						{#if data.partyChat.lastMessage}
							<p class="text-sm md:text-xs text-[#a89e8e] truncate leading-relaxed">
								<span class="font-medium text-[#d9ccb7]">{data.partyChat.lastMessage.senderName}:</span>
								{data.partyChat.lastMessage.content}
							</p>
							<p class="text-xs text-[#a89e8e] mt-1">{formatTime(data.partyChat.lastMessage.sentAt)}</p>
						{:else}
							<p class="text-sm md:text-xs text-[#a89e8e]">No messages yet</p>
						{/if}
					</div>

					<div class="flex items-center gap-2 flex-shrink-0">
						{#if data.partyChat.unreadCount > 0}
							<div
								class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#e6a527] text-[#172a45] text-xs font-bold"
							>
								{data.partyChat.unreadCount > 99 ? "99+" : data.partyChat.unreadCount}
							</div>
						{/if}
						<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
					</div>
				</div>
			</button>
		{/if}

		<!-- Direct Messages -->
		<div class="space-y-3">
			<h2 class="section-title mt-6 px-1">
				<FluentPerson20Filled class="size-5 text-[#f7c56b]" />
				Direct Messages
			</h2>

			{#if data.directChats.length === 0}
				<EmptyState
					icon={FluentPerson20Filled}
					title="No direct messages yet"
					subtitle="Start a conversation with someone!"
				/>
			{:else}
				{#each data.directChats as chat}
					<button
						onclick={() => goto(`/chat/user/${chat.otherUserId}`)}
						class="w-full panel-interactive rounded-sm p-4 text-left group {chat.isBlocked ? 'opacity-60' : ''}"
					>
						<div class="flex items-center gap-3 md:gap-4">
							{#if chat.otherUserLogo && settings.loadImages}
								<img
									src={chat.otherUserLogo}
									alt={chat.otherUserName}
									class="size-14 md:size-12 rounded-full flex-shrink-0 {chat.isBlocked ? 'opacity-50' : ''}"
								/>
							{:else}
								<div
									class="size-14 md:size-12 rounded-full bg-[#102239] flex items-center justify-center flex-shrink-0 {chat.isBlocked
										? 'opacity-50'
										: ''}"
								>
									<FluentImageOff20Filled class="size-6 md:size-5 text-[#a89e8e]" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1.5">
									<h3
										class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors text-base md:text-sm truncate"
									>
										{#if chat.otherUserPartyAbbreviation}
											<PartyTag abbreviation={chat.otherUserPartyAbbreviation} color={chat.otherUserPartyColor} />
										{/if}
										{chat.otherUserName || "Anonymous"}
									</h3>
									{#if chat.isBlocked}
										<Badge tone="red" size="xs" icon={FluentProhibited20Filled} class="flex-shrink-0">Blocked</Badge>
									{/if}
								</div>
								{#if chat.lastMessage}
									<p class="text-sm md:text-xs text-[#a89e8e] truncate leading-relaxed">
										{#if chat.lastMessage.isFromCurrentUser}<span class="font-medium text-[#d9ccb7]">You:</span>
										{/if}{chat.lastMessage.content}
									</p>
									<p class="text-xs text-[#a89e8e] mt-1">{formatTime(chat.lastMessage.sentAt)}</p>
								{:else}
									<p class="text-sm md:text-xs text-[#a89e8e]">No messages yet</p>
								{/if}
							</div>

							<div class="flex items-center gap-2 flex-shrink-0">
								{#if chat.unreadCount > 0 && !chat.isBlocked}
									<div
										class="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#e6a527] text-[#172a45] text-xs font-bold"
									>
										{chat.unreadCount > 99 ? "99+" : chat.unreadCount}
									</div>
								{/if}
								<FluentChevronRight20Filled
									class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors"
								/>
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</PageContainer>
