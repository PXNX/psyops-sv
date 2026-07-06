<!-- src/routes/(authenticated)/(dock)/region/[id]/ResidenceActions.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentLocationLive20Filled from "~icons/fluent/location-live-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";
	import Modal from "$lib/component/Modal.svelte";

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
	<div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl p-6">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentLocationLive20Filled class="size-6 text-emerald-400" />
			</div>
			<div class="flex-1">
				<h2 class="text-xl font-bold text-white mb-2">Free Movement Zone</h2>
				<p class="text-gray-300 text-sm mb-4">
					{#if isIndependent}
						This independent region has open borders.
					{:else if !hasInauguralElection}
						Free movement available until inaugural election.
					{/if}
				</p>
				<button
					type="button"
					onclick={() => (showTravelSheet = true)}
					class="btn btn-sm bg-emerald-600 hover:bg-emerald-500 border-0 text-white gap-2"
				>
					<FluentHome20Filled class="size-4" />
					Travel to this Region
				</button>
			</div>
		</div>
	</div>
{:else if isIndependent}
	<div class="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-6">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentFlag20Filled class="size-6 text-amber-400" />
			</div>
			<div class="flex-1">
				<h2 class="text-xl font-bold text-white mb-2">Unclaimed Territory</h2>
				<p class="text-gray-300 text-sm mb-4">
					This region can be claimed by founding a new state. Create a political party to establish your government.
				</p>
				<a
					href="/party/create?regionId={regionId}"
					class="btn btn-sm bg-amber-600 hover:bg-amber-500 border-0 text-white gap-2"
				>
					<FluentFlag20Filled class="size-4" />
					Found a State
				</a>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<div class="flex items-start gap-4">
			<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
				<FluentHome20Filled class="size-6 text-blue-400" />
			</div>
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-white mb-2">Travel to this Region</h3>
				{#if hasPendingResidenceApp}
					<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-3 mb-3">
						<p class="text-sm text-amber-300 flex items-center gap-2">
							<FluentClock20Filled class="size-4" />
							Residence application pending - will be reviewed upon arrival
						</p>
					</div>
				{:else}
					<p class="text-sm text-gray-300 mb-3">
						Entry requires a visa approved by the Foreign Minister or President, or existing residency.
					</p>
				{/if}
				<button
					type="button"
					onclick={() => (showTravelSheet = true)}
					class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2"
				>
					<FluentHome20Filled class="size-4" />
					Travel to this Region
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Travel Confirmation Bottom Sheet -->
<Modal bind:open={showTravelSheet} title="Travel to {regionName}" size="default">
	<div class="space-y-5">
		<div class="flex items-center gap-4">
			<div class="size-14 bg-blue-600/20 rounded-xl flex items-center justify-center">
				<FluentLocationLive20Filled class="size-7 text-blue-400" />
			</div>
			<div>
				<h3 class="text-xl font-bold text-white">{regionName}</h3>
				<p class="text-sm text-gray-400">Review your journey before departing</p>
			</div>
		</div>

		{#if travelInfo}
			<div class="bg-slate-700/30 rounded-lg p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-400 flex items-center gap-2">
						<FluentClock20Filled class="size-4" />
						Travel Time
					</span>
					<span class="text-sm font-medium text-white">
						{travelInfo.timeHours} hour{travelInfo.timeHours === 1 ? "" : "s"}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-400">Distance</span>
					<span class="text-sm font-medium text-white">{travelInfo.distanceKm} km</span>
				</div>
				<div class="border-t border-white/10 pt-3">
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
				<button
					type="submit"
					class="btn w-full bg-blue-600 hover:bg-blue-500 border-0 text-white gap-2"
					disabled={!canAfford}
				>
					<FluentHome20Filled class="size-5" />
					Start Travel — ${travelInfo.cost.toLocaleString()}
				</button>
				{#if !canAfford}
					<p class="text-xs text-red-400 text-center mt-2">
						Insufficient funds — you have ${walletBalance.toLocaleString()}
					</p>
				{/if}
			</form>
		{:else}
			<div class="bg-amber-600/10 border border-amber-500/20 rounded-lg p-4">
				<p class="text-sm text-amber-300 flex items-center gap-2">
					<FluentClock20Filled class="size-4" />
					You need an existing residence to travel between regions.
				</p>
			</div>
		{/if}
	</div>
</Modal>
