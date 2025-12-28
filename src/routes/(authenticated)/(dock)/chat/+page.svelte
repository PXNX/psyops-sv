<!-- src/routes/(authenticated)/chat/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto, invalidateAll } from "$app/navigation";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
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

	function switchChat(type: string) {
		goto(`/chat?type=${type}`);
	}
</script>

<div class="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col">
	<!-- Header with tabs -->
	<div class="bg-slate-800/50 rounded-t-xl border border-white/5 p-4">
		<div class="flex items-center gap-2 mb-4">
			<h1 class="text-2xl font-bold text-white">Chat</h1>
		</div>

		<div class="flex gap-2">
			<button
				onclick={() => switchChat("global")}
				class="btn btn-sm gap-2 {data.currentType === 'global'
					? 'bg-blue-600 text-white'
					: 'bg-slate-700/50 text-gray-300'}"
			>
				<FluentEarth20Filled class="size-4" />
				Global
			</button>

			{#if data.userInfo?.hasState}
				<button
					onclick={() => switchChat("state")}
					class="btn btn-sm gap-2 {data.currentType === 'state'
						? 'bg-purple-600 text-white'
						: 'bg-slate-700/50 text-gray-300'}"
				>
					<FluentBuildingGovernment20Filled class="size-4" />
					{data.userInfo.stateName}
				</button>
			{/if}

			{#if data.userInfo?.hasParty}
				<button
					onclick={() => switchChat("party")}
					class="btn btn-sm gap-2 {data.currentType === 'party'
						? 'bg-emerald-600 text-white'
						: 'bg-slate-700/50 text-gray-300'}"
				>
					<FluentPeople20Filled class="size-4" />
					{data.userInfo.partyName}
				</button>
			{/if}
		</div>
	</div>

	<!-- Messages container -->
	<div bind:this={chatContainer} class="flex-1 bg-slate-800/30 border-x border-white/5 p-4 overflow-y-auto space-y-3">
		{#if data.messages.length === 0}
			<div class="flex items-center justify-center h-full">
				<p class="text-gray-400 text-center">No messages yet. Be the first to say something!</p>
			</div>
		{:else}
			{#each data.messages as msg}
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
						<p class="text-gray-300 break-words">{msg.content}</p>
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
			action="?/sendMessage"
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
			<input type="hidden" name="type" value={data.currentType} />
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
