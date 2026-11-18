<!-- src/routes/(authenticated)/chat/party/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import ChatRoom from "#lib/component/chat/ChatRoom.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button } from "#lib/component/ui/index.js";

	const { data } = $props();
</script>

<svelte:head>
	<title>{`${data.party?.name ?? "Party"} · PsyOps`}</title>
</svelte:head>

{#if !data.party}
	<PageContainer maxWidth="3xl">
		<EmptyState icon={FluentPeople20Filled} title="You're not in a party">
			{#snippet actions()}
				<Button variant="primary" href="/party">Browse parties</Button>
			{/snippet}
		</EmptyState>
	</PageContainer>
{:else}
	{@const party = data.party}
	<ChatRoom
		conversation="party:{party.id}"
		messages={data.messages}
		currentUserId={data.currentUserId}
		canModerate={data.canModerate}
		sendAction="?/send"
		allowBlock
		placeholder="Message #{party.name}"
		emptyIcon={FluentPeople20Filled}
	>
		{#snippet header()}
			<a href="/party/{party.id}" class="group flex min-w-0 items-center gap-3">
				<Logo
					src={party.logo}
					alt=""
					class="size-9 shrink-0 rounded-sm border border-white/10"
					placeholderIcon={FluentPeople20Filled}
				/>
				<div class="min-w-0 leading-tight">
					<h1
						class="truncate font-sans text-[15px] font-semibold text-fg transition-colors group-hover:text-primary-fg"
					>
						#{party.name}
					</h1>
					<p class="truncate font-mono text-[11px] tracking-wide text-fg-muted uppercase">
						Party channel · {party.memberCount}
						{party.memberCount === 1 ? "member" : "members"}
					</p>
				</div>
			</a>
		{/snippet}
	</ChatRoom>
{/if}
