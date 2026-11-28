<!-- src/routes/(authenticated)/(dock)/market/[item]/+page.svelte -->
<!-- One commodity: a large price chart with time ranges and key stats, the
     order book of asks and your own sell order. -->
<script lang="ts">
	import type { SubmitFunction } from "$app/forms";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { goodLabel } from "#lib/config/index.js";
	import { vanish } from "#lib/utils/motion.js";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-regular";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import PriceChart from "../PriceChart.svelte";
	import RegionTradeDesk from "./RegionTradeDesk.svelte";
	import { buildSeries, changePct, DAY, HOUR, money, type SeriesPoint } from "../series";
	import { dtgShortDate, dtgTime } from "#lib/utils/dtg.js";
	import { bestAsk, offeredQuantity } from "#lib/utils/market-price.js";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, Badge, BackLink } from "#lib/component/ui/index.js";

	let { data } = $props();

	/** Toast the result; on success let `target` glow once. */
	function submitWith(target: () => Element | null | undefined, onSuccess?: () => void): SubmitFunction {
		return () =>
			async ({ result, update }) => {
				submitting = true;
				await update();
				toastResult(result);
				if (result.type === "success") {
					onSuccess?.();
					celebrate(target());
				}
				submitting = false;
			};
	}
	const withToast: SubmitFunction =
		() =>
		async ({ result, update }) => {
			submitting = true;
			await update();
			toastResult(result);
			submitting = false;
		};

	/** One lock for every write on this page; prevents double buys/listings. */
	let submitting = $state(false);

	let buyQuantities = $state<Record<string, number>>({});

	let createQty = $state(1);
	let createPrice = $state(data.statistics?.lowestPrice ?? 1000);

	let isEditing = $state(false);
	let editQty = $state(data.myListing?.quantity ?? 1);
	let editPrice = $state(data.myListing?.pricePerUnit ?? 1000);

	let cooldownTimeRemaining = $state(data.cooldownRemaining);

	let ticketEl = $state<HTMLElement>();
	const rowEls: Record<number, HTMLElement> = $state({});

	const RANGES = {
		"24h": { span: DAY, bucket: HOUR },
		"7d": { span: 7 * DAY, bucket: 4 * HOUR },
		"30d": { span: 30 * DAY, bucket: 12 * HOUR }
	} as const;
	type Range = keyof typeof RANGES;
	let range = $state<Range>("7d");
	let hover = $state<SeriesPoint | null>(null);

	const rangeStart = $derived(data.now - RANGES[range].span);
	const series = $derived(buildSeries(data.candles, data.openingPrice, rangeStart, data.now, RANGES[range].bucket));
	const traded = $derived(series.filter((p) => p.volume > 0));
	const rangeLow = $derived(traded.length ? Math.min(...traded.map((p) => p.low)) : null);
	const rangeHigh = $derived(traded.length ? Math.max(...traded.map((p) => p.high)) : null);
	const rangeVolume = $derived(traded.reduce((s, p) => s + p.volume, 0));
	const rangeChange = $derived(changePct(series));

	const lastTrade = $derived(data.candles.at(-1)?.close ?? data.openingPrice);
	const liveOffers = $derived([
		...(data.myListing ? [data.myListing] : []),
		...(data.bestOffer ? [data.bestOffer] : [])
	]);
	const currentPrice = $derived(bestAsk(liveOffers) ?? lastTrade);
	const shownPrice = $derived(hover?.price ?? currentPrice);

	const clock = (d: Date) => dtgTime(d);
	const weekday = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
	const dayMonth = (d: Date) => dtgShortDate(d);
	const axisTime = $derived((t: number) => {
		const d = new Date(t);
		return range === "24h" ? clock(d) : range === "7d" ? weekday(d) : dayMonth(d);
	});
	const pointTime = $derived((t: number) => {
		const d = new Date(t);
		return range === "24h" ? clock(d) : range === "7d" ? `${weekday(d)} ${clock(d)}` : `${dayMonth(d)} ${clock(d)}`;
	});

	const bestAskPrice = $derived(bestAsk(liveOffers));
	const unitsOnOffer = $derived(offeredQuantity(liveOffers));
	const totalAvailableForListing = $derived(data.userItemQuantity + (data.myListing?.quantity ?? 0));
	const deepest = $derived(Math.max(1, data.bestOffer?.quantity ?? 1));

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
		if (diff < 0) return { label: `$${Math.abs(diff).toLocaleString()} under the low`, cls: "text-positive-fg" };
		if (diff > 0) return { label: `$${diff.toLocaleString()} over the low`, cls: "text-warning" };
		return { label: "At the market low", cls: "text-primary-fg" };
	}
</script>

