<!-- src/routes/(authenticated)/chat/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidate } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import Modal from "$lib/component/Modal.svelte";
	import ReportMessageModal from "$lib/component/ReportMessageModal.svelte";
	import BlockUserModal from "$lib/component/BlockUserModal.svelte";
	import PartyTag from "$lib/component/PartyTag.svelte";
	import { settings } from "$lib/settings.svelte";
	import { buttonClass } from "$lib/component/ui/styles";

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

	let showExternalLinkWarning = $state(false);
	let pendingExternalLink = $state<string | null>(null);

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
				// Clear optimistic messages and reload only chat data
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

	function handleReportMessage(messageId: number, senderId: string) {
		selectedMessageId = messageId;
		selectedSenderId = senderId;
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

<Modal bind:open={showExternalLinkWarning} title="External Link Warning" size="small">
	<div class="space-y-4">
		<p class="text-[#d9ccb7]">
			You are about to visit an external website. Please be careful and make sure you trust this link.
		</p>
		<div class="bg-[#102239]/70 rounded p-3 break-all text-sm text-[#a89e8e]">
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
			<button onclick={proceedToExternalLink} class={buttonClass({ variant: "info" })}>
				Continue
			</button>
		</div>
	</div>
</Modal>

{#if !data.otherUser}
	<div class="w-full mx-auto px-3 sm:px-4 py-6 sm:max-w-5xl">
		<div class="panel rounded-xl p-8 text-center">
			<h2 class="text-2xl font-bold text-[#fff7e8] mb-2">User Not Found</h2>
			<p class="text-[#a89e8e] mb-4">This user doesn't exist or you don't have permission to message them.</p>
			<button onclick={() => goto("/chat")} class={buttonClass({ variant: "info" })}>
				Back to Messages
			</button>
		</div>
	</div>
{:else if data.isBlocked}
	<!-- Blocked User View - Show messages but disable input -->
	<div class="flex flex-col h-full min-h-0">
		<!-- Header -->
		<div class="bg-[#0e1d2f]/90 backdrop-blur-sm border-b border-[#dfceb0]/15 p-3 md:p-4 flex-shrink-0 sticky top-0 z-10">
			<div class="flex items-center gap-2 md:gap-3">
				<button
					onclick={() => goto("/chat")}
					class="btn btn-sm btn-ghost text-[#a89e8e] hover:text-[#fff7e8] min-h-0 h-10 w-10 p-0"
				>
					<FluentArrowLeft20Filled class="size-5" />
				</button>

				<a
					href="/user/{data.otherUser.id}"
					class="flex items-center gap-2 md:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
				>
					{#if data.otherUser.logo && settings.loadImages}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-11 md:size-10 rounded-full" />
					{:else}
						<div class="size-11 md:size-10 rounded-full bg-[#14283f]/80 flex items-center justify-center">
							<FluentImageOff20Filled class="size-6 md:size-5 text-[#a89e8e]" />
						</div>
					{/if}

					<div class="min-w-0">
						<h1 class="text-lg md:text-xl font-bold text-[#fff7e8] truncate">
							{#if data.otherUser.partyAbbreviation}
								<PartyTag abbreviation={data.otherUser.partyAbbreviation} color={data.otherUser.partyColor} />
							{/if}
							{data.otherUser.name || "Anonymous"}
						</h1>
						<p class="text-xs md:text-sm text-red-400">Blocked</p>
					</div>
				</a>
			</div>
		</div>

		<!-- Messages container -->
		<div
			bind:this={chatContainer}
			onscroll={handleScroll}
			class="flex-1 min-h-0 bg-[#102239]/60 border-x border-[#dfceb0]/10 p-4 overflow-y-auto"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-[#a89e8e] text-center">No messages yet.</p>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-4 my-6">
						<div class="flex-1 h-px bg-[#dfceb0]/15"></div>
						<span class="text-xs text-[#a89e8e] font-medium px-3 py-1 bg-[#14283f]/70 rounded-full">
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-[#dfceb0]/15"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-4">
								<div class="flex flex-col gap-1 items-end w-full">
									{#each group.messages as msg}
										<div class="chat-bubble bg-blue-600 text-white">
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
								<div class="flex flex-col gap-1 items-start w-full">
									{#each group.messages as msg}
										<div class="chat-bubble bg-[#14283f] text-[#e5d8c1]">
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
		<div class="bg-[#0e1d2f]/90 backdrop-blur-sm border-t border-[#dfceb0]/15 p-3 md:p-4 flex-shrink-0">
			<div class="bg-[#14283f]/80 rounded-xl p-4 border border-[#dfceb0]/15 text-center shadow-lg">
				<p class="text-[#d9ccb7] mb-3">
					{#if data.blockedByCurrentUser}
						You have blocked this user. Unblock them to send messages.
					{:else}
						This user has blocked you. You cannot send messages.
					{/if}
				</p>

				{#if data.blockedByCurrentUser}
					<form method="POST" action="?/unblockUser" use:enhance>
						<input type="hidden" name="blockedUserId" value={data.otherUser.id} />
						<button type="submit" class={buttonClass({ variant: "info" })}> Unblock User </button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="flex flex-col h-full min-h-0">
		<!-- Header -->
		<div class="bg-[#0e1d2f]/90 backdrop-blur-sm border-b border-[#dfceb0]/15 p-3 md:p-4 flex-shrink-0 sticky top-0 z-10">
			<div class="flex items-center gap-2 md:gap-3">
				<button
					onclick={() => goto("/chat")}
					class="btn btn-sm btn-ghost text-[#a89e8e] hover:text-[#fff7e8] min-h-0 h-10 w-10 p-0"
				>
					<FluentArrowLeft20Filled class="size-5" />
				</button>

				<a
					href="/user/{data.otherUser.id}"
					class="flex items-center gap-2 md:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
				>
					{#if data.otherUser.logo && settings.loadImages}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-11 md:size-10 rounded-full" />
					{:else}
						<div class="size-11 md:size-10 rounded-full bg-[#14283f]/80 flex items-center justify-center">
							<FluentImageOff20Filled class="size-6 md:size-5 text-[#a89e8e]" />
						</div>
					{/if}

					<div class="min-w-0">
						<h1 class="text-lg md:text-xl font-bold text-[#fff7e8] truncate">
							{#if data.otherUser.partyAbbreviation}
								<PartyTag abbreviation={data.otherUser.partyAbbreviation} color={data.otherUser.partyColor} />
							{/if}
							{data.otherUser.name || "Anonymous"}
						</h1>
						<p class="text-xs md:text-sm text-[#a89e8e] truncate">Direct Message</p>
					</div>
				</a>

				<!-- Header Menu Dropdown -->
				<div class="dropdown dropdown-end">
					<label
						tabindex="0"
						class="btn btn-ghost btn-sm btn-circle text-[#a89e8e] hover:text-[#fff7e8] min-h-0 h-10 w-10 p-0"
					>
						<FluentMoreVertical20Filled class="size-5" />
					</label>
					<ul
						tabindex="0"
						class="dropdown-content z-[1] menu p-2 shadow-lg bg-[#14283f] border border-[#dfceb0]/15 rounded-box w-52 mt-2"
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
			class="flex-1 min-h-0 bg-[#0c1929]/50 p-3 md:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-[#dfceb0]/20 scrollbar-track-transparent"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<FluentPerson20Filled class="size-16 text-[#a89e8e]/70 mx-auto mb-4" />
						<p class="text-[#a89e8e] text-base">No messages yet</p>
						<p class="text-[#a89e8e] text-sm mt-1">Start the conversation!</p>
					</div>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-3 my-6">
						<div class="flex-1 h-px bg-gradient-to-r from-transparent via-[#dfceb0]/15 to-transparent"></div>
						<span
							class="text-xs text-[#a89e8e] font-semibold px-4 py-1.5 bg-[#14283f]/80 rounded-full border border-[#dfceb0]/10 shadow-lg"
						>
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-gradient-to-r from-transparent via-[#dfceb0]/15 to-transparent"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-3 md:mb-4">
								<div class="flex flex-col gap-1 items-end w-full max-w-[85%] md:max-w-md ml-auto">
									{#each group.messages as msg}
										<div
											class="chat-bubble bg-blue-600 text-white shadow-lg {msg.isOptimistic
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
								<div class="flex flex-col gap-1 items-start w-full max-w-[85%] md:max-w-md">
									{#each group.messages as msg}
										<button
											onclick={() => handleReportMessage(msg.id, msg.senderId)}
											class="chat-bubble bg-[#14283f]/80 text-[#e5d8c1] hover:bg-[#19304b]/80 transition-colors text-left cursor-pointer shadow-lg text-sm md:text-base px-4 py-2.5 rounded-2xl rounded-bl-md break-words"
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
															onclick={(e) => {
																e.stopPropagation();
																handleLinkClick(e, part.content);
															}}
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
										</button>
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

		<!-- Message input - Fixed to bottom -->
		<div class="bg-[#0e1d2f]/90 backdrop-blur-sm border-t border-[#dfceb0]/15 p-3 md:p-4 flex-shrink-0">
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
						} else {
							// Error - remove optimistic message and restore input
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
					class="textarea textarea-bordered flex-1 bg-[#0d1d31] border-[#dfceb0]/20 focus:border-[#e6a527]/70 text-[#fff7e8] placeholder-[#b3a68e]/60 resize-none min-h-[2.75rem] md:min-h-[2.5rem] max-h-32 rounded-xl text-base"
					disabled={isSubmitting}
					onkeydown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							e.currentTarget.form?.requestSubmit();
						}
					}}></textarea>
				<button
					type="submit"
					class="btn bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2 min-w-[80px] md:min-w-[100px] self-end shadow-lg shadow-blue-600/20 rounded-xl"
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
			<p class="text-xs text-[#a89e8e] mt-2 px-1">
				<span class={message.length > 450 ? "text-orange-400 font-semibold" : ""}>{message.length}/500</span>
				<span class="hidden md:inline"> • Press Enter to send, Shift+Enter for new line</span>
			</p>
		</div>
	</div>
{/if}
