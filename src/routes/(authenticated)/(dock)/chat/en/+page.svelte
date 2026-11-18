<!-- src/routes/(authenticated)/chat/en/+page.svelte -->
<script lang="ts">
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import ChatRoom from "#lib/component/chat/ChatRoom.svelte";

	const { data } = $props();
</script>

<svelte:head>
	<title>Global · PsyOps</title>
</svelte:head>

<ChatRoom
	conversation="global"
	messages={data.messages}
	currentUserId={data.currentUserId}
	canModerate={data.canModerate}
	sendAction="?/send"
	allowBlock
	placeholder="Message #global"
	emptyIcon={FluentEarth20Filled}
>
	{#snippet header()}
		<div
			class="flex size-9 shrink-0 items-center justify-center rounded-sm border border-[var(--color-primary-hi)]/35 bg-[var(--color-primary-hi)]/12 text-primary-fg"
		>
			<FluentEarth20Filled class="size-5" />
		</div>
		<div class="min-w-0 leading-tight">
			<h1 class="truncate font-sans text-[15px] font-semibold text-fg">#global</h1>
			<p class="truncate font-mono text-[11px] tracking-wide text-fg-muted uppercase">Open channel · EN</p>
		</div>
	{/snippet}
</ChatRoom>
