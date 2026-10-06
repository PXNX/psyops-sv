<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentChartMultiple20Regular from "~icons/fluent/chart-multiple-20-regular";
	import FluentShoppingCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import MarketChart from "./MarketChart.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, Badge, BackLink } from "#lib/component/ui/index.js";

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
		if (diff < 0) return { label: `$${Math.abs(diff).toLocaleString()} below market low`, cls: "text-[#c6dfbf]" };
		if (diff > 0) return { label: `$${diff.toLocaleString()} above market low`, cls: "text-[#f7c56b]" };
		return { label: "Matches market low", cls: "text-[#b7d0e6]" };
	}
</script>

{#snippet offerRow(listing: (typeof data.otherListings)[number], isBest: boolean)}
	{@const buyQty = buyQuantities[listing.id] || 1}
	{@const itemCost = listing.pricePerUnit * buyQty}
	{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
	{@const totalCost = itemCost + taxAmount}

	<div class="panel-muted rounded-sm {isBest ? 'border-[#8fae88]/30' : ''}">
		<div class="flex flex-wrap items-center gap-3 px-4 py-3">
			<div class="flex-1 min-w-[100px]">
				<div class="flex items-baseline gap-2">
					<span class="text-xl font-bold font-mono {isBest ? 'text-[#c6dfbf]' : 'text-[#fff7e8]'}">
						${listing.pricePerUnit.toLocaleString()}
					</span>
					<span class="text-xs text-[#a89e8e]">per unit</span>
					{#if isBest}
						<Badge tone="green" size="xs">BEST</Badge>
					{/if}
				</div>
				<p class="text-xs text-[#a89e8e] mt-0.5"><span class="font-mono">{listing.quantity}</span> units available</p>
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
						class="field-control join-item rounded-sm h-8 w-16 px-2 text-sm text-center font-mono"
						onchange={(e) => {
							buyQuantities[listing.id] = parseInt(e.currentTarget.value);
						}}
					/>
					<Button type="submit" size="sm" variant={isBest ? "primary" : "secondary"} class="join-item px-3">BUY</Button>
				</div>
			</form>
			{#if data.governmentState}
				<form method="POST" action="?/buyListingAsState" use:enhance>
					<input type="hidden" name="listingId" value={listing.id} />
					<input type="hidden" name="quantity" value={buyQty} />
					<Button
						type="submit"
						size="sm"
						variant="soft-amber"
						class="px-2 gap-1"
						title="Buy for {data.governmentState
							.name} (Treasury: ${data.governmentState.treasuryBalance.toLocaleString()})"
					>
						<span>🏛️</span>
						<span class="hidden sm:inline text-xs">STATE</span>
					</Button>
				</form>
			{/if}
		</div>
	</div>
{/snippet}

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<div class="space-y-2">
		<BackLink href="/market" label="Market" class="-ml-3" />
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-3 min-w-0">
				<div class="size-12 flex-shrink-0 flex items-center justify-center panel-muted rounded-sm">
					<ResourceIcon name={data.itemName} class="size-7" />
				</div>
				<div class="min-w-0">
					<h1 class="text-3xl font-bold text-[#fff7e8] capitalize truncate">
						{data.itemName}
					</h1>
					<p class="text-[#a89e8e] capitalize">
						{data.itemType} · {totalListingCount} listing{totalListingCount !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm px-3 py-2 text-right flex-shrink-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Balance</p>
				<p class="text-sm font-bold text-[#fff7e8] font-mono">${data.wallet.balance.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<!-- Price Chart -->
	{#if data.priceHistory.length > 1}
		<MarketChart priceHistory={data.priceHistory} {currentPrice} />
	{:else if data.priceHistory.length === 0}
		<div class="panel-muted rounded-sm p-6 text-center py-10">
			<FluentChartMultiple20Regular class="size-10 mx-auto opacity-30 mb-2 text-[#a89e8e]" />
			<p class="text-sm text-[#a89e8e]">No price history yet</p>
		</div>
	{/if}

	<!-- Key data -->
	{#if data.statistics}
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Lowest</p>
				<p class="text-sm font-bold text-[#c6dfbf] font-mono">${data.statistics.lowestPrice.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Highest</p>
				<p class="text-sm font-bold text-red-300 font-mono">${data.statistics.highestPrice.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Average</p>
				<p class="text-sm font-bold text-[#fff7e8] font-mono">${data.statistics.currentAvgPrice.toLocaleString()}</p>
			</div>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Active Listings</p>
				<p class="text-sm font-bold text-[#fff7e8] font-mono">{data.statistics.activeListings}</p>
			</div>
		</div>
	{/if}

	<!-- Trade -->
	<div class="panel rounded-sm overflow-hidden">
		<div class="flex border-b border-[#dfceb0]/15">
			<button
				class="flex-1 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 {activeTab ===
				'buy'
					? 'text-[#c6dfbf] border-[#8fae88]'
					: 'text-[#a89e8e] border-transparent hover:text-[#d9ccb7]'}"
				onclick={() => (activeTab = "buy")}
			>
				Buy
			</button>
			<button
				class="flex-1 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 {activeTab ===
				'sell'
					? 'text-[#f7c56b] border-[#e6a527]'
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
						<FluentShoppingCart20Filled class="size-10 mx-auto opacity-30 mb-3 text-[#a89e8e]" />
						<p class="text-[#d9ccb7] font-medium">No other sellers right now</p>
						{#if !data.myListing && data.userItemQuantity > 0}
							<p class="text-xs text-[#a89e8e] mt-1">Be the first — list yours in the Sell tab.</p>
						{/if}
					</div>
				{:else}
					{@render offerRow(data.otherListings[0], true)}

					{#if data.otherListings.length > 1}
						<button
							class="mt-3 text-xs text-[#a89e8e] hover:text-[#f2c463] underline underline-offset-2 transition-colors"
							onclick={() => (showAllOffers = !showAllOffers)}
						>
							{showAllOffers ? "Hide" : "Show"}
							{data.otherListings.length - 1} more offer{data.otherListings.length - 1 !== 1 ? "s" : ""}
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
					<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Your listing</p>
					<div class="flex items-center gap-2">
						<Button variant="secondary" size="xs" icon={FluentEdit20Filled} onclick={startEditing}>EDIT</Button>
						<form method="POST" action="?/removeListing" use:enhance>
							<input type="hidden" name="listingId" value={data.myListing.id} />
							<Button type="submit" variant="soft-red" size="xs" icon={FluentDelete20Filled}>REMOVE</Button>
						</form>
					</div>
				</div>
				<div class="flex items-center gap-4 sm:gap-6">
					<ResourceIcon name={data.itemName} class="size-10 sm:size-12" />
					<div class="flex-1 grid grid-cols-3 gap-4">
						<div>
							<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Quantity</p>
							<p class="text-xl sm:text-2xl font-bold text-[#fff7e8] font-mono">{data.myListing.quantity}</p>
							{#if data.userItemQuantity > 0}
								<p class="text-xs text-[#a89e8e] mt-0.5">+{data.userItemQuantity} in inventory</p>
							{/if}
						</div>
						<div>
							<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Unit Price</p>
							<p class="text-xl sm:text-2xl font-bold text-[#f7c56b] font-mono">
								${data.myListing.pricePerUnit.toLocaleString()}
							</p>
							{#if cmp}
								<p class="text-xs {cmp.cls} mt-0.5">{cmp.label}</p>
							{/if}
						</div>
						<div>
							<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Total Value</p>
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
						<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Edit listing</p>
						<Button type="button" variant="secondary" size="xs" icon={FluentDismiss20Filled} onclick={cancelEditing}>
							CANCEL
						</Button>
					</div>
					<input type="hidden" name="listingId" value={data.myListing.id} />
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="edit-qty" class="field-label">
								Quantity <span class="text-xs font-normal text-[#a89e8e]">max {totalAvailableForListing}</span>
							</label>
							<div class="join w-full">
								<input
									type="number"
									id="edit-qty"
									name="quantity"
									min="1"
									max={totalAvailableForListing}
									bind:value={editQty}
									class="field-control join-item rounded-sm h-8 flex-1 min-w-0 px-3 text-sm font-mono"
								/>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									class="join-item"
									onclick={() => (editQty = totalAvailableForListing)}>MAX</Button
								>
							</div>
						</div>
						<div>
							<label for="edit-price" class="field-label">Price per unit</label>
							<div class="join w-full">
								<span
									class="join-item h-8 px-3 flex items-center border border-[#dfceb0]/20 bg-[#14283f] text-[#a89e8e] text-sm font-mono rounded-sm"
									>$</span
								>
								<input
									type="number"
									id="edit-price"
									name="pricePerUnit"
									min="1"
									bind:value={editPrice}
									class="field-control join-item rounded-sm h-8 flex-1 min-w-0 px-3 text-sm font-mono"
								/>
							</div>
							{#if cmp}
								<p class="text-xs {cmp.cls} mt-1.5">{cmp.label}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between pt-1">
						<p class="text-sm text-[#a89e8e]">
							New total: <span class="text-[#fff7e8] font-bold font-mono"
								>${(editQty * editPrice).toLocaleString()}</span
							>
						</p>
						<Button type="submit" size="sm" icon={FluentCheckmark20Filled}>Save Changes</Button>
					</div>
				</form>
			{:else if data.userItemQuantity > 0 && cooldownTimeRemaining <= 0}
				{@const cmp = priceVsMarket(createPrice)}
				<form method="POST" action="?/createListing" use:enhance class="space-y-4">
					<div class="flex items-center gap-2 text-[#d9ccb7] mb-2">
						<FluentAdd20Filled class="size-4 text-[#f7c56b]" />
						<span class="text-sm">
							List your {data.itemName} for sale —
							<span class="text-[#e5d8c1] font-bold font-mono">{data.userItemQuantity}</span> in inventory
						</span>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="create-qty" class="field-label">
								Quantity <span class="text-xs font-normal text-[#a89e8e]">max {data.userItemQuantity}</span>
							</label>
							<div class="join w-full">
								<input
									type="number"
									id="create-qty"
									name="quantity"
									min="1"
									max={data.userItemQuantity}
									bind:value={createQty}
									class="field-control join-item rounded-sm h-8 flex-1 min-w-0 px-3 text-sm font-mono"
								/>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									class="join-item"
									onclick={() => (createQty = data.userItemQuantity)}>MAX</Button
								>
							</div>
						</div>
						<div>
							<label for="create-price" class="field-label">Price per unit</label>
							<div class="join w-full">
								<span
									class="join-item h-8 px-3 flex items-center border border-[#dfceb0]/20 bg-[#14283f] text-[#a89e8e] text-sm font-mono rounded-sm"
									>$</span
								>
								<input
									type="number"
									id="create-price"
									name="pricePerUnit"
									min="1"
									bind:value={createPrice}
									class="field-control join-item rounded-sm h-8 flex-1 min-w-0 px-3 text-sm font-mono"
								/>
							</div>
							{#if cmp}
								<p class="text-xs {cmp.cls} mt-1.5">{cmp.label}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-between pt-1">
						<p class="text-sm text-[#a89e8e]">
							Total value: <span class="text-[#fff7e8] font-bold font-mono"
								>${(createQty * createPrice).toLocaleString()}</span
							>
						</p>
						<Button
							type="submit"
							size="sm"
							icon={FluentAdd20Filled}
							disabled={createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
						>
							Create Listing
						</Button>
					</div>
				</form>
			{:else if cooldownTimeRemaining > 0}
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3">
					<FluentWarning20Filled class="size-5 shrink-0" />
					<div>
						<p class="text-sm font-bold">Cooldown Active</p>
						<p class="text-xs text-[#f7c56b]/70">
							<span class="font-mono">{cooldownDisplay}</span> before you can list again
						</p>
					</div>
				</div>
			{:else}
				<div class="text-center py-6">
					<p class="text-sm text-[#a89e8e]">No {data.itemName} in your inventory to sell.</p>
				</div>
			{/if}
		</div>
	</div>
</PageContainer>
