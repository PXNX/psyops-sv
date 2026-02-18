<!-- src/routes/market/[item]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/stores";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import MarketChart from "./MarketChart.svelte";

	let { data } = $props();

	let buyQuantities = $state<Record<string, number>>({});

	const itemIcon = $derived(
		data.itemType === "resource"
			? {
					iron: "⛏️",
					copper: "🔶",
					steel: "⚙️",
					gunpowder: "💥",
					wood: "🪵",
					coal: "🪨"
				}[data.itemName]
			: {
					rifles: "🔫",
					ammunition: "🔫",
					artillery: "💣",
					vehicles: "🚗",
					explosives: "💥"
				}[data.itemName]
	);

	// Get current price (most recent or from statistics)
	const currentPrice = $derived(
		data.priceHistory.length > 0
			? data.priceHistory[data.priceHistory.length - 1].pricePerUnit
			: data.statistics?.currentAvgPrice ?? 0
	);
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/market" class="btn btn-circle btn-ghost">
				<FluentArrowLeft20Filled class="size-5" />
			</a>
			<div>
				<div class="flex items-center gap-3">
					<span class="text-5xl">{itemIcon}</span>
					<div>
						<h1 class="text-3xl font-bold text-white capitalize">{data.itemName}</h1>
						<p class="text-gray-400">
							<span class="capitalize">{data.itemType}</span> Market
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Balance</p>
					<p class="text-xl font-bold text-white">${data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Market Statistics -->
	{#if data.statistics}
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<p class="text-xs text-gray-400">Average Price</p>
				<p class="text-2xl font-bold text-white">${data.statistics.currentAvgPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<p class="text-xs text-gray-400">Lowest Price</p>
				<p class="text-2xl font-bold text-green-400">${data.statistics.lowestPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<p class="text-xs text-gray-400">Highest Price</p>
				<p class="text-2xl font-bold text-red-400">${data.statistics.highestPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<p class="text-xs text-gray-400">Active Listings</p>
				<p class="text-2xl font-bold text-purple-400">{data.statistics.activeListings}</p>
			</div>
		</div>
	{/if}

	<!-- Price Chart -->
	{#if data.priceHistory.length > 1}
		<MarketChart priceHistory={data.priceHistory} {currentPrice} />
	{:else if data.priceHistory.length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6">
			<div class="text-center py-8">
				<FluentChartMultiple20Regular class="size-12 mx-auto opacity-20 mb-3 text-gray-500" />
				<p class="text-gray-400">No price history available yet</p>
			</div>
		</div>
	{/if}

	<!-- Active Listings -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-4">
		<div class="flex items-center gap-2">
			<FluentShoppingCart20Filled class="size-5 text-purple-400" />
			<h2 class="text-xl font-bold text-white">Active Listings</h2>
		</div>

		{#if data.listings.length === 0}
			<div class="text-center py-12">
				<FluentShoppingCart20Filled class="size-16 mx-auto opacity-20 mb-4 text-gray-500" />
				<p class="text-lg text-gray-400">No listings available</p>
				<p class="text-sm text-gray-500 mt-2">Be the first to list this item!</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.listings as listing}
					{@const isOwnListing = listing.sellerId === data.wallet?.userId}
					{@const buyQty = buyQuantities[listing.id] || 1}
					{@const itemCost = listing.pricePerUnit * buyQty}
					{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
					{@const totalCost = itemCost + taxAmount}

					<div
						class="bg-slate-700/30 rounded-xl p-4 border-2 {isOwnListing
							? 'border-amber-500/30'
							: 'border-slate-600/30'}"
					>
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-3 flex-1">
								<div class="text-4xl">{itemIcon}</div>
								<div class="flex-1">
									<div class="font-bold text-lg flex items-center gap-2 text-white">
										{listing.quantity} units
										{#if isOwnListing}
											<span class="badge badge-sm bg-amber-600/20 text-amber-300 border-amber-500/30">
												Your Listing
											</span>
										{/if}
									</div>
									<div class="text-sm text-gray-400">Listed {new Date(listing.createdAt).toLocaleDateString()}</div>
								</div>
							</div>

							<div class="text-right">
								<div class="text-xs text-gray-400">Price per unit</div>
								<div class="text-2xl font-bold text-green-400">${listing.pricePerUnit.toLocaleString()}</div>
								<div class="text-xs text-gray-400 mt-1">
									Total: ${(listing.pricePerUnit * listing.quantity).toLocaleString()}
								</div>
							</div>

							<div class="min-w-[140px]">
								{#if isOwnListing}
									<form method="POST" action="?/removeListing" use:enhance>
										<input type="hidden" name="listingId" value={listing.id} />
										<button
											type="submit"
											class="btn btn-sm w-full bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300"
										>
											Remove Listing
										</button>
									</form>
								{:else}
									<form method="POST" action="?/buyListing" use:enhance>
										<input type="hidden" name="listingId" value={listing.id} />
										<div class="space-y-2">
											<label class="text-xs text-gray-400">Quantity</label>
											<div class="join w-full">
												<input
													type="number"
													name="quantity"
													min="1"
													max={listing.quantity}
													value={buyQty}
													class="input input-sm join-item w-16 bg-slate-700/50 border-slate-600/30 text-white"
													onchange={(e) => {
														buyQuantities[listing.id] = parseInt(e.currentTarget.value);
													}}
												/>
												<button
													type="submit"
													class="btn btn-sm btn-primary join-item bg-gradient-to-r from-purple-600 to-blue-600"
												>
													Buy
												</button>
											</div>
											{#if taxAmount > 0}
												<div class="text-xs text-gray-400 space-y-1">
													<div class="flex justify-between">
														<span>Item Cost:</span>
														<span>${itemCost.toLocaleString()}</span>
													</div>
													<div class="flex justify-between text-amber-400">
														<span>Tax ({data.taxRate}%):</span>
														<span>${taxAmount.toLocaleString()}</span>
													</div>
													<div class="flex justify-between font-bold text-white border-t border-slate-600 pt-1">
														<span>Total:</span>
														<span>${totalCost.toLocaleString()}</span>
													</div>
												</div>
											{/if}
										</div>
									</form>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
