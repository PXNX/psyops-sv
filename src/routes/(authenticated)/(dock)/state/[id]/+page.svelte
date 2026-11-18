<!-- src/routes/(authenticated)/(dock)/state/[id]/+page.svelte -->
<!-- A nation's dossier: cover with flag and seal, key figures, head of state
     and cabinet, regions, resources, tax schedule and the travel papers the
     viewer holds for this state. -->
<script lang="ts">
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import WarHistory from "#lib/component/WarHistory.svelte";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentOrganization20Filled from "~icons/fluent/organization-20-filled";
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentLightbulb20Filled from "~icons/fluent/lightbulb-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentReceiptMoney20Filled from "~icons/fluent/receipt-money-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentShieldError20Filled from "~icons/fluent/shield-error-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentProhibited20Filled from "~icons/fluent/prohibited-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { enhance } from "$app/forms";
	import EditStateSheet from "./EditStateSheet.svelte";

	const { data } = $props();

	let showWarModal = $state(false);
	let isDeclaringWar = $state(false);
	let showVisaSheet = $state(false);
	let isApplyingResidence = $state(false);
	let showEditStateSheet = $state(false);
	let papersEl = $state<HTMLElement | null>(null);

	const hasGovernment = $derived(!!data.president || data.ministers.length > 0 || data.parliamentMembers.length > 0);

	const ministryNames: Record<string, string> = {
		economy: "Economy",
		foreign_affairs: "Foreign Affairs",
		defense: "Defence"
	};

	function getTimeRemaining(endDate: string | Date) {
		const diff = new Date(endDate).getTime() - Date.now();
		if (diff <= 0) return null;
		const days = Math.floor(diff / 86_400_000);
		const hours = Math.floor((diff % 86_400_000) / 3_600_000);
		const minutes = Math.floor((diff % 3_600_000) / 60_000);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const electionState = $derived.by(() => {
		if (!data.nextElection) return null;
		const now = new Date();
		if (now < new Date(data.nextElection.startDate)) return "scheduled";
		if (now <= new Date(data.nextElection.endDate)) return "active";
		return null;
	});

	const resourceEntries = $derived(
		(["oil", "steel", "chromium", "tungsten", "rubber", "aluminium"] as const)
			.map((name) => ({ name, value: data.resources[name] }))
			.filter((r) => r.value)
	);

	const taxNames: Record<string, string> = {
		mining: "Mining",
		production: "Production",
		market_transaction: "Market sales",
		income: "Income"
	};

	const sortedRegions = $derived([...data.regions].sort((a, b) => b.population - a.population));

	type Office = { href: string; label: string; icon: typeof FluentBuilding20Filled; tone: string };
	const offices = $derived.by(() => {
		const list: Office[] = [];
		if (data.parliamentMembers.length > 0 || data.nextElection)
			list.push({
				href: `/state/${data.state.id}/parliament`,
				label: "Parliament",
				icon: FluentOrganization20Filled,
				tone: "text-[#c08cf0]"
			});
		list.push({
			href: `/state/${data.state.id}/construction`,
			label: "Construction",
			icon: FluentBuilding20Filled,
			tone: "text-[#ffd35c]"
		});
		list.push({
			href: `/state/${data.state.id}/budget`,
			label: "Treasury",
			icon: FluentReceiptMoney20Filled,
			tone: "text-[#6fd14a]"
		});
		if (hasGovernment && (data.isPresident || data.isOwnEconomyMinister))
			list.push({
				href: `/state/${data.state.id}/economy`,
				label: "Economy",
				icon: FluentMoney20Filled,
				tone: "text-[#6fd14a]"
			});
		if (hasGovernment && (data.isPresident || data.isOwnForeignMinister))
			list.push({
				href: `/state/${data.state.id}/foreign-affairs`,
				label: "Foreign Affairs",
				icon: FluentGlobe20Filled,
				tone: "text-[#5eaef5]"
			});
		return list;
	});

	const description = $derived(data.state.description || `State of ${data.state.name} in PsyOps.`);
</script>

<svelte:head>
	<title>{data.state.name}</title>
	<meta name="description" content={description} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.state.name} />
	<meta property="og:description" content={description} />
	{#if data.state.logo}
		<meta property="og:image" content={data.state.logo} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.state.name} />
	<meta name="twitter:description" content={description} />
	{#if data.state.logo}
		<meta name="twitter:image" content={data.state.logo} />
	{/if}
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Dossier cover -->
	<header
		class="panel rounded-sm p-5 relative overflow-hidden border-t-4"
		style="border-top-color: {data.state.background || '#c8b47a'}"
	>
		{#if data.isPresident}
			<IconButton
				icon={FluentEdit20Filled}
				label="Edit State"
				variant="secondary"
				size="sm"
				class="absolute top-4 right-4"
				onclick={() => (showEditStateSheet = true)}
			/>
		{/if}

		<p class="text-[10px] uppercase tracking-[0.25em] text-[#a8a083] pr-12">
			State dossier · No. {String(data.state.id).padStart(3, "0")}
		</p>

		<div class="mt-3 flex items-start gap-4">
			<!-- Flag with the bloc seal pinned to its corner -->
			<div class="relative shrink-0">
				<div
					class="size-20 sm:size-24 rounded-sm overflow-hidden bg-[#1a1f15] border border-[#c8b47a]/25 shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
				>
					{#if data.state.logo}
						<img
							loading="lazy"
							decoding="async"
							src={data.state.logo}
							alt={data.state.name}
							class="w-full h-full object-cover"
						/>
					{:else}
						<div class="size-full flex items-center justify-center">
							<FluentFlag20Filled class="size-8 text-[#a8a083]/60" />
						</div>
					{/if}
				</div>
				{#if data.bloc}
					<a
						href="/bloc/{data.bloc.id}"
						class="animate-stamp absolute -bottom-2 -right-2 size-9 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-[#242a1d]"
						style="background-color: {data.bloc.color}; --stamp-tilt: 8deg"
						title={data.bloc.name}
					>
						{#if data.bloc.logo}
							<img
								loading="lazy"
								decoding="async"
								src={data.bloc.logo}
								alt={data.bloc.name}
								class="w-full h-full object-cover"
							/>
						{:else}
							<FluentFlag20Filled class="size-4 text-[#f5efd8]" />
						{/if}
					</a>
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<h1 class="font-serif text-3xl sm:text-4xl font-black text-[#f5efd8] break-words leading-tight">
					{data.state.name}
				</h1>
				<p class="mt-1 text-xs text-[#a8a083] flex flex-wrap gap-x-2 gap-y-0.5">
					<span>Est. {formatDate(data.state.createdAt)}</span>
					{#if data.bloc}
						<span aria-hidden="true">·</span>
						<a href="/bloc/{data.bloc.id}" class="font-medium hover:underline" style="color: {data.bloc.color};">
							{data.bloc.name}
						</a>
					{/if}
				</p>
			</div>
		</div>

		{#if data.state.description}
			<p class="mt-4 font-serif italic text-sm sm:text-base text-[#d3caa9] max-w-2xl">{data.state.description}</p>
		{/if}

		{#if data.isPresident || data.canDeclareWar || data.isForeignMinister}
			<div class="mt-4 pt-4 border-t border-[#c8b47a]/15 flex flex-wrap gap-2">
				{#if data.isPresident}
					{#if !data.bloc}
						<Button href="/bloc" variant="soft-purple" size="sm" icon={FluentFlag20Filled}>Join Bloc</Button>
					{/if}
					<Button href="/inbox" variant="soft-amber" size="sm" icon={FluentMegaphone20Filled}>Broadcast</Button>
				{/if}
				{#if data.canDeclareWar}
					<Button
						type="button"
						variant="danger"
						size="sm"
						icon={FluentShieldError20Filled}
						onclick={() => (showWarModal = true)}
					>
						Declare War
					</Button>
				{/if}
				{#if data.isForeignMinister}
					<form
						method="POST"
						action="?/sanction"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								toastResult(result);
							}}
					>
						<Button type="submit" variant="soft-red" size="sm" icon={FluentProhibited20Filled}>Impose Sanction</Button>
					</form>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Key figures: an almanac fact sheet -->
	<section class="panel rounded-sm p-4 sm:p-5">
		<h2 class="section-title mb-3">Key Figures</h2>
		<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
			{#snippet fact(label: string, value: string, Icon: typeof FluentPeople20Filled, tone: string, href?: string)}
				<svelte:element
					this={href ? "a" : "div"}
					{href}
					class="group flex items-center gap-2 py-2 border-b border-dashed border-[#c8b47a]/15 {href
						? 'hover:text-[#ffcf47]'
						: ''}"
				>
					<Icon class="size-4 shrink-0 {tone}" />
					<dt class="text-sm text-[#a8a083] {href ? 'group-hover:text-[#ffcf47]' : ''} transition-colors">{label}</dt>
					<span class="flex-1 border-b border-dotted border-[#c8b47a]/20 translate-y-1" aria-hidden="true"></span>
					<dd class="text-sm font-bold font-mono text-[#f5efd8]">{value}</dd>
				</svelte:element>
			{/snippet}
			{@render fact(
				"Population",
				data.state.population.toLocaleString(),
				FluentPeople20Filled,
				"text-[#5eaef5]",
				"/state?sort=population"
			)}
			{@render fact(
				"Regions",
				String(data.regions.length),
				FluentHome20Filled,
				"text-[#c08cf0]",
				`/state/${data.state.id}/region`
			)}
			{@render fact("Power rating", String(data.state.rating || 0), FluentShield20Filled, "text-[#6fd14a]")}
			{#if data.energy}
				{@render fact("Energy available", `${data.energy.available} MW`, FluentLightbulb20Filled, "text-[#ffd35c]")}
			{/if}
		</dl>
	</section>

	<!-- At war: front reports -->
	{#if data.activeWars && data.activeWars.length > 0}
		<section class="space-y-2">
			<h2 class="section-title">At War</h2>
			{#each data.activeWars as war (war.id)}
				{@const opponent = war.isAttacker ? war.defender : war.attacker}
				<a
					href="/war/{war.id}"
					class="group flex items-center gap-3 rounded-sm p-3 sm:p-4 transition-colors {war.isAttacker
						? 'bg-red-600/10 border border-red-500/30 hover:border-red-400/50'
						: 'bg-[#2369b5]/18 border border-[#5eaef5]/30 hover:border-[#5eaef5]/50'}"
				>
					<Logo
						src={opponent.logo}
						alt={opponent.name}
						class="size-10 shrink-0"
						placeholderIcon={FluentShield20Filled}
						placeholderGradient={war.isAttacker ? "from-red-600/40 to-red-600/40" : "from-[#2369b5]/40 to-[#2369b5]/40"}
					/>
					<div class="flex-1 min-w-0">
						<p
							class="flex items-center gap-1.5 text-[10px] uppercase tracking-wide {war.isAttacker
								? 'text-red-300/80'
								: 'text-[#b3dcff]/80'}"
						>
							<span class="size-1.5 rounded-full animate-pulse {war.isAttacker ? 'bg-red-500' : 'bg-[#5eaef5]'}"></span>
							{war.isAttacker ? "Attacking" : "Defending against"}
						</p>
						<p class="text-sm font-bold text-[#f5efd8] truncate">{opponent.name}</p>
					</div>
					<FluentChevronRight20Filled class="size-4 shrink-0 text-[#a8a083] group-hover:text-[#f5efd8]" />
				</a>
			{/each}
		</section>
	{/if}

	<!-- Travel papers: what the viewer holds for this state -->
	{#if !data.visa.isResident || data.residencePermit.canApply}
		<section bind:this={papersEl} class="panel-muted rounded-sm p-4 space-y-3">
			<h2 class="section-title">Your Papers</h2>

			{#if !data.visa.isResident}
				{@const visaStamp = data.visa.blocVisaFree
					? { label: "Visa free", sub: "Bloc member", cls: "border-[#6fd14a]/70 text-[#b9f29a]" }
					: !data.visa.visaRequired
						? { label: "Open border", sub: "No visa needed", cls: "border-[#6fd14a]/70 text-[#b9f29a]" }
						: data.visa.hasActiveVisa && data.visa.activeVisa
							? {
									label: "Visa valid",
									sub: `until ${formatDate(data.visa.activeVisa.expiresAt)}`,
									cls: "border-[#5eaef5]/70 text-[#b3dcff]"
								}
							: data.visa.blockedReason
								? { label: "Denied", sub: data.visa.blockedReason, cls: "border-red-500/70 text-red-300" }
								: null}
				<div class="flex items-center gap-3 flex-wrap">
					<FluentBookCompass24Filled class="size-5 shrink-0 text-[#c08cf0]" />
					<span class="text-sm text-[#e6ddbf] mr-auto">Travel visa</span>
					{#if visaStamp}
						<span
							class="animate-stamp inline-flex flex-col items-center border-2 rounded-sm px-2.5 py-0.5 font-serif uppercase {visaStamp.cls}"
							style="--stamp-tilt: -5deg"
						>
							<span class="text-xs font-black tracking-widest">{visaStamp.label}</span>
							<span class="text-[9px] tracking-wide normal-case opacity-80 max-w-48 truncate">{visaStamp.sub}</span>
						</span>
						{#if data.visa.hasActiveVisa && data.visa.activeVisa && data.visa.visaRequired && !data.visa.blocVisaFree}
							<Button href="/visas" variant="soft-blue" size="sm">My Visas</Button>
						{/if}
					{:else}
						<Button
							type="button"
							size="sm"
							variant="soft-purple"
							icon={FluentBookCompass24Filled}
							onclick={() => (showVisaSheet = true)}
						>
							Request Visa
						</Button>
					{/if}
				</div>
			{/if}

			{#if data.residencePermit.canApply}
				<div
					class="flex items-center gap-3 flex-wrap {!data.visa.isResident
						? 'pt-3 border-t border-dashed border-[#c8b47a]/15'
						: ''}"
				>
					<FluentHome20Filled class="size-5 shrink-0 text-[#5eaef5]" />
					<span class="text-sm text-[#e6ddbf] mr-auto min-w-0">
						Residence permit
						{#if !data.residencePermit.hasPendingApp && data.residencePermit.currentRegionName}
							<span class="block text-xs text-[#a8a083]">You're in {data.residencePermit.currentRegionName}</span>
						{/if}
					</span>
					{#if data.residencePermit.hasPendingApp}
						<span
							class="animate-stamp border-2 border-[#f2b01e]/70 text-[#ffd35c] rounded-sm px-2.5 py-0.5 font-serif text-xs font-black uppercase tracking-widest"
							style="--stamp-tilt: 4deg"
						>
							Pending
						</span>
					{:else}
						<form
							method="POST"
							action="?/applyResidence"
							use:enhance={() => {
								isApplyingResidence = true;
								return async ({ update, result }) => {
									isApplyingResidence = false;
									await update();
									if (result.type === "success") celebrate(papersEl);
									else toastResult(result);
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
								Apply
							</Button>
						</form>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Head of state & cabinet -->
	{#if hasGovernment || data.nextElection}
		<section class="panel rounded-sm p-4 sm:p-5 space-y-4">
			<h2 class="section-title">Government</h2>

			{#if data.president}
				<div class="flex items-center gap-3">
					<UserLink
						id={data.president.userId}
						name={data.president.name}
						avatar={data.president.logo}
						party={{ abbreviation: data.president.partyAbbreviation, color: data.president.partyColor }}
						subtitle="President · Term {data.president.term} · since {formatDate(data.president.electedAt)}"
						size="md"
						class="min-w-0"
					/>
				</div>
			{/if}

			{#if data.ministers.length > 0}
				<ul class="grid sm:grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-[#c8b47a]/10">
					{#each data.ministers as minister (minister.userId)}
						<li class="min-w-0">
							<UserLink
								id={minister.userId}
								name={minister.name}
								avatar={minister.logo}
								party={{ abbreviation: minister.partyAbbreviation, color: minister.partyColor }}
								subtitle="Minister of {ministryNames[minister.ministry] ?? minister.ministry.replace(/_/g, ' ')}"
							/>
						</li>
					{/each}
				</ul>
			{/if}

			{#if data.parliamentMembers.length > 0}
				<a
					href="/state/{data.state.id}/parliament"
					class="group flex items-center gap-3 pt-3 border-t border-[#c8b47a]/10"
				>
					<div class="flex -space-x-2 shrink-0">
						{#each data.parliamentMembers.slice(0, 5) as member (member.userId)}
							<Logo
								src={member.logo}
								alt=""
								class="size-7 rounded-full ring-2 ring-[#242a1d]"
								placeholderGradient="from-[#4a5238] to-[#252b1e]"
							/>
						{/each}
					</div>
					<span class="flex-1 min-w-0 text-sm text-[#d3caa9] group-hover:text-[#ffcf47] transition-colors">
						{data.parliamentMembers.length}{data.parliamentMembers.length >= 20 ? "+" : ""} seats in parliament
					</span>
					<FluentChevronRight20Filled class="size-4 shrink-0 text-[#a8a083] group-hover:text-[#ffcf47]" />
				</a>
			{/if}

			{#if data.nextElection && electionState}
				{@const isActive = electionState === "active"}
				<a
					href="/state/{data.state.id}/election/{data.nextElection.id}"
					class="group flex items-center gap-3 rounded-sm p-3 border transition-colors {isActive
						? 'bg-[#f2b01e]/12 border-[#f2b01e]/35 hover:border-[#f2b01e]/60'
						: 'bg-[#1a1f15]/60 border-[#c8b47a]/15 hover:border-[#f2b01e]/40'}"
				>
					<FluentVote20Filled class="size-5 shrink-0 {isActive ? 'text-[#ffd35c]' : 'text-[#5eaef5]'}" />
					<div class="flex-1 min-w-0">
						<p class="text-sm font-bold text-[#f5efd8] flex items-center gap-2 flex-wrap">
							{data.nextElection.isInaugural ? "Founding election" : "Parliamentary election"}
							{#if isActive}<Badge tone="amber" size="xs">Polls open</Badge>{/if}
						</p>
						<p class="text-xs text-[#a8a083] truncate">
							{data.nextElection.totalSeats} seats ·
							{#if isActive}
								closes in {getTimeRemaining(data.nextElection.endDate) ?? "moments"}
							{:else}
								opens in {getTimeRemaining(data.nextElection.startDate) ?? "moments"}
							{/if}
						</p>
					</div>
					{#if isActive}
						<span class="shrink-0 text-xs font-semibold text-[#ffd35c] group-hover:text-[#ffe58f]">Vote →</span>
					{:else}
						<FluentChevronRight20Filled class="size-4 shrink-0 text-[#a8a083] group-hover:text-[#ffcf47]" />
					{/if}
				</a>
				{#if data.nextElection.isInaugural && !isActive}
					<Button href="/party/create" variant="secondary" size="sm">Found a Party</Button>
				{/if}
			{/if}
		</section>
	{/if}

	<!-- Offices of state -->
	<nav class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" aria-label="State offices">
		{#each offices as office (office.href)}
			<a href={office.href} class="group panel-interactive rounded-sm p-3 flex items-center gap-2 min-w-0">
				<office.icon class="size-5 shrink-0 {office.tone}" />
				<span class="text-sm font-semibold text-[#e6ddbf] group-hover:text-[#ffcf47] transition-colors truncate">
					{office.label}
				</span>
			</a>
		{/each}
	</nav>

	<!-- Regions -->
	{#if sortedRegions.length > 0}
		<section class="space-y-3">
			<div class="flex items-baseline justify-between gap-3">
				<h2 class="section-title">Regions</h2>
				<a href="/state/{data.state.id}/region" class="text-xs text-[#a8a083] hover:text-[#ffcf47]">All →</a>
			</div>
			<ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
				{#each sortedRegions.slice(0, 9) as region (region.id)}
					<li>
						<a
							href="/region/{region.id}"
							class="group panel-interactive rounded-sm p-2.5 flex items-center gap-3 min-w-0"
						>
							<Logo
								src={region.logo}
								alt=""
								class="size-9 shrink-0 rounded-sm"
								placeholderIcon={FluentShield20Filled}
							/>
							<span class="flex-1 min-w-0">
								<span
									class="block text-sm font-semibold text-[#f5efd8] truncate group-hover:text-[#ffcf47] transition-colors"
								>
									{region.name}
								</span>
								<span class="block text-xs text-[#a8a083]">
									{region.population.toLocaleString()} residents · rating {region.rating ?? 0}
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.warHistory.length > 0}
		<section class="space-y-3">
			<h2 class="section-title">War Record</h2>
			<WarHistory wars={data.warHistory} />
		</section>
	{/if}

	<!-- Natural resources + tax schedule side by side on wide screens -->
	{#if resourceEntries.length > 0 || data.taxes.length > 0}
		<div class="grid md:grid-cols-2 gap-4">
			{#if resourceEntries.length > 0}
				<section class="panel rounded-sm p-4 sm:p-5">
					<h2 class="section-title mb-3">Natural Resources</h2>
					<ul class="grid grid-cols-2 gap-2">
						{#each resourceEntries as resource (resource.name)}
							<li class="panel-muted rounded-sm px-3 py-2 flex items-center gap-2 min-w-0">
								<ResourceIcon name={resource.name} class="size-5 shrink-0" />
								<span class="text-xs text-[#a8a083] capitalize truncate">{resource.name}</span>
								<span class="ml-auto text-sm font-bold font-mono text-[#f5efd8]">
									{resource.value.toLocaleString()}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if data.taxes.length > 0}
				<section class="panel rounded-sm p-4 sm:p-5">
					<h2 class="section-title mb-3">Tax Schedule</h2>
					<ul>
						{#each data.taxes as tax (tax.id)}
							<li class="flex items-center gap-2 py-2 border-b border-dashed border-[#c8b47a]/15 last:border-0">
								<span class="text-sm text-[#e6ddbf]">{taxNames[tax.taxType] ?? tax.taxType.replace(/_/g, " ")} tax</span
								>
								<span class="flex-1 border-b border-dotted border-[#c8b47a]/20 translate-y-1" aria-hidden="true"></span>
								<span class="text-sm font-bold font-mono text-[#ffd35c]">{tax.taxRate}%</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}
</PageContainer>

{#if data.isPresident && data.editForm}
	<EditStateSheet
		bind:open={showEditStateSheet}
		editForm={data.editForm}
		stateName={data.state.name}
		logoUrl={data.state.logo}
		onCooldown={data.editOnCooldown}
		cooldownEndsAt={data.editCooldownEndsAt}
	/>
{/if}

<!-- War declaration -->
<Modal bind:open={showWarModal} title="Declare War" size="default">
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<Logo
				src={data.state.logo}
				alt={data.state.name}
				class="size-12 shrink-0 rounded-sm"
				placeholderIcon={FluentFlag20Filled}
			/>
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-[0.2em] text-red-300">Declaration of war against</p>
				<p class="font-serif text-xl font-black text-[#f5efd8] truncate">{data.state.name}</p>
			</div>
		</div>
		<p class="text-sm text-red-300 flex items-start gap-2">
			<FluentWarning20Filled class="size-4 mt-0.5 shrink-0" />
			<span>
				Can't be undone.
				{#if data.bloc}
					Member of <strong>{data.bloc.name}</strong> — the whole bloc may answer.
				{/if}
			</span>
		</p>

		<form
			method="POST"
			action="?/declareWar"
			use:enhance={() => {
				isDeclaringWar = true;
				return async ({ result, update }) => {
					isDeclaringWar = false;
					showWarModal = false;
					await update();
					toastResult(result);
				};
			}}
		>
			<div class="flex gap-3 justify-end pt-2">
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
					Declare War
				</Button>
			</div>
		</form>
	</div>
</Modal>

<!-- Visa application: a passport page -->
{#if !data.visa.isResident && !data.visa.blocVisaFree && !data.visa.blockedReason && data.visa.visaRequired}
	<Modal bind:open={showVisaSheet} title="Visa Application" size="default">
		<div class="space-y-4">
			<div
				class="panel-muted rounded-sm p-4 border-l-4"
				style="border-left-color: {data.state.background || '#c08cf0'}"
			>
				<div class="flex items-center gap-3">
					<Logo
						src={data.state.logo}
						alt={data.state.name}
						class="size-12 shrink-0 rounded-sm"
						placeholderIcon={FluentFlag20Filled}
					/>
					<div class="min-w-0">
						<p class="text-[10px] uppercase tracking-[0.2em] text-[#a8a083]">Entry visa · 14 days</p>
						<p class="font-serif text-xl font-black text-[#f5efd8] truncate">{data.state.name}</p>
					</div>
				</div>
				<dl class="mt-4 space-y-1.5 text-sm">
					<div class="flex justify-between gap-3">
						<dt class="text-[#a8a083]">Fee</dt>
						<dd class="font-mono font-bold text-[#f5efd8]">${data.visa.visaCost.toLocaleString()}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-[#a8a083]">of which tax ({data.visa.visaTaxRate}%)</dt>
						<dd class="font-mono text-[#d3caa9]">
							${Math.floor((data.visa.visaCost * data.visa.visaTaxRate) / 100).toLocaleString()}
						</dd>
					</div>
					<div class="flex justify-between gap-3 pt-1.5 border-t border-dashed border-[#c8b47a]/20">
						<dt class="text-[#a8a083]">Your wallet</dt>
						<dd class="font-mono {data.walletBalance < data.visa.visaCost ? 'text-red-300' : 'text-[#b9f29a]'}">
							${data.walletBalance.toLocaleString()}
						</dd>
					</div>
				</dl>
			</div>

			<form
				method="POST"
				action="?/purchaseVisa"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success") {
							showVisaSheet = false;
							celebrate(papersEl);
						} else toastResult(result);
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
						Pay ${data.visa.visaCost.toLocaleString()}
					{:else}
						Apply for Visa
					{/if}
				</Button>
				{#if data.walletBalance < data.visa.visaCost}
					<p class="text-xs text-red-300 text-center mt-2">Not enough money</p>
				{:else if !data.visa.autoApprove}
					<p class="text-xs text-[#a8a083] text-center mt-2">Reviewed by the Foreign Minister</p>
				{/if}
			</form>
		</div>
	</Modal>
{/if}
