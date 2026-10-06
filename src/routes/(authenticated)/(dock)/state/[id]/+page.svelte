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
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";

	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentShieldError20Filled from "~icons/fluent/shield-error-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import ProfileItem from "#lib/component/ProfileItem.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { enhance } from "$app/forms";

	const { data } = $props();

	let showWarModal = $state(false);
	let isDeclaringWar = $state(false);
	let showVisaSheet = $state(false);
	let isApplyingResidence = $state(false);

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
	<!-- Hero -->
	<div
		class="panel rounded-sm p-5 relative"
		style={data.bloc ? `border-top: 3px solid ${data.bloc.color};` : undefined}
	>
		{#if data.isPresident}
			<IconButton
				href="/state/{data.state.id}/edit"
				icon={FluentEdit20Filled}
				label="Edit State"
				variant="secondary"
				size="sm"
				class="absolute top-4 right-4"
			/>
		{/if}

		<div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
			<!-- State Logo -->
			<div class="relative shrink-0">
				{#if data.state.logo}
					<div class="size-24 rounded-full overflow-hidden bg-[#1a1f15] border border-[#c8b47a]/15">
						<img src={data.state.logo} alt={data.state.name} class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="size-24 rounded-full bg-[#1a1f15] border border-[#c8b47a]/15 flex items-center justify-center">
						<FluentFlag20Filled class="size-8 text-[#a8a083]/60" />
					</div>
				{/if}

				{#if data.bloc}
					<div
						class="absolute -bottom-2 -right-2 size-10 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-[#242a1d]"
						style="background-color: {data.bloc.color};"
						title={data.bloc.name}
					>
						{#if data.bloc.logo}
							<img src={data.bloc.logo} alt={data.bloc.name} class="w-full h-full object-cover" />
						{:else}
							<FluentFlag20Filled class="size-5 text-[#f5efd8]" />
						{/if}
					</div>
				{/if}
			</div>

			<div class="min-w-0 flex-1 space-y-1 sm:pr-12">
				<h1 class="text-3xl font-bold text-[#f5efd8] break-words">{data.state.name}</h1>
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
					<p class="text-sm text-[#a8a083] max-w-xl mt-2">{data.state.description}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- President Action Buttons -->
	{#if data.isPresident && !data.bloc}
		<div class="flex gap-2 flex-wrap">
			<Button href="/bloc" variant="soft-purple" size="sm" icon={FluentFlag20Filled}>Join Bloc</Button>
		</div>
	{/if}

	<!-- Active Wars -->
	{#if data.activeWars && data.activeWars.length > 0}
		<section class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="group flex items-center gap-3 sm:gap-4 bg-red-600/10 border border-red-500/30 rounded-sm p-4 hover:border-red-400/50 transition-colors"
				>
					<div
						class="size-10 sm:size-12 shrink-0 bg-red-600/15 rounded-sm border border-red-500/30 flex items-center justify-center"
					>
						<span class="text-xl sm:text-2xl">⚔️</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-300/80 uppercase tracking-wide">
								{war.isAttacker ? "War of Aggression" : "Defensive War"}
							</span>
						</div>
						<div class="text-sm text-[#d3caa9]">
							<span class="font-bold text-red-300">{war.attacker.name}</span>
							<span class="text-[#a8a083] mx-1">vs</span>
							<span class="font-bold text-[#b3dcff]">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-[#a8a083] group-hover:text-red-300 transition-colors">→</span>
				</a>
			{/each}
		</section>
	{/if}

	<!-- War Declaration Button (for foreign presidents) -->
	{#if data.canDeclareWar}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentShieldError20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-[#f5efd8] mb-2">Military Actions</h3>
					<p class="text-sm text-[#d3caa9] mb-4">
						As a President, you can declare war on this state. This action will have significant consequences.
					</p>
					<Button
						type="button"
						variant="danger"
						size="sm"
						icon={FluentShieldError20Filled}
						onclick={() => (showWarModal = true)}
					>
						Declare War
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Visa Status -->
	{#if !data.visa.isResident}
		<section>
			{#if data.visa.blocVisaFree}
				<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#3f8a2a]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentCheckmark20Filled class="size-6 text-[#b9f29a]" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-[#f5efd8]">Visa-Free</h3>
							<p class="text-sm text-[#b9f29a]">Bloc membership grants visa-free travel</p>
						</div>
					</div>
				</div>
			{:else if !data.visa.visaRequired}
				<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#3f8a2a]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentCheckmark20Filled class="size-6 text-[#b9f29a]" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-[#f5efd8]">Visa-Free</h3>
							<p class="text-sm text-[#a8a083]">This state has open borders — no visa required</p>
						</div>
					</div>
				</div>
			{:else if data.visa.hasActiveVisa && data.visa.activeVisa}
				<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#2369b5]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentBookCompass24Filled class="size-6 text-[#b3dcff]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#f5efd8]">Active Visa</h3>
							<p class="text-sm text-[#a8a083]">Expires {formatDate(data.visa.activeVisa.expiresAt)}</p>
						</div>
						<Button href="/visas" variant="soft-blue" size="sm">View Visas</Button>
					</div>
				</div>
			{:else if data.visa.blockedReason}
				<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentWarning20Filled class="size-6 text-red-400" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#f5efd8]">Visa Unavailable</h3>
							<p class="text-sm text-red-300">{data.visa.blockedReason}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#8a4fc0]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentBookCompass24Filled class="size-6 text-[#e3cbfb]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#f5efd8]">Visa Required</h3>
							<p class="text-sm text-[#a8a083]">You need a visa to travel to regions in this state</p>
						</div>
						<Button type="button" size="sm" icon={FluentBookCompass24Filled} onclick={() => (showVisaSheet = true)}>
							Request Visa
						</Button>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<!-- Residence Permit -->
	{#if data.residencePermit.canApply}
		<section>
			{#if data.residencePermit.hasPendingApp}
				<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#f2b01e]/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentHome20Filled class="size-6 text-[#ffd35c]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#f5efd8]">Residence Permit Pending</h3>
							<p class="text-sm text-[#ffe58f]">Your application is awaiting government review</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#2369b5]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentHome20Filled class="size-6 text-[#b3dcff]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#f5efd8]">Apply for Residence Permit</h3>
							<p class="text-sm text-[#a8a083]">
								You are currently in {data.residencePermit.currentRegionName}. Apply to become a citizen of this state.
							</p>
						</div>
						<form
							method="POST"
							action="?/applyResidence"
							use:enhance={() => {
								isApplyingResidence = true;
								return async ({ update }) => {
									isApplyingResidence = false;
									await update();
								};
							}}
						>
							<Button
								type="submit"
								variant="soft-blue"
								size="sm"
								icon={FluentHome20Filled}
								loading={isApplyingResidence}
								loadingText="Applying..."
							>
								Apply for Residence
							</Button>
						</form>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<!-- Stats Grid -->
	<section class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<a href="/state?sort=population" class="panel-interactive rounded-sm p-4">
			<div class="flex items-center gap-2 mb-1">
				<FluentPeople20Filled class="size-4 text-[#5eaef5]" />
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Population</p>
			</div>
			<p class="text-2xl font-bold text-[#f5efd8] truncate">{data.state.population.toLocaleString()}</p>
		</a>

		<a href="/state/{data.state.id}/region" class="panel-interactive rounded-sm p-4">
			<div class="flex items-center gap-2 mb-1">
				<FluentHome20Filled class="size-4 text-[#c08cf0]" />
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Regions</p>
			</div>
			<p class="text-2xl font-bold text-[#f5efd8]">{data.regions.length}</p>
		</a>

		{#if data.energy}
			<div class="panel rounded-sm p-4">
				<div class="flex items-center gap-2 mb-1">
					<FluentLightbulb20Filled class="size-4 text-[#ffd35c]" />
					<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Energy</p>
				</div>
				<p class="text-2xl font-bold text-[#f5efd8]">{data.energy.available}</p>
			</div>
		{/if}

		<div class="panel rounded-sm p-4">
			<div class="flex items-center gap-2 mb-1">
				<FluentShield20Filled class="size-4 text-[#6fd14a]" />
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Power Rating</p>
			</div>
			<p class="text-2xl font-bold text-[#f5efd8]">{data.state.rating || 0}</p>
		</div>
	</section>

	<!-- Government Section -->
	{#if hasGovernment}
		<section class="space-y-3">
			<h2 class="section-title">Government</h2>
			<div class="panel-muted rounded-sm p-3 space-y-2">
				<!-- President -->
				{#if data.president}
					<ProfileItem
						href="/user/{data.president.userId}"
						logo={data.president.logo}
						logoAlt={data.president.name}
						placeholderIcon={FluentShield20Filled}
						placeholderGradient="from-[#f2b01e]/15 to-[#f2b01e]/15"
						title={data.president.name}
						subtitle="President • Term {data.president.term} • {formatDate(data.president.electedAt)}"
						hoverColor="yellow"
						partyAbbreviation={data.president.partyAbbreviation}
						partyColor={data.president.partyColor}
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
								placeholderGradient="from-[#8a4fc0]/15 to-[#8a4fc0]/15"
								title={minister.name}
								subtitle={minister.ministry.replace("_", " ")}
								hoverColor="purple"
								partyAbbreviation={minister.partyAbbreviation}
								partyColor={minister.partyColor}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Parliament & Elections -->
	{#if data.parliamentMembers.length > 0 || data.nextElection}
		<section class="space-y-3">
			<h2 class="section-title">Parliament</h2>
			<div class="panel-muted rounded-sm p-3 space-y-3">
				{#if data.parliamentMembers.length > 0}
					<ProfileItem
						href="/state/{data.state.id}/parliament"
						placeholderIcon={FluentOrganization20Filled}
						placeholderGradient="from-[#2369b5]/15 to-[#2369b5]/15"
						title="{data.parliamentMembers.length} Parliament Members"
						subtitle="View legislature"
						hoverColor="purple"
					/>
				{/if}

				{#if data.nextElection && electionState()}
					{@const state = electionState()}

					{#if data.nextElection.isInaugural && state === "scheduled"}
						<!-- Inaugural Election - Scheduled -->
						<div class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm p-5 space-y-3">
							<div class="flex items-start gap-3">
								<div class="size-12 bg-[#8a4fc0]/25 rounded-sm flex items-center justify-center shrink-0">
									<FluentVote20Filled class="size-6 text-[#e3cbfb]" />
								</div>
								<div class="flex-1 space-y-2">
									<h3 class="font-bold text-[#f5efd8] text-lg">Inaugural Election Scheduled! 🎉</h3>
									<p class="text-[#e3cbfb] text-sm">
										This state is brand new! The first democratic election will establish the founding parliament of
										<strong>{data.nextElection.totalSeats} seats</strong>.
									</p>

									<div class="panel-muted rounded-sm p-3 space-y-2">
										<div class="flex items-center gap-2 text-sm">
											<FluentCalendar20Filled class="size-4 text-[#e3cbfb]" />
											<span class="text-[#e6ddbf]">
												<strong>Voting starts in:</strong>
												{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
											</span>
										</div>
										<div class="text-xs text-[#a8a083]">
											<strong>Start:</strong>
											{formatDate(data.nextElection.startDate)}<br />
											<strong>End:</strong>
											{formatDate(data.nextElection.endDate)}
										</div>
									</div>

									<div class="flex gap-2 pt-2">
										<Button
											href="/state/{data.state.id}/election/{data.nextElection.id}"
											variant="soft-purple"
											size="sm"
											icon={FluentVote20Filled}
										>
											View Election Details
										</Button>
										<Button href="/party/create" variant="secondary" size="sm">Create a Party</Button>
									</div>
								</div>
							</div>
						</div>
					{:else if data.nextElection.isInaugural && state === "active"}
						<!-- Inaugural Election - Active -->
						<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-3">
									<FluentVote20Filled class="size-6 text-[#f2b01e] animate-pulse" />
									<div>
										<p class="font-semibold text-[#f5efd8]">Inaugural Election Now Active!</p>
										<p class="text-sm text-[#ffd35c]">Help establish the founding parliament - vote now!</p>
									</div>
								</div>
								<Button
									href="/state/{data.state.id}/election/{data.nextElection.id}"
									variant="primary"
									size="sm"
									icon={FluentVote20Filled}
									class="animate-pulse"
								>
									Vote Now
								</Button>
							</div>
						</div>
					{:else if !data.nextElection.isInaugural && state === "scheduled"}
						<!-- Regular Election - Scheduled -->
						<div class="panel rounded-sm p-5">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4 flex-1">
									<div class="size-12 bg-[#2369b5]/25 rounded-sm flex items-center justify-center">
										<FluentCalendar20Filled class="size-6 text-[#b3dcff]" />
									</div>
									<div>
										<div class="flex items-center gap-2 mb-1">
											<h3 class="text-lg font-bold text-[#f5efd8]">Upcoming Election</h3>
										</div>
										<p class="text-sm text-[#a8a083]">
											{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} • starts in {getTimeRemaining(
												data.nextElection.startDate
											)}
										</p>
									</div>
								</div>
								<Button href="/state/{data.state.id}/election/{data.nextElection.id}" variant="soft-blue" size="sm">
									View Election
								</Button>
							</div>
						</div>
					{:else if !data.nextElection.isInaugural && state === "active"}
						<!-- Regular Election - Active -->
						<div class="bg-[#f2b01e]/12 rounded-sm border border-[#f2b01e]/35 p-5">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4 flex-1">
									<div class="size-12 bg-[#f2b01e]/20 rounded-sm flex items-center justify-center">
										<FluentVote20Filled class="size-6 text-[#f2b01e]" />
									</div>
									<div>
										<div class="flex items-center gap-2 mb-1">
											<h3 class="text-lg font-bold text-[#f5efd8]">Election Active</h3>
											<Badge tone="amber">Voting Now</Badge>
										</div>
										<p class="text-sm text-[#a8a083]">
											{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
											{data.nextElection.totalSeats} seats •
											{getTimeRemaining(data.nextElection.endDate)} remaining
										</p>
									</div>
								</div>
								<Button
									href="/state/{data.state.id}/election/{data.nextElection.id}"
									variant="primary"
									size="sm"
									icon={FluentVote20Filled}
									class="animate-pulse"
								>
									Vote Now
								</Button>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</section>
	{/if}

	<!-- Navigation Cards -->
	<section class="grid md:grid-cols-2 gap-4">
		<a href="/state/{data.state.id}/construction" class="group panel-interactive rounded-sm p-5">
			<div class="size-12 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm flex items-center justify-center mb-4">
				<FluentBuilding20Filled class="size-6 text-[#ffd35c]" />
			</div>
			<h3 class="text-lg font-bold text-[#f5efd8] mb-2 group-hover:text-[#ffcf47] transition-colors">
				Construction Queue
			</h3>
			<p class="text-sm text-[#a8a083] mb-3">Current construction efforts across the state's regions</p>
			<div class="text-xs text-[#ffd35c] flex items-center gap-1">View queue →</div>
		</a>

		{#if hasGovernment}
			<a href="/state/{data.state.id}/economy" class="group panel-interactive rounded-sm p-5">
				<div
					class="size-12 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm flex items-center justify-center mb-4"
				>
					<FluentMoney20Filled class="size-6 text-[#b9f29a]" />
				</div>
				<h3 class="text-lg font-bold text-[#f5efd8] mb-2 group-hover:text-[#ffcf47] transition-colors">Economy</h3>
				<p class="text-sm text-[#a8a083] mb-3">Treasury and tax policies</p>
				<div class="text-xs text-[#b9f29a] flex items-center gap-1">View economy →</div>
			</a>

			{#if data.isPresident || data.isForeignMinister}
				<a href="/state/{data.state.id}/foreign-affairs" class="group panel-interactive rounded-sm p-5">
					<div
						class="size-12 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center mb-4"
					>
						<FluentGlobe20Filled class="size-6 text-[#b3dcff]" />
					</div>
					<h3 class="text-lg font-bold text-[#f5efd8] mb-2 group-hover:text-[#ffcf47] transition-colors">
						Foreign Affairs
					</h3>
					<p class="text-sm text-[#a8a083] mb-3">Diplomacy, wars, and sanctions</p>
					<div class="text-xs text-[#b3dcff] flex items-center gap-1">View diplomacy →</div>
				</a>
			{/if}
		{/if}
	</section>

	<!-- Tax Overview -->
	{#if data.taxes.length > 0}
		<section class="space-y-3">
			<h2 class="section-title">Tax Policies</h2>
			<div class="panel rounded-sm overflow-hidden">
				<table class="w-full">
					<thead class="bg-[#1a1f15]/70 border-b border-[#c8b47a]/15">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-semibold text-[#a8a083] uppercase tracking-wider">
								Tax Type
							</th>
							<th class="px-4 py-3 text-left text-xs font-semibold text-[#a8a083] uppercase tracking-wider">
								Applies To
							</th>
							<th class="px-4 py-3 text-right text-xs font-semibold text-[#a8a083] uppercase tracking-wider"> Rate </th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#c8b47a]/10">
						{#each data.taxes as tax}
							<tr class="hover:bg-[#2e3524] transition-colors">
								<td class="px-4 py-3 font-medium text-[#f5efd8] capitalize">
									{tax.taxType.replace(/_/g, " ")}
								</td>
								<td class="px-4 py-3 text-sm text-[#a8a083]">
									{#if tax.taxType === "mining"}
										Resource extraction operations
									{:else if tax.taxType === "production"}
										Manufactured goods production
									{:else if tax.taxType === "market_transaction"}
										Marketplace sales
									{:else if tax.taxType === "income"}
										Worker wages and salaries
									{/if}
								</td>
								<td class="px-4 py-3 text-right font-bold text-[#b9f29a]">{tax.taxRate}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- Sanction Warning (for foreign ministers) -->
	{#if data.isForeignMinister}
		<section class="bg-red-600/10 border border-red-500/30 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentWarning20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-[#f5efd8] mb-2">Diplomatic Actions</h3>
					<p class="text-sm text-[#d3caa9] mb-4">As a Foreign Minister, you can impose sanctions on this state.</p>
					<form method="POST" action="?/sanction" use:enhance>
						<Button type="submit" variant="danger" size="sm">Impose Sanction</Button>
					</form>
				</div>
			</div>
		</section>
	{/if}
</PageContainer>

<!-- War Declaration Modal -->
<Modal bind:open={showWarModal} title="Declare War" size="default">
	<div class="space-y-4">
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-red-400 mt-0.5 flex-shrink-0" />
				<div class="space-y-2">
					<h4 class="font-bold text-[#f5efd8]">⚠️ Critical Warning</h4>
					<p class="text-sm text-[#d3caa9]">
						You are about to declare war on <strong>{data.state.name}</strong>. This action:
					</p>
					<ul class="text-sm text-[#d3caa9] space-y-1 ml-4 list-disc">
						<li>Cannot be undone</li>
						<li>Will initiate military conflict</li>
						<li>May have severe diplomatic consequences</li>
						<li>Could trigger alliance obligations</li>
					</ul>

					{#if data.bloc}
						<div class="mt-3 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3">
							<div class="flex items-start gap-2">
								<FluentFlag20Filled class="size-5 text-[#f2b01e] mt-0.5 flex-shrink-0" />
								<div>
									<p class="font-semibold text-[#ffd35c] text-sm">Bloc Member Warning</p>
									<p class="text-xs text-[#ffe58f] mt-1">
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
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (showWarModal = false)}
					disabled={isDeclaringWar}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="danger"
					size="sm"
					icon={FluentShieldError20Filled}
					loading={isDeclaringWar}
					loadingText="Declaring..."
				>
					Confirm Declaration
				</Button>
			</div>
		</form>
	</div>
</Modal>

<!-- Visa Request Modal -->
{#if !data.visa.isResident && !data.visa.blocVisaFree && !data.visa.blockedReason && data.visa.visaRequired}
	<Modal bind:open={showVisaSheet} title="Request Visa" size="default">
		<div class="space-y-5">
			<div class="flex items-center gap-4">
				<div class="size-14 bg-[#8a4fc0]/20 rounded-sm flex items-center justify-center">
					<FluentBookCompass24Filled class="size-7 text-[#e3cbfb]" />
				</div>
				<div>
					<h3 class="text-xl font-bold text-[#f5efd8]">{data.state.name}</h3>
					<p class="text-sm text-[#a8a083]">Travel Visa Application</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a8a083]">Visa Cost</span>
					<span class="text-xl font-bold text-[#f5efd8]">${data.visa.visaCost.toLocaleString()}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a8a083]">Tax ({data.visa.visaTaxRate}%)</span>
					<span class="text-sm text-[#d3caa9]"
						>${Math.floor((data.visa.visaCost * data.visa.visaTaxRate) / 100).toLocaleString()}</span
					>
				</div>
				<div class="border-t border-[#c8b47a]/20 pt-2 flex items-center justify-between">
					<span class="text-sm text-[#a8a083]">Valid for</span>
					<span class="text-sm font-medium text-[#f5efd8]">14 days</span>
				</div>
			</div>

			{#if !data.visa.autoApprove}
				<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3">
					<p class="text-xs text-[#ffd35c] flex items-center gap-2">
						<FluentWarning20Filled class="size-4" />
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
					variant="soft-purple"
					block
					icon={FluentBookCompass24Filled}
					disabled={data.walletBalance < data.visa.visaCost}
				>
					{#if data.visa.autoApprove}
						Purchase Visa — ${data.visa.visaCost.toLocaleString()}
					{:else}
						Apply for Visa
					{/if}
				</Button>
				{#if data.walletBalance < data.visa.visaCost}
					<p class="text-xs text-red-400 text-center mt-2">
						Insufficient funds — you have ${data.walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		</div>
	</Modal>
{/if}
