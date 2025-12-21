<!-- src/routes/market/+page.svelte -->
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
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentProduction20Filled from "~icons/fluent/production-20-filled";

	let { data } = $props();

	let selectedItemType = $state("resource");
	let selectedItemName = $state("iron");
	let listingQuantity = $state(1);
	let listingPrice = $state(1000);
	let buyQuantities = $state<Record<string, number>>({});
	let filterType = $state<string>("all");
	let cooldownTimeRemaining = $state(data.cooldownRemaining);

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

	const filteredStateExports = $derived(filterType === "all" || filterType === "resource" ? data.stateExports : []);

	const availableQuantity = $derived.by(() => {
		if (selectedItemType === "resource") {
			return resourceMap.get(selectedItemName) || 0;
		}
		return productMap.get(selectedItemName) || 0;
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
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Arms Market</h1>
			<p class="text-gray-400">Buy and sell resources and products</p>
		</div>

		<!-- Quick Actions -->
		<div class="flex gap-3">
			<a
				href="/production"
				class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
			>
				<FluentProduction20Filled class="size-5" />
				Production
			</a>
		</div>
	</div>

	<!-- Balance & Stats -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Balance</p>
					<p class="text-lg font-bold text-white">${(data.wallet.balance / 100).toFixed(2)}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
					<FluentShoppingCart20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Active Listings</p>
					<p class="text-lg font-bold text-white">{data.marketListings.length}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentBox20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Your Listings</p>
					<p class="text-lg font-bold text-white">
						{data.marketListings.filter((l) => l.sellerId === data.wallet?.userId).length}
					</p>
				</div>
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
					<h2 class="text-lg font-semibold text-white">Resources</h2>
				</div>

				<div class="space-y-2">
					{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
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
					<h2 class="text-lg font-semibold text-white">Products</h2>
				</div>

				<div class="space-y-2">
					{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
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

		<!-- Market Area -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Create Listing Form -->
			<form
				method="POST"
				action="?/createListing"
				use:enhance
				class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-5"
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
				<div>
					<label for="quantity" class="block text-sm font-medium text-gray-300 mb-2"> Quantity </label>
					<input
						type="number"
						id="quantity"
						name="quantity"
						min="1"
						max={availableQuantity}
						bind:value={listingQuantity}
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
						placeholder="Enter quantity"
					/>
				</div>

				<!-- Price Per Unit -->
				<div>
					<label for="pricePerUnit" class="block text-sm font-medium text-gray-300 mb-2"> Price Per Unit </label>
					<div class="join w-full">
						<span class="join-item btn bg-slate-700/50 border-slate-600/30 text-gray-300">$</span>
						<input
							type="number"
							id="pricePerUnit"
							name="pricePerUnit"
							min="100"
							step="100"
							bind:value={listingPrice}
							class="input join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50"
							placeholder="1000"
						/>
						<span class="join-item btn bg-slate-700/50 border-slate-600/30 text-gray-300">.00</span>
					</div>
					<p class="text-xs text-gray-500 mt-1">Price in cents (1000 = $10.00)</p>
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
						<span class="font-bold text-white">${(listingPrice / 100).toFixed(2)}</span>
					</div>
					<div class="divider my-1"></div>
					<div class="flex justify-between text-lg font-bold text-purple-400">
						<span>Total Value:</span>
						<span>${((listingQuantity * listingPrice) / 100).toFixed(2)}</span>
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
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FluentShoppingCart20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Market Listings</h2>
					</div>

					<!-- Filter -->
					<div class="flex items-center gap-2">
						<FluentFilter20Filled class="size-4 text-gray-400" />
						<select bind:value={filterType} class="select select-sm bg-slate-700/50 border-slate-600/30 text-white">
							<option value="all">All Items</option>
							<option value="resource">Resources</option>
							<option value="product">Products</option>
						</select>
					</div>
				</div>

				{#if filteredListings.length === 0 && filteredStateExports.length === 0}
					<div class="text-center py-12">
						<FluentShoppingCart20Filled class="size-16 mx-auto opacity-20 mb-4 text-gray-500" />
						<p class="text-lg text-gray-400">No listings available</p>
						<p class="text-sm text-gray-500 mt-2">Be the first to list items on the market!</p>
					</div>
				{:else}
					<div class="space-y-3">
						<!-- State Export Listings -->
						{#if filteredStateExports.length > 0}
							<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 mb-4">
								<p class="text-sm font-semibold text-blue-300">🏛️ State Exports - Revenue goes to state treasuries</p>
							</div>
						{/if}

						{#each filteredStateExports as stateExport}
							{@const icon = resourceIcons[stateExport.resourceType]}
							<div class="bg-blue-700/20 rounded-xl p-4 border-2 border-blue-500/30">
								<div class="flex items-center justify-between gap-4">
									<!-- Item Info -->
									<div class="flex items-center gap-3 flex-1">
										<div class="text-4xl">{icon}</div>
										<div class="flex-1">
											<div class="font-bold text-lg capitalize flex items-center gap-2 text-white">
												{stateExport.resourceType}
												<span class="badge badge-sm bg-blue-600/20 text-blue-300 border-blue-500/30">
													🏛️ State Export
												</span>
												<span class="badge badge-sm bg-purple-600/20 text-purple-300 border-purple-500/30">
													{stateExport.stateName}
												</span>
											</div>
											<div class="text-sm text-gray-400">
												<span class="font-semibold">{stateExport.quantity}</span> units available
											</div>
										</div>
									</div>

									<!-- Price Info -->
									<div class="text-right">
										<div class="text-xs text-gray-400">Price per unit</div>
										<div class="text-2xl font-bold text-green-400">
											${(stateExport.pricePerUnit / 100).toFixed(2)}
										</div>
										<div class="text-xs text-gray-400 mt-1">
											Total: ${((stateExport.pricePerUnit * stateExport.quantity) / 100).toFixed(2)}
										</div>
									</div>

									<!-- Buy Action -->
									<div class="min-w-[140px]">
										<form method="POST" action="?/buyStateExport" use:enhance>
											<input type="hidden" name="listingId" value={stateExport.id} />
											<div class="space-y-2">
												<label class="text-xs text-gray-400">Quantity</label>
												<div class="join w-full">
													<input
														type="number"
														name="quantity"
														min="1"
														max={stateExport.quantity}
														value={buyQuantities[stateExport.id] || 1}
														class="input input-sm join-item w-16 bg-slate-700/50 border-slate-600/30 text-white"
														onchange={(e) => {
															buyQuantities[stateExport.id] = parseInt(e.currentTarget.value);
														}}
													/>
													<button
														type="submit"
														class="btn btn-sm btn-primary join-item bg-gradient-to-r from-blue-600 to-purple-600"
													>
														Buy
													</button>
												</div>
											</div>
										</form>
									</div>
								</div>
							</div>
						{/each}

						<!-- Regular User Listings -->
						{#if filteredListings.length > 0 && filteredStateExports.length > 0}
							<div class="bg-slate-600/10 border border-slate-500/20 rounded-xl p-3 my-4">
								<p class="text-sm font-semibold text-gray-400">📦 User Listings</p>
							</div>
						{/if}

						{#each filteredListings as listing}
							{@const icon = allIcons[listing.itemName]}
							{@const isOwnListing = listing.sellerId === data.wallet?.userId}
							{@const isSanctioned = listing.isStateSanctioned === 1}
							<div
								class="bg-slate-700/30 rounded-xl p-4 border-2 {isOwnListing
									? 'border-amber-500/30'
									: isSanctioned
										? 'border-red-500/30'
										: 'border-slate-600/30'}"
							>
								<div class="flex items-center justify-between gap-4">
									<!-- Item Info -->
									<div class="flex items-center gap-3 flex-1">
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
												{#if isSanctioned}
													<span class="badge badge-sm bg-red-600/20 text-red-300 border-red-500/30">
														⚠️ Sanctioned State
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
									</div>

									<!-- Price Info -->
									<div class="text-right">
										<div class="text-xs text-gray-400">Price per unit</div>
										<div class="text-2xl font-bold text-green-400">
											${(listing.pricePerUnit / 100).toFixed(2)}
										</div>
										<div class="text-xs text-gray-400 mt-1">
											Total: ${((listing.pricePerUnit * listing.quantity) / 100).toFixed(2)}
										</div>
									</div>

									<!-- Action -->
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
															value={buyQuantities[listing.id] || 1}
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

			<!-- Market Info -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
					<FluentInfo20Filled class="inline size-4 text-blue-400 mb-1" />
					<p class="text-xs text-blue-300">State exports provide resources and generate treasury revenue</p>
				</div>
				<div class="bg-green-600/10 border border-green-500/20 rounded-xl p-4">
					<FluentCheckmark20Filled class="inline size-4 text-green-400 mb-1" />
					<p class="text-xs text-green-300">Instant transactions - no waiting!</p>
				</div>
				<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
					<FluentWarning20Filled class="inline size-4 text-amber-400 mb-1" />
					<p class="text-xs text-amber-300">
						Market taxes may apply based on your state. Sanctions are for display only.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
