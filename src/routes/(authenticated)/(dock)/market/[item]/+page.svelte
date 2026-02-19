<!-- src/routes/market/[item]/+page.svelte -->
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

	// Buy quantities per listing
	let buyQuantities = $state<Record<string, number>>({});

	// Create listing form state
	let createQty = $state(1);
	let createPrice = $state(data.statistics?.lowestPrice ?? 1000);

	// Edit listing state
	let isEditing = $state(false);
	let editQty = $state(data.myListing?.quantity ?? 1);
	let editPrice = $state(data.myListing?.pricePerUnit ?? 1000);

	// Cooldown timer
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

	// Total available to sell = inventory + what's already listed (since editing returns/takes from inventory)
	const totalAvailableForListing = $derived(data.userItemQuantity + (data.myListing?.quantity ?? 0));

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

	// When entering edit mode, seed values from current listing
	function startEditing() {
		editQty = data.myListing?.quantity ?? 1;
		editPrice = data.myListing?.pricePerUnit ?? 1000;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	// Price comparison helper
	function priceVsMarket(price: number): { label: string; cls: string } | null {
		const low = data.statistics?.lowestPrice;
		if (!low) return null;
		const diff = price - low;
		if (diff < 0) return { label: `$${Math.abs(diff).toLocaleString()} below market low`, cls: "text-green-400" };
		if (diff > 0) return { label: `$${diff.toLocaleString()} above market low`, cls: "text-amber-400" };
		return { label: "Matches market low", cls: "text-blue-400" };
	}
</script>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/market" class="btn btn-circle btn-ghost btn-sm">
				<FluentArrowLeft20Filled class="size-4" />
			</a>
			<div class="flex items-center gap-3">
				<span class="text-4xl">{itemIcon}</span>
				<div>
					<h1 class="text-2xl font-bold text-white capitalize">{data.itemName}</h1>
					<p class="text-sm text-gray-400 capitalize">
						{data.itemType} · {data.otherListings.length + (data.myListing ? 1 : 0)} active listing{data.otherListings
							.length +
							(data.myListing ? 1 : 0) !==
						1
							? "s"
							: ""}
					</p>
				</div>
			</div>
		</div>
		<div class="flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3">
			<FluentMoney20Filled class="size-4 text-green-400" />
			<div>
				<p class="text-xs text-gray-400">Balance</p>
				<p class="text-base font-bold text-white">${data.wallet.balance.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<!-- Market stats strip -->
	{#if data.statistics}
		<div class="grid grid-cols-4 gap-3">
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-3">
				<p class="text-xs text-gray-500 mb-1">Avg Price</p>
				<p class="text-lg font-bold text-white">${data.statistics.currentAvgPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-3">
				<p class="text-xs text-gray-500 mb-1">Lowest</p>
				<p class="text-lg font-bold text-green-400">${data.statistics.lowestPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-3">
				<p class="text-xs text-gray-500 mb-1">Highest</p>
				<p class="text-lg font-bold text-red-400">${data.statistics.highestPrice.toLocaleString()}</p>
			</div>
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-3">
				<p class="text-xs text-gray-500 mb-1">Listings</p>
				<p class="text-lg font-bold text-purple-400">{data.statistics.activeListings}</p>
			</div>
		</div>
	{/if}

	<!-- Price chart -->
	{#if data.priceHistory.length > 1}
		<MarketChart priceHistory={data.priceHistory} {currentPrice} />
	{:else if data.priceHistory.length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 text-center py-10">
			<FluentChartMultiple20Regular class="size-10 mx-auto opacity-20 mb-2 text-gray-500" />
			<p class="text-sm text-gray-500">No price history yet</p>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════ YOUR LISTING ═══════════════════════════════════════ -->
	<div>
		<h2 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Your Listing</h2>

		{#if data.myListing}
			<!-- Existing listing card -->
			<div class="bg-slate-800/60 border-2 border-amber-500/30 rounded-2xl overflow-hidden">
				<!-- Top bar: status + actions -->
				<div class="flex items-center justify-between px-5 py-3 bg-amber-500/5 border-b border-amber-500/20">
					<div class="flex items-center gap-2">
						<span class="size-2 rounded-full bg-amber-400 animate-pulse"></span>
						<span class="text-sm font-semibold text-amber-300">Active listing</span>
					</div>
					<div class="flex items-center gap-2">
						{#if !isEditing}
							<button
								class="btn btn-xs gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-500/30 text-gray-300"
								onclick={startEditing}
							>
								<FluentEdit20Filled class="size-3" />
								Edit
							</button>
							<form method="POST" action="?/removeListing" use:enhance>
								<input type="hidden" name="listingId" value={data.myListing.id} />
								<button
									type="submit"
									class="btn btn-xs gap-1 bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300"
								>
									<FluentDelete20Filled class="size-3" />
									Remove
								</button>
							</form>
						{:else}
							<button
								class="btn btn-xs gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-500/30 text-gray-400"
								onclick={cancelEditing}
							>
								<FluentDismiss20Filled class="size-3" />
								Cancel
							</button>
						{/if}
					</div>
				</div>

				{#if !isEditing}
					{@const cmp = priceVsMarket(data.myListing.pricePerUnit)}

					<!-- View mode -->
					<div class="flex items-center gap-6 px-5 py-4">
						<span class="text-5xl">{itemIcon}</span>
						<div class="flex-1 grid grid-cols-3 gap-4">
							<div>
								<p class="text-xs text-gray-500">Quantity listed</p>
								<p class="text-2xl font-bold text-white">{data.myListing.quantity}</p>
								{#if data.userItemQuantity > 0}
									<p class="text-xs text-gray-500 mt-0.5">+{data.userItemQuantity} in inventory</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-gray-500">Price per unit</p>
								<p class="text-2xl font-bold text-amber-300">${data.myListing.pricePerUnit.toLocaleString()}</p>
								{#if cmp}
									<p class="text-xs {cmp.cls} mt-0.5">{cmp.label}</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-gray-500">Total value</p>
								<p class="text-2xl font-bold text-white">
									${(data.myListing.quantity * data.myListing.pricePerUnit).toLocaleString()}
								</p>
								<p class="text-xs text-gray-500 mt-0.5">
									Listed {new Date(data.myListing.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
					</div>
				{:else}
					{@const cmp = priceVsMarket(editPrice)}

					<!-- Edit mode — inline form -->
					<form
						method="POST"
						action="?/updateListing"
						use:enhance={{
							onResult: () => {
								isEditing = false;
							}
						}}
						class="px-5 py-4 space-y-4"
					>
						<input type="hidden" name="listingId" value={data.myListing.id} />
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="edit-qty" class="block text-xs text-gray-400 mb-1">
									Quantity
									<span class="text-gray-600 ml-1">max {totalAvailableForListing}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="edit-qty"
										name="quantity"
										min="1"
										max={totalAvailableForListing}
										bind:value={editQty}
										class="input input-sm join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-400"
										onclick={() => (editQty = totalAvailableForListing)}>Max</button
									>
								</div>
							</div>
							<div>
								<label for="edit-price" class="block text-xs text-gray-400 mb-1">Price per unit</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-slate-700/50 border-slate-600/30 text-gray-400">$</span>
									<input
										type="number"
										id="edit-price"
										name="pricePerUnit"
										min="1"
										bind:value={editPrice}
										class="input input-sm join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} mt-1">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between">
							<p class="text-sm text-gray-400">
								New total value: <span class="text-white font-semibold">${(editQty * editPrice).toLocaleString()}</span>
							</p>
							<button
								type="submit"
								class="btn btn-sm gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-0 text-white"
							>
								<FluentCheckmark20Filled class="size-3.5" />
								Save changes
							</button>
						</div>
					</form>
				{/if}
			</div>
		{:else if data.userItemQuantity > 0 || data.cooldownRemaining <= 0}
			<!-- Create listing form -->
			<div class="bg-slate-800/50 border border-dashed border-slate-600/60 rounded-2xl p-5 space-y-4">
				<div class="flex items-center gap-2 text-gray-400">
					<FluentAdd20Filled class="size-4" />
					<span class="text-sm font-medium">
						{#if data.userItemQuantity > 0}
							List your {data.itemName} for sale — {data.userItemQuantity} in inventory
						{:else}
							You have no {data.itemName} to sell right now
						{/if}
					</span>
				</div>

				{#if data.userItemQuantity > 0 && cooldownTimeRemaining <= 0}
					{@const cmp = priceVsMarket(createPrice)}

					<form method="POST" action="?/createListing" use:enhance class="space-y-3">
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="create-qty" class="block text-xs text-gray-400 mb-1">
									Quantity <span class="text-gray-600">max {data.userItemQuantity}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="create-qty"
										name="quantity"
										min="1"
										max={data.userItemQuantity}
										bind:value={createQty}
										class="input input-sm join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-400"
										onclick={() => (createQty = data.userItemQuantity)}>Max</button
									>
								</div>
							</div>
							<div>
								<label for="create-price" class="block text-xs text-gray-400 mb-1">Price per unit</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-slate-700/50 border-slate-600/30 text-gray-400">$</span>
									<input
										type="number"
										id="create-price"
										name="pricePerUnit"
										min="1"
										bind:value={createPrice}
										class="input input-sm join-item flex-1 bg-slate-700/50 border-slate-600/30 text-white"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} mt-1">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between pt-1">
							<p class="text-sm text-gray-400">
								Total value: <span class="text-white font-semibold">${(createQty * createPrice).toLocaleString()}</span>
							</p>
							<button
								type="submit"
								disabled={createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
								class="btn btn-sm gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white disabled:opacity-40"
							>
								<FluentAdd20Filled class="size-3.5" />
								Create listing
							</button>
						</div>
					</form>
				{:else if cooldownTimeRemaining > 0}
					<div class="flex items-center gap-2 text-amber-400 text-sm">
						<FluentWarning20Filled class="size-4" />
						Cooldown active — {cooldownDisplay} before you can list again
					</div>
				{/if}
			</div>
		{:else}
			<!-- No stock, no listing -->
			<div class="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 text-center">
				<p class="text-sm text-gray-500">You don't have any {data.itemName} in your inventory.</p>
				<a href="/market" class="btn btn-xs btn-ghost text-purple-400 mt-2">← Back to market</a>
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════ OTHER LISTINGS ═══════════════════════════════════════ -->
	<div>
		<h2 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
			Market Offers
			{#if data.otherListings.length > 0}
				<span class="ml-2 normal-case text-gray-600 font-normal tracking-normal">— sorted cheapest first</span>
			{/if}
		</h2>

		{#if data.otherListings.length === 0}
			<div class="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-8 text-center">
				<FluentShoppingCart20Filled class="size-10 mx-auto opacity-15 mb-3 text-gray-500" />
				<p class="text-gray-400 font-medium">No other sellers right now</p>
				{#if !data.myListing && data.userItemQuantity > 0}
					<p class="text-sm text-gray-600 mt-1">Be the first — list yours above to set the price.</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-2">
				{#each data.otherListings as listing, i}
					{@const buyQty = buyQuantities[listing.id] || 1}
					{@const itemCost = listing.pricePerUnit * buyQty}
					{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
					{@const totalCost = itemCost + taxAmount}
					{@const isCheapest = i === 0}

					<div class="bg-slate-800/50 border {isCheapest ? 'border-green-500/25' : 'border-white/5'} rounded-xl">
						<div class="flex items-center gap-4 px-4 py-3">
							<!-- Rank + icon -->
							<div class="flex items-center gap-3 w-8">
								{#if isCheapest}
									<span
										class="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5"
										>Best</span
									>
								{:else}
									<span class="text-xs text-gray-600 w-6 text-center">#{i + 1}</span>
								{/if}
							</div>

							<!-- Price info -->
							<div class="flex-1">
								<div class="flex items-baseline gap-2">
									<span class="text-xl font-bold {isCheapest ? 'text-green-400' : 'text-white'}"
										>${listing.pricePerUnit.toLocaleString()}</span
									>
									<span class="text-xs text-gray-500">per unit</span>
								</div>
								<p class="text-xs text-gray-500 mt-0.5">{listing.quantity} units available</p>
							</div>

							<!-- Buy form -->
							<form method="POST" action="?/buyListing" use:enhance class="flex items-center gap-2">
								<input type="hidden" name="listingId" value={listing.id} />

								<div class="text-right text-xs text-gray-500 min-w-[80px]">
									{#if taxAmount > 0}
										<div class="text-amber-400">{data.taxRate}% tax: +${taxAmount.toLocaleString()}</div>
									{/if}
									<div class="text-white font-semibold">Total: ${totalCost.toLocaleString()}</div>
								</div>

								<div class="join">
									<input
										type="number"
										name="quantity"
										min="1"
										max={listing.quantity}
										value={buyQty}
										class="input input-sm join-item w-16 bg-slate-700/50 border-slate-600/30 text-white text-center"
										onchange={(e) => {
											buyQuantities[listing.id] = parseInt(e.currentTarget.value);
										}}
									/>
									<button
										type="submit"
										class="btn btn-sm join-item {isCheapest
											? 'bg-green-600 hover:bg-green-500'
											: 'bg-purple-600/70 hover:bg-purple-600'} border-0 text-white px-3"
									>
										Buy
									</button>
								</div>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
