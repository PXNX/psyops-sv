<!-- src/routes/(authenticated)/(dock)/region/[id]/construction/+page.svelte -->
<script lang="ts">
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentBook20Filled from "~icons/fluent/book-20-filled";
	import FluentHeartPulse20Filled from "~icons/fluent/heart-pulse-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentHammer20Filled from "~icons/fluent/wrench-20-filled";
	import * as m from "$lib/paraglide/messages";
	import { enhance } from "$app/forms";

	const { data } = $props();

	let isSubmitting = $state(false);
	let selectedBuilding = $state<string | null>(null);
	let showSuccess = $state(false);
	let successMessage = $state("");

	const regionName = $derived(() => {
		const key = `region_${data.region.id}`;
		return m[key]();
	});

	const buildings = [
		{
			type: "infrastructure",
			name: "Infrastructure",
			icon: FluentBuildingGovernment20Filled,
			description: "Roads, bridges, and basic utilities. Enables economic growth.",
			current: data.region.infrastructure,
			max: 18,
			cost: 50000,
			color: "emerald",
			benefits: ["Enables factory construction", "Increases regional development", "Improves logistics"]
		},
		{
			type: "education",
			name: "Education",
			icon: FluentBook20Filled,
			description: "Schools and universities. Improves workforce quality.",
			current: data.region.education,
			max: 10,
			cost: 75000,
			color: "blue",
			benefits: ["Increases worker productivity", "Enables research", "Attracts skilled workers"]
		},
		{
			type: "hospitals",
			name: "Hospitals",
			icon: FluentHeartPulse20Filled,
			description: "Medical facilities. Improves public health and morale.",
			current: data.region.hospitals,
			max: 8,
			cost: 100000,
			color: "red",
			benefits: ["Increases population growth", "Reduces military casualties", "Improves quality of life"]
		},
		{
			type: "fortifications",
			name: "Fortifications",
			icon: FluentShield20Filled,
			description: "Military defenses. Protects the region from attacks.",
			current: data.region.fortifications,
			max: 12,
			cost: 150000,
			color: "purple",
			benefits: ["Increases defensive strength", "Deters invasions", "Protects infrastructure"]
		}
	];

	function canBuild(building: (typeof buildings)[0]) {
		return building.current < building.max && data.treasuryBalance >= building.cost;
	}

	function getColorClasses(color: string) {
		const colors = {
			emerald: {
				bg: "bg-emerald-600/20",
				border: "border-emerald-500/30",
				text: "text-emerald-400",
				hover: "hover:bg-emerald-600/30",
				button: "bg-emerald-600 hover:bg-emerald-500"
			},
			blue: {
				bg: "bg-blue-600/20",
				border: "border-blue-500/30",
				text: "text-blue-400",
				hover: "hover:bg-blue-600/30",
				button: "bg-blue-600 hover:bg-blue-500"
			},
			red: {
				bg: "bg-red-600/20",
				border: "border-red-500/30",
				text: "text-red-400",
				hover: "hover:bg-red-600/30",
				button: "bg-red-600 hover:bg-red-500"
			},
			purple: {
				bg: "bg-purple-600/20",
				border: "border-purple-500/30",
				text: "text-purple-400",
				hover: "hover:bg-purple-600/30",
				button: "bg-purple-600 hover:bg-purple-500"
			}
		};
		return colors[color as keyof typeof colors];
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="/region/{data.region.id}"
			class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
		>
			<FluentArrowLeft20Filled class="size-4" />
			Back
		</a>
		<div class="flex-1">
			<h1 class="text-3xl font-bold text-white flex items-center gap-2">
				<FluentHammer20Filled class="size-8" />
				Build in {regionName()}
			</h1>
			<p class="text-gray-400 mt-1">
				{#if data.isGovernor}
					As Governor
				{:else if data.isInfrastructureMinister}
					As Infrastructure Minister
				{/if}
			</p>
		</div>
	</div>

	<!-- Treasury Balance -->
	<div class="bg-slate-800 rounded-xl border border-white/5 p-4">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-gray-400">State Treasury Balance</p>
				<p class="text-2xl font-bold text-white">${data.treasuryBalance.toLocaleString()}</p>
			</div>
			{#if data.state}
				<a href="/state/{data.state.id}" class="text-sm text-purple-400 hover:text-purple-300 underline">
					View {data.state.name}
				</a>
			{/if}
		</div>
	</div>

	<!-- Success Message -->
	{#if showSuccess}
		<div class="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-emerald-400 shrink-0" />
			<p class="text-sm text-emerald-400">{successMessage}</p>
		</div>
	{/if}

	<!-- Buildings Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each buildings as building}
			{@const colors = getColorClasses(building.color)}
			{@const canAfford = canBuild(building)}
			{@const isMaxed = building.current >= building.max}

			<div class="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
				<!-- Header -->
				<div class="{colors.bg} {colors.border} border-b p-4">
					<div class="flex items-start gap-3">
						<div class="size-12 {colors.bg} rounded-lg flex items-center justify-center shrink-0">
							<svelte:component this={building.icon} class="size-6 {colors.text}" />
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold text-white">{building.name}</h3>
							<p class="text-sm text-gray-400">{building.description}</p>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="p-4 space-y-4">
					<!-- Progress -->
					<div>
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm text-gray-400">Level</span>
							<span class="text-sm font-semibold {colors.text}">
								{building.current} / {building.max}
							</span>
						</div>
						<div class="h-2 bg-slate-700/50 rounded-full overflow-hidden">
							<div
								class="h-full {colors.button} rounded-full transition-all"
								style="width: {(building.current / building.max) * 100}%"
							/>
						</div>
					</div>

					<!-- Benefits -->
					<div>
						<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Benefits</p>
						<ul class="space-y-1">
							{#each building.benefits as benefit}
								<li class="text-sm text-gray-300 flex items-start gap-2">
									<span class="{colors.text} mt-0.5">•</span>
									<span>{benefit}</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- Cost -->
					<div class="pt-3 border-t border-white/5">
						<div class="flex items-center justify-between mb-3">
							<span class="text-sm text-gray-400">Construction Cost</span>
							<span class="text-lg font-bold text-white">
								${building.cost.toLocaleString()}
							</span>
						</div>

						<!-- Build Button -->
						{#if isMaxed}
							<button disabled class="btn w-full bg-slate-600/50 border-0 text-gray-400 cursor-not-allowed">
								Maximum Level Reached
							</button>
						{:else if !canAfford}
							<button disabled class="btn w-full bg-slate-600/50 border-0 text-gray-400 cursor-not-allowed">
								Insufficient Funds
							</button>
						{:else}
							<form
								method="POST"
								action="?/build"
								use:enhance={() => {
									isSubmitting = true;
									selectedBuilding = building.type;
									return async ({ result, update }) => {
										await update();
										isSubmitting = false;
										selectedBuilding = null;
										if (result.type === "success" && result.data?.message) {
											successMessage = result.data.message;
											showSuccess = true;
											setTimeout(() => (showSuccess = false), 5000);
										}
									};
								}}
							>
								<input type="hidden" name="buildingType" value={building.type} />
								<button
									type="submit"
									disabled={isSubmitting && selectedBuilding === building.type}
									class="btn w-full {colors.button} border-0 text-white gap-2"
								>
									{#if isSubmitting && selectedBuilding === building.type}
										<span class="loading loading-spinner loading-sm"></span>
										Building...
									{:else}
										<FluentHammer20Filled class="size-5" />
										Build Level {building.current + 1}
									{/if}
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Info Section -->
	<div class="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4">
		<div class="flex items-start gap-3">
			<div class="size-10 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
				<FluentBuildingGovernment20Filled class="size-5 text-blue-400" />
			</div>
			<div class="flex-1">
				<p class="font-semibold text-blue-300 mb-1">Building Information</p>
				<ul class="text-sm text-blue-200/90 space-y-1">
					<li>• All construction is funded from the state treasury</li>
					<li>• Buildings are permanent and cannot be demolished</li>
					<li>• Higher levels provide diminishing returns</li>
					<li>• Infrastructure is required for most economic activities</li>
				</ul>
			</div>
		</div>
	</div>
</div>
