<!-- src/routes/(authenticated)/(dock)/state/[id]/+page.svelte -->
<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCopy20Filled from "~icons/fluent/copy-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentShieldPerson20Filled from "~icons/fluent/shield-person-20-filled";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentChevronDown20Filled from "~icons/fluent/chevron-down-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentLightbulb20Filled from "~icons/fluent/lightbulb-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import { shareLink } from "$lib/util";
	import ElectionBanner from "./ElectionBanner.svelte";

	const { data } = $props();

	let taxesExpanded = $state(false);
	let energyExpanded = $state(false);

	const ministryIcons = {
		education: "🎓",
		defense: "🛡️",
		finance: "💰",
		health: "⚕️",
		infrastructure: "🏗️",
		justice: "⚖️",
		foreign_affairs: "🌐"
	};

	const taxTypeLabels = {
		mining: "Mining Tax",
		production: "Production Tax",
		market_transaction: "Market Transaction Tax",
		income: "Income Tax"
	};

	import { enhance } from "$app/forms";
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Card -->
	<div class="relative">
		<div class="bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 p-px rounded-2xl shimmer-outline">
			<div class="relative rounded-2xl bg-slate-800 overflow-hidden">
				<!-- Header Image -->
				<div class="w-full h-56 relative overflow-hidden">
					<img
						src={data.state.background ||
							"https://media.cntraveller.com/photos/65291b466ba909a7e4c6ce0d/16:9/w_1280,c_limit/Planet_Earth_III_generic_Best_Places_to_see_wildlife_October23_Credit_BBC_studios.jpg"}
						alt={data.state.name}
						class="w-full h-full object-cover"
					/>
					<div class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-800" />

					<!-- Floating Avatar -->
					<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
						<div class="ring-4 ring-slate-800 rounded-2xl">
							<div class="bg-gradient-to-br from-amber-600 via-rose-600 to-purple-600 p-4 rounded-2xl">
								<FluentBuildingGovernment20Filled class="size-14 text-white" />
							</div>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="px-6 pt-12 pb-6 space-y-6">
					<!-- Title -->
					<div class="text-center space-y-1">
						<h1 class="text-3xl font-bold text-white">{data.state.name}</h1>
						<p class="text-sm text-gray-400">National Ranking #{data.state.rating || 42}</p>
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-4">
						<a class="bg-slate-700/30 rounded-xl border border-white/5 p-4 text-center" href="/state?sort=population">
							<FluentPeople20Filled class="size-8 text-blue-400 mx-auto mb-2" />
							<p class="text-2xl font-bold text-white">{(data.state.population || 0).toLocaleString()}</p>
							<p class="text-xs text-gray-400 mt-1">Population</p>
						</a>
						<a
							class="bg-slate-700/30 rounded-xl border border-white/5 p-4 text-center"
							href={"/state/" + data.state.id + "/region"}
						>
							<FluentGlobe20Filled class="size-8 text-purple-400 mx-auto mb-2" />
							<p class="text-2xl font-bold text-white">{data.regions?.length || 0}</p>
							<p class="text-xs text-gray-400 mt-1">Regions</p>
						</a>
					</div>

					<!-- Actions -->
					<div class="flex gap-2">
						{#if data.isPresident}
							<a
								href="/state/{data.state.id}/edit"
								class="btn flex-1 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-0 text-white gap-2"
							>
								<FluentEdit20Filled class="size-5" />
								Edit State
							</a>
						{:else if data.isForeignMinister}
							<form method="POST" action="?/sanction" use:enhance>
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm(`Are you sure you want to sanction ${data.state.name}?`)) {
											e.preventDefault();
										}
									}}
									class="btn flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border-0 text-white gap-2"
								>
									<FluentWarning20Filled class="size-5" />
									Sanction State
								</button>
							</form>
						{:else}
							<button
								class="btn flex-1 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-0 text-white gap-2"
							>
								<FluentGlobe20Filled class="size-5" />
								Upgrade
							</button>
						{/if}
						<button
							class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
							onclick={() => shareLink(data.state.name, window.location.href)}
						>
							<FluentCopy20Filled class="size-5" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Bloc Information -->
	{#if data.bloc}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3 mb-3">
				<div class="size-10 rounded-lg flex items-center justify-center" style="background-color: {data.bloc.color}20">
					<FluentFlag20Filled class="size-5" style="color: {data.bloc.color}" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-white">Member of {data.bloc.name}</h2>
					<p class="text-xs text-gray-400">Political-Military Alliance</p>
				</div>
			</div>
			{#if data.bloc.description}
				<p class="text-sm text-gray-300 mt-2">{data.bloc.description}</p>
			{/if}
		</div>
	{/if}

	<!-- State Overview Sections -->
	{#if data.taxes.length > 0 || data.energy}
		<div class="space-y-3">
			<!-- Taxes Overview -->
			{#if data.taxes.length > 0}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
					<button
						onclick={() => (taxesExpanded = !taxesExpanded)}
						class="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
					>
						<div class="flex items-center gap-3">
							<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
								<FluentMoney20Filled class="size-5 text-green-400" />
							</div>
							<div class="text-left">
								<h3 class="text-base font-semibold text-white">Active Taxes</h3>
								<p class="text-xs text-gray-400">
									{data.taxes.length} tax {data.taxes.length === 1 ? "policy" : "policies"} in effect
								</p>
							</div>
						</div>
						<div class="transition-transform" class:rotate-180={taxesExpanded}>
							<FluentChevronDown20Filled class="size-5 text-gray-400" />
						</div>
					</button>

					{#if taxesExpanded}
						<div class="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
							{#each data.taxes as tax}
								<div class="bg-slate-700/20 rounded-lg p-3">
									<div class="flex justify-between items-start">
										<div>
											<p class="font-medium text-white text-sm">{tax.taxName}</p>
											<p class="text-xs text-gray-400 capitalize">{taxTypeLabels[tax.taxType] || tax.taxType}</p>
										</div>
										<span class="text-sm font-semibold text-green-400">{tax.taxRate}%</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Energy Overview -->
			{#if data.energy}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
					<button
						onclick={() => (energyExpanded = !energyExpanded)}
						class="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
					>
						<div class="flex items-center gap-3">
							<div
								class={`size-10 rounded-lg flex items-center justify-center ${
									data.energy.available < 0 ? "bg-red-600/20" : "bg-yellow-600/20"
								}`}
							>
								<FluentLightbulb20Filled
									class={`size-5 ${data.energy.available < 0 ? "text-red-400" : "text-yellow-400"}`}
								/>
							</div>
							<div class="text-left">
								<h3 class="text-base font-semibold text-white">Energy Status</h3>
								<p class="text-xs text-gray-400">
									{#if data.energy.available < 0}
										<span class="text-red-400 font-medium">Deficit: {Math.abs(data.energy.available)} MW</span>
									{:else}
										<span class="text-green-400 font-medium">Available: {data.energy.available} MW</span>
									{/if}
								</p>
							</div>
						</div>
						<div class="transition-transform" class:rotate-180={energyExpanded}>
							<FluentChevronDown20Filled class="size-5 text-gray-400" />
						</div>
					</button>

					{#if energyExpanded}
						<div class="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
							<div class="space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-400">Total Capacity</span>
									<span class="text-white font-medium">{data.energy.totalProduction.toLocaleString()} MW</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-gray-400">Current Usage</span>
									<span class="text-white font-medium">{data.energy.usedProduction.toLocaleString()} MW</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-gray-400">Power Plants</span>
									<span class="text-white font-medium">{data.powerPlants}</span>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
								<div
									class={`absolute top-0 left-0 h-full rounded-full transition-all ${
										data.energy.usedProduction > data.energy.totalProduction ? "bg-red-500" : "bg-green-500"
									}`}
									style={`width: ${Math.min((data.energy.usedProduction / data.energy.totalProduction) * 100, 100)}%`}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- President Section -->
	{#if data.president}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-2 mb-4">
				<div class="size-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
					<FluentShieldPerson20Filled class="size-5 text-amber-400" />
				</div>
				<h2 class="text-lg font-semibold text-white">President</h2>
			</div>
			<a
				href="/user/{data.president.userId}"
				class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
			>
				<CircleAvatar src={data.president.avatar} />
				<div class="flex-1">
					<p class="font-semibold text-white group-hover:text-amber-400 transition-colors">
						{data.president.name}
					</p>
					<p class="text-xs text-gray-400">
						Term {data.president.term} • Elected {new Date(data.president.electedAt).toLocaleDateString("en-US", {
							month: "short",
							year: "numeric"
						})}
					</p>
				</div>
				<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
			</a>
		</div>
	{/if}

	<!-- Ministers Section -->
	{#if data.ministers && data.ministers.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-2 mb-4">
				<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentBriefcase20Filled class="size-5 text-purple-400" />
				</div>
				<h2 class="text-lg font-semibold text-white">Cabinet Ministers</h2>
			</div>
			<div class="space-y-2">
				{#each data.ministers as minister}
					<a
						href="/user/{minister.userId}"
						class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
					>
						<div
							class="size-10 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-lg flex items-center justify-center text-xl"
						>
							{ministryIcons[minister.ministry] || "📋"}
						</div>
						<div class="flex-1">
							<p class="font-semibold text-white group-hover:text-purple-400 transition-colors">
								{minister.name}
							</p>
							<p class="text-xs text-gray-400 capitalize">
								{minister.ministry.replace("_", " ")} • Since {new Date(minister.appointedAt).toLocaleDateString(
									"en-US",
									{ month: "short", year: "numeric" }
								)}
							</p>
						</div>
						<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Parliament Section -->
	{#if data.parliamentMembers && data.parliamentMembers.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
						<FluentPeople20Filled class="size-5 text-blue-400" />
					</div>
					<h2 class="text-lg font-semibold text-white">Parliament</h2>
				</div>
				<span class="text-sm text-gray-400">{data.parliamentMembers.length} members</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{#each data.parliamentMembers.slice(0, 6) as member}
					<a
						href="/user/{member.userId}"
						class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
					>
						<CircleAvatar src={member.avatar} size="sm" />
						<div class="flex-1 min-w-0">
							<p class="font-medium text-white group-hover:text-blue-400 transition-colors truncate text-sm">
								{member.name}
							</p>
							<p class="text-xs text-gray-400 truncate">
								{member.partyAffiliation || "Independent"}
							</p>
						</div>
					</a>
				{/each}
			</div>
			{#if data.parliamentMembers.length > 6}
				<a
					href="/state/{data.state.id}/parliament"
					class="btn btn-sm w-full mt-3 bg-transparent hover:bg-blue-600/10 border-blue-500/20 text-blue-400 hover:text-blue-300"
				>
					View All {data.parliamentMembers.length} Members
				</a>
			{/if}
		</div>
	{/if}

	<a
		href="/state/{data.state.id}/parliament"
		class="btn btn-sm w-full mt-3 bg-transparent hover:bg-blue-600/10 border-blue-500/20 text-blue-400 hover:text-blue-300"
	>
		Parliament
	</a>

	<ElectionBanner election={data.nextElection} stateId={data.state.id} />

	<!-- Regions List -->
	{#if data.regions && data.regions.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<h2 class="text-lg font-semibold text-white mb-4">Regions</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each data.regions as region}
					<a
						href="/region/{region.id}"
						class="group bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all border border-transparent hover:border-purple-500/30"
					>
						<div class="flex items-center gap-3 mb-2">
							<div
								class="size-10 bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-lg flex items-center justify-center"
							>
								<FluentGlobe20Filled class="size-5 text-purple-400" />
							</div>
							<h3 class="font-semibold text-white group-hover:text-purple-400 transition-colors">
								{region.name}
							</h3>
						</div>
						<p class="text-xs text-gray-400 pl-13">
							{(region.population || 0).toLocaleString()} residents
						</p>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Footer Links -->
	<div class="flex justify-center gap-4 pt-4 border-t border-white/5">
		<a href="/state" class="text-sm text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
			All States
		</a>
		<span class="text-gray-600">•</span>
		<a href="/region" class="text-sm text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
			All Regions
		</a>
	</div>
</div>
