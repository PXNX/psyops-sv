<!-- src/routes/(authenticated)/chat/en/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import { onMount, onDestroy } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentNews20Filled from "~icons/fluent/news-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import ExternalLinkWarning from "$lib/component/ExternalLinkWarning.svelte";

	const { data, form } = $props();

	let message = $state("");
	let isSubmitting = $state(false);
	let chatContainer: HTMLDivElement;
	let isLoadingMore = $state(false);
	let hasMoreMessages = $state(true);
	let eventSource: EventSource | null = null;
	let messages = $state(data.messages || []);
	let showExternalWarning = $state(false);
	let externalUrl = $state("");

	// SSE Connection
	function connectSSE() {
		const lastId = messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0;
		eventSource = new EventSource(`/chat/en/events?lastId=${lastId}`);

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === "messages" && data.data) {
					const newMessages = data.data;
					messages = [...messages, ...newMessages];

					// Auto-scroll to bottom for new messages
					setTimeout(() => {
						if (chatContainer) {
							chatContainer.scrollTop = chatContainer.scrollHeight;
						}
					}, 100);
				}
			} catch (error) {
				console.error("Failed to parse SSE message:", error);
			}
		};

		eventSource.onerror = (error) => {
			console.error("SSE error:", error);
			eventSource?.close();

			// Reconnect after 5 seconds
			setTimeout(() => {
				connectSSE();
			}, 5000);
		};
	}

	onMount(() => {
		connectSSE();
	});

	onDestroy(() => {
		eventSource?.close();
	});

	// Auto-scroll to bottom on initial load
	$effect(() => {
		if (chatContainer && messages.length > 0 && !isLoadingMore) {
			setTimeout(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 100);
		}
	});

	// Load more messages on scroll
	function handleScroll() {
		if (chatContainer.scrollTop === 0 && !isLoadingMore && hasMoreMessages) {
			loadMoreMessages();
		}
	}

	async function loadMoreMessages() {
		if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;

		isLoadingMore = true;
		const oldestMessageId = messages[0]?.id;

		try {
			const response = await fetch(`/chat/en/load-more?before=${oldestMessageId}`);
			const newMessages = await response.json();

			if (newMessages.length < 20) {
				hasMoreMessages = false;
			}

			if (newMessages.length > 0) {
				const oldScrollHeight = chatContainer.scrollHeight;
				messages = [...newMessages, ...messages];

				setTimeout(() => {
					chatContainer.scrollTop = chatContainer.scrollHeight - oldScrollHeight;
				}, 0);
			}
		} catch (error) {
			console.error("Failed to load more messages:", error);
		} finally {
			isLoadingMore = false;
		}
	}

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

	function isImageUrl(url: string): boolean {
		return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
	}

	function extractUrls(text: string): string[] {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		return text.match(urlRegex) || [];
	}

	function isInternalUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			const currentHost = window.location.hostname;
			return urlObj.hostname === currentHost || urlObj.hostname === "localhost";
		} catch {
			return url.startsWith("/");
		}
	}

	function handleUrlClick(event: MouseEvent, url: string) {
		if (!isInternalUrl(url)) {
			event.preventDefault();
			externalUrl = url;
			showExternalWarning = true;
		}
	}

	function parseMessage(content: string) {
		const urls = extractUrls(content);
		const parts: Array<{ type: "text" | "image" | "url"; content: string }> = [];
		let lastIndex = 0;

		urls.forEach((url) => {
			const index = content.indexOf(url, lastIndex);
			if (index > lastIndex) {
				parts.push({ type: "text", content: content.substring(lastIndex, index) });
			}

			if (isImageUrl(url)) {
				parts.push({ type: "image", content: url });
			} else {
				parts.push({ type: "url", content: url });
			}

			lastIndex = index + url.length;
		});

		if (lastIndex < content.length) {
			parts.push({ type: "text", content: content.substring(lastIndex) });
		}

		return parts.length > 0 ? parts : [{ type: "text", content }];
	}

	function extractLinkPreview(url: string): { type: string | null; id: string | null } {
		const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
		const partyMatch = url.match(/\/party\/(\d+)/);
		const newspaperMatch = url.match(/\/newspaper\/(\d+)/);
		const stateMatch = url.match(/\/state\/(\d+)/);
		const blocMatch = url.match(/\/bloc\/(\d+)/);
		const articleMatch = url.match(/\/article\/(\d+)/);

		if (userMatch) return { type: "user", id: userMatch[1] };
		if (partyMatch) return { type: "party", id: partyMatch[1] };
		if (newspaperMatch) return { type: "newspaper", id: newspaperMatch[1] };
		if (stateMatch) return { type: "state", id: stateMatch[1] };
		if (blocMatch) return { type: "bloc", id: blocMatch[1] };
		if (articleMatch) return { type: "article", id: articleMatch[1] };
		return { type: null, id: null };
	}

	function getLinkPreviewIcon(type: string) {
		switch (type) {
			case "user":
				return FluentPerson20Filled;
			case "party":
				return FluentPeople20Filled;
			case "newspaper":
				return FluentNews20Filled;
			case "state":
				return FluentGlobe20Filled;
			case "article":
				return FluentDocument20Filled;
			default:
				return FluentChevronRight20Filled;
		}
	}
