<!-- src/routes/company/[id]/+page.svelte -->
<script lang="ts">
	import { getRegionName } from "$lib/utils/formatting";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentBoxCheckmark20Filled from "~icons/fluent/box-checkmark-20-filled";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentArrowDownload20Filled from "~icons/fluent/arrow-download-20-filled";

	import { enhance } from "$app/forms";
	import { Chart, Svg, Tooltip } from "layerchart";
	import { Area, Bars } from "layerchart";
	import { scaleBand, scaleOrdinal } from "d3-scale";
	import Logo from "$lib/component/Logo.svelte";

	let { data, form } = $props();

	let depositAmount = $state(10000);
	let isCollecting = $state(false);
	let isDepositing = $state(false);

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

<div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
	<!-- Company Header -->
	<div class="card bg-base-200 border border-base-300/50 shadow-lg">
		<div class="card-body p-4 sm:p-6">
			<div class="flex flex-col sm:flex-row items-start gap-4">
				<!-- Company Logo -->

				<Logo src={data.company.logo} alt={data.company.name} placeholderIcon={FluentBuilding20Filled} />

				<div class="flex-1 w-full">
					<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
						<div>
							<h1 class="text-2xl sm:text-3xl font-bold text-primary">
								{data.company.name}
							</h1>
							<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-70 mt-2">
								<span class="flex items-center gap-1.5">
									<FluentCalendar20Filled class="w-3.5 h-3.5" />
									Founded {new Date(data.company.foundedAt).toLocaleDateString()}
								</span>
								<a
									href="/user/{data.company.ownerId}"
									class="flex items-center gap-1.5 hover:text-primary transition-colors"
								>
									<span>Owner:</span>
									<div class="avatar">
										<div class="w-4 h-4 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
											{#if data.company.ownerLogo}
												<img src={data.company.ownerLogo} alt="Owner" />
											{:else}
												<div class="bg-primary/20 flex items-center justify-center">
													<span class="text-[8px] font-bold text-primary">
														{(data.company.ownerName || data.company.ownerEmail).charAt(0).toUpperCase()}
													</span>
												</div>
											{/if}
										</div>
									</div>
									<span class="font-medium opacity-100">{data.company.ownerName || data.company.ownerEmail}</span>
								</a>
							</div>
						</div>

						{#if data.isOwner}
							<a href="/company/{data.company.id}/edit" class="btn btn-ghost btn-sm gap-2">
								<FluentEdit20Filled class="w-4 h-4" />
								<span class="hidden sm:inline">Edit</span>
							</a>
						{/if}
					</div>

					{#if data.company.description}
						<div class="alert mt-4 bg-base-300/50 border-base-300">
							<p class="text-xs sm:text-sm">{data.company.description}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="alert alert-success shadow-lg">
			<FluentBoxCheckmark20Filled class="w-5 h-5" />
			<span>{form.message || "Operation successful!"}</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error shadow-lg">
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Statistics Grid -->
	<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
		<!-- Factories -->
		<div class="stats shadow-lg bg-base-200 border border-purple-500/30">
			<div class="stat px-3 py-3 sm:px-4">
				<div class="stat-figure text-purple-500">
					<FluentFactory20Filled class="w-6 h-6 sm:w-8 sm:h-8" />
				</div>
				<div class="stat-title text-xs">Factories</div>
				<div class="stat-value text-xl sm:text-2xl text-purple-500">{data.factories.length}</div>
			</div>
		</div>

		<!-- Workers -->
		<div class="stats shadow-lg bg-base-200 border border-blue-500/30">
			<div class="stat px-3 py-3 sm:px-4">
				<div class="stat-figure text-blue-500">
					<FluentPeople20Filled class="w-6 h-6 sm:w-8 sm:h-8" />
				</div>
				<div class="stat-title text-xs">Workers</div>
				<div class="stat-value text-xl sm:text-2xl text-blue-500">{data.totalWorkers}</div>
			</div>
		</div>

		<!-- States -->
		<div class="stats shadow-lg bg-base-200 border border-green-500/30">
			<div class="stat px-3 py-3 sm:px-4">
				<div class="stat-figure text-green-500">
					<FluentLocation20Filled class="w-6 h-6 sm:w-8 sm:h-8" />
				</div>
				<div class="stat-title text-xs">States</div>
				<div class="stat-value text-xl sm:text-2xl text-green-500">{data.uniqueStates.length}</div>
			</div>
		</div>

		<!-- Wage Cost -->
		<div class="stats shadow-lg bg-base-200 border border-amber-500/30">
			<div class="stat px-3 py-3 sm:px-4">
				<div class="stat-figure text-amber-500">
					<FluentMoney20Filled class="w-6 h-6 sm:w-8 sm:h-8" />
				</div>
				<div class="stat-title text-xs">Wage/Shift</div>
				<div class="stat-value text-lg sm:text-xl text-amber-500">{data.totalWageCost.toLocaleString()}</div>
			</div>
		</div>

		<!-- Budget -->
		{#if data.isOwner}
			<div class="stats shadow-lg bg-base-200 border border-emerald-500/30 col-span-2 lg:col-span-1">
				<div class="stat px-3 py-3 sm:px-4">
					<div class="stat-figure text-emerald-500">
						<FluentWallet20Filled class="w-6 h-6 sm:w-8 sm:h-8" />
					</div>
					<div class="stat-title text-xs">Budget</div>
					<div class="stat-value text-lg sm:text-xl text-emerald-500">{data.budget.balance.toLocaleString()}</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Production Analytics with LayerChart -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
			<!-- Production by Resource Type -->
			<div class="card bg-base-200 border border-base-300/50 shadow-lg">
				<div class="card-body p-4 sm:p-6">
					<h3 class="card-title text-base sm:text-lg flex items-center gap-2">
						<FluentChartMultiple20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
						<span>Production by Type</span>
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
										class="fill-primary/80 stroke-primary hover:fill-primary transition-all"
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
			</div>

			<!-- Budget Trend -->
			<div class="card bg-base-200 border border-base-300/50 shadow-lg">
				<div class="card-body p-4 sm:p-6">
					<h3 class="card-title text-base sm:text-lg flex items-center gap-2">
						<FluentWallet20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
						<span>Budget Overview</span>
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
		</div>
	{/if}

	<!-- Management Section -->
	{#if data.isOwner}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
			<!-- Budget Management -->
			<div class="card bg-base-200 border border-emerald-500/30 shadow-lg">
				<div class="card-body p-4 sm:p-6">
					<h3 class="card-title text-base sm:text-lg">
						<FluentWallet20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
						Company Budget
					</h3>

					<div class="stats bg-base-300/30 mb-4 shadow">
						<div class="stat place-items-center py-2 sm:py-4">
							<div class="stat-title text-xs">Balance</div>
							<div class="stat-value text-xl sm:text-2xl text-emerald-500">{data.budget.balance.toLocaleString()}</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 mb-4">
						<div class="text-center p-2 sm:p-3 bg-base-300/20 rounded-lg">
							<div class="text-xs opacity-60">Deposited</div>
							<div class="font-bold text-sm sm:text-base">{data.budget.totalDeposited.toLocaleString()}</div>
						</div>
						<div class="text-center p-2 sm:p-3 bg-base-300/20 rounded-lg">
							<div class="text-xs opacity-60">Spent</div>
							<div class="font-bold text-sm sm:text-base">{data.budget.totalSpent.toLocaleString()}</div>
						</div>
					</div>

					<div class="flex flex-col">
						<div class="text-xs opacity-80">Your Wallet</div>
						<div class="font-bold text-emerald-300 sm:text-lg">
							<FluentMoney20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
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
					>
						<div class="form-control">
							<label class="label">
								<span class="label-text text-xs">Deposit Amount</span>
							</label>
							<input
								type="number"
								name="amount"
								bind:value={depositAmount}
								min="1"
								max={data.ownerBalance}
								class="input input-sm input-bordered bg-base-200/50"
								required
							/>
						</div>

						<button
							type="submit"
							disabled={isDepositing || depositAmount > data.ownerBalance || depositAmount < 1}
							class="btn btn-sm btn-success w-full mt-3 gap-2"
						>
							{#if isDepositing}
								<span class="loading loading-spinner loading-xs"></span>
								Depositing...
							{:else}
								<FluentArrowDownload20Filled class="w-4 h-4" />
								Deposit to Budget
							{/if}
						</button>
					</form>
				</div>
			</div>

			<!-- Resource Collection -->
			<div class="card bg-base-200 border border-green-500/30 shadow-lg">
				<div class="card-body p-4 sm:p-6">
					<h3 class="card-title text-base sm:text-lg">
						<FluentBoxCheckmark20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-success" />
						Collect Resources
					</h3>

					<div class="stats bg-base-300/30 mb-4 shadow">
						<div class="stat place-items-center py-2 sm:py-4">
							<div class="stat-title text-xs">Pending</div>
							<div class="stat-value text-xl sm:text-2xl text-success">
								{data.totalPendingResources.toLocaleString()}
							</div>
							<div class="stat-desc">units ready</div>
						</div>
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
							<button type="submit" disabled={isCollecting} class="btn btn-success w-full gap-2 mb-4 shadow-lg">
								{#if isCollecting}
									<span class="loading loading-spinner loading-sm"></span>
									Collecting...
								{:else}
									<FluentBoxCheckmark20Filled class="w-4 h-4" />
									Collect All Resources
								{/if}
							</button>
						</form>
					{:else}
						<div class="alert bg-base-300/30 border-base-300">
							<span class="text-sm">No resources ready to collect</span>
						</div>
					{/if}

					{#if data.resourceProduction.some((r) => r.pendingTotal > 0)}
						<div class="divider my-2"></div>
						<div class="space-y-2">
							<h4 class="text-xs font-medium opacity-60 uppercase tracking-wide">Ready to Collect</h4>
							<div class="bg-base-300/30 rounded-lg p-2.5 sm:p-3 space-y-1.5 border border-base-300">
								{#each data.resourceProduction as resource}
									{#if resource.pendingTotal > 0}
										<div class="flex justify-between items-center text-xs sm:text-sm">
											<span class="flex items-center gap-1.5 opacity-80">
												<span class="w-2 h-2 rounded-full" style="background-color: {getColor(resource.type)}"></span>
												<span class="capitalize">{resource.type}</span>
											</span>
											<span class="font-mono font-bold text-sm sm:text-base" style="color: {getColor(resource.type)}">
												{resource.pendingTotal.toLocaleString()}
											</span>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Detailed Production Statistics -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<div class="card bg-base-200 border border-base-300/50 shadow-lg">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-base sm:text-lg">
					<FluentChartMultiple20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
					Detailed Production Stats
				</h2>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
					{#each data.resourceProduction as resource}
						<div class="stats bg-base-300/30 border shadow-lg" style="border-color: {getColor(resource.type)}33">
							<div class="stat p-3 sm:p-4">
								<div class="stat-title capitalize flex items-center justify-between text-xs">
									<span>{resource.type}</span>
									<div
										class="badge badge-sm"
										style="background-color: {getColor(resource.type)}22; color: {getColor(resource.type)}"
									>
										{resource.factoryCount}
										{resource.factoryCount === 1 ? "factory" : "factories"}
									</div>
								</div>
								<div class="stat-value text-xl sm:text-2xl" style="color: {getColor(resource.type)}">
									{resource.pendingTotal.toLocaleString()}
								</div>
								<div class="stat-desc mt-2 space-y-1">
									<div class="flex justify-between text-xs">
										<span>Workers:</span>
										<span class="font-semibold">{resource.totalWorkers}</span>
									</div>
									<div class="flex justify-between text-xs">
										<span>Rate/Shift:</span>
										<span class="font-semibold">{resource.productionRate.toLocaleString()}</span>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Factories -->
	<div class="card bg-base-200 border border-base-300/50 shadow-lg">
		<div class="card-body p-4 sm:p-6">
			<div class="flex items-center justify-between">
				<h2 class="card-title text-base sm:text-lg">
					<FluentFactory20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
					Factories
				</h2>
				{#if data.isOwner}
					<a href="/factory/create" class="btn btn-primary btn-sm gap-2">
						<FluentAdd20Filled class="w-4 h-4" />
						<span class="hidden sm:inline">New Factory</span>
					</a>
				{/if}
			</div>

			{#if data.factories.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
					{#each data.factories as factory}
						<a
							href="/factory/{factory.id}"
							class="card bg-base-300/30 border border-base-300 hover:border-primary/50 transition-all hover:shadow-lg"
						>
							<div class="card-body p-3 sm:p-4">
								<div class="flex items-start justify-between">
									<div>
										<h3 class="font-bold text-base sm:text-lg">{factory.name}</h3>
										<p class="text-xs sm:text-sm opacity-60 capitalize flex items-center gap-1.5 mt-1">
											<span class="w-2 h-2 rounded-full bg-primary"></span>
											{factory.factoryType}
										</p>
									</div>
									<div class="badge badge-primary badge-sm capitalize">
										{factory.resourceOutput || factory.productOutput}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-base-300">
									<div>
										<div class="text-xs opacity-60">Location</div>
										<div class="flex items-center gap-2 mt-1">
											<div class="avatar">
												<div class="w-5 h-5 sm:w-6 sm:h-6 rounded">
													<img
														src="/coats/{factory.regionId}.svg"
														alt="{getRegionName(factory.regionId)} coat of arms"
													/>
												</div>
											</div>
											<div>
												<div class="font-medium text-xs sm:text-sm">{getRegionName(factory.regionId)}</div>
												<div class="text-xs opacity-60 hidden sm:block">{factory.stateName}</div>
											</div>
										</div>
									</div>
									<div>
										<div class="text-xs opacity-60">Workers</div>
										<div class="font-medium text-sm mt-1">{factory.workerCount} / {factory.maxWorkers}</div>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-base-300">
									<div>
										<div class="text-xs opacity-60">Wage/Shift</div>
										<div class="font-bold text-success flex items-center gap-1 text-sm">
											<FluentMoney20Filled class="w-3 h-3" />
											{factory.workerWage.toLocaleString()}
										</div>
									</div>
									<div>
										<div class="text-xs opacity-60">Production</div>
										<div class="font-bold text-info text-sm">{factory.productionRate}/shift</div>
									</div>
								</div>

								{#if data.isOwner && factory.lastWorked}
									<div class="mt-3 pt-3 border-t border-base-300 space-y-1">
										<div class="flex items-center justify-between text-xs">
											<span class="flex items-center gap-1.5 opacity-60">
												<FluentClock20Filled class="w-3 h-3" />
												Last Work
											</span>
											<span>{new Date(factory.lastWorked).toLocaleDateString()}</span>
										</div>
										{#if factory.pendingResources > 0}
											<div class="flex items-center justify-between">
												<span class="text-xs opacity-60">Ready to collect</span>
												<span class="font-bold text-success text-sm">{factory.pendingResources.toLocaleString()}</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 sm:py-12">
					<FluentFactory20Filled class="w-12 h-12 sm:w-16 sm:h-16 mx-auto opacity-30 mb-4" />
					<h3 class="text-base sm:text-lg font-semibold mb-2">No Factories</h3>
					<p class="opacity-60 text-sm">This company hasn't built any factories yet</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Operating Regions -->
	{#if data.uniqueStates.length > 0}
		<div class="card bg-base-200 border border-base-300/50 shadow-lg">
			<div class="card-body p-4 sm:p-6">
				<h2 class="card-title text-base sm:text-lg">
					<FluentLocation20Filled class="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
					Operating Regions
				</h2>

				<div class="space-y-3">
					{#each data.uniqueStates as state}
						{@const stateFactories = data.factories.filter((f) => f.stateId === state.id)}
						{@const stateRegions = [
							...new Set(stateFactories.map((f) => ({ id: f.regionId, name: getRegionName(f.regionId) })))
						]}

						<div class="card bg-base-300/30 border border-base-300">
							<div class="card-body p-3 sm:p-4">
								<div class="flex items-center justify-between mb-3">
									<h3 class="font-semibold text-sm sm:text-base">{state.name}</h3>
									<div class="badge badge-primary badge-sm">
										{stateFactories.length}
										{stateFactories.length === 1 ? "factory" : "factories"}
									</div>
								</div>
								<div class="flex flex-wrap gap-2">
									{#each stateRegions as region}
										<div class="badge badge-ghost badge-sm">{region.name}</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
