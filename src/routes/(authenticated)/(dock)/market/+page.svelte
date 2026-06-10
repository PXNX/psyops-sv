<!-- src/routes/market/+page.svelte - WITH LOWEST PRICES -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";

	import PageContainer from "$lib/component/PageContainer.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";

	let { data, form } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
	type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

	let selectedItemType = $state<"resource" | "product">("resource");
	let selectedItemName = $state<string>("iron");
	let listingQuantity = $state(1);
	let listingPrice = $state(1000);
	let buyQuantities = $state<Record<string, number>>({});
	let filterType = $state<string>("all");
	let cooldownTimeRemaining = $state(data.cooldownRemaining);

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

	const filteredListings = $derived(
		filterType === "all" ? data.marketListings : data.marketListings.filter((l) => l.itemType === filterType)
	);

	const availableQuantity = $derived.by(() => {
		if (selectedItemType === "resource") {
			return resourceMap.get(selectedItemName as ResourceType) || 0;
		}
		return productMap.get(selectedItemName as ProductType) || 0;
	});

	const currentLowestPrice = $derived.by(() => {
		const key = `${selectedItemType}-${selectedItemName}`;
		return data.lowestPrices[key] || 1000;
	});

	const canCreateListing = $derived(availableQuantity >= listingQuantity && listingQuantity >= 1);

	const cooldownDisplay = $derived.by(() => {
		if (cooldownTimeRemaining <= 0) return null;
		const minutes = Math.floor(cooldownTimeRemaining / 60000);
		const seconds = Math.floor((cooldownTimeRemaining % 60000) / 1000);
		return `${minutes}m ${seconds}s`;
	});

	$effect(() => {
		if (cooldownTimeRemaining > 0) {
			const interval = setInterval(() => {
				cooldownTimeRemaining = Math.max(0, cooldownTimeRemaining - 1000);
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	// Update price when item selection changes
	$effect(() => {
		listingPrice = currentLowestPrice;
	});
</script>

<PageContainer maxWidth="7xl">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-white">Arms Market</h1>
			<p class="text-gray-400 text-sm sm:text-base">Buy and sell resources and products</p>
		</div>

		<SectionCard class="shrink-0">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Balance</p>
					<p class="text-xl font-bold text-white">${data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</SectionCard>
	</div>

	<!-- Main Content -->
	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Inventory Sidebar -->
		<div class="space-y-6">
			<!-- Resources -->
			<SectionCard class="space-y-3">
				<div class="flex items-center gap-2">
					<FluentBox20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Resources</h2>
				</div>

				<div class="space-y-2">
					{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as ResourceType[] as resource}
						{@const quantity = resourceMap.get(resource) || 0}
						<a
							href="/market/{resource}"
							class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30 hover:bg-slate-600/50 hover:border-slate-500/50 transition-all cursor-pointer"
						>
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
						</a>
					{/each}
				</div>
			</SectionCard>

			<!-- Products -->
			<SectionCard class="space-y-3">
				<div class="flex items-center gap-2">
					<FluentCube20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Products</h2>
				</div>

				<div class="space-y-2">
					{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as ProductType[] as product}
						{@const quantity = productMap.get(product) || 0}
						<a
							href="/market/{product}"
							class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30 hover:bg-slate-600/50 hover:border-slate-500/50 transition-all cursor-pointer"
						>
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
						</a>
					{/each}
				</div>
			</SectionCard>
			</div>

			<!-- Market Area -->
			<div class="lg:col-span-2 space-y-6">
			<!-- Create Listing Form -->
			<form
				method="POST"
				action="?/createListing"
				use:enhance
				class="bg-slate-800/50 rounded-xl border border-white/5 p-4 md:p-5 space-y-5"
			>
				<div class="flex items-center gap-2">
					<FluentAdd20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Create Listing</h2>
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
						<span class="text-gray-500 text-xs ml-2">Available: {availableQuantity}</span>
					</label>
					<select
						id="itemName"
						name="itemName"
						bind:value={selectedItemName}
						class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
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
							max={availableQuantity}
							bind:value={listingQuantity}
							class="input join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
							placeholder="Enter quantity"
						/>
						<button
							type="button"
							class="btn join-item bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300"
							onclick={() => {
								listingQuantity = availableQuantity;
							}}
							disabled={availableQuantity === 0}
						>
							Max
						</button>
					</div>
				</div>

				<!-- Price Per Unit -->
				<div>
					<label for="pricePerUnit" class="block text-sm font-medium text-gray-300 mb-2">
						Price Per Unit
						{#if currentLowestPrice > 0}
							<span class="text-xs text-blue-400 ml-2">
								<FluentInfo20Filled class="inline size-3 mb-0.5" />
								Current lowest: ${currentLowestPrice.toLocaleString()}
							</span>
						{/if}
					</label>
					<div class="join w-full">
						<span class="join-item btn bg-slate-700/50 border-slate-600/30 text-gray-300">$</span>
						<input
							type="number"
							id="pricePerUnit"
							name="pricePerUnit"
							min="1"
							step="1"
							bind:value={listingPrice}
							class="input join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
							placeholder={currentLowestPrice.toString()}
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
						<span class="font-bold text-white">{listingQuantity}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-gray-400">Unit Price:</span>
						<span class="font-bold text-white">${listingPrice.toLocaleString()}</span>
					</div>
					{#if listingPrice < currentLowestPrice && currentLowestPrice > 0}
						<div class="bg-green-600/10 border border-green-500/20 rounded-lg p-2 text-xs text-green-300">
							<FluentInfo20Filled class="inline size-3 mb-0.5" />
							Your price is ${(currentLowestPrice - listingPrice).toLocaleString()} below market
						</div>
					{:else if listingPrice > currentLowestPrice && currentLowestPrice > 0}
						<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-2 text-xs text-amber-300">
							<FluentWarning20Filled class="inline size-3 mb-0.5" />
							Your price is ${(listingPrice - currentLowestPrice).toLocaleString()} above market
						</div>
					{/if}
					<div class="divider my-1"></div>
					<div class="flex justify-between text-lg font-bold text-purple-400">
						<span>Total Value:</span>
						<span>${(listingQuantity * listingPrice).toLocaleString()}</span>
					</div>
				</div>

				<!-- Submit -->
				<button
					type="submit"
					disabled={!canCreateListing || cooldownTimeRemaining > 0}
					class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
				>
					{#if cooldownTimeRemaining > 0}
						<FluentWarning20Filled class="size-5" />
						Cooldown: {cooldownDisplay}
					{:else if canCreateListing}
						<FluentCheckmark20Filled class="size-5" />
						Create Listing
					{:else}
						<FluentWarning20Filled class="size-5" />
						Insufficient Items
					{/if}
				</button>

				{#if cooldownTimeRemaining > 0}
					<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
						<FluentWarning20Filled class="inline size-4 text-amber-400 mb-1" />
						<p class="text-sm text-amber-300">
							You must wait {cooldownDisplay} before creating a new listing after removing one.
						</p>
					</div>
				{/if}
			</form>

			<!-- Market Listings -->
			<SectionCard class="space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<FluentShoppingCart20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Market Listings</h2>
					</div>

					<div class="flex items-center gap-2">
						<FluentFilter20Filled class="size-4 text-gray-400" />
						<select bind:value={filterType} class="select select-sm bg-slate-700/50 border-slate-600/30 text-white">
							<option value="all">All Items</option>
							<option value="resource">Resources</option>
							<option value="product">Products</option>
						</select>
					</div>
				</div>

				{#if filteredListings.length === 0}
					<div class="text-center py-12">
						<FluentShoppingCart20Filled class="size-16 mx-auto opacity-20 mb-4 text-gray-500" />
						<p class="text-lg text-gray-400">No listings available</p>
						<p class="text-sm text-gray-500 mt-2">Be the first to list items on the market!</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each filteredListings as listing}
							{@const icon = allIcons[listing.itemName]}
							{@const isOwnListing = listing.sellerId === data.wallet?.userId}
							{@const buyQty = buyQuantities[listing.id] || 1}
							{@const itemCost = listing.pricePerUnit * buyQty}
							{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
							{@const totalCost = itemCost + taxAmount}

							<div
								class="bg-slate-700/30 rounded-xl p-4 border-2 {isOwnListing
									? 'border-amber-500/30'
									: listing.isStateSanctioned
										? 'border-red-500/30'
										: 'border-slate-600/30'}"
							>
								<div class="flex items-center justify-between gap-4">
									<a
										href="/market/{listing.itemName}"
										class="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
									>
										<div class="text-4xl">{icon}</div>
										<div class="flex-1">
											<div class="font-bold text-lg capitalize flex items-center gap-2 text-white">
												{listing.itemName}
												<span
													class="badge badge-sm {listing.itemType === 'resource'
														? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
														: 'bg-green-600/20 text-green-300 border-green-500/30'}"
												>
													{listing.itemType}
												</span>
												{#if listing.isStateSanctioned}
													<span class="badge badge-sm bg-red-600/20 text-red-300 border-red-500/30">
														⚠️ Sanctioned
													</span>
												{/if}
												{#if isOwnListing}
													<span class="badge badge-sm bg-amber-600/20 text-amber-300 border-amber-500/30">
														Your Listing
													</span>
												{/if}
											</div>
											<div class="text-sm text-gray-400">
												<span class="font-semibold">{listing.quantity}</span> units available
											</div>
										</div>
									</a>

									<div class="text-right">
										<div class="text-xs text-gray-400">Price per unit</div>
										<div class="text-2xl font-bold text-green-400">
											${listing.pricePerUnit.toLocaleString()}
										</div>
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
					</SectionCard>
					</div>
					</div>
					</PageContainer>
