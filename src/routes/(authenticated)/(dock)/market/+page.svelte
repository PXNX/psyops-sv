<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";

	let { data } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
	type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

	const resourceIcons: Record<ResourceType, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	const productIcons: Record<ProductType, string> = {
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const resources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
	const products: ProductType[] = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));
</script>

<div class="min-h-screen bg-slate-950 pb-8">
	<div class="border-b border-purple-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-xl sm:text-3xl font-bold tracking-wider uppercase font-mono text-purple-400">Arms Market</h1>

				<div class="flex items-center gap-3 bg-slate-800/50 border border-green-500/20 rounded-lg px-4 py-3">
					<FluentMoney20Filled class="size-5 text-green-400" />
					<div>
						<p class="text-xs text-slate-500 font-mono">BALANCE</p>
						<p class="text-lg font-bold text-white font-mono">${data.wallet.balance.toLocaleString()}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
		<!-- Resources -->
		<div class="bg-slate-900/50 border border-purple-500/20 rounded-xl overflow-hidden">
			<div class="bg-purple-950/30 border-b border-purple-500/20 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<FluentBox20Filled class="size-5 text-purple-400" />
					<h2 class="text-base sm:text-lg font-bold text-purple-400 font-mono uppercase tracking-wide">Resources</h2>
				</div>
			</div>

			<div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
				{#each resources as resource}
					{@const inventory = resourceMap.get(resource) || 0}
					{@const market = data.lowestPrices[resource]}
					<a
						href="/market/{resource}"
						class="group flex items-center gap-3 bg-slate-900/40 border border-slate-700/50 hover:border-purple-500/40 rounded-xl p-3 sm:p-4 transition-all duration-300 hover:bg-purple-950/20"
					>
						<div
							class="size-10 flex-shrink-0 flex items-center justify-center bg-slate-950/60 rounded-lg border border-slate-700/60"
						>
							<span class="text-2xl">{resourceIcons[resource]}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-bold text-white text-sm capitalize font-mono">{resource}</div>
							<div class="text-xs text-slate-500 font-mono mt-0.5">
								{#if market}
									<span class="text-green-400 font-semibold">${market.lowestPrice.toLocaleString()}</span>
								{:else}
									<span class="text-slate-600">No listings</span>
								{/if}
								<span class="mx-1 text-slate-700">·</span>
								<span>{inventory} owned</span>
							</div>
						</div>
						<FluentArrowRight20Filled
							class="size-4 text-slate-700 group-hover:text-purple-400 transition-colors flex-shrink-0"
						/>
					</a>
				{/each}
			</div>
		</div>

		<!-- Products -->
		<div class="bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden">
			<div class="bg-cyan-950/30 border-b border-cyan-500/20 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center gap-2 sm:gap-3">
					<FluentCube20Filled class="size-5 text-cyan-400" />
					<h2 class="text-base sm:text-lg font-bold text-cyan-400 font-mono uppercase tracking-wide">Products</h2>
				</div>
			</div>

			<div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
				{#each products as product}
					{@const inventory = productMap.get(product) || 0}
					{@const market = data.lowestPrices[product]}
					<a
						href="/market/{product}"
						class="group flex items-center gap-3 bg-slate-900/40 border border-slate-700/50 hover:border-cyan-500/40 rounded-xl p-3 sm:p-4 transition-all duration-300 hover:bg-cyan-950/20"
					>
						<div
							class="size-10 flex-shrink-0 flex items-center justify-center bg-slate-950/60 rounded-lg border border-slate-700/60"
						>
							<span class="text-2xl">{productIcons[product]}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-bold text-white text-sm capitalize font-mono">{product}</div>
							<div class="text-xs text-slate-500 font-mono mt-0.5">
								{#if market}
									<span class="text-green-400 font-semibold">${market.lowestPrice.toLocaleString()}</span>
								{:else}
									<span class="text-slate-600">No listings</span>
								{/if}
								<span class="mx-1 text-slate-700">·</span>
								<span>{inventory} owned</span>
							</div>
						</div>
						<FluentArrowRight20Filled
							class="size-4 text-slate-700 group-hover:text-cyan-400 transition-colors flex-shrink-0"
						/>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
