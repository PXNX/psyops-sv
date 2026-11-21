<!-- src/routes/production/+page.svelte -->
<!-- The player's workshop: a time card for the factory shift, the production
     line (running batch or the workbench to start one) and the storeroom. -->
<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { dtgTime } from "#lib/utils/dtg.js";
	import Logo from "#lib/component/Logo.svelte";
	import FluentProduction20Filled from "~icons/fluent/production-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentEmojiShoppingCart from "~icons/fluent-emoji/shopping-cart";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	const RAW = ["iron", "copper", "steel", "gunpowder", "wood", "coal"];
	const GOODS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"];
	const SHIFT_DURATION = 8 * 60 * 60 * 1000;

	let selectedProduct = $state<keyof typeof data.recipes>("rifles");
	let productionQuantity = $state(1);
	let isCollectingWage = $state(false);
	let isStarting = $state(false);
	let justPaid = $state(false);
	let now = $state(Date.now());
	let timeCard = $state<HTMLElement>();
	let line = $state<HTMLElement>();

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const resourceMap = $derived(new Map<string, number>(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map<string, number>(data.products.map((p) => [p.productType, p.quantity])));
	const activeProduction = $derived(data.activeProduction[0]);

	const canProduce = $derived.by(() => {
		const recipe = data.recipes[selectedProduct];
		if (!recipe) return false;
		for (const [resource, required] of Object.entries(recipe.inputs)) {
			const available = resourceMap.get(resource) || 0;
			if (available < required * productionQuantity) return false;
		}
		return true;
	});

	const productionProgress = $derived.by(() => {
		if (!activeProduction) return 0;
		const total = new Date(activeProduction.completesAt).getTime() - new Date(activeProduction.startedAt).getTime();
		const elapsed = now - new Date(activeProduction.startedAt).getTime();
		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	});

	const timeRemaining = $derived.by(() => {
		if (!activeProduction) return "";
		const remaining = new Date(activeProduction.completesAt).getTime() - now;
		if (remaining <= 0) return "0s";
		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);
		if (hours > 0) return `${hours}h ${minutes}m`;
		if (minutes > 0) return `${minutes}m ${seconds}s`;
		return `${seconds}s`;
	});

	const jobStatus = $derived.by(() => {
		if (!data.currentJob) return null;
		if (!data.currentJob.lastWorked) return { status: "ready" as const, progress: 0, left: "" };
		const started = new Date(data.currentJob.lastWorked).getTime();
		const since = now - started;
		if (since < SHIFT_DURATION) {
			const remaining = SHIFT_DURATION - since;
			const hours = Math.floor(remaining / 3600000);
			const minutes = Math.floor((remaining % 3600000) / 60000);
			return { status: "working" as const, progress: (since / SHIFT_DURATION) * 100, left: `${hours}h ${minutes}m` };
		}
		return { status: "complete" as const, progress: 100, left: "" };
	});

	const clockIn = $derived(
		data.currentJob?.lastWorked && jobStatus?.status !== "ready" ? new Date(data.currentJob.lastWorked) : null
	);
	const clockOut = $derived(clockIn ? new Date(clockIn.getTime() + SHIFT_DURATION) : null);

	const betterWageFactory = $derived.by(() => {
		if (!data.currentJob) return null;
		const currentWage = data.currentJob.wage;
		const currentRegion = data.currentJob.regionId;
		return data.availableFactories.find((f) => f.regionId === currentRegion && f.workerWage > currentWage);
	});

	function hhmm(d: Date | null) {
		return d ? dtgTime(d) : "--:--";
	}

	// Refresh the page data once the running production finishes, instead of
	// polling every second and reloading the whole app.
	$effect(() => {
		if (!activeProduction) return;
		const msLeft = new Date(activeProduction.completesAt).getTime() - Date.now();
		// A little slack so the server agrees it's done (and no tight loop if not).
		const timer = setTimeout(() => invalidateAll(), Math.max(msLeft, 0) + 1500);
		return () => clearTimeout(timer);
	});
</script>

