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

	let { data, form } = $props();

	let depositAmount = $state(10000);
	let isCollecting = $state(false);
	let isDepositing = $state(false);

	// Stat card configuration
	const stats = [
		{
			label: "Factories",
			value: data.factories.length,
			icon: FluentFactory20Filled,
			color: "purple"
		},
		{
			label: "Total Workers",
			value: data.totalWorkers,
			icon: FluentPeople20Filled,
			color: "blue"
		},
		{
			label: "States",
			value: data.uniqueStates.length,
			icon: FluentLocation20Filled,
			color: "green"
		},
		{
			label: "Wage Cost/Shift",
			value: data.totalWageCost.toLocaleString(),
			icon: FluentMoney20Filled,
			color: "amber"
		},
		...(data.isOwner
			? [
					{
						label: "Company Budget",
						value: data.budget.balance.toLocaleString(),
						icon: FluentWallet20Filled,
						color: "emerald"
					}
				]
			: [])
	];

	const colorClasses = {
		purple: "bg-purple-500/10 text-purple-400",
		blue: "bg-blue-500/10 text-blue-400",
		green: "bg-green-500/10 text-green-400",
		amber: "bg-amber-500/10 text-amber-400",
		emerald: "bg-emerald-500/10 text-emerald-400"
	};
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Company Header -->
	<div class="card bg-base-200/50 border border-base-300/50">
		<div class="h-32 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-t-2xl relative">
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-base-200/80"></div>
		</div>

		<div class="card-body -mt-16 relative">
			<div class="flex items-start gap-6">
				<!-- Company Logo -->
				<div class="avatar placeholder">
					<div
						class="w-24 rounded-2xl bg-gradient-to-br from-primary to-secondary ring ring-base-200 ring-offset-base-200 ring-offset-2"
					>
						{#if data.company.logo}
							<img src={data.company.logo} alt={data.company.name} />
						{:else}
							<FluentBuilding20Filled class="w-12 h-12" />
						{/if}
					</div>
				</div>

				<div class="flex-1 mt-8">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h1 class="text-3xl font-bold">{data.company.name}</h1>
							<div class="flex items-center gap-4 text-sm opacity-60 mt-2">
								<span class="flex items-center gap-1.5">
									<FluentCalendar20Filled class="w-4 h-4" />
									Founded {new Date(data.company.foundedAt).toLocaleDateString()}
								</span>
								<a
									href="/user/{data.company.ownerId}"
									class="flex items-center gap-1.5 hover:text-primary transition-colors"
								>
									<span>Owner:</span>
									<span class="font-medium opacity-100">{data.company.ownerName || data.company.ownerEmail}</span>
								</a>
							</div>
						</div>

						{#if data.isOwner}
							<a href="/company/{data.company.id}/edit" class="btn btn-sm btn-ghost gap-2">
								<FluentEdit20Filled class="w-4 h-4" />
								Edit
							</a>
						{/if}
					</div>

					{#if data.company.description}
						<div class="alert mt-4">
							<p class="text-sm">{data.company.description}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="alert alert-success">
			<FluentBoxCheckmark20Filled class="w-5 h-5" />
			<span>{form.message || "Operation successful!"}</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error">
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Company Statistics -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
		{#each stats as stat}
			<div class="stats shadow-sm bg-base-200/50">
				<div class="stat px-4 py-3">
					<div class="stat-figure {colorClasses[stat.color]}">
						<svelte:component this={stat.icon} class="w-8 h-8" />
					</div>
					<div class="stat-title text-xs">{stat.label}</div>
					<div class="stat-value text-2xl">{stat.value}</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Owner-Only: Budget & Resource Management -->
	{#if data.isOwner}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Company Budget -->
			<div class="card bg-base-200/50 border border-base-300/50">
				<div class="card-body">
					<h3 class="card-title text-lg">
						<FluentWallet20Filled class="w-5 h-5 text-emerald-400" />
						Company Budget
					</h3>

					<div class="stats bg-base-300/30 mb-4">
						<div class="stat place-items-center">
							<div class="stat-title text-xs">Balance</div>
							<div class="stat-value text-emerald-400 text-2xl">{data.budget.balance.toLocaleString()}</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 mb-4">
						<div class="text-center p-3 bg-base-300/20 rounded-lg">
							<div class="text-xs opacity-60">Deposited</div>
							<div class="font-bold">{data.budget.totalDeposited.toLocaleString()}</div>
						</div>
						<div class="text-center p-3 bg-base-300/20 rounded-lg">
							<div class="text-xs opacity-60">Spent</div>
							<div class="font-bold">{data.budget.totalSpent.toLocaleString()}</div>
						</div>
					</div>

					<div class="divider my-2"></div>

					<div class="alert alert-info mb-4">
						<div>
							<div class="text-xs opacity-80">Your Wallet</div>
							<div class="font-bold text-lg">{data.ownerBalance.toLocaleString()}</div>
						</div>
					</div>

					<!-- Deposit Form -->
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
								class="input input-sm input-bordered"
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

			<!-- Collect Resources -->
			<div class="card bg-base-200/50 border border-base-300/50">
				<div class="card-body">
					<h3 class="card-title text-lg">
						<FluentBoxCheckmark20Filled class="w-5 h-5 text-success" />
						Collect Resources
					</h3>

					<div class="stats bg-base-300/30 mb-4">
						<div class="stat place-items-center">
							<div class="stat-title text-xs">Pending</div>
							<div class="stat-value text-success text-2xl">{data.totalPendingResources.toLocaleString()}</div>
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
							<button type="submit" disabled={isCollecting} class="btn btn-success w-full gap-2 mb-4">
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
						<div class="alert">
							<span class="text-sm">No resources ready to collect</span>
						</div>
					{/if}

					<!-- Resource Breakdown -->
					{#if data.resourceProduction.some((r) => r.pendingTotal > 0)}
						<div class="divider my-2"></div>
						<div class="space-y-2">
							<div class="text-xs font-semibold opacity-60 uppercase">By Type</div>
							{#each data.resourceProduction as resource}
								{#if resource.pendingTotal > 0}
									<div class="flex items-center justify-between text-sm p-2 bg-base-300/20 rounded">
										<span class="capitalize">{resource.type}</span>
										<span class="font-bold">{resource.pendingTotal.toLocaleString()}</span>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Production Overview -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<div class="card bg-base-200/50 border border-base-300/50">
			<div class="card-body">
				<h2 class="card-title">
					<FluentChartMultiple20Filled class="w-5 h-5 text-primary" />
					Production Overview
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each data.resourceProduction as resource}
						<div class="stats bg-base-300/30 border border-base-300">
							<div class="stat">
								<div class="stat-title capitalize flex items-center justify-between">
									{resource.type}
									<div class="badge badge-primary badge-sm">
										{resource.factoryCount}
										{resource.factoryCount === 1 ? "factory" : "factories"}
									</div>
								</div>
								<div class="stat-value text-2xl text-success">{resource.pendingTotal.toLocaleString()}</div>
								<div class="stat-desc mt-2 space-y-1">
									<div class="flex justify-between">
										<span>Workers:</span>
										<span class="font-semibold">{resource.totalWorkers}</span>
									</div>
									<div class="flex justify-between">
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
	<div class="card bg-base-200/50 border border-base-300/50">
		<div class="card-body">
			<div class="flex items-center justify-between">
				<h2 class="card-title">
					<FluentFactory20Filled class="w-5 h-5 text-primary" />
					Factories
				</h2>
				{#if data.isOwner}
					<a href="/factory/create" class="btn btn-primary btn-sm gap-2">
						<FluentAdd20Filled class="w-4 h-4" />
						New Factory
					</a>
				{/if}
			</div>

			{#if data.factories.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each data.factories as factory}
						<a
							href="/factory/{factory.id}"
							class="card bg-base-300/30 border border-base-300 hover:border-primary/50 transition-all hover:shadow-lg"
						>
							<div class="card-body p-4">
								<div class="flex items-start justify-between">
									<div>
										<h3 class="font-bold text-lg">{factory.name}</h3>
										<p class="text-sm opacity-60 capitalize flex items-center gap-1.5 mt-1">
											<span class="w-2 h-2 rounded-full bg-primary"></span>
											{factory.factoryType}
										</p>
									</div>
									<div class="badge badge-primary capitalize">
										{factory.resourceOutput || factory.productOutput}
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-base-300">
									<div>
										<div class="text-xs opacity-60">Location</div>
										<div class="font-medium">{getRegionName(factory.regionId)}</div>
										<div class="text-xs opacity-60">{factory.stateName}</div>
									</div>
									<div>
										<div class="text-xs opacity-60">Workers</div>
										<div class="font-medium">{factory.workerCount} / {factory.maxWorkers}</div>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-base-300">
									<div>
										<div class="text-xs opacity-60">Wage/Shift</div>
										<div class="font-bold text-success flex items-center gap-1">
											<FluentMoney20Filled class="w-3 h-3" />
											{factory.workerWage.toLocaleString()}
										</div>
									</div>
									<div>
										<div class="text-xs opacity-60">Production</div>
										<div class="font-bold text-info">{factory.productionRate}/shift</div>
									</div>
								</div>

								{#if data.isOwner && factory.lastWorked}
									<div class="mt-3 pt-3 border-t border-base-300 space-y-1">
										<div class="flex items-center justify-between text-xs">
											<span class="flex items-center gap-1.5 opacity-60">
												<FluentClock20Filled class="w-3 h-3" />
												Last Work
											</span>
											<span>{new Date(factory.lastWorked).toLocaleString()}</span>
										</div>
										{#if factory.pendingResources > 0}
											<div class="flex items-center justify-between">
												<span class="text-xs opacity-60">Ready to collect</span>
												<span class="font-bold text-success">{factory.pendingResources.toLocaleString()}</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="empty-state text-center py-12">
					<FluentFactory20Filled class="w-16 h-16 mx-auto opacity-30 mb-4" />
					<h3 class="text-lg font-semibold mb-2">No Factories</h3>
					<p class="opacity-60">This company hasn't built any factories yet</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Operating Regions -->
	{#if data.uniqueStates.length > 0}
		<div class="card bg-base-200/50 border border-base-300/50">
			<div class="card-body">
				<h2 class="card-title">
					<FluentLocation20Filled class="w-5 h-5 text-primary" />
					Operating Regions
				</h2>

				<div class="space-y-3">
					{#each data.uniqueStates as state}
						{@const stateFactories = data.factories.filter((f) => f.stateId === state.id)}
						{@const stateRegions = [
							...new Set(stateFactories.map((f) => ({ id: f.regionId, name: getRegionName(f.regionId) })))
						]}

						<div class="card bg-base-300/30 border border-base-300">
							<div class="card-body p-4">
								<div class="flex items-center justify-between mb-3">
									<h3 class="font-semibold">{state.name}</h3>
									<div class="badge badge-primary">
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
