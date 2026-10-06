<!-- src/routes/(authenticated)/(dock)/state/[id]/construction/+page.svelte -->
<script lang="ts">
	import { refreshAll } from "$app/navigation";
	import FluentBuildingFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	const { data } = $props();

	const buildingTypeColors: Record<string, string> = {
		hospital: "bg-red-600/10 text-red-300 border-red-500/30",
		school: "bg-[#8c709b]/20 text-[#d5c4df] border-[#b7a0c5]/30",
		power_plant: "bg-[#e6a527]/12 text-[#f7c56b] border-[#e6a527]/35"
	};

	const buildingTypeIcons: Record<string, string> = {
		hospital: "🏥",
		school: "🏫",
		power_plant: "⚡"
	};

	function progressFor(startedAt: string | Date | null, completesAt: string | Date | null) {
		if (!startedAt || !completesAt) return 100;
		const total = new Date(completesAt).getTime() - new Date(startedAt).getTime();
		if (total <= 0) return 100;
		const elapsed = Date.now() - new Date(startedAt).getTime();
		return Math.min(100, Math.max(0, (elapsed / total) * 100));
	}

	function timeRemainingFor(completesAt: string | Date | null) {
		if (!completesAt) return "";
		const remaining = new Date(completesAt).getTime() - Date.now();
		if (remaining <= 0) return "Finishing…";
		const days = Math.floor(remaining / 86400000);
		const hours = Math.floor((remaining % 86400000) / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	$effect(() => {
		if (data.pendingConstructions.length === 0) return;
		const interval = setInterval(() => {
			if (data.pendingConstructions.some((c) => c.completesAt && new Date(c.completesAt) <= new Date())) {
				refreshAll();
			}
		}, 5000);
		return () => clearInterval(interval);
	});
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Construction Queue"
		icon={FluentBuildingFactory20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<div class="panel rounded-sm overflow-hidden">
		<div class="p-4 space-y-4">
			{#if data.pendingConstructions.length === 0}
				<div class="text-center py-12">
					<FluentBuildingFactory20Filled class="size-16 text-[#a89e8e]/60 mx-auto mb-3" />
					<p class="text-[#a89e8e]">Nothing is currently under construction</p>
				</div>
			{:else}
				{#each data.pendingConstructions as construction}
					<div class="relative overflow-hidden rounded-sm panel-muted p-4 md:p-5">
						<div class="relative space-y-4">
							<div class="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
								<div
									class="size-12 md:size-14 rounded-sm border flex items-center justify-center text-2xl shrink-0 {buildingTypeColors[
										construction.buildingType
									] ?? 'bg-[#0d1d31] text-[#a89e8e] border-[#dfceb0]/15'}"
								>
									{buildingTypeIcons[construction.buildingType] ?? "🏗️"}
								</div>
								<div class="flex-1">
									<h3 class="text-lg md:text-xl font-bold text-[#fff7e8] mb-1">{construction.name}</h3>
									<a
										href="/region/{construction.regionId}"
										class="text-sm text-[#b7d0e6] hover:text-[#fff7e8] transition-colors"
									>
										in {construction.regionName}
									</a>
									<p class="text-xs text-[#a89e8e] mt-1">Commissioned by {construction.builtByName}</p>
								</div>
								<div class="text-left sm:text-right w-full sm:w-auto flex items-center sm:block gap-2">
									<FluentClock20Filled class="size-4 text-[#f7c56b] sm:hidden" />
									<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-1">Time Left</p>
									<p class="text-xl md:text-2xl font-bold font-mono text-[#f7c56b]">
										{timeRemainingFor(construction.completesAt)}
									</p>
								</div>
							</div>

							<div>
								<div class="h-3 bg-[#102239] rounded-full overflow-hidden">
									<div
										class="h-full bg-[#e6a527] rounded-full transition-all duration-1000"
										style="width: {progressFor(construction.startedAt, construction.completesAt)}%"
									></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</PageContainer>
