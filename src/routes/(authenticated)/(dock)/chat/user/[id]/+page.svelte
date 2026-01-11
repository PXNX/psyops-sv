<!-- src/routes/(authenticated)/chat/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import ChatMessageMenu from "$lib/component/ChatMessageMenu.svelte";
	import ReportMessageModal from "$lib/component/ReportMessageModal.svelte";
	import BlockUserModal from "$lib/component/BlockUserModal.svelte";

	const { data, form } = $props();

	let message = $state("");
	let isSubmitting = $state(false);
	let chatContainer: HTMLDivElement;
	let eventSource: EventSource | null = null;
	let shouldAutoScroll = $state(true);

	let showReportModal = $state(false);
	let showBlockModal = $state(false);
	let selectedMessageId = $state<number | null>(null);
	let selectedSenderId = $state<string | null>(null);

	// Optimistic messages
	let optimisticMessages = $state<any[]>([]);

	// Combine real and optimistic messages
	let allMessages = $derived([...data.messages, ...optimisticMessages]);

	// Group messages by sender and time proximity (same minute)
	let groupedMessages = $derived.by(() => {
		const grouped: any[] = [];
		let currentGroup: any = null;

		allMessages.forEach((msg) => {
			const msgTime = new Date(msg.sentAt);

			if (
				currentGroup &&
				currentGroup.senderId === msg.senderId &&
				Math.abs(new Date(currentGroup.lastMessageTime).getTime() - msgTime.getTime()) < 60000
			) {
				// Same sender within 1 minute - add to group
				currentGroup.messages.push(msg);
				currentGroup.lastMessageTime = msg.sentAt;
			} else {
				// New group
				if (currentGroup) grouped.push(currentGroup);
				currentGroup = {
					senderId: msg.senderId,
					senderName: msg.senderName,
					senderLogo: msg.senderLogo,
					isFromCurrentUser: msg.isFromCurrentUser,
					messages: [msg],
					firstMessageTime: msg.sentAt,
					lastMessageTime: msg.sentAt
				};
			}
		});

		if (currentGroup) grouped.push(currentGroup);
		return grouped;
	});

	// Group messages by day with dividers
	let messagesByDay = $derived.by(() => {
		const days: { date: string; groups: any[] }[] = [];
		let currentDay: { date: string; groups: any[] } | null = null;

		groupedMessages.forEach((group) => {
			const msgDate = new Date(group.firstMessageTime);
			const dateStr = msgDate.toLocaleDateString();

			if (!currentDay || currentDay.date !== dateStr) {
				if (currentDay) days.push(currentDay);
				currentDay = { date: dateStr, groups: [group] };
			} else {
				currentDay.groups.push(group);
			}
		});

		if (currentDay) days.push(currentDay);
		return days;
	});

	// Auto-scroll to bottom when messages update
	$effect(() => {
		if (chatContainer && allMessages.length > 0 && shouldAutoScroll) {
			setTimeout(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 50);
		}
	});

	// Track if user has scrolled up
	function handleScroll() {
		if (!chatContainer) return;
		const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 50;
		shouldAutoScroll = isAtBottom;
	}

	onMount(() => {
		eventSource = new EventSource("/chat/stream");

		eventSource.addEventListener("message", (event) => {
			const sseData = JSON.parse(event.data);

			if (sseData.type === "new_messages") {
				// Clear optimistic messages and reload
				optimisticMessages = [];
				invalidateAll();
			}
		});

		eventSource.addEventListener("error", () => {
			console.log("SSE connection lost, reconnecting...");
		});
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	function formatTime(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleDateString();
	}

	function formatGroupTime(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatDayDivider(dateStr: string) {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) return "Today";
		if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
		return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
	}

	function handleReportMessage(messageId: number, senderId: string) {
		selectedMessageId = messageId;
		selectedSenderId = senderId;
		showReportModal = true;
	}
</script>

<ReportMessageModal
	bind:open={showReportModal}
	messageId={selectedMessageId}
	senderId={selectedSenderId}
	onClose={() => {
		selectedMessageId = null;
		selectedSenderId = null;
	}}
/>

<BlockUserModal
	bind:open={showBlockModal}
	userId={data.otherUser?.id || null}
	userName={data.otherUser?.name || null}
	onClose={() => {}}
/>

{#if !data.otherUser}
	<div class="max-w-5xl mx-auto px-4 py-6">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-8 text-center">
			<h2 class="text-2xl font-bold text-white mb-2">User Not Found</h2>
			<p class="text-gray-400 mb-4">This user doesn't exist or you don't have permission to message them.</p>
			<button onclick={() => goto("/chat")} class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white">
				Back to Messages
			</button>
		</div>
	</div>
{:else if data.isBlocked}
	<!-- Blocked User View - Show messages but disable input -->
	<div class="flex flex-col h-[calc(100vh-4rem)]">
		<!-- Header -->
		<div class="bg-slate-800/50 border border-white/5 p-4 flex-shrink-0">
			<div class="flex items-center gap-3">
				<button onclick={() => goto("/chat")} class="btn btn-sm btn-ghost text-gray-400 hover:text-white">
					<FluentArrowLeft20Filled class="size-5" />
				</button>

				<a href="/user/{data.otherUser.id}" class="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
					{#if data.otherUser.logo}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-10 rounded-full" />
					{:else}
						<div class="size-10 rounded-full bg-slate-600 flex items-center justify-center">
							<FluentImageOff20Filled class="size-5 text-gray-400" />
						</div>
					{/if}

					<div>
						<h1 class="text-xl font-bold text-white">{data.otherUser.name || "Anonymous"}</h1>
						<p class="text-sm text-red-400">Blocked</p>
					</div>
				</a>
			</div>
		</div>

		<!-- Messages container - same as normal view -->
		<div
			bind:this={chatContainer}
			onscroll={handleScroll}
			class="flex-1 bg-slate-800/30 border-x border-white/5 p-4 overflow-y-auto"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-gray-400 text-center">No messages yet.</p>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-4 my-6">
						<div class="flex-1 h-px bg-white/10"></div>
						<span class="text-xs text-gray-500 font-medium px-3 py-1 bg-slate-700/50 rounded-full">
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-white/10"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-4">
								<div class="flex flex-col gap-1 items-end">
									{#each group.messages as msg}
										<div class="chat-bubble bg-blue-600 text-white">
											{msg.content}
										</div>
									{/each}
								</div>
								<div class="chat-footer opacity-50 text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{:else}
							<!-- Other user's messages group -->
							<div class="chat chat-start mb-4">
								<div class="flex flex-col gap-1 items-start">
									{#each group.messages as msg, idx}
										<div class="chat-bubble bg-slate-700 text-gray-200">
											{msg.content}
										</div>
									{/each}
								</div>
								<div class="chat-footer opacity-50 text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{/if}
					{/each}
				{/each}
			{/if}
		</div>

		<!-- Blocked notice instead of input -->
		<div class="bg-slate-800/50 border border-white/5 p-4 flex-shrink-0">
			<div class="bg-slate-700/50 rounded-lg p-4 border border-white/5 text-center">
				<p class="text-gray-300 mb-3">
					{#if data.blockedByCurrentUser}
						You have blocked this user. Unblock them to send messages.
					{:else}
						This user has blocked you. You cannot send messages.
					{/if}
				</p>

				{#if data.blockedByCurrentUser}
					<form method="POST" action="?/unblockUser" use:enhance>
						<input type="hidden" name="blockedUserId" value={data.otherUser.id} />
						<button type="submit" class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white"> Unblock User </button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="flex flex-col h-[calc(100vh-4rem)]">
		<!-- Header -->
		<div class="bg-slate-800/50 border border-white/5 p-4 flex-shrink-0">
			<div class="flex items-center gap-3">
				<button onclick={() => goto("/chat")} class="btn btn-sm btn-ghost text-gray-400 hover:text-white">
					<FluentArrowLeft20Filled class="size-5" />
				</button>

				<a href="/user/{data.otherUser.id}" class="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
					{#if data.otherUser.logo}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-10 rounded-full" />
					{:else}
						<div class="size-10 rounded-full bg-slate-600 flex items-center justify-center">
							<FluentImageOff20Filled class="size-5 text-gray-400" />
						</div>
					{/if}

					<div>
						<h1 class="text-xl font-bold text-white">{data.otherUser.name || "Anonymous"}</h1>
						<p class="text-sm text-gray-400">Direct Message</p>
					</div>
				</a>

				<!-- Header Menu Dropdown -->
				<div class="dropdown dropdown-end">
					<label tabindex="0" class="btn btn-ghost btn-sm btn-circle text-gray-400 hover:text-white">
						<FluentMoreVertical20Filled class="size-5" />
					</label>
					<ul
						tabindex="0"
						class="dropdown-content z-[1] menu p-2 shadow-lg bg-slate-800 border border-white/10 rounded-box w-52 mt-2"
					>
						<li>
							<button
								onclick={() => (showBlockModal = true)}
								class="text-red-400 hover:text-red-300 hover:bg-red-500/10 justify-start"
							>
								Block User
							</button>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Messages container -->
		<div
			bind:this={chatContainer}
			onscroll={handleScroll}
			class="flex-1 bg-slate-800/30 border-x border-white/5 p-4 overflow-y-auto"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-gray-400 text-center">No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-4 my-6">
						<div class="flex-1 h-px bg-white/10"></div>
						<span class="text-xs text-gray-500 font-medium px-3 py-1 bg-slate-700/50 rounded-full">
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-white/10"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-4">
								<div class="flex flex-col gap-1 items-end">
									{#each group.messages as msg}
										<div class="chat-bubble bg-blue-600 text-white {msg.isOptimistic ? 'opacity-70' : ''}">
											{msg.content}
										</div>
									{/each}
								</div>
								<div class="chat-footer opacity-50 text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{:else}
							<!-- Other user's messages group -->
							<div class="chat chat-start mb-4">
								<div class="flex flex-col gap-1 items-start">
									{#each group.messages as msg, idx}
										<button
											onclick={() => handleReportMessage(msg.id, msg.senderId)}
											class="chat-bubble bg-slate-700 text-gray-200 hover:bg-slate-600/80 transition-colors text-left cursor-pointer"
										>
											{msg.content}
										</button>
									{/each}
								</div>
								<div class="chat-footer opacity-50 text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{/if}
					{/each}
				{/each}
			{/if}
		</div>

		<!-- Message input - Fixed to bottom -->
		<div class="bg-slate-800/50 border border-white/5 p-4 flex-shrink-0">
			{#if form?.error}
				<div class="alert alert-error mb-3 text-sm">
					<p>{form.error}</p>
				</div>
			{/if}

			{#if form?.success && form?.message}
				<div class="alert alert-success mb-3 text-sm">
					<p>{form.message}</p>
				</div>
			{/if}

			<form
				method="POST"
				action="?/postMessage"
				use:enhance={() => {
					const messageContent = message.trim();

					if (!messageContent) return;

					// Add optimistic message
					const optimisticMsg = {
						id: `temp-${Date.now()}`,
						content: messageContent,
						sentAt: new Date().toISOString(),
						senderId: data.currentUserId,
						recipientId: data.otherUser.id,
						isFromCurrentUser: true,
						senderName: "You",
						senderLogo: null,
						isOptimistic: true
					};

					optimisticMessages = [...optimisticMessages, optimisticMsg];
					isSubmitting = true;
					shouldAutoScroll = true;
					message = "";

					return async ({ result, update }) => {
						if (result.type === "success") {
							// Message sent successfully - SSE will trigger reload
							// and clear optimistic messages
						} else {
							// Error - remove optimistic message and restore input
							optimisticMessages = optimisticMessages.filter((m) => m.id !== optimisticMsg.id);
							message = messageContent;
							await update();
						}
						isSubmitting = false;
					};
				}}
				class="flex gap-2"
			>
				<textarea
					name="content"
					bind:value={message}
					placeholder="Type a message..."
					maxlength="500"
					rows="1"
					class="textarea textarea-bordered flex-1 bg-slate-700/50 border-slate-600/30 text-white placeholder-gray-400 resize-none min-h-[2.5rem] max-h-32"
					disabled={isSubmitting}
					onkeydown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							e.currentTarget.form?.requestSubmit();
						}
					}}
				></textarea>
				<button
					type="submit"
					class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white gap-2 min-w-[100px] self-end"
					disabled={isSubmitting || !message.trim()}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Sending
					{:else}
						<FluentSend20Filled class="size-5" />
						Send
					{/if}
				</button>
			</form>
			<p class="text-xs text-gray-500 mt-2">
				{message.length}/500 characters • Press Enter to send, Shift+Enter for new line
			</p>
		</div>
	</div>
{/if}
