<!-- src/routes/(authenticated)/(dock)/region/[id]/+page.svelte -->
<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import TravelProgress from "$lib/component/TravelProgress.svelte";
	import FluentCopy20Filled from "~icons/fluent/copy-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentVehicleAirplaneTakeOff20Filled from "~icons/fluent/airplane-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import FluentHammer20Filled from "~icons/fluent/wrench-20-filled";
	import { shareLink } from "$lib/util";
	import { enhance } from "$app/forms";
	import * as m from "$lib/paraglide/messages";
	import { calculateDistance, calculateTravelDuration, formatDuration, getRegionCenter } from "$lib/utils/travel";

	const { data } = $props();

	let isSubmitting = $state(false);
	let showSuccess = $state(false);
	let showTravelModal = $state(false);
	let travelDetails = $state<{ distance: number; duration: number; cost: number; tax: number } | null>(null);

	// Get the region name from paraglide based on region ID
	const regionName = $derived(() => {
		const key = `region_${data.region.id}`;
		return m[key]();
	});

	// Get the region logo path
	const regionLogoPath = $derived(`/coats/${data.region.id}.svg`);

	// Check if user can travel to this region
	const canTravel = $derived(
		data.userLocation && data.region.id !== data.userLocation.regionId && !data.activeTravel && data.userResidence // Must have visa (residence)
	);

	function openTravelModal() {
		if (!data.userLocation) return;

		const fromCenter = getRegionCenter(data.userLocation.regionId);
		const toCenter = getRegionCenter(data.region.id);

		if (!fromCenter || !toCenter) {
			alert("Could not calculate travel route!");
			return;
		}

		const distance = Math.round(calculateDistance(fromCenter, toCenter));
		const duration = calculateTravelDuration(distance);
		const baseCost = Math.ceil((distance / 100) * 100);
		const tax = Math.ceil((baseCost * data.travelTaxRate) / 100);

		travelDetails = { distance, duration, cost: baseCost, tax };
		showTravelModal = true;
	}

	function handleTravelComplete() {
		window.location.reload();
	}

	function handleTravelCancel() {
		window.location.reload();
	}

	function getStateColor() {
		return data.state?.avatar || "#6366f1";
	}
</script>

