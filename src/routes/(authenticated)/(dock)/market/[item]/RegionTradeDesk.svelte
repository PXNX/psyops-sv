<!-- src/routes/(authenticated)/(dock)/market/[item]/RegionTradeDesk.svelte -->
<!-- "Trade for: Me / Region X". Only governors see it. With a region chosen,
     the governor buys the cheapest offer into the regional stockpile (paid
     from the regional budget) and lists stockpile units for sale (proceeds go
     to the budget). -->
<script lang="ts">
	import type { SubmitFunction } from "$app/forms";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { goodLabel } from "#lib/config/index.js";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import { Button } from "#lib/component/ui/index.js";

	type Offer = { id: number; quantity: number; pricePerUnit: number };
	let {
		itemName,
		regions,
		desk
	}: {
		itemName: string;
		regions: { id: number; name: string }[];
		desk: {
			regionId: number;
			regionName: string;
			balance: number;
			stock: number;
			listing: Offer | null;
			bestOffer: Offer | null;
		} | null;
	} = $props();

	let buyQty = $state(1);
	let sellQty = $state(1);
	let sellPrice = $state(1);
	$effect.pre(() => {
		// Start the ask at the cheapest offer, if there is one.
		if (desk?.bestOffer) sellPrice = desk.bestOffer.pricePerUnit;
	});

	const withToast: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			toastResult(result);
		};

	const buyTotal = $derived(desk?.bestOffer ? desk.bestOffer.pricePerUnit * Math.max(1, buyQty) : 0);
	const tabClass = (active: boolean) =>
		`tap-target inline-flex items-center rounded-sm px-2.5 py-1.5 text-xs font-semibold transition-colors ${
			active ? "bg-primary/20 text-primary-fg" : "text-fg-muted hover:text-fg"
		}`;
</script>

<section class="panel rounded-sm overflow-hidden" data-testid="region-trade-desk">
	<div class="flex flex-wrap items-center gap-2 px-4 py-2.5">
		<span class="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">Trade for</span>
		<nav class="flex flex-wrap gap-1" aria-label="Trade for">
			<a href="/market/{itemName}" class={tabClass(!desk)} aria-current={!desk ? "page" : undefined}>Me</a>
			{#each regions as r (r.id)}
				<a
					href="/market/{itemName}?for={r.id}"
					class={tabClass(desk?.regionId === r.id)}
					aria-current={desk?.regionId === r.id ? "page" : undefined}
				>
					{r.name}
				</a>
			{/each}
		</nav>
	</div>

	{#if desk}
		<div class="border-t border-white/10 p-4 space-y-4">
			<dl class="grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt class="text-xs text-fg-muted">Regional budget</dt>
					<dd class="font-mono font-bold text-fg">${desk.balance.toLocaleString()}</dd>
				</div>
				<div>
					<dt class="text-xs text-fg-muted">{goodLabel(itemName)} in stockpile</dt>
					<dd class="font-mono font-bold text-fg">{desk.stock.toLocaleString()}</dd>
				</div>
			</dl>

			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Buy the cheapest offer into the stockpile -->
				<div class="space-y-2">
					<h3 class="section-title">Buy for {desk.regionName}</h3>
					{#if desk.bestOffer}
						<p class="text-xs text-fg-muted">
							Best offer <span class="font-mono text-fg">${desk.bestOffer.pricePerUnit.toLocaleString()}</span>
							· {desk.bestOffer.quantity.toLocaleString()} units. Paid from the regional budget, no market tax.
						</p>
						<form
							method="POST"
							action="?for={desk.regionId}&/buyListingAsRegion"
							use:enhance={withToast}
							class="flex items-center gap-2"
						>
							<input type="hidden" name="regionId" value={desk.regionId} />
							<input type="hidden" name="listingId" value={desk.bestOffer.id} />
							<input
								type="number"
								name="quantity"
								min="1"
								max={desk.bestOffer.quantity}
								bind:value={buyQty}
								aria-label="Units to buy for the region"
								class="field-control rounded-sm h-9 w-20 px-2 text-sm text-center font-mono"
							/>
							<span class="flex-1 text-right font-mono text-sm tabular-nums">${buyTotal.toLocaleString()}</span>
							<Button type="submit" size="sm" variant="primary" disabled={buyTotal > desk.balance}>Buy</Button>
						</form>
					{:else}
						<p class="text-sm text-fg-muted">No offer the region can buy.</p>
					{/if}
				</div>

				<!-- Sell from the stockpile -->
				<div class="space-y-2">
					<h3 class="section-title">Sell from stockpile</h3>
					{#if desk.listing}
						<p class="text-sm">
							Listed <span class="font-mono">{desk.listing.quantity.toLocaleString()}</span> at
							<span class="font-mono text-warning">${desk.listing.pricePerUnit.toLocaleString()}</span>. Sales pay into
							the regional budget.
						</p>
						<form
							method="POST"
							action="?for={desk.regionId}&/withdrawRegionListing"
							use:confirmSubmit={{
								title: "Withdraw the region's order?",
								body: "Unsold units go back to the regional stockpile.",
								confirmLabel: "Withdraw",
								danger: true
							}}
							use:enhance={withToast}
						>
							<input type="hidden" name="regionId" value={desk.regionId} />
							<input type="hidden" name="listingId" value={desk.listing.id} />
							<Button type="submit" variant="soft-red" size="sm" icon={FluentDelete20Filled}>Withdraw</Button>
						</form>
					{:else if desk.stock > 0}
						<form
							method="POST"
							action="?for={desk.regionId}&/createRegionListing"
							use:enhance={withToast}
							class="space-y-2"
						>
							<input type="hidden" name="regionId" value={desk.regionId} />
							<div class="flex items-center gap-2">
								<label class="flex-1 text-xs text-fg-muted">
									Units
									<input
										type="number"
										name="quantity"
										min="1"
										max={desk.stock}
										bind:value={sellQty}
										class="field-control mt-1 rounded-sm h-9 w-full px-2 text-sm font-mono"
									/>
								</label>
								<label class="flex-1 text-xs text-fg-muted">
									$ per unit
									<input
										type="number"
										name="pricePerUnit"
										min="1"
										bind:value={sellPrice}
										class="field-control mt-1 rounded-sm h-9 w-full px-2 text-sm font-mono"
									/>
								</label>
							</div>
							<Button type="submit" size="sm" variant="secondary" grow>Post region ask</Button>
						</form>
					{:else}
						<p class="text-sm text-fg-muted">No {goodLabel(itemName)} in the regional stockpile.</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>
