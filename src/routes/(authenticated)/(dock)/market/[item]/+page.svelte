<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import MarketChart from "./MarketChart.svelte";
	import ResourceIcon from "$lib/component/ResourceIcon.svelte";
	import { buttonClass, badgeClass } from "$lib/component/ui/styles";

	let { data, form } = $props();

	let activeTab = $state<"buy" | "sell">(data.otherListings.length > 0 ? "buy" : "sell");
	let showAllOffers = $state(false);

	let buyQuantities = $state<Record<string, number>>({});

	let createQty = $state(1);
	let createPrice = $state(data.statistics?.lowestPrice ?? 1000);

	let isEditing = $state(false);
	let editQty = $state(data.myListing?.quantity ?? 1);
	let editPrice = $state(data.myListing?.pricePerUnit ?? 1000);

	let cooldownTimeRemaining = $state(data.cooldownRemaining);

	const currentPrice = $derived(
		data.priceHistory.length > 0
			? data.priceHistory[data.priceHistory.length - 1].pricePerUnit
			: (data.statistics?.currentAvgPrice ?? 0)
	);

	const totalAvailableForListing = $derived(data.userItemQuantity + (data.myListing?.quantity ?? 0));
	const totalListingCount = $derived(data.otherListings.length + (data.myListing ? 1 : 0));

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

