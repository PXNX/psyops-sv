<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";

	let { data } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
	type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

	const resources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
	const products: ProductType[] = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));
</script>

<PageContainer maxWidth="4xl">
	<PageHeader title="Market">
		{#snippet actions()}
			<div class="panel-muted rounded-sm px-3 py-2 text-right">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Balance</p>
				<p class="text-sm sm:text-base font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Resources -->
	<section class="space-y-3">
		<h2 class="section-title">Resources</h2>
		<div class="panel rounded-sm divide-y divide-[#dfceb0]/10 overflow-hidden">
				{#each resources as resource}
					{@const inventory = resourceMap.get(resource) || 0}
					{@const market = data.lowestPrices[resource]}
					{@const change = data.priceChanges[resource]}
					<a
						href="/market/{resource}"
						class="group flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[#19304b] transition-colors"
					>
						<div
							class="size-9 flex-shrink-0 flex items-center justify-center bg-[#102239] rounded-full border border-[#dfceb0]/15"
						>
							<ResourceIcon name={resource} class="size-5" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors text-sm capitalize truncate">
								{resource}
							</div>
							<div class="text-xs text-[#a89e8e]"><span class="font-mono">{inventory}</span> owned</div>
						</div>
						<div class="text-right flex-shrink-0">
							{#if market}
								<div class="font-bold text-[#fff7e8] text-sm font-mono">${market.lowestPrice.toLocaleString()}</div>
								{#if change !== undefined}
									<div class="text-xs font-mono {change >= 0 ? 'text-[#c6dfbf]' : 'text-red-400'}">
										{change >= 0 ? "▲" : "▼"}
										{Math.abs(change).toFixed(1)}%
									</div>
								{/if}
							{:else}
								<div class="text-xs text-[#a89e8e]">No listings</div>
							{/if}
						</div>
					</a>
				{/each}
		</div>
	</section>

	<!-- Products -->
	<section class="space-y-3">
		<h2 class="section-title">Products</h2>
		<div class="panel rounded-sm divide-y divide-[#dfceb0]/10 overflow-hidden">
				{#each products as product}
					{@const inventory = productMap.get(product) || 0}
					{@const market = data.lowestPrices[product]}
					{@const change = data.priceChanges[product]}
					<a
						href="/market/{product}"
						class="group flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[#19304b] transition-colors"
					>
						<div
							class="size-9 flex-shrink-0 flex items-center justify-center bg-[#102239] rounded-full border border-[#dfceb0]/15"
						>
							<ResourceIcon name={product} class="size-5" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors text-sm capitalize truncate">
								{product}
							</div>
							<div class="text-xs text-[#a89e8e]"><span class="font-mono">{inventory}</span> owned</div>
						</div>
						<div class="text-right flex-shrink-0">
							{#if market}
								<div class="font-bold text-[#fff7e8] text-sm font-mono">${market.lowestPrice.toLocaleString()}</div>
								{#if change !== undefined}
									<div class="text-xs font-mono {change >= 0 ? 'text-[#c6dfbf]' : 'text-red-400'}">
										{change >= 0 ? "▲" : "▼"}
										{Math.abs(change).toFixed(1)}%
									</div>
								{/if}
							{:else}
								<div class="text-xs text-[#a89e8e]">No listings</div>
							{/if}
						</div>
					</a>
				{/each}
		</div>
	</section>
</PageContainer>
