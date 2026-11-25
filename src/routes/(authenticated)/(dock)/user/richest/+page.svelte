<!-- src/routes/(authenticated)/(dock)/user/richest/+page.svelte -->
<!-- Who owns the most, ranked by the same balance sheet the net worth pages use. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";

	let { data } = $props();
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
</script>

<svelte:head>
	<title>Richest players · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader title="Richest players" subtitle="Cash, shares, stockpiles and bonds, priced at today's market">
		{#snippet actions()}
			<Button href="/user/{data.viewerId}" variant="secondary" size="sm" icon={FluentChevronLeft20Filled}>
				My profile
			</Button>
		{/snippet}
	</PageHeader>

	<section class="panel rounded-sm overflow-hidden">
		<div class="flex items-center gap-2 border-b border-line/15 px-4 py-3">
			<FluentTrophy20Filled class="size-4 text-warning" />
			<h2 class="section-title">Leaderboard</h2>
			<span class="ml-auto font-mono text-xs text-fg-muted">{data.players.length} players</span>
		</div>
		{#if data.players.length === 0}
			<p class="px-4 py-8 text-center text-sm text-fg-muted">No players yet.</p>
		{:else}
			<ol class="divide-y divide-line/10">
				{#each data.players as player, i (player.id)}
					<li class="flex items-center gap-3 px-3 py-2.5 sm:px-4 {player.id === data.viewerId ? 'bg-primary/8' : ''}">
						<span class="w-7 shrink-0 text-right font-mono text-xs text-fg-muted">{i + 1}</span>
						<span class="min-w-0 flex-1">
							<UserLink id={player.id} name={player.name} size="sm" />
						</span>
						<span class="font-mono text-sm font-bold text-fg">{money(player.total)}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</PageContainer>
