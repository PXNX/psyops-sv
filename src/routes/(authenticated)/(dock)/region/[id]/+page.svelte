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
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFire20Filled from "~icons/fluent/fire-20-filled";
	import FluentNavigation20Filled from "~icons/fluent/navigation-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";

	import Logo from "$lib/component/Logo.svelte";
	import Modal from "$lib/component/Modal.svelte";

	import { formatDate, getDaysRemaining } from "$lib/utils/formatting";
	import BorderingRegions from "./BorderingRegions.svelte";
	import ResidenceActions from "./ResidenceActions.svelte";
	import TravelBanner from "./TravelBanner.svelte";

	const { data, form } = $props();

	const isIndependent = $derived(!data.region.stateId);

	let isStartingBattle = $state(false);
	let showBattleModal = $state(false);
	let selectedWarId = $state<number | null>(null);
	let selectedAttackRegion = $state<number | null>(null);

	function closeBattleModal() {
		showBattleModal = false;
		selectedAttackRegion = null;
		selectedWarId = null;
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Logo
			src="/coats/{data.region.id}.svg"
			alt={data.region.name}
			class="size-20 rounded-xl"
			placeholderIcon={FluentShield20Filled}
			placeholderGradient="from-purple-500 to-blue-500"
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

	<!-- Current Residence Banner -->
	{#if data.hasResidence}
		<div class="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentHome20Filled class="size-6 text-blue-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-white mb-2">Your Current Residence</h2>
					<p class="text-gray-300 text-sm">You are currently a resident of this region.</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Active Travel Banner -->
	{#if data.activeTravel}
		<TravelBanner activeTravel={data.activeTravel} />
	{/if}

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

	<!-- Travel Info Banner (if not living here) -->
	{#if data.travelInfo && !data.hasResidence}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentNavigation20Filled class="size-6 text-blue-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-white mb-2">Travel Information</h3>
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div>
							<p class="text-gray-400">Distance</p>
							<p class="text-white font-semibold">{data.travelInfo.distanceKm} km</p>
						</div>
						<div>
							<p class="text-gray-400">Cost</p>
							<p class="text-white font-semibold flex items-center gap-1">
								<FluentMoney20Filled class="size-4 text-green-400" />
								${data.travelInfo.cost.toLocaleString()}
							</p>
						</div>
						<div>
							<p class="text-gray-400">Travel Time</p>
							<p class="text-white font-semibold flex items-center gap-1">
								<FluentClock20Filled class="size-4 text-amber-400" />
								{data.travelInfo.timeHours}h
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Residence/Travel Actions -->
	{#if !data.hasResidence && !data.activeTravel}
		<ResidenceActions
			regionId={data.region.id}
			regionName={data.region.name}
			{isIndependent}
			allowsFreeMovement={data.allowsFreeMovement}
			hasInauguralElection={data.hasInauguralElection}
			hasPendingResidenceApp={data.hasPendingResidenceApp}
			travelInfo={data.travelInfo}
		/>
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
				<div class="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<FluentCheckmark20Filled class="size-5 text-emerald-400" />
								<p class="font-semibold text-white">Active Visa</p>
							</div>
							<p class="text-sm text-gray-300">Expires {formatDate(data.visa.activeVisa.expiresAt)}</p>
							{#if data.visa.activeVisa.cost > 0}
								<p class="text-xs text-gray-500 mt-1">
									Cost: ${Number(data.visa.activeVisa.cost).toLocaleString()} (Tax: ${Number(
										data.visa.activeVisa.taxPaid
									).toLocaleString()})
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
		<a
			href="/region/{data.region.id}/population"
			class="bg-slate-800/50 rounded-xl border border-white/5 p-4 hover:border-white/10 transition-all cursor-pointer group"
		>
			<FluentPeople20Filled class="size-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
			<p class="text-2xl font-bold text-white">{data.population.toLocaleString()}</p>
			<p class="text-xs text-gray-400 mt-1 group-hover:text-blue-400 transition-colors">Population →</p>
		</a>

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

	<!-- Governor -->
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
						<p class="text-xs text-gray-400">Appointed {formatDate(data.governor.appointedAt)}</p>
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
							<p class="text-xs text-gray-400 capitalize">{factory.factoryType} • {factory.company.name}</p>
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

	<!-- Active Wars Section -->
	{#if data.ongoingBattle}
		<div class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<FluentFire20Filled class="size-8 text-red-500 flex-shrink-0" />
				<div class="flex-1">
					<h2 class="text-2xl font-bold text-red-400 mb-2">Battle in Progress!</h2>
					<p class="text-gray-300 mb-4">{data.ongoingBattle.attackerState.name} is attacking this region</p>
					<a
						href="/battle/{data.ongoingBattle.id}"
						class="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
					>
						<FluentShield20Filled class="size-5" />
						View Battle
					</a>
				</div>
			</div>
		</div>
	{:else if data.activeWars.length > 0 && data.borderingRegionsForAttack.length > 0}
		<div class="bg-slate-800 rounded-xl border border-white/5 p-6">
			<div class="flex items-center gap-3 mb-4">
				<FluentWarning20Filled class="size-6 text-amber-500" />
				<h2 class="text-xl font-bold text-white">Active Wars</h2>
			</div>
			<p class="text-gray-400 mb-4">You can attack this region from your bordering territories.</p>
			<div class="space-y-3">
				{#each data.activeWars as war}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<span class="font-bold text-white">{war.attacker.name}</span>
									<span class="text-gray-400">vs</span>
									<span class="font-bold text-white">{war.defender.name}</span>
								</div>
								<a href="/war/{war.id}" class="text-sm text-purple-400 hover:text-purple-300"> View War Details → </a>
							</div>
							<button
								onclick={() => {
									selectedWarId = war.id;
									showBattleModal = true;
								}}
								class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
							>
								Start Battle
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Bordering Regions -->
	<BorderingRegions borderingRegions={data.borderingRegions} />
</div>

<!-- Battle Region Selection Modal -->
<Modal bind:open={showBattleModal} title="Select Attack Origin" size="default">
	<div class="space-y-4">
		<p class="text-sm text-gray-400">
			Select which of your regions will launch the attack on {data.region.name}:
		</p>

		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each data.borderingRegionsForAttack as region}
				<button
					onclick={() => {
						selectedAttackRegion = region.id;
					}}
					class="w-full flex items-center justify-between p-4 rounded-lg border transition-all"
					class:border-white-10={selectedAttackRegion !== region.id}
					class:bg-slate-700-30={selectedAttackRegion !== region.id}
					class:border-purple-500={selectedAttackRegion === region.id}
					class:bg-purple-600-10={selectedAttackRegion === region.id}
				>
					<div class="text-left">
						<p class="font-semibold text-white">{region.name}</p>
						<p class="text-xs text-gray-400">{region.distanceKm} km to target</p>
					</div>
					{#if selectedAttackRegion === region.id}
						<FluentCheckmark20Filled class="size-5 text-purple-400" />
					{/if}
				</button>
			{/each}
		</div>

		<form
			method="POST"
			action="?/startBattle"
			use:enhance={() => {
				isStartingBattle = true;
				return async ({ update }) => {
					await update();
					isStartingBattle = false;
					showBattleModal = false;
				};
			}}
		>
			<input type="hidden" name="warId" value={selectedWarId} />
			<input type="hidden" name="attackFromRegionId" value={selectedAttackRegion} />
			<button
				type="submit"
				disabled={!selectedAttackRegion || isStartingBattle}
				class="btn w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 border-0 text-white"
			>
				{isStartingBattle ? "Starting Battle..." : "Launch Attack"}
			</button>
		</form>
	</div>
</Modal>
