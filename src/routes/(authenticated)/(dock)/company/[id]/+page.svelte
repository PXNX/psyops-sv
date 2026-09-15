<!-- src/routes/company/[id]/+page.svelte -->
<script lang="ts">
	import { getRegionName, formatDate } from "$lib/utils/formatting";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentBoxCheckmark20Filled from "~icons/fluent/box-checkmark-20-filled";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentArrowDownload20Filled from "~icons/fluent/arrow-download-20-filled";

	import { enhance } from "$app/forms";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { Area, Bars } from "layerchart";
	import { scaleBand } from "d3-scale";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import { buttonClass, badgeClass } from "$lib/component/ui/styles";

	let { data, form } = $props();

	let depositAmount = $state(10000);
	let isCollecting = $state(false);
	let isDepositing = $state(false);
	let isSettingHq = $state(false);

	let ipoPrice = $state(1000);
	let isGoingPublic = $state(false);

	let listQuantity = $state(1);
	let listPrice = $state(data.shares?.ipoPrice ?? 100);
	let isListing = $state(false);

	let buyQuantities = $state<Record<number, number>>({});
	let isBuying = $state<Record<number, boolean>>({});

	// Prepare chart data
	const productionChartData = data.resourceProduction.map((resource) => ({
		name: resource.type,
		pending: resource.pendingTotal,
		rate: resource.productionRate,
		workers: resource.totalWorkers,
		factories: resource.factoryCount
	}));

	// Budget history data (simulated for demonstration)
	const budgetTrendData = [
		{ date: "Week 1", balance: Math.max(0, data.budget.balance - 50000) },
		{ date: "Week 2", balance: Math.max(0, data.budget.balance - 30000) },
		{ date: "Week 3", balance: Math.max(0, data.budget.balance - 10000) },
		{ date: "Week 4", balance: data.budget.balance }
	];

	// Color palette for charts
	const resourceColors = {
		iron: "#94a3b8",
		copper: "#fb923c",
		steel: "#64748b",
		gunpowder: "#ef4444",
		wood: "#78716c",
		coal: "#0f172a",
		rifles: "#3b82f6",
		ammunition: "#eab308",
		artillery: "#dc2626",
		vehicles: "#8b5cf6",
		explosives: "#f97316"
	};

	const getColor = (resourceType: string) => resourceColors[resourceType as keyof typeof resourceColors] || "#6366f1";
</script>

