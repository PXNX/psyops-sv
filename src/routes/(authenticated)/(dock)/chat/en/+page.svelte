<!-- src/routes/(authenticated)/chat/en/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import ChatMessageMenu from "$lib/component/ChatMessageMenu.svelte";
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

	// Auto-scroll to bottom when messages update
	$effect(() => {
		if (chatContainer && data.messages.length > 0 && shouldAutoScroll) {
			setTimeout(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 100);
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

	function handleReport(messageId: number, userId: string, userName: string) {
		reportMessageId = messageId;
		reportUserId = userId;
		reportUserName = userName;
		showReportModal = true;
	}
</script>

<ReportModal
	bind:show={showReportModal}
	targetType="account"
	targetId={reportUserId || ""}
	targetName={reportUserName || "User"}
/>

<div class="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col">
	<!-- Header -->
	<div class="bg-slate-800/50 rounded-t-xl border border-white/5 p-4">
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
		{#if data.messages.length === 0}
			<div class="flex items-center justify-center h-full">
				<p class="text-gray-400 text-center">No messages yet. Be the first to say something!</p>
			</div>
		{:else}
			{#each data.messages as msg}
				{#if msg.isFromCurrentUser}
					<!-- My messages -->
					<div class="chat chat-end">
						<div class="chat-bubble bg-blue-600 text-white">
							{msg.content}
						</div>
						<div class="chat-footer opacity-50 text-xs">
							{formatTime(msg.sentAt)}
						</div>
					</div>
				{:else}
					<!-- Other users' messages -->
					<div class="chat chat-start">
						<div class="chat-image avatar">
							<a href="/user/{msg.senderId}" class="w-10 rounded-full">
								{#if msg.senderLogo}
									<img src={msg.senderLogo} alt={msg.senderName || "User"} />
								{:else}
									<div class="w-full h-full bg-slate-700 flex items-center justify-center">
										<FluentImageOff20Filled class="size-5 text-gray-400" />
									</div>
								{/if}
							</a>
						</div>
						<div class="chat-header text-sm opacity-70 mb-1">
							<a href="/user/{msg.senderId}" class="hover:text-blue-400 transition-colors">
								{msg.senderName || "Anonymous"}
							</a>
						</div>
						<div class="chat-bubble bg-slate-700 text-gray-200 relative group">
							{msg.content}
							<div class="absolute -right-8 top-0">
								<ChatMessageMenu
									messageId={msg.id}
									senderId={msg.senderId}
									senderName={msg.senderName || "Anonymous"}
									allowBlock={false}
									onReport={() => handleReport(msg.id, msg.senderId, msg.senderName || "Anonymous")}
								/>
							</div>
						</div>
						<div class="chat-footer opacity-50 text-xs">
							{formatTime(msg.sentAt)}
						</div>
					</div>
				{/if}
			{/each}
		{/if}
	</div>

	<!-- Message input -->
	<div class="bg-slate-800/50 rounded-b-xl border border-white/5 p-4">
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
			use:enhance={({ formData }) => {
				isSubmitting = true;
				shouldAutoScroll = true;

				return async ({ result, update }) => {
					if (result.type === "success") {
						message = "";
						await invalidateAll();
					} else {
						await update();
					}
					isSubmitting = false;
				};
			}}
			class="flex gap-2"
		>
			<input
				type="text"
				name="content"
				bind:value={message}
				placeholder="Type a message..."
				maxlength="500"
				class="input input-bordered flex-1 bg-slate-700/50 border-slate-600/30 text-white placeholder-gray-400"
				disabled={isSubmitting}
			/>
			<button
				type="submit"
				class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white gap-2"
				disabled={isSubmitting || !message.trim()}
			>
				<FluentSend20Filled class="size-5" />
				Send
			</button>
		</form>
		<p class="text-xs text-gray-500 mt-2">
			{message.length}/500 characters
		</p>
	</div>
</div>
