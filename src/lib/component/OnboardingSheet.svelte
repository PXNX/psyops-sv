<script lang="ts">
	import { page } from "$app/state";
	import { invalidateAll } from "$app/navigation";
	import { fly, fade } from "svelte/transition";
	import { getRegionName } from "$lib/utils/formatting";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";

	interface Props {
		onboardingStep: number;
		profile: { name: string; onboardingStep: number | null } | null;
		residence: { id: number; regionId: number; stateId: number | null; stateName: string | null } | null;
	}

	let { onboardingStep, profile, residence }: Props = $props();

	const TOTAL_STEPS = 7;

	// Optimistic local override – falls back to server prop when null
	let optimistic = $state<number | null>(null);
	const step = $derived(optimistic ?? onboardingStep);

	// Reset optimistic value whenever the server prop catches up
	$effect(() => {
		if (optimistic !== null && onboardingStep === optimistic) {
			optimistic = null;
		}
	});

	let name = $state("");
	let nameError = $state("");
	let regions = $state<any[]>([]);
	let loadingRegions = $state(false);
	let submitting = $state(false);

	const currentPath = $derived(page.url.pathname);
	const isOnProduction = $derived(currentPath === "/production");
	const isOnTraining = $derived(currentPath === "/training");

	// Compact floating bar when we're waiting for the user to navigate
	const isCompactMode = $derived(
		(step === 4 && !isOnProduction) || (step === 5 && !isOnTraining)
	);

	// Pre-load regions when we reach step 2
	$effect(() => {
		if (step === 2 && regions.length === 0 && !loadingRegions) {
			loadRegions();
		}
	});

	// ── API helpers ──────────────────────────────────────────────

	async function setStep(next: number | null) {
		submitting = true;
		optimistic = next;
		try {
			await fetch("/api/onboarding/step", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ step: next })
			});
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}

	async function submitName() {
		nameError = "";
		const trimmed = name.trim();
		if (!trimmed || trimmed.length < 2) { nameError = "Name must be at least 2 characters"; return; }
		if (trimmed.length > 50) { nameError = "Name must be 50 characters or less"; return; }
		if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) { nameError = "Only letters, numbers, and spaces allowed"; return; }

		submitting = true;
		optimistic = 2;
		try {
			const res = await fetch("/api/onboarding/name", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				nameError = data?.message || "Something went wrong";
				optimistic = null;
				return;
			}
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}

	async function loadRegions() {
		loadingRegions = true;
		try {
			const res = await fetch("/api/onboarding/regions");
			if (res.ok) {
				const data = await res.json();
				regions = data.regions || [];
			}
		} finally {
			loadingRegions = false;
		}
	}

	async function selectRegion(regionId: number) {
		submitting = true;
		optimistic = 3;
		try {
			const res = await fetch("/api/onboarding/region", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ regionId })
			});
			if (!res.ok) { optimistic = null; return; }
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitName();
	}

	function formatPopulation(count: number): string {
		if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
		if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
		return count.toString();
	}
</script>

