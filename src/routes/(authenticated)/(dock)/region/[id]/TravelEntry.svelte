<!-- src/routes/(authenticated)/(dock)/region/[id]/TravelEntry.svelte -->
<!-- Travel & entry: everything about getting into this region in one place.
     The entry rule, the viewer's visa as a passport page (with the
     application), and the ticket (fare, duration, distance) with a travel
     button that says why it's locked when it is. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { tick } from "svelte";
	import FluentAirplaneTakeOff20Filled from "~icons/fluent/airplane-take-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";
	import Modal from "#lib/component/Modal.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { formatDate, getDaysRemaining } from "#lib/utils/formatting.js";
	import PassportPage from "../../visas/PassportPage.svelte";
	import VisaStamp from "../../visas/VisaStamp.svelte";

	interface VisaInfo {
		needsVisa: boolean;
		hasActiveVisa: boolean;
		hasPendingApplication: boolean;
		settings?: { visaRequired: boolean; visaCost: number | string; visaTaxRate: number; autoApprove: boolean } | null;
		activeVisa: { expiresAt: string; cost: number; taxPaid: number } | null;
		blocVisaFree: boolean;
		blockedReason: string | null;
	}

	interface Props {
		regionId: number;
		regionName: string;
		stateName: string | null;
		isIndependent: boolean;
		allowsFreeMovement: boolean;
		hasInauguralElection: boolean;
		hasPendingResidenceApp: boolean;
		hasResidence: boolean;
		isInParty: boolean;
		/** Whether the viewer is already on the road somewhere. */
		travelling: boolean;
		travelInfo: { distanceKm: number; cost: number; timeHours: number } | null;
		walletBalance: number;
		visa: VisaInfo;
		/** Set when borders, visas, war or sanctions keep the viewer out. */
		entryBlockedReason: string | null;
	}

	const {
		regionId,
		regionName,
		stateName,
		isIndependent,
		allowsFreeMovement,
		hasInauguralElection,
		hasPendingResidenceApp,
		hasResidence,
		isInParty,
		travelling,
		travelInfo,
		walletBalance,
		visa,
		entryBlockedReason
	}: Props = $props();

	let showTravelSheet = $state(false);
	let showVisaSheet = $state(false);
	let isDeparting = $state(false);
	let visaSubmitting = $state(false);

	const showVisa = $derived(visa.blocVisaFree || !!visa.blockedReason || visa.needsVisa);
	const showTravel = $derived((isIndependent || !hasResidence) && !travelling);
	const canFoundState = $derived(isIndependent && hasResidence);
	const visible = $derived(showVisa || showTravel);

	const visaFee = $derived(visa.settings ? Number(visa.settings.visaCost) : 0);
	const visaTax = $derived(visa.settings ? Math.floor((visaFee * visa.settings.visaTaxRate) / 100) : 0);
	const canAfford = $derived(!travelInfo || walletBalance >= travelInfo.cost);

	// The rule for getting in, in a few words.
	const entryRule = $derived(
		isIndependent
			? "No state · open borders"
			: allowsFreeMovement
				? hasInauguralElection
					? "Free movement"
					: "Free movement until the first election"
				: hasPendingResidenceApp
					? "Residence application pending"
					: "Entry by visa or residence"
	);

	// Why the travel button is locked, or null when it isn't.
	const lockReason = $derived.by(() => {
		if (!isIndependent && !allowsFreeMovement && entryBlockedReason) return entryBlockedReason;
		if (!travelInfo) return "You need a residence to travel from.";
		if (!canAfford)
			return `The fare is $${travelInfo.cost.toLocaleString()}, you have $${walletBalance.toLocaleString()}.`;
		return null;
	});

	function afterVisa() {
		visaSubmitting = true;
		return async ({ result, update }: { result: { type: string }; update: () => Promise<void> }) => {
			await update();
			visaSubmitting = false;
			toastResult(result as Parameters<typeof toastResult>[0]);
			if (result.type === "success") {
				showVisaSheet = false;
				await tick();
				celebrate(document.getElementById("region-visa"));
			}
		};
	}
</script>

