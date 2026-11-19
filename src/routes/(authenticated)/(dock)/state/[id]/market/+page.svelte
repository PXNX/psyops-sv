<!-- src/routes/(authenticated)/(dock)/state/[id]/market/+page.svelte -->
<!-- The government's procurement desk: a stockpile ledger and a purchase /
     disposal order the president or economy minister signs. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentSignature20Filled from "~icons/fluent/signature-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";

	let tradeMode = $state<"buy" | "sell">("buy");
	let selectedResource = $state<ResourceType>("iron");
	let tradeQuantity = $state(1);
	let orderEl = $state<HTMLElement>();

	const allResources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const availableQuantity = $derived(tradeMode === "sell" ? resourceMap.get(selectedResource) || 0 : Infinity);
	const currentMarketPrice = $derived(data.marketPrices[selectedResource] || 1000);
	// The market sells at its price and buys back for less.
	const tradePrice = $derived(
		tradeMode === "buy" ? currentMarketPrice : (data.sellPrices[selectedResource] ?? currentMarketPrice)
	);
	const totalCost = $derived(tradeQuantity * tradePrice);

	const shortfall = $derived.by(() => {
		if (tradeQuantity < 1) return "Enter a quantity";
		if (tradeMode === "buy" && data.treasury.balance < totalCost)
			return `Treasury short by ${formatCurrency(totalCost - data.treasury.balance)}`;
		if (tradeMode === "sell" && availableQuantity < tradeQuantity) return `Only ${availableQuantity} in stock`;
		return null;
	});
	const canTrade = $derived(data.canTrade && !shortfall);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<svelte:head>
	<title>{data.state.name} - Procurement · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader
		documentTitle={false}
		title="Procurement Office"
		subtitle={data.state.name}
		icon={FluentBuildingGovernment20Filled}
		backHref="/state/{data.state.id}/economy"
		backLabel="Economy"
	/>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
		<!-- Stockpile ledger -->
		<section class="panel rounded-sm overflow-hidden">
			<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line/15">
				<h2 class="section-title">State stockpile</h2>
				<div class="text-right">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Treasury</p>
					{#key data.treasury.balance}
						<p class="animate-tick font-mono text-sm font-bold text-positive-fg tabular-nums">
							{formatCurrency(data.treasury.balance)}
						</p>
					{/key}
				</div>
			</div>
			<div
				class="grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_4.5rem] gap-2 px-4 py-1.5 text-[10px] uppercase tracking-wide text-fg-muted bg-surface-4/70"
			>
				<span>Item</span>
				<span class="text-right">Held</span>
				<span class="text-right">Buy</span>
				<span class="text-right">Sell</span>
			</div>
			<ul class="divide-y divide-line/10">
				{#each allResources as resource}
					{@const quantity = resourceMap.get(resource) || 0}
					{@const isSelected = selectedResource === resource}
					<li>
						<button
							type="button"
							onclick={() => (selectedResource = resource)}
							aria-pressed={isSelected}
							class="tap-target w-full grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_4.5rem] items-center gap-2 px-4 py-2.5 text-left transition-colors border-l-2 {isSelected
								? 'bg-primary/12 border-primary'
								: 'border-transparent hover:bg-surface-9'}"
						>
							<span class="flex items-center gap-2 min-w-0">
								<ResourceIcon name={resource} class="size-5 shrink-0" />
								<span
									class="capitalize truncate text-sm {isSelected ? 'text-primary-fg font-semibold' : 'text-fg-soft'}"
									>{resource}</span
								>
							</span>
							<span class="text-right font-mono text-sm tabular-nums {quantity > 0 ? 'text-fg' : 'text-fg-muted/60'}"
								>{quantity.toLocaleString()}</span
							>
							<span class="text-right font-mono text-xs tabular-nums text-fg-soft"
								>{formatCurrency(data.marketPrices[resource] || 0)}</span
							>
							<span class="text-right font-mono text-xs tabular-nums text-fg-muted"
								>{formatCurrency(data.sellPrices[resource] ?? 0)}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Order form -->
		<form
			bind:this={orderEl}
			method="POST"
			action="?/{tradeMode === 'buy' ? 'buyResource' : 'sellResource'}"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: false });
					toastResult(result);
					if (result.type === "success") celebrate(orderEl);
				}}
			class="panel rounded-sm overflow-hidden"
		>
			<input type="hidden" name="resourceName" value={selectedResource} />

			<div class="grid grid-cols-2 border-b border-line/15" role="tablist">
				{#each [{ mode: "buy", label: "Purchase order" }, { mode: "sell", label: "Disposal order" }] as tab}
					{@const active = tradeMode === tab.mode}
					<button
						type="button"
						role="tab"
						aria-selected={active}
						disabled={!data.canTrade}
						onclick={() => (tradeMode = tab.mode as "buy" | "sell")}
						class="tap-target py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors disabled:opacity-50 {active
							? tab.mode === 'buy'
								? 'text-positive-fg border-positive'
								: 'text-friendly-fg border-friendly'
							: 'text-fg-muted border-transparent hover:text-fg-soft'}"
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="p-4 sm:p-5 space-y-4">
				<div class="flex items-center gap-3">
					{#key selectedResource}
						<div class="size-12 shrink-0 panel-muted rounded-sm flex items-center justify-center animate-pop-in">
							<ResourceIcon name={selectedResource} class="size-7" />
						</div>
					{/key}
					<div class="min-w-0">
						<p class="text-[10px] uppercase tracking-wide text-fg-muted">
							{tradeMode === "buy" ? "Requisition of" : "Release of"}
						</p>
						<p class="font-serif text-xl font-bold capitalize text-fg">{selectedResource}</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="min-w-0">
						<label for="quantity" class="field-label">
							Units
							{#if tradeMode === "sell"}<span class="font-normal text-fg-muted">max {availableQuantity}</span>{/if}
						</label>
						<div class="join w-full">
							<input
								type="number"
								id="quantity"
								name="quantity"
								min="1"
								max={tradeMode === "sell" ? availableQuantity : undefined}
								bind:value={tradeQuantity}
								class="join-item flex-1 min-w-0 field-control rounded-sm px-3 py-2.5 font-mono"
								disabled={!data.canTrade}
							/>
							{#if tradeMode === "sell" && availableQuantity > 0}
								<Button
									type="button"
									variant="secondary"
									class="join-item text-xs"
									onclick={() => (tradeQuantity = availableQuantity)}
									disabled={!data.canTrade}
								>
									Max
								</Button>
							{/if}
						</div>
					</div>
					<div class="min-w-0">
						<p class="field-label">Unit price</p>
						<p class="field-control rounded-sm px-3 py-2.5 font-mono text-fg truncate">
							{formatCurrency(tradePrice)}
						</p>
						{#if tradeMode === "sell"}<p class="field-hint">70% of market</p>{/if}
					</div>
				</div>

				<dl class="panel-muted rounded-sm p-3 text-sm space-y-1.5">
					<div class="flex justify-between gap-3">
						<dt class="text-fg-muted">{tradeQuantity || 0} × {formatCurrency(tradePrice)}</dt>
						<dd class="font-mono text-fg-soft">{formatCurrency(totalCost)}</dd>
					</div>
					<div class="flex justify-between items-baseline gap-3 pt-1.5 border-t border-line/15">
						<dt class="font-semibold text-fg-soft">
							{tradeMode === "buy" ? "Charged to treasury" : "Paid to treasury"}
						</dt>
						<dd class="font-mono text-xl font-bold {tradeMode === 'buy' ? 'text-red-300' : 'text-positive-fg'}">
							{tradeMode === "buy" ? "−" : "+"}{formatCurrency(totalCost)}
						</dd>
					</div>
				</dl>

				<div class="pt-1">
					<Button
						type="submit"
						variant="primary"
						block
						disabled={!canTrade}
						icon={data.canTrade ? FluentSignature20Filled : FluentLockClosed20Filled}
					>
						{data.canTrade ? "Sign order" : "Signature required"}
					</Button>
					{#if !data.canTrade}
						<p class="field-hint mt-1.5 text-center">Only the president or economy minister can sign.</p>
					{:else if shortfall}
						<p class="field-error mt-1.5 text-center">{shortfall}</p>
					{/if}
				</div>
			</div>
		</form>
	</div>
</PageContainer>