{#snippet offerRow(listing: (typeof data.otherListings)[number], isBest: boolean)}
	{@const buyQty = buyQuantities[listing.id] || 1}
	{@const itemCost = listing.pricePerUnit * buyQty}
	{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
	{@const totalCost = itemCost + taxAmount}

	<div class="bg-[#102239]/70 border {isBest ? 'border-green-500/25' : 'border-[#dfceb0]/15'} rounded-sm">
		<div class="flex flex-wrap items-center gap-3 px-4 py-3">
			<div class="flex-1 min-w-[100px]">
				<div class="flex items-baseline gap-2">
					<span class="text-xl font-bold font-mono {isBest ? 'text-green-400' : 'text-[#fff7e8]'}">
						${listing.pricePerUnit.toLocaleString()}
					</span>
					<span class="text-xs text-[#a89e8e]/70 font-mono">per unit</span>
					{#if isBest}
						<span class={badgeClass({ tone: "green", size: "xs" })}>BEST</span>
					{/if}
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
						class="btn btn-sm join-item border-0 font-mono font-bold px-3 {isBest
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
						title="Buy for {data.governmentState.name} (Treasury: ${data.governmentState.treasuryBalance.toLocaleString()})"
						class="btn btn-sm bg-amber-600/70 hover:bg-amber-600 border-0 text-white px-2 gap-1 font-mono"
					>
						<span>🏛️</span>
						<span class="hidden sm:inline text-xs">STATE</span>
					</button>
				</form>
			{/if}
		</div>
	</div>
{/snippet}

<div class="min-h-screen pb-8">
	<!-- Header -->
	<div class="border-b border-[#dfceb0]/15 bg-[#0c1929]/90 backdrop-blur-xl">
		<div class="max-w-2xl mx-auto px-4 sm:px-6 py-4">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3 min-w-0">
					<a
						href="/market"
						class="size-9 flex-shrink-0 flex items-center justify-center bg-[#102239]/70 rounded-sm border border-[#dfceb0]/15 hover:border-[#dfceb0]/35 transition-colors"
					>
						<FluentArrowLeft20Filled class="size-4 text-[#c7bda9]" />
					</a>
					<div class="size-10 flex-shrink-0 flex items-center justify-center bg-[#102239]/70 rounded-sm border border-[#dfceb0]/15">
						<ResourceIcon name={data.itemName} class="size-6" />
					</div>
					<div class="min-w-0">
						<h1 class="text-base sm:text-lg font-bold tracking-wide uppercase font-mono text-[#fff7e8] capitalize truncate">
							{data.itemName}
						</h1>
						<p class="text-xs text-[#a89e8e] font-mono capitalize">
							{data.itemType} · {totalListingCount} listing{totalListingCount !== 1 ? "s" : ""}
						</p>
					</div>
				</div>

				<div class="text-right flex-shrink-0">
					<p class="text-[10px] text-[#a89e8e] font-mono">BALANCE</p>
					<p class="text-sm font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
		<!-- Price Chart -->
		{#if data.priceHistory.length > 1}
			<MarketChart priceHistory={data.priceHistory} {currentPrice} />
		{:else if data.priceHistory.length === 0}
			<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm p-6 text-center py-10">
				<FluentChartMultiple20Regular class="size-10 mx-auto opacity-20 mb-2 text-[#a89e8e]" />
				<p class="text-sm text-[#a89e8e]/70 font-mono">No price history yet</p>
			</div>
		{/if}

		<!-- Key data -->
		{#if data.statistics}
			<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm overflow-hidden">
				<div class="flex justify-between px-4 py-2.5 border-b border-[#dfceb0]/10">
					<span class="text-xs text-[#a89e8e] font-mono">LOWEST</span>
					<span class="text-sm font-bold text-green-400 font-mono">${data.statistics.lowestPrice.toLocaleString()}</span>
				</div>
				<div class="flex justify-between px-4 py-2.5 border-b border-[#dfceb0]/10">
					<span class="text-xs text-[#a89e8e] font-mono">HIGHEST</span>
					<span class="text-sm font-bold text-red-400 font-mono">${data.statistics.highestPrice.toLocaleString()}</span>
				</div>
				<div class="flex justify-between px-4 py-2.5 border-b border-[#dfceb0]/10">
					<span class="text-xs text-[#a89e8e] font-mono">AVERAGE</span>
					<span class="text-sm font-bold text-[#fff7e8] font-mono">${data.statistics.currentAvgPrice.toLocaleString()}</span>
				</div>
				<div class="flex justify-between px-4 py-2.5">
					<span class="text-xs text-[#a89e8e] font-mono">ACTIVE LISTINGS</span>
					<span class="text-sm font-bold text-[#fff7e8] font-mono">{data.statistics.activeListings}</span>
				</div>
			</div>
		{/if}

		<!-- Trade -->
		<div class="bg-[#14283f]/85 border border-[#dfceb0]/15 rounded-sm overflow-hidden">
			<div class="flex border-b border-[#dfceb0]/15">
				<button
					class="flex-1 py-3 text-sm font-bold font-mono uppercase tracking-wide transition-colors border-b-2 {activeTab ===
					'buy'
						? 'text-green-400 border-green-400'
						: 'text-[#a89e8e] border-transparent hover:text-[#d9ccb7]'}"
					onclick={() => (activeTab = "buy")}
				>
					Buy
				</button>
				<button
					class="flex-1 py-3 text-sm font-bold font-mono uppercase tracking-wide transition-colors border-b-2 {activeTab ===
					'sell'
						? 'text-[#f7c56b] border-[#f7c56b]'
						: 'text-[#a89e8e] border-transparent hover:text-[#d9ccb7]'}"
					onclick={() => (activeTab = "sell")}
				>
					Sell
				</button>
			</div>

			<div class="p-4 sm:p-5">
				{#if activeTab === "buy"}
					{#if data.otherListings.length === 0}
						<div class="text-center py-8">
							<FluentShoppingCart20Filled class="size-10 mx-auto opacity-15 mb-3 text-[#a89e8e]" />
							<p class="text-[#a89e8e] font-mono font-medium">No other sellers right now</p>
							{#if !data.myListing && data.userItemQuantity > 0}
								<p class="text-xs text-[#a89e8e]/70 font-mono mt-1">Be the first — list yours in the Sell tab.</p>
							{/if}
						</div>
					{:else}
						{@render offerRow(data.otherListings[0], true)}

						{#if data.otherListings.length > 1}
							<button
								class="mt-3 text-xs text-[#a89e8e] hover:text-[#d9ccb7] font-mono underline underline-offset-2"
								onclick={() => (showAllOffers = !showAllOffers)}
							>
								{showAllOffers ? "Hide" : "Show"} {data.otherListings.length - 1} more offer{data.otherListings.length -
									1 !==
								1
									? "s"
									: ""}
							</button>

							{#if showAllOffers}
								<div class="mt-2 space-y-2">
									{#each data.otherListings.slice(1) as listing}
										{@render offerRow(listing, false)}
									{/each}
								</div>
							{/if}
						{/if}
					{/if}
				{:else if data.myListing && !isEditing}
					{@const cmp = priceVsMarket(data.myListing.pricePerUnit)}
					<div class="flex items-center justify-between mb-4">
						<p class="text-xs text-[#a89e8e] font-mono uppercase tracking-wide">Your listing</p>
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
					</div>
					<div class="flex items-center gap-4 sm:gap-6">
						<ResourceIcon name={data.itemName} class="size-10 sm:size-12" />
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
						<div class="flex items-center justify-between mb-1">
							<p class="text-xs text-[#a89e8e] font-mono uppercase tracking-wide">Edit listing</p>
							<button type="button" class={buttonClass({ variant: "secondary", size: "xs" })} onclick={cancelEditing}>
								<FluentDismiss20Filled class="size-3" />
								CANCEL
							</button>
						</div>
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
					<div class="flex items-center gap-3 text-[#f7c56b] py-2">
						<FluentWarning20Filled class="size-5" />
						<div>
							<p class="text-sm font-mono font-bold">Cooldown Active</p>
							<p class="text-xs text-[#f7c56b]/60 font-mono">{cooldownDisplay} before you can list again</p>
						</div>
					</div>
				{:else}
					<div class="text-center py-6">
						<p class="text-sm text-[#a89e8e]/70 font-mono">No {data.itemName} in your inventory to sell.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