{#if visible}
	<section
		id="travel-entry"
		class="panel rounded-sm p-4 sm:p-5 space-y-4 {isIndependent ? 'border-warning/45' : ''}"
		aria-labelledby="travel-entry-title"
	>
		<header class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
			<h2 id="travel-entry-title" class="section-title">
				{isIndependent ? "Unclaimed territory" : "Travel & entry"}
			</h2>
			<p
				class="text-sm flex items-center gap-1.5 {hasPendingResidenceApp && !isIndependent
					? 'text-warning'
					: 'text-fg-muted'}"
			>
				{#if hasPendingResidenceApp && !isIndependent}
					<FluentClock20Filled class="size-4 shrink-0" />
				{/if}
				{entryRule}
			</p>
		</header>

		<div class="grid gap-4 {showVisa && (showTravel || canFoundState) ? 'md:grid-cols-2' : ''}">
			<!-- Visa: a page of the viewer's passport -->
			{#if showVisa}
				<div id="region-visa" class="min-w-0">
					<PassportPage heading="Visa · {stateName ?? regionName}">
						<div class="relative min-h-28 flex flex-col sm:flex-row sm:items-center gap-4">
							<div class="flex-1 min-w-0">
								{#if visa.blocVisaFree}
									<p class="font-serif text-lg font-bold">Visa-free</p>
									<p class="text-sm text-[#7a5427]">Bloc members travel freely.</p>
								{:else if visa.blockedReason}
									<p class="font-serif text-lg font-bold text-[#a3241b]">Entry refused</p>
									<p class="text-sm text-[#7a5427] break-words">{visa.blockedReason}</p>
								{:else if visa.hasActiveVisa && visa.activeVisa}
									{@const daysLeft = getDaysRemaining(visa.activeVisa.expiresAt)}
									<dl class="grid grid-cols-2 gap-x-4 gap-y-2 max-w-xs">
										<div>
											<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Valid until</dt>
											<dd class="text-sm font-semibold font-mono">{formatDate(visa.activeVisa.expiresAt)}</dd>
										</div>
										<div>
											<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Remaining</dt>
											<dd class="text-sm font-semibold {daysLeft > 3 ? '' : 'text-[#a3241b]'}">
												{daysLeft} day{daysLeft === 1 ? "" : "s"}
											</dd>
										</div>
										{#if visa.activeVisa.cost > 0}
											<div class="col-span-2">
												<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Fee paid</dt>
												<dd class="text-sm font-mono">
													${Number(visa.activeVisa.cost).toLocaleString()}
													<span class="text-[#7a5427]/70">
														incl. ${Number(visa.activeVisa.taxPaid).toLocaleString()} tax
													</span>
												</dd>
											</div>
										{/if}
									</dl>
								{:else if visa.hasPendingApplication}
									<p class="font-serif text-lg font-bold">Application lodged</p>
									<p class="text-sm text-[#7a5427]">Awaiting the Foreign Minister.</p>
								{:else}
									<p class="font-serif text-lg font-bold">Visa required</p>
									{#if visa.settings}
										<p class="text-sm text-[#7a5427]">
											{visa.settings.visaRequired ? `$${visaFee.toLocaleString()} · 14 days` : "Free · 14 days"}
										</p>
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
								{#if visa.blocVisaFree}
									<VisaStamp label="Free entry" title="Bloc" tone="blue" tilt={-9} />
								{:else if visa.blockedReason}
									<VisaStamp label="Entry" title="Refused" tone="red" shape="rect" tilt={-7} />
								{:else if visa.hasActiveVisa && visa.activeVisa}
									<VisaStamp
										label="Approved"
										title={stateName ?? undefined}
										date={formatDate(visa.activeVisa.expiresAt)}
										tone="green"
										tilt={-13}
									/>
								{:else if visa.hasPendingApplication}
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

			<!-- The ticket: fare, time, distance and the button -->
			{#if canFoundState}
				<div class="flex flex-col justify-center gap-2">
					{#if !isInParty}
						<Button variant="primary" size="sm" icon={FluentFlag20Filled} href="/party/create?regionId={regionId}">
							Found a State
						</Button>
					{:else}
						<p class="text-xs text-fg-muted">Leave your party to found a state here.</p>
					{/if}
				</div>
			{:else if showTravel}
				<div class="min-w-0 flex flex-col gap-3">
					{#if travelInfo}
						<dl class="grid grid-cols-3 gap-2 text-sm">
							<div class="rounded-sm bg-surface-2/60 px-3 py-2">
								<dt class="text-[9px] uppercase tracking-[0.2em] text-fg-muted">Fare</dt>
								<dd class="font-mono font-bold text-warning">${travelInfo.cost.toLocaleString()}</dd>
							</div>
							<div class="rounded-sm bg-surface-2/60 px-3 py-2">
								<dt class="text-[9px] uppercase tracking-[0.2em] text-fg-muted">Duration</dt>
								<dd class="font-mono">{travelInfo.timeHours} h</dd>
							</div>
							<div class="rounded-sm bg-surface-2/60 px-3 py-2">
								<dt class="text-[9px] uppercase tracking-[0.2em] text-fg-muted">Distance</dt>
								<dd class="font-mono">{travelInfo.distanceKm} km</dd>
							</div>
						</dl>
					{/if}
					<Button
						variant={isIndependent || allowsFreeMovement ? "soft-emerald" : "soft-blue"}
						size="sm"
						icon={lockReason ? FluentLockClosed20Filled : FluentAirplaneTakeOff20Filled}
						disabled={!!lockReason}
						onclick={() => (showTravelSheet = true)}
					>
						Travel here
					</Button>
					{#if lockReason}
						<p class="text-sm text-hostile-fg" data-testid="travel-lock-reason">{lockReason}</p>
					{/if}
				</div>
			{/if}
		</div>
	</section>
{/if}

<!-- Ticket -->
{#if showTravel && travelInfo}
	<Modal bind:open={showTravelSheet} title="Book Travel" size="default">
		<div class="space-y-4">
			<div class="flex rounded-sm overflow-hidden border border-[#8ea6e0]/25 bg-[#131c33]">
				<div class="flex-1 min-w-0 p-4">
					<p class="text-[9px] uppercase tracking-[0.25em] text-[#8e9abb]">Ticket · To</p>
					<p class="font-serif text-xl font-bold text-[#eef2ff] truncate">{regionName}</p>
					<dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
						<div>
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Duration</dt>
							<dd class="font-mono text-[#dbe2f4]">{travelInfo.timeHours} h</dd>
						</div>
						<div>
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Distance</dt>
							<dd class="font-mono text-[#dbe2f4]">{travelInfo.distanceKm} km</dd>
						</div>
					</dl>
				</div>
				<div
					class="w-24 shrink-0 border-l-2 border-dashed border-[#8ea6e0]/25 p-3 flex flex-col items-center justify-center"
				>
					<p class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Fare</p>
					<p class="font-mono text-lg font-bold text-[#ffcb6b]">${travelInfo.cost.toLocaleString()}</p>
				</div>
			</div>

			<ResourceRequirements costs={{ currency: travelInfo.cost }} available={{ currency: walletBalance }} />

			<form
				method="POST"
				action="?/startTravel"
				use:enhance={() => {
					isDeparting = true;
					return async ({ result, update }) => {
						showTravelSheet = false;
						await update();
						isDeparting = false;
						if (result.type === "success") {
							await tick();
							celebrate(document.getElementById("boarding-pass"));
						}
					};
				}}
			>
				<Button type="submit" block icon={FluentAirplaneTakeOff20Filled} disabled={!canAfford} loading={isDeparting}>
					Depart — ${travelInfo.cost.toLocaleString()}
				</Button>
			</form>
		</div>
	</Modal>
{/if}

<!-- Visa application -->
{#if visa.settings && !visa.blocVisaFree}
	<Modal bind:open={showVisaSheet} title="Visa Application" size="default">
		<div class="space-y-4">
			<PassportPage heading="Application · {stateName}">
				{#if visa.settings.visaRequired}
					<dl class="space-y-1.5 font-mono text-sm">
						<div class="flex justify-between gap-3">
							<dt class="text-[#7a5427]">Visa fee</dt>
							<dd class="font-bold">${visaFee.toLocaleString()}</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-[#7a5427]">of which tax ({visa.settings.visaTaxRate}%)</dt>
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

			{#if visa.settings.visaRequired}
				{#if !visa.settings.autoApprove}
					<p class="field-hint flex items-center gap-1.5">
						<FluentClock20Filled class="size-4" />
						Reviewed by the Foreign Minister
					</p>
				{/if}

				<form method="POST" action="?/purchaseVisa" use:enhance={afterVisa}>
					<Button
						type="submit"
						block
						icon={FluentBookCompass24Filled}
						loading={visaSubmitting}
						disabled={walletBalance < visaFee}
					>
						{#if visa.settings.autoApprove}
							Purchase Visa — ${visaFee.toLocaleString()}
						{:else}
							Apply for Visa
						{/if}
					</Button>
					{#if walletBalance < visaFee}
						<p class="field-error text-center">
							Insufficient funds — you have ${walletBalance.toLocaleString()}
						</p>
					{/if}
				</form>
			{:else}
				<form method="POST" action="?/purchaseVisa" use:enhance={afterVisa}>
					<Button type="submit" block icon={FluentCheckmark20Filled} loading={visaSubmitting}>Get Free Visa</Button>
				</form>
			{/if}
		</div>
	</Modal>
{/if}
