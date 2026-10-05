<!-- src/routes/production/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import Logo from "#lib/component/Logo.svelte";
	import FluentProduction20Filled from "~icons/fluent/production-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentEmojiShoppingCart from "~icons/fluent-emoji/shopping-cart";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";

	let { data } = $props();

	let selectedProduct = $state<keyof typeof data.recipes>("rifles");
	let productionQuantity = $state(1);
	let isCollectingWage = $state(false);
	let showCollectAnim = $state(false);
	let showProductionAnim = $state(false);

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));
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
		const elapsed = Date.now() - new Date(activeProduction.startedAt).getTime();
		return Math.min(100, (elapsed / total) * 100);
	});

	const timeRemaining = $derived.by(() => {
		if (!activeProduction) return "";
		const remaining = new Date(activeProduction.completesAt).getTime() - Date.now();
		if (remaining <= 0) return "Complete!";
		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);

		if (hours > 0) return `${hours}h ${minutes}m`;
		if (minutes > 0) return `${minutes}m ${seconds}s`;
		return `${seconds}s`;
	});

	const jobStatus = $derived.by(() => {
		if (!data.currentJob) return null;
		if (!data.currentJob.lastWorked) return { status: "ready", text: "Ready for shift" };

		const SHIFT_DURATION = 8 * 60 * 60 * 1000;
		const timeSinceWork = Date.now() - new Date(data.currentJob.lastWorked).getTime();

		if (timeSinceWork < SHIFT_DURATION) {
			const remaining = SHIFT_DURATION - timeSinceWork;
			const hours = Math.floor(remaining / 3600000);
			const minutes = Math.floor((remaining % 3600000) / 60000);
			return {
				status: "working",
				text: `${hours}h ${minutes}m remaining`,
				progress: (timeSinceWork / SHIFT_DURATION) * 100
			};
		}

		return { status: "complete", text: "Shift complete!" };
	});

	const betterWageFactory = $derived.by(() => {
		if (!data.currentJob) return null;
		const currentWage = data.currentJob.wage;
		const currentRegion = data.currentJob.regionId;

		// Find factory with higher wage in the same region
		return data.availableFactories.find((f) => f.regionId === currentRegion && f.workerWage > currentWage);
	});

	$effect(() => {
		if (activeProduction) {
			const interval = setInterval(() => {
				if (new Date(activeProduction.completesAt) <= new Date()) {
					window.location.reload();
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	});
</script>

<PageContainer maxWidth="6xl">
	<PageHeader title="Production" icon={FluentProduction20Filled}>
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

	<!-- Stats Overview -->
	<div class="w-full">
		<!-- Balance -->
		<div class="panel-muted rounded-sm p-4 flex items-center gap-3 md:gap-4">
			<div
				class="size-10 md:size-12 rounded-sm bg-[#587252]/18 border border-[#8fae88]/30 flex items-center justify-center shrink-0"
			>
				<FluentMoney20Filled class="size-5 md:size-6 text-[#8fae88]" />
			</div>
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Balance</p>
				<p class="text-xl md:text-2xl font-bold text-[#fff7e8] font-mono">{data.wallet.balance.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<!-- Current Job Status -->
	{#if data.currentJob && jobStatus}
		{#if jobStatus.status === "complete"}
			<div class="panel rounded-sm p-5">
				<div class="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-0 mb-4">
					<a href="/factory/{data.currentJob.factoryId}" class="flex items-center gap-3 group">
						<Logo
							src={data.companyLogoUrl}
							alt={data.currentJob.companyName || "Company logo"}
							class="size-12 md:size-14 rounded-sm object-cover"
							placeholderIcon={FluentImageOff20Filled}
						/>

						<div>
							<h2
								class="text-lg md:text-xl font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors mb-1"
							>
								{data.currentJob.factoryName}
							</h2>
							<p class="text-sm text-[#a89e8e]">{data.currentJob.companyName}</p>
						</div>
					</a>
					<div class="text-left sm:text-right">
						<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Wage</p>
						<p class="text-md font-bold text-[#c6dfbf] flex items-center gap-1 font-mono">
							<FluentMoney20Filled class="size-5 text-[#8fae88]" />
							{data.currentJob.wage.toLocaleString()}
						</p>
					</div>
				</div>

				<form
					method="POST"
					action="?/collectWage"
					use:enhance={() => {
						isCollectingWage = true;
						return async ({ update, result }) => {
							await update();
							isCollectingWage = false;
							if (result.type === "success") showCollectAnim = true;
						};
					}}
				>
					<Button
						type="submit"
						variant="soft-emerald"
						block
						disabled={isCollectingWage}
						icon={FluentCheckmark20Filled}
						class="h-auto min-h-12 py-3"
					>
						{isCollectingWage ? "Collecting payment..." : `${jobStatus.text} Click to collect payment.`}
					</Button>
				</form>
			</div>
		{:else}
			<div class="panel rounded-sm p-5">
				<div class="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-0 mb-4">
					<a href="/factory/{data.currentJob.factoryId}" class="flex items-center gap-3 group">
						<Logo
							src={data.companyLogoUrl}
							alt={data.currentJob.companyName || "Company logo"}
							class="size-12 md:size-14 rounded-sm object-cover"
							placeholderIcon={FluentImageOff20Filled}
						/>

						<div>
							<h2
								class="text-lg md:text-xl font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors mb-1"
							>
								{data.currentJob.factoryName}
							</h2>
							<p class="text-sm text-[#a89e8e]">{data.currentJob.companyName}</p>
						</div>
					</a>
					<div class="text-left sm:text-right">
						<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Wage</p>
						<p class="text-md font-bold text-[#c6dfbf] flex items-center gap-1 font-mono">
							<FluentMoney20Filled class="size-5 text-[#8fae88]" />
							{data.currentJob.wage.toLocaleString()}
						</p>
					</div>
				</div>

				{#if jobStatus.status === "working"}
					<div>
						<div class="flex justify-between items-center mb-2">
							<span class="text-sm font-medium text-[#e5d8c1]">Shift Progress</span>
							<span class="text-sm font-bold text-[#f7c56b] font-mono">{jobStatus.text}</span>
						</div>
						<div class="h-3 bg-[#102239] rounded-full overflow-hidden border border-[#dfceb0]/10">
							<div
								class="h-full bg-[#e6a527] rounded-full transition-all duration-500"
								style="width: {jobStatus.progress}%"
							></div>
						</div>
					</div>
				{:else}
					<form method="POST" action="?/startWork" use:enhance>
						<Button type="submit" variant="soft-blue" block icon={FluentClock20Filled} class="h-auto min-h-12 py-3">
							{jobStatus.text} - Click to start shift
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
		<!-- Inventory Sidebar - Consolidated Resources & Products -->
		<div class="space-y-4 md:space-y-6 order-2 lg:order-1">
			<div class="panel rounded-sm p-5 space-y-4 md:space-y-6">
				<!-- Resources Section -->
				<div>
					<h2 class="section-title mb-3 md:mb-4">
						<FluentBox20Filled class="size-4 text-[#b7a0c5]" />
						Resources
					</h2>

					<div class="space-y-1.5 md:space-y-2">
						{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
							{@const quantity = resourceMap.get(resource) || 0}
							<a
								href="/market/{resource}"
								class="flex items-center justify-between p-2.5 md:p-3 panel-muted rounded-sm hover:border-[#e6a527]/55 transition-colors"
							>
								<div class="flex items-center gap-2">
									<ResourceIcon name={resource} class="size-5 md:size-6" />
									<span class="font-medium capitalize text-[#d9ccb7] text-sm md:text-base">{resource}</span>
								</div>
								<span
									class="px-2 md:px-2.5 py-0.5 md:py-1 rounded-sm border text-xs md:text-sm font-bold font-mono {quantity >
									0
										? 'bg-[#8c709b]/15 border-[#b7a0c5]/30 text-[#d5c4df]'
										: 'bg-[#102239] border-[#dfceb0]/10 text-[#a89e8e]'}"
								>
									{quantity}
								</span>
							</a>
						{/each}
					</div>
				</div>

				<!-- Products Section -->
				<div>
					<h2 class="section-title mb-3 md:mb-4">
						<FluentCube20Filled class="size-4 text-[#8fae88]" />
						Products
					</h2>

					<div class="space-y-1.5 md:space-y-2">
						{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
							{@const quantity = productMap.get(product) || 0}
							<a
								href="/market/{product}"
								class="flex items-center justify-between p-2.5 md:p-3 panel-muted rounded-sm hover:border-[#e6a527]/55 transition-colors"
							>
								<div class="flex items-center gap-2">
									<ResourceIcon name={product} class="size-5 md:size-6" />
									<span class="font-medium capitalize text-[#d9ccb7] text-sm md:text-base">{product}</span>
								</div>
								<span
									class="px-2 md:px-2.5 py-0.5 md:py-1 rounded-sm border text-xs md:text-sm font-bold font-mono {quantity >
									0
										? 'bg-[#587252]/18 border-[#8fae88]/30 text-[#c6dfbf]'
										: 'bg-[#102239] border-[#dfceb0]/10 text-[#a89e8e]'}"
								>
									{quantity}
								</span>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Main Content Area -->
		<div class="lg:col-span-2 space-y-4 md:space-y-6 order-1 lg:order-2">
			<!-- Better Wage Opportunity -->
			{#if betterWageFactory && data.currentJob}
				<a
					href="/region/{data.currentJob.regionId}/factories"
					class="block rounded-sm bg-[#587252]/18 border border-[#8fae88]/30 p-5 hover:border-[#8fae88]/55 hover:bg-[#587252]/28 transition-colors group"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3 md:gap-4 flex-1">
							<div
								class="size-10 md:size-12 rounded-sm bg-[#587252]/25 border border-[#8fae88]/30 flex items-center justify-center shrink-0"
							>
								<FluentFactory20Filled class="size-5 md:size-6 text-[#8fae88]" />
							</div>
							<div>
								<h3 class="text-base md:text-lg font-semibold text-[#fff7e8] mb-1 flex items-center gap-2">
									Better Wage Available!
									<span class="text-[#c6dfbf]">✨</span>
								</h3>
								<p class="text-xs md:text-sm text-[#d9ccb7]">
									Factories in your region are offering up to
									<span class="font-bold text-[#c6dfbf] font-mono"
										>💰{betterWageFactory.workerWage.toLocaleString()}</span
									>
									per day
								</p>
							</div>
						</div>
						<FluentArrowRight20Filled
							class="size-5 md:size-6 text-[#8fae88] group-hover:translate-x-1 transition-transform shrink-0"
						/>
					</div>
				</a>
			{/if}

			<!-- Production Section -->
			{#if activeProduction}
				<div class="rounded-sm bg-[#e6a527]/12 border border-[#e6a527]/35 p-5 space-y-4 md:space-y-5">
					<h2 class="section-title">
						<FluentFactory20Filled class="size-5 text-[#f7c56b]" />
						Production In Progress
					</h2>

					<div class="panel-muted rounded-sm p-4 md:p-5 space-y-4 md:space-y-5">
						<div class="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
							<ResourceIcon name={activeProduction.productType} class="size-12 md:size-14" />
							<div class="flex-1">
								<h3 class="text-xl md:text-2xl font-bold text-[#fff7e8] capitalize mb-1">
									{activeProduction.productType}
								</h3>
								<p class="text-sm md:text-base text-[#a89e8e]">Manufacturing {activeProduction.quantity} units</p>
							</div>
							<div class="text-left sm:text-right w-full sm:w-auto">
								<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Time Left</p>
								<p class="text-2xl md:text-3xl font-bold text-[#f7c56b] font-mono">
									{timeRemaining}
								</p>
							</div>
						</div>

						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="text-xs md:text-sm font-medium text-[#d9ccb7]">Production Progress</span>
								<span class="text-xs md:text-sm font-bold text-[#f7c56b] font-mono"
									>{Math.floor(productionProgress)}%</span
								>
							</div>
							<div class="h-3 md:h-4 bg-[#102239] rounded-full overflow-hidden border border-[#dfceb0]/10">
								<div
									class="h-full bg-[#e6a527] rounded-full transition-all duration-1000"
									style="width: {productionProgress}%"
								></div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/startProduction"
					use:enhance={() => {
						return async ({ update, result }) => {
							await update();
							if (result.type === "success") showProductionAnim = true;
						};
					}}
					class="panel rounded-sm p-5 space-y-4 md:space-y-6"
				>
					<h2 class="section-title">
						<FluentProduction20Filled class="size-5 text-[#f7c56b]" />
						Start Production
					</h2>

					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
						{#each Object.keys(data.recipes) as product}
							<button
								type="button"
								onclick={() => (selectedProduct = product as keyof typeof data.recipes)}
								class="relative p-2.5 md:p-3 rounded-sm border transition-colors duration-200 text-center group
									{selectedProduct === product
									? 'bg-[#e6a527]/12 border-[#e6a527]/55'
									: 'bg-[#102239]/70 border-[#dfceb0]/10 hover:border-[#dfceb0]/25 hover:bg-[#19304b]'}"
							>
								<input
									type="radio"
									name="productType"
									value={product}
									checked={selectedProduct === product}
									class="sr-only"
								/>
								<ResourceIcon name={product} class="size-8 md:size-9 mx-auto mb-1" />
								<div
									class="text-xs font-medium capitalize {selectedProduct === product
										? 'text-[#f7c56b]'
										: 'text-[#a89e8e] group-hover:text-[#d9ccb7]'}"
								>
									{product}
								</div>
							</button>
						{/each}
					</div>

					<!-- Current Stock Display -->
					{#if selectedProduct}
						{@const currentStock = productMap.get(selectedProduct) || 0}
						<div class="panel-muted rounded-sm p-3 md:p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<ResourceIcon name={selectedProduct} class="size-6 md:size-7" />
									<div>
										<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Current Stock</p>
										<p class="text-base md:text-lg font-semibold text-[#fff7e8] capitalize">{selectedProduct}</p>
									</div>
								</div>
								<div class="text-right">
									<span
										class="text-2xl md:text-3xl font-bold font-mono {currentStock > 0
											? 'text-[#c6dfbf]'
											: 'text-[#a89e8e]'}"
									>
										{currentStock}
									</span>
									<p class="text-xs text-[#a89e8e] mt-1">units available</p>
								</div>
							</div>
						</div>
					{/if}

					<div>
						<label for="quantity" class="field-label">
							Batch Size: <span class="text-[#fff7e8] font-bold font-mono">×{productionQuantity}</span>
						</label>
						<div class="relative">
							<input
								type="range"
								id="quantity"
								name="quantity"
								min="1"
								max="10"
								bind:value={productionQuantity}
								class="w-full h-2 bg-[#102239] rounded-full appearance-none cursor-pointer"
								style="background: linear-gradient(to right, rgb(230 165 39) 0%, rgb(230 165 39) {((productionQuantity -
									1) /
									9) *
									100}%, rgb(16 34 57) {((productionQuantity - 1) / 9) * 100}%, rgb(16 34 57) 100%)"
							/>
						</div>
						<div class="flex justify-between text-xs text-[#a89e8e] mt-1 px-1">
							<span>1</span>
							<span>5</span>
							<span>10</span>
						</div>
					</div>

					{#if data.recipes[selectedProduct]}
						{@const recipe = data.recipes[selectedProduct]}
						{@const costs = Object.fromEntries(
							Object.entries(recipe.inputs).map(([resource, amount]) => [resource, amount * productionQuantity])
						)}
						{@const availableResources = Object.fromEntries(Array.from(resourceMap.entries()))}

						<ResourceRequirements {costs} available={availableResources} />

						<div class="flex items-center justify-between p-3 md:p-4 panel-muted rounded-sm">
							<div class="flex items-center gap-2">
								<FluentClock20Filled class="size-4 md:size-5 text-[#a89e8e]" />
								<span class="text-xs md:text-sm text-[#a89e8e]">Production Time</span>
							</div>
							<span class="font-bold text-[#fff7e8] text-base md:text-lg font-mono">
								{Math.floor((recipe.duration * productionQuantity) / 60)} min
							</span>
						</div>
					{/if}

					<Button
						type="submit"
						variant="primary"
						size="lg"
						block
						disabled={!canProduce}
						icon={canProduce ? FluentCheckmark20Filled : FluentWarning20Filled}
					>
						{canProduce ? "Start Production" : "Insufficient Resources"}
					</Button>
				</form>
			{/if}
		</div>
	</div>
</PageContainer>

{#if showCollectAnim}
	<ThreeAnimation variant="collect" onComplete={() => (showCollectAnim = false)} />
{/if}

{#if showProductionAnim}
	<ThreeAnimation variant="production" onComplete={() => (showProductionAnim = false)} />
{/if}
