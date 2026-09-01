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
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import Button from "$lib/component/ui/Button.svelte";
	import { formatDate } from "$lib/utils/formatting.js";
	import { enhance } from "$app/forms";
	import { buttonClass, badgeClass } from "$lib/component/ui/styles";

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
	<!-- Hero Section with Bloc Background -->
	<div class="relative">
		<div
			class="w-full rounded-sm p-8 flex flex-col items-center relative overflow-hidden border border-[#dfceb0]/15 shadow-2xl"
			style="background: linear-gradient(135deg, {data.bloc?.color || '#1e293b'}20 0%, {data.bloc?.color ||
				'#1e293b'}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.bloc?.color ||
					'#ffffff'}20 35px, {data.bloc?.color || '#ffffff'}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-sm"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<!-- State Logo -->
				<div class="rounded-full relative group">
					{#if data.state.logo}
						<div class="size-24 rounded-full overflow-hidden bg-[#102239]">
							<img src={data.state.logo} alt={data.state.name} class="w-full h-full object-cover" />
						</div>
					{:else}
						<div class="size-24 rounded-full bg-[#102239] flex items-center justify-center">
							<FluentFlag20Filled class="size-8 text-[#a89e8e]/60" />
						</div>
					{/if}

					{#if data.bloc}
						<div
							class="absolute -bottom-2 -right-2 size-10 rounded-full flex items-center justify-center ring-2 ring-[#0c1929]"
							style="background-color: {data.bloc.color};"
							title={data.bloc.name}
						>
							<FluentFlag20Filled class="size-5 text-[#fff7e8]" />
						</div>
					{/if}
				</div>

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-[#fff7e8] tracking-tight">{data.state.name}</h1>
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
						<p class="text-sm text-[#c7bda9] max-w-md mt-2">{data.state.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- President Action Buttons -->
	{#if data.isPresident}
		<div class="flex gap-2 flex-wrap">
			<Button href="/state/{data.state.id}/edit" variant="secondary" size="sm" icon={FluentEdit20Filled}>
				Edit State
			</Button>

			{#if !data.bloc}
				<Button href="/bloc" variant="soft-purple" size="sm" icon={FluentFlag20Filled}>Join Bloc</Button>
			{/if}
		</div>
	{/if}

	<!-- Active Wars -->
	{#if data.activeWars && data.activeWars.length > 0}
		<section class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-red-950/30 to-[#0c1929]/60 border border-red-500/25 rounded-sm p-4 hover:border-red-400/40 transition-all group"
				>
					<div class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-red-500/20 blur-lg rounded-full animate-pulse"></div>
						<div
							class="relative size-10 sm:size-12 bg-red-950/60 rounded-sm border border-red-500/30 flex items-center justify-center"
						>
							<span class="text-xl sm:text-2xl">⚔️</span>
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">
								{war.isAttacker ? "War of Aggression" : "Defensive War"}
							</span>
						</div>
						<div class="text-sm text-[#c7bda9]">
							<span class="font-bold text-red-400">{war.attacker.name}</span>
							<span class="text-[#a89e8e] mx-1">vs</span>
							<span class="font-bold text-blue-400">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-[#a89e8e] group-hover:text-red-400 transition-colors">→</span>
				</a>
			{/each}
		</section>
	{/if}

	<!-- War Declaration Button (for foreign presidents) -->
	{#if data.canDeclareWar}
		<div class="bg-red-900/20 border border-red-500/30 rounded-sm p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentShieldError20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-[#fff7e8] mb-2">Military Actions</h3>
					<p class="text-sm text-[#c7bda9] mb-4">
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
				<div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-emerald-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentCheckmark20Filled class="size-6 text-emerald-400" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-[#fff7e8]">Visa-Free</h3>
							<p class="text-sm text-emerald-300">Bloc membership grants visa-free travel</p>
						</div>
					</div>
				</div>
			{:else if !data.visa.visaRequired}
				<div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-emerald-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentCheckmark20Filled class="size-6 text-emerald-400" />
						</div>
						<div>
							<h3 class="text-lg font-semibold text-[#fff7e8]">Visa-Free</h3>
							<p class="text-sm text-[#a89e8e]">This state has open borders — no visa required</p>
						</div>
					</div>
				</div>
			{:else if data.visa.hasActiveVisa && data.visa.activeVisa}
				<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#315d8d]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentBookCompass24Filled class="size-6 text-[#b7d0e6]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#fff7e8]">Active Visa</h3>
							<p class="text-sm text-[#a89e8e]">Expires {formatDate(data.visa.activeVisa.expiresAt)}</p>
						</div>
						<Button href="/visas" variant="soft-blue" size="sm">View Visas</Button>
					</div>
				</div>
			{:else if data.visa.blockedReason}
				<div class="bg-red-900/20 border border-red-500/20 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentWarning20Filled class="size-6 text-red-400" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#fff7e8]">Visa Unavailable</h3>
							<p class="text-sm text-red-300">{data.visa.blockedReason}</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#8c709b]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentBookCompass24Filled class="size-6 text-[#d5c4df]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#fff7e8]">Visa Required</h3>
							<p class="text-sm text-[#a89e8e]">You need a visa to travel to regions in this state</p>
						</div>
						<Button
							type="button"
							size="sm"
							icon={FluentBookCompass24Filled}
							onclick={() => (showVisaSheet = true)}
						>
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
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#e6a527]/20 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentHome20Filled class="size-6 text-[#f7c56b]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#fff7e8]">Residence Permit Pending</h3>
							<p class="text-sm text-[#ffe2a4]">Your application is awaiting government review</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-5">
					<div class="flex items-center gap-3">
						<div class="size-12 bg-[#315d8d]/25 rounded-sm flex items-center justify-center flex-shrink-0">
							<FluentHome20Filled class="size-6 text-[#b7d0e6]" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-[#fff7e8]">Apply for Residence Permit</h3>
							<p class="text-sm text-[#a89e8e]">
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
							<button
								type="submit"
								class={buttonClass({ variant: "soft-blue", size: "sm", class: "gap-2" })}
								disabled={isApplyingResidence}
							>
								{#if isApplyingResidence}
									<span class="loading loading-spinner loading-xs"></span>
									Applying...
								{:else}
									<FluentHome20Filled class="size-4" />
									Apply for Residence
								{/if}
							</button>
						</form>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<!-- Stats Grid -->
	<section class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<a
			href="/state?sort=population"
			class="bg-[#315d8d]/15 rounded-sm border border-[#7ba0c8]/25 p-5 hover:border-[#7ba0c8]/40 transition-all"
		>
			<div class="flex items-center gap-2 mb-1">
				<FluentPeople20Filled class="size-5 text-[#b7d0e6]" />
				<p class="text-sm text-[#b7d0e6] font-medium">Population</p>
			</div>
			<p class="text-4xl font-bold text-[#fff7e8]">{data.state.population.toLocaleString()}</p>
		</a>

		<a
			href="/state/{data.state.id}/region"
			class="bg-[#8c709b]/15 rounded-sm border border-[#b7a0c5]/25 p-5 hover:border-[#b7a0c5]/40 transition-all"
		>
			<div class="flex items-center gap-2 mb-1">
				<FluentHome20Filled class="size-5 text-[#d5c4df]" />
				<p class="text-sm text-[#d5c4df] font-medium">Regions</p>
			</div>
			<p class="text-4xl font-bold text-[#fff7e8]">{data.regions.length}</p>
		</a>

		{#if data.energy}
			<div class="bg-[#e6a527]/12 rounded-sm border border-[#e6a527]/30 p-5">
				<div class="flex items-center gap-2 mb-1">
					<FluentLightbulb20Filled class="size-5 text-[#f7c56b]" />
					<p class="text-sm text-[#f7c56b] font-medium">Energy</p>
				</div>
				<p class="text-4xl font-bold text-[#fff7e8]">{data.energy.available}</p>
			</div>
		{/if}

		<div class="bg-[#587252]/18 rounded-sm border border-[#8fae88]/25 p-5">
			<div class="flex items-center gap-2 mb-1">
				<FluentShield20Filled class="size-5 text-[#c6dfbf]" />
				<p class="text-sm text-[#c6dfbf] font-medium">Power Rating</p>
			</div>
			<p class="text-4xl font-bold text-[#fff7e8]">{data.state.rating || 0}</p>
		</div>
	</section>

	<!-- Government Section -->
	{#if hasGovernment}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1">Government</h2>
			<div class="panel-muted rounded-sm p-3 space-y-2">
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
			</div>
		</section>
	{/if}

	<!-- Parliament & Elections -->
	{#if data.parliamentMembers.length > 0 || data.nextElection}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1">Parliament</h2>
			<div class="panel-muted rounded-sm p-3 space-y-3">
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

				{#if data.nextElection && electionState()}
					{@const state = electionState()}

					{#if data.nextElection.isInaugural && state === "scheduled"}
						<!-- Inaugural Election - Scheduled -->
						<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm p-5 space-y-3">
							<div class="flex items-start gap-3">
								<div class="size-12 bg-[#8c709b]/25 rounded-sm flex items-center justify-center shrink-0">
									<FluentVote20Filled class="size-6 text-[#d5c4df]" />
								</div>
								<div class="flex-1 space-y-2">
									<h3 class="font-bold text-[#fff7e8] text-lg">Inaugural Election Scheduled! 🎉</h3>
									<p class="text-[#d5c4df] text-sm">
										This state is brand new! The first democratic election will establish the founding parliament of
										<strong>{data.nextElection.totalSeats} seats</strong>.
									</p>

									<div class="panel rounded-sm p-3 space-y-2">
										<div class="flex items-center gap-2 text-sm">
											<FluentCalendar20Filled class="size-4 text-[#d5c4df]" />
											<span class="text-[#e5d8c1]">
												<strong>Voting starts in:</strong>
												{getTimeRemaining(data.nextElection.startDate) || "Starting soon!"}
											</span>
										</div>
										<div class="text-xs text-[#a89e8e]">
											<strong>Start:</strong>
											{formatDate(data.nextElection.startDate)}<br />
											<strong>End:</strong>
											{formatDate(data.nextElection.endDate)}
										</div>
									</div>

									<div class="flex gap-2 pt-2">
										<a
											href="/state/{data.state.id}/election/{data.nextElection.id}"
											class={buttonClass({ variant: "soft-purple", size: "sm", class: "gap-2" })}
										>
											<FluentVote20Filled class="size-4" />
											View Election Details
										</a>
										<a href="/party/create" class={buttonClass({ variant: "secondary", size: "sm" })}>
											Create a Party
										</a>
									</div>
								</div>
							</div>
						</div>
					{:else if data.nextElection.isInaugural && state === "active"}
						<!-- Inaugural Election - Active -->
						<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-4">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-3">
									<FluentVote20Filled class="size-6 text-[#e6a527] animate-pulse" />
									<div>
										<p class="font-semibold text-[#fff7e8]">Inaugural Election Now Active!</p>
										<p class="text-sm text-[#f7c56b]">Help establish the founding parliament - vote now!</p>
									</div>
								</div>
								<a
									href="/state/{data.state.id}/election/{data.nextElection.id}"
									class={buttonClass({ variant: "primary", size: "sm", class: "gap-2 animate-pulse" })}
								>
									<FluentVote20Filled class="size-4" />
									Vote Now
								</a>
							</div>
						</div>
					{:else if !data.nextElection.isInaugural && state === "scheduled"}
						<!-- Regular Election - Scheduled -->
						<div class="panel rounded-sm p-5">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4 flex-1">
									<div class="size-12 bg-[#315d8d]/25 rounded-sm flex items-center justify-center">
										<FluentCalendar20Filled class="size-6 text-[#b7d0e6]" />
									</div>
									<div>
										<div class="flex items-center gap-2 mb-1">
											<h3 class="text-lg font-bold text-[#fff7e8]">Upcoming Election</h3>
										</div>
										<p class="text-sm text-[#a89e8e]">
											{formatDate(data.nextElection.startDate)} - {formatDate(
												data.nextElection.endDate
											)} • starts in {getTimeRemaining(data.nextElection.startDate)}
										</p>
									</div>
								</div>
								<a
									href="/state/{data.state.id}/election/{data.nextElection.id}"
									class={buttonClass({ variant: "soft-blue", size: "sm" })}
								>
									View Election
								</a>
							</div>
						</div>
					{:else if !data.nextElection.isInaugural && state === "active"}
						<!-- Regular Election - Active -->
						<div class="bg-[#e6a527]/12 rounded-sm border border-[#e6a527]/35 p-5">
							<div class="flex items-center justify-between gap-4">
								<div class="flex items-center gap-4 flex-1">
									<div class="size-12 bg-[#e6a527]/20 rounded-sm flex items-center justify-center">
										<FluentVote20Filled class="size-6 text-[#e6a527]" />
									</div>
									<div>
										<div class="flex items-center gap-2 mb-1">
											<h3 class="text-lg font-bold text-[#fff7e8]">Election Active</h3>
											<span class={badgeClass({ tone: "amber", size: "sm" })}>Voting Now</span>
										</div>
										<p class="text-sm text-[#a89e8e]">
											{formatDate(data.nextElection.startDate)} - {formatDate(data.nextElection.endDate)} •
											{data.nextElection.totalSeats} seats •
											{getTimeRemaining(data.nextElection.endDate)} remaining
										</p>
									</div>
								</div>
								<a
									href="/state/{data.state.id}/election/{data.nextElection.id}"
									class={buttonClass({ variant: "primary", size: "sm", class: "gap-2 animate-pulse" })}
								>
									<FluentVote20Filled class="size-4" />
									Vote Now
								</a>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</section>
	{/if}

	<!-- Navigation Cards -->
	<section class="grid md:grid-cols-2 gap-4">
		{#if hasGovernment}
			<a
				href="/state/{data.state.id}/economy"
				class="group bg-[#587252]/15 rounded-sm border border-[#8fae88]/25 p-6 hover:border-[#8fae88]/45 transition-all"
			>
				<div
					class="size-12 bg-[#587252]/20 rounded-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
				>
					<FluentMoney20Filled class="size-6 text-[#c6dfbf]" />
				</div>
				<h3 class="text-xl font-bold text-[#fff7e8] mb-2 group-hover:text-[#c6dfbf] transition-colors">Economy</h3>
				<p class="text-sm text-[#a89e8e] mb-3">Treasury and tax policies</p>
				<div class="text-xs text-[#c6dfbf] flex items-center gap-1">View economy →</div>
			</a>

			{#if data.isPresident || data.isForeignMinister}
				<a
					href="/state/{data.state.id}/foreign-affairs"
					class="group bg-[#315d8d]/15 rounded-sm border border-[#7ba0c8]/25 p-6 hover:border-[#7ba0c8]/45 transition-all"
				>
					<div
						class="size-12 bg-[#315d8d]/20 rounded-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
					>
						<FluentGlobe20Filled class="size-6 text-[#b7d0e6]" />
					</div>
					<h3 class="text-xl font-bold text-[#fff7e8] mb-2 group-hover:text-[#b7d0e6] transition-colors">
						Foreign Affairs
					</h3>
					<p class="text-sm text-[#a89e8e] mb-3">Diplomacy, wars, and sanctions</p>
					<div class="text-xs text-[#b7d0e6] flex items-center gap-1">View diplomacy →</div>
				</a>
			{/if}
		{/if}
	</section>

	<!-- Tax Overview -->
	{#if data.taxes.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1">Tax Policies</h2>
			<div class="panel-muted rounded-sm p-6">
				<div class="grid md:grid-cols-2 gap-4">
					{#each data.taxes as tax}
						<div class="panel rounded-sm p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-2">
									<div class="size-10 bg-emerald-600/20 rounded-sm flex items-center justify-center">
										<FluentMoney20Filled class="size-5 text-emerald-400" />
									</div>
									<div>
										<h3 class="font-semibold text-[#fff7e8] capitalize">
											{tax.taxType.replace(/_/g, " ")}
										</h3>
										<p class="text-xs text-[#a89e8e]">Active Tax</p>
									</div>
								</div>
								<div class="text-right">
									<p class="text-2xl font-bold text-emerald-400">{tax.taxRate}%</p>
								</div>
							</div>
							<div class="text-xs text-[#a89e8e] space-y-1">
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
						<div class="size-16 bg-[#102239] rounded-full flex items-center justify-center mx-auto mb-3">
							<FluentMoney20Filled class="size-8 text-[#a89e8e]" />
						</div>
						<p class="text-[#a89e8e] text-sm">No active tax policies</p>
						<p class="text-[#a89e8e]/70 text-xs mt-1">Parliament can propose new tax legislation</p>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Sanction Warning (for foreign ministers) -->
	{#if data.isForeignMinister}
		<section class="bg-red-900/20 border border-red-500/30 rounded-sm p-6">
			<div class="flex items-start gap-4">
				<div class="size-12 bg-red-600/20 rounded-sm flex items-center justify-center flex-shrink-0">
					<FluentWarning20Filled class="size-6 text-red-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-bold text-[#fff7e8] mb-2">Diplomatic Actions</h3>
					<p class="text-sm text-[#c7bda9] mb-4">As a Foreign Minister, you can impose sanctions on this state.</p>
					<form method="POST" action="?/sanction" use:enhance>
						<button type="submit" class={buttonClass({ variant: "danger", size: "sm" })}> Impose Sanction </button>
					</form>
				</div>
			</div>
		</section>
	{/if}
</PageContainer>

<!-- War Declaration Modal -->
<Modal bind:open={showWarModal} title="Declare War" size="default">
	<div class="space-y-4">
		<div class="bg-red-900/20 border border-red-500/30 rounded-sm p-4">
			<div class="flex items-start gap-3">
				<FluentWarning20Filled class="size-6 text-red-400 mt-0.5 flex-shrink-0" />
				<div class="space-y-2">
					<h4 class="font-bold text-[#fff7e8]">⚠️ Critical Warning</h4>
					<p class="text-sm text-[#c7bda9]">
						You are about to declare war on <strong>{data.state.name}</strong>. This action:
					</p>
					<ul class="text-sm text-[#c7bda9] space-y-1 ml-4 list-disc">
						<li>Cannot be undone</li>
						<li>Will initiate military conflict</li>
						<li>May have severe diplomatic consequences</li>
						<li>Could trigger alliance obligations</li>
					</ul>

					{#if data.bloc}
						<div class="mt-3 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-3">
							<div class="flex items-start gap-2">
								<FluentFlag20Filled class="size-5 text-[#e6a527] mt-0.5 flex-shrink-0" />
								<div>
									<p class="font-semibold text-[#f7c56b] text-sm">Bloc Member Warning</p>
									<p class="text-xs text-[#ffe2a4] mt-1">
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
					class={buttonClass({ variant: "secondary", size: "sm" })}
					disabled={isDeclaringWar}
				>
					Cancel
				</button>
				<button
					type="submit"
					class={buttonClass({ variant: "danger", size: "sm", class: "gap-2" })}
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

<!-- Visa Request Modal -->
{#if !data.visa.isResident && !data.visa.blocVisaFree && !data.visa.blockedReason && data.visa.visaRequired}
	<Modal bind:open={showVisaSheet} title="Request Visa" size="default">
		<div class="space-y-5">
			<div class="flex items-center gap-4">
				<div class="size-14 bg-[#8c709b]/20 rounded-sm flex items-center justify-center">
					<FluentBookCompass24Filled class="size-7 text-[#d5c4df]" />
				</div>
				<div>
					<h3 class="text-xl font-bold text-[#fff7e8]">{data.state.name}</h3>
					<p class="text-sm text-[#a89e8e]">Travel Visa Application</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a89e8e]">Visa Cost</span>
					<span class="text-xl font-bold text-[#fff7e8]">${data.visa.visaCost.toLocaleString()}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a89e8e]">Tax ({data.visa.visaTaxRate}%)</span>
					<span class="text-sm text-[#c7bda9]"
						>${Math.floor((data.visa.visaCost * data.visa.visaTaxRate) / 100).toLocaleString()}</span
					>
				</div>
				<div class="border-t border-[#dfceb0]/20 pt-2 flex items-center justify-between">
					<span class="text-sm text-[#a89e8e]">Valid for</span>
					<span class="text-sm font-medium text-[#fff7e8]">14 days</span>
				</div>
			</div>

			{#if !data.visa.autoApprove}
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-3">
					<p class="text-xs text-[#f7c56b] flex items-center gap-2">
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
				<button
					type="submit"
					class={buttonClass({ variant: "soft-purple", block: true, class: "gap-2" })}
					disabled={data.walletBalance < data.visa.visaCost}
				>
					<FluentBookCompass24Filled class="size-5" />
					{#if data.visa.autoApprove}
						Purchase Visa — ${data.visa.visaCost.toLocaleString()}
					{:else}
						Apply for Visa
					{/if}
				</button>
				{#if data.walletBalance < data.visa.visaCost}
					<p class="text-xs text-red-400 text-center mt-2">
						Insufficient funds — you have ${data.walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		</div>
	</Modal>
{/if}
