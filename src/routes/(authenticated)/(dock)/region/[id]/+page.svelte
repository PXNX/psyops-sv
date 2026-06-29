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
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";

	import Logo from "$lib/component/Logo.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import StatCard from "$lib/component/StatCard.svelte";
	import Modal from "$lib/component/Modal.svelte";

	import { formatDate, getDaysRemaining } from "$lib/utils/formatting";
	import BorderingRegions from "./BorderingRegions.svelte";
	import ResidenceActions from "./ResidenceActions.svelte";
	import TravelBanner from "./TravelBanner.svelte";

	const { data, form } = $props();

	let showVisaSheet = $state(false);

	const isIndependent = $derived(!data.region.stateId);

	// Calculate remaining cooldown time
	function getCooldownRemaining(cooldownEndsAt: string) {
		const now = new Date().getTime();
		const endsAt = new Date(cooldownEndsAt).getTime();
		const diffMs = endsAt - now;

		if (diffMs <= 0) return null;

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		return { hours, minutes };
	}
</script>

<svelte:head>
	<title>{data.region.name}</title>
	<meta
		name="description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.region.name} />
	<meta
		property="og:description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>
	<meta property="og:image" content={`/coats/${data.region.id}.svg`} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.region.name} />
	<meta
		name="twitter:description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>
	<meta name="twitter:image" content={`/coats/${data.region.id}.svg`} />
</svelte:head>