</script>

<ExternalLinkWarning bind:open={showExternalWarning} url={externalUrl} />

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
	class="flex-1 bg-slate-800/30 border-x border-white/5 p-4 overflow-y-auto space-y-3"
>
	{#if isLoadingMore}
		<div class="text-center py-2">
			<span class="loading loading-spinner loading-sm text-blue-500"></span>
		</div>
	{/if}

	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-gray-400 text-center">No messages yet. Be the first to say something!</p>
		</div>
	{:else}
		{#each messages as msg}
			<div class="flex gap-3 group hover:bg-slate-700/20 p-2 rounded-lg transition-colors">
				<a href="/user/{msg.senderId}" class="flex-shrink-0">
					{#if msg.senderLogo}
						<img src={msg.senderLogo} alt={msg.senderName || "User"} class="size-10 rounded-full" />
					{:else}
						<div class="size-10 rounded-full bg-slate-700 flex items-center justify-center">
							<FluentImageOff20Filled class="size-5 text-gray-400" />
						</div>
					{/if}
				</a>

				<div class="flex-1 min-w-0">
					<div class="flex items-baseline gap-2 mb-1">
						<a href="/user/{msg.senderId}" class="font-semibold text-white hover:text-blue-400 transition-colors">
							{msg.senderName || "Anonymous"}
						</a>
						<span class="text-xs text-gray-500">{formatTime(msg.sentAt)}</span>
					</div>

					<div class="space-y-2">
						{#each parseMessage(msg.content) as part}
							{#if part.type === "text"}
								<p class="text-gray-300 break-words">{part.content}</p>
							{:else if part.type === "image"}
								<img
									src={part.content}
									alt="Shared image"
									class="rounded-lg max-w-md max-h-96 object-cover border border-white/10"
									onerror={(e) => (e.currentTarget.style.display = "none")}
								/>
							{:else if part.type === "url"}
								{@const preview = extractLinkPreview(part.content)}
								{#if preview.type && msg.linkPreview?.type === preview.type}
									<a
										href={part.content}
										onclick={(e) => handleUrlClick(e, part.content)}
										class="flex items-center gap-3 bg-slate-700/50 hover:bg-slate-700 border border-white/10 rounded-lg p-3 transition-colors max-w-md"
									>
										{#if msg.linkPreview.logo}
											<img src={msg.linkPreview.logo} alt="" class="size-10 rounded-full" />
										{:else if msg.linkPreview.color}
											<div
												class="size-10 rounded-full flex items-center justify-center"
												style="background-color: {msg.linkPreview.color}"
											>
												<svelte:component this={getLinkPreviewIcon(preview.type)} class="size-5 text-white" />
											</div>
										{:else}
											<div class="size-10 rounded-full bg-slate-600 flex items-center justify-center">
												<svelte:component this={getLinkPreviewIcon(preview.type)} class="size-5 text-gray-400" />
											</div>
										{/if}
										<div class="flex-1 min-w-0">
											<p class="font-semibold text-white truncate">
												{msg.linkPreview.name || msg.linkPreview.title || "Unknown"}
											</p>
											{#if msg.linkPreview.memberCount !== undefined}
												<p class="text-sm text-gray-400">{msg.linkPreview.memberCount} members</p>
											{:else if msg.linkPreview.population !== undefined}
												<p class="text-sm text-gray-400">Population: {msg.linkPreview.population.toLocaleString()}</p>
											{:else if msg.linkPreview.authorName}
												<p class="text-sm text-gray-400">By {msg.linkPreview.authorName}</p>
											{:else if preview.type}
												<p class="text-sm text-gray-400">View {preview.type}</p>
											{/if}
										</div>
										<FluentChevronRight20Filled class="size-5 text-gray-400" />
									</a>
								{:else}
									<a
										href={part.content}
										onclick={(e) => handleUrlClick(e, part.content)}
										target="_blank"
										rel="noopener noreferrer"
										class="text-blue-400 hover:text-blue-300 underline break-all"
									>
										{part.content}
									</a>
								{/if}
							{/if}
						{/each}
					</div>
				</div>
			</div>
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

	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				message = "";
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
