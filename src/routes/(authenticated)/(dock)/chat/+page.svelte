<!-- src/routes/(authenticated)/chat/+page.svelte -->
<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { onMount, type Snippet } from "svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { settings } from "#lib/settings.svelte.js";
	import { listTime, readSeen } from "#lib/component/chat/chat.js";

	const { data } = $props();

	// Unread = the newest message is someone else's and newer than when this
	// browser last had the conversation open.
	let seen = $state<Record<string, string> | null>(null);
	const isUnread = (key: string, last: { sentAt: string; isFromCurrentUser: boolean } | null | undefined) =>
		!!seen && !!last && !last.isFromCurrentUser && (!seen[key] || seen[key] < last.sentAt);

	onMount(() => {
		seen = readSeen();
		const source = new EventSource("/chat/stream");
		source.addEventListener("message", (event) => {
			if (JSON.parse(event.data).type === "new_messages") invalidate("app:chat");
		});
		return () => source.close();
	});
</script>

{#snippet row(opts: {
	href: string;
	name: string;
	unread: boolean;
	time: string | null;
	muted?: boolean;
	avatar: Snippet;
	title: Snippet;
	preview: Snippet;
})}
	<a href={opts.href} class="conv group" class:opacity-60={opts.muted} aria-label={opts.name}>
		{@render opts.avatar()}
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline gap-2">
				<div class="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] font-semibold text-fg">
					{@render opts.title()}
				</div>
				{#if opts.time}
					<span class="shrink-0 font-mono text-[11px] tabular-nums {opts.unread ? 'text-primary-fg' : 'text-fg-muted'}">
						{opts.time}
					</span>
				{/if}
			</div>
			<div class="mt-0.5 flex items-center gap-2">
				<p class="min-w-0 flex-1 truncate text-sm {opts.unread ? 'text-fg-body' : 'text-fg-muted'}">
					{@render opts.preview()}
				</p>
				{#if opts.unread}
					<span class="size-2.5 shrink-0 rounded-full bg-[var(--color-primary-hi)]" aria-label="Unread"></span>
				{/if}
			</div>
		</div>
	</a>
{/snippet}

<PageContainer maxWidth="3xl">
	<PageHeader title="Messages" icon={FluentChat20Filled} />

	<section class="space-y-2">
		<h2 class="section-title px-1">Channels</h2>
		<div class="panel divide-y divide-white/[0.06] overflow-hidden rounded-sm">
			<!-- Global -->
			{#snippet globalAvatar()}
				<div class="chan-icon">
					<FluentEarth20Filled class="size-5" />
				</div>
			{/snippet}
			{#snippet globalTitle()}
				<span class="truncate">#global</span>
				<span class="font-mono text-[10px] font-medium tracking-wider text-fg-muted uppercase">EN</span>
			{/snippet}
			{#snippet globalPreview()}
				{#if data.globalChat.lastMessage}
					{@const last = data.globalChat.lastMessage}
					<span class="font-medium text-fg-soft"
						>{last.isFromCurrentUser ? "You" : last.senderName}{#if !last.isFromCurrentUser && last.senderPartyAbbreviation}
							<PartyTag abbreviation={last.senderPartyAbbreviation} color={last.senderPartyColor} />{/if}:</span
					>
					{last.content}
				{:else}
					No traffic yet
				{/if}
			{/snippet}
			{@render row({
				href: "/chat/en",
				name: "Global channel",
				unread: isUnread("global", data.globalChat.lastMessage),
				time: data.globalChat.lastMessage ? listTime(data.globalChat.lastMessage.sentAt) : null,
				avatar: globalAvatar,
				title: globalTitle,
				preview: globalPreview
			})}

			<!-- Party -->
			{#if data.partyChat}
				{@const party = data.partyChat}
				{#snippet partyAvatar()}
					<Logo
						src={party.logo}
						alt=""
						class="size-11 shrink-0 rounded-sm border border-white/10"
						placeholderIcon={FluentPeople20Filled}
					/>
				{/snippet}
				{#snippet partyTitle()}
					<span class="truncate">#{party.name}</span>
					<Badge tone="green" size="xs" class="shrink-0">Party</Badge>
				{/snippet}
				{#snippet partyPreview()}
					{#if party.lastMessage}
						<span class="font-medium text-fg-soft"
							>{party.lastMessage.isFromCurrentUser ? "You" : party.lastMessage.senderName}:</span
						>
						{party.lastMessage.content}
					{:else}
						No traffic yet
					{/if}
				{/snippet}
				{@render row({
					href: "/chat/party",
					name: `${party.name} channel`,
					unread: isUnread(`party:${party.partyId}`, party.lastMessage),
					time: party.lastMessage ? listTime(party.lastMessage.sentAt) : null,
					avatar: partyAvatar,
					title: partyTitle,
					preview: partyPreview
				})}
			{/if}
		</div>
	</section>

	<section class="mt-6 space-y-2">
		<h2 class="section-title px-1">Direct</h2>
		{#if data.directChats.length === 0}
			<EmptyState icon={FluentPerson20Filled} title="No direct messages yet" />
		{:else}
			<div class="panel divide-y divide-white/[0.06] overflow-hidden rounded-sm">
				{#each data.directChats as chat (chat.otherUserId)}
					{#snippet avatar()}
						<Logo
							src={settings.loadImages ? chat.otherUserLogo : null}
							alt=""
							class="size-11 shrink-0 rounded-full border border-white/10"
							placeholderIcon={FluentPerson20Filled}
							placeholderGradient="from-surface-11 to-surface-5"
						/>
					{/snippet}
					{#snippet title()}
						<span class="truncate">{chat.otherUserName}</span>
						{#if chat.otherUserPartyAbbreviation}
							<PartyTag abbreviation={chat.otherUserPartyAbbreviation} color={chat.otherUserPartyColor} />
						{/if}
						{#if chat.isBlocked}
							<Badge tone="red" size="xs" class="shrink-0">Blocked</Badge>
						{/if}
					{/snippet}
					{#snippet preview()}
						{#if chat.lastMessage.isFromCurrentUser}<span class="font-medium text-fg-soft">You:</span>{/if}
						{chat.lastMessage.content}
					{/snippet}
					{@render row({
						href: `/chat/user/${chat.otherUserId}`,
						name: chat.otherUserName,
						unread: !chat.isBlocked && isUnread(`user:${chat.otherUserId}`, chat.lastMessage),
						time: listTime(chat.lastMessage.sentAt),
						muted: chat.isBlocked,
						avatar,
						title,
						preview
					})}
				{/each}
			</div>
		{/if}
	</section>
</PageContainer>

<style>
	@reference "../../../../app.css";

	.conv {
		@apply flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none;
		-webkit-tap-highlight-color: transparent;
	}
	.conv:active {
		@apply bg-white/[0.07];
	}

	.chan-icon {
		@apply flex size-11 shrink-0 items-center justify-center rounded-sm border border-[var(--color-primary-hi)]/35 bg-[var(--color-primary-hi)]/12 text-primary-fg;
	}
</style>