<PageContainer maxWidth="4xl">
	<!-- Hero Header -->
	<div
		class="relative -mx-4 -mt-6 px-4 pt-8 pb-6 mb-2 bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-blue-900/30 border-b border-white/5"
	>
		<div class="max-w-4xl mx-auto flex items-center gap-5">
			<Logo
				src="/coats/{data.region.id}.svg"
				alt={data.region.name}
				class="size-24 rounded-2xl shadow-2xl"
				placeholderIcon={FluentShield20Filled}
				placeholderGradient="from-purple-500 to-blue-500"
			/>
			<div class="flex-1">
				<h1 class="text-3xl sm:text-4xl font-bold text-white">{data.region.name}</h1>
				{#if data.region.stateName}
					<p class="text-gray-400 mt-1.5 text-lg">
						<a href="/state/{data.region.stateId}" class="hover:text-purple-400 transition-colors">
							{data.region.stateName}
						</a>
					</p>
				{:else}
					<p class="text-amber-400 mt-1.5 text-lg flex items-center gap-2">
						<FluentFlag20Filled class="size-5" />
						Independent Region
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Independent Region Info -->
	{#if isIndependent}
		<div class="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentFlag20Filled class="size-6 text-amber-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-white mb-1">No State Established</h2>
					<p class="text-sm text-gray-300">
						This region is not part of any state. To establish a state here, <a
							href="/party/create"
							class="text-amber-400 hover:text-amber-300 underline underline-offset-2">create a political party</a
						> — founding a party will create a new state in this region.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Current Region Banner -->
	{#if data.hasResidence}
		<div class="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentHome20Filled class="size-6 text-blue-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-bold text-white mb-2">Your Current Region</h2>
					<p class="text-gray-300 text-sm">You are currently located in this region.</p>
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
			walletBalance={data.walletBalance}
		/>
	{/if}

	<!-- Visa Status / Requirements -->
	{#if data.visa.blocVisaFree}
		<!-- Bloc visa-free: no visa needed -->
		<div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-xl p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentCheckmark20Filled class="size-5 text-emerald-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-white">Visa-Free</h2>
					<p class="text-sm text-emerald-300">Bloc membership grants visa-free travel to this state</p>
				</div>
			</div>
		</div>
	{:else if data.visa.blockedReason}
		<!-- Visa blocked by war or sanctions -->
		<div class="bg-gradient-to-br from-red-900/30 to-slate-900/30 border border-red-500/20 rounded-xl p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
					<FluentWarning20Filled class="size-5 text-red-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-white">Visa Unavailable</h2>
					<p class="text-sm text-red-300">{data.visa.blockedReason}</p>
				</div>
			</div>
		</div>
	{:else if data.visa.needsVisa}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
					<FluentBookCompass24Filled class="size-6 text-purple-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-white">Visa Required</h2>
					<p class="text-sm text-gray-400">A visa is required for non-citizens</p>
				</div>
				{#if !data.visa.hasActiveVisa && !data.visa.hasPendingApplication && data.visa.settings}
					<button
						type="button"
						onclick={() => (showVisaSheet = true)}
						class="btn btn-sm bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
					>
						<FluentBookCompass24Filled class="size-4" />
						Request Visa
					</button>
				{/if}
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
			{/if}
		</div>
	{/if}

	<!-- Visa Request Bottom Sheet -->
	{#if data.visa.settings && !data.visa.blocVisaFree}
		<Modal bind:open={showVisaSheet} title="Request Visa" size="default">
			<div class="space-y-5">
				<div class="flex items-center gap-4">
					<div class="size-14 bg-purple-600/20 rounded-xl flex items-center justify-center">
						<FluentBookCompass24Filled class="size-7 text-purple-400" />
					</div>
					<div>
						<h3 class="text-xl font-bold text-white">{data.region.stateName}</h3>
						<p class="text-sm text-gray-400">Travel Visa Application</p>
					</div>
				</div>

				{#if data.visa.settings.visaRequired}
					<div class="bg-slate-700/30 rounded-lg p-4 space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-400">Visa Cost</span>
							<span class="text-xl font-bold text-white">${Number(data.visa.settings.visaCost).toLocaleString()}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-400">Tax ({data.visa.settings.visaTaxRate}%)</span>
							<span class="text-sm text-gray-300"
								>${Math.floor(
									(Number(data.visa.settings.visaCost) * data.visa.settings.visaTaxRate) / 100
								).toLocaleString()}</span
							>
						</div>
						<div class="border-t border-white/10 pt-2 flex items-center justify-between">
							<span class="text-sm text-gray-400">Valid for</span>
							<span class="text-sm font-medium text-white">14 days</span>
						</div>
					</div>

					{#if !data.visa.settings.autoApprove}
						<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-3">
							<p class="text-xs text-amber-300 flex items-center gap-2">
								<FluentClock20Filled class="size-4" />
								Manual approval required — Foreign Minister will review your application
							</p>
						</div>
					{/if}

					<form
						method="POST"
						action="?/purchaseVisa"
						use:enhance={() => {
							return async ({ result }) => {
								showVisaSheet = false;
								window.location.reload();
							};
						}}
					>
						<button
							type="submit"
							class="btn w-full bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
							disabled={data.walletBalance < Number(data.visa.settings.visaCost)}
						>
							<FluentBookCompass24Filled class="size-5" />
							{#if data.visa.settings.autoApprove}
								Purchase Visa — ${Number(data.visa.settings.visaCost).toLocaleString()}
							{:else}
								Apply for Visa
							{/if}
						</button>
						{#if data.walletBalance < Number(data.visa.settings.visaCost)}
							<p class="text-xs text-red-400 text-center mt-2">
								Insufficient funds — you have ${data.walletBalance.toLocaleString()}
							</p>
						{/if}
					</form>
				{:else}
					<div class="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
						<div class="flex items-center gap-3 mb-1">
							<FluentCheckmark20Filled class="size-5 text-emerald-400" />
							<p class="font-semibold text-white">Open Borders</p>
						</div>
						<p class="text-sm text-gray-400">Free entry for all visitors — valid for 14 days</p>
					</div>

					<form
						method="POST"
						action="?/purchaseVisa"
						use:enhance={() => {
							return async ({ result }) => {
								showVisaSheet = false;
								window.location.reload();
							};
						}}
					>
						<button type="submit" class="btn w-full bg-emerald-600 hover:bg-emerald-500 border-0 text-white gap-2">
							<FluentCheckmark20Filled class="size-5" />
							Get Free Visa
						</button>
					</form>
				{/if}
			</div>
		</Modal>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
		<StatCard
			icon={FluentPeople20Filled}
			label="Population"
			value={data.population}
			color="blue"
			href="/region/{data.region.id}/population"
		/>
		<StatCard label="Infrastructure" value={data.region.infrastructure || 0} color="purple" />
		<StatCard label="Economy" value={data.region.economy || 0} color="green" />
		<StatCard label="Education" value={data.region.education || 0} color="amber" />
	</div>

	<!-- Governor -->
	{#if !isIndependent}
		{#if data.governor}
			<SectionCard>
				<div class="flex items-center gap-2 mb-4">
					<span class="text-xl">👑</span>
					<h2 class="text-lg font-semibold text-white">Governor</h2>
				</div>
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
			</SectionCard>
		{:else}
			<SectionCard>
				<div class="flex items-center gap-2 mb-2">
					<span class="text-xl">👑</span>
					<h2 class="text-lg font-semibold text-white">Governor</h2>
				</div>
				<p class="text-sm text-gray-400">No governor appointed</p>
			</SectionCard>
		{/if}
	{/if}

	<!-- State Buildings -->
	{#if data.buildings.length > 0}
		<SectionCard>
			<div class="flex items-center gap-2 mb-4">
				<FluentBuilding20Filled class="size-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">State Buildings</h2>
			</div>
			<div class="grid gap-3">
				{#each data.buildings as building}
					<div class="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
						<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
							<FluentBuilding20Filled class="size-5 text-blue-400" />
						</div>
						<div class="flex-1">
							<p class="font-semibold text-white">
								{building.name}
							</p>
							<p class="text-xs text-gray-400 capitalize">{building.buildingType.replace("_", " ")}</p>
						</div>
					</div>
				{/each}
			</div>
		</SectionCard>
	{/if}

	<!-- Factories -->
	{#if data.factories.length > 0}
		<SectionCard>
			<div class="flex items-center gap-2 mb-4">
				<FluentBriefcase20Filled class="size-5 text-purple-400" />
				<h2 class="text-lg font-semibold text-white">Factories</h2>
			</div>
			<div class="grid gap-3">
				{#each data.factories as factory}
					<a
						href="/factory/{factory.id}"
						class="flex items-center gap-3 group bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-all"
					>
						<div class="size-10 rounded-lg overflow-hidden flex items-center justify-center bg-purple-600/20">
							{#if factory.companyLogoUrl}
								<Logo
									src={factory.companyLogoUrl}
									alt={factory.company?.name || "Company"}
									class="size-10"
									placeholderIcon={FluentBriefcase20Filled}
									placeholderGradient="from-purple-600 to-blue-600"
								/>
							{:else}
								<FluentBriefcase20Filled class="size-5 text-purple-400" />
							{/if}
						</div>
						<div class="flex-1">
							<p class="font-semibold text-white group-hover:text-purple-400 transition-colors">
								{factory.name}
							</p>
							<p class="text-xs text-gray-400 capitalize">{factory.factoryType} • {factory.company?.name}</p>
						</div>
					</a>
				{/each}
			</div>
		</SectionCard>
	{/if}

	<!-- Resources -->
	{#if data.region.oil || data.region.steel || data.region.chromium || data.region.tungsten || data.region.rubber || data.region.aluminium}
		<SectionCard>
			<div class="flex items-center gap-2 mb-4">
				<span class="text-lg">⛏️</span>
				<h2 class="text-lg font-semibold text-white">Natural Resources</h2>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#if data.region.oil}
					<div class="bg-amber-600/10 border border-amber-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">⛽</span>
						<div>
							<p class="text-xs text-amber-400 font-medium">Oil</p>
							<p class="text-lg font-bold text-white">{data.region.oil}</p>
						</div>
					</div>
				{/if}
				{#if data.region.steel}
					<div class="bg-gray-600/10 border border-gray-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">🔩</span>
						<div>
							<p class="text-xs text-gray-400 font-medium">Steel</p>
							<p class="text-lg font-bold text-white">{data.region.steel}</p>
						</div>
					</div>
				{/if}
				{#if data.region.chromium}
					<div class="bg-blue-600/10 border border-blue-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">💎</span>
						<div>
							<p class="text-xs text-blue-400 font-medium">Chromium</p>
							<p class="text-lg font-bold text-white">{data.region.chromium}</p>
						</div>
					</div>
				{/if}
				{#if data.region.tungsten}
					<div class="bg-purple-600/10 border border-purple-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">⚡</span>
						<div>
							<p class="text-xs text-purple-400 font-medium">Tungsten</p>
							<p class="text-lg font-bold text-white">{data.region.tungsten}</p>
						</div>
					</div>
				{/if}
				{#if data.region.rubber}
					<div class="bg-green-600/10 border border-green-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">🌿</span>
						<div>
							<p class="text-xs text-green-400 font-medium">Rubber</p>
							<p class="text-lg font-bold text-white">{data.region.rubber}</p>
						</div>
					</div>
				{/if}
				{#if data.region.aluminium}
					<div class="bg-slate-600/10 border border-slate-600/20 rounded-lg p-3 flex items-center gap-3">
						<span class="text-2xl">🔘</span>
						<div>
							<p class="text-xs text-slate-400 font-medium">Aluminium</p>
							<p class="text-lg font-bold text-white">{data.region.aluminium}</p>
						</div>
					</div>
				{/if}
			</div>
		</SectionCard>
	{/if}

	<!-- Active Wars Section -->
	{#if data.ongoingBattle}
		<a
			href="/battle/{data.ongoingBattle.id}"
			class="block bg-gradient-to-r from-red-950/40 to-slate-950/30 border-2 border-red-500/40 rounded-xl p-4 sm:p-5 hover:border-red-400/60 transition-all group"
		>
			<div class="flex items-center gap-4">
				<div class="relative flex-shrink-0">
					<div class="absolute inset-0 bg-red-500/30 blur-lg rounded-full animate-pulse"></div>
					<div
						class="relative size-12 bg-red-950/60 rounded-lg border border-red-500/40 flex items-center justify-center"
					>
						<span class="text-2xl">⚔️</span>
					</div>
				</div>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<span class="text-xs text-red-400 font-mono uppercase tracking-widest font-bold">Battle in Progress</span>
					</div>
					<div class="text-sm text-slate-300 font-mono">
						<span class="text-red-400 font-bold">{data.ongoingBattle.attackerState.name}</span>
						<span class="text-slate-600"> → </span>
						<span class="text-blue-400 font-bold"
							>{data.ongoingBattle.defenderState?.name || data.region.stateName}</span
						>
					</div>
				</div>
				<span class="text-slate-500 group-hover:text-red-400 transition-colors">→</span>
			</div>
		</a>
	{:else if data.recentFailedBattle}
		{@const cooldown = getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)}
		{#if cooldown}
			<div class="bg-gradient-to-r from-amber-950/30 to-slate-950/30 border border-amber-500/30 rounded-xl p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="size-10 bg-amber-950/60 rounded-lg border border-amber-500/30 flex items-center justify-center flex-shrink-0"
					>
						<span class="text-xl">🛡️</span>
					</div>
					<div class="flex-1">
						<div class="text-sm font-bold text-amber-400">Region Under Protection</div>
						<div class="flex items-center gap-2 text-xs text-amber-300/70 font-mono mt-1">
							<FluentClock20Filled class="size-3.5" />
							<span>Attackable in {cooldown.hours}h {cooldown.minutes}m</span>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{:else if data.activeWars.length > 0}
		<div class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="flex items-center gap-3 bg-gradient-to-r from-red-950/20 to-slate-900/50 border border-red-500/20 rounded-xl p-4 hover:border-red-400/40 transition-all group"
				>
					<div
						class="size-10 bg-red-950/40 rounded-lg border border-red-500/20 flex items-center justify-center flex-shrink-0"
					>
						<FluentFire20Filled class="size-5 text-red-500" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">Active War</span>
						</div>
						<div class="text-sm text-slate-300">
							<span class="font-bold text-red-400">{war.attacker.name}</span>
							<span class="text-slate-600 mx-1">vs</span>
							<span class="font-bold text-blue-400">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-slate-600 group-hover:text-red-400 transition-colors text-sm">→</span>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Bordering Regions -->
	<BorderingRegions borderingRegions={data.borderingRegions} />
</PageContainer>