<svelte:head>
	<title>{goodLabel(data.itemName)} market · PsyOps</title>
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
			<label for={qtyId} class="field-label">Units <span class="font-normal text-fg-muted">max {max}</span></label>
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
					class="join-item h-9 px-2.5 flex items-center border border-line/20 bg-base-200 text-fg-muted text-sm font-mono rounded-sm"
				>
					$
				</span>
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
	<BackLink href="/market" label="Market" class="-ml-3 self-start" />

	{#if data.governedRegions.length}
		<RegionTradeDesk itemName={data.itemName} regions={data.governedRegions} desk={data.regionDesk} />
	{/if}

	<section class="panel rounded-sm overflow-hidden">
		<div class="px-4 pt-4 sm:px-5 sm:pt-5 flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-3 min-w-0">
				<div class="size-12 shrink-0 flex items-center justify-center rounded-sm panel-muted">
					<ResourceIcon name={data.itemName} class="size-7" />
				</div>
				<div class="min-w-0">
					<h1 class="font-sans text-xl sm:text-2xl font-semibold text-fg truncate">{goodLabel(data.itemName)}</h1>
					<p class="text-xs text-fg-muted">
						{data.itemType === "resource" ? "Raw material" : "Goods"} ·
						<span class="font-mono text-fg-soft">{data.userItemQuantity.toLocaleString()}</span> in stock
					</p>
				</div>
			</div>
			<div class="flex rounded-sm bg-white/[0.04] border border-white/10 p-1" role="tablist" aria-label="Time range">
				{#each Object.keys(RANGES) as Range[] as r}
					<button
						type="button"
						role="tab"
						aria-selected={range === r}
						class="tap-target press-spring rounded-xs px-3 py-1 font-mono text-xs font-semibold transition-colors {range ===
						r
							? 'bg-primary text-primary-content'
							: 'text-fg-muted hover:text-fg'}"
						onclick={() => {
							range = r;
							hover = null;
						}}
					>
						{r}
					</button>
				{/each}
			</div>
		</div>

		<div class="px-4 sm:px-5 mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
			{#key shownPrice}
				<p class="animate-tick font-mono text-3xl sm:text-4xl font-bold tabular-nums text-fg">
					{shownPrice !== null ? money(shownPrice) : "—"}
				</p>
			{/key}
			{#if hover}
				<p class="font-mono text-xs text-fg-muted">
					<span>{pointTime(hover.t)}</span>
					{#if hover.volume}
						<span>· {hover.volume.toLocaleString()} {hover.volume === 1 ? "unit" : "units"}</span>
					{/if}
				</p>
			{:else if rangeChange !== null}
				<p
					class="rounded-sm px-2 py-0.5 font-mono text-xs font-semibold tabular-nums {rangeChange >= 0
						? 'bg-success/15 text-positive-fg'
						: 'bg-error/10 text-hostile-fg'}"
				>
					{rangeChange >= 0 ? "▲" : "▼"}
					{Math.abs(rangeChange).toFixed(1)}% <span class="font-sans font-normal opacity-70">{range}</span>
				</p>
			{/if}
		</div>

		<div class="mt-2 px-1 sm:px-2">
			<PriceChart
				points={series}
				start={rangeStart}
				end={data.now}
				height={260}
				reference={bestAskPrice !== null ? { value: bestAskPrice, label: "Ask" } : null}
				formatTime={hover ? pointTime : axisTime}
				bind:active={hover}
			/>
		</div>

		<dl class="grid grid-cols-3 sm:grid-cols-6 gap-y-4 border-t border-white/10 px-2 py-4">
			{#each [{ label: "Last", value: lastTrade !== null ? money(lastTrade) : "—", cls: "text-fg" }, { label: `Low ${range}`, value: rangeLow !== null ? money(rangeLow) : "—", cls: "text-hostile-fg" }, { label: `High ${range}`, value: rangeHigh !== null ? money(rangeHigh) : "—", cls: "text-positive-fg" }, { label: `Volume ${range}`, value: rangeVolume.toLocaleString(), cls: "text-fg" }, { label: "Best ask", value: bestAskPrice !== null ? money(bestAskPrice) : "—", cls: "text-warning" }, { label: "On offer", value: unitsOnOffer.toLocaleString(), cls: "text-fg" }] as cell}
				<div class="px-2 text-center min-w-0">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted truncate">{cell.label}</dt>
					<dd class="font-mono text-sm font-bold tabular-nums truncate {cell.cls}">{cell.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
		<!-- Best offer: the market shows only the cheapest ask, never the rest of the book. -->
		<section class="panel rounded-sm overflow-hidden">
			<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
				<h2 class="section-title">Best offer</h2>
				{#if data.taxRate}
					<span class="text-xs text-warning">+{data.taxRate}% tax</span>
				{/if}
			</div>

			{#if data.bestOffer}
				{@const listing = data.bestOffer}
				{@const buyQty = buyQuantities[listing.id] || 1}
				{@const itemCost = listing.pricePerUnit * buyQty}
				{@const taxAmount = data.taxRate ? Math.floor((itemCost * data.taxRate) / 100) : 0}
				<ol class="divide-y divide-white/[0.06]">
					<li
						out:vanish
						bind:this={rowEls[listing.id]}
						class="relative animate-rise-in px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4"
					>
						<span
							aria-hidden="true"
							class="pointer-events-none absolute inset-y-1 right-0 bg-success/10 transition-[width] duration-500"
							style="width: {Math.max(4, (listing.quantity / deepest) * 100)}%"
						></span>
						<div class="relative flex items-center gap-3 min-w-0 flex-1">
							<div class="w-24 shrink-0">
								<p class="font-mono text-lg font-bold tabular-nums leading-tight text-positive-fg">
									${listing.pricePerUnit.toLocaleString()}
								</p>
								<p class="text-xs text-fg-muted">
									<span class="font-mono">{listing.quantity.toLocaleString()}</span> units
								</p>
							</div>
							<UserLink id={listing.sellerId} name={listing.sellerName} avatar={listing.sellerAvatar} size="sm" />
							<Badge tone="green" size="xs" class="ml-auto sm:ml-0 shrink-0">Best</Badge>
						</div>

						<div class="relative flex items-center gap-2">
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
									class="flex-1 sm:w-24 text-right font-mono text-sm tabular-nums text-fg"
									title={taxAmount ? `incl. $${taxAmount.toLocaleString()} tax` : undefined}
								>
									${(itemCost + taxAmount).toLocaleString()}
								</span>
								<Button type="submit" size="sm" variant="primary" disabled={submitting}>Buy</Button>
							</form>
							{#if data.governmentState}
								<form method="POST" action="?/buyListingAsState" use:enhance={submitWith(() => rowEls[listing.id])}>
									<input type="hidden" name="listingId" value={listing.id} />
									<input type="hidden" name="quantity" value={buyQty} />
									<Button
										type="submit"
										disabled={submitting}
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
				</ol>
			{:else}
				<p class="px-4 py-8 text-center text-sm text-fg-muted">No asks on the board.</p>
			{/if}
		</section>

		<!-- Your sell order ticket -->
		<section bind:this={ticketEl} class="panel rounded-sm overflow-hidden">
			<div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
				<h2 class="section-title">Sell order</h2>
				{#if data.myListing}
					<span class="font-mono text-xs text-fg-muted">No. {String(data.myListing.id).padStart(5, "0")}</span>
				{/if}
			</div>

			<div class="p-4">
				{#if data.myListing && !isEditing}
					{@const cmp = priceVsMarket(data.myListing.pricePerUnit)}
					<dl class="space-y-2 text-sm">
						<div class="flex justify-between gap-3">
							<dt class="text-fg-muted">Units</dt>
							<dd class="font-mono text-fg">{data.myListing.quantity.toLocaleString()}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-fg-muted">Ask</dt>
							<dd class="text-right">
								<span class="font-mono font-bold text-warning">${data.myListing.pricePerUnit.toLocaleString()}</span>
								{#if cmp}<span class="block text-xs {cmp.cls}">{cmp.label}</span>{/if}
							</dd>
						</div>
						<div class="flex justify-between gap-3 pt-2 border-t border-white/10">
							<dt class="text-fg-muted">Value</dt>
							<dd class="font-mono font-bold text-fg">
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
							<Button type="submit" variant="soft-red" size="sm" grow icon={FluentDelete20Filled} disabled={submitting}>Withdraw</Button>
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
						<p class="flex justify-between text-sm pt-2 border-t border-white/10">
							<span class="text-fg-muted">Value</span>
							<span class="font-mono font-bold text-fg">${(editQty * editPrice).toLocaleString()}</span>
						</p>
						<div class="flex gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								grow
								icon={FluentDismiss20Filled}
								onclick={() => (isEditing = false)}
							>
								Cancel
							</Button>
							<Button type="submit" size="sm" grow icon={FluentCheckmark20Filled} disabled={submitting}>Save</Button>
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
						<p class="flex justify-between text-sm pt-2 border-t border-white/10">
							<span class="text-fg-muted">Value</span>
							<span class="font-mono font-bold text-fg">${(createQty * createPrice).toLocaleString()}</span>
						</p>
						<Button
							type="submit"
							size="sm"
							block
							icon={FluentAdd20Filled}
							disabled={submitting || createQty < 1 || createQty > data.userItemQuantity || createPrice < 1}
						>
							Post ask
						</Button>
					</form>
				{:else if cooldownTimeRemaining > 0}
					<p class="flex items-center gap-2 text-sm text-warning">
						<FluentClock20Filled class="size-4 shrink-0" />
						Next order in <span class="font-mono">{cooldownDisplay}</span>
					</p>
				{:else}
					<p class="text-sm text-fg-muted">No {goodLabel(data.itemName)} in stock to sell.</p>
				{/if}
			</div>
		</section>
	</div>
</PageContainer>
