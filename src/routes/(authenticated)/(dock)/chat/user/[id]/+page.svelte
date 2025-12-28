<!-- src/routes/(authenticated)/chat/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";

	const { data, form } = $props();

	let message = $state("");
	let isSubmitting = $state(false);
	let chatContainer: HTMLDivElement;

	// Auto-scroll to bottom when messages update
	$effect(() => {
		if (chatContainer && data.messages.length > 0) {
			setTimeout(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 100);
		}
	});

	// Auto-refresh every 5 seconds
	let refreshInterval: number;
	$effect(() => {
		refreshInterval = setInterval(() => {
			invalidateAll();
		}, 5000);
		return () => clearInterval(refreshInterval);
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
</script>

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
{:else}
	<div class="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col">
		<!-- Header -->
		<div class="bg-slate-800/50 rounded-t-xl border border-white/5 p-4">
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
			</div>
		</div>

		<!-- Messages container -->
		<div bind:this={chatContainer} class="flex-1 bg-slate-800/30 border-x border-white/5 p-4 overflow-y-auto space-y-3">
			{#if data.messages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-gray-400 text-center">No messages yet. Start the conversation!</p>
				</div>
			{:else}
				{#each data.messages as msg}
					<div class="flex gap-3 {msg.isFromCurrentUser ? 'flex-row-reverse' : ''} group">
						<div class="flex-shrink-0">
							{#if msg.senderLogo}
								<img src={msg.senderLogo} alt={msg.senderName || "User"} class="size-10 rounded-full" />
							{:else}
								<div class="size-10 rounded-full bg-slate-700 flex items-center justify-center">
									<FluentImageOff20Filled class="size-5 text-gray-400" />
								</div>
							{/if}
						</div>

						<div class="flex-1 min-w-0 max-w-md {msg.isFromCurrentUser ? 'flex flex-col items-end' : ''}">
							<div class="flex items-baseline gap-2 mb-1 {msg.isFromCurrentUser ? 'flex-row-reverse' : ''}">
								<span class="font-semibold text-white text-sm">
									{msg.senderName || "Anonymous"}
								</span>
								<span class="text-xs text-gray-500">{formatTime(msg.sentAt)}</span>
							</div>
							<div
								class="rounded-lg p-3 {msg.isFromCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-200'}"
							>
								<p class="break-words">{msg.content}</p>
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
						invalidateAll();
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
{/if}
