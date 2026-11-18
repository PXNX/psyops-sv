<!-- src/routes/(authenticated)/(dock)/market/[item]/+page.svelte -->
<!-- One commodity on the exchange: the quote board, the order book of asks
     and your own sell order ticket. -->
<script lang="ts">
	import type { SubmitFunction } from "$app/forms";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import MarketChart from "./MarketChart.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, Badge, BackLink } from "#lib/component/ui/index.js";

	let { data } = $props();

	/** Toast the result; on success let `target` glow once. */
	function submitWith(target: () => Element | null | undefined, onSuccess?: () => void): SubmitFunction {
		return () =>
			async ({ result, update }) => {
				await update();
				toastResult(result);
				if (result.type === "success") {
					onSuccess?.();
					celebrate(target());
				}
			};
	}
	const withToast: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
		};

	const OFFERS_SHOWN = 5;
	let showAllOffers = $state(false);
	let buyQuantities = $state<Record<string, number>>({});

	let createQty = $state(1);
	let createPrice = $state(data.statistics?.lowestPrice ?? 1000);

	let isEditing = $state(false);
	let editQty = $state(data.myListing?.quantity ?? 1);
	let editPrice = $state(data.myListing?.pricePerUnit ?? 1000);

	let cooldownTimeRemaining = $state(data.cooldownRemaining);

	let ticketEl = $state<HTMLElement>();
	const rowEls: Record<number, HTMLElement> = {};

	const currentPrice = $derived(
		data.priceHistory.length > 0
			? data.priceHistory[data.priceHistory.length - 1].pricePerUnit
			: (data.statistics?.currentAvgPrice ?? 0)
	);
	const bestAsk = $derived(data.otherListings[0]?.pricePerUnit ?? null);
	const unitsOnOffer = $derived(data.otherListings.reduce((sum, l) => sum + l.quantity, 0));
	const totalAvailableForListing = $derived(data.userItemQuantity + (data.myListing?.quantity ?? 0));
	const visibleOffers = $derived(showAllOffers ? data.otherListings : data.otherListings.slice(0, OFFERS_SHOWN));
	const symbol = $derived(data.itemName.slice(0, 3).toUpperCase());

	const cooldownDisplay = $derived.by(() => {
		if (cooldownTimeRemaining <= 0) return null;
		const minutes = Math.floor(cooldownTimeRemaining / 60000);
		const seconds = Math.floor((cooldownTimeRemaining % 60000) / 1000);
		return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
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

	function priceVsMarket(price: number): { label: string; cls: string } | null {
		const low = data.statistics?.lowestPrice;
		if (!low) return null;
		const diff = price - low;
		if (diff < 0) return { label: `$${Math.abs(diff).toLocaleString()} under the low`, cls: "text-[#aef3c9]" };
		if (diff > 0) return { label: `$${diff.toLocaleString()} over the low`, cls: "text-[#ffcb6b]" };
		return { label: "At the market low", cls: "text-[#c3dbff]" };
	}
</script>

<svelte:head>
	<title>{`${data.itemName.charAt(0).toUpperCase()}${data.itemName.slice(1)} market · PsyOps`}</title>
</svelte:head>

{#snippet qtyPrice(
	qtyId: string,
	priceId: string,
	max: number,
	qty: number,
	setQty: (n: number) => void,
	price: number,
	setPrice: (n: number) => void
)}
	<div class="grid grid-cols-2 gap-3">
		<div class="min-w-0">
			<label for={qtyId} class="field-label">Units <span class="font-normal text-[#8e9abb]">max {max}</span></label>
			<div class="join w-full">
				<input
					type="number"
					id={qtyId}
					name="quantity"
					min="1"
					{max}
					value={qty}
					oninput={(e) => setQty(parseInt(e.currentTarget.value) || 0)}
					class="field-control join-item rounded-sm h-9 flex-1 min-w-0 px-2 text-sm font-mono"
				/>
				<Button type="button" variant="secondary" size="sm" class="join-item h-9" onclick={() => setQty(max)}>
					MAX
				</Button>
			</div>
		</div>
		<div class="min-w-0">
			<label for={priceId} class="field-label">Price / unit</label>
			<div class="join w-full">
				<span
					class="join-item h-9 px-2.5 flex items-center border border-[#8ea6e0]/20 bg-[#131c33] text-[#8e9abb] text-sm font-mono rounded-sm"
					>$</span
				>
				<input
					type="number"
					id={priceId}
					name="pricePerUnit"
					min="1"
					value={price}
					oninput={(e) => setPrice(parseInt(e.currentTarget.value) || 0)}
					class="field-control join-item rounded-sm h-9 flex-1 min-w-0 px-2 text-sm font-mono"
				/>
			</div>
		</div>
	</div>
{/snippet}

<PageContainer maxWidth="5xl">
	<BackLink href="/market" label="Exchange" class="-ml-3 -mb-2 self-start" />

	<!-- Quote board -->
	<header class="panel rounded-sm overflow-hidden">
		<div
			class="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#8ea6e0]/15 bg-[#131c33]/70 text-[10px] uppercase tracking-[0.2em] text-[#8e9abb]"
		>
			<span>Commodity Exchange · {data.itemType === "resource" ? "Raw materials" : "Goods"}</span>
			<span class="font-mono tracking-normal text-[#c2cbe3]">${data.wallet.balance.toLocaleString()}</span>
		</div>
		<div class="p-4 sm:p-5 flex items-center gap-4">
			<div class="size-14 shrink-0 flex items-center justify-center panel-muted rounded-sm animate-pop-in">
				<ResourceIcon name={data.itemName} class="size-8" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span
						class="font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm border border-[#f5a524]/35 bg-[#f5a524]/12 text-[#ffcb6b]"
						>{symbol}</span
					>
					<h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#eef2ff] capitalize truncate">{data.itemName}</h1>
				</div>
				<p class="mt-1 text-xs text-[#8e9abb]">
					<span class="font-mono text-[#c2cbe3]">{unitsOnOffer.toLocaleString()}</span> units on offer ·
					<span class="font-mono text-[#c2cbe3]">{data.userItemQuantity.toLocaleString()}</span> in your stock
				</p>
			</div>
			<div class="text-right shrink-0">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Last</p>
				{#key currentPrice}
					<p class="animate-tick font-mono text-xl sm:text-2xl font-bold text-[#eef2ff] tabular-nums">
						${currentPrice.toLocaleString()}
					</p>
				{/key}
			</div>
		</div>
		{#if data.statistics}
			<dl class="grid grid-cols-2 sm:grid-cols-4 border-t border-[#8ea6e0]/15 text-center">
				{#each [{ label: "Low", value: `$${data.statistics.lowestPrice.toLocaleString()}`, cls: "text-[#aef3c9]" }, { label: "High", value: `$${data.statistics.highestPrice.toLocaleString()}`, cls: "text-red-300" }, { label: "Average", value: `$${data.statistics.currentAvgPrice.toLocaleString()}`, cls: "text-[#eef2ff]" }, { label: "Orders", value: String(data.statistics.activeListings), cls: "text-[#eef2ff]" }] as cell, i}
					<div
						class="px-2 py-2.5 border-[#8ea6e0]/10 {i % 2 === 1 ? 'border-l' : ''} {i >= 2
							? 'border-t sm:border-t-0'
							: ''} {i === 2 ? 'sm:border-l' : ''}"
					>
						<dt class="text-[10px] uppercase tracking-wide text-[#8e9abb]">{cell.label}</dt>
						<dd class="font-mono text-sm font-bold tabular-nums truncate {cell.cls}">{cell.value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	</header>

	{#if data.priceHistory.length > 1}
		<MarketChart priceHistory={data.priceHistory} {currentPrice} />
	{/if}

	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
		<!-- Order book -->
		<section class="panel rounded-sm overflow-hidden">
			<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#8ea6e0]/15">
				<h2 class="section-title">Order book · Asks</h2>
				{#if data.taxRate}
					<span class="text-xs text-[#ffcb6b]">+{data.taxRate}% tax</span>
				{/if}
			</div>

			{#if data.otherListings.length === 0}
				<p class="px-4 py-8 text-center text-sm text-[#8e9abb]">No asks on the board.</p>
			{:else}
				<ol class="divide-y divide-[#8ea6e0]/10">
					{#each visibleOffers as listing, i (listing.id)}
						{@const isBest = i === 0}
						{@const buyQty = buyQuantities[listing.id] || 1}
						{@const itemCost = listing.pricePerUnit * buyQty}
						{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
						<li
							out:vanish
							bind:this={rowEls[listing.id]}
							class="animate-rise-in px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 {isBest
								? 'bg-[#1f9d62]/10'
								: ''}"
							style="--rise-delay: {Math.min(i, 8) * 40}ms"
						>
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<div class="w-24 shrink-0">
									<p
										class="font-mono text-lg font-bold tabular-nums leading-tight {isBest
											? 'text-[#aef3c9]'
											: 'text-[#eef2ff]'}"
									>
										${listing.pricePerUnit.toLocaleString()}
									</p>
									<p class="text-xs text-[#8e9abb]">
										<span class="font-mono">{listing.quantity.toLocaleString()}</span> units
									</p>
								</div>
								<UserLink id={listing.sellerId} name={listing.sellerName} avatar={listing.sellerAvatar} size="sm" />
								{#if isBest}
									<Badge tone="green" size="xs" class="ml-auto sm:ml-0 shrink-0">Best</Badge>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								<form
									method="POST"
									action="?/buyListing"
									use:enhance={submitWith(() => rowEls[listing.id] ?? ticketEl)}
									class="flex items-center gap-2 flex-1 sm:flex-none"
								>
									<input type="hidden" name="listingId" value={listing.id} />
									<input
										type="number"
										name="quantity"
										min="1"
										max={listing.quantity}
										value={buyQty}
										aria-label="Units to buy"
										class="field-control rounded-sm h-9 w-16 px-2 text-sm text-center font-mono"
										oninput={(e) => {
											buyQuantities[listing.id] = parseInt(e.currentTarget.value) || 1;
										}}
									/>
									<span
										class="flex-1 sm:w-24 text-right font-mono text-sm tabular-nums text-[#eef2ff]"
										title={taxAmount ? `incl. $${taxAmount.toLocaleString()} tax` : undefined}
									>
										${(itemCost + taxAmount).toLocaleString()}
									</span>
									<Button type="submit" size="sm" variant={isBest ? "primary" : "secondary"}>Buy</Button>
								</form>
								{#if data.governmentState}
									<form method="POST" action="?/buyListingAsState" use:enhance={submitWith(() => rowEls[listing.id])}>
										<input type="hidden" name="listingId" value={listing.id} />
										<input type="hidden" name="quantity" value={buyQty} />
										<Button
											type="submit"
											size="sm"
											variant="soft-amber"
											icon={FluentBuildingGovernment20Filled}
											title="Buy for {data.governmentState
												.name} (treasury ${data.governmentState.treasuryBalance.toLocaleString()})"
										>
											<span class="sr-only sm:not-sr-only">State</span>
										</Button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
				{#if data.otherListings.length > OFFERS_SHOWN}
					<button
						type="button"
						class="tap-target w-full px-4 py-2.5 border-t border-[#8ea6e0]/10 text-xs text-[#8e9abb] hover:text-[#ffc857] transition-colors"
						onclick={() => (showAllOffers = !showAllOffers)}
					>
						{showAllOffers ? "Show fewer" : `Show ${data.otherListings.length - OFFERS_SHOWN} more asks`}
					</button>
				{/if}
			{/if}
		</section>

		<!-- Your sell order ticket -->
		<section bind:this={ticketEl} class="panel rounded-sm overflow-hidden">
			<div
				class="flex items-center justify-between gap-2 px-4 py-3 border-b border-dashed border-[#8ea6e0]/30 bg-[#131c33]/60"
			>
				<h2 class="section-title">Sell order</h2>
			</div>

			<div class="p-4">
				{#if data.myListing && !isEditing}
					{@const cmp = priceVsMarket(data.myListing.pricePerUnit)}
					<dl class="space-y-2 text-sm">
						<div class="flex justify-between gap-3">
							<dt class="text-[#8e9abb]">Units</dt>
							<dd class="font-mono text-[#eef2ff]">{data.myListing.quantity.toLocaleString()}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-[#8e9abb]">Ask</dt>
							<dd class="text-right">
								<span class="font-mono font-bold text-[#ffcb6b]">${data.myListing.pricePerUnit.toLocaleString()}</span>
								{#if cmp}<span class="block text-xs {cmp.cls}">{cmp.label}</span>{/if}
							</dd>
						</div>
						<div class="flex justify-between gap-3 pt-2 border-t border-[#8ea6e0]/15">
							<dt class="text-[#8e9abb]">Value</dt>
							<dd class="font-mono font-bold text-[#eef2ff]">
								${(data.myListing.quantity * data.myListing.pricePerUnit).toLocaleString()}
							</dd>
						</div>
					</dl>
					<div class="mt-4 flex gap-2">
						<Button variant="secondary" size="sm" grow icon={FluentEdit20Filled} onclick={startEditing}>Amend</Button>
						<form
							method="POST"
							action="?/removeListing"
							use:confirmSubmit={{
								title: "Withdraw this order?",
								body: "Units go back to your stock. You can't list again for an hour.",
								confirmLabel: "Withdraw",
								danger: true
							}}
							use:enhance={withToast}
							class="flex-1 flex"
						>
							<input type="hidden" name="listingId" value={data.myListing.id} />
							<Button type="submit" variant="soft-red" size="sm" grow icon={FluentDelete20Filled}>Withdraw</Button>
						</form>
					</div>
				{:else if data.myListing && isEditing}
					{@const cmp = priceVsMarket(editPrice)}
					<form
						method="POST"
						action="?/updateListing"
						use:enhance={submitWith(
							() => ticketEl,
							() => (isEditing = false)
						)}
						class="space-y-3"
					>
						<input type="hidden" name="listingId" value={data.myListing.id} />
						{@render qtyPrice(
							"edit-qty",
							"edit-price",
							totalAvailableForListing,
							editQty,
							(n) => (editQty = n),
							editPrice,
							(n) => (editPrice = n)
						)}
						{#if cmp}<p class="text-xs {cmp.cls}">{cmp.label}</p>{/if}
						<p class="flex justify-between text-sm pt-2 border-t border-[#8ea6e0]/15">
							<span class="text-[#8e9abb]">Value</span>
							<span class="font-mono font-bold text-[#eef2ff]">${(editQty * editPrice).toLocaleString()}</span>
						</p>
						<div class="flex gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								grow
								icon={FluentDismiss20Filled}
								onclick={() => (isEditing = false)}>Cancel</Button
							>
							<Button type="submit" size="sm" grow icon={FluentCheckmark20Filled}>Save</Button>
						</div>
					</form>
				{:else if data.userItemQuantity > 0 && cooldownTimeRemaining <= 0}
					{@const cmp = priceVsMarket(createPrice)}
					<form method="POST" action="?/createListing" use:enhance={submitWith(() => ticketEl)} class="space-y-3">
						{@render qtyPrice(
							"create-qty",
							"create-price",
							data.userItemQuantity,
							createQty,
							(n) => (createQty = n),
							createPrice,
							(n) => (createPrice = n)
						)}
						{#if cmp}<p class="text-xs {cmp.cls}">{cmp.label}</p>{/if}
						<p class="flex justify-between text-sm pt-2 border-t border-[#8ea6e0]/15">
							<span class="text-[#8e9abb]">Value</span>
							<span class="font-mono font-bold text-[#eef2ff]">${(createQty * createPrice).toLocaleString()}</span>
						</p>
						<Button
							type="submit"
							size="sm"
							block
							icon={FluentAdd20Filled}
							disabled={createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
						>
							Post ask
						</Button>
					</form>
				{:else if cooldownTimeRemaining > 0}
					<p class="flex items-center gap-2 text-sm text-[#ffcb6b]">
						<FluentClock20Filled class="size-4 shrink-0" />
						Next order in <span class="font-mono">{cooldownDisplay}</span>
					</p>
				{:else}
					<p class="text-sm text-[#8e9abb]">No {data.itemName} in stock to sell.</p>
				{/if}
			</div>
		</section>
	</div>
</PageContainer>
