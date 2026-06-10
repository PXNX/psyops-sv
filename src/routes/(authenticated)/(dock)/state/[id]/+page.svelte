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
	import FluentLightbulb20Filled from "~icons/fluent/lightbulb-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";

	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentShieldError20Filled from "~icons/fluent/shield-error-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import { formatDate } from "$lib/utils/formatting.js";
	import { enhance } from "$app/forms";

	const { data } = $props();

	let showWarModal = $state(false);
	let isDeclaringWar = $state(false);

	const hasGovernment = $derived(!!data.president || data.ministers.length > 0 || data.parliamentMembers.length > 0);

	function getTimeRemaining(endDate: string | Date) {
		const now = new Date();
		const end = new Date(endDate);
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return null;

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const electionState = $derived(() => {
		if (!data.nextElection) return null;
		const now = new Date();
		const start = new Date(data.nextElection.startDate);
		const end = new Date(data.nextElection.endDate);

		if (now < start) return "scheduled";
		if (now >= start && now <= end) return "active";
		return null;
	});
</script>

<svelte:head>
	<title>{data.state.name}</title>
	<meta name="description" content={data.state.description || `State of ${data.state.name} in PsyOps.`} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.state.name} />
	<meta property="og:description" content={data.state.description || `State of ${data.state.name} in PsyOps.`} />
	{#if data.state.logo}
		<meta property="og:image" content={data.state.logo} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.state.name} />
	<meta name="twitter:description" content={data.state.description || `State of ${data.state.name} in PsyOps.`} />
	{#if data.state.logo}
		<meta name="twitter:image" content={data.state.logo} />
	{/if}
</svelte:head>

<PageContainer maxWidth="5xl">
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
						<a
							href="/bloc/{data.bloc.id}"
							class="text-sm font-medium hover:underline inline-block"
							style="color: {data.bloc.color};"
						>
							{data.bloc.name}
						</a>
					{/if}
					{#if data.state.description}
						<p class="text-sm text-gray-300 max-w-md mt-2">{data.state.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- President Action Buttons -->
	{#if data.isPresident}
		<div class="flex gap-2 flex-wrap">
			<a
				href="/state/{data.state.id}/edit"
				class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
			>
				<FluentEdit20Filled class="size-4" />
				Edit State
			</a>

			{#if !data.bloc}
				<a
					href="/bloc"
					class="btn btn-sm bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/30 text-purple-300 hover:text-purple-200 gap-2"
				>
					<FluentFlag20Filled class="size-4" />
					Join Bloc
				</a>
			{/if}
		</div>
	{/if}

	<!-- Active Wars -->
	{#if data.activeWars && data.activeWars.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-red-400 uppercase tracking-wider px-1 flex items-center gap-2">
				<FluentShieldError20Filled class="size-4" />
				Active Wars
			</h2>
			<div class="space-y-3">
				{#each data.activeWars as war}
					<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
						<div class="flex items-start gap-4">
							<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
								<FluentShieldError20Filled class="size-6 text-red-400 animate-pulse" />
							</div>
							<div class="flex-1">
								<div class="flex items-start justify-between gap-4 mb-3">
									<div>
										<h3 class="text-lg font-bold text-white mb-1">
											{war.isAttacker ? "War of Aggression" : "Defensive War"}
										</h3>
										<p class="text-sm text-gray-300">
											Declared by {war.declarer.name} on {formatDate(war.declaredAt)}
										</p>
									</div>
									<span
										class="px-3 py-1 rounded-full text-xs font-semibold bg-red-600/20 text-red-400 border border-red-500/30"
									>
										Active
									</span>
								</div>

								<div class="bg-red-950/30 rounded-lg p-4 mb-4">
									<div class="grid md:grid-cols-2 gap-4">
										<div class="space-y-2">
											<p class="text-xs text-red-300 font-semibold uppercase tracking-wider">Attacker</p>
											<a href="/state/{war.attacker.id}" class="flex items-center gap-3 group">
												{#if war.attacker.logo}
													<img src={war.attacker.logo} alt={war.attacker.name} class="size-10 rounded-lg" />
												{:else}
													<div class="size-10 bg-base-200 rounded-lg flex items-center justify-center">
														<FluentFlag20Filled class="size-5 text-base-content/20" />
													</div>
												{/if}
												<span class="text-white font-medium group-hover:text-red-400 transition-colors">
													{war.attacker.name}
												</span>
											</a>
										</div>

										<div class="space-y-2">
											<p class="text-xs text-blue-300 font-semibold uppercase tracking-wider">Defender</p>
											<a href="/state/{war.defender.id}" class="flex items-center gap-3 group">
												{#if war.defender.logo}
													<img src={war.defender.logo} alt={war.defender.name} class="size-10 rounded-lg" />
												{:else}
													<div class="size-10 bg-base-200 rounded-lg flex items-center justify-center">
														<FluentFlag20Filled class="size-5 text-base-content/20" />
													</div>
												{/if}
												<span class="text-white font-medium group-hover:text-blue-400 transition-colors">
													{war.defender.name}
												</span>
											</a>
										</div>
									</div>
								</div>

								<div class="flex gap-2">
									<a href="/war/{war.id}" class="btn btn-sm bg-red-600 hover:bg-red-500 border-0 text-white gap-2">
										<FluentShieldError20Filled class="size-4" />
										View War Details
									</a>
									{#if data.isPresident}
										<a
											href="/war/{war.id}/battles"
											class="btn btn-sm bg-slate-700 hover:bg-slate-600 border-0 text-white"
										>
											Manage Battles
										</a>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- War Declaration Button (for foreign presidents) -->
	{#if data.canDeclareWar}
		<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentShieldError20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-white mb-2">Military Actions</h3>
					<p class="text-sm text-gray-300 mb-4">
						As a President, you can declare war on this state. This action will have significant consequences.
					</p>
					<button
						type="button"
						onclick={() => (showWarModal = true)}
						class="btn btn-sm bg-red-600 hover:bg-red-500 border-0 text-white gap-2"
					>
						<FluentShieldError20Filled class="size-4" />
						Declare War
					</button>
				</div>
			</div>
		</div>
	{/if}

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

	<!-- Government Section -->
	{#if hasGovernment}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Government</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
				<!-- President -->
				{#if data.president}
					<ProfileItem
						href="/user/{data.president.userId}"
						logo={data.president.logo}
						logoAlt={data.president.name}
						placeholderIcon={FluentShield20Filled}
						placeholderGradient="from-amber-600/20 to-amber-700/10"
						title={data.president.name}
						subtitle="President • Term {data.president.term} • {formatDate(data.president.electedAt)}"
						hoverColor="yellow"
					/>
				{/if}

				<!-- Ministers -->
				{#if data.ministers.length > 0}
					<div class="grid md:grid-cols-2 gap-2 pt-2">
						{#each data.ministers as minister}
							<ProfileItem
								href="/user/{minister.userId}"
								logo={minister.logo}
								logoAlt={minister.name}
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-purple-600/20 to-purple-700/10"
								title={minister.name}
								subtitle={minister.ministry.replace("_", " ")}
								hoverColor="purple"
							/>
						{/each}
					</div>
				{/if}

				<!-- Parliament Link -->
				{#if data.parliamentMembers.length > 0}
					<ProfileItem
						href="/state/{data.state.id}/parliament"
						placeholderIcon={FluentOrganization20Filled}
						placeholderGradient="from-indigo-600/20 to-indigo-700/10"
						title="{data.parliamentMembers.length} Parliament Members"
						subtitle="View legislature"
						hoverColor="purple"
					/>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Election Banners -->
	{#if data.nextElection && electionState()}
		{@const state = electionState()}

		{#if data.nextElection.isInaugural && state === "scheduled"}
			<!-- Inaugural Election - Scheduled -->
			<div
				class="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-5 space-y-3"
			>
				<div class="flex items-start gap-3">
					<div class="size-12 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
						<FluentVote20Filled class="size-6 text-purple-400" />
					</div>
					<div class="flex-1 space-y-2">
						<h3 class="font-bold text-white text-lg">Inaugural Election Scheduled! 🎉</h3>
						<p class="text-purple-200 text-sm">
							This state is brand new! The first democratic election will establish the founding parliament of
							<strong>{data.nextElection.totalSeats} seats</strong>.
						</p>

						<div class="bg-purple-900/30 rounded-lg p-3 space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<FluentCalendar20Filled class="size-4 text-purple-400" />
								<span class="text-purple-100">
									<strong>Voting starts in:</strong>
									{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
								</span>
							</div>
							<div class="text-xs text-purple-200/80">
								<strong>Start:</strong>
								{formatDate(data.nextElection.startDate)}<br />
								<strong>End:</strong>
								{formatDate(data.nextElection.endDate)}
							</div>
						</div>

						<div class="flex gap-2 pt-2">
							<a
								href="/state/{data.state.id}/election/{data.nextElection.id}"
								class="btn btn-sm bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
							>
								<FluentVote20Filled class="size-4" />
								View Election Details
							</a>
							<a href="/party/create" class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white">
								Create a Party
							</a>
						</div>
					</div>
				</div>
			</div>
		{:else if data.nextElection.isInaugural && state === "active"}
			<!-- Inaugural Election - Active -->
			<div class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-3">
						<FluentVote20Filled class="size-6 text-green-400 animate-pulse" />
						<div>
							<p class="font-semibold text-white">Inaugural Election Now Active!</p>
							<p class="text-sm text-green-200">Help establish the founding parliament - vote now!</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-green-600 hover:bg-green-500 border-0 text-white gap-2 animate-pulse"
					>
						<FluentVote20Filled class="size-4" />
						Vote Now
					</a>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && state === "scheduled"}
			<!-- Regular Election - Scheduled -->
			<div class="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-500/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-blue-600/30 rounded-xl flex items-center justify-center">
							<FluentCalendar20Filled class="size-6 text-blue-400" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-white">Upcoming Election</h3>
							</div>
							<p class="text-sm text-gray-400">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} • starts in {getTimeRemaining(
									data.nextElection.startDate
								)}
							</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white"
					>
						View Election
					</a>
				</div>
			</div>
		{:else if !data.nextElection.isInaugural && state === "active"}
			<!-- Regular Election - Active -->
			<div class="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl border border-green-500/30 p-5">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-4 flex-1">
						<div class="size-12 bg-green-600/30 rounded-xl flex items-center justify-center">
							<FluentVote20Filled class="size-6 text-green-400" />
						</div>
						<div>
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-lg font-bold text-white">Election Active</h3>
								<span
									class="px-2 py-1 rounded-lg text-xs font-semibold border bg-green-600/20 text-green-400 border-green-500/30"
								>
									Voting Now
								</span>
							</div>
							<p class="text-sm text-gray-400">
								{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
								{data.nextElection.totalSeats} seats •
								{getTimeRemaining(data.nextElection.endDate)} remaining
							</p>
						</div>
					</div>
					<a
						href="/state/{data.state.id}/election/{data.nextElection.id}"
						class="btn btn-sm bg-green-600 hover:bg-green-500 border-0 text-white gap-2 animate-pulse"
					>
						<FluentVote20Filled class="size-4" />
						Vote Now
					</a>
				</div>
			</div>
		{/if}
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

			{#if data.isPresident || data.isForeignMinister}
				<a
					href="/state/{data.state.id}/foreign-affairs"
					class="group bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all"
				>
					<div
						class="size-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
					>
						<FluentGlobe20Filled class="size-6 text-blue-400" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Foreign Affairs</h3>
					<p class="text-sm text-gray-400 mb-3">Diplomacy, wars, and sanctions</p>
					<div class="text-xs text-blue-400 flex items-center gap-1">View diplomacy →</div>
				</a>
			{/if}
		{/if}
	</section>

	<!-- Tax Overview -->
	{#if data.taxes.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Tax Policies</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-6">
				<div class="grid md:grid-cols-2 gap-4">
					{#each data.taxes as tax}
						<div class="bg-slate-700/30 rounded-lg border border-white/5 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-2">
									<div class="size-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
										<FluentMoney20Filled class="size-5 text-emerald-400" />
									</div>
									<div>
										<h3 class="font-semibold text-white capitalize">
											{tax.taxType.replace(/_/g, " ")}
										</h3>
										<p class="text-xs text-gray-400">Active Tax</p>
									</div>
								</div>
								<div class="text-right">
									<p class="text-2xl font-bold text-emerald-400">{tax.taxRate}%</p>
								</div>
							</div>
							<div class="text-xs text-gray-400 space-y-1">
								{#if tax.taxType === "mining"}
									<p>Applied to resource extraction operations</p>
								{:else if tax.taxType === "production"}
									<p>Applied to manufactured goods production</p>
								{:else if tax.taxType === "market_transaction"}
									<p>Applied to marketplace sales</p>
								{:else if tax.taxType === "income"}
									<p>Applied to worker wages and salaries</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if data.taxes.length === 0}
					<div class="text-center py-8">
						<div class="size-16 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
							<FluentMoney20Filled class="size-8 text-gray-500" />
						</div>
						<p class="text-gray-400 text-sm">No active tax policies</p>
						<p class="text-gray-500 text-xs mt-1">Parliament can propose new tax legislation</p>
					</div>
				{/if}
			</div>
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
	</PageContainer>

	<!-- War Declaration Modal -->
<Modal bind:open={showWarModal} title="Declare War" size="default">
	<div class="space-y-4">
		<div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-red-400 mt-0.5 flex-shrink-0" />
				<div class="space-y-2">
					<h4 class="font-bold text-white">⚠️ Critical Warning</h4>
					<p class="text-sm text-gray-300">
						You are about to declare war on <strong>{data.state.name}</strong>. This action:
					</p>
					<ul class="text-sm text-gray-300 space-y-1 ml-4 list-disc">
						<li>Cannot be undone</li>
						<li>Will initiate military conflict</li>
						<li>May have severe diplomatic consequences</li>
						<li>Could trigger alliance obligations</li>
					</ul>

					{#if data.bloc}
						<div class="mt-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
							<div class="flex items-start gap-2">
								<FluentFlag20Filled class="size-5 text-yellow-400 mt-0.5 flex-shrink-0" />
								<div>
									<p class="font-semibold text-yellow-300 text-sm">Bloc Member Warning</p>
									<p class="text-xs text-yellow-200 mt-1">
										This state is a member of <strong>{data.bloc.name}</strong>. Declaring war may trigger collective
										defense mechanisms and bring you into conflict with the entire bloc.
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<form
			method="POST"
			action="?/declareWar"
			use:enhance={() => {
				isDeclaringWar = true;
				return async ({ result }) => {
					isDeclaringWar = false;
					showWarModal = false;
				};
			}}
		>
			<div class="flex gap-3 justify-end pt-4">
				<button
					type="button"
					onclick={() => (showWarModal = false)}
					class="btn btn-sm bg-slate-700 hover:bg-slate-600 border-0 text-white"
					disabled={isDeclaringWar}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-sm bg-red-600 hover:bg-red-500 border-0 text-white gap-2"
					disabled={isDeclaringWar}
				>
					{#if isDeclaringWar}
						<span class="loading loading-spinner loading-xs"></span>
						Declaring...
					{:else}
						<FluentShieldError20Filled class="size-4" />
						Confirm Declaration
					{/if}
				</button>
			</div>
		</form>
	</div>
</Modal>
