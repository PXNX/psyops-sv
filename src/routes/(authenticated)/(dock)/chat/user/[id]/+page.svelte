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
	import Modal from "#lib/component/Modal.svelte";
	import ReportMessageModal from "#lib/component/ReportMessageModal.svelte";
	import BlockUserModal from "#lib/component/BlockUserModal.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import { settings } from "#lib/settings.svelte.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, IconButton, buttonClass } from "#lib/component/ui/index.js";

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
		<p class="text-[#d3caa9]">
			You are about to visit an external website. Please be careful and make sure you trust this link.
		</p>
		<div class="panel-muted rounded-sm p-3 break-all text-sm text-[#a8a083]">
			{pendingExternalLink}
		</div>
		<div class="flex gap-2 justify-end">
			<Button
				variant="ghost"
				onclick={() => {
					showExternalLinkWarning = false;
					pendingExternalLink = null;
				}}
			>
				Cancel
			</Button>
			<Button variant="primary" onclick={proceedToExternalLink}>Continue</Button>
		</div>
	</div>
</Modal>

{#if !data.otherUser}
	<PageContainer maxWidth="5xl">
		<div class="panel rounded-sm p-8 text-center">
			<h2 class="text-2xl font-bold text-[#f5efd8] mb-2">User Not Found</h2>
			<p class="text-[#a8a083] mb-4">This user doesn't exist or you don't have permission to message them.</p>
			<Button variant="primary" onclick={() => goto("/chat")}>Back to Messages</Button>
		</div>
	</PageContainer>
{:else if data.isBlocked}
	<!-- Blocked User View - Show messages but disable input -->
	<div class="flex flex-col h-full min-h-0">
		<!-- Header -->
		<div
			class="bg-[#171b12]/90 backdrop-blur-sm border-b border-[#c8b47a]/15 p-3 md:p-4 flex-shrink-0 sticky top-0 z-10"
		>
			<div class="flex items-center gap-2 md:gap-3">
				<IconButton icon={FluentArrowLeft20Filled} label="Back to messages" onclick={() => goto("/chat")} />

				<a
					href="/user/{data.otherUser.id}"
					class="flex items-center gap-2 md:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
				>
					{#if data.otherUser.logo && settings.loadImages}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-11 md:size-10 rounded-full" />
					{:else}
						<div class="size-11 md:size-10 rounded-full bg-[#1a1f15] flex items-center justify-center shrink-0">
							<FluentImageOff20Filled class="size-6 md:size-5 text-[#a8a083]" />
						</div>
					{/if}

					<div class="min-w-0">
						<h1 class="text-lg md:text-xl font-bold text-[#f5efd8] truncate">
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
			class="flex-1 min-h-0 bg-[#12150f]/50 p-3 md:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c8b47a]/20 scrollbar-track-transparent"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-[#a8a083] text-center">No messages yet.</p>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-4 my-6">
						<div class="flex-1 h-px bg-[#c8b47a]/15"></div>
						<span
							class="text-[10px] uppercase tracking-wide text-[#a8a083] font-semibold px-3 py-1 panel-muted rounded-sm"
						>
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-[#c8b47a]/15"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-4">
								<div class="flex flex-col gap-1 items-end w-full">
									{#each group.messages as msg}
										<div
											class="chat-bubble before:hidden bg-[#f2b01e]/12 border border-[#f2b01e]/35 text-[#f5efd8] text-sm md:text-base px-4 py-2.5 rounded-md break-words"
										>
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-sm rounded-sm" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => handleLinkClick(e, part.content)}
															class="underline hover:text-[#ffcf47]"
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
								<div class="chat-footer text-[#a8a083] text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{:else}
							<!-- Other user's messages group -->
							<div class="chat chat-start mb-4">
								<div class="flex flex-col gap-1 items-start w-full">
									{#each group.messages as msg}
										<div
											class="chat-bubble before:hidden bg-[#1a1f15]/70 border border-[#c8b47a]/10 text-[#e6ddbf] text-sm md:text-base px-4 py-2.5 rounded-md break-words"
										>
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-sm rounded-sm" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => handleLinkClick(e, part.content)}
															class="underline hover:text-[#ffcf47]"
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
								<div class="chat-footer text-[#a8a083] text-xs mt-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{/if}
					{/each}
				{/each}
			{/if}
		</div>

		<!-- Blocked notice instead of input -->
		<div class="bg-[#171b12]/90 backdrop-blur-sm border-t border-[#c8b47a]/15 p-3 md:p-4 flex-shrink-0">
			<div class="panel-muted rounded-sm p-4 text-center">
				<p class="text-[#d3caa9] mb-3">
					{#if data.blockedByCurrentUser}
						You have blocked this user. Unblock them to send messages.
					{:else}
						This user has blocked you. You cannot send messages.
					{/if}
				</p>

				{#if data.blockedByCurrentUser}
					<form method="POST" action="?/unblockUser" use:enhance>
						<input type="hidden" name="blockedUserId" value={data.otherUser.id} />
						<Button type="submit" variant="secondary">Unblock User</Button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="flex flex-col h-full min-h-0">
		<!-- Header -->
		<div
			class="bg-[#171b12]/90 backdrop-blur-sm border-b border-[#c8b47a]/15 p-3 md:p-4 flex-shrink-0 sticky top-0 z-10"
		>
			<div class="flex items-center gap-2 md:gap-3">
				<IconButton icon={FluentArrowLeft20Filled} label="Back to messages" onclick={() => goto("/chat")} />

				<a
					href="/user/{data.otherUser.id}"
					class="flex items-center gap-2 md:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
				>
					{#if data.otherUser.logo && settings.loadImages}
						<img src={data.otherUser.logo} alt={data.otherUser.name} class="size-11 md:size-10 rounded-full" />
					{:else}
						<div class="size-11 md:size-10 rounded-full bg-[#1a1f15] flex items-center justify-center shrink-0">
							<FluentImageOff20Filled class="size-6 md:size-5 text-[#a8a083]" />
						</div>
					{/if}

					<div class="min-w-0">
						<h1 class="text-lg md:text-xl font-bold text-[#f5efd8] truncate">
							{#if data.otherUser.partyAbbreviation}
								<PartyTag abbreviation={data.otherUser.partyAbbreviation} color={data.otherUser.partyColor} />
							{/if}
							{data.otherUser.name || "Anonymous"}
						</h1>
						<p class="text-xs md:text-sm text-[#a8a083] truncate">Direct Message</p>
					</div>
				</a>

				<!-- Header Menu Dropdown -->
				<div class="dropdown dropdown-end">
					<label tabindex="0" class={buttonClass({ variant: "ghost", shape: "circle" })}>
						<FluentMoreVertical20Filled class="size-5" />
					</label>
					<ul
						tabindex="0"
						class="dropdown-content z-[1] menu p-2 shadow-lg bg-[#242a1d] border border-[#c8b47a]/15 rounded-sm w-52 mt-2"
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
			class="flex-1 min-h-0 bg-[#12150f]/50 p-3 md:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c8b47a]/20 scrollbar-track-transparent"
		>
			{#if allMessages.length === 0}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<FluentPerson20Filled class="size-16 text-[#a8a083]/70 mx-auto mb-4" />
						<p class="text-[#a8a083] text-base">No messages yet</p>
						<p class="text-[#a8a083] text-sm mt-1">Start the conversation!</p>
					</div>
				</div>
			{:else}
				{#each messagesByDay as day}
					<!-- Day Divider -->
					<div class="flex items-center gap-3 my-6">
						<div class="flex-1 h-px bg-[#c8b47a]/15"></div>
						<span
							class="text-[10px] uppercase tracking-wide text-[#a8a083] font-semibold px-3 py-1 panel-muted rounded-sm"
						>
							{formatDayDivider(day.date)}
						</span>
						<div class="flex-1 h-px bg-[#c8b47a]/15"></div>
					</div>

					{#each day.groups as group}
						{#if group.isFromCurrentUser}
							<!-- My messages group -->
							<div class="chat chat-end mb-3 md:mb-4">
								<div class="flex flex-col gap-1 items-end w-full max-w-[85%] md:max-w-md ml-auto">
									{#each group.messages as msg}
										<div
											class="chat-bubble before:hidden bg-[#f2b01e]/12 border border-[#f2b01e]/35 text-[#f5efd8] {msg.isOptimistic
												? 'opacity-70'
												: ''} text-sm md:text-base px-4 py-2.5 rounded-md break-words"
										>
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-full rounded-sm" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => handleLinkClick(e, part.content)}
															class="underline hover:text-[#ffcf47] break-all"
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
								<div class="chat-footer text-[#a8a083] text-xs mt-0.5 px-1">
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
											class="chat-bubble before:hidden bg-[#1a1f15]/70 border border-[#c8b47a]/10 text-[#e6ddbf] hover:bg-[#2e3524] hover:border-[#f2b01e]/35 transition-colors text-left cursor-pointer text-sm md:text-base px-4 py-2.5 rounded-md break-words"
										>
											{#each renderMessageContent(msg.content) as part}
												{#if part.type === "url"}
													{#if isImageUrl(part.content)}
														<div class="my-2">
															<img src={part.content} alt="Shared image" class="max-w-full rounded-sm" />
														</div>
													{:else}
														<a
															href={part.content}
															onclick={(e) => {
																e.stopPropagation();
																handleLinkClick(e, part.content);
															}}
															class="underline hover:text-[#ffcf47] break-all"
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
								<div class="chat-footer text-[#a8a083] text-xs mt-0.5 px-1">
									{formatGroupTime(group.lastMessageTime)}
								</div>
							</div>
						{/if}
					{/each}
				{/each}
			{/if}
		</div>

		<!-- Message input - Fixed to bottom -->
		<div class="bg-[#171b12]/90 backdrop-blur-sm border-t border-[#c8b47a]/15 p-3 md:p-4 flex-shrink-0">
			{#if form?.error}
				<div
					class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-3 mb-3 flex items-center gap-3 text-sm"
				>
					<p>{form.error}</p>
				</div>
			{/if}

			{#if form?.success && form?.message}
				<div
					class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-3 mb-3 flex items-center gap-3 text-sm"
				>
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
					class="field-control rounded-sm px-3 py-2.5 flex-1 resize-none min-h-[2.75rem] md:min-h-[2.5rem] max-h-32 text-base"
					disabled={isSubmitting}
					onkeydown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							e.currentTarget.form?.requestSubmit();
						}
					}}></textarea>
				<Button
					type="submit"
					variant="primary"
					icon={FluentSend20Filled}
					loading={isSubmitting}
					disabled={!message.trim()}
					class="min-w-[80px] md:min-w-[100px] self-end"
				>
					<span class="hidden md:inline">{isSubmitting ? "Sending" : "Send"}</span>
				</Button>
			</form>
			<p class="text-xs text-[#a8a083] mt-2 px-1">
				<span class="font-mono {message.length > 450 ? 'text-[#ffd35c] font-semibold' : ''}">{message.length}/500</span>
				<span class="hidden md:inline"> • Press Enter to send, Shift+Enter for new line</span>
			</p>
		</div>
	</div>
{/if}
