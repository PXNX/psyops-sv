<!-- src/routes/(authenticated)/(dock)/state/[id]/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentOrganization20Filled from "~icons/fluent/organization-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentLightbulb20Filled from "~icons/fluent/lightbulb-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	const isNewState = $derived(data.nextElection?.isInaugural && data.nextElection.status === "scheduled");
	const hasGovernment = $derived(!!data.president || data.ministers.length > 0 || data.parliamentMembers.length > 0);
</script>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Section with Bloc Background -->
	<div class="relative">
		<div
			class="w-full rounded-2xl p-8 flex flex-col items-center relative overflow-hidden border border-white/5 shadow-2xl"
			style="background: linear-gradient(135deg, {data.bloc?.color || '#1e293b'}20 0%, {data.bloc?.color ||
				'#1e293b'}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.bloc?.color ||
					'#ffffff'}20 35px, {data.bloc?.color || '#ffffff'}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-2xl"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<!-- State Logo -->
				<div class="ring-4 ring-white/10 rounded-full relative group">
					{#if data.state.logo}
						<div class="size-24 rounded-full overflow-hidden bg-base-200">
							<img src={data.state.logo} alt={data.state.name} class="w-full h-full object-cover" />
						</div>
					{:else}
						<div class="size-24 rounded-full bg-base-200 flex items-center justify-center">
							<FluentFlag20Filled class="size-8 text-base-content/20" />
						</div>
					{/if}

					{#if data.bloc}
						<div
							class="absolute -bottom-2 -right-2 size-10 rounded-full flex items-center justify-center ring-2 ring-base-100"
							style="background-color: {data.bloc.color};"
							title={data.bloc.name}
						>
							<FluentFlag20Filled class="size-5 text-white" />
						</div>
					{/if}
				</div>

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-white tracking-tight">{data.state.name}</h1>
					{#if data.bloc}
						<p class="text-sm font-medium" style="color: {data.bloc.color};">
							{data.bloc.name}
						</p>
					{/if}
					{#if data.state.description}
						<p class="text-sm text-gray-300 max-w-md mt-2">{data.state.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Grid -->
	<section class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<a
			href="/state?sort=population"
			class="bg-gradient-to-br from-blue-600/20 to-blue-700/10 rounded-xl border border-blue-500/20 p-5 hover:border-blue-500/30 transition-all"
		>
			<div class="flex items-center gap-2 mb-1">
				<FluentPeople20Filled class="size-5 text-blue-400" />
				<p class="text-sm text-blue-300 font-medium">Population</p>
			</div>
			<p class="text-4xl font-bold text-white">{data.state.population.toLocaleString()}</p>
		</a>

		<a
			href="/state/{data.state.id}/region"
			class="bg-gradient-to-br from-purple-600/20 to-purple-700/10 rounded-xl border border-purple-500/20 p-5 hover:border-purple-500/30 transition-all"
		>
			<div class="flex items-center gap-2 mb-1">
				<FluentHome20Filled class="size-5 text-purple-400" />
				<p class="text-sm text-purple-300 font-medium">Regions</p>
			</div>
			<p class="text-4xl font-bold text-white">{data.regions.length}</p>
		</a>

		{#if data.energy}
			<div class="bg-gradient-to-br from-amber-600/20 to-amber-700/10 rounded-xl border border-amber-500/20 p-5">
				<div class="flex items-center gap-2 mb-1">
					<FluentLightbulb20Filled class="size-5 text-amber-400" />
					<p class="text-sm text-amber-300 font-medium">Energy</p>
				</div>
				<p class="text-4xl font-bold text-white">{data.energy.available}</p>
			</div>
		{/if}

		<div class="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 rounded-xl border border-emerald-500/20 p-5">
			<div class="flex items-center gap-2 mb-1">
				<FluentShield20Filled class="size-5 text-emerald-400" />
				<p class="text-sm text-emerald-300 font-medium">Power Rating</p>
			</div>
			<p class="text-4xl font-bold text-white">{data.state.rating || 0}</p>
		</div>
	</section>

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
						This newly formed state is holding its first democratic election to establish the government.
					</p>
					<div class="flex items-center gap-4 text-sm flex-wrap">
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
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-amber-600 hover:bg-amber-500 border-0 text-white mt-4"
					>
						View Election
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Government Section -->
	{#if hasGovernment}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Government</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
				<!-- President -->
				{#if data.president}
					<a
						href="/user/{data.president.userId}"
						class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all"
					>
						<div class="size-12 bg-amber-600/20 rounded-lg flex items-center justify-center">
							{#if data.president.logo}
								<img src={data.president.logo} alt={data.president.name} class="size-8 rounded object-cover" />
							{:else}
								<FluentShield20Filled class="size-6 text-amber-400" />
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
								{data.president.name}
							</p>
							<p class="text-xs text-gray-400 truncate">
								President • Term {data.president.term} • {formatDate(data.president.electedAt)}
							</p>
						</div>
						<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
					</a>
				{/if}

				<!-- Ministers -->
				{#if data.ministers.length > 0}
					<div class="grid md:grid-cols-2 gap-2 pt-2">
						{#each data.ministers as minister}
							<a
								href="/user/{minister.userId}"
								class="flex items-center gap-2 group bg-slate-700/30 rounded-lg p-2 hover:bg-slate-700/50 transition-all"
							>
								<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
									{#if minister.logo}
										<img src={minister.logo} alt={minister.name} class="size-6 rounded object-cover" />
									{:else}
										<FluentShield20Filled class="size-5 text-purple-400" />
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
										{minister.name}
									</p>
									<p class="text-xs text-gray-400 capitalize truncate">
										{minister.ministry.replace("_", " ")}
									</p>
								</div>
							</a>
						{/each}
					</div>
				{/if}

				<!-- Parliament Link -->
				{#if data.parliamentMembers.length > 0}
					<a
						href="/state/{data.state.id}/parliament"
						class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all mt-2"
					>
						<div class="size-12 bg-indigo-600/20 rounded-lg flex items-center justify-center">
							<FluentOrganization20Filled class="size-6 text-indigo-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
								{data.parliamentMembers.length} Parliament Members
							</p>
							<p class="text-xs text-gray-400 truncate">View legislature</p>
						</div>
						<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
					</a>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Navigation Cards -->
	<section class="grid md:grid-cols-3 gap-4">
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
				<p class="text-sm text-gray-400 mb-3">Legislative proposals and voting</p>
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
				<p class="text-sm text-gray-400 mb-3">Treasury and tax policies</p>
				<div class="text-xs text-green-400 flex items-center gap-1">View economy →</div>
			</a>
		{/if}
	</section>

	<!-- State Information -->
	{#if data.state.background}
		<section class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
			<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
				<FluentInfo20Filled class="size-6 text-gray-400" />
				Background
			</h2>
			<p class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{data.state.background}</p>
		</section>
	{/if}

	<!-- Sanction Warning (for foreign ministers) -->
	{#if data.isForeignMinister}
		<section class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentWarning20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-white mb-2">Diplomatic Actions</h3>
					<p class="text-sm text-gray-300 mb-4">As a Foreign Minister, you can impose sanctions on this state.</p>
					<form method="POST" action="?/sanction">
						<button type="submit" class="btn btn-sm bg-red-600 hover:bg-red-500 border-0 text-white">
							Impose Sanction
						</button>
					</form>
				</div>
			</div>
		</section>
	{/if}
</div>
