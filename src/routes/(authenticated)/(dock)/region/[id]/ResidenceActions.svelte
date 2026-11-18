<!-- src/routes/(authenticated)/(dock)/region/[id]/ResidenceActions.svelte -->
<!-- The travel desk for a region the player doesn't live in: the entry rule in
     a few words, and a ticket to book the journey. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { tick } from "svelte";
	import FluentAirplaneTakeOff20Filled from "~icons/fluent/airplane-take-off-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { celebrate } from "#lib/utils/celebrate.js";

	interface Props {
		regionId: number;
		regionName: string;
		isIndependent: boolean;
		allowsFreeMovement: boolean;
		hasInauguralElection: boolean;
		hasPendingResidenceApp: boolean;
		hasResidence?: boolean;
		isInParty?: boolean;
		travelInfo: { distanceKm: number; cost: number; timeHours: number } | null;
		walletBalance?: number;
		/** Set when borders, visas, war or sanctions keep the viewer out. */
		entryBlockedReason?: string | null;
	}

	const {
		regionId,
		regionName,
		isIndependent,
		allowsFreeMovement,
		hasInauguralElection,
		hasPendingResidenceApp,
		hasResidence = false,
		isInParty = false,
		travelInfo,
		walletBalance = 0,
		entryBlockedReason = null
	}: Props = $props();

	let showTravelSheet = $state(false);
	let isDeparting = $state(false);

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
</script>

<section
	class="panel rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 {isIndependent
		? 'border-[#f2b01e]/45'
		: ''}"
>
	<div class="flex-1 min-w-0">
		<p class="text-[10px] uppercase tracking-[0.25em] text-[#a8a083]">
			{isIndependent ? "Unclaimed territory" : "Travel desk"}
		</p>
		<p
			class="text-sm mt-0.5 flex items-center gap-1.5 {hasPendingResidenceApp && !isIndependent
				? 'text-[#ffd35c]'
				: 'text-[#d3caa9]'}"
		>
			{#if hasPendingResidenceApp && !isIndependent}
				<FluentClock20Filled class="size-4 shrink-0" />
			{/if}
			{entryRule}
		</p>
		{#if entryBlockedReason}
			<p class="text-sm text-red-300 mt-1">{entryBlockedReason}</p>
		{/if}
	</div>

	{#if isIndependent && hasResidence}
		{#if !isInParty}
			<Button variant="primary" size="sm" icon={FluentFlag20Filled} href="/party/create?regionId={regionId}">
				Found a State
			</Button>
		{:else}
			<p class="text-xs text-[#a8a083]">Leave your party to found a state here.</p>
		{/if}
	{:else}
		<Button
			variant={isIndependent || allowsFreeMovement ? "soft-emerald" : "soft-blue"}
			size="sm"
			icon={FluentAirplaneTakeOff20Filled}
			disabled={!isIndependent && !allowsFreeMovement && !!entryBlockedReason}
			onclick={() => (showTravelSheet = true)}
		>
			Travel here
		</Button>
	{/if}
</section>

<!-- Ticket -->
<Modal bind:open={showTravelSheet} title="Book Travel" size="default">
	<div class="space-y-4">
		<div class="flex rounded-sm overflow-hidden border border-[#c8b47a]/25 bg-[#1a1f15]">
			<div class="flex-1 min-w-0 p-4">
				<p class="text-[9px] uppercase tracking-[0.25em] text-[#a8a083]">Ticket · To</p>
				<p class="font-serif text-xl font-bold text-[#f5efd8] truncate">{regionName}</p>
				{#if travelInfo}
					<dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
						<div>
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#a8a083]">Duration</dt>
							<dd class="font-mono text-[#e6ddbf]">{travelInfo.timeHours} h</dd>
						</div>
						<div>
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#a8a083]">Distance</dt>
							<dd class="font-mono text-[#e6ddbf]">{travelInfo.distanceKm} km</dd>
						</div>
					</dl>
				{/if}
			</div>
			{#if travelInfo}
				<div
					class="w-24 shrink-0 border-l-2 border-dashed border-[#c8b47a]/25 p-3 flex flex-col items-center justify-center"
				>
					<p class="text-[9px] uppercase tracking-[0.2em] text-[#a8a083]">Fare</p>
					<p class="font-mono text-lg font-bold text-[#ffd35c]">${travelInfo.cost.toLocaleString()}</p>
				</div>
			{/if}
		</div>

		{#if travelInfo}
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
				{#if !canAfford}
					<p class="field-error text-center">
						Insufficient funds — you have ${walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		{:else}
			<p class="field-hint flex items-center gap-1.5">
				<FluentClock20Filled class="size-4" />
				You need a residence to travel from.
			</p>
		{/if}
	</div>
</Modal>
