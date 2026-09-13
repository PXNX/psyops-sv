<script lang="ts">
	import ResourceIcon from "$lib/component/ResourceIcon.svelte";

	let { data } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
	type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

	const resources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
	const products: ProductType[] = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));
</script>

<div class="min-h-screen pb-8">
	<div class="border-b border-[#dfceb0]/15 bg-[#0c1929]/90 backdrop-blur-xl">
		<div class="max-w-2xl mx-auto px-4 sm:px-6 py-4">
			<div class="flex items-center justify-between">
				<h1 class="text-lg sm:text-2xl font-bold tracking-wider uppercase font-mono text-[#e6a527]">Market</h1>
				<div class="text-right">
					<p class="text-[10px] text-[#a89e8e] font-mono">BALANCE</p>
					<p class="text-sm sm:text-base font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
		<!-- Resources -->
		<div>
			<h2 class="text-xs font-bold text-[#a89e8e] font-mono uppercase tracking-wide px-1 mb-2">Resources</h2>
			<div class="bg-[#14283f]/70 border border-[#dfceb0]/12 rounded-sm divide-y divide-[#dfceb0]/10 overflow-hidden">
				{#each resources as resource}
					{@const inventory = resourceMap.get(resource) || 0}
					{@const market = data.lowestPrices[resource]}
					{@const change = data.priceChanges[resource]}
					<a href="/market/{resource}" class="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[#dfceb0]/5 transition-colors">
						<div class="size-9 flex-shrink-0 flex items-center justify-center bg-[#102239]/70 rounded-full border border-[#dfceb0]/15">
							<ResourceIcon name={resource} class="size-5" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-[#fff7e8] text-sm capitalize font-mono truncate">{resource}</div>
							<div class="text-xs text-[#a89e8e]/80 font-mono">{inventory} owned</div>
						</div>
						<div class="text-right flex-shrink-0">
							{#if market}
								<div class="font-bold text-[#fff7e8] text-sm font-mono">${market.lowestPrice.toLocaleString()}</div>
								{#if change !== undefined}
									<div class="text-xs font-mono {change >= 0 ? 'text-green-400' : 'text-red-400'}">
										{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
									</div>
								{/if}
							{:else}
								<div class="text-xs text-[#a89e8e]/60 font-mono">No listings</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Products -->
		<div>
			<h2 class="text-xs font-bold text-[#a89e8e] font-mono uppercase tracking-wide px-1 mb-2">Products</h2>
			<div class="bg-[#14283f]/70 border border-[#dfceb0]/12 rounded-sm divide-y divide-[#dfceb0]/10 overflow-hidden">
				{#each products as product}
					{@const inventory = productMap.get(product) || 0}
					{@const market = data.lowestPrices[product]}
					{@const change = data.priceChanges[product]}
					<a href="/market/{product}" class="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[#dfceb0]/5 transition-colors">
						<div class="size-9 flex-shrink-0 flex items-center justify-center bg-[#102239]/70 rounded-full border border-[#dfceb0]/15">
							<ResourceIcon name={product} class="size-5" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-[#fff7e8] text-sm capitalize font-mono truncate">{product}</div>
							<div class="text-xs text-[#a89e8e]/80 font-mono">{inventory} owned</div>
						</div>
						<div class="text-right flex-shrink-0">
							{#if market}
								<div class="font-bold text-[#fff7e8] text-sm font-mono">${market.lowestPrice.toLocaleString()}</div>
								{#if change !== undefined}
									<div class="text-xs font-mono {change >= 0 ? 'text-green-400' : 'text-red-400'}">
										{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
									</div>
								{/if}
							{:else}
								<div class="text-xs text-[#a89e8e]/60 font-mono">No listings</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
