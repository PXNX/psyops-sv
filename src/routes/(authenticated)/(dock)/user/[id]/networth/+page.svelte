<!-- src/routes/(authenticated)/(dock)/user/[id]/networth/+page.svelte -->
<!-- What a player owns, priced at today's market: cash, shares, stockpiles
     and loans to states, plus the richest players on the server. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";
	import { goodLabel } from "#lib/config/index.js";

	let { data } = $props();
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
	const qty = (n: number) => n.toLocaleString("en-US");
	const parts = $derived([
		{ label: "Cash", value: data.worth.cash, cls: "text-positive-fg" },
		{ label: "Shares", value: data.worth.stocks, cls: "text-primary-fg" },
		{ label: "Resources", value: data.worth.resources, cls: "text-warning" },
		{ label: "Bonds", value: data.worth.bonds, cls: "text-fg" }
	]);
</script>

<svelte:head>
	<title>Net worth · {data.userName} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader title="Net worth" subtitle={data.userName}>
		{#snippet actions()}
			<Button href="/user/{data.userId}" variant="secondary" size="sm" icon={FluentChevronLeft20Filled}>Profile</Button>
		{/snippet}
	</PageHeader>

	<section class="panel rounded-sm p-4 sm:p-5">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Total</h2>
			<p class="font-mono text-2xl font-bold text-fg">{money(data.worth.total)}</p>
		</div>
		<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each parts as part (part.label)}
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">{part.label}</p>
					<p class="font-mono text-lg font-bold {part.cls}">{money(part.value)}</p>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-fg-muted">
			Shares use the current quote; stockpiles use the cheapest live ask on the market; bonds count their outstanding
			principal. Unpriced goods are listed but add nothing until someone offers to buy them.
		</p>
	</section>

	<div class="mt-4 grid gap-4 items-start lg:grid-cols-2">
		<div class="space-y-4">
			<section class="panel rounded-sm p-4">
				<h2 class="section-title mb-2">Held shares</h2>
				{#if data.worth.shareHoldings.length}
					<ul class="divide-y divide-line/15 text-sm">
						{#each data.worth.shareHoldings as h (h.label)}
							<li class="flex items-center justify-between gap-3 py-2">
								<span class="min-w-0 truncate">
									{#if h.href}<a href={h.href} class="text-fg hover:text-primary-fg">{h.label}</a>{:else}{h.label}{/if}
									<span class="text-xs text-fg-muted">· {qty(h.quantity)} × {money(h.unitPrice)}</span>
								</span>
								<span class="font-mono shrink-0 text-fg">{money(h.value)}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">No shares held.</p>
				{/if}
			</section>

			<section class="panel rounded-sm p-4">
				<h2 class="section-title mb-2">Resources & goods</h2>
				{#if data.worth.inventory.length}
					<ul class="divide-y divide-line/15 text-sm">
						{#each data.worth.inventory as h (h.label)}
							<li class="flex items-center justify-between gap-3 py-2">
								<span class="min-w-0 truncate">
									{#if h.href}<a href={h.href} class="text-fg hover:text-primary-fg">
											{goodLabel(h.label)}
										</a>{:else}{goodLabel(h.label)}{/if}
									<span class="text-xs text-fg-muted">· {qty(h.quantity)} × {money(h.unitPrice)}</span>
								</span>
								<span class="font-mono shrink-0 text-fg">{money(h.value)}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">No stockpile.</p>
				{/if}
			</section>

			<section class="panel rounded-sm p-4">
				<h2 class="section-title mb-2">Bonds</h2>
				{#if data.worth.bondHoldings.length}
					<ul class="divide-y divide-line/15 text-sm">
						{#each data.worth.bondHoldings as h, i (i)}
							<li class="flex items-center justify-between gap-3 py-2">
								<span class="min-w-0 truncate">
									<a href={h.href} class="text-fg hover:text-primary-fg">{h.label}</a>
								</span>
								<span class="font-mono shrink-0 text-fg">{money(h.value)}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">No outstanding bonds.</p>
				{/if}
			</section>
		</div>

		<section class="panel rounded-sm p-4">
			<h2 class="section-title mb-3 flex items-center gap-2">
				<FluentTrophy20Filled class="size-4 text-warning" /> Richest players
			</h2>
			<ol class="space-y-1 text-sm">
				{#each data.leaders as player, i (player.id)}
					<li
						class="flex items-center gap-3 rounded-sm px-2 py-1.5 {player.id === data.userId
							? 'bg-primary/10'
							: 'hover:bg-white/[0.04]'}"
					>
						<span class="w-5 shrink-0 text-right font-mono text-xs text-fg-muted">{i + 1}</span>
						<a
							href="/user/{player.id}/networth"
							class="min-w-0 flex-1 truncate text-fg hover:text-primary-fg"
							title={player.id === data.userId ? "You" : undefined}
						>
							{player.name}
						</a>
						<span class="font-mono shrink-0 text-fg-body">{money(player.total)}</span>
					</li>
				{/each}
			</ol>
		</section>
	</div>
</PageContainer>
