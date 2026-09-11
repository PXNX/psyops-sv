<!-- src/routes/(authenticated)/(dock)/region/[id]/ResidenceActions.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentLocationLive20Filled from "~icons/fluent/location-live-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import Button from "$lib/component/ui/Button.svelte";

	const {
		regionId,
		regionName,
		isIndependent,
		allowsFreeMovement,
		hasInauguralElection,
		hasPendingResidenceApp,
		travelInfo,
		walletBalance = 0
	} = $props<{
		regionId: number;
		regionName: string;
		isIndependent: boolean;
		allowsFreeMovement: boolean;
		hasInauguralElection: boolean;
		hasPendingResidenceApp: boolean;
		travelInfo: { distanceKm: number; cost: number; timeHours: number } | null;
		walletBalance?: number;
	}>();

	let showTravelSheet = $state(false);

	const canAfford = $derived(!travelInfo || walletBalance >= travelInfo.cost);
</script>

{#if allowsFreeMovement}
	<div class="bg-[#587252]/15 border border-[#8fae88]/30 rounded-xl p-6">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#587252]/20 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentLocationLive20Filled class="size-6 text-[#8fae88]" />
			</div>
			<div class="flex-1">
				<h2 class="text-xl font-bold text-[#fff7e8] mb-2">Free Movement Zone</h2>
				<p class="text-[#d9ccb7] text-sm mb-4">
					{#if isIndependent}
						This independent region has open borders.
					{:else if !hasInauguralElection}
						Free movement available until inaugural election.
					{/if}
				</p>
				<Button variant="success" size="sm" icon={FluentHome20Filled} onclick={() => (showTravelSheet = true)}>
					Travel to this Region
				</Button>
			</div>
		</div>
	</div>
{:else if isIndependent}
	<div class="bg-[#e6a527]/10 border border-[#e6a527]/30 rounded-xl p-6">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#e6a527]/15 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentFlag20Filled class="size-6 text-[#f7c56b]" />
			</div>
			<div class="flex-1">
				<h2 class="text-xl font-bold text-[#fff7e8] mb-2">Unclaimed Territory</h2>
				<p class="text-[#d9ccb7] text-sm mb-4">
					This region can be claimed by founding a new state. Create a political party to establish your government.
				</p>
				<Button variant="primary" size="sm" icon={FluentFlag20Filled} href="/party/create?regionId={regionId}">
					Found a State
				</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="panel rounded-xl p-5">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-[#315d8d]/20 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentHome20Filled class="size-6 text-[#7ba0c8]" />
			</div>
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-[#fff7e8] mb-2">Travel to this Region</h3>
				{#if hasPendingResidenceApp}
					<div class="bg-[#e6a527]/10 border border-[#e6a527]/25 rounded-lg p-3 mb-3">
						<p class="text-sm text-[#f7c56b] flex items-center gap-2">
							<FluentClock20Filled class="size-4" />
							Residence application pending - will be reviewed upon arrival
						</p>
					</div>
				{:else}
					<p class="text-sm text-[#d9ccb7] mb-3">
						Entry requires a visa approved by the Foreign Minister or President, or existing residency.
					</p>
				{/if}
				<Button variant="info" size="sm" icon={FluentHome20Filled} onclick={() => (showTravelSheet = true)}>
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
			<div class="size-14 bg-[#315d8d]/20 rounded-xl flex items-center justify-center">
				<FluentLocationLive20Filled class="size-7 text-[#7ba0c8]" />
			</div>
			<div>
				<h3 class="text-xl font-bold text-[#fff7e8]">{regionName}</h3>
				<p class="text-sm text-[#a89e8e]">Review your journey before departing</p>
			</div>
		</div>

		{#if travelInfo}
			<div class="panel-muted rounded-lg p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a89e8e] flex items-center gap-2">
						<FluentClock20Filled class="size-4" />
						Travel Time
					</span>
					<span class="text-sm font-medium text-[#fff7e8]">
						{travelInfo.timeHours} hour{travelInfo.timeHours === 1 ? "" : "s"}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-[#a89e8e]">Distance</span>
					<span class="text-sm font-medium text-[#fff7e8]">{travelInfo.distanceKm} km</span>
				</div>
				<div class="border-t border-[#dfceb0]/15 pt-3">
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
				<Button
					type="submit"
					variant="info"
					block
					icon={FluentHome20Filled}
					disabled={!canAfford}
				>
					Start Travel — ${travelInfo.cost.toLocaleString()}
				</Button>
				{#if !canAfford}
					<p class="field-error text-center">
						Insufficient funds — you have ${walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		{:else}
			<div class="bg-[#e6a527]/10 border border-[#e6a527]/25 rounded-lg p-4">
				<p class="text-sm text-[#f7c56b] flex items-center gap-2">
					<FluentClock20Filled class="size-4" />
					You need an existing residence to travel between regions.
				</p>
			</div>
		{/if}
	</div>
</Modal>
