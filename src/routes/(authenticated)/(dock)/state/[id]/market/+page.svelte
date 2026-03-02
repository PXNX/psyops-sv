<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";

	let { data, form } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
	type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

	let tradeMode = $state<"buy" | "sell">("buy");
	let selectedItemType = $state<"resource" | "product">("resource");
	let selectedItemName = $state<string>("iron");
	let tradeQuantity = $state(1);
	let tradePrice = $state(1000);

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

	const allIcons = { ...resourceIcons, ...productIcons };

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));

	const availableQuantity = $derived.by(() => {
		if (tradeMode === "sell") {
			if (selectedItemType === "resource") {
				return resourceMap.get(selectedItemName as ResourceType) || 0;
			}
			return productMap.get(selectedItemName as ProductType) || 0;
		}
		return Infinity;
	});

	const currentMarketPrice = $derived.by(() => {
		return data.marketPrices[selectedItemName as keyof typeof data.marketPrices] || 1000;
	});

	const totalCost = $derived(tradeQuantity * tradePrice);

	const canTrade = $derived.by(() => {
		if (tradeMode === "buy") {
			return data.canTrade && data.treasury.balance >= totalCost;
		} else {
			return data.canTrade && availableQuantity >= tradeQuantity && tradeQuantity >= 1;
		}
	});

	// Update price when item selection changes
	$effect(() => {
		tradePrice = currentMarketPrice;
	});

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<svelte:head>
	<title>{data.state.name} - Government Market</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
	<div class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
				{data.state.name} - Government Market
			</h1>
			<p class="text-slate-600 text-lg">
				Manage state resources and products
			</p>
		</div>

		{#if !data.canTrade}
			<div class="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-8">
				<div class="flex items-start gap-3">
					<FluentWarning20Filled class="size-6 text-amber-600 flex-shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold text-amber-900 text-lg mb-1">Access Restricted</h3>
						<p class="text-amber-800">
							Only the president or minister of economics can trade on behalf of the state.
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Treasury Overview -->
		<div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white mb-8">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-sm font-medium text-blue-100 mb-2">State Treasury</div>
					<div class="text-4xl font-bold">{formatCurrency(data.treasury.balance)}</div>
					<div class="text-sm text-blue-100 mt-1">Available funds</div>
				</div>
				<div class="text-5xl opacity-20">
					<FluentMoney20Filled class="size-16" />
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="grid lg:grid-cols-3 gap-6">
			<!-- Inventory Sidebar -->
			<div class="space-y-6">
				<!-- Resources -->
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
					<div class="flex items-center gap-2">
						<FluentBox20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">State Resources</h2>
					</div>

					<div class="space-y-2">
						{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as ResourceType[] as resource}
							{@const quantity = resourceMap.get(resource) || 0}
							<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
								<div class="flex items-center gap-2">
									<span class="text-xl">{resourceIcons[resource]}</span>
									<span class="font-medium capitalize text-gray-300">{resource}</span>
								</div>
								<span
									class="badge {quantity > 0
										? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
										: 'bg-slate-700 text-gray-400 border-slate-600'} font-bold"
								>
									{quantity}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Products -->
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
					<div class="flex items-center gap-2">
						<FluentCube20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">State Products</h2>
					</div>

					<div class="space-y-2">
						{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as ProductType[] as product}
							{@const quantity = productMap.get(product) || 0}
							<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
								<div class="flex items-center gap-2">
									<span class="text-xl">{productIcons[product]}</span>
									<span class="font-medium capitalize text-gray-300">{product}</span>
								</div>
								<span
									class="badge {quantity > 0
										? 'bg-green-600/20 text-green-300 border-green-500/30'
										: 'bg-slate-700 text-gray-400 border-slate-600'} font-bold"
								>
									{quantity}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Trading Area -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Trading Form -->
				<form
					method="POST"
					action="?/{tradeMode === 'buy' ? 'buyResource' : 'sellResource'}"
					use:enhance
					class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-5"
				>
					<div class="flex items-center gap-2">
						<FluentShoppingCart20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Trade Resources</h2>
					</div>

					<!-- Trade Mode Toggle -->
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Trade Mode</label>
						<div class="join w-full">
							<button
								type="button"
								class="btn join-item flex-1 {tradeMode === 'buy'
									? 'btn-active bg-green-600 text-white'
									: 'bg-slate-700/50 text-gray-300'}"
								onclick={() => {
									tradeMode = "buy";
								}}
								disabled={!data.canTrade}
							>
								Buy from Market
							</button>
							<button
								type="button"
								class="btn join-item flex-1 {tradeMode === 'sell'
									? 'btn-active bg-blue-600 text-white'
									: 'bg-slate-700/50 text-gray-300'}"
								onclick={() => {
									tradeMode = "sell";
								}}
								disabled={!data.canTrade}
							>
								Sell to Market
							</button>
						</div>
					</div>

					<!-- Item Type Toggle -->
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Item Type</label>
						<div class="join w-full">
							<button
								type="button"
								class="btn join-item flex-1 {selectedItemType === 'resource'
									? 'btn-active bg-purple-600 text-white'
									: 'bg-slate-700/50 text-gray-300'}"
								onclick={() => {
									selectedItemType = "resource";
									selectedItemName = "iron";
								}}
								disabled={!data.canTrade}
							>
								Resource
							</button>
							<button
								type="button"
								class="btn join-item flex-1 {selectedItemType === 'product'
									? 'btn-active bg-purple-600 text-white'
									: 'bg-slate-700/50 text-gray-300'}"
								onclick={() => {
									selectedItemType = "product";
									selectedItemName = "rifles";
								}}
								disabled={!data.canTrade}
							>
								Product
							</button>
						</div>
						<input type="hidden" name="itemType" value={selectedItemType} />
					</div>

					<!-- Item Selection -->
					<div>
						<label for="itemName" class="block text-sm font-medium text-gray-300 mb-2">
							Select Item
							{#if tradeMode === "sell"}
								<span class="text-gray-500 text-xs ml-2">Available: {availableQuantity}</span>
							{/if}
						</label>
						<select
							id="itemName"
							name="itemName"
							bind:value={selectedItemName}
							class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
							disabled={!data.canTrade}
						>
							{#if selectedItemType === "resource"}
								{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as ResourceType[] as resource}
									<option value={resource}>
										{resourceIcons[resource]}
										{resource.charAt(0).toUpperCase() + resource.slice(1)}
									</option>
								{/each}
							{:else}
								{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as ProductType[] as product}
									<option value={product}>
										{productIcons[product]}
										{product.charAt(0).toUpperCase() + product.slice(1)}
									</option>
								{/each}
							{/if}
						</select>
					</div>

					<!-- Quantity -->
					<div>
						<label for="quantity" class="block text-sm font-medium text-gray-300 mb-2"> Quantity </label>
						<div class="join w-full">
							<input
								type="number"
								id="quantity"
								name="quantity"
								min="1"
								max={tradeMode === "sell" ? availableQuantity : undefined}
								bind:value={tradeQuantity}
								class="input join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
								placeholder="Enter quantity"
								disabled={!data.canTrade}
							/>
							{#if tradeMode === "sell" && availableQuantity > 0}
								<button
									type="button"
									class="btn join-item bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300"
									onclick={() => {
										tradeQuantity = availableQuantity;
									}}
									disabled={!data.canTrade}
								>
									Max
								</button>
							{/if}
						</div>
					</div>

					<!-- Price Per Unit -->
					<div>
						<label for="pricePerUnit" class="block text-sm font-medium text-gray-300 mb-2">
							Price Per Unit
							<span class="text-xs text-blue-400 ml-2">
								<FluentInfo20Filled class="inline size-3 mb-0.5" />
								Market: {formatCurrency(currentMarketPrice)}
							</span>
						</label>
						<div class="join w-full">
							<span class="join-item btn bg-slate-700/50 border-slate-600/30 text-gray-300">$</span>
							<input
								type="number"
								id="pricePerUnit"
								name="pricePerUnit"
								min="1"
								step="1"
								bind:value={tradePrice}
								class="input join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
								placeholder={currentMarketPrice.toString()}
								disabled={!data.canTrade}
							/>
						</div>
					</div>

					<!-- Summary -->
					<div class="bg-slate-700/30 rounded-xl p-5 space-y-3 border border-slate-600/30">
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Item:</span>
							<span class="font-bold flex items-center gap-1 text-white">
								<span class="text-lg">{allIcons[selectedItemName]}</span>
								{selectedItemName}
							</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Quantity:</span>
							<span class="font-bold text-white">{tradeQuantity}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-400">Unit Price:</span>
							<span class="font-bold text-white">{formatCurrency(tradePrice)}</span>
						</div>
						<div class="divider my-1"></div>
						<div class="flex justify-between text-lg font-bold {tradeMode === 'buy' ? 'text-red-400' : 'text-green-400'}">
							<span>Total {tradeMode === 'buy' ? 'Cost' : 'Revenue'}:</span>
							<span>{tradeMode === 'buy' ? '-' : '+'}{formatCurrency(totalCost)}</span>
						</div>
						{#if tradeMode === "buy" && data.treasury.balance < totalCost}
							<div class="bg-red-600/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-300">
								<FluentWarning20Filled class="inline size-3 mb-0.5" />
								Insufficient treasury funds (Available: {formatCurrency(data.treasury.balance)})
							</div>
						{/if}
					</div>

					<!-- Submit -->
					<button
						type="submit"
						disabled={!canTrade}
						class="btn w-full bg-gradient-to-r {tradeMode === 'buy'
							? 'from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
							: 'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'} border-0 text-white gap-2 disabled:opacity-50"
					>
						{#if canTrade}
							<FluentCheckmark20Filled class="size-5" />
							{tradeMode === 'buy' ? 'Buy' : 'Sell'} {selectedItemName}
						{:else}
							<FluentWarning20Filled class="size-5" />
							{!data.canTrade ? 'Access Denied' : tradeMode === 'buy' ? 'Insufficient Funds' : 'Insufficient Stock'}
						{/if}
					</button>
				</form>

				<!-- Success/Error Messages -->
				{#if form?.success}
					<div class="bg-green-50 border-2 border-green-200 rounded-xl p-4">
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-600 flex-shrink-0 mt-0.5" />
							<p class="text-green-800 font-medium">{form.message}</p>
						</div>
					</div>
				{:else if form?.message}
					<div class="bg-red-50 border-2 border-red-200 rounded-xl p-4">
						<div class="flex items-start gap-3">
							<FluentWarning20Filled class="size-5 text-red-600 flex-shrink-0 mt-0.5" />
							<p class="text-red-800 font-medium">{form.message}</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Info Box -->
		<div class="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
			<div class="flex items-start gap-3">
				<FluentInfo20Filled class="size-6 text-blue-600 flex-shrink-0 mt-1" />
				<div class="flex-1">
					<h3 class="font-semibold text-blue-900 text-lg mb-2">Government Market</h3>
					<ul class="text-blue-800 space-y-1 text-sm">
						<li>• Buy resources and products from the market to fill state stockpiles</li>
						<li>• Sell state resources to generate revenue for the treasury</li>
						<li>• All transactions are recorded in the government budget history</li>
						<li>• Only the president or minister of economics can authorize trades</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
