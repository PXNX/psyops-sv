<!-- src/routes/(authenticated)/(dock)/region/[id]/construction/+page.svelte -->
<script lang="ts">
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentBook20Filled from "~icons/fluent/book-20-filled";
	import FluentHeartPulse20Filled from "~icons/fluent/heart-pulse-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentHammer20Filled from "~icons/fluent/wrench-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import * as m from "#lib/paraglide/messages.js";
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
				bg: "bg-[#3f8a2a]/18",
				border: "border-[#6fd14a]/30",
				text: "text-[#b9f29a]",
				hover: "hover:bg-[#3f8a2a]/28",
				button: "bg-[#6fd14a]",
				variant: "soft-emerald" as const
			},
			blue: {
				bg: "bg-[#2369b5]/18",
				border: "border-[#5eaef5]/30",
				text: "text-[#b3dcff]",
				hover: "hover:bg-[#2369b5]/28",
				button: "bg-[#5eaef5]",
				variant: "soft-blue" as const
			},
			red: {
				bg: "bg-red-600/10",
				border: "border-red-500/30",
				text: "text-red-300",
				hover: "hover:bg-red-600/20",
				button: "bg-red-400",
				variant: "soft-red" as const
			},
			purple: {
				bg: "bg-[#8a4fc0]/15",
				border: "border-[#c08cf0]/30",
				text: "text-[#e3cbfb]",
				hover: "hover:bg-[#8a4fc0]/25",
				button: "bg-[#c08cf0]",
				variant: "soft-purple" as const
			}
		};
		return colors[color as keyof typeof colors];
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader
		title="Construction"
		icon={FluentHammer20Filled}
		subtitle={data.isGovernor
			? "As Governor"
			: data.isInfrastructureMinister
				? "As Infrastructure Minister"
				: undefined}
		backHref="/region/{data.region.id}"
		backLabel={regionName()}
	/>

	<!-- Treasury Balance -->
	<div class="panel rounded-sm p-4">
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">State Treasury Balance</p>
				<p class="text-2xl font-bold font-mono text-[#f5efd8]">${data.treasuryBalance.toLocaleString()}</p>
			</div>
			{#if data.state}
				<a
					href="/state/{data.state.id}"
					class="text-sm text-[#ffd35c] hover:text-[#ffcf47] underline underline-offset-2"
				>
					View {data.state.name}
				</a>
			{/if}
		</div>
	</div>

	<!-- Success Message -->
	{#if showSuccess}
		<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0" />
			<p class="text-sm">{successMessage}</p>
		</div>
	{/if}

	<!-- Buildings Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each buildings as building}
			{@const colors = getColorClasses(building.color)}
			{@const canAfford = canBuild(building)}
			{@const isMaxed = building.current >= building.max}

			<div class="panel rounded-sm overflow-hidden">
				<!-- Header -->
				<div class="{colors.bg} {colors.border} border-b p-4">
					<div class="flex items-start gap-3">
						<div
							class="size-12 {colors.bg} border {colors.border} rounded-sm flex items-center justify-center shrink-0"
						>
							<svelte:component this={building.icon} class="size-6 {colors.text}" />
						</div>
						<div class="flex-1">
							<h2 class="text-lg font-bold text-[#f5efd8]">{building.name}</h2>
							<p class="text-sm text-[#a8a083]">{building.description}</p>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="p-4 space-y-4">
					<!-- Progress -->
					<div>
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm text-[#a8a083]">Level</span>
							<span class="text-sm font-semibold {colors.text}">
								{building.current} / {building.max}
							</span>
						</div>
						<div class="h-2 bg-[#1a1f15] rounded-full overflow-hidden">
							<div
								class="h-full {colors.button} rounded-full transition-all"
								style="width: {(building.current / building.max) * 100}%"
							/>
						</div>
					</div>

					<!-- Benefits -->
					<div>
						<p class="text-[10px] text-[#a8a083] uppercase tracking-wide mb-2">Benefits</p>
						<ul class="space-y-1">
							{#each building.benefits as benefit}
								<li class="text-sm text-[#d3caa9] flex items-start gap-2">
									<span class="{colors.text} mt-0.5">•</span>
									<span>{benefit}</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- Cost -->
					<div class="pt-3 border-t border-[#c8b47a]/10">
						<div class="flex items-center justify-between mb-3">
							<span class="text-sm text-[#a8a083]">Construction Cost</span>
							<span class="text-lg font-bold font-mono text-[#f5efd8]">
								${building.cost.toLocaleString()}
							</span>
						</div>

						<!-- Build Button -->
						{#if isMaxed}
							<Button variant="subtle" block disabled>Maximum Level Reached</Button>
						{:else if !canAfford}
							<Button variant="subtle" block disabled>Insufficient Funds</Button>
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
								<Button
									type="submit"
									variant={colors.variant}
									block
									icon={FluentHammer20Filled}
									loading={isSubmitting && selectedBuilding === building.type}
									loadingText="Building..."
								>
									Build Level {building.current + 1}
								</Button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Info Section -->
	<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
		<div class="flex items-start gap-3">
			<div class="size-10 bg-[#2369b5]/25 rounded-sm flex items-center justify-center shrink-0">
				<FluentBuildingGovernment20Filled class="size-5 text-[#5eaef5]" />
			</div>
			<div class="flex-1">
				<p class="font-semibold text-[#b3dcff] mb-1">Building Information</p>
				<ul class="text-sm text-[#d3caa9] space-y-1">
					<li>• All construction is funded from the state treasury</li>
					<li>• Buildings are permanent and cannot be demolished</li>
					<li>• Higher levels provide diminishing returns</li>
					<li>• Infrastructure is required for most economic activities</li>
				</ul>
			</div>
		</div>
	</div>
</PageContainer>
