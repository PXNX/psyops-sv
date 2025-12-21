<!-- src/routes/company/+page.svelte -->
<script lang="ts">
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";

	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	{#if data.company}
		<!-- Company Header -->
		<div class="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden">
			<div class="h-32 relative bg-gradient-to-br from-purple-600/40 to-blue-600/20">
				<div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-800/50"></div>
			</div>

			<div class="p-6 -mt-16 relative">
				<div class="flex items-start gap-6">
					<!-- Company Logo -->
					<div
						class="size-24 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center border-4 border-slate-800 relative z-10"
					>
						{#if data.company.logo}
							<img src={data.company.logo} alt={data.company.name} class="size-20 object-contain rounded-xl" />
						{:else}
							<FluentBuilding20Filled class="size-12 text-white" />
						{/if}
					</div>

					<div class="flex-1 mt-8">
						<div class="flex items-start justify-between">
							<div>
								<h1 class="text-3xl font-bold text-white mb-2">{data.company.name}</h1>
								<div class="flex items-center gap-4 text-sm text-gray-400">
									<span class="flex items-center gap-1">
										<FluentCalendar20Filled class="size-4" />
										Founded {new Date(data.company.foundedAt).toLocaleDateString()}
									</span>
									<span class="flex items-center gap-1">
										<span class="text-gray-500">Owner:</span>
										<span class="text-white">{data.company.ownerEmail}</span>
									</span>
								</div>
							</div>

							<a
								href="/company/edit"
								class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
							>
								<FluentEdit20Filled class="size-4" />
								Edit
							</a>
						</div>

						{#if data.company.description}
							<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 mt-4">
								<p class="text-gray-300">{data.company.description}</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Company Stats -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
						<FluentFactory20Filled class="size-6 text-purple-400" />
					</div>
					<div>
						<p class="text-xs text-gray-400">Factories</p>
						<p class="text-2xl font-bold text-white">{data.factories.length}</p>
					</div>
				</div>
			</div>

			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
						<FluentPeople20Filled class="size-6 text-blue-400" />
					</div>
					<div>
						<p class="text-xs text-gray-400">Total Workers</p>
						<p class="text-2xl font-bold text-white">{data.totalWorkers}</p>
					</div>
				</div>
			</div>

			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-lg bg-green-600/20 flex items-center justify-center">
						<FluentLocation20Filled class="size-6 text-green-400" />
					</div>
					<div>
						<p class="text-xs text-gray-400">Active Regions</p>
						<p class="text-2xl font-bold text-white">{new Set(data.factories.map((f) => f.regionId)).size}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Factories Section -->
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<FluentFactory20Filled class="size-5 text-purple-400" />
					<h2 class="text-xl font-semibold text-white">Your Factories</h2>
				</div>
				<a
					href="/factory/create"
					class="btn btn-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
				>
					<FluentAdd20Filled class="size-4" />
					New Factory
				</a>
			</div>

			{#if data.factories.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each data.factories as factory}
						<div
							class="bg-slate-700/30 rounded-lg p-5 border border-slate-600/30 hover:border-slate-500/50 transition-colors space-y-3"
						>
							<div class="flex items-start justify-between">
								<div>
									<h3 class="font-semibold text-white text-lg">{factory.name}</h3>
									<p class="text-sm text-gray-400 capitalize flex items-center gap-1 mt-1">
										<span class="size-2 rounded-full bg-purple-500"></span>
										{factory.factoryType}
									</p>
								</div>
								<span class="badge bg-purple-600/20 text-purple-300 border-purple-500/30 capitalize">
									{factory.resourceOutput || factory.productOutput}
								</span>
							</div>

							<div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-600/30">
								<div>
									<p class="text-xs text-gray-500">Location</p>
									<p class="text-sm font-medium text-white">{factory.regionName}</p>
								</div>
								<div>
									<p class="text-xs text-gray-500">Workers</p>
									<p class="text-sm font-medium text-white">{factory.workerCount} / {factory.maxWorkers}</p>
								</div>
							</div>

							<div class="flex items-center justify-between pt-3 border-t border-slate-600/30">
								<div>
									<p class="text-xs text-gray-500">Wage per Shift</p>
									<p class="text-sm font-bold text-green-400 flex items-center gap-1">
										<FluentMoney20Filled class="size-3" />
										{factory.workerWage.toLocaleString()}
									</p>
								</div>
								<a href="/factory/{factory.id}" class="btn btn-xs bg-slate-600/50 border-slate-500/30 text-gray-300">
									View Details
								</a>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="bg-slate-700/20 rounded-lg p-12 text-center">
					<FluentFactory20Filled class="size-16 text-gray-500 mx-auto mb-4" />
					<h3 class="text-lg font-semibold text-white mb-2">No Factories Yet</h3>
					<p class="text-gray-400 mb-4">Start building your industrial empire by creating your first factory</p>
					<a href="/factory/create" class="btn bg-gradient-to-r from-purple-600 to-blue-600 border-0 text-white gap-2">
						<FluentAdd20Filled class="size-4" />
						Create First Factory
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Company State -->
		<div class="max-h-screen flex items-center justify-center py-20">
			<div class="bg-slate-800/50 border border-white/5 rounded-2xl p-12 text-center space-y-6 max-w-2xl">
				<div
					class="size-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto"
				>
					<FluentBuilding20Filled class="size-12 text-white" />
				</div>

				<div>
					<h2 class="text-3xl font-bold text-white mb-3">No Company Registered</h2>
					<p class="text-gray-400 text-lg leading-relaxed max-w-lg mx-auto">
						Create a company to start building factories, hiring workers, and producing resources for the market.
					</p>
				</div>

				<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-left">
					<p class="text-sm text-blue-300 mb-3">
						<strong>With a company you can:</strong>
					</p>
					<ul class="text-sm text-blue-300/90 space-y-2">
						<li class="flex items-start gap-2">
							<span class="text-blue-400">•</span>
							<span>Build and manage factories across any region</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-blue-400">•</span>
							<span>Hire workers and set wages for your operations</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-blue-400">•</span>
							<span>Produce resources and sell them on the market</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-blue-400">•</span>
							<span>Build your industrial empire and economic influence</span>
						</li>
					</ul>
				</div>

				<a
					href="/company/create"
					class="btn btn-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-3"
				>
					<FluentAdd20Filled class="size-6" />
					Register Company
				</a>
			</div>
		</div>
	{/if}
</div>