<!-- ─── Compact floating prompt (navigate-to-page steps) ─── -->
{#if isCompactMode}
	<div class="fixed bottom-16 md:bottom-20 left-3 right-3 z-50" in:fly={{ y: 20, duration: 300 }}>
		<div
			class="bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-xl"
			style="box-shadow: 0 0 20px rgba(0,255,255,0.1), inset 0 0 20px rgba(0,255,255,0.03);"
		>
			<div class="flex items-center gap-3">
				<div class="size-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
					<span class="text-lg">{step === 4 ? "🔧" : "🪖"}</span>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-white">
						{step === 4 ? "Navigate to Production" : "Navigate to Training"}
					</p>
					<p class="text-xs text-slate-400 mt-0.5">
						Tap <strong class="text-cyan-300">{step === 4 ? "Production" : "Training"}</strong> in the bar below
					</p>
				</div>
				<button
					onclick={() => setStep(null)}
					disabled={submitting}
					class="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
				>
					Skip
				</button>
			</div>
		</div>
	</div>

<!-- ─── Full bottom sheet ─── -->
{:else}
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true" in:fade={{ duration: 200 }}>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

		<!-- Sheet -->
		<div class="absolute inset-x-0 bottom-0 animate-slide-up">
			<div
				class="bg-gradient-to-b from-slate-900 to-slate-950 border-t border-cyan-500/20 rounded-t-2xl max-h-[80vh] flex flex-col"
				style="box-shadow: 0 -10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,255,0.05);"
			>
				<!-- Drag handle + skip -->
				<div class="flex items-center justify-between px-5 pt-3 pb-1 shrink-0">
					<div class="w-16"></div>
					<div class="w-10 h-1 rounded-full bg-slate-700"></div>
					<button
						onclick={() => setStep(null)}
						disabled={submitting}
						class="w-16 flex items-center justify-end gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
					>
						Skip
						<FluentDismiss20Filled class="size-3.5" />
					</button>
				</div>

				<!-- Progress dots -->
				<div class="flex justify-center gap-1.5 pb-3 shrink-0">
					{#each Array(TOTAL_STEPS) as _, i}
						<div
							class="h-1 rounded-full transition-all duration-300"
							class:w-6={i === step}
							class:w-2={i !== step}
							class:bg-cyan-400={i === step}
							class:bg-cyan-400/30={i < step && i !== step}
							class:bg-slate-700={i > step}
						></div>
					{/each}
				</div>

				<!-- Content -->
				<div class="px-5 pb-6 overflow-y-auto">

					{#if step === 0}
						<!-- ── Greeting ── -->
						<div class="text-center space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="flex justify-center">
								<div class="size-16 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center">
									<span class="text-3xl">🎖️</span>
								</div>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-white tracking-wide">Greeting Commander</h2>
								<p class="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
									Welcome to PsyOps — a political simulation where you shape nations, build empires, and wage wars through strategy and diplomacy.
								</p>
							</div>
							<button
								onclick={() => setStep(1)}
								disabled={submitting}
								class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
							>
								<span class="flex items-center justify-center gap-2">
									Let's Begin
									<FluentArrowRight20Filled class="size-5" />
								</span>
							</button>
						</div>

					{:else if step === 1}
						<!-- ── Set Name ── -->
						<div class="space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="flex items-center gap-3">
								<div class="size-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
									<FluentPerson20Filled class="size-5 text-purple-400" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-white">Choose Your Name</h2>
									<p class="text-xs text-slate-500">This is how other players will know you</p>
								</div>
							</div>

							<div>
								<input
									type="text"
									bind:value={name}
									onkeydown={handleNameKeydown}
									placeholder="Enter your commander name"
									maxlength={50}
									disabled={submitting}
									class="w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all"
									class:border-slate-700/50={!nameError}
									class:focus:border-cyan-500/50={!nameError}
									class:focus:ring-cyan-500/20={!nameError}
									class:border-red-500/50={nameError}
									class:focus:ring-red-500/20={nameError}
								/>
								{#if nameError}
									<p class="text-xs text-red-400 mt-1.5">{nameError}</p>
								{:else}
									<p class="text-xs text-slate-600 mt-1.5">{name.length}/50 — letters, numbers, spaces</p>
								{/if}
							</div>

							<button
								onclick={submitName}
								disabled={submitting || !name.trim()}
								class="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/20"
							>
								{#if submitting}
									<span class="flex items-center justify-center gap-2">
										<span class="loading loading-spinner loading-sm"></span>
										Saving…
									</span>
								{:else}
									<span class="flex items-center justify-center gap-2">
										Continue
										<FluentArrowRight20Filled class="size-5" />
									</span>
								{/if}
							</button>
						</div>

					{:else if step === 2}
						<!-- ── Choose Region ── -->
						<div class="space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="flex items-center gap-3">
								<div class="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
									<FluentGlobe20Filled class="size-5 text-blue-400" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-white">Choose Your Region</h2>
									<p class="text-xs text-slate-500">Pick a region to call home</p>
								</div>
							</div>

							{#if loadingRegions}
								<div class="flex items-center justify-center py-8">
									<span class="loading loading-ring loading-md text-cyan-400"></span>
								</div>
							{:else}
								<div class="space-y-2 max-h-[40vh] overflow-y-auto">
									{#each regions as region (region.id)}
										<button
											onclick={() => selectRegion(region.id)}
											disabled={submitting}
											class="w-full text-left bg-slate-800/50 border border-slate-700/40 rounded-xl p-3.5 hover:border-blue-500/40 hover:bg-slate-800/70 transition-all disabled:opacity-50 group"
										>
											<div class="flex items-center gap-3">
												<div class="size-10 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center shrink-0">
													<FluentGlobe20Filled class="size-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
														{getRegionName(region.id)}
													</p>
													<div class="flex items-center gap-2 mt-0.5">
														{#if region.state}
															<span class="text-xs text-slate-500 flex items-center gap-1">
																<FluentBuildingGovernment20Filled class="size-3" />
																{region.state.name}
															</span>
														{:else}
															<span class="text-xs text-purple-400">Independent</span>
														{/if}
														<span class="text-xs text-slate-600">·</span>
														<span class="text-xs text-slate-500 flex items-center gap-1">
																<FluentPeople20Filled class="size-3" />
																{region.populationCount === 0 ? "No residents" : formatPopulation(region.populationCount)}
														</span>
													</div>
												</div>
												<FluentArrowRight20Filled class="size-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>

					{:else if step === 3}
						<!-- ── Dashboard tour ── -->
						<div class="space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="text-center space-y-3">
								<span class="text-3xl">🏠</span>
								<h2 class="text-lg font-bold text-white">Your Command Center</h2>
								<p class="text-sm text-slate-400 leading-relaxed">
									This is your dashboard — broadcasts from your state, quick actions, and an overview of your journey all live here.
								</p>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div class="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3 text-center">
									<span class="text-lg">📰</span>
									<p class="text-xs text-slate-400 mt-1">Read news &amp; posts</p>
								</div>
								<div class="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3 text-center">
									<span class="text-lg">🗺️</span>
									<p class="text-xs text-slate-400 mt-1">Explore the map</p>
								</div>
								<div class="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3 text-center">
									<span class="text-lg">💬</span>
									<p class="text-xs text-slate-400 mt-1">Chat with players</p>
								</div>
								<div class="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3 text-center">
									<span class="text-lg">🏛️</span>
									<p class="text-xs text-slate-400 mt-1">Join a party</p>
								</div>
							</div>

							<button
								onclick={() => setStep(4)}
								disabled={submitting}
								class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
							>
								<span class="flex items-center justify-center gap-2">
									Next
									<FluentArrowRight20Filled class="size-5" />
								</span>
							</button>
						</div>

					{:else if step === 4 && isOnProduction}
						<!-- ── Production explanation ── -->
						<div class="space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="text-center space-y-3">
								<span class="text-3xl">🔧</span>
								<h2 class="text-lg font-bold text-white">Production</h2>
								<p class="text-sm text-slate-400 leading-relaxed">
									This is where you earn money and produce goods. Work at a factory to collect wages, buy resources on the market, and manufacture weapons &amp; equipment.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">💰</span>
									<div>
										<p class="text-sm font-medium text-white">Work for Wages</p>
										<p class="text-xs text-slate-500">Find a factory job and complete shifts</p>
									</div>
								</div>
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">🏭</span>
									<div>
										<p class="text-sm font-medium text-white">Produce Goods</p>
										<p class="text-xs text-slate-500">Craft weapons from raw materials</p>
									</div>
								</div>
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">🏪</span>
									<div>
										<p class="text-sm font-medium text-white">Trade on the Market</p>
										<p class="text-xs text-slate-500">Buy and sell resources &amp; products</p>
									</div>
								</div>
							</div>

							<button
								onclick={() => setStep(5)}
								disabled={submitting}
								class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
							>
								<span class="flex items-center justify-center gap-2">
									Next
									<FluentArrowRight20Filled class="size-5" />
								</span>
							</button>
						</div>

					{:else if step === 5 && isOnTraining}
						<!-- ── Training explanation ── -->
						<div class="space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="text-center space-y-3">
								<span class="text-3xl">🪖</span>
								<h2 class="text-lg font-bold text-white">Military Training</h2>
								<p class="text-sm text-slate-400 leading-relaxed">
									Build your army here. Train infantry, armor, artillery, and more. Your units are essential for defending your nation and conquering new territory.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">⚔️</span>
									<div>
										<p class="text-sm font-medium text-white">Train Units</p>
										<p class="text-xs text-slate-500">Select a unit type and begin training</p>
									</div>
								</div>
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">🛡️</span>
									<div>
										<p class="text-sm font-medium text-white">Manage Your Army</p>
										<p class="text-xs text-slate-500">Monitor organization, strength, and supply</p>
									</div>
								</div>
								<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
									<span class="text-lg">🗡️</span>
									<div>
										<p class="text-sm font-medium text-white">Join Battles</p>
										<p class="text-xs text-slate-500">Deploy units in wars to fight for your state</p>
									</div>
								</div>
							</div>

							<button
								onclick={() => setStep(6)}
								disabled={submitting}
								class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
							>
								<span class="flex items-center justify-center gap-2">
									Next
									<FluentArrowRight20Filled class="size-5" />
								</span>
							</button>
						</div>

					{:else if step === 6}
						<!-- ── Completion ── -->
						<div class="text-center space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="flex justify-center">
								<div class="size-16 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-emerald-500/20 flex items-center justify-center">
									<FluentCheckmark20Filled class="size-8 text-emerald-400" />
								</div>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-white">You're Ready, Commander</h2>
								<p class="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
									You've got the basics. Go explore, build your economy, raise an army, and make your mark on the world.
								</p>
							</div>

							<button
								onclick={() => setStep(null)}
								disabled={submitting}
								class="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
							>
								{#if submitting}
									<span class="flex items-center justify-center gap-2">
										<span class="loading loading-spinner loading-sm"></span>
									</span>
								{:else}
									<span class="flex items-center justify-center gap-2">
										Start Playing
										<FluentArrowRight20Filled class="size-5" />
									</span>
								{/if}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