<PageContainer maxWidth="5xl">
	<!-- Company Header -->
	<div class="relative">
		<div
			class="panel w-full rounded-sm p-8 flex flex-col items-center relative overflow-hidden border border-[#dfceb0]/15 shadow-2xl"
		>
			<div
				class="absolute inset-0 opacity-5"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.2) 35px, rgba(255,255,255,0.2) 70px);"
			></div>

			{#if data.isOwner}
				<a
					href="/company/{data.company.id}/edit"
					class="absolute top-3 right-3 z-20 p-2 bg-black/30 hover:bg-black/50 border border-[#dfceb0]/25 hover:border-[#dfceb0]/40 rounded-lg text-[#d9ccb7] hover:text-[#fff7e8] transition-all backdrop-blur-sm"
					title="Edit Company"
					aria-label="Edit Company"
				>
					<FluentEdit20Filled class="size-4" />
				</a>
			{/if}

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<Logo
					src={data.company.logo}
					alt={data.company.name}
					placeholderIcon={FluentBuilding20Filled}
					class="size-24 rounded-2xl"
				/>

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-[#fff7e8] tracking-tight">{data.company.name}</h1>
					<p class="text-xs text-[#a89e8e] flex items-center justify-center gap-1.5">
						<FluentCalendar20Filled class="size-3.5" />
						Founded {formatDate(data.company.foundedAt)}
					</p>
					{#if data.company.description}
						<p class="text-sm text-[#c7bda9] max-w-md mt-2">{data.company.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Owner & Headquarters -->
	<section class="grid sm:grid-cols-2 gap-3">
		<div class="panel-muted rounded-sm p-3">
			<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1 mb-2">Owner</h2>
			<ProfileItem
				href="/user/{data.company.ownerId}"
				logo={data.company.ownerLogo}
				logoAlt={data.company.ownerName ?? "Owner"}
				placeholderIcon={FluentPeople20Filled}
				placeholderGradient="from-[#e6a527]/20 to-[#e6a527]/10"
				title={data.company.ownerName || data.company.ownerEmail}
				subtitle="Company Owner"
				hoverColor="yellow"
				partyAbbreviation={data.company.ownerPartyAbbreviation}
				partyColor={data.company.ownerPartyColor}
			/>
		</div>

		<div class="panel-muted rounded-sm p-3 space-y-2">
			<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1">Headquarters</h2>
			{#if data.company.stateName}
				<ProfileItem
					href="/state/{data.company.stateId}"
					placeholderIcon={FluentHome20Filled}
					placeholderGradient="from-[#315d8d]/20 to-[#315d8d]/10"
					title={data.company.stateName}
					subtitle={data.company.regionName ?? "Region"}
					hoverColor="blue"
				/>
			{:else}
				<p class="text-sm text-[#a89e8e] px-2 py-1">Not headquartered anywhere yet.</p>
			{/if}

			{#if data.isOwner}
				{#if data.residenceRegion && data.residenceRegion.id !== data.company.regionId}
					<form
						method="POST"
						action="?/setHeadquarters"
						use:enhance={() => {
							isSettingHq = true;
							return async ({ update }) => {
								await update();
								isSettingHq = false;
							};
						}}
					>
						<button
							type="submit"
							disabled={isSettingHq}
							class={buttonClass({ variant: "soft-blue", size: "sm", block: true, class: "gap-2" })}
						>
							<FluentHome20Filled class="size-4" />
							{isSettingHq ? "Updating…" : `Headquarter in ${data.residenceRegion.name}`}
						</button>
					</form>
				{:else if !data.residenceRegion}
					<p class="text-xs text-[#a89e8e] px-2">Establish a residence to headquarter your company there.</p>
				{/if}
			{/if}
		</div>
	</section>

	<!-- Embargo Warning -->
	{#if data.embargoReason}
		<div class="bg-red-900/20 border border-red-500/30 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-6 text-red-400 shrink-0" />
			<p class="text-sm text-red-300">{data.embargoReason}</p>
		</div>
	{/if}

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm p-4 flex items-center gap-3">
			<FluentBoxCheckmark20Filled class="size-5 text-[#c6dfbf] shrink-0" />
			<p class="text-sm text-[#c6dfbf]">{form.message || "Operation successful!"}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-900/20 border border-red-500/30 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 shrink-0" />
			<p class="text-sm text-red-300">{form.error}</p>
		</div>
	{/if}

	<!-- Statistics Grid -->
	<section class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<div class="bg-[#8c709b]/15 rounded-sm border border-[#b7a0c5]/25 p-5">
			<div class="flex items-center gap-2 mb-1">
				<FluentFactory20Filled class="size-5 text-[#d5c4df]" />
				<p class="text-sm text-[#d5c4df] font-medium">Factories</p>
			</div>
			<p class="text-4xl font-bold text-[#fff7e8]">{data.factories.length}</p>
		</div>

		<div class="bg-[#315d8d]/15 rounded-sm border border-[#7ba0c8]/25 p-5">
			<div class="flex items-center gap-2 mb-1">
				<FluentPeople20Filled class="size-5 text-[#b7d0e6]" />
				<p class="text-sm text-[#b7d0e6] font-medium">Workers</p>
			</div>
			<p class="text-4xl font-bold text-[#fff7e8]">{data.totalWorkers}</p>
		</div>

		<div class="bg-[#e6a527]/12 rounded-sm border border-[#e6a527]/30 p-5">
			<div class="flex items-center gap-2 mb-1">
				<FluentMoney20Filled class="size-5 text-[#f7c56b]" />
				<p class="text-sm text-[#f7c56b] font-medium">Wage / Shift</p>
			</div>
			<p class="text-3xl font-bold text-[#fff7e8]">{data.totalWageCost.toLocaleString()}</p>
		</div>

		{#if data.isOwner}
			<div class="bg-[#587252]/18 rounded-sm border border-[#8fae88]/25 p-5">
				<div class="flex items-center gap-2 mb-1">
					<FluentWallet20Filled class="size-5 text-[#c6dfbf]" />
					<p class="text-sm text-[#c6dfbf] font-medium">Budget</p>
				</div>
				<p class="text-3xl font-bold text-[#fff7e8]">{data.budget.balance.toLocaleString()}</p>
			</div>
		{/if}
	</section>

	<!-- Stock Market -->
	<section class="panel rounded-sm p-5 sm:p-6 space-y-4">
		<h2 class="section-title">
			<FluentChartMultiple20Filled class="size-5 text-[#e6a527]" />
			Stock Market
		</h2>

		{#if !data.shares}
			{#if data.isOwner}
				<p class="text-sm text-[#a89e8e]">
					Take {data.company.name} public to issue {data.ipoConfig.totalShares.toLocaleString()} shares. You'll keep a locked
					{data.ipoConfig.founderLockedPercent}% controlling block; the rest lists immediately at your starting price.
				</p>
				<form
					method="POST"
					action="?/goPublic"
					use:enhance={() => {
						isGoingPublic = true;
						return async ({ update }) => {
							await update();
							isGoingPublic = false;
						};
					}}
					class="flex flex-col sm:flex-row gap-3 sm:items-end"
				>
					<div class="flex-1">
						<label class="field-label" for="startingPrice">Starting share price</label>
						<input
							id="startingPrice"
							type="number"
							name="startingPrice"
							bind:value={ipoPrice}
							min={data.ipoConfig.minPrice}
							class="field-control rounded-lg px-3 py-2 w-full"
							required
						/>
					</div>
					<button type="submit" disabled={isGoingPublic} class={buttonClass({ variant: "primary" })}>
						{isGoingPublic ? "Going public…" : "Take Company Public"}
					</button>
				</form>
			{:else}
				<p class="text-sm text-[#a89e8e]">This company hasn't gone public yet.</p>
			{/if}
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div class="panel-muted rounded-sm p-3">
					<div class="field-hint">Total shares</div>
					<div class="text-lg font-bold text-[#fff7e8]">{data.shares.totalShares.toLocaleString()}</div>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<div class="field-hint">Founder locked</div>
					<div class="text-lg font-bold text-[#fff7e8]">{data.shares.founderLockedShares.toLocaleString()}</div>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<div class="field-hint">IPO price</div>
					<div class="text-lg font-bold text-[#f7c56b]">${data.shares.ipoPrice.toLocaleString()}</div>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<div class="field-hint">Your holding</div>
					<div class="text-lg font-bold text-[#c6dfbf]">{data.myHolding.toLocaleString()}</div>
				</div>
			</div>

			{#if data.topHolders.length > 0}
				<div>
					<h3 class="text-sm font-semibold text-[#e5d8c1] mb-2">Top Holders</h3>
					<div class="space-y-1.5">
						{#each data.topHolders as holder}
							<div class="flex items-center justify-between text-sm panel-muted rounded-lg px-3 py-2">
								<span class="text-[#d9ccb7]">{holder.name || "Unknown"}</span>
								<span class="flex items-center gap-2">
									<span class="text-[#a89e8e]">{holder.quantity.toLocaleString()}</span>
									<span class={badgeClass({ tone: "amber", size: "xs" })}>{holder.percent}%</span>
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div>
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-semibold text-[#e5d8c1]">Order Book</h3>
					<span class="field-hint">{data.floatOutstanding.toLocaleString()} shares listed</span>
				</div>

				{#if data.embargoReason}
					<p class="text-xs text-red-300 mb-2">Buying is blocked by the embargo above.</p>
				{/if}

				{#if data.listings.length > 0}
					<div class="space-y-1.5">
						{#each data.listings as listing (listing.id)}
							<div class="flex items-center justify-between gap-3 panel-muted rounded-lg px-3 py-2 text-sm">
								<div class="min-w-0">
									<div class="text-[#fff7e8] font-semibold">${listing.pricePerUnit.toLocaleString()} / share</div>
									<div class="text-xs text-[#a89e8e] truncate">
										{listing.quantity.toLocaleString()} available · {listing.isMine
											? "You"
											: listing.sellerName || "Unknown"}
									</div>
								</div>

								{#if listing.isMine}
									<form method="POST" action="?/removeShareListing" use:enhance>
										<input type="hidden" name="listingId" value={listing.id} />
										<button type="submit" class={buttonClass({ variant: "subtle", size: "sm" })}>Cancel</button>
									</form>
								{:else}
									<form
										method="POST"
										action="?/buyShareListing"
										use:enhance={() => {
											isBuying[listing.id] = true;
											return async ({ update }) => {
												await update();
												isBuying[listing.id] = false;
											};
										}}
										class="flex items-center gap-2 shrink-0"
									>
										<input type="hidden" name="listingId" value={listing.id} />
										<input
											type="number"
											name="quantity"
											bind:value={buyQuantities[listing.id]}
											min="1"
											max={listing.quantity}
											placeholder="Qty"
											class="field-control rounded-lg px-2 py-1 w-20 text-sm"
											required
											disabled={!!data.embargoReason}
										/>
										<button
											type="submit"
											disabled={isBuying[listing.id] || !!data.embargoReason}
											class={buttonClass({ variant: "primary", size: "sm" })}
										>
											Buy
										</button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-[#a89e8e]">No shares currently listed for sale.</p>
				{/if}
			</div>

			{#if data.myHolding > 0}
				<div class="panel-muted rounded-sm p-4">
					<h3 class="text-sm font-semibold text-[#e5d8c1] mb-3">List Shares For Sale</h3>
					<form
						method="POST"
						action="?/createShareListing"
						use:enhance={() => {
							isListing = true;
							return async ({ update }) => {
								await update();
								isListing = false;
							};
						}}
						class="flex flex-col sm:flex-row gap-3 sm:items-end"
					>
						<div>
							<label class="field-label" for="listQuantity">Quantity</label>
							<input
								id="listQuantity"
								type="number"
								name="quantity"
								bind:value={listQuantity}
								min="1"
								max={data.myHolding}
								class="field-control rounded-lg px-3 py-2 w-28"
								required
							/>
						</div>
						<div>
							<label class="field-label" for="listPrice">Price / share</label>
							<input
								id="listPrice"
								type="number"
								name="pricePerUnit"
								bind:value={listPrice}
								min={data.ipoConfig.minPrice}
								class="field-control rounded-lg px-3 py-2 w-28"
								required
							/>
						</div>
						<button type="submit" disabled={isListing} class={buttonClass({ variant: "secondary" })}>
							{isListing ? "Listing…" : "List Shares"}
						</button>
					</form>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Production Analytics -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
			<!-- Production by Resource Type -->
			<div class="panel rounded-sm p-4 sm:p-6 space-y-3">
				<h3 class="section-title text-base sm:text-lg">
					<FluentChartMultiple20Filled class="size-5 text-[#e6a527]" />
					Production by Type
				</h3>

				{#if productionChartData.length > 0}
					<div class="h-48 sm:h-64">
						<Chart
							data={productionChartData}
							x="name"
							xScale={scaleBand().padding(0.3)}
							y="pending"
							yDomain={[0, null]}
							yNice
							padding={{ left: 16, bottom: 24, top: 8 }}
						>
							<Svg>
								<Bars
									radius={8}
									strokeWidth={2}
									class="fill-[#e6a527]/80 stroke-[#e6a527] hover:fill-[#e6a527] transition-all"
								/>
							</Svg>
							<Tooltip.Root let:data>
								<Tooltip.Header>
									<span class="capitalize">{data.name}</span>
								</Tooltip.Header>
								<Tooltip.List>
									<Tooltip.Item
										label="Pending"
										value={data.pending.toLocaleString()}
										valueClass="text-success font-bold"
									/>
									<Tooltip.Item label="Rate/Shift" value={data.rate.toLocaleString()} />
									<Tooltip.Item label="Workers" value={data.workers} />
									<Tooltip.Item label="Factories" value={data.factories} />
								</Tooltip.List>
							</Tooltip.Root>
						</Chart>
					</div>
				{/if}
			</div>

			<!-- Budget Trend -->
			<div class="panel rounded-sm p-4 sm:p-6 space-y-3">
				<h3 class="section-title text-base sm:text-lg">
					<FluentWallet20Filled class="size-5 text-[#c6dfbf]" />
					Budget Overview
				</h3>

				<div class="h-48 sm:h-64">
					<Chart
						data={budgetTrendData}
						x="date"
						xScale={scaleBand().padding(0.1)}
						y="balance"
						yDomain={[0, null]}
						yNice
						padding={{ left: 16, bottom: 24, top: 8 }}
					>
						<Svg>
							<Area class="fill-gradient-to-t from-emerald-500/20 to-emerald-500/5" />
							<Area line={{ class: "stroke-emerald-500 stroke-2" }} />
						</Svg>
						<Tooltip.Root let:data>
							<Tooltip.Header>{data.date}</Tooltip.Header>
							<Tooltip.List>
								<Tooltip.Item
									label="Balance"
									value={data.balance.toLocaleString()}
									valueClass="text-emerald-500 font-bold"
								/>
							</Tooltip.List>
						</Tooltip.Root>
					</Chart>
				</div>
			</div>
		</div>
	{/if}

	<!-- Management Section -->
	{#if data.isOwner}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
			<!-- Budget Management -->
			<div class="panel rounded-sm p-4 sm:p-6 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="section-title text-base sm:text-lg">
						<FluentWallet20Filled class="size-5 text-[#c6dfbf]" />
						Company Budget
					</h3>
					<span class="text-[#c6dfbf] font-bold text-base sm:text-lg">{data.budget.balance.toLocaleString()}</span>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="text-center p-2 sm:p-3 panel-muted rounded-sm">
						<div class="text-xs text-[#a89e8e]">Deposited</div>
						<div class="font-bold text-sm sm:text-base text-[#fff7e8]">
							{data.budget.totalDeposited.toLocaleString()}
						</div>
					</div>
					<div class="text-center p-2 sm:p-3 panel-muted rounded-sm">
						<div class="text-xs text-[#a89e8e]">Spent</div>
						<div class="font-bold text-sm sm:text-base text-[#fff7e8]">{data.budget.totalSpent.toLocaleString()}</div>
					</div>
				</div>

				<div class="flex flex-col">
					<div class="text-xs text-[#a89e8e]">Your Wallet</div>
					<div class="font-bold text-[#c6dfbf] flex items-center gap-1.5 sm:text-lg">
						<FluentMoney20Filled class="size-4 sm:size-5" />
						{data.ownerBalance.toLocaleString()}
					</div>
				</div>

				<form
					method="POST"
					action="?/depositBudget"
					use:enhance={() => {
						isDepositing = true;
						return async ({ update }) => {
							await update();
							isDepositing = false;
						};
					}}
					class="space-y-3"
				>
					<div>
						<label class="field-label" for="amount">Deposit Amount</label>
						<input
							id="amount"
							type="number"
							name="amount"
							bind:value={depositAmount}
							min="1"
							max={data.ownerBalance}
							class="field-control rounded-lg px-3 py-2 w-full"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={isDepositing || depositAmount > data.ownerBalance || depositAmount < 1}
						class={buttonClass({ variant: "success", block: true, class: "gap-2" })}
					>
						{#if isDepositing}
							<span class="loading loading-spinner loading-xs"></span>
							Depositing...
						{:else}
							<FluentArrowDownload20Filled class="size-4" />
							Deposit to Budget
						{/if}
					</button>
				</form>
			</div>

			<!-- Resource Collection -->
			<div class="panel rounded-sm p-4 sm:p-6 space-y-4">
				<h3 class="section-title text-base sm:text-lg">
					<FluentBoxCheckmark20Filled class="size-5 text-emerald-400" />
					Collect Resources
				</h3>

				<div class="panel-muted rounded-sm p-4 text-center">
					<div class="text-xs text-[#a89e8e]">Pending</div>
					<div class="text-2xl font-bold text-emerald-400">
						{data.totalPendingResources.toLocaleString()}
					</div>
					<div class="text-xs text-[#a89e8e]">units ready</div>
				</div>

				{#if data.totalPendingResources > 0}
					<form
						method="POST"
						action="?/collectResources"
						use:enhance={() => {
							isCollecting = true;
							return async ({ update }) => {
								await update();
								isCollecting = false;
							};
						}}
					>
						<button
							type="submit"
							disabled={isCollecting}
							class={buttonClass({ variant: "success", block: true, class: "gap-2" })}
						>
							{#if isCollecting}
								<span class="loading loading-spinner loading-sm"></span>
								Collecting...
							{:else}
								<FluentBoxCheckmark20Filled class="size-4" />
								Collect All Resources
							{/if}
						</button>
					</form>
				{:else}
					<div class="panel-muted rounded-sm p-3">
						<span class="text-sm text-[#a89e8e]">No resources ready to collect</span>
					</div>
				{/if}

				{#if data.resourceProduction.some((r) => r.pendingTotal > 0)}
					<p class="text-xs text-[#a89e8e] text-center">See the breakdown per resource below.</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Detailed Production Statistics -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<div class="panel rounded-sm p-4 sm:p-6 space-y-4">
			<h2 class="section-title text-base sm:text-lg">
				<FluentChartMultiple20Filled class="size-5 text-[#e6a527]" />
				Detailed Production Stats
			</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				{#each data.resourceProduction as resource}
					<div class="panel-muted rounded-sm p-3 sm:p-4" style="border-color: {getColor(resource.type)}33">
						<div class="flex items-center justify-between text-xs mb-1">
							<span class="capitalize text-[#a89e8e]">{resource.type}</span>
							<span
								class={badgeClass({ size: "xs", class: "capitalize" })}
								style="background-color: {getColor(resource.type)}22; color: {getColor(
									resource.type
								)}; border-color: {getColor(resource.type)}33"
							>
								{resource.factoryCount}
								{resource.factoryCount === 1 ? "factory" : "factories"}
							</span>
						</div>
						<div class="text-xl sm:text-2xl font-bold" style="color: {getColor(resource.type)}">
							{resource.pendingTotal.toLocaleString()}
						</div>
						<div class="mt-2 space-y-1">
							<div class="flex justify-between text-xs">
								<span class="text-[#a89e8e]">Workers:</span>
								<span class="font-semibold text-[#e5d8c1]">{resource.totalWorkers}</span>
							</div>
							<div class="flex justify-between text-xs">
								<span class="text-[#a89e8e]">Rate/Shift:</span>
								<span class="font-semibold text-[#e5d8c1]">{resource.productionRate.toLocaleString()}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Factories -->
	<div class="panel rounded-sm p-4 sm:p-6 space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="section-title text-base sm:text-lg">
				<FluentFactory20Filled class="size-5 text-[#d5c4df]" />
				Factories
			</h2>
			{#if data.isOwner}
				<a href="/factory/create" class={buttonClass({ variant: "primary", size: "sm", class: "gap-2" })}>
					<FluentAdd20Filled class="size-4" />
					<span class="hidden sm:inline">New Factory</span>
				</a>
			{/if}
		</div>

		{#if data.factories.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
				{#each data.factories as factory}
					<a href="/factory/{factory.id}" class="panel-interactive rounded-sm p-3 sm:p-4 block">
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-bold text-base sm:text-lg text-[#fff7e8]">{factory.name}</h3>
								<p class="text-xs sm:text-sm text-[#a89e8e] capitalize flex items-center gap-1.5 mt-1">
									<span class="w-2 h-2 rounded-full bg-[#e6a527]"></span>
									{factory.factoryType}
								</p>
							</div>
							<span class={badgeClass({ tone: "purple", size: "xs", class: "capitalize" })}>
								{factory.resourceOutput || factory.productOutput}
							</span>
						</div>

						<div class="grid grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-[#dfceb0]/10">
							<div>
								<div class="text-xs text-[#a89e8e]">Location</div>
								<div class="flex items-center gap-2 mt-1">
									<div class="size-5 sm:size-6 rounded overflow-hidden shrink-0">
										<img src="/coats/{factory.regionId}.svg" alt="{getRegionName(factory.regionId)} coat of arms" />
									</div>
									<div>
										<div class="font-medium text-xs sm:text-sm text-[#e5d8c1]">{getRegionName(factory.regionId)}</div>
										<div class="text-xs text-[#a89e8e] hidden sm:block">{factory.stateName}</div>
									</div>
								</div>
							</div>
							<div>
								<div class="text-xs text-[#a89e8e]">Workers</div>
								<div class="font-medium text-sm mt-1 text-[#e5d8c1]">{factory.workerCount} / {factory.maxWorkers}</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-[#dfceb0]/10">
							<div>
								<div class="text-xs text-[#a89e8e]">Wage/Shift</div>
								<div class="font-bold text-emerald-400 flex items-center gap-1 text-sm">
									<FluentMoney20Filled class="size-3" />
									{factory.workerWage.toLocaleString()}
								</div>
							</div>
							<div>
								<div class="text-xs text-[#a89e8e]">Production</div>
								<div class="font-bold text-[#b7d0e6] text-sm">{factory.productionRate}/shift</div>
							</div>
						</div>

						{#if data.isOwner && factory.lastWorked}
							<div class="mt-3 pt-3 border-t border-[#dfceb0]/10 space-y-1">
								<div class="flex items-center justify-between text-xs">
									<span class="flex items-center gap-1.5 text-[#a89e8e]">
										<FluentClock20Filled class="size-3" />
										Last Work
									</span>
									<span class="text-[#e5d8c1]">{formatDate(factory.lastWorked)}</span>
								</div>
								{#if factory.pendingResources > 0}
									<div class="flex items-center justify-between">
										<span class="text-xs text-[#a89e8e]">Ready to collect</span>
										<span class="font-bold text-emerald-400 text-sm">{factory.pendingResources.toLocaleString()}</span>
									</div>
								{/if}
							</div>
						{/if}
					</a>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8 sm:py-12">
				<FluentFactory20Filled class="size-12 sm:size-16 mx-auto text-[#a89e8e]/40 mb-4" />
				<h3 class="text-base sm:text-lg font-semibold text-[#fff7e8] mb-2">No Factories</h3>
				<p class="text-[#a89e8e] text-sm">This company hasn't built any factories yet</p>
			</div>
		{/if}
	</div>

	<!-- Operating Regions -->
	{#if data.uniqueStates.length > 0}
		<div class="panel rounded-sm p-4 sm:p-6 space-y-4">
			<h2 class="section-title text-base sm:text-lg">
				<FluentLocation20Filled class="size-5 text-[#b7d0e6]" />
				Operating Regions
			</h2>

			<div class="space-y-3">
				{#each data.uniqueStates as state}
					{@const stateFactories = data.factories.filter((f) => f.stateId === state.id)}
					{@const stateRegions = [
						...new Set(stateFactories.map((f) => ({ id: f.regionId, name: getRegionName(f.regionId) })))
					]}

					<div class="panel-muted rounded-sm p-3 sm:p-4">
						<div class="flex items-center justify-between mb-3">
							<h3 class="font-semibold text-sm sm:text-base text-[#fff7e8]">{state.name}</h3>
							<span class={badgeClass({ tone: "purple", size: "xs" })}>
								{stateFactories.length}
								{stateFactories.length === 1 ? "factory" : "factories"}
							</span>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each stateRegions as region}
								<span class={badgeClass({ tone: "neutral", size: "xs" })}>{region.name}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</PageContainer>
