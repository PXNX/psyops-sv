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

	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import StatCard from "#lib/component/StatCard.svelte";
	import Modal from "#lib/component/Modal.svelte";

	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDate, getDaysRemaining } from "#lib/utils/formatting.js";
	import BorderingRegions from "./BorderingRegions.svelte";
	import ResidenceActions from "./ResidenceActions.svelte";
	import TravelBanner from "./TravelBanner.svelte";

	const { data, form } = $props();

	let showVisaSheet = $state(false);
	let isAttacking = $state(false);

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

	const canAttack = $derived(
		!data.ongoingBattle &&
			!(data.recentFailedBattle && getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)) &&
			data.attackableWars.length > 0 &&
			data.borderingRegionsForAttack.length > 0
	);
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

<PageContainer maxWidth="5xl">
	<!-- Hero Header -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-5">
			<Logo
				src="/coats/{data.region.id}.svg"
				alt={data.region.name}
				class="size-20 rounded-sm shrink-0"
				placeholderIcon={FluentShield20Filled}
				placeholderGradient="from-[#8a4fc0]/40 to-[#8a4fc0]/40"
			/>
			<div class="flex-1 min-w-0">
				<h1 class="text-3xl font-bold text-[#f5efd8] break-words">{data.region.name}</h1>
				{#if data.region.stateName}
					<p class="text-[#a8a083] mt-1">
						<a href="/state/{data.region.stateId}" class="hover:text-[#ffcf47] transition-colors">
							{data.region.stateName}
						</a>
					</p>
				{:else}
					<p class="text-[#ffd35c] mt-1 flex items-center gap-2">
						<FluentFlag20Filled class="size-5" />
						Independent Region
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Independent Region Info -->
	{#if isIndependent}
		<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-[#f2b01e]/15 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentFlag20Filled class="size-6 text-[#ffd35c]" />
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-[#f5efd8] mb-1">No State Established</h2>
					<p class="text-sm text-[#d3caa9]">
						This region is not part of any state. To establish a state here, <a
							href="/party/create"
							class="text-[#ffd35c] hover:text-[#ffcf47] underline underline-offset-2">create a political party</a
						> — founding a party will create a new state in this region.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Current Region Banner -->
	{#if data.hasResidence}
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-[#2369b5]/25 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentHome20Filled class="size-6 text-[#b3dcff]" />
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-[#f5efd8] mb-1">Your Current Region</h2>
					<p class="text-[#d3caa9] text-sm">You are currently located in this region.</p>
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
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 flex-shrink-0" />
			<div class="flex-1 text-sm">{form.error}</div>
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-[#6fd14a] flex-shrink-0" />
			<div class="flex-1 text-sm">{form.message}</div>
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
		<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-[#3f8a2a]/25 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentCheckmark20Filled class="size-5 text-[#6fd14a]" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-[#f5efd8]">Visa-Free</h2>
					<p class="text-sm text-[#b9f29a]">Bloc membership grants visa-free travel to this state</p>
				</div>
			</div>
		</div>
	{:else if data.visa.blockedReason}
		<!-- Visa blocked by war or sanctions -->
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex items-center gap-3">
				<div class="size-12 bg-red-600/15 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentWarning20Filled class="size-5 text-red-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-[#f5efd8]">Visa Unavailable</h2>
					<p class="text-sm text-red-300">{data.visa.blockedReason}</p>
				</div>
			</div>
		</div>
	{:else if data.visa.needsVisa}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex flex-wrap items-center gap-3">
				<div class="size-12 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
					<FluentBookCompass24Filled class="size-6 text-[#5eaef5]" />
				</div>
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-semibold text-[#f5efd8]">Visa Required</h2>
					<p class="text-sm text-[#a8a083]">A visa is required for non-citizens</p>
				</div>
				{#if !data.visa.hasActiveVisa && !data.visa.hasPendingApplication && data.visa.settings}
					<Button
						type="button"
						size="sm"
						variant="soft-blue"
						icon={FluentBookCompass24Filled}
						onclick={() => (showVisaSheet = true)}
					>
						Request Visa
					</Button>
				{/if}
			</div>

			{#if data.visa.hasActiveVisa && data.visa.activeVisa}
				{@const daysLeft = getDaysRemaining(data.visa.activeVisa.expiresAt)}
				<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<FluentCheckmark20Filled class="size-5 text-[#6fd14a]" />
								<p class="font-semibold text-[#f5efd8]">Active Visa</p>
							</div>
							<p class="text-sm text-[#d3caa9]">Expires {formatDate(data.visa.activeVisa.expiresAt)}</p>
							{#if data.visa.activeVisa.cost > 0}
								<p class="text-xs text-[#a8a083] mt-1">
									Cost: ${Number(data.visa.activeVisa.cost).toLocaleString()} (Tax: ${Number(
										data.visa.activeVisa.taxPaid
									).toLocaleString()})
								</p>
							{/if}
						</div>
						<div class="flex flex-col items-end gap-2">
							<Badge tone={daysLeft > 3 ? "green" : "amber"}>
								{daysLeft} day{daysLeft === 1 ? "" : "s"} left
							</Badge>
						</div>
					</div>
				</div>
			{:else if data.visa.hasPendingApplication}
				<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4">
					<div class="flex items-center gap-3">
						<FluentClock20Filled class="size-5 text-[#ffd35c]" />
						<div>
							<p class="font-semibold text-[#f5efd8]">Application Pending</p>
							<p class="text-sm text-[#a8a083] mt-1">Awaiting approval from Foreign Minister</p>
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
					<div class="size-14 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
						<FluentBookCompass24Filled class="size-7 text-[#5eaef5]" />
					</div>
					<div>
						<h3 class="text-xl font-bold text-[#f5efd8]">{data.region.stateName}</h3>
						<p class="text-sm text-[#a8a083]">Travel Visa Application</p>
					</div>
				</div>

				{#if data.visa.settings.visaRequired}
					<div class="panel-muted rounded-sm p-4 space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-[#a8a083]">Visa Cost</span>
							<span class="text-xl font-bold font-mono text-[#f5efd8]"
								>${Number(data.visa.settings.visaCost).toLocaleString()}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-[#a8a083]">Tax ({data.visa.settings.visaTaxRate}%)</span>
							<span class="text-sm font-mono text-[#d3caa9]"
								>${Math.floor(
									(Number(data.visa.settings.visaCost) * data.visa.settings.visaTaxRate) / 100
								).toLocaleString()}</span
							>
						</div>
						<div class="border-t border-[#c8b47a]/10 pt-2 flex items-center justify-between">
							<span class="text-sm text-[#a8a083]">Valid for</span>
							<span class="text-sm font-medium text-[#f5efd8]">14 days</span>
						</div>
					</div>

					{#if !data.visa.settings.autoApprove}
						<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3">
							<p class="text-xs text-[#ffd35c] flex items-center gap-2">
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
						<Button
							type="submit"
							block
							icon={FluentBookCompass24Filled}
							disabled={data.walletBalance < Number(data.visa.settings.visaCost)}
						>
							{#if data.visa.settings.autoApprove}
								Purchase Visa — ${Number(data.visa.settings.visaCost).toLocaleString()}
							{:else}
								Apply for Visa
							{/if}
						</Button>
						{#if data.walletBalance < Number(data.visa.settings.visaCost)}
							<p class="text-xs text-red-400 text-center mt-2">
								Insufficient funds — you have ${data.walletBalance.toLocaleString()}
							</p>
						{/if}
					</form>
				{:else}
					<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
						<div class="flex items-center gap-3 mb-1">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a]" />
							<p class="font-semibold text-[#f5efd8]">Open Borders</p>
						</div>
						<p class="text-sm text-[#a8a083]">Free entry for all visitors — valid for 14 days</p>
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
						<Button type="submit" block icon={FluentCheckmark20Filled}>Get Free Visa</Button>
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
				<h2 class="section-title mb-4">
					<span class="text-xl">👑</span>
					Governor
				</h2>
				<a
					href="/user/{data.governor.userId}"
					class="flex items-center gap-3 group panel-muted rounded-sm p-3 hover:border-[#f2b01e]/55 hover:bg-[#2e3524] transition-all"
				>
					<div class="size-10 bg-[#f2b01e]/12 rounded-sm flex items-center justify-center">
						<span class="text-xl">👑</span>
					</div>
					<div class="flex-1">
						<p class="font-semibold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors">
							{data.governor.name}
						</p>
						<p class="text-xs text-[#a8a083]">Appointed {formatDate(data.governor.appointedAt)}</p>
					</div>
				</a>
			</SectionCard>
		{:else}
			<SectionCard>
				<h2 class="section-title mb-2">
					<span class="text-xl">👑</span>
					Governor
				</h2>
				<p class="text-sm text-[#a8a083]">No governor appointed</p>
			</SectionCard>
		{/if}
	{/if}

	<!-- State Buildings -->
	{#if data.buildings.length > 0}
		<SectionCard>
			<h2 class="section-title mb-4">
				<FluentBuilding20Filled class="size-5 text-[#5eaef5]" />
				State Buildings
			</h2>
			<div class="grid gap-3">
				{#each data.buildings as building}
					<div class="flex items-center gap-3 panel-muted rounded-sm p-3">
						<div class="size-10 bg-[#2369b5]/18 rounded-sm flex items-center justify-center">
							<FluentBuilding20Filled class="size-5 text-[#5eaef5]" />
						</div>
						<div class="flex-1">
							<p class="font-semibold text-[#f5efd8]">
								{building.name}
							</p>
							<p class="text-xs text-[#a8a083] capitalize">{building.buildingType.replace("_", " ")}</p>
						</div>
					</div>
				{/each}
			</div>
		</SectionCard>
	{/if}

	<!-- Factories -->
	{#if data.factories.length > 0}
		<SectionCard>
			<h2 class="section-title mb-4">
				<FluentBriefcase20Filled class="size-5 text-[#c08cf0]" />
				Factories
			</h2>
			<div class="grid gap-3">
				{#each data.factories as factory}
					<a
						href="/factory/{factory.id}"
						class="flex items-center gap-3 group panel-muted rounded-sm p-3 hover:border-[#f2b01e]/55 hover:bg-[#2e3524] transition-all"
					>
						<div class="size-10 rounded-sm overflow-hidden flex items-center justify-center bg-[#8a4fc0]/15">
							{#if factory.companyLogoUrl}
								<Logo
									src={factory.companyLogoUrl}
									alt={factory.company?.name || "Company"}
									class="size-10"
									placeholderIcon={FluentBriefcase20Filled}
									placeholderGradient="from-[#8a4fc0]/40 to-[#8a4fc0]/40"
								/>
							{:else}
								<FluentBriefcase20Filled class="size-5 text-[#e3cbfb]" />
							{/if}
						</div>
						<div class="flex-1">
							<p class="font-semibold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors">
								{factory.name}
							</p>
							<p class="text-xs text-[#a8a083] capitalize">{factory.factoryType} • {factory.company?.name}</p>
						</div>
					</a>
				{/each}
			</div>
		</SectionCard>
	{/if}

	<!-- Resources -->
	{#if data.region.oil || data.region.steel || data.region.chromium || data.region.tungsten || data.region.rubber || data.region.aluminium}
		<SectionCard>
			<h2 class="section-title mb-4">
				<span class="text-lg">⛏️</span>
				Natural Resources
			</h2>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#if data.region.oil}
					<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">⛽</span>
						<div>
							<p class="text-[10px] text-[#ffd35c] uppercase tracking-wide">Oil</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.oil}</p>
						</div>
					</div>
				{/if}
				{#if data.region.steel}
					<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">🔩</span>
						<div>
							<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Steel</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.steel}</p>
						</div>
					</div>
				{/if}
				{#if data.region.chromium}
					<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">💎</span>
						<div>
							<p class="text-[10px] text-[#b3dcff] uppercase tracking-wide">Chromium</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.chromium}</p>
						</div>
					</div>
				{/if}
				{#if data.region.tungsten}
					<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">⚡</span>
						<div>
							<p class="text-[10px] text-[#e3cbfb] uppercase tracking-wide">Tungsten</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.tungsten}</p>
						</div>
					</div>
				{/if}
				{#if data.region.rubber}
					<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">🌿</span>
						<div>
							<p class="text-[10px] text-[#b9f29a] uppercase tracking-wide">Rubber</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.rubber}</p>
						</div>
					</div>
				{/if}
				{#if data.region.aluminium}
					<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
						<span class="text-2xl">🔘</span>
						<div>
							<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Aluminium</p>
							<p class="text-lg font-bold text-[#f5efd8]">{data.region.aluminium}</p>
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
			class="block bg-red-600/10 border border-red-500/30 rounded-sm p-4 sm:p-5 hover:border-red-400/50 transition-all group"
		>
			<div class="flex items-center gap-4">
				<div
					class="size-12 flex-shrink-0 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center"
				>
					<span class="text-2xl">⚔️</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-1">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<span class="text-xs text-red-300 uppercase tracking-widest font-bold">Battle in Progress</span>
					</div>
					<div class="text-sm text-[#d3caa9]">
						<span class="text-red-300 font-bold">{data.ongoingBattle.attackerState.name}</span>
						<span class="text-[#a8a083]"> → </span>
						<span class="text-[#b3dcff] font-bold"
							>{data.ongoingBattle.defenderState?.name || data.region.stateName}</span
						>
					</div>
				</div>
				<span class="text-[#a8a083] group-hover:text-red-300 transition-colors">→</span>
			</div>
		</a>
	{:else if data.recentFailedBattle}
		{@const cooldown = getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)}
		{#if cooldown}
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="size-10 bg-[#f2b01e]/15 rounded-sm border border-[#f2b01e]/35 flex items-center justify-center flex-shrink-0"
					>
						<span class="text-xl">🛡️</span>
					</div>
					<div class="flex-1">
						<div class="text-sm font-bold text-[#ffd35c]">Region Under Protection</div>
						<div class="flex items-center gap-2 text-xs text-[#a8a083] mt-1">
							<FluentClock20Filled class="size-3.5" />
							<span>Attackable in <span class="font-mono">{cooldown.hours}h {cooldown.minutes}m</span></span>
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
					class="flex items-center gap-3 bg-red-600/10 border border-red-500/30 rounded-sm p-4 hover:border-red-400/50 transition-all group"
				>
					<div
						class="size-10 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center flex-shrink-0"
					>
						<FluentFire20Filled class="size-5 text-red-400" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-300 uppercase tracking-widest">Active War</span>
						</div>
						<div class="text-sm text-[#d3caa9]">
							<span class="font-bold text-red-300">{war.attacker.name}</span>
							<span class="text-[#a8a083] mx-1">vs</span>
							<span class="font-bold text-[#b3dcff]">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-[#a8a083] group-hover:text-red-300 transition-colors text-sm">→</span>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Launch Attack -->
	{#if canAttack}
		<SectionCard>
			<h2 class="section-title mb-4">
				<FluentFire20Filled class="size-5 text-red-400" />
				Launch Attack
			</h2>
			<form
				method="POST"
				action="?/startBattle"
				use:enhance={() => {
					isAttacking = true;
					return async ({ update }) => {
						isAttacking = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				{#if data.attackableWars.length > 1}
					<div>
						<label class="field-label" for="warId">War</label>
						<select id="warId" name="warId" class="field-control rounded-sm px-3 py-2.5 w-full">
							{#each data.attackableWars as war}
								<option value={war.id}>{war.attacker.name} vs {war.defender.name}</option>
							{/each}
						</select>
					</div>
				{:else}
					<input type="hidden" name="warId" value={data.attackableWars[0].id} />
				{/if}

				<div>
					<label class="field-label" for="attackFromRegionId">Attack From</label>
					<select id="attackFromRegionId" name="attackFromRegionId" class="field-control rounded-sm px-3 py-2.5 w-full">
						{#each data.borderingRegionsForAttack as border}
							<option value={border.id}>{border.name} ({Math.round(border.distanceKm)} km)</option>
						{/each}
					</select>
				</div>

				<Button type="submit" variant="danger" block icon={FluentFire20Filled} disabled={isAttacking}>
					{isAttacking ? "Launching Attack..." : "Launch Attack"}
				</Button>
			</form>
		</SectionCard>
	{/if}

	<!-- Bordering Regions -->
	<BorderingRegions borderingRegions={data.borderingRegions} />
</PageContainer>
