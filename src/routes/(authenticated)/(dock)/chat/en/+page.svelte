<!-- src/routes/(authenticated)/chat/en/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import Modal from "$lib/component/Modal.svelte";
	import ReportModal from "$lib/component/ReportModal.svelte";

	const { data, form } = $props();

	let message = $state("");
	let isSubmitting = $state(false);
	let chatContainer: HTMLDivElement;
	let shouldAutoScroll = $state(true);
	let eventSource: EventSource | null = null;

	let showReportModal = $state(false);
	let reportMessageId = $state<number | null>(null);
	let reportUserId = $state<string | null>(null);
	let reportUserName = $state<string | null>(null);

	let showExternalLinkWarning = $state(false);
	let pendingExternalLink = $state<string | null>(null);

	// Optimistic messages
	let optimisticMessages = $state<any[]>([]);

	// Combine real and optimistic messages
	let allMessages = $derived([...data.messages, ...optimisticMessages]);

	// Group messages by sender and time proximity
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
				currentGroup.messages.push(msg);
				currentGroup.lastMessageTime = msg.sentAt;
			} else {
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

	// Group messages by day
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

	function handleReport(messageId: number, userId: string, userName: string) {
		reportMessageId = messageId;
		reportUserId = userId;
		reportUserName = userName;
		showReportModal = true;
	}

	function isImageUrl(url: string): boolean {
		return /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
	}

	function isLocalhost(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1" || urlObj.port === "5173";
		} catch {
			return false;
		}
	}

	function handleLinkClick(e: MouseEvent, url: string) {
		if (!isLocalhost(url)) {
			e.preventDefault();
			pendingExternalLink = url;
			showExternalLinkWarning = true;
		}
	}

	function proceedToExternalLink() {
		if (pendingExternalLink) {
			window.open(pendingExternalLink, "_blank");
			pendingExternalLink = null;
			showExternalLinkWarning = false;
		}
	}

	function renderMessageContent(content: string) {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		const parts = content.split(urlRegex);

		return parts.map((part, index) => {
			if (urlRegex.test(part)) {
				return { type: "url", content: part, index };
			}
			return { type: "text", content: part, index };
		});
	}
</script>

<ReportModal
	bind:show={showReportModal}
	targetType="account"
	targetId={reportUserId || ""}
	targetName={reportUserName || "User"}
/>

<Modal bind:open={showExternalLinkWarning} title="External Link Warning" size="small">
	<div class="space-y-4">
		<p class="text-gray-300">
			You are about to visit an external website. Please be careful and make sure you trust this link.
		</p>
		<div class="bg-slate-700/50 rounded p-3 break-all text-sm text-gray-400">
			{pendingExternalLink}
		</div>
		<div class="flex gap-2 justify-end">
			<button
				onclick={() => {
					showExternalLinkWarning = false;
					pendingExternalLink = null;
				}}
				class="btn btn-ghost"
			>
				Cancel
			</button>
			<button onclick={proceedToExternalLink} class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white">
				Continue
			</button>
		</div>
	</div>
</Modal>

<div class="flex flex-col h-[calc(100vh-4rem)]">
	<!-- Header -->
	<div class="bg-slate-800/50 border border-white/5 p-4 flex-shrink-0">
		<div class="flex items-center gap-3">
			<button onclick={() => goto("/chat")} class="btn btn-sm btn-ghost text-gray-400 hover:text-white">
				<FluentArrowLeft20Filled class="size-5" />
			</button>

			<div class="size-10 rounded-full bg-blue-600 flex items-center justify-center">
				<FluentEarth20Filled class="size-5 text-white" />
			</div>

			<div class="flex-1">
				<h1 class="text-xl font-bold text-white">Global Chat (English)</h1>
				<p class="text-sm text-gray-400">Talk with players worldwide</p>
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
				<p class="text-gray-400 text-center">No messages yet. Be the first to say something!</p>
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
										{#each renderMessageContent(msg.content) as part}
											{#if part.type === "url"}
												{#if isImageUrl(part.content)}
													<div class="my-2">
														<img src={part.content} alt="Shared image" class="max-w-sm rounded" />
													</div>
												{:else}
													<a
														href={part.content}
														onclick={(e) => handleLinkClick(e, part.content)}
														class="underline hover:text-blue-200"
														target="_blank"
														rel="noopener noreferrer"
													>
														{part.content}
													</a>
												{/if}
											{:else}
												{part.content}
											{/if}
										{/each}
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
							<div class="chat-image avatar">
								<a href="/user/{group.senderId}" class="w-10 rounded-full">
									{#if group.senderLogo}
										<img src={group.senderLogo} alt={group.senderName || "User"} />
									{:else}
										<div class="w-full h-full bg-slate-700 flex items-center justify-center rounded-full">
											<FluentImageOff20Filled class="size-5 text-gray-400" />
										</div>
									{/if}
								</a>
							</div>
							<div class="chat-header text-sm mb-1">
								<a href="/user/{group.senderId}" class="hover:text-blue-400 transition-colors font-medium">
									{group.senderName || "Anonymous"}
								</a>
							</div>
							<div class="flex flex-col gap-1 items-start">
								{#each group.messages as msg}
									<div class="relative group">
										<div class="chat-bubble bg-slate-700 text-gray-200">
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-sm rounded" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => handleLinkClick(e, part.content)}
															class="underline hover:text-blue-400"
															target="_blank"
															rel="noopener noreferrer"
														>
															{part.content}
														</a>
													{/if}
												{:else}
													{part.content}
												{/if}
											{/each}
										</div>
										<div class="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
											<div class="dropdown dropdown-end">
												<label tabindex="0" class="btn btn-ghost btn-xs btn-circle">
													<FluentMoreVertical20Filled class="size-4" />
												</label>
												<ul
													tabindex="0"
													class="dropdown-content z-[1] menu p-2 shadow-lg bg-slate-800 border border-white/10 rounded-box w-48"
												>
													<li>
														<button
															onclick={() => handleReport(msg.id, group.senderId, group.senderName || "Anonymous")}
															class="text-red-400 hover:text-red-300 hover:bg-red-500/10"
														>
															Report Message
														</button>
													</li>
												</ul>
											</div>
										</div>
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

	<!-- Message input -->
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
			use:enhance={() => {
				const messageContent = message.trim();

				if (!messageContent) return;

				const optimisticMsg = {
					id: `temp-${Date.now()}`,
					content: messageContent,
					sentAt: new Date().toISOString(),
					senderId: data.currentUserId || "temp",
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
						// SSE will trigger reload
					} else {
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
