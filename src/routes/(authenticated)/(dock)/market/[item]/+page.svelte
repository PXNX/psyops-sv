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
	import { buttonClass, badgeClass } from "$lib/component/ui/styles";

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

	// Editorial accent tokens: resources read as soft-purple, products as soft-blue.
	const ACCENTS = {
		resource: { text: "text-[#d5c4df]", border: "border-[#8c709b]/40" },
		product: { text: "text-[#b7d0e6]", border: "border-[#315d8d]/40" }
	};
	const accent = $derived(data.itemType === "resource" ? ACCENTS.resource : ACCENTS.product);

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
		return { label: "Matches market low", cls: "text-[#b7d0e6]" };
	}
</script>

<div class="min-h-screen pb-8">
	<!-- Header -->
	<div class="border-b border-[#dfceb0]/15 bg-[#0c1929]/90 backdrop-blur-xl">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3 sm:gap-5">
					<a
						href="/market"
						class="size-10 flex items-center justify-center bg-[#102239]/70 rounded-sm border border-[#dfceb0]/15 hover:border-[#dfceb0]/35 transition-colors"
					>
						<FluentArrowLeft20Filled class="size-4 text-[#c7bda9]" />
					</a>
					<div
						class="size-14 sm:size-16 flex items-center justify-center bg-[#102239]/70 rounded-sm border-2 {accent.border}"
					>
						<span class="text-3xl sm:text-4xl">{itemIcon}</span>
					</div>
					<div>
						<h1 class="text-xl sm:text-3xl font-bold tracking-wider uppercase font-mono {accent.text} capitalize">
							{data.itemName}
						</h1>
						<p class="text-xs sm:text-sm text-[#a89e8e] font-mono capitalize">
							{data.itemType} · {data.otherListings.length + (data.myListing ? 1 : 0)} listing{data.otherListings
								.length +
								(data.myListing ? 1 : 0) !==
							1
								? "s"
								: ""}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3 bg-[#102239]/70 border border-green-500/20 rounded-sm px-4 py-3">
					<FluentMoney20Filled class="size-4 text-green-400" />
					<div>
						<p class="text-xs text-[#a89e8e] font-mono">BALANCE</p>
						<p class="text-base font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
		<!-- Stats Strip -->
		{#if data.statistics}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
				<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm p-3 sm:p-4">
					<p class="text-xs text-[#a89e8e] font-mono mb-1">AVG PRICE</p>
					<p class="text-lg sm:text-xl font-bold text-[#fff7e8] font-mono">
						${data.statistics.currentAvgPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-[#14283f]/85 border border-green-500/20 rounded-sm p-3 sm:p-4">
					<p class="text-xs text-[#a89e8e] font-mono mb-1">LOWEST</p>
					<p class="text-lg sm:text-xl font-bold text-green-400 font-mono">
						${data.statistics.lowestPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-[#14283f]/85 border border-red-500/20 rounded-sm p-3 sm:p-4">
					<p class="text-xs text-[#a89e8e] font-mono mb-1">HIGHEST</p>
					<p class="text-lg sm:text-xl font-bold text-red-400 font-mono">
						${data.statistics.highestPrice.toLocaleString()}
					</p>
				</div>
				<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm p-3 sm:p-4">
					<p class="text-xs text-[#a89e8e] font-mono mb-1">LISTINGS</p>
					<p class="text-lg sm:text-xl font-bold {accent.text} font-mono">{data.statistics.activeListings}</p>
				</div>
			</div>
		{/if}

		<!-- Price Chart -->
		{#if data.priceHistory.length > 1}
			<MarketChart priceHistory={data.priceHistory} {currentPrice} />
		{:else if data.priceHistory.length === 0}
			<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm p-6 text-center py-10">
				<FluentChartMultiple20Regular class="size-10 mx-auto opacity-20 mb-2 text-[#a89e8e]" />
				<p class="text-sm text-[#a89e8e]/70 font-mono">No price history yet</p>
			</div>
		{/if}

		<!-- Your Listing -->
		<div class="bg-[#14283f]/85 border border-[#e6a527]/30 rounded-sm overflow-hidden">
			<div class="bg-[#e6a527]/10 border-b border-[#e6a527]/25 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-sm sm:text-base font-bold text-[#f7c56b] font-mono uppercase tracking-wide">Your Listing</h2>
					{#if data.myListing && !isEditing}
						<div class="flex items-center gap-2">
							<button class={buttonClass({ variant: "secondary", size: "xs" })} onclick={startEditing}>
								<FluentEdit20Filled class="size-3" />
								EDIT
							</button>
							<form method="POST" action="?/removeListing" use:enhance>
								<input type="hidden" name="listingId" value={data.myListing.id} />
								<button type="submit" class={buttonClass({ variant: "soft-red", size: "xs" })}>
									<FluentDelete20Filled class="size-3" />
									REMOVE
								</button>
							</form>
						</div>
					{:else if isEditing}
						<button class={buttonClass({ variant: "secondary", size: "xs" })} onclick={cancelEditing}>
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
								<p class="text-xs text-[#a89e8e] font-mono mb-1">QUANTITY</p>
								<p class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">{data.myListing.quantity}</p>
								{#if data.userItemQuantity > 0}
									<p class="text-xs text-[#a89e8e]/70 font-mono mt-0.5">+{data.userItemQuantity} in inventory</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-[#a89e8e] font-mono mb-1">UNIT PRICE</p>
								<p class="text-xl sm:text-2xl font-bold text-[#f7c56b] font-mono">
									${data.myListing.pricePerUnit.toLocaleString()}
								</p>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-0.5">{cmp.label}</p>
								{/if}
							</div>
							<div>
								<p class="text-xs text-[#a89e8e] font-mono mb-1">TOTAL VALUE</p>
								<p class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">
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
								<label for="edit-qty" class="block text-xs text-[#a89e8e] font-mono mb-1.5">
									QUANTITY <span class="text-[#a89e8e]/70">max {totalAvailableForListing}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="edit-qty"
										name="quantity"
										min="1"
										max={totalAvailableForListing}
										bind:value={editQty}
										class="input input-sm join-item flex-1 bg-[#0d1d31] border-[#dfceb0]/20 text-[#fff7e8] font-mono focus:border-[#e6a527]/70"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-[#14283f] hover:bg-[#19304b] border-[#dfceb0]/25 text-[#c7bda9] font-mono"
										onclick={() => (editQty = totalAvailableForListing)}>MAX</button
									>
								</div>
							</div>
							<div>
								<label for="edit-price" class="block text-xs text-[#a89e8e] font-mono mb-1.5">PRICE PER UNIT</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-[#14283f] border-[#dfceb0]/25 text-[#a89e8e] font-mono">$</span>
									<input
										type="number"
										id="edit-price"
										name="pricePerUnit"
										min="1"
										bind:value={editPrice}
										class="input input-sm join-item flex-1 bg-[#0d1d31] border-[#dfceb0]/20 text-[#fff7e8] font-mono focus:border-[#e6a527]/70"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-1.5">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between pt-1">
							<p class="text-sm text-[#a89e8e] font-mono">
								New total: <span class="text-[#fff7e8] font-bold">${(editQty * editPrice).toLocaleString()}</span>
							</p>
							<button type="submit" class={buttonClass({ variant: "primary", size: "sm" })}>
								<FluentCheckmark20Filled class="size-3.5" />
								Save Changes
							</button>
						</div>
					</form>
				{:else if data.userItemQuantity > 0 && cooldownTimeRemaining <= 0}
					{@const cmp = priceVsMarket(createPrice)}
					<form method="POST" action="?/createListing" use:enhance class="space-y-4">
						<div class="flex items-center gap-2 text-[#c7bda9] mb-2">
							<FluentAdd20Filled class="size-4" />
							<span class="text-sm font-mono">
								List your {data.itemName} for sale —
								<span class="text-[#e5d8c1] font-bold">{data.userItemQuantity}</span> in inventory
							</span>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="create-qty" class="block text-xs text-[#a89e8e] font-mono mb-1.5">
									QUANTITY <span class="text-[#a89e8e]/70">max {data.userItemQuantity}</span>
								</label>
								<div class="join w-full">
									<input
										type="number"
										id="create-qty"
										name="quantity"
										min="1"
										max={data.userItemQuantity}
										bind:value={createQty}
										class="input input-sm join-item flex-1 bg-[#0d1d31] border-[#dfceb0]/20 text-[#fff7e8] font-mono focus:border-[#e6a527]/70"
									/>
									<button
										type="button"
										class="btn btn-sm join-item bg-[#14283f] hover:bg-[#19304b] border-[#dfceb0]/25 text-[#c7bda9] font-mono"
										onclick={() => (createQty = data.userItemQuantity)}>MAX</button
									>
								</div>
							</div>
							<div>
								<label for="create-price" class="block text-xs text-[#a89e8e] font-mono mb-1.5">PRICE PER UNIT</label>
								<div class="join w-full">
									<span class="join-item btn btn-sm bg-[#14283f] border-[#dfceb0]/25 text-[#a89e8e] font-mono">$</span>
									<input
										type="number"
										id="create-price"
										name="pricePerUnit"
										min="1"
										bind:value={createPrice}
										class="input input-sm join-item flex-1 bg-[#0d1d31] border-[#dfceb0]/20 text-[#fff7e8] font-mono focus:border-[#e6a527]/70"
									/>
								</div>
								{#if cmp}
									<p class="text-xs {cmp.cls} font-mono mt-1.5">{cmp.label}</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-between pt-1">
							<p class="text-sm text-[#a89e8e] font-mono">
								Total value: <span class="text-[#fff7e8] font-bold">${(createQty * createPrice).toLocaleString()}</span>
							</p>
							<button
								type="submit"
								disabled={createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
								class={buttonClass({ variant: "primary", size: "sm" })}
							>
								<FluentAdd20Filled class="size-3.5" />
								Create Listing
							</button>
						</div>
					</form>
				{:else if cooldownTimeRemaining > 0}
					<div class="flex items-center gap-3 text-[#f7c56b]">
						<FluentWarning20Filled class="size-5" />
						<div>
							<p class="text-sm font-mono font-bold">Cooldown Active</p>
							<p class="text-xs text-[#f7c56b]/60 font-mono">{cooldownDisplay} before you can list again</p>
						</div>
					</div>
				{:else}
					<div class="text-center py-6">
						<p class="text-sm text-[#a89e8e]/70 font-mono">No {data.itemName} in your inventory to sell.</p>
						<a href="/market" class="text-xs {accent.text} font-mono hover:underline mt-2 inline-block">
							← Back to market</a
						>
					</div>
				{/if}
			</div>
		</div>

		<!-- Market Offers -->
		<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm overflow-hidden">
			<div class="bg-[#102239]/80 border-b border-[#dfceb0]/15 px-4 sm:px-6 py-3 sm:py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-sm sm:text-base font-bold text-[#fff7e8] font-mono uppercase tracking-wide">Market Offers</h2>
					{#if data.otherListings.length > 0}
						<span class="text-xs text-[#a89e8e]/70 font-mono">sorted cheapest first</span>
					{/if}
				</div>
			</div>

			{#if data.otherListings.length === 0}
				<div class="p-8 sm:p-12 text-center">
					<FluentShoppingCart20Filled class="size-10 mx-auto opacity-15 mb-3 text-[#a89e8e]" />
					<p class="text-[#a89e8e] font-mono font-medium">No other sellers right now</p>
					{#if !data.myListing && data.userItemQuantity > 0}
						<p class="text-xs text-[#a89e8e]/70 font-mono mt-1">Be the first — list yours above.</p>
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

						<div
							class="bg-[#102239]/70 border {isCheapest ? 'border-green-500/25' : 'border-[#dfceb0]/15'} rounded-sm"
						>
							<div class="flex items-center gap-3 sm:gap-4 px-4 py-3">
								<div class="w-10 flex justify-center">
									{#if isCheapest}
										<span class={badgeClass({ tone: "green", size: "xs" })}>BEST</span>
									{:else}
										<span class="text-xs text-[#a89e8e]/70 font-mono">#{i + 1}</span>
									{/if}
								</div>

								<div class="flex-1">
									<div class="flex items-baseline gap-2">
										<span class="text-xl font-bold font-mono {isCheapest ? 'text-green-400' : 'text-[#fff7e8]'}"
											>${listing.pricePerUnit.toLocaleString()}</span
										>
										<span class="text-xs text-[#a89e8e]/70 font-mono">per unit</span>
									</div>
									<p class="text-xs text-[#a89e8e] font-mono mt-0.5">{listing.quantity} units available</p>
								</div>

								<form method="POST" action="?/buyListing" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="listingId" value={listing.id} />

									<div class="text-right text-xs font-mono min-w-[80px]">
										{#if taxAmount > 0}
											<div class="text-[#f7c56b]">{data.taxRate}% tax: +${taxAmount.toLocaleString()}</div>
										{/if}
										<div class="text-[#fff7e8] font-bold">${totalCost.toLocaleString()}</div>
									</div>

									<div class="join">
										<input
											type="number"
											name="quantity"
											min="1"
											max={listing.quantity}
											value={buyQty}
											class="input input-sm join-item w-16 bg-[#0d1d31] border-[#dfceb0]/20 text-[#fff7e8] text-center font-mono"
											onchange={(e) => {
												buyQuantities[listing.id] = parseInt(e.currentTarget.value);
											}}
										/>
										<button
											type="submit"
											class="btn btn-sm join-item border-0 font-mono font-bold px-3 {isCheapest
												? 'bg-green-600 hover:bg-green-500 text-white'
												: 'bg-[#e6a527] hover:bg-[#f2b940] text-[#172a45]'}"
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
