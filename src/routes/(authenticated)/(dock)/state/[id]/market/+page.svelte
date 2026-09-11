<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentCart20Filled from "~icons/fluent/cart-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";

	let { data, form } = $props();

	type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";

	let tradeMode = $state<"buy" | "sell">("buy");
	let selectedResource = $state<ResourceType>("iron");
	let tradeQuantity = $state(1);
	let tradePrice = $state(1000);

	const resourceInfo: Record<ResourceType, { icon: string; color: string }> = {
		iron: { icon: "⛏️", color: "slate" },
		copper: { icon: "🔶", color: "orange" },
		steel: { icon: "⚙️", color: "blue" },
		gunpowder: { icon: "💥", color: "red" },
		wood: { icon: "🪵", color: "amber" },
		coal: { icon: "🪨", color: "gray" }
	};

	const allResources: ResourceType[] = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));

	const availableQuantity = $derived(
		tradeMode === "sell" ? resourceMap.get(selectedResource) || 0 : Infinity
	);

	const currentMarketPrice = $derived(
		data.marketPrices[selectedResource] || 1000
	);

	const totalCost = $derived(tradeQuantity * tradePrice);

	const canTrade = $derived.by(() => {
		if (!data.canTrade || tradeQuantity < 1) return false;
		if (tradeMode === "buy") return data.treasury.balance >= totalCost;
		return availableQuantity >= tradeQuantity;
	});

	$effect(() => {
		tradePrice = currentMarketPrice;
	});

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
	<title>{data.state.name} - Government Market</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div>
		<a href="/state/{data.state.id}/economy" class="text-sm text-[#c7bda9] hover:text-[#f7c56b] transition-colors">
			{data.state.name} — Economy
		</a>
		<h1 class="text-3xl font-bold text-[#fff7e8] flex items-center gap-3 mt-1">
			<FluentCart20Filled class="size-8 text-[#e6a527]" />
			Government Market
		</h1>
		<p class="text-sm text-[#c7bda9] mt-1">Buy and sell resources on behalf of the state</p>
	</div>

	{#if !data.canTrade}
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-5">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-5 text-[#f7c56b] flex-shrink-0 mt-0.5" />
				<div>
					<h3 class="font-semibold text-[#f7c56b] mb-1">Access Restricted</h3>
					<p class="text-sm text-[#ffe2a4]/80">
						Only the president or minister of economics can trade on behalf of the state.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm p-4">
			<div class="flex items-start gap-3">
				<FluentCheckmark20Filled class="size-5 text-[#8fae88] flex-shrink-0 mt-0.5" />
				<p class="text-[#c6dfbf] font-medium">{form.message}</p>
			</div>
		</div>
	{:else if form?.message}
		<div class="bg-red-600/10 border border-red-500/20 rounded-sm p-4">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0 mt-0.5" />
				<p class="text-red-300 font-medium">{form.message}</p>
			</div>
		</div>
	{/if}

	<!-- Treasury Banner -->
	<div class="bg-[#587252]/18 rounded-sm border border-[#8fae88]/30 p-5">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div class="size-12 bg-[#587252]/25 rounded-sm flex items-center justify-center">
					<FluentMoney20Filled class="size-6 text-[#c6dfbf]" />
				</div>
				<div>
					<p class="text-sm text-[#c6dfbf] font-medium">State Treasury</p>
					<p class="text-3xl font-bold text-[#fff7e8]">{formatCurrency(data.treasury.balance)}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Inventory Sidebar -->
		<div class="space-y-4">
			<div class="panel rounded-sm p-5 space-y-3">
				<div class="flex items-center gap-2">
					<FluentBox20Filled class="size-5 text-[#d5c4df]" />
					<h2 class="text-lg font-semibold text-[#fff7e8]">State Stockpile</h2>
				</div>

				<div class="space-y-2">
					{#each allResources as resource}
						{@const quantity = resourceMap.get(resource) || 0}
						{@const isSelected = selectedResource === resource}
						<button
							type="button"
							onclick={() => { selectedResource = resource; }}
							class="w-full flex items-center justify-between p-3 rounded-lg border transition-all
								{isSelected
									? 'bg-[#8c709b]/20 border-[#b7a0c5]/30 ring-1 ring-[#b7a0c5]/20'
									: 'bg-[#102239]/70 border-[#dfceb0]/10 hover:bg-[#19304b] hover:border-[#dfceb0]/20'}"
						>
							<div class="flex items-center gap-3">
								<span class="text-xl">{resourceInfo[resource].icon}</span>
								<span class="font-medium capitalize {isSelected ? 'text-[#d5c4df]' : 'text-[#d9ccb7]'}">{resource}</span>
							</div>
							<span
								class="text-sm font-bold tabular-nums {quantity > 0
									? isSelected ? 'text-[#d5c4df]' : 'text-[#e5d8c1]'
									: 'text-[#a89e8e]'}"
							>
								{quantity}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Market Prices -->
			<div class="panel rounded-sm p-5 space-y-3">
				<div class="flex items-center gap-2">
					<FluentInfo20Filled class="size-5 text-[#b7d0e6]" />
					<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider">Market Prices</h2>
				</div>

				<div class="space-y-1.5">
					{#each allResources as resource}
						<div class="flex items-center justify-between text-sm py-1">
							<span class="flex items-center gap-2 text-[#c7bda9]">
								<span class="text-base">{resourceInfo[resource].icon}</span>
								<span class="capitalize">{resource}</span>
							</span>
							<span class="font-medium text-[#d9ccb7] tabular-nums">{formatCurrency(data.marketPrices[resource] || 0)}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Trading Area -->
		<div class="lg:col-span-2">
			<form
				method="POST"
				action="?/{tradeMode === 'buy' ? 'buyResource' : 'sellResource'}"
				use:enhance
				class="panel rounded-sm p-6 space-y-6"
			>
				<!-- Trade Mode -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FluentCart20Filled class="size-5 text-[#d5c4df]" />
						<h2 class="text-lg font-semibold text-[#fff7e8]">Trade Resources</h2>
					</div>
					<div class="join">
						<button
							type="button"
							class="btn btn-sm join-item {tradeMode === 'buy'
								? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
								: 'bg-[#102239]/70 text-[#a89e8e] border-[#dfceb0]/10 hover:text-[#d9ccb7]'}"
							onclick={() => { tradeMode = "buy"; }}
							disabled={!data.canTrade}
						>
							Buy
						</button>
						<button
							type="button"
							class="btn btn-sm join-item {tradeMode === 'sell'
								? 'bg-[#315d8d] hover:bg-[#3d6ea3] text-white border-[#315d8d]'
								: 'bg-[#102239]/70 text-[#a89e8e] border-[#dfceb0]/10 hover:text-[#d9ccb7]'}"
							onclick={() => { tradeMode = "sell"; }}
							disabled={!data.canTrade}
						>
							Sell
						</button>
					</div>
				</div>

				<input type="hidden" name="resourceName" value={selectedResource} />

				<!-- Selected Resource Display -->
				<div class="panel-muted rounded-sm p-5">
					<div class="flex items-center gap-4">
						<div class="size-14 bg-[#14283f] rounded-sm flex items-center justify-center">
							<span class="text-3xl">{resourceInfo[selectedResource].icon}</span>
						</div>
						<div class="flex-1">
							<h3 class="text-xl font-bold text-[#fff7e8] capitalize">{selectedResource}</h3>
							<div class="flex items-center gap-4 mt-1">
								<span class="text-sm text-[#a89e8e]">
									In stock: <span class="font-semibold text-[#e5d8c1]">{resourceMap.get(selectedResource) || 0}</span>
								</span>
								<span class="text-sm text-[#a89e8e]">
									Market price: <span class="font-semibold text-[#e5d8c1]">{formatCurrency(currentMarketPrice)}</span>
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Quantity & Price -->
				<div class="grid sm:grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="quantity" class="block text-sm font-medium text-[#e5d8c1]">
							Quantity
							{#if tradeMode === "sell"}
								<span class="text-[#a89e8e] text-xs ml-1">(max {availableQuantity})</span>
							{/if}
						</label>
						<div class="join w-full">
							<input
								type="number"
								id="quantity"
								name="quantity"
								min="1"
								max={tradeMode === "sell" ? availableQuantity : undefined}
								bind:value={tradeQuantity}
								class="input join-item flex-1 field-control"
								disabled={!data.canTrade}
							/>
							{#if tradeMode === "sell" && availableQuantity > 0}
								<button
									type="button"
									class="btn join-item bg-[#14283f] hover:bg-[#19304b] border-[#dfceb0]/25 text-[#d9ccb7] text-xs"
									onclick={() => { tradeQuantity = availableQuantity; }}
									disabled={!data.canTrade}
								>
									Max
								</button>
							{/if}
						</div>
					</div>

					<div class="space-y-2">
						<label for="pricePerUnit" class="block text-sm font-medium text-[#e5d8c1]">
							Price per unit
						</label>
						<div class="join w-full">
							<span class="join-item btn bg-[#0d1d31] border-[#dfceb0]/20 text-[#a89e8e] pointer-events-none">$</span>
							<input
								type="number"
								id="pricePerUnit"
								name="pricePerUnit"
								min="1"
								step="1"
								bind:value={tradePrice}
								class="input join-item flex-1 field-control"
								disabled={!data.canTrade}
							/>
						</div>
					</div>
				</div>

				<!-- Order Summary -->
				<div class="panel-muted rounded-sm p-5 space-y-3">
					<h4 class="text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">Order Summary</h4>

					<div class="space-y-2">
						<div class="flex justify-between text-sm">
							<span class="text-[#a89e8e]">Resource</span>
							<span class="font-medium text-[#fff7e8] flex items-center gap-1.5">
								<span>{resourceInfo[selectedResource].icon}</span>
								<span class="capitalize">{selectedResource}</span>
							</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-[#a89e8e]">{tradeQuantity} × {formatCurrency(tradePrice)}</span>
							<span class="font-medium text-[#fff7e8]">{formatCurrency(totalCost)}</span>
						</div>
					</div>

					<div class="border-t border-[#dfceb0]/15 pt-3">
						<div class="flex justify-between items-center">
							<span class="font-semibold text-[#d9ccb7]">Total {tradeMode === "buy" ? "Cost" : "Revenue"}</span>
							<span class="text-2xl font-bold {tradeMode === 'buy' ? 'text-red-400' : 'text-[#8fae88]'}">
								{tradeMode === "buy" ? "-" : "+"}{formatCurrency(totalCost)}
							</span>
						</div>
					</div>

					{#if tradeMode === "buy" && data.treasury.balance < totalCost}
						<div class="bg-red-600/10 border border-red-500/20 rounded-sm p-3 flex items-center gap-2">
							<FluentWarning20Filled class="size-4 text-red-400 flex-shrink-0" />
							<p class="text-xs text-red-300">
								Insufficient funds — need {formatCurrency(totalCost - data.treasury.balance)} more
							</p>
						</div>
					{/if}

					{#if tradeMode === "sell" && availableQuantity < tradeQuantity}
						<div class="bg-red-600/10 border border-red-500/20 rounded-sm p-3 flex items-center gap-2">
							<FluentWarning20Filled class="size-4 text-red-400 flex-shrink-0" />
							<p class="text-xs text-red-300">
								Only {availableQuantity} units available to sell
							</p>
						</div>
					{/if}
				</div>

				<!-- Submit -->
				<button
					type="submit"
					disabled={!canTrade}
					class="btn w-full border-0 text-white gap-2 disabled:opacity-40
						{tradeMode === 'buy'
							? 'bg-emerald-600 hover:bg-emerald-500'
							: 'bg-[#315d8d] hover:bg-[#3d6ea3]'}"
				>
					{#if canTrade}
						<FluentCheckmark20Filled class="size-5" />
						{tradeMode === "buy" ? "Buy" : "Sell"}
						{tradeQuantity}
						{selectedResource}
						for {formatCurrency(totalCost)}
					{:else if !data.canTrade}
						<FluentWarning20Filled class="size-5" />
						Access Denied
					{:else}
						<FluentWarning20Filled class="size-5" />
						{tradeMode === "buy" ? "Insufficient Funds" : "Insufficient Stock"}
					{/if}
				</button>
			</form>
		</div>
	</div>

	<!-- Info Box -->
	<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-5">
		<div class="flex items-start gap-3">
			<FluentInfo20Filled class="size-5 text-[#b7d0e6] flex-shrink-0 mt-0.5" />
			<div>
				<h3 class="font-semibold text-[#b7d0e6] mb-2">About the Government Market</h3>
				<ul class="text-sm text-[#b7d0e6]/80 space-y-1">
					<li>• Buy resources from the market to build state stockpiles</li>
					<li>• Sell surplus resources to generate treasury revenue</li>
					<li>• All transactions are recorded in the government budget</li>
					<li>• Only the president or minister of economics can authorize trades</li>
				</ul>
			</div>
		</div>
	</div>
</div>
