<!-- src/routes/(authenticated)/(dock)/region/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentLocationLive20Filled from "~icons/fluent/location-live-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { formatDate, getDaysRemaining } from "$lib/utils/formatting.js";

	const { data, form } = $props();

	const isIndependent = $derived(!data.region.stateId);
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<img
			src="/coats/{data.region.id}.svg"
			alt={data.region.name}
			class="size-20 rounded-xl object-cover ring-2 ring-white/10"
		/>
		<div class="flex-1">
			<h1 class="text-3xl font-bold text-white">{data.region.name}</h1>
			{#if data.region.stateName}
				<p class="text-gray-400 mt-1">
					<a href="/state/{data.region.stateId}" class="hover:text-purple-400 transition-colors">
						{data.region.stateName}
					</a>
				</p>
			{:else}
				<p class="text-amber-400 mt-1 flex items-center gap-2">
					<FluentFlag20Filled class="size-4" />
					Independent Region
				</p>
			{/if}
		</div>
	</div>

	<!-- Alerts -->
	{#if form?.error}
		<div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0 mt-0.5" />
			<div class="flex-1 text-sm text-red-300">{form.error}</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
			<FluentCheckmark20Filled class="size-5 text-emerald-400 flex-shrink-0 mt-0.5" />
			<div class="flex-1 text-sm text-emerald-300">{form.message}</div>
		</div>
	{/if}

	<!-- Independent Region Claim Banner -->
	{#if isIndependent}
		<div
			class="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-6 space-y-4"
		>
			<div class="flex items-start gap-4">
				<div class="size-12 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentFlag20Filled class="size-6 text-amber-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-white mb-2">Unclaimed Territory</h2>
					<p class="text-gray-300 text-sm mb-4">
						This region is independent and can be claimed by founding a new state. Create a political party here to
						establish your government and claim this territory.
					</p>
					<div class="flex flex-wrap gap-3">
						<a
							href="/party/create?regionId={data.region.id}"
							class="btn btn-sm bg-amber-600 hover:bg-amber-500 border-0 text-white gap-2"
						>
							<FluentFlag20Filled class="size-4" />
							Found a State
						</a>
						<a href="/parties" class="btn btn-sm bg-slate-700 hover:bg-slate-600 border-0 text-white gap-2">
							View Existing Parties
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Easy Residence Change for Independent Regions -->
		{#if !data.hasResidence}
			<div class="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
				<div class="flex items-start gap-4">
					<div class="size-12 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
						<FluentLocationLive20Filled class="size-6 text-emerald-400" />
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-white mb-2">Free Movement</h3>
						<p class="text-sm text-gray-300 mb-4">
							Independent regions have open borders. You can move here instantly without approval.
						</p>
						<form method="POST" action="?/changeResidence" use:enhance>
							<button type="submit" class="btn btn-sm bg-emerald-600 hover:bg-emerald-500 border-0 text-white gap-2">
								<FluentHome20Filled class="size-4" />
								Move Here Now
							</button>
						</form>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<!-- Residence Change for State Regions -->
		{#if !data.hasResidence}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<div class="flex items-start gap-4">
					<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
						<FluentHome20Filled class="size-6 text-blue-400" />
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-white mb-2">Change Residence</h3>
						{#if data.hasPendingResidenceApp}
							<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-3 mb-3">
								<p class="text-sm text-amber-300 flex items-center gap-2">
									<FluentClock20Filled class="size-4" />
									Application pending - awaiting governor approval
								</p>
							</div>
						{:else}
							<p class="text-sm text-gray-300 mb-4">
								Apply to move to this region. The governor must approve your application.
							</p>
							<form method="POST" action="?/changeResidence" use:enhance>
								<button type="submit" class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2">
									<FluentHome20Filled class="size-4" />
									Apply for Residency
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Visa Status / Requirements -->
	{#if data.visa.needsVisa}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
					<FluentBookCompass24Filled class="size-6 text-purple-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-white">Visa Required</h2>
					<p class="text-sm text-gray-400">You need a visa to work in this state</p>
				</div>
			</div>

			{#if data.visa.hasActiveVisa && data.visa.activeVisa}
				{@const daysLeft = getDaysRemaining(data.visa.activeVisa.expiresAt)}
				<!-- Active Visa -->
				<div class="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<FluentCheckmark20Filled class="size-5 text-emerald-400" />
								<p class="font-semibold text-white">Active Visa</p>
							</div>
							<p class="text-sm text-gray-300">
								Expires {formatDate(data.visa.activeVisa.expiresAt)}
							</p>
							{#if data.visa.activeVisa.cost > 0}
								<p class="text-xs text-gray-500 mt-1">
									Cost: ${Number(data.visa.activeVisa.cost).toLocaleString()}
									(Tax: ${Number(data.visa.activeVisa.taxPaid).toLocaleString()})
								</p>
							{/if}
						</div>
						<div class="flex flex-col items-end gap-2">
							<span
								class="px-3 py-1 rounded-full text-xs font-medium border"
								class:bg-emerald-500-20={daysLeft > 3}
								class:border-emerald-500-30={daysLeft > 3}
								class:text-emerald-400={daysLeft > 3}
								class:bg-amber-500-20={daysLeft <= 3}
								class:border-amber-500-30={daysLeft <= 3}
								class:text-amber-400={daysLeft <= 3}
							>
								{daysLeft} day{daysLeft === 1 ? "" : "s"} left
							</span>
						</div>
					</div>
				</div>
			{:else if data.visa.hasPendingApplication}
				<!-- Pending Application -->
				<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-4">
					<div class="flex items-center gap-3">
						<FluentClock20Filled class="size-5 text-amber-400" />
						<div>
							<p class="font-semibold text-white">Application Pending</p>
							<p class="text-sm text-gray-400 mt-1">Awaiting approval from Foreign Minister</p>
						</div>
					</div>
				</div>
			{:else}
				<!-- Purchase/Apply for Visa -->
				<div class="space-y-3">
					{#if data.visa.settings}
						{#if data.visa.settings.visaRequired}
							<div class="bg-slate-700/30 rounded-lg p-4">
								<div class="flex items-center justify-between mb-3">
									<div>
										<p class="font-semibold text-white">Visa Cost</p>
										<p class="text-sm text-gray-400">Valid for 2 weeks</p>
									</div>
									<div class="text-right">
										<p class="text-2xl font-bold text-white">
											${Number(data.visa.settings.visaCost).toLocaleString()}
										</p>
										<p class="text-xs text-gray-500">
											Tax: {data.visa.settings.visaTaxRate}% (${Math.floor(
												(Number(data.visa.settings.visaCost) * data.visa.settings.visaTaxRate) / 100
											).toLocaleString()})
										</p>
									</div>
								</div>

								{#if !data.visa.settings.autoApprove}
									<div class="bg-amber-600/10 border border-amber-500/20 rounded p-3 mb-3">
										<p class="text-xs text-amber-300 flex items-center gap-2">
											<FluentClock20Filled class="size-4" />
											Manual approval required - Foreign Minister will review your application
										</p>
									</div>
								{/if}

								<form method="POST" action="?/purchaseVisa" use:enhance>
									<button type="submit" class="btn w-full bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2">
										<FluentBookCompass24Filled class="size-5" />
										{#if data.visa.settings.autoApprove}
											Purchase Visa
										{:else}
											Apply for Visa
										{/if}
									</button>
								</form>
							</div>
						{:else}
							<!-- Open Borders -->
							<div class="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
								<div class="flex items-center gap-3 mb-3">
									<FluentCheckmark20Filled class="size-5 text-emerald-400" />
									<div>
										<p class="font-semibold text-white">Open Borders</p>
										<p class="text-sm text-gray-400">Free entry for all visitors</p>
									</div>
								</div>

								<form method="POST" action="?/purchaseVisa" use:enhance>
									<button
										type="submit"
										class="btn w-full bg-emerald-600 hover:bg-emerald-500 border-0 text-white gap-2"
									>
										<FluentCheckmark20Filled class="size-5" />
										Get Free Visa
									</button>
								</form>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<FluentPeople20Filled class="size-8 text-blue-400 mb-2" />
			<p class="text-2xl font-bold text-white">{data.population.toLocaleString()}</p>
			<p class="text-xs text-gray-400 mt-1">Population</p>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<div class="size-8 bg-purple-600/20 rounded-lg flex items-center justify-center mb-2">
				<span class="text-lg">🏗️</span>
			</div>
			<p class="text-2xl font-bold text-white">{data.region.infrastructure || 0}</p>
			<p class="text-xs text-gray-400 mt-1">Infrastructure</p>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<div class="size-8 bg-green-600/20 rounded-lg flex items-center justify-center mb-2">
				<span class="text-lg">💰</span>
			</div>
			<p class="text-2xl font-bold text-white">{data.region.economy || 0}</p>
			<p class="text-xs text-gray-400 mt-1">Economy</p>
		</div>

		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4">
			<div class="size-8 bg-amber-600/20 rounded-lg flex items-center justify-center mb-2">
				<span class="text-lg">🎓</span>
			</div>
			<p class="text-2xl font-bold text-white">{data.region.education || 0}</p>
			<p class="text-xs text-gray-400 mt-1">Education</p>
		</div>
	</div>

	<!-- Governor (only show for state regions) -->
	{#if !isIndependent}
		{#if data.governor}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<h2 class="text-lg font-semibold text-white mb-4">Governor</h2>
				<a
					href="/user/{data.governor.userId}"
					class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
				>
					<div class="size-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
						<span class="text-xl">👑</span>
					</div>
					<div class="flex-1">
						<p class="font-semibold text-white group-hover:text-amber-400 transition-colors">
							{data.governor.name}
						</p>
						<p class="text-xs text-gray-400">
							Appointed {formatDate(data.governor.appointedAt)}
						</p>
					</div>
				</a>
			</div>
		{:else}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<h2 class="text-lg font-semibold text-white mb-2">Governor</h2>
				<p class="text-sm text-gray-400">No governor appointed</p>
			</div>
		{/if}
	{/if}

	<!-- Factories -->
	{#if data.factories.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<h2 class="text-lg font-semibold text-white mb-4">Factories</h2>
			<div class="grid gap-3">
				{#each data.factories as factory}
					<a
						href="/factory/{factory.id}"
						class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
					>
						<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
							<FluentBriefcase20Filled class="size-5 text-purple-400" />
						</div>
						<div class="flex-1">
							<p class="font-semibold text-white group-hover:text-purple-400 transition-colors">
								{factory.name}
							</p>
							<p class="text-xs text-gray-400 capitalize">
								{factory.factoryType} • {factory.company.name}
							</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Resources -->
	{#if data.region.oil || data.region.steel || data.region.chromium || data.region.tungsten || data.region.rubber || data.region.aluminium}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<h2 class="text-lg font-semibold text-white mb-4">Natural Resources</h2>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#if data.region.oil}
					<div class="bg-amber-600/10 border border-amber-600/20 rounded-lg p-3">
						<p class="text-xs text-amber-400 font-medium">Oil</p>
						<p class="text-lg font-bold text-white">{data.region.oil}</p>
					</div>
				{/if}
				{#if data.region.steel}
					<div class="bg-gray-600/10 border border-gray-600/20 rounded-lg p-3">
						<p class="text-xs text-gray-400 font-medium">Steel</p>
						<p class="text-lg font-bold text-white">{data.region.steel}</p>
					</div>
				{/if}
				{#if data.region.chromium}
					<div class="bg-blue-600/10 border border-blue-600/20 rounded-lg p-3">
						<p class="text-xs text-blue-400 font-medium">Chromium</p>
						<p class="text-lg font-bold text-white">{data.region.chromium}</p>
					</div>
				{/if}
				{#if data.region.tungsten}
					<div class="bg-purple-600/10 border border-purple-600/20 rounded-lg p-3">
						<p class="text-xs text-purple-400 font-medium">Tungsten</p>
						<p class="text-lg font-bold text-white">{data.region.tungsten}</p>
					</div>
				{/if}
				{#if data.region.rubber}
					<div class="bg-green-600/10 border border-green-600/20 rounded-lg p-3">
						<p class="text-xs text-green-400 font-medium">Rubber</p>
						<p class="text-lg font-bold text-white">{data.region.rubber}</p>
					</div>
				{/if}
				{#if data.region.aluminium}
					<div class="bg-slate-600/10 border border-slate-600/20 rounded-lg p-3">
						<p class="text-xs text-slate-400 font-medium">Aluminium</p>
						<p class="text-lg font-bold text-white">{data.region.aluminium}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
