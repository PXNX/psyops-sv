<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
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
		<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-xl sm:text-3xl font-bold tracking-wider uppercase font-mono text-[#e6a527]">Arms Market</h1>

				<div class="flex items-center gap-3 bg-[#102239]/70 border border-green-500/20 rounded-sm px-4 py-3">
					<FluentMoney20Filled class="size-5 text-green-400" />
					<div>
						<p class="text-xs text-[#a89e8e] font-mono">BALANCE</p>
						<p class="text-lg font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
		<!-- Resources -->
		<div class="bg-[#14283f]/85 border border-[#8c709b]/30 rounded-sm overflow-hidden">
			<div class="bg-[#8c709b]/10 border-b border-[#8c709b]/25 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<FluentBox20Filled class="size-5 text-[#d5c4df]" />
					<h2 class="text-base sm:text-lg font-bold text-[#d5c4df] font-mono uppercase tracking-wide">Resources</h2>
				</div>
			</div>

			<div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
				{#each resources as resource}
					{@const inventory = resourceMap.get(resource) || 0}
					{@const market = data.lowestPrices[resource]}
					<a
						href="/market/{resource}"
						class="group flex items-center gap-3 bg-[#102239]/70 border border-[#dfceb0]/15 hover:border-[#8c709b]/45 rounded-sm p-3 sm:p-4 transition-all duration-300 hover:bg-[#8c709b]/10"
					>
						<div
							class="size-10 flex-shrink-0 flex items-center justify-center bg-[#0d1d31]/80 rounded-sm border border-[#dfceb0]/15"
						>
							<ResourceIcon name={resource} class="size-7" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-bold text-[#fff7e8] text-sm capitalize font-mono">{resource}</div>
							<div class="text-xs text-[#a89e8e] font-mono mt-0.5">
								{#if market}
									<span class="text-green-400 font-semibold">${market.lowestPrice.toLocaleString()}</span>
								{:else}
									<span class="text-[#a89e8e]/70">No listings</span>
								{/if}
								<span class="mx-1 text-[#a89e8e]/50">·</span>
								<span>{inventory} owned</span>
							</div>
						</div>
						<FluentArrowRight20Filled
							class="size-4 text-[#a89e8e]/50 group-hover:text-[#d5c4df] transition-colors flex-shrink-0"
						/>
					</a>
				{/each}
			</div>
		</div>

		<!-- Products -->
		<div class="bg-[#14283f]/85 border border-[#315d8d]/35 rounded-sm overflow-hidden">
			<div class="bg-[#315d8d]/10 border-b border-[#315d8d]/25 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<FluentCube20Filled class="size-5 text-[#b7d0e6]" />
					<h2 class="text-base sm:text-lg font-bold text-[#b7d0e6] font-mono uppercase tracking-wide">Products</h2>
				</div>
			</div>

			<div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
				{#each products as product}
					{@const inventory = productMap.get(product) || 0}
					{@const market = data.lowestPrices[product]}
					<a
						href="/market/{product}"
						class="group flex items-center gap-3 bg-[#102239]/70 border border-[#dfceb0]/15 hover:border-[#315d8d]/50 rounded-sm p-3 sm:p-4 transition-all duration-300 hover:bg-[#315d8d]/10"
					>
						<div
							class="size-10 flex-shrink-0 flex items-center justify-center bg-[#0d1d31]/80 rounded-sm border border-[#dfceb0]/15"
						>
							<ResourceIcon name={product} class="size-7" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-bold text-[#fff7e8] text-sm capitalize font-mono">{product}</div>
							<div class="text-xs text-[#a89e8e] font-mono mt-0.5">
								{#if market}
									<span class="text-green-400 font-semibold">${market.lowestPrice.toLocaleString()}</span>
								{:else}
									<span class="text-[#a89e8e]/70">No listings</span>
								{/if}
								<span class="mx-1 text-[#a89e8e]/50">·</span>
								<span>{inventory} owned</span>
							</div>
						</div>
						<FluentArrowRight20Filled
							class="size-4 text-[#a89e8e]/50 group-hover:text-[#b7d0e6] transition-colors flex-shrink-0"
						/>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
