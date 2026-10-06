<!-- src/routes/(authenticated)/(dock)/region/[id]/ResidenceActions.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentLocationLive20Filled from "~icons/fluent/location-live-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Button from "#lib/component/ui/Button.svelte";

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
		walletBalance = 0
	} = $props<{
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
	}>();

	let showTravelSheet = $state(false);

	const canAfford = $derived(!travelInfo || walletBalance >= travelInfo.cost);
</script>

{#if isIndependent}
	<!-- Unclaimed territory: one block, one button that adapts to where the viewer stands -->
	<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#f2b01e]/15 rounded-sm flex items-center justify-center flex-shrink-0">
				<FluentFlag20Filled class="size-6 text-[#ffd35c]" />
			</div>
			<div class="flex-1">
				<h2 class="text-lg font-semibold text-[#f5efd8] mb-1">Unclaimed Territory</h2>
				<p class="text-[#d3caa9] text-sm mb-4">
					This region has no state and open borders.
					{#if hasResidence}
						Found a political party here to establish a government.
					{:else}
						Move here, then found a political party to establish a government.
					{/if}
				</p>
				{#if !hasResidence}
					<Button variant="soft-emerald" size="sm" icon={FluentHome20Filled} onclick={() => (showTravelSheet = true)}>
						Travel to this Region
					</Button>
				{:else if !isInParty}
					<Button variant="primary" size="sm" icon={FluentFlag20Filled} href="/party/create?regionId={regionId}">
						Found a State
					</Button>
				{:else}
					<p class="text-xs text-[#a8a083]">
						You're already a member of a party, so you can't found a new one here.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else if allowsFreeMovement}
	<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-5">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#3f8a2a]/25 rounded-sm flex items-center justify-center flex-shrink-0">
				<FluentLocationLive20Filled class="size-6 text-[#6fd14a]" />
			</div>
			<div class="flex-1">
				<h2 class="text-lg font-semibold text-[#f5efd8] mb-1">Free Movement Zone</h2>
				<p class="text-[#d3caa9] text-sm mb-4">
					{#if !hasInauguralElection}
						Free movement available until inaugural election.
					{/if}
				</p>
				<Button variant="soft-emerald" size="sm" icon={FluentHome20Filled} onclick={() => (showTravelSheet = true)}>
					Travel to this Region
				</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="panel rounded-sm p-5">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#2369b5]/18 rounded-sm flex items-center justify-center flex-shrink-0">
				<FluentHome20Filled class="size-6 text-[#5eaef5]" />
			</div>
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-[#f5efd8] mb-2">Travel to this Region</h3>
				{#if hasPendingResidenceApp}
					<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-3 mb-3">
						<p class="text-sm text-[#ffd35c] flex items-center gap-2">
							<FluentClock20Filled class="size-4" />
							Residence application pending - will be reviewed upon arrival
						</p>
					</div>
				{:else}
					<p class="text-sm text-[#d3caa9] mb-3">
						Entry requires a visa approved by the Foreign Minister or President, or existing residency.
					</p>
				{/if}
				<Button variant="soft-blue" size="sm" icon={FluentHome20Filled} onclick={() => (showTravelSheet = true)}>
					Travel to this Region
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Travel Confirmation Bottom Sheet -->
<Modal bind:open={showTravelSheet} title="Travel to {regionName}" size="default">
	<div class="space-y-5">
		<div class="flex items-center gap-4">
			<div class="size-14 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center">
				<FluentLocationLive20Filled class="size-7 text-[#5eaef5]" />
			</div>
			<div>
				<h3 class="text-xl font-bold text-[#f5efd8]">{regionName}</h3>
				<p class="text-sm text-[#a8a083]">Review your journey before departing</p>
			</div>
		</div>

		{#if travelInfo}
			<div class="panel-muted rounded-sm p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a8a083] flex items-center gap-2">
						<FluentClock20Filled class="size-4" />
						Travel Time
					</span>
					<span class="text-sm font-medium text-[#f5efd8]">
						{travelInfo.timeHours} hour{travelInfo.timeHours === 1 ? "" : "s"}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a8a083]">Distance</span>
					<span class="text-sm font-medium text-[#f5efd8]">{travelInfo.distanceKm} km</span>
				</div>
				<div class="border-t border-[#c8b47a]/15 pt-3">
					<ResourceRequirements costs={{ currency: travelInfo.cost }} available={{ currency: walletBalance }} />
				</div>
			</div>

			<form
				method="POST"
				action="?/startTravel"
				use:enhance={() => {
					return async ({ update }) => {
						showTravelSheet = false;
						await update();
					};
				}}
			>
				<Button type="submit" block icon={FluentHome20Filled} disabled={!canAfford}>
					Start Travel — ${travelInfo.cost.toLocaleString()}
				</Button>
				{#if !canAfford}
					<p class="field-error text-center">
						Insufficient funds — you have ${walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		{:else}
			<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-4">
				<p class="text-sm text-[#ffd35c] flex items-center gap-2">
					<FluentClock20Filled class="size-4" />
					You need an existing residence to travel between regions.
				</p>
			</div>
		{/if}
	</div>
</Modal>
