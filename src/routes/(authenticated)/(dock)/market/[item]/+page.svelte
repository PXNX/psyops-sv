<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import MarketChart from "./MarketChart.svelte";

	let { data, form } = $props();

	let buyQuantities = $state<Record<string, number>>({});

	let createQty = $state(1);
	let createPrice = $state(data.statistics?.lowestPrice ?? 1000);

	let isEditing = $state(false);
	let editQty = $state(data.myListing?.quantity ?? 1);
	let editPrice = $state(data.myListing?.pricePerUnit ?? 1000);

	let cooldownTimeRemaining = $state(data.cooldownRemaining);

	const ITEM_ICONS: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨",
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const itemIcon = $derived(ITEM_ICONS[data.itemName] ?? "📦");

	const currentPrice = $derived(
		data.priceHistory.length > 0
			? data.priceHistory[data.priceHistory.length - 1].pricePerUnit
			: (data.statistics?.currentAvgPrice ?? 0)
	);

	const totalAvailableForListing = $derived(data.userItemQuantity + (data.myListing?.quantity ?? 0));

	const accentColor = $derived(data.itemType === "resource" ? "purple" : "cyan");

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

	function startEditing() {
		editQty = data.myListing?.quantity ?? 1;
		editPrice = data.myListing?.pricePerUnit ?? 1000;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	function priceVsMarket(price: number): { label: string; cls: string } | null {
		const low = data.statistics?.lowestPrice;
		if (!low) return null;
		const diff = price - low;
		if (diff < 0) return { label: `$${Math.abs(diff).toLocaleString()} below market low`, cls: "text-green-400" };
		if (diff > 0) return { label: `$${diff.toLocaleString()} above market low`, cls: "text-amber-400" };
		return { label: "Matches market low", cls: "text-blue-400" };
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-8">
	<!-- Header -->
	<div class="border-b border-{accentColor}-900/30 bg-slate-900/80 backdrop-blur-xl">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3 sm:gap-5">
					<a
						href="/market"
						class="size-10 flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-colors"
					>
						<FluentArrowLeft20Filled class="size-4 text-slate-400" />
					</a>
					<div
						class="size-14 sm:size-16 flex items-center justify-center bg-slate-800/50 rounded-lg border-2 border-{accentColor}-500/30"
					>
						<span class="text-3xl sm:text-4xl">{itemIcon}</span>
					</div>
					<div>
						<h1
							class="text-xl sm:text-3xl font-bold tracking-wider uppercase font-mono text-{accentColor}-400 capitalize"
						>
							{data.itemName}
						</h1>
						<p class="text-xs sm:text-sm text-slate-500 font-mono capitalize">
							{data.itemType} · {data.otherListings.length + (data.myListing ? 1 : 0)} listing{data.otherListings
								.length +
								(data.myListing ? 1 : 0) !==
							1
								? "s"
								: ""}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3 bg-slate-800/50 border border-green-500/20 rounded-lg px-4 py-3">
					<FluentMoney20Filled class="size-4 text-green-400" />
					<div>
						<p class="text-xs text-slate-500 font-mono">BALANCE</p>
						<p class="text-base font-bold text-white font-mono">${data.wallet.balance.toLocaleString()}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
		<!-- Stats Strip -->
		{#if data.statistics}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
				<div class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
					<p class="text-xs text-slate-500 font-mono mb-1">AVG PRICE</p>
					<p class="text-lg sm:text-xl font-bold text-white font-mono">
						${data.statistics.currentAvgPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-slate-900/50 border border-green-500/20 rounded-xl p-3 sm:p-4">
					<p class="text-xs text-slate-500 font-mono mb-1">LOWEST</p>
					<p class="text-lg sm:text-xl font-bold text-green-400 font-mono">
						${data.statistics.lowestPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-slate-900/50 border border-red-500/20 rounded-xl p-3 sm:p-4">
					<p class="text-xs text-slate-500 font-mono mb-1">HIGHEST</p>
					<p class="text-lg sm:text-xl font-bold text-red-400 font-mono">
						${data.statistics.highestPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
					<p class="text-xs text-slate-500 font-mono mb-1">LISTINGS</p>
					<p class="text-lg sm:text-xl font-bold text-{accentColor}-400 font-mono">{data.statistics.activeListings}</p>
				</div>
			</div>
		{/if}

		<!-- Price Chart -->
		{#if data.priceHistory.length > 1}
			<MarketChart priceHistory={data.priceHistory} {currentPrice} />
		{:else if data.priceHistory.length === 0}
			<div class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 text-center py-10">
				<FluentChartMultiple20Regular class="size-10 mx-auto opacity-20 mb-2 text-slate-500" />
				<p class="text-sm text-slate-600 font-mono">No price history yet</p>
			</div>
		{/if}

		<!-- Your Listing -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-amber-500/20 rounded-xl overflow-hidden"
		>
			<div class="bg-amber-950/20 border-b border-amber-500/20 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-sm sm:text-base font-bold text-amber-400 font-mono uppercase tracking-wide">Your Listing</h2>
					{#if data.myListing && !isEditing}
						<div class="flex items-center gap-2">
							<button
								class="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-300 font-mono transition-colors flex items-center gap-1.5"
								onclick={startEditing}
							>
								<FluentEdit20Filled class="size-3" />
								EDIT
							</button>
							<form method="POST" action="?/removeListing" use:enhance>
								<input type="hidden" name="listingId" value={data.myListing.id} />
								<button
									type="submit"
									class="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 border border-red-500/30 rounded-lg text-xs text-red-400 font-mono transition-colors flex items-center gap-1.5"
								>
									<FluentDelete20Filled class="size-3" />
									REMOVE
								</button>
							</form>
						</div>
					{:else if isEditing}
						<button
							class="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400 font-mono transition-colors flex items-center gap-1.5"
							onclick={cancelEditing}
						>
							<FluentDismiss20Filled class="size-3" />
							CANCEL
						</button>
					{/if}
				</div>
			</div>

			<div class="p-4 sm:p-6">
				{#if data.myListing && !isEditing}
					{@const cmp = priceVsMarket(data.myListing.pricePerUnit)}
					<div class="flex items-center gap-4 sm:gap-6">
						<span class="text-4xl sm:text-5xl">{itemIcon}</span>
						<div class="flex-1 grid grid-cols-3 gap-4">
							<div>
								<p class="text-xs text-slate-500 font-mono mb-1">QUANTITY</p>
								<p class="text-xl sm:text-2xl font-bold text-white font-mono">{data.myListing.quantity}</p>
								{#if data.userItemQuantity > 0}
									<p class="text-xs text-slate-600 font-mono mt-0.5">+{data.userItemQuantity} in inventory</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-slate-500 font-mono mb-1">UNIT PRICE</p>
								<p class="text-xl sm:text-2xl font-bold text-amber-300 font-mono">
									${data.myListing.pricePerUnit.toLocaleString()}
								</p>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-0.5">{cmp.label}</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-slate-500 font-mono mb-1">TOTAL VALUE</p>
								<p class="text-xl sm:text-2xl font-bold text-white font-mono">
									${(data.myListing.quantity * data.myListing.pricePerUnit).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				{:else if data.myListing && isEditing}
					{@const cmp = priceVsMarket(editPrice)}
					<form
						method="POST"
						action="?/updateListing"
						use:enhance={{
							onResult: () => {
								isEditing = false;
							}
						}}
						class="space-y-4"
					>
						<input type="hidden" name="listingId" value={data.myListing.id} />
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="edit-qty" class="block text-xs text-slate-500 font-mono mb-1.5">
									QUANTITY <span class="text-slate-600">max {totalAvailableForListing}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="edit-qty"
										name="quantity"
										min="1"
										max={totalAvailableForListing}
										bind:value={editQty}
										class="input input-sm join-item flex-1 bg-slate-950/60 border-slate-700/50 text-white font-mono focus:border-amber-500/50"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 text-slate-400 font-mono"
										onclick={() => (editQty = totalAvailableForListing)}>MAX</button
									>
								</div>
							</div>
							<div>
								<label for="edit-price" class="block text-xs text-slate-500 font-mono mb-1.5">PRICE PER UNIT</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-slate-800/50 border-slate-700/50 text-slate-500 font-mono"
										>$</span
									>
									<input
										type="number"
										id="edit-price"
										name="pricePerUnit"
										min="1"
										bind:value={editPrice}
										class="input input-sm join-item flex-1 bg-slate-950/60 border-slate-700/50 text-white font-mono focus:border-amber-500/50"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-1.5">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between pt-1">
							<p class="text-sm text-slate-500 font-mono">
								New total: <span class="text-white font-bold">${(editQty * editPrice).toLocaleString()}</span>
							</p>
							<button
								type="submit"
								class="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white font-bold text-sm font-mono uppercase tracking-wide transition-all flex items-center gap-1.5"
							>
								<FluentCheckmark20Filled class="size-3.5" />
								Save Changes
							</button>
						</div>
					</form>
				{:else if data.userItemQuantity > 0 && cooldownTimeRemaining <= 0}
					{@const cmp = priceVsMarket(createPrice)}
					<form method="POST" action="?/createListing" use:enhance class="space-y-4">
						<div class="flex items-center gap-2 text-slate-400 mb-2">
							<FluentAdd20Filled class="size-4" />
							<span class="text-sm font-mono">
								List your {data.itemName} for sale —
								<span class="text-slate-300 font-bold">{data.userItemQuantity}</span> in inventory
							</span>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="create-qty" class="block text-xs text-slate-500 font-mono mb-1.5">
									QUANTITY <span class="text-slate-600">max {data.userItemQuantity}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="create-qty"
										name="quantity"
										min="1"
										max={data.userItemQuantity}
										bind:value={createQty}
										class="input input-sm join-item flex-1 bg-slate-950/60 border-slate-700/50 text-white font-mono focus:border-{accentColor}-500/50"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 text-slate-400 font-mono"
										onclick={() => (createQty = data.userItemQuantity)}>MAX</button
									>
								</div>
							</div>
							<div>
								<label for="create-price" class="block text-xs text-slate-500 font-mono mb-1.5">PRICE PER UNIT</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-slate-800/50 border-slate-700/50 text-slate-500 font-mono"
										>$</span
									>
									<input
										type="number"
										id="create-price"
										name="pricePerUnit"
										min="1"
										bind:value={createPrice}
										class="input input-sm join-item flex-1 bg-slate-950/60 border-slate-700/50 text-white font-mono focus:border-{accentColor}-500/50"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-1.5">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between pt-1">
							<p class="text-sm text-slate-500 font-mono">
								Total value: <span class="text-white font-bold">${(createQty * createPrice).toLocaleString()}</span>
							</p>
							<button
								type="submit"
								disabled={createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
								class="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 rounded-lg text-white font-bold text-sm font-mono uppercase tracking-wide transition-all disabled:opacity-40 flex items-center gap-1.5"
							>
								<FluentAdd20Filled class="size-3.5" />
								Create Listing
							</button>
						</div>
					</form>
				{:else if cooldownTimeRemaining > 0}
					<div class="flex items-center gap-3 text-amber-400">
						<FluentWarning20Filled class="size-5" />
						<div>
							<p class="text-sm font-mono font-bold">Cooldown Active</p>
							<p class="text-xs text-amber-400/60 font-mono">{cooldownDisplay} before you can list again</p>
						</div>
					</div>
				{:else}
					<div class="text-center py-6">
						<p class="text-sm text-slate-600 font-mono">No {data.itemName} in your inventory to sell.</p>
						<a href="/market" class="text-xs text-{accentColor}-400 font-mono hover:underline mt-2 inline-block"
							>← Back to market</a
						>
					</div>
				{/if}
			</div>
		</div>

		<!-- Market Offers -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
		>
			<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-sm sm:text-base font-bold text-slate-200 font-mono uppercase tracking-wide">Market Offers</h2>
					{#if data.otherListings.length > 0}
						<span class="text-xs text-slate-600 font-mono">sorted cheapest first</span>
					{/if}
				</div>
			</div>

			{#if data.otherListings.length === 0}
				<div class="p-8 sm:p-12 text-center">
					<FluentShoppingCart20Filled class="size-10 mx-auto opacity-15 mb-3 text-slate-500" />
					<p class="text-slate-500 font-mono font-medium">No other sellers right now</p>
					{#if !data.myListing && data.userItemQuantity > 0}
						<p class="text-xs text-slate-600 font-mono mt-1">Be the first — list yours above.</p>
					{/if}
				</div>
			{:else}
				<div class="p-3 sm:p-4 space-y-2">
					{#each data.otherListings as listing, i}
						{@const buyQty = buyQuantities[listing.id] || 1}
						{@const itemCost = listing.pricePerUnit * buyQty}
						{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
						{@const totalCost = itemCost + taxAmount}
						{@const isCheapest = i === 0}

						<div class="bg-slate-900/40 border {isCheapest ? 'border-green-500/25' : 'border-slate-700/40'} rounded-xl">
							<div class="flex items-center gap-3 sm:gap-4 px-4 py-3">
								<div class="w-10 flex justify-center">
									{#if isCheapest}
										<span
											class="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5 font-mono"
											>BEST</span
										>
									{:else}
										<span class="text-xs text-slate-600 font-mono">#{i + 1}</span>
									{/if}
								</div>

								<div class="flex-1">
									<div class="flex items-baseline gap-2">
										<span class="text-xl font-bold font-mono {isCheapest ? 'text-green-400' : 'text-white'}"
											>${listing.pricePerUnit.toLocaleString()}</span
										>
										<span class="text-xs text-slate-600 font-mono">per unit</span>
									</div>
									<p class="text-xs text-slate-500 font-mono mt-0.5">{listing.quantity} units available</p>
								</div>

								<form method="POST" action="?/buyListing" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="listingId" value={listing.id} />

									<div class="text-right text-xs font-mono min-w-[80px]">
										{#if taxAmount > 0}
											<div class="text-amber-400">{data.taxRate}% tax: +${taxAmount.toLocaleString()}</div>
										{/if}
										<div class="text-white font-bold">${totalCost.toLocaleString()}</div>
									</div>

									<div class="join">
										<input
											type="number"
											name="quantity"
											min="1"
											max={listing.quantity}
											value={buyQty}
											class="input input-sm join-item w-16 bg-slate-950/60 border-slate-700/50 text-white text-center font-mono"
											onchange={(e) => {
												buyQuantities[listing.id] = parseInt(e.currentTarget.value);
											}}
										/>
										<button
											type="submit"
											class="btn btn-sm join-item border-0 text-white font-mono font-bold {isCheapest
												? 'bg-green-600 hover:bg-green-500'
												: 'bg-purple-600/70 hover:bg-purple-600'} px-3"
										>
											BUY
										</button>
									</div>
								</form>
								{#if data.governmentState}
									<form method="POST" action="?/buyListingAsState" use:enhance>
										<input type="hidden" name="listingId" value={listing.id} />
										<input type="hidden" name="quantity" value={buyQty} />
										<button
											type="submit"
											title="Buy for {data.governmentState
												.name} (Treasury: ${data.governmentState.treasuryBalance.toLocaleString()})"
											class="btn btn-sm bg-amber-600/70 hover:bg-amber-600 border-0 text-white px-2 gap-1 font-mono"
										>
											<span>🏛️</span>
											<span class="hidden sm:inline text-xs">STATE</span>
										</button>
									</form>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