<PageContainer maxWidth="6xl">
	<PageHeader title="Workshop" documentTitle="Production" icon={FluentProduction20Filled}>
		{#snippet actions()}
			{#if data.userCompany}
				<Button variant="secondary" size="sm" href="/company" icon={FluentBuilding20Filled}>My Company</Button>
			{:else}
				<Button variant="soft-emerald" size="sm" href="/company/create" icon={FluentAdd20Filled}>Create Company</Button>
			{/if}
			<Button variant="secondary" size="sm" href="/market" icon={FluentEmojiShoppingCart}>Market</Button>
			<Button variant="secondary" size="sm" href="/transactions" icon={FluentHistory20Filled}>Transactions</Button>
		{/snippet}
	</PageHeader>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
		<div class="lg:col-span-2 space-y-4 md:space-y-6">
			<!-- Time card -->
			{#if data.currentJob && jobStatus}
				<section bind:this={timeCard} class="panel rounded-sm p-5 relative overflow-hidden">
					<div class="flex items-start justify-between gap-3">
						<a href="/factory/{data.currentJob.factoryId}" class="flex items-center gap-3 group min-w-0">
							<Logo
								src={data.companyLogoUrl}
								alt={data.currentJob.companyName || "Company logo"}
								class="size-11 rounded-sm object-cover shrink-0"
								placeholderIcon={FluentImageOff20Filled}
							/>
							<div class="min-w-0">
								<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Time card</p>
								<h2 class="font-bold text-fg group-hover:text-primary-hover transition-colors truncate">
									{data.currentJob.factoryName}
								</h2>
								<p class="text-xs text-fg-muted truncate">{data.currentJob.companyName}</p>
							</div>
						</a>
						{#if jobStatus.status === "working"}
							<Badge tone="amber">
								<span class="size-1.5 rounded-full bg-primary animate-pulse"></span>
								On shift
							</Badge>
						{:else if jobStatus.status === "complete"}
							<Badge tone="green">Shift done</Badge>
						{:else}
							<Badge tone="blue">Off shift</Badge>
						{/if}
					</div>

					<div
						class="mt-4 grid grid-cols-3 panel-muted rounded-sm font-mono text-center divide-x divide-dashed divide-line/20"
					>
						<div class="py-2.5">
							<p class="text-[10px] uppercase tracking-wide text-fg-muted font-sans">In</p>
							<p class="text-sm sm:text-base text-fg">{hhmm(clockIn)}</p>
						</div>
						<div class="py-2.5">
							<p class="text-[10px] uppercase tracking-wide text-fg-muted font-sans">Out</p>
							<p class="text-sm sm:text-base text-fg">{hhmm(clockOut)}</p>
						</div>
						<div class="py-2.5">
							<p class="text-[10px] uppercase tracking-wide text-fg-muted font-sans">Rate</p>
							<p class="text-sm sm:text-base text-positive-fg">{data.currentJob.wage.toLocaleString()}</p>
						</div>
					</div>

					{#if jobStatus.status === "working"}
						<div class="mt-4">
							<div class="flex justify-between items-center text-xs mb-1.5">
								<span class="text-fg-muted">8h shift</span>
								<span class="font-bold text-primary-fg font-mono">{jobStatus.left} left</span>
							</div>
							<div class="h-2.5 bg-surface-4 rounded-full overflow-hidden border border-line/10">
								<div
									class="h-full bg-primary rounded-full transition-all duration-500"
									style="width: {jobStatus.progress}%"
								></div>
							</div>
						</div>
					{:else if jobStatus.status === "complete"}
						<form
							method="POST"
							action="?/collectWage"
							class="mt-4"
							use:enhance={() => {
								isCollectingWage = true;
								return async ({ update, result }) => {
									await update();
									isCollectingWage = false;
									if (result.type === "success") {
										justPaid = true;
										celebrate(timeCard);
									} else toastResult(result);
								};
							}}
						>
							<Button
								type="submit"
								variant="primary"
								block
								loading={isCollectingWage}
								loadingText="Collecting…"
								icon={FluentMoney20Filled}
							>
								Collect {data.currentJob.wage.toLocaleString()}
							</Button>
						</form>
					{:else}
						<form
							method="POST"
							action="?/startWork"
							class="mt-4"
							use:enhance={() =>
								async ({ update, result }) => {
									await update();
									if (result.type === "success") {
										justPaid = false;
										celebrate(timeCard);
									} else toastResult(result);
								}}
						>
							<Button type="submit" variant="soft-blue" block icon={FluentClock20Filled}>Clock in</Button>
						</form>
					{/if}

					{#if justPaid && jobStatus.status === "ready"}
						<span
							class="animate-stamp pointer-events-none absolute top-4 right-24 border-2 border-positive/70 text-positive-fg rounded-sm px-2 py-0.5 font-serif text-sm font-black uppercase tracking-widest"
							style="--stamp-tilt: -12deg; transform: rotate(-12deg)"
						>
							Paid
						</span>
					{/if}
				</section>

				{#if betterWageFactory}
					<a
						href="/region/{data.currentJob.regionId}"
						class="panel-interactive rounded-sm px-4 py-3 flex items-center gap-3 group"
					>
						<FluentFactory20Filled class="size-5 text-positive shrink-0" />
						<p class="flex-1 text-sm text-fg-soft">
							Hiring nearby at up to
							<span class="font-bold text-positive-fg font-mono">{betterWageFactory.workerWage.toLocaleString()}</span>
						</p>
						<FluentArrowRight20Filled
							class="size-4 text-fg-muted group-hover:text-primary-hover group-hover:translate-x-0.5 transition-all"
						/>
					</a>
				{/if}
			{/if}

			<!-- Production line -->
			{#if activeProduction}
				<section bind:this={line} class="panel rounded-sm p-5">
					<div class="flex items-center justify-between">
						<h2 class="section-title">Production line</h2>
						<Badge tone="amber">Running</Badge>
					</div>

					<div class="mt-4 flex items-center gap-4">
						<div class="panel-muted rounded-sm p-2 shrink-0">
							<ResourceIcon name={activeProduction.productType} class="size-10 sm:size-12" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-lg sm:text-xl font-bold text-fg capitalize truncate">
								{activeProduction.productType}
							</p>
							<p class="text-xs text-fg-muted">Batch of {activeProduction.quantity}</p>
						</div>
						<div class="text-right shrink-0">
							<p class="text-[10px] text-fg-muted uppercase tracking-wide">Ready in</p>
							<p class="text-xl sm:text-2xl font-bold text-primary-fg font-mono">{timeRemaining}</p>
						</div>
					</div>

					<!-- Conveyor -->
					<div class="mt-4">
						<div class="conveyor h-4 rounded-full overflow-hidden border border-line/15 bg-surface-4 relative">
							<div
								class="h-full bg-primary/80 rounded-full transition-all duration-1000"
								style="width: {productionProgress}%"
							></div>
						</div>
						<div class="mt-1 flex justify-between text-xs text-fg-muted font-mono">
							<span>{Math.floor(productionProgress)}%</span>
							<span>{activeProduction.quantity} units</span>
						</div>
					</div>
				</section>
			{:else}
				<form
					bind:this={line}
					method="POST"
					action="?/startProduction"
					use:enhance={() => {
						isStarting = true;
						return async ({ update, result }) => {
							await update();
							isStarting = false;
							if (result.type === "success") celebrate(line);
							else toastResult(result);
						};
					}}
					class="panel rounded-sm p-5 space-y-5"
				>
					<h2 class="section-title">Workbench</h2>

					<fieldset class="grid grid-cols-3 sm:grid-cols-5 gap-2">
						<legend class="sr-only">Product</legend>
						{#each Object.keys(data.recipes) as product}
							{@const selected = selectedProduct === product}
							<label
								class="press-spring cursor-pointer p-2.5 rounded-sm border text-center transition-colors {selected
									? 'bg-primary/12 border-primary/55'
									: 'bg-surface-4/70 border-line/15 hover:border-line/35'}"
							>
								<input
									type="radio"
									name="productType"
									value={product}
									checked={selected}
									onchange={() => (selectedProduct = product as keyof typeof data.recipes)}
									class="sr-only"
								/>
								<ResourceIcon name={product} class="size-8 mx-auto mb-1" />
								<span
									class="block text-xs font-medium capitalize truncate {selected ? 'text-primary-fg' : 'text-fg-muted'}"
								>
									{product}
								</span>
								<span class="block text-[10px] font-mono text-fg-muted">{productMap.get(product) || 0} in stock</span>
							</label>
						{/each}
					</fieldset>

					<div>
						<div class="flex items-center justify-between">
							<label for="quantity" class="field-label">Batches</label>
							<span class="text-sm font-bold text-fg font-mono">×{productionQuantity}</span>
						</div>
						<input
							type="range"
							id="quantity"
							name="quantity"
							min="1"
							max="10"
							bind:value={productionQuantity}
							class="w-full accent-primary cursor-pointer"
						/>
					</div>

					{#if data.recipes[selectedProduct]}
						{@const recipe = data.recipes[selectedProduct]}
						{@const costs = Object.fromEntries(
							Object.entries(recipe.inputs).map(([resource, amount]) => [resource, amount * productionQuantity])
						)}
						{@const availableResources = Object.fromEntries(Array.from(resourceMap.entries()))}

						<ResourceRequirements {costs} available={availableResources} />

						<p class="flex items-center justify-between text-sm">
							<span class="flex items-center gap-1.5 text-fg-muted">
								<FluentClock20Filled class="size-4" /> Takes
							</span>
							<span class="font-bold text-fg font-mono">
								{Math.floor((recipe.duration * productionQuantity) / 60)} min
							</span>
						</p>
					{/if}

					<Button
						type="submit"
						variant="primary"
						size="lg"
						block
						loading={isStarting}
						disabled={!canProduce}
						icon={canProduce ? FluentPlay20Filled : FluentWarning20Filled}
					>
						{canProduce ? "Start the line" : "Not enough materials"}
					</Button>
				</form>
			{/if}
		</div>

		<!-- Storeroom -->
		<aside class="panel rounded-sm p-5 space-y-5">
			<div class="flex items-center justify-between gap-2">
				<h2 class="section-title">Storeroom</h2>
				<span class="text-xs text-fg-muted flex items-center gap-1">
					<FluentMoney20Filled class="size-3.5 text-positive" />
					<span class="font-mono text-positive-fg font-bold">{data.wallet.balance.toLocaleString()}</span>
				</span>
			</div>

			{#each [{ label: "Raw materials", items: RAW, map: resourceMap }, { label: "Goods", items: GOODS, map: productMap }] as shelf}
				<div>
					<p class="text-[10px] text-fg-muted uppercase tracking-wide mb-1.5">{shelf.label}</p>
					<div class="grid grid-cols-3 gap-1.5 pb-1.5 border-b-4 border-[#5a4a2a] shadow-[0_3px_0_rgba(0,0,0,0.45)]">
						{#each shelf.items as item}
							{@const quantity = shelf.map.get(item) || 0}
							<a
								href="/market/{item}"
								title="{item} — market"
								class="panel-muted rounded-sm p-2 flex flex-col items-center gap-0.5 hover:border-primary/55 transition-colors {quantity ===
								0
									? 'opacity-50'
									: ''}"
							>
								<ResourceIcon name={item} class="size-6" />
								<span class="text-[10px] capitalize text-fg-soft truncate max-w-full">{item}</span>
								<span class="text-sm font-bold font-mono {quantity > 0 ? 'text-fg' : 'text-fg-muted'}">{quantity}</span>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</aside>
	</div>
</PageContainer>

<style>
	/* Moving belt stripes under the fill, so a running line looks alive. */
	.conveyor {
		background-image: repeating-linear-gradient(-45deg, rgb(142 166 224 / 0.08) 0 6px, transparent 6px 12px);
		background-size: 17px 17px;
		animation: belt 1.6s linear infinite;
	}
	@keyframes belt {
		to {
			background-position: 17px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.conveyor {
			animation: none;
		}
	}
</style>
