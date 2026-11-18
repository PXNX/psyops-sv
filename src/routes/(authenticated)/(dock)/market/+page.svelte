<!-- src/routes/(authenticated)/(dock)/market/+page.svelte -->
<!-- The exchange's quote board: every commodity with its best ask, 24h move
     and how much of it you hold. -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";

	let { data } = $props();

	const boards = [
		{ title: "Raw materials", items: ["iron", "copper", "steel", "gunpowder", "wood", "coal"] },
		{ title: "Goods", items: ["rifles", "ammunition", "artillery", "vehicles", "explosives"] }
	];

	const held = $derived(
		new Map<string, number>([
			...data.resources.map((r) => [r.resourceType, r.quantity] as [string, number]),
			...data.products.map((p) => [p.productType, p.quantity] as [string, number])
		])
	);
</script>

<PageContainer maxWidth="4xl">
	<PageHeader title="Exchange">
		{#snippet actions()}
			<div class="panel-muted rounded-sm px-3 py-2 text-right">
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Cash</p>
				<p class="text-sm sm:text-base font-bold text-[#f5efd8] font-mono">${data.wallet.balance.toLocaleString()}</p>
			</div>
		{/snippet}
	</PageHeader>

	{#each boards as board}
		<section class="panel rounded-sm overflow-hidden">
			<div
				class="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] sm:grid-cols-[minmax(0,1fr)_6rem_6rem_8rem] gap-3 px-4 py-2 border-b border-[#c8b47a]/15 bg-[#1a1f15]/70 text-[10px] uppercase tracking-wide text-[#a8a083]"
			>
				<h2 class="section-title">{board.title}</h2>
				<span class="text-right self-center">Held</span>
				<span class="hidden sm:block text-right self-center">Depth</span>
				<span class="text-right self-center">Ask · 24h</span>
			</div>
			<ul class="divide-y divide-[#c8b47a]/10">
				{#each board.items as item, i}
					{@const quote = data.lowestPrices[item]}
					{@const change = data.priceChanges[item]}
					{@const owned = held.get(item) ?? 0}
					<li class="animate-rise-in" style="--rise-delay: {i * 35}ms">
						<a
							href="/market/{item}"
							class="group grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] sm:grid-cols-[minmax(0,1fr)_6rem_6rem_8rem] items-center gap-3 px-4 py-3 hover:bg-[#2e3524] transition-colors"
						>
							<span class="flex items-center gap-3 min-w-0">
								<span
									class="size-9 shrink-0 flex items-center justify-center bg-[#1a1f15] rounded-sm border border-[#c8b47a]/15 transition-colors group-hover:border-[#f2b01e]/50"
								>
									<ResourceIcon name={item} class="size-5" />
								</span>
								<span class="min-w-0">
									<span class="block font-mono text-[10px] font-bold text-[#ffd35c] leading-none"
										>{item.slice(0, 3).toUpperCase()}</span
									>
									<span
										class="block text-sm font-semibold capitalize text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate"
										>{item}</span
									>
								</span>
							</span>
							<span class="text-right font-mono text-sm tabular-nums {owned ? 'text-[#d3caa9]' : 'text-[#a8a083]/60'}">
								{owned.toLocaleString()}
							</span>
							<span class="hidden sm:block text-right font-mono text-xs tabular-nums text-[#a8a083]">
								{quote ? `${quote.totalQuantity.toLocaleString()} u` : "—"}
							</span>
							<span class="text-right">
								{#if quote}
									<span class="animate-tick block font-mono text-sm font-bold tabular-nums text-[#f5efd8]">
										${quote.lowestPrice.toLocaleString()}
									</span>
									{#if change !== undefined}
										<span
											class="block font-mono text-xs tabular-nums {change >= 0 ? 'text-[#b9f29a]' : 'text-red-400'}"
										>
											{change >= 0 ? "▲" : "▼"}
											{Math.abs(change).toFixed(1)}%
										</span>
									{/if}
								{:else}
									<span class="text-xs text-[#a8a083]">No asks</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</PageContainer>
