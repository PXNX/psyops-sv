<!-- src/routes/(authenticated)/(dock)/state/[id]/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import FluentOrganization20Filled from "~icons/fluent/organization-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	const isNewState = $derived(data.nextElection?.isInaugural && data.nextElection.status === "scheduled");
	const hasGovernment = $derived(!!data.president || data.ministers.length > 0 || data.parliamentMembers.length > 0);
</script>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
	<!-- Header with Bloc -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-4">
			<Logo
				src={data.state.logo}
				alt={data.state.name}
				class="size-24 rounded-xl ring-2 ring-white/10"
				placeholderIcon={FluentFlag20Filled}
				placeholderGradient="from-purple-500 to-blue-500"
			/>
			<div class="flex-1">
				<h1 class="text-4xl font-bold text-white mb-2">{data.state.name}</h1>
				<div class="flex flex-wrap items-center gap-3 text-gray-400">
					<span class="flex items-center gap-1">
						<FluentPeople20Filled class="size-4" />
						{data.state.population.toLocaleString()} citizens
					</span>
					<span>•</span>
					<span class="flex items-center gap-1">
						<FluentHome20Filled class="size-4" />
						{data.regions.length} regions
					</span>
					{#if data.bloc}
						<span>•</span>
						<a
							href="/bloc/{data.bloc.id}"
							class="flex items-center gap-1 hover:text-purple-400 transition-colors"
							style="color: {data.bloc.color}"
						>
							<FluentFlag20Filled class="size-4" />
							{data.bloc.name}
						</a>
					{/if}
				</div>
			</div>
		</div>

		{#if data.state.description}
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
				<p class="text-gray-300 text-sm leading-relaxed">{data.state.description}</p>
			</div>
		{/if}
	</div>

	<!-- Inaugural Election Banner -->
	{#if isNewState}
		<div class="bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-2 border-amber-500/40 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<div class="size-14 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentVote20Filled class="size-7 text-amber-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold text-white mb-2">Inaugural Election in Progress</h2>
					<p class="text-gray-300 mb-4">
						This newly formed state is holding its first democratic election to establish the government. The
						legislature and executive branch will be formed once voting concludes.
					</p>
					<div class="flex items-center gap-4 text-sm">
						<div class="flex items-center gap-2 text-amber-400">
							<FluentCalendar20Filled class="size-4" />
							<span>Started: {formatDate(data.nextElection.startDate)}</span>
						</div>
						<div class="flex items-center gap-2 text-amber-400">
							<FluentCalendar20Filled class="size-4" />
							<span>Ends: {formatDate(data.nextElection.endDate)}</span>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/parliament/election/{data.nextElection.id}"
						class="btn btn-sm bg-amber-600 hover:bg-amber-500 border-0 text-white mt-4"
					>
						View Election
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Government Section - Only if established -->
	{#if hasGovernment}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
			<div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 px-6 py-4 border-b border-white/5">
				<h2 class="text-xl font-bold text-white flex items-center gap-2">
					<FluentBuildingBank20Filled class="size-6 text-purple-400" />
					Government
				</h2>
			</div>

			<div class="p-6 space-y-6">
				<!-- President -->
				{#if data.president}
					<div>
						<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Executive</h3>
						<a
							href="/user/{data.president.userId}"
							class="flex items-center gap-4 group bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-xl p-4 hover:from-amber-900/30 hover:to-orange-900/30 transition-all border border-amber-500/20"
						>
							<Logo
								src={data.president.logo}
								alt={data.president.name}
								class="size-14 rounded-xl ring-2 ring-amber-500/30"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-amber-500 to-orange-500"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-xl">👑</span>
									<p class="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
										{data.president.name}
									</p>
								</div>
								<p class="text-sm text-gray-400">
									President • Term {data.president.term} • Elected {formatDate(data.president.electedAt)}
								</p>
							</div>
						</a>
					</div>
				{/if}

				<!-- Ministers -->
				{#if data.ministers.length > 0}
					<div>
						<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Cabinet</h3>
						<div class="grid md:grid-cols-2 gap-3">
							{#each data.ministers as minister}
								<a
									href="/user/{minister.userId}"
									class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
								>
									<Logo
										src={minister.logo}
										alt={minister.name}
										class="size-12 rounded-lg"
										placeholderIcon={FluentShield20Filled}
										placeholderGradient="from-purple-500 to-blue-500"
									/>
									<div class="flex-1 min-w-0">
										<p class="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
											{minister.name}
										</p>
										<p class="text-xs text-gray-400 capitalize truncate">
											{minister.ministry.replace("_", " ")}
										</p>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Parliament -->
				{#if data.parliamentMembers.length > 0}
					<div>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide">Legislature</h3>
							<a href="/state/{data.state.id}/parliament" class="text-sm text-purple-400 hover:text-purple-300">
								View all {data.parliamentMembers.length} members →
							</a>
						</div>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
							{#each data.parliamentMembers.slice(0, 8) as member}
								<a
									href="/user/{member.userId}"
									class="flex flex-col items-center gap-2 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
								>
									<Logo
										src={member.logo}
										alt={member.name}
										class="size-12 rounded-lg"
										placeholderIcon={FluentShield20Filled}
										placeholderGradient="from-purple-500 to-pink-500"
									/>
									<p
										class="text-xs font-medium text-white group-hover:text-purple-400 transition-colors text-center line-clamp-2"
									>
										{member.name}
									</p>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Navigation Cards -->
	<div class="grid md:grid-cols-3 gap-4">
		<a
			href="/state/{data.state.id}/region"
			class="group bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all"
		>
			<div
				class="size-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
			>
				<FluentHome20Filled class="size-6 text-blue-400" />
			</div>
			<h3 class="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Regions</h3>
			<p class="text-sm text-gray-400 mb-3">
				Explore {data.regions.length} regions, their governors, and local economies
			</p>
			<div class="text-xs text-blue-400 flex items-center gap-1">Browse regions →</div>
		</a>

		{#if hasGovernment}
			<a
				href="/state/{data.state.id}/parliament"
				class="group bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all"
			>
				<div
					class="size-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
				>
					<FluentOrganization20Filled class="size-6 text-purple-400" />
				</div>
				<h3 class="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Parliament</h3>
				<p class="text-sm text-gray-400 mb-3">View legislative proposals, debates, and voting records</p>
				<div class="text-xs text-purple-400 flex items-center gap-1">View legislature →</div>
			</a>

			<a
				href="/state/{data.state.id}/economy"
				class="group bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/20 p-6 hover:border-green-500/40 transition-all"
			>
				<div
					class="size-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
				>
					<FluentMoney20Filled class="size-6 text-green-400" />
				</div>
				<h3 class="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Economy</h3>
				<p class="text-sm text-gray-400 mb-3">Treasury balance, tax policies, and economic statistics</p>
				<div class="text-xs text-green-400 flex items-center gap-1">View economy →</div>
			</a>
		{/if}
	</div>

	<!-- Regional Preview -->
	{#if data.regions.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 px-6 py-4 border-b border-white/5">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-bold text-white flex items-center gap-2">
						<FluentHome20Filled class="size-6 text-blue-400" />
						Regional Overview
					</h2>
					<a href="/state/{data.state.id}/region" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
						View all →
					</a>
				</div>
			</div>
			<div class="p-6">
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each data.regions.slice(0, 12) as region}
						<a
							href="/region/{region.id}"
							class="flex flex-col items-center gap-3 group bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/50 transition-all"
						>
							<Logo
								src={region.logo}
								alt={region.name}
								class="size-16 rounded-lg ring-2 ring-white/5 group-hover:ring-blue-400/30 transition-all"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-blue-500 to-cyan-500"
							/>
							<div class="text-center">
								<p
									class="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-1"
								>
									{region.name}
								</p>
								<p class="text-xs text-gray-500">
									{region.population.toLocaleString()}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- State Information -->
	{#if data.state.background}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentInfo20Filled class="size-6 text-gray-400" />
				Background
			</h2>
			<p class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{data.state.background}</p>
		</div>
	{/if}
</div>