<div class="max-w-2xl mx-auto px-4 py-6">
	<div class="relative">
		<!-- Shimmer border wrapper -->
		<div class="bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 p-px rounded-2xl shimmer-outline">
			<div class="relative rounded-2xl bg-slate-800 overflow-hidden">
				<!-- Header Image Section with State Color -->
				<div
					class="w-full h-48 relative overflow-hidden"
					style="background: linear-gradient(135deg, {getStateColor()}60, {getStateColor()}20)"
				>
					<div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-800" />

					<!-- Floating Avatar -->
					<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
						<div class="ring-4 ring-slate-800 rounded-2xl">
							<img src={regionLogoPath} alt={regionName()} class="size-20 rounded-2xl object-cover" />
						</div>
					</div>
				</div>

				<!-- Content Section -->
				<div class="px-6 pt-10 pb-6 space-y-6">
					<!-- Title and Rating -->
					<div class="text-center space-y-1">
						<h1 class="text-2xl font-bold text-white">{regionName()}</h1>
						<p class="text-sm text-gray-400">Ranking #{data.region.rating || 934}</p>
					</div>

					<!-- Active Travel Progress -->
					{#if data.activeTravel}
						<TravelProgress
							travel={data.activeTravel}
							showCancel={false}
							onComplete={handleTravelComplete}
							onCancel={handleTravelCancel}
						/>
					{/if}

					<!-- Independent Region Banner -->
					{#if !data.state}
						<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-4">
							<div class="flex items-start gap-3">
								<div class="size-10 bg-amber-600/30 rounded-lg flex items-center justify-center shrink-0">
									<FluentWarning20Filled class="size-5 text-amber-400" />
								</div>
								<div class="flex-1">
									<p class="font-semibold text-amber-300 mb-1">Independent Region</p>
									<p class="text-sm text-amber-200/90 mb-3">
										This region is not part of any state. A political party must be formed to establish democratic
										governance.
									</p>
									{#if data.userResidence}
										<a
											href="/party/create"
											class="btn btn-sm bg-amber-600 hover:bg-amber-500 border-0 text-white gap-2"
										>
											<FluentAdd20Filled class="size-4" />
											Create Political Party
										</a>
									{:else}
										<p class="text-xs text-amber-300/80">
											You must be a resident to create a political party in this region.
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					<!-- Residence Status Banner -->
					{#if data.userResidence}
						<div
							class="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-4"
						>
							<div class="flex items-center gap-3">
								<div class="size-10 bg-emerald-600/30 rounded-lg flex items-center justify-center shrink-0">
									<FluentHome20Filled class="size-5 text-emerald-400" />
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<p class="font-semibold text-white">Resident</p>
										{#if data.userResidence.isPrimary === 1}
											<span
												class="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-medium"
											>
												Primary
											</span>
										{/if}
									</div>
									<p class="text-sm text-gray-400">
										Since {new Date(data.userResidence.movedInAt).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric"
										})}
									</p>
								</div>
								{#if data.userResidence.isPrimary !== 1}
									<form
										method="POST"
										action="?/setPrimaryResidence"
										use:enhance={() => {
											isSubmitting = true;
											return async ({ update }) => {
												await update();
												isSubmitting = false;
											};
										}}
									>
										<button
											type="submit"
											disabled={isSubmitting}
											class="btn btn-sm bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-400 hover:text-emerald-300 gap-2"
										>
											<FluentCheckmark20Filled class="size-4" />
											Set Primary
										</button>
									</form>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Stats Grid -->
					<div class="space-y-3">
						<!-- Development -->
						<a
							href="/region?sort=infrastructure"
							class="flex items-center justify-between gap-4 hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors group"
						>
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
									<FluentChartMultiple20Filled class="size-4 text-amber-400" />
								</div>
								<span class="text-sm text-gray-300 group-hover:text-white">Development</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.infrastructure || 0} / 18</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
										style="width: {((data.region.infrastructure || 0) / 18) * 100}%"
									/>
								</div>
							</div>
						</a>

						<!-- Infrastructure -->
						<a
							href="/region?sort=infrastructure"
							class="flex items-center justify-between gap-4 hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors group"
						>
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
									<FluentBuildingGovernment20Filled class="size-4 text-emerald-400" />
								</div>
								<span class="text-sm text-gray-300 group-hover:text-white">Infrastructure</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.infrastructure || 0} / 18</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
										style="width: {((data.region.infrastructure || 0) / 18) * 100}%"
									/>
								</div>
							</div>
						</a>

						<!-- Economy -->
						<a
							href="/region?sort=economy"
							class="flex items-center justify-between gap-4 hover:bg-slate-700/30 rounded-lg p-2 -mx-2 transition-colors group"
						>
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
									<FluentPeople20Filled class="size-4 text-blue-400" />
								</div>
								<span class="text-sm text-gray-300 group-hover:text-white">Economy</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.economy || 0} / 15</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
										style="width: {((data.region.economy || 0) / 15) * 100}%"
									/>
								</div>
							</div>
						</a>

						<!-- Resources Section -->
						{#if data.region.oil || data.region.steel || data.region.chromium || data.region.tungsten || data.region.rubber || data.region.aluminum}
							<div class="pt-3 border-t border-white/5">
								<h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resources</h4>
								<div class="flex flex-wrap gap-2">
									{#if data.region.oil}
										<a
											href="/region?sort=oil"
											class="px-3 py-1.5 bg-amber-600/20 border border-amber-600/30 rounded-lg text-sm text-amber-400 hover:bg-amber-600/30 transition-colors"
										>
											Oil: {data.region.oil}
										</a>
									{/if}
									{#if data.region.steel}
										<a
											href="/region?sort=steel"
											class="px-3 py-1.5 bg-gray-600/20 border border-gray-600/30 rounded-lg text-sm text-gray-300 hover:bg-gray-600/30 transition-colors"
										>
											Steel: {data.region.steel}
										</a>
									{/if}
									{#if data.region.chromium}
										<a
											href="/region?sort=chromium"
											class="px-3 py-1.5 bg-blue-600/20 border border-blue-600/30 rounded-lg text-sm text-blue-400 hover:bg-blue-600/30 transition-colors"
										>
											Chromium: {data.region.chromium}
										</a>
									{/if}
									{#if data.region.tungsten}
										<a
											href="/region?sort=tungsten"
											class="px-3 py-1.5 bg-purple-600/20 border border-purple-600/30 rounded-lg text-sm text-purple-400 hover:bg-purple-600/30 transition-colors"
										>
											Tungsten: {data.region.tungsten}
										</a>
									{/if}
									{#if data.region.rubber}
										<a
											href="/region?sort=rubber"
											class="px-3 py-1.5 bg-green-600/20 border border-green-600/30 rounded-lg text-sm text-green-400 hover:bg-green-600/30 transition-colors"
										>
											Rubber: {data.region.rubber}
										</a>
									{/if}
									{#if data.region.aluminum}
										<a
											href="/region?sort=aluminium"
											class="px-3 py-1.5 bg-cyan-600/20 border border-cyan-600/30 rounded-lg text-sm text-cyan-400 hover:bg-cyan-600/30 transition-colors"
										>
											Aluminum: {data.region.aluminum}
										</a>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- Governor Section -->
					{#if data.governor}
						<div class="bg-slate-700/30 rounded-xl border border-white/5 p-4">
							<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Governor</h3>
							<a href="/user/{data.governor.userId}" class="flex items-center gap-3 group">
								<CircleAvatar src={data.governor.avatar} />
								<div class="flex-1">
									<p class="font-semibold text-white group-hover:text-purple-400 transition-colors">
										{data.governor.name}
									</p>
									<p class="text-xs text-gray-400">
										Term {data.governor.term} • Since {new Date(data.governor.appointedAt).toLocaleDateString("en-US", {
											month: "short",
											year: "numeric"
										})}
									</p>
								</div>
							</a>
						</div>
					{/if}

					<!-- Population -->
					<a
						href="/region?sort=population"
						class="flex items-center justify-between px-4 py-3 bg-slate-700/20 rounded-lg border border-white/5 hover:bg-slate-700/30 transition-colors"
					>
						<span class="text-sm text-gray-400">Population</span>
						<span class="text-lg font-bold text-white">{(data.region.population || 0).toLocaleString()}</span>
					</a>

					<!-- Success Message -->
					{#if showSuccess}
						<div class="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
							<FluentCheckmark20Filled class="size-5 text-emerald-400 shrink-0" />
							<p class="text-sm text-emerald-400">Action completed successfully!</p>
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-2">
						{#if data.canBuild}
							<a
								href="/region/{data.region.id}/construction"
								class="btn flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-0 text-white gap-2"
							>
								<FluentHammer20Filled class="size-5" />
								Build
							</a>
						{/if}

						{#if !data.userResidence}
							{#if canTravel}
								<button
									onclick={openTravelModal}
									class="btn flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white gap-2"
								>
									<FluentVehicleAirplaneTakeOff20Filled class="size-5" />
									Travel Here
								</button>
							{:else if data.activeTravel}
								<button
									disabled
									class="btn flex-1 bg-gradient-to-r from-gray-600 to-gray-700 border-0 text-white gap-2 cursor-not-allowed"
								>
									<FluentVehicleAirplaneTakeOff20Filled class="size-5" />
									Traveling...
								</button>
							{:else if !data.userResidence}
								<div class="flex-1">
									<form
										method="POST"
										action="?/requestResidence"
										use:enhance={() => {
											isSubmitting = true;
											return async ({ result, update }) => {
												await update();
												isSubmitting = false;
												if (result.type === "success") {
													showSuccess = true;
													setTimeout(() => (showSuccess = false), 3000);
												}
											};
										}}
									>
										<button
											type="submit"
											disabled={isSubmitting}
											class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{#if isSubmitting}
												<span class="loading loading-spinner loading-sm"></span>
												Requesting...
											{:else}
												<FluentHome20Filled class="size-5" />
												{data.hasPrimaryResidence ? "Request Secondary Residence" : "Request Residence Permit"}
											{/if}
										</button>
									</form>
									<p class="text-xs text-gray-400 mt-1 text-center">Required for travel</p>
								</div>
							{/if}
						{:else if canTravel}
							<button
								onclick={openTravelModal}
								class="btn flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white gap-2"
							>
								<FluentVehicleAirplaneTakeOff20Filled class="size-5" />
								Travel Here
							</button>
						{/if}

						<button
							class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
							onclick={() => shareLink(regionName(), window.location.href)}
						>
							<FluentCopy20Filled class="size-5" />
							Copy
						</button>
					</div>

					<!-- Link to State -->
					{#if data.state}
						<div class="text-center pt-2">
							<a
								href="/state/{data.state.id}"
								class="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
							>
								View {data.state.name}
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Travel Confirmation Modal -->
{#if showTravelModal && travelDetails && data.userLocation}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-2xl font-bold flex items-center gap-2 mb-4">
				<FluentVehicleAirplaneTakeOff20Filled class="text-blue-500" />
				Confirm Travel
			</h3>

			<div class="space-y-3 mb-6">
				<div class="flex justify-between">
					<span class="text-base-content/70">Destination:</span>
					<span class="font-semibold">{regionName()}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/70">Distance:</span>
					<span class="font-semibold">{travelDetails.distance} km</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/70">Duration:</span>
					<span class="font-semibold">{formatDuration(travelDetails.duration)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/70">Base Cost:</span>
					<span class="font-semibold">${travelDetails.cost.toLocaleString()}</span>
				</div>
				{#if travelDetails.tax > 0}
					<div class="flex justify-between">
						<span class="text-base-content/70">Travel Tax ({data.travelTaxRate}%):</span>
						<span class="font-semibold text-amber-400">${travelDetails.tax.toLocaleString()}</span>
					</div>
					<div class="flex justify-between border-t border-white/10 pt-2">
						<span class="text-base-content font-semibold">Total Cost:</span>
						<span class="font-bold text-lg">${(travelDetails.cost + travelDetails.tax).toLocaleString()}</span>
					</div>
				{/if}
			</div>

			<div class="alert alert-warning mb-6">
				<FluentWarning20Filled class="size-5" />
				<div class="text-sm">
					<p class="font-semibold">Travel cannot be cancelled once started</p>
					<p>You will not be able to perform region-specific actions while traveling.</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/startTravel"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						await update();
						isSubmitting = false;
						if (result.type === "success") {
							showTravelModal = false;
							window.location.reload();
						}
					};
				}}
			>
				<input type="hidden" name="distanceKm" value={travelDetails.distance} />
				<input type="hidden" name="durationMinutes" value={travelDetails.duration} />
				<input type="hidden" name="fromRegionId" value={data.userLocation.regionId} />

				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showTravelModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-primary gap-2" disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-sm"></span>
							Starting...
						{:else}
							<FluentVehicleAirplaneTakeOff20Filled />
							Start Travel
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
