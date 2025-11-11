<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import FluentCopy20Filled from "~icons/fluent/copy-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import { shareLink } from "$lib/util";

	const { data } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-6">
	<div class="relative">
		<!-- Shimmer border wrapper -->
		<div class="bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 p-px rounded-2xl shimmer-outline">
			<div class="relative rounded-2xl bg-slate-800 overflow-hidden">
				<!-- Header Image Section -->
				<div class="w-full h-48 relative overflow-hidden">
					<img
						src={data.region.background ||
							"https://media.cntraveller.com/photos/65291b466ba909a7e4c6ce0d/16:9/w_1280,c_limit/Planet_Earth_III_generic_Best_Places_to_see_wildlife_October23_Credit_BBC_studios.jpg"}
						alt={data.region.name}
						class="w-full h-full object-cover"
					/>
					<div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-800" />

					<!-- Floating Avatar -->
					<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
						<div class="ring-4 ring-slate-800 rounded-2xl">
							<div class="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-2xl">
								<FluentGlobe20Filled class="size-12 text-white" />
							</div>
						</div>
					</div>
				</div>

				<!-- Content Section -->
				<div class="px-6 pt-10 pb-6 space-y-6">
					<!-- Title and Rating -->
					<div class="text-center space-y-1">
						<h1 class="text-2xl font-bold text-white">{data.region.name}</h1>
						<p class="text-sm text-gray-400">Ranking #{data.region.rating || 934}</p>
					</div>

					<!-- Stats Grid -->
					<div class="space-y-3">
						<!-- Development -->
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
									<FluentChartMultiple20Filled class="size-4 text-amber-400" />
								</div>
								<span class="text-sm text-gray-300">Development</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.development || 7} / 10</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
										style="width: {((data.region.development || 7) / 10) * 100}%"
									/>
								</div>
							</div>
						</div>

						<!-- Infrastructure -->
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
									<FluentBuildingGovernment20Filled class="size-4 text-emerald-400" />
								</div>
								<span class="text-sm text-gray-300">Infrastructure</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.infrastructure || 9} / 18</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
										style="width: {((data.region.infrastructure || 9) / 18) * 100}%"
									/>
								</div>
							</div>
						</div>

						<!-- Economy -->
						<div class="flex items-center justify-between gap-4">
							<div class="flex items-center gap-2 min-w-fit">
								<div class="size-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
									<FluentPeople20Filled class="size-4 text-blue-400" />
								</div>
								<span class="text-sm text-gray-300">Economy</span>
							</div>
							<div class="flex items-center gap-3 flex-1">
								<span class="text-sm text-white font-medium min-w-fit">{data.region.economy || 15} / 15</span>
								<div class="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
										style="width: {((data.region.economy || 15) / 15) * 100}%"
									/>
								</div>
							</div>
						</div>
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
					<div class="flex items-center justify-between px-4 py-3 bg-slate-700/20 rounded-lg border border-white/5">
						<span class="text-sm text-gray-400">Population</span>
						<span class="text-lg font-bold text-white">{(data.region.population || 0).toLocaleString()}</span>
					</div>

					<!-- Actions -->
					<div class="flex gap-2">
						<button
							class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
						>
							<FluentGlobe20Filled class="size-5" />
							Upgrade
						</button>
						<button
							class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
							onclick={() => shareLink(data.region.name, window.location.href)}
						>
							<FluentCopy20Filled class="size-5" />
							Copy Link
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

					<!-- My Regions Link -->
					<div class="text-center pt-2 border-t border-white/5">
						<a
							href="/regions"
							class="text-sm text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
						>
							My Regions
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes shimmer {
		0% {
			box-shadow:
				0 0 10px rgba(168, 85, 247, 0.4),
				0 0 20px rgba(59, 130, 246, 0.3),
				0 0 30px rgba(6, 182, 212, 0.2);
		}
		50% {
			box-shadow:
				0 0 20px rgba(168, 85, 247, 0.6),
				0 0 30px rgba(59, 130, 246, 0.5),
				0 0 40px rgba(6, 182, 212, 0.4);
		}
		100% {
			box-shadow:
				0 0 10px rgba(168, 85, 247, 0.4),
				0 0 20px rgba(59, 130, 246, 0.3),
				0 0 30px rgba(6, 182, 212, 0.2);
		}
	}
	.shimmer-outline {
		animation: shimmer 3s ease-in-out infinite;
	}
</style>
