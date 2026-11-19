<!-- src/routes/(authenticated)/(dock)/region/[id]/+page.svelte -->
<!-- A region as a gazetteer entry: coat of arms, facts and figures, its
     governor and industry. Visas are a passport page, travel a ticket. -->
<script lang="ts">
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { enhance } from "$app/forms";
	import { tick } from "svelte";
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
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";

	import Logo from "#lib/component/Logo.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import UserLink from "#lib/component/UserLink.svelte";

	import { Button, Badge, SearchSelect } from "#lib/component/ui/index.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { formatDate, getDaysRemaining, regionCoatUrl } from "#lib/utils/formatting.js";
	import { BUILDING_TEMPLATES, VALID_BUILDING_TYPES as BUILDING_ORDER } from "#lib/config/index.js";
	import BorderingRegions from "./BorderingRegions.svelte";
	import BattleHistory from "#lib/component/BattleHistory.svelte";
	import ResidenceActions from "./ResidenceActions.svelte";
	import TravelBanner from "./TravelBanner.svelte";
	import RegionSituation from "./RegionSituation.svelte";
	import PassportPage from "../../visas/PassportPage.svelte";
	import VisaStamp from "../../visas/VisaStamp.svelte";

	const { data, form } = $props();

	let showVisaSheet = $state(false);
	let visaSubmitting = $state(false);
	let isAttacking = $state(false);
	const warItems = $derived(
		(data.attackableWars as { id: number; attacker: { name: string }; defender: { name: string } }[]).map((w) => ({
			id: w.id,
			name: `${w.attacker.name} vs ${w.defender.name}`
		}))
	);
	let attackWarId = $state<string | undefined>(undefined);
	$effect(() => {
		if (!attackWarId && warItems.length) attackWarId = String(warItems[0].id);
	});

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

	const visaFee = $derived(data.visa.settings ? Number(data.visa.settings.visaCost) : 0);
	const visaTax = $derived(data.visa.settings ? Math.floor((visaFee * data.visa.settings.visaTaxRate) / 100) : 0);

	const resourceEntries = $derived(
		[
			{ name: "oil", value: data.region.oil },
			{ name: "steel", value: data.region.steel },
			{ name: "chromium", value: data.region.chromium },
			{ name: "tungsten", value: data.region.tungsten },
			{ name: "rubber", value: data.region.rubber },
			{ name: "aluminium", value: data.region.aluminium }
		].filter((r) => r.value)
	);

	const facts = $derived([
		{ label: "Population", value: data.population, href: `/region/${data.region.id}/population` },
		{ label: "Infrastructure", value: data.region.infrastructure || 0, href: `/region/${data.region.id}/construction` },
		{ label: "Power", value: data.region.economy || 0, href: `/region/${data.region.id}/construction` },
		{ label: "Fortifications", value: data.region.fortifications || 0, href: `/region/${data.region.id}/construction` }
	]);
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
	<meta property="og:image" content={regionCoatUrl(data.region.id)} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.region.name} />
	<meta
		name="twitter:description"
		content={`Region ${data.region.name} ${data.region.stateName ? "in " + data.region.stateName : ""} on PsyOps.`}
	/>
	<meta name="twitter:image" content={regionCoatUrl(data.region.id)} />
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Gazetteer entry -->
	<article
		class="panel rounded-sm overflow-hidden relative {data.ongoingBattle ? 'alarm-outline' : ''}"
		style={data.rulingPartyColor ? `border-top: 3px solid ${data.rulingPartyColor};` : undefined}
	>
		{#if data.region.stateLogo}
			<img
				loading="lazy"
				decoding="async"
				src={data.region.stateLogo}
				alt=""
				aria-hidden="true"
				class="pointer-events-none absolute -right-6 -top-6 size-40 object-cover opacity-[0.07] rounded-full"
			/>
		{/if}
		<div class="relative p-5 flex items-start gap-4 sm:gap-5">
			<Logo
				src={regionCoatUrl(data.region.id)}
				alt="Coat of arms of {data.region.name}"
				class="size-20 sm:size-24 rounded-sm shrink-0"
				placeholderIcon={FluentShield20Filled}
				placeholderGradient="from-politics-bg/40 to-politics-bg/40"
			/>
			<div class="flex-1 min-w-0">
				<h1 class="font-serif text-3xl sm:text-4xl font-bold text-fg break-words leading-tight">
					{data.region.name}
				</h1>
				<div class="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
					{#if data.region.stateName}
						<a
							href="/state/{data.region.stateId}"
							class="font-serif italic text-fg-soft hover:text-primary-hover transition-colors"
						>
							{data.region.stateName}
						</a>
					{:else}
						<span class="font-serif italic text-primary-fg flex items-center gap-1.5">
							<FluentFlag20Filled class="size-4" />
							Unclaimed territory
						</span>
					{/if}
					{#if data.hasResidence}
						<Badge tone="blue" icon={FluentLocation20Filled} class="animate-pop-in">You are here</Badge>
					{/if}
				</div>
			</div>
		</div>

		<!-- Facts and figures -->
		<div class="relative grid grid-cols-2 sm:grid-cols-4 gap-px bg-line/12 border-t border-line/15">
			{#each facts as fact (fact.label)}
				<a href={fact.href} class="group px-4 py-3 bg-[#1e2318] hover:bg-[#262c1e] transition-colors">
					<p class="text-[10px] text-fg-muted uppercase tracking-wide">{fact.label}</p>
					<p class="text-xl font-bold font-mono text-fg group-hover:text-primary-hover transition-colors">
						{fact.value.toLocaleString()}
					</p>
				</a>
			{/each}
		</div>
	</article>

	<!-- On the road -->
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

	{#if form?.success && form?.message}
		<div class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-positive flex-shrink-0" />
			<div class="flex-1 text-sm">{form.message}</div>
		</div>
	{/if}

	<!-- Forces, intel and recon tasking -->
	<RegionSituation situation={data.situation} walletBalance={data.walletBalance} hasBattle={!!data.ongoingBattle} />

	<!-- Residence / travel -->
	{#if (isIndependent || !data.hasResidence) && !data.activeTravel}
		<ResidenceActions
			regionId={data.region.id}
			regionName={data.region.name}
			{isIndependent}
			allowsFreeMovement={data.allowsFreeMovement}
			hasInauguralElection={data.hasInauguralElection}
			hasPendingResidenceApp={data.hasPendingResidenceApp}
			hasResidence={data.hasResidence}
			isInParty={data.isInParty}
			travelInfo={data.travelInfo}
			walletBalance={data.walletBalance}
			entryBlockedReason={data.entry.allowed ? null : data.entry.reason}
		/>
	{/if}

	<!-- Visa: a page of the viewer's passport -->
	{#if data.visa.blocVisaFree || data.visa.blockedReason || data.visa.needsVisa}
		<div id="region-visa">
			<PassportPage heading="Visa · {data.region.stateName ?? data.region.name}">
				<div class="relative min-h-28 flex flex-col sm:flex-row sm:items-center gap-4">
					<div class="flex-1 min-w-0">
						{#if data.visa.blocVisaFree}
							<p class="font-serif text-lg font-bold">Visa-free</p>
							<p class="text-sm text-[#7a5427]">Bloc members travel freely.</p>
						{:else if data.visa.blockedReason}
							<p class="font-serif text-lg font-bold text-[#a3241b]">Entry refused</p>
							<p class="text-sm text-[#7a5427] break-words">{data.visa.blockedReason}</p>
						{:else if data.visa.hasActiveVisa && data.visa.activeVisa}
							{@const daysLeft = getDaysRemaining(data.visa.activeVisa.expiresAt)}
							<dl class="grid grid-cols-2 gap-x-4 gap-y-2 max-w-xs">
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Valid until</dt>
									<dd class="text-sm font-semibold font-mono">{formatDate(data.visa.activeVisa.expiresAt)}</dd>
								</div>
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Remaining</dt>
									<dd class="text-sm font-semibold {daysLeft > 3 ? '' : 'text-[#a3241b]'}">
										{daysLeft} day{daysLeft === 1 ? "" : "s"}
									</dd>
								</div>
								{#if data.visa.activeVisa.cost > 0}
									<div class="col-span-2">
										<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Fee paid</dt>
										<dd class="text-sm font-mono">
											${Number(data.visa.activeVisa.cost).toLocaleString()}
											<span class="text-[#7a5427]/70"
												>incl. ${Number(data.visa.activeVisa.taxPaid).toLocaleString()} tax</span
											>
										</dd>
									</div>
								{/if}
							</dl>
						{:else if data.visa.hasPendingApplication}
							<p class="font-serif text-lg font-bold">Application lodged</p>
							<p class="text-sm text-[#7a5427]">Awaiting the Foreign Minister.</p>
						{:else}
							<p class="font-serif text-lg font-bold">Visa required</p>
							{#if data.visa.settings}
								<Button
									type="button"
									size="sm"
									variant="secondary"
									class="mt-2"
									icon={FluentBookCompass24Filled}
									onclick={() => (showVisaSheet = true)}
								>
									Apply for Visa
								</Button>
							{/if}
						{/if}
					</div>

					<div class="shrink-0 self-center sm:self-auto">
						{#if data.visa.blocVisaFree}
							<VisaStamp label="Free entry" title="Bloc" tone="blue" tilt={-9} />
						{:else if data.visa.blockedReason}
							<VisaStamp label="Entry" title="Refused" tone="red" shape="rect" tilt={-7} />
						{:else if data.visa.hasActiveVisa && data.visa.activeVisa}
							<VisaStamp
								label="Approved"
								title={data.region.stateName}
								date={formatDate(data.visa.activeVisa.expiresAt)}
								tone="green"
								tilt={-13}
							/>
						{:else if data.visa.hasPendingApplication}
							<VisaStamp label="Received" title="Pending" tone="gold" shape="rect" tilt={6} />
						{:else}
							<div
								class="size-24 rounded-full border-2 border-dashed border-[#7a5427]/25 flex items-center justify-center text-[9px] uppercase tracking-[0.2em] text-[#7a5427]/40"
							>
								Stamp
							</div>
						{/if}
					</div>
				</div>
			</PassportPage>
		</div>
	{/if}

	<!-- Visa application -->
	{#if data.visa.settings && !data.visa.blocVisaFree}
		<Modal bind:open={showVisaSheet} title="Visa Application" size="default">
			<div class="space-y-4">
				<PassportPage heading="Application · {data.region.stateName}">
					{#if data.visa.settings.visaRequired}
						<dl class="space-y-1.5 font-mono text-sm">
							<div class="flex justify-between gap-3">
								<dt class="text-[#7a5427]">Visa fee</dt>
								<dd class="font-bold">${visaFee.toLocaleString()}</dd>
							</div>
							<div class="flex justify-between gap-3">
								<dt class="text-[#7a5427]">of which tax ({data.visa.settings.visaTaxRate}%)</dt>
								<dd>${visaTax.toLocaleString()}</dd>
							</div>
							<div class="flex justify-between gap-3 border-t border-dashed border-[#5b3d1a]/25 pt-1.5">
								<dt class="text-[#7a5427]">Valid for</dt>
								<dd>14 days</dd>
							</div>
						</dl>
					{:else}
						<p class="font-serif font-bold">Open borders</p>
						<p class="text-sm text-[#7a5427]">Free entry · valid for 14 days</p>
					{/if}
				</PassportPage>

				{#if data.visa.settings.visaRequired}
					{#if !data.visa.settings.autoApprove}
						<p class="field-hint flex items-center gap-1.5">
							<FluentClock20Filled class="size-4" />
							Reviewed by the Foreign Minister
						</p>
					{/if}

					<form
						method="POST"
						action="?/purchaseVisa"
						use:enhance={() => {
							visaSubmitting = true;
							return async ({ result, update }) => {
								await update();
								visaSubmitting = false;
								toastResult(result);
								if (result.type === "success") {
									showVisaSheet = false;
									await tick();
									celebrate(document.getElementById("region-visa"));
								}
							};
						}}
					>
						<Button
							type="submit"
							block
							icon={FluentBookCompass24Filled}
							loading={visaSubmitting}
							disabled={data.walletBalance < visaFee}
						>
							{#if data.visa.settings.autoApprove}
								Purchase Visa — ${visaFee.toLocaleString()}
							{:else}
								Apply for Visa
							{/if}
						</Button>
						{#if data.walletBalance < visaFee}
							<p class="field-error text-center">
								Insufficient funds — you have ${data.walletBalance.toLocaleString()}
							</p>
						{/if}
					</form>
				{:else}
					<form
						method="POST"
						action="?/purchaseVisa"
						use:enhance={() => {
							visaSubmitting = true;
							return async ({ result, update }) => {
								await update();
								visaSubmitting = false;
								toastResult(result);
								if (result.type === "success") {
									showVisaSheet = false;
									await tick();
									celebrate(document.getElementById("region-visa"));
								}
							};
						}}
					>
						<Button type="submit" block icon={FluentCheckmark20Filled} loading={visaSubmitting}>Get Free Visa</Button>
					</form>
				{/if}
			</div>
		</Modal>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
		<!-- Administration -->
		{#if !isIndependent}
			{@const underConstruction = data.buildings.filter((b) => b.isUnderConstruction)}
			<SectionCard>
				<h2 class="section-title mb-3">Administration</h2>
				<div class="space-y-3">
					{#if data.governor}
						<UserLink
							id={data.governor.userId}
							name={data.governor.name}
							avatar={data.governor.logo}
							subtitle="Governor · since {formatDate(data.governor.appointedAt)}"
							size="md"
						/>
					{:else}
						<p class="text-sm text-fg-muted">No governor appointed</p>
					{/if}
					<a
						href="/region/{data.region.id}/construction"
						class="panel-interactive rounded-sm p-3 flex items-center gap-3 group"
					>
						<FluentBuilding20Filled class="size-5 text-friendly shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-bold text-fg group-hover:text-primary-hover">Public works</p>
							<p class="text-xs text-fg-muted truncate">
								{#each BUILDING_ORDER as t, i}{i ? " · " : ""}{BUILDING_TEMPLATES[t].icon}
									{data.region[BUILDING_TEMPLATES[t].stat] ?? 0}{/each}
							</p>
						</div>
						{#if underConstruction.length}
							<Badge tone="amber">{underConstruction.length} building</Badge>
						{/if}
					</a>
				</div>
			</SectionCard>
		{/if}

		<!-- Natural resources -->
		{#if resourceEntries.length > 0}
			<SectionCard>
				<h2 class="section-title mb-3">Resources</h2>
				<dl class="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{#each resourceEntries as resource, i (resource.name)}
						<div
							class="panel-muted rounded-sm p-2.5 flex items-center gap-2 animate-pop-in"
							style="--rise-delay: {i * 40}ms"
						>
							<ResourceIcon name={resource.name} class="size-5 shrink-0" />
							<div class="min-w-0">
								<dt class="text-[10px] text-fg-muted uppercase tracking-wide capitalize">{resource.name}</dt>
								<dd class="text-sm font-bold font-mono text-fg">{resource.value}</dd>
							</div>
						</div>
					{/each}
				</dl>
			</SectionCard>
		{/if}

		<!-- Industry -->
		{#if data.factories.length > 0}
			<SectionCard class="md:col-span-2">
				<h2 class="section-title mb-3">
					<FluentBriefcase20Filled class="size-5 text-politics" />
					Industry
				</h2>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each data.factories as factory}
						<a href="/factory/{factory.id}" class="flex items-center gap-3 group panel-interactive rounded-sm p-3">
							<Logo
								src={factory.companyLogoUrl}
								alt={factory.company?.name || "Company"}
								class="size-10 shrink-0"
								placeholderIcon={FluentBriefcase20Filled}
								placeholderGradient="from-politics-bg/40 to-politics-bg/40"
							/>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-fg group-hover:text-primary-hover transition-colors truncate">
									{factory.name}
								</p>
								<p class="text-xs text-fg-muted capitalize truncate">
									{factory.factoryType} • {factory.company?.name}
								</p>
							</div>
						</a>
					{/each}
				</div>
			</SectionCard>
		{/if}
	</div>

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
					<div class="text-sm text-fg-soft">
						<span class="text-red-300 font-bold">{data.ongoingBattle.attackerState.name}</span>
						<span class="text-fg-muted"> → </span>
						<span class="text-friendly-fg font-bold"
							>{data.ongoingBattle.defenderState?.name || data.region.stateName}</span
						>
					</div>
				</div>
				<span class="text-fg-muted group-hover:text-red-300 transition-colors">→</span>
			</div>
		</a>
	{:else if data.recentFailedBattle}
		{@const cooldown = getCooldownRemaining(data.recentFailedBattle.cooldownEndsAt)}
		{#if cooldown}
			<div class="bg-primary/12 border border-primary/35 rounded-sm p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="size-10 bg-primary/15 rounded-sm border border-primary/35 flex items-center justify-center flex-shrink-0"
					>
						<span class="text-xl">🛡️</span>
					</div>
					<div class="flex-1">
						<div class="text-sm font-bold text-primary-fg">Region Under Protection</div>
						<div class="flex items-center gap-2 text-xs text-fg-muted mt-1">
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
						<div class="text-sm text-fg-soft">
							<span class="font-bold text-red-300">{war.attacker.name}</span>
							<span class="text-fg-muted mx-1">vs</span>
							<span class="font-bold text-friendly-fg">{war.defender.name}</span>
						</div>
					</div>
					<span class="text-fg-muted group-hover:text-red-300 transition-colors text-sm">→</span>
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
						<SearchSelect
							id="warId"
							name="warId"
							items={warItems}
							bind:value={attackWarId}
							placeholder="Choose a war…"
						/>
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

	<!-- Battles fought here -->
	{#if data.battleHistory.length}
		<SectionCard>
			<h2 class="section-title mb-3">Battle history</h2>
			<BattleHistory battles={data.battleHistory} />
		</SectionCard>
	{/if}

	<!-- Bordering Regions -->
	<BorderingRegions borderingRegions={data.borderingRegions} />
</PageContainer>
