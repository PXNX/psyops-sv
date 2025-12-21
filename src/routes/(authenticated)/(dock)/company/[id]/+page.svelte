<!-- src/routes/company/[id]/+page.svelte -->
<script lang="ts">
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";

	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
								<a
									href="/user/{data.company.ownerId}"
									class="flex items-center gap-1 hover:text-purple-400 transition-colors"
								>
									<span class="text-gray-500">Owner:</span>
									<span class="text-white">{data.company.ownerName || data.company.ownerEmail}</span>
								</a>
							</div>
						</div>

						{#if data.isOwner}
							<div class="flex gap-2">
								<a
									href="/company/edit"
									class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
								>
									<FluentEdit20Filled class="size-4" />
									Edit
								</a>
								<a
									href="/factory/create"
									class="btn btn-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
								>
									<FluentAdd20Filled class="size-4" />
									New Factory
								</a>
							</div>
						{/if}
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
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
					<p class="text-xs text-gray-400">States</p>
					<p class="text-2xl font-bold text-white">{data.uniqueStates.length}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 rounded-lg bg-amber-600/20 flex items-center justify-center">
					<FluentLocation20Filled class="size-6 text-amber-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Regions</p>
					<p class="text-2xl font-bold text-white">{data.uniqueRegions.length}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Factories Section -->
	<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FluentFactory20Filled class="size-5 text-purple-400" />
				<h2 class="text-xl font-semibold text-white">Factories</h2>
			</div>
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
								<p class="text-xs text-gray-500">{factory.stateName}</p>
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
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-slate-700/20 rounded-lg p-12 text-center">
				<FluentFactory20Filled class="size-16 text-gray-500 mx-auto mb-4" />
				<h3 class="text-lg font-semibold text-white mb-2">No Factories</h3>
				<p class="text-gray-400 mb-4">This company hasn't built any factories yet</p>
			</div>
		{/if}
	</div>

	<!-- Operating Regions -->
	{#if data.uniqueStates.length > 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-4">
			<div class="flex items-center gap-2">
				<FluentLocation20Filled class="size-5 text-purple-400" />
				<h2 class="text-xl font-semibold text-white">Operating Regions</h2>
			</div>

			<div class="space-y-4">
				{#each data.uniqueStates as state}
					{@const stateFactories = data.factories.filter((f) => f.stateId === state.id)}
					{@const stateRegions = [...new Set(stateFactories.map((f) => ({ id: f.regionId, name: f.regionName })))]}

					<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
						<div class="flex items-center justify-between mb-3">
							<h3 class="font-semibold text-white">{state.name}</h3>
							<span class="badge bg-purple-600/20 text-purple-300 border-purple-500/30">
								{stateFactories.length}
								{stateFactories.length === 1 ? "factory" : "factories"}
							</span>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each stateRegions as region}
								<span class="badge badge-sm bg-slate-600 text-gray-300 border-slate-500">
									{region.name}
								</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
