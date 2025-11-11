<!-- src/routes/(authenticated)/(dock)/market/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";

	let { data } = $props();

	let selectedItemType = $state("resource");
	let selectedItemName = $state("iron");
	let listingQuantity = $state(1);
	let listingPrice = $state(1000); // $10.00 in cents
	let buyQuantity = $state<Record<string, number>>({});
	let filterType = $state<string>("all");

	// Resource icons
	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	const productIcons: Record<string, string> = {
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
			return resourceMap.get(selectedItemName) || 0;
		}
		return productMap.get(selectedItemName) || 0;
	});
</script>

<div class="container mx-auto p-4 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold flex items-center gap-3">
					<FluentChartMultiple20Filled class="w-10 h-10" />
					Arms Market
				</h1>
				<p class="text-base-content/70 mt-2">Buy and sell resources and products</p>
			</div>

			<!-- Quick Stats -->
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-primary">
						<FluentChartMultiple20Filled class="w-8 h-8" />
					</div>
					<div class="stat-title">Your Balance</div>
					<div class="stat-value text-primary text-2xl">${(data.wallet.balance / 100).toFixed(2)}</div>
				</div>

				<div class="stat">
					<div class="stat-figure text-secondary">
						<FluentChartMultiple20Filled class="w-8 h-8" />
					</div>
					<div class="stat-title">Active Listings</div>
					<div class="stat-value text-secondary text-2xl">{data.marketListings.length}</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Left Column - Create Listing -->
		<div class="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl border-2 border-primary/20">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">
					<FluentChartMultiple20Filled class="w-6 h-6" />
					Create Listing
				</h2>

				<form method="POST" action="?/createListing" use:enhance class="space-y-4">
					<!-- Item Type Toggle -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Item Type</span>
						</label>
						<div class="btn-group w-full">
							<button
								type="button"
								class="btn btn-sm flex-1 {selectedItemType === 'resource' ? 'btn-active' : ''}"
								onclick={() => {
									selectedItemType = "resource";
									selectedItemName = "iron";
								}}
							>
								Resource
							</button>
							<button
								type="button"
								class="btn btn-sm flex-1 {selectedItemType === 'product' ? 'btn-active' : ''}"
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
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Select Item</span>
							<span class="label-text-alt">
								Available: {availableQuantity}
							</span>
						</label>
						<select name="itemName" class="select select-bordered" bind:value={selectedItemName}>
							{#if selectedItemType === "resource"}
								{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
									<option value={resource}>
										{resourceIcons[resource]}
										{resource.charAt(0).toUpperCase() + resource.slice(1)}
									</option>
								{/each}
							{:else}
								{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
									<option value={product}>
										{productIcons[product]}
										{product.charAt(0).toUpperCase() + product.slice(1)}
									</option>
								{/each}
							{/if}
						</select>
					</div>

					<!-- Quantity -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Quantity</span>
							<span class="label-text-alt text-xs">
								Max: {availableQuantity}
							</span>
						</label>
						<input
							type="number"
							name="quantity"
							min="1"
							max={availableQuantity}
							class="input input-bordered"
							bind:value={listingQuantity}
							placeholder="Enter quantity"
						/>
					</div>

					<!-- Price Per Unit -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">Price Per Unit</span>
						</label>
						<label class="input-group">
							<span>$</span>
							<input
								type="number"
								name="pricePerUnit"
								min="100"
								step="100"
								class="input input-bordered flex-1"
								bind:value={listingPrice}
								placeholder="1000"
							/>
							<span>.00</span>
						</label>
						<label class="label">
							<span class="label-text-alt">Price in cents (1000 = $10.00)</span>
						</label>
					</div>

					<!-- Summary Card -->
					<div class="bg-base-200 rounded-lg p-4 space-y-2">
						<div class="flex justify-between text-sm">
							<span>Item:</span>
							<span class="font-bold flex items-center gap-1">
								<span class="text-lg">{allIcons[selectedItemName]}</span>
								{selectedItemName}
							</span>
						</div>
						<div class="flex justify-between text-sm">
							<span>Quantity:</span>
							<span class="font-bold">{listingQuantity}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span>Unit Price:</span>
							<span class="font-bold">${(listingPrice / 100).toFixed(2)}</span>
						</div>
						<div class="divider my-1"></div>
						<div class="flex justify-between text-lg font-bold text-primary">
							<span>Total Value:</span>
							<span>${((listingQuantity * listingPrice) / 100).toFixed(2)}</span>
						</div>
					</div>

					<!-- Submit -->
					<button
						type="submit"
						class="btn btn-primary w-full btn-lg"
						disabled={availableQuantity < listingQuantity || listingQuantity < 1}
					>
						<FluentChartMultiple20Filled class="w-5 h-5" />
						Create Listing
					</button>
				</form>
			</div>
		</div>

		<!-- Right Column - Market Listings -->
		<div class="lg:col-span-2">
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between mb-4">
						<h2 class="card-title text-xl">
							<FluentChartMultiple20Filled class="w-6 h-6" />
							Market Listings
						</h2>

						<!-- Filter -->
						<div class="flex items-center gap-2">
							<FluentChartMultiple20Filled class="w-5 h-5" />
							<select class="select select-bordered select-sm" bind:value={filterType}>
								<option value="all">All Items</option>
								<option value="resource">Resources Only</option>
								<option value="product">Products Only</option>
							</select>
						</div>
					</div>

					{#if filteredListings.length === 0}
						<div class="text-center py-12">
							<FluentChartMultiple20Filled class="w-16 h-16 mx-auto opacity-20 mb-4" />
							<p class="text-lg text-base-content/50">No listings available</p>
							<p class="text-sm text-base-content/30 mt-2">Be the first to list items on the market!</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each filteredListings as listing}
								{@const icon = allIcons[listing.itemName]}
								{@const isOwnListing = listing.sellerId === data.wallet?.userId}
								<div
									class="card bg-base-100 shadow hover:shadow-lg transition-shadow border-2 {isOwnListing
										? 'border-warning/30'
										: 'border-base-300'}"
								>
									<div class="card-body p-4">
										<div class="flex items-center justify-between gap-4">
											<!-- Item Info -->
											<div class="flex items-center gap-3 flex-1">
												<div class="text-4xl">{icon}</div>
												<div class="flex-1">
													<div class="font-bold text-lg capitalize flex items-center gap-2">
														{listing.itemName}
														<span
															class="badge badge-sm {listing.itemType === 'resource'
																? 'badge-outline'
																: 'badge-primary'}"
														>
															{listing.itemType}
														</span>
														{#if isOwnListing}
															<span class="badge badge-sm badge-warning">Your Listing</span>
														{/if}
													</div>
													<div class="text-sm text-base-content/70">
														<span class="font-semibold">{listing.quantity}</span> units available
													</div>
												</div>
											</div>

											<!-- Price Info -->
											<div class="text-right">
												<div class="text-xs text-base-content/60">Price per unit</div>
												<div class="text-2xl font-bold text-success">
													${(listing.pricePerUnit / 100).toFixed(2)}
												</div>
												<div class="text-xs text-base-content/60 mt-1">
													Total: ${((listing.pricePerUnit * listing.quantity) / 100).toFixed(2)}
												</div>
											</div>

											<!-- Buy Action -->
											<div class="min-w-[140px]">
												{#if isOwnListing}
													<div class="alert alert-warning py-2 px-3">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															class="stroke-current shrink-0 w-5 h-5"
															><path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
															></path></svg
														>
														<span class="text-xs">Your item</span>
													</div>
												{:else}
													<form method="POST" action="?/buyListing" use:enhance>
														<input type="hidden" name="listingId" value={listing.id} />
														<div class="form-control">
															<label class="label py-1">
																<span class="label-text-alt">Quantity</span>
															</label>
															<div class="join">
																<input
																	type="number"
																	name="quantity"
																	min="1"
																	max={listing.quantity}
																	value={buyQuantity[listing.id] || 1}
																	class="input input-bordered input-sm join-item w-16"
																	onchange={(e) => {
																		buyQuantity[listing.id] = parseInt(e.currentTarget.value);
																	}}
																/>
																<button type="submit" class="btn btn-primary btn-sm join-item"> Buy </button>
															</div>
														</div>
													</form>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Market Tips -->
			<div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="alert alert-info">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					<span class="text-xs">Items are locked when listed on the market</span>
				</div>
				<div class="alert alert-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					<span class="text-xs">Instant transactions - no waiting!</span>
				</div>
				<div class="alert">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
						><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"
						></path></svg
					>
					<span class="text-xs">Set competitive prices to sell faster</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		min-height: 100vh;
	}
</style>
