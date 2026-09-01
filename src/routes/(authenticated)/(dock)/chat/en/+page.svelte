<!-- src/routes/(authenticated)/chat/en/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidate } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import Modal from "$lib/component/Modal.svelte";
	import ReportModal from "$lib/component/ReportModal.svelte";
	import { settings } from "$lib/settings.svelte";

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
			const p = (n: number) => String(n).padStart(2, "0");
			const dateStr = `${p(msgDate.getDate())}.${p(msgDate.getMonth() + 1)}.${msgDate.getFullYear()}`;

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
				invalidate("app:chat");
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
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function formatDayDivider(dateStr: string) {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) return "Today";
		if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
		const p = (n: number) => String(n).padStart(2, "0");
		return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`;
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

<div class="flex flex-col h-full">
	<!-- Header -->
	<div class="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 p-3 md:p-4 flex-shrink-0 sticky top-0 z-10">
		<div class="flex items-center gap-2 md:gap-3">
			<button
				onclick={() => goto("/chat")}
				class="btn btn-sm btn-ghost text-gray-400 hover:text-white min-h-0 h-10 w-10 p-0"
			>
				<FluentArrowLeft20Filled class="size-5" />
			</button>

			<div
				class="size-11 md:size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
			>
				<FluentEarth20Filled class="size-6 md:size-5 text-white" />
			</div>

			<div class="flex-1 min-w-0">
				<h1 class="text-lg md:text-xl font-bold text-white truncate">Global Chat</h1>
				<p class="text-xs md:text-sm text-gray-400 truncate">Talk with players worldwide</p>
			</div>
		</div>
	</div>

	<!-- Messages container -->
	<div
		bind:this={chatContainer}
		onscroll={handleScroll}
		class="flex-1 bg-gradient-to-b from-slate-900/50 to-slate-900/30 p-3 md:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent"
	>
		{#if allMessages.length === 0}
			<div class="flex items-center justify-center h-full">
				<div class="text-center">
					<FluentEarth20Filled class="size-16 text-gray-600 mx-auto mb-4" />
					<p class="text-gray-400 text-base">No messages yet</p>
					<p class="text-gray-500 text-sm mt-1">Be the first to say something!</p>
				</div>
			</div>
		{:else}
			{#each messagesByDay as day}
				<!-- Day Divider -->
				<div class="flex items-center gap-3 my-6">
					<div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
					<span
						class="text-xs text-gray-400 font-semibold px-4 py-1.5 bg-slate-800/80 rounded-full border border-white/5 shadow-lg"
					>
						{formatDayDivider(day.date)}
					</span>
					<div class="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				</div>

				{#each day.groups as group}
					{#if group.isFromCurrentUser}
						<!-- My messages group -->
						<div class="chat chat-end mb-3 md:mb-4">
							<div class="flex flex-col gap-1 items-end max-w-[85%] md:max-w-md ml-auto">
								{#each group.messages as msg}
									<div
										class="chat-bubble bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg {msg.isOptimistic
											? 'opacity-70'
											: ''} text-sm md:text-base px-4 py-2.5 rounded-2xl rounded-br-md break-words"
									>
										{#each renderMessageContent(msg.content) as part}
											{#if part.type === "url"}
												{#if isImageUrl(part.content)}
													<div class="my-2">
														<img src={part.content} alt="Shared image" class="max-w-full rounded-lg" />
													</div>
												{:else}
													<a
														href={part.content}
														onclick={(e) => handleLinkClick(e, part.content)}
														class="underline hover:text-blue-200 break-all"
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
							<div class="chat-footer opacity-60 text-xs mt-0.5 px-1">
								{formatGroupTime(group.lastMessageTime)}
							</div>
						</div>
					{:else}
						<!-- Other user's messages group -->
						<div class="chat chat-start mb-3 md:mb-4">
							<div class="chat-image avatar hidden md:block">
								<a href="/user/{group.senderId}" class="w-10 rounded-full">
									{#if group.senderLogo && settings.loadImages}
										<img src={group.senderLogo} alt={group.senderName || "User"} class="" />
									{:else}
										<div class="w-full h-full bg-slate-700/80 flex items-center justify-center rounded-full">
											<FluentImageOff20Filled class="size-5 text-gray-500" />
										</div>
									{/if}
								</a>
							</div>
							<div class="chat-header text-xs md:text-sm mb-1 px-1">
								<a href="/user/{group.senderId}" class="hover:text-blue-400 transition-colors font-semibold">
									{group.senderName || "Anonymous"}
								</a>
							</div>
							<div class="flex flex-col gap-1 items-start max-w-[85%] md:max-w-md">
								{#each group.messages as msg}
									<div class="relative group/msg">
										<div
											class="chat-bubble bg-slate-800/80 text-gray-100 shadow-lg text-sm md:text-base px-4 py-2.5 rounded-2xl rounded-bl-md break-words"
										>
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-full rounded-lg" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => handleLinkClick(e, part.content)}
															class="underline hover:text-blue-400 break-all"
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
										<div
											class="absolute -right-8 top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity hidden md:block"
										>
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
							<div class="chat-footer opacity-60 text-xs mt-0.5 px-1">
								{formatGroupTime(group.lastMessageTime)}
							</div>
						</div>
					{/if}
				{/each}
			{/each}
		{/if}
	</div>

	<!-- Message input -->
	<div class="bg-slate-900/80 backdrop-blur-sm border-t border-white/10 p-3 md:p-4 flex-shrink-0">
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
			class="flex gap-2 md:gap-3"
		>
			<textarea
				name="content"
				bind:value={message}
				placeholder="Type a message..."
				maxlength="500"
				rows="1"
				class="textarea textarea-bordered flex-1 bg-slate-800/80 border-slate-700/50 focus:border-blue-500/50 text-white placeholder-gray-500 resize-none min-h-[2.75rem] md:min-h-[2.5rem] max-h-32 rounded-xl text-base"
				disabled={isSubmitting}
				onkeydown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						e.currentTarget.form?.requestSubmit();
					}
				}}></textarea>
			<button
				type="submit"
				class="btn bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 text-white gap-2 min-w-[80px] md:min-w-[100px] self-end shadow-lg shadow-blue-600/20 rounded-xl"
				disabled={isSubmitting || !message.trim()}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					<span class="hidden md:inline">Sending</span>
				{:else}
					<FluentSend20Filled class="size-5" />
					<span class="hidden md:inline">Send</span>
				{/if}
			</button>
		</form>
		<p class="text-xs text-gray-500 mt-2 px-1">
			<span class={message.length > 450 ? "text-orange-400 font-semibold" : ""}>{message.length}/500</span>
			<span class="hidden md:inline"> • Press Enter to send, Shift+Enter for new line</span>
		</p>
	</div>
</div>
