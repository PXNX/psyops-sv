<!-- src/routes/(authenticated)/chat/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";
	import FluentMoreVertical20Filled from "~icons/fluent/more-vertical-20-filled";
	import ChatRoom from "#lib/component/chat/ChatRoom.svelte";
	import BlockUserModal from "#lib/component/BlockUserModal.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { ActionListItem, Button, IconButton } from "#lib/component/ui/index.js";
	import { settings } from "#lib/settings.svelte.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";

	const { data } = $props();

	let menuOpen = $state(false);
	let blockOpen = $state(false);
	let unblocking = $state(false);
</script>

<svelte:head>
	<title>{`${data.otherUser?.name || "Direct message"} · PsyOps`}</title>
</svelte:head>

{#if !data.otherUser}
	<PageContainer maxWidth="3xl">
		<EmptyState icon={FluentPerson20Filled} title="User not found">
			{#snippet actions()}
				<Button variant="primary" href="/chat">Back to messages</Button>
			{/snippet}
		</EmptyState>
	</PageContainer>
{:else}
	{@const other = data.otherUser}

	<BlockUserModal bind:open={blockOpen} userId={other.id} userName={other.name} onClose={() => {}} />

	<BottomSheet bind:open={menuOpen} title={other.name}>
		<ActionListItem
			icon={FluentPersonProhibited20Filled}
			tone="red"
			danger
			title="Block {other.name}"
			onclick={() => {
				menuOpen = false;
				blockOpen = true;
			}}
		/>
	</BottomSheet>

	{#snippet blockedBar()}
		{#if data.isBlocked}
			<div class="panel flex items-center gap-3 rounded-sm px-3 py-2">
				<FluentPersonProhibited20Filled class="size-5 shrink-0 text-red-400" />
				<p class="min-w-0 flex-1 text-sm text-fg-soft">
					{data.blockedByCurrentUser ? "You blocked this user." : "You can't message this user."}
				</p>
				{#if data.blockedByCurrentUser}
					<form
						method="POST"
						action="?/unblockUser"
						use:enhance={() => {
							unblocking = true;
							return async ({ result, update }) => {
								await update();
								toastResult(result);
								unblocking = false;
							};
						}}
					>
						<input type="hidden" name="blockedUserId" value={other.id} />
						<Button type="submit" variant="secondary" size="sm" loading={unblocking}>Unblock</Button>
					</form>
				{/if}
			</div>
		{/if}
	{/snippet}

	<ChatRoom
		conversation="user:{other.id}"
		messages={data.messages}
		currentUserId={data.currentUserId}
		canModerate={data.canModerate}
		sendAction="?/postMessage"
		showSenders={false}
		placeholder="Message {other.name}"
		emptyIcon={FluentPerson20Filled}
		locked={data.isBlocked ? blockedBar : undefined}
	>
		{#snippet header()}
			<UserLink
				id={other.id}
				name={other.name}
				avatar={settings.loadImages ? other.logo : null}
				party={{ abbreviation: other.partyAbbreviation, color: other.partyColor }}
				subtitle={data.isBlocked ? "Blocked" : "Direct line"}
				size="md"
				class="min-w-0"
			/>
		{/snippet}

		{#snippet headerActions()}
			{#if !data.isBlocked}
				<IconButton icon={FluentMoreVertical20Filled} label="Conversation options" size="sm" onclick={() => (menuOpen = true)} />
			{/if}
		{/snippet}

	</ChatRoom>
{/if}
