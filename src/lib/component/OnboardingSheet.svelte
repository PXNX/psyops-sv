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
	import { buttonClass } from "$lib/component/ui/styles";

	interface Props {
		onboardingStep: number;
		profile: { name: string; onboardingStep: number | null } | null;
		residence: { id: number; regionId: number; stateId: number | null; stateName: string | null } | null;
	}

	let { onboardingStep, profile, residence }: Props = $props();

	const TOTAL_STEPS = 7;
	const PLACEHOLDER_NAME = "New user";

	// A username and a region are required before the tutorial can be skipped/finished.
	const hasName = $derived(!!profile && profile.name.trim().length > 0 && profile.name !== PLACEHOLDER_NAME);
	const hasRegion = $derived(!!residence);
	const canSkip = $derived(hasName && hasRegion);

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
	const isCompactMode = $derived((step === 4 && !isOnProduction) || (step === 5 && !isOnTraining));

	// Auto-skip region step if user already has a residence
	$effect(() => {
		if (step === 2 && residence) {
			setStep(3);
		}
	});

	// Pre-load regions when we reach step 2
	$effect(() => {
		if (step === 2 && !residence && regions.length === 0 && !loadingRegions) {
			loadRegions();
		}
	});

	// ── API helpers ──────────────────────────────────────────────

	async function setStep(next: number | null) {
		submitting = true;
		optimistic = next;
		try {
			const res = await fetch("/api/onboarding/step", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ step: next })
			});
			if (!res.ok) {
				// Revert to the server-confirmed step (e.g. skip rejected without name/region).
				optimistic = null;
				return;
			}
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}

	async function submitName() {
		nameError = "";
		const trimmed = name.trim();
		if (!trimmed || trimmed.length < 2) {
			nameError = "Name must be at least 2 characters";
			return;
		}
		if (trimmed.length > 50) {
			nameError = "Name must be 50 characters or less";
			return;
		}
		if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
			nameError = "Only letters, numbers, and spaces allowed";
			return;
		}

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
			if (!res.ok) {
				optimistic = null;
				return;
			}
			await invalidateAll();
		} finally {
			submitting = false;
		}
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") submitName();
	}

	const nameInputClass = $derived(
		[
			"w-full px-4 py-3 bg-[#0d1d31] border rounded-xl text-[#fff7e8] placeholder:text-[#a89e8e] focus:outline-none focus:ring-2 transition-all",
			nameError ? "border-red-500/50 focus:ring-red-500/20" : "border-[#dfceb0]/20 focus:border-[#e6a527]/70 focus:ring-[#e6a527]/15"
		].join(" ")
	);

	function formatPopulation(count: number): string {
		if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
		if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
		return count.toString();
	}
</script>

<!-- ─── Compact floating prompt (navigate-to-page steps) ─── -->
{#if isCompactMode}
	<div class="fixed bottom-16 md:bottom-20 left-3 right-3 z-50" in:fly={{ y: 20, duration: 300 }}>
		<div class="panel backdrop-blur-md rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div
					class="size-10 rounded-lg bg-[#315d8d]/18 border border-[#7ba0c8]/30 flex items-center justify-center shrink-0"
				>
					<span class="text-lg">{step === 4 ? "🔧" : "🪖"}</span>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-[#fff7e8]">
						{step === 4 ? "Navigate to Production" : "Navigate to Training"}
					</p>
					<p class="text-xs text-[#d9ccb7] mt-0.5">
						Tap <strong class="text-[#f7c56b]">{step === 4 ? "Production" : "Training"}</strong> in the bar below
					</p>
				</div>
				{#if canSkip}
					<button
						onclick={() => setStep(null)}
						disabled={submitting}
						class="text-xs text-[#a89e8e] hover:text-[#d9ccb7] transition-colors shrink-0"
					>
						Skip
					</button>
				{/if}
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
			<div class="bg-[#0e1d2f]/95 border-t border-[#dfceb0]/20 rounded-t-2xl max-h-[80vh] flex flex-col">
				<!-- Drag handle + skip -->
				<div class="flex items-center justify-between px-5 pt-3 pb-1 shrink-0">
					<div class="w-16"></div>
					<div class="w-10 h-1 rounded-full bg-[#dfceb0]/25"></div>
					{#if canSkip}
						<button
							onclick={() => setStep(null)}
							disabled={submitting}
							class="w-16 flex items-center justify-end gap-1 text-xs text-[#a89e8e] hover:text-[#d9ccb7] transition-colors"
						>
							Skip
							<FluentDismiss20Filled class="size-3.5" />
						</button>
					{:else}
						<div class="w-16"></div>
					{/if}
				</div>

				<!-- Progress dots -->
				<div class="flex justify-center gap-1.5 pb-3 shrink-0">
					{#each Array(TOTAL_STEPS) as _, i}
						<div
							class="h-1 rounded-full transition-all duration-300 {i === step
								? 'w-6 bg-[#e6a527]'
								: i < step
									? 'w-2 bg-[#e6a527]/30'
									: 'w-2 bg-[#dfceb0]/15'}"
						></div>
					{/each}
				</div>

				<!-- Content -->
				<div class="px-5 pb-6 overflow-y-auto">
					{#if step === 0}
						<!-- ── Greeting ── -->
						<div class="text-center space-y-4 py-2" in:fly={{ y: 20, duration: 300 }}>
							<div class="flex justify-center">
								<div
									class="size-16 rounded-2xl bg-[#e6a527]/12 border border-[#e6a527]/35 flex items-center justify-center"
								>
									<span class="text-3xl">🎖️</span>
								</div>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-[#fff7e8] tracking-wide">Greeting Commander</h2>
								<p class="text-[#d9ccb7] text-sm mt-2 max-w-sm mx-auto leading-relaxed">
									Welcome to PsyOps — a political simulation where you shape nations, build empires, and wage wars
									through strategy and diplomacy.
								</p>
							</div>
							<button onclick={() => setStep(1)} disabled={submitting} class={buttonClass({ variant: "primary", block: true })}>
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
								<div
									class="size-10 rounded-lg bg-[#8c709b]/15 border border-[#b7a0c5]/30 flex items-center justify-center shrink-0"
								>
									<FluentPerson20Filled class="size-5 text-[#d5c4df]" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-[#fff7e8]">Choose Your Name</h2>
									<p class="text-xs text-[#a89e8e]">This is how other players will know you</p>
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
									class={nameInputClass}
								/>
								{#if nameError}
									<p class="text-xs text-red-400 mt-1.5">{nameError}</p>
								{:else}
									<p class="text-xs text-[#a89e8e] mt-1.5">{name.length}/50 — letters, numbers, spaces</p>
								{/if}
							</div>

							<button
								onclick={submitName}
								disabled={submitting || !name.trim()}
								class={buttonClass({ variant: "primary", block: true })}
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
								<div
									class="size-10 rounded-lg bg-[#315d8d]/18 border border-[#7ba0c8]/30 flex items-center justify-center shrink-0"
								>
									<FluentGlobe20Filled class="size-5 text-[#b7d0e6]" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-[#fff7e8]">Choose Your Region</h2>
									<p class="text-xs text-[#a89e8e]">Pick a region to call home</p>
								</div>
							</div>

							{#if loadingRegions}
								<div class="flex items-center justify-center py-8">
									<span class="loading loading-ring loading-md text-[#e6a527]"></span>
								</div>
							{:else}
								<div class="space-y-2 max-h-[40vh] overflow-y-auto">
									{#each regions as region (region.id)}
										<button
											onclick={() => selectRegion(region.id)}
											disabled={submitting}
											class="w-full text-left panel-interactive rounded-xl p-3.5 disabled:opacity-50 group"
										>
											<div class="flex items-center gap-3">
												<div
													class="size-10 rounded-lg bg-[#102239]/70 border border-[#dfceb0]/15 flex items-center justify-center shrink-0"
												>
													<FluentGlobe20Filled
														class="size-5 text-[#a89e8e] group-hover:text-[#b7d0e6] transition-colors"
													/>
												</div>
												<div class="flex-1 min-w-0">
													<p
														class="text-sm font-semibold text-[#fff7e8] group-hover:text-[#b7d0e6] transition-colors truncate"
													>
														{getRegionName(region.id)}
													</p>
													<div class="flex items-center gap-2 mt-0.5">
														{#if region.state}
															<span class="text-xs text-[#a89e8e] flex items-center gap-1">
																<FluentBuildingGovernment20Filled class="size-3" />
																{region.state.name}
															</span>
														{:else}
															<span class="text-xs text-[#d5c4df]">Independent</span>
														{/if}
														<span class="text-xs text-[#a89e8e]">·</span>
														<span class="text-xs text-[#a89e8e] flex items-center gap-1">
															<FluentPeople20Filled class="size-3" />
															{region.populationCount === 0 ? "No residents" : formatPopulation(region.populationCount)}
														</span>
													</div>
												</div>
												<FluentArrowRight20Filled
													class="size-4 text-[#a89e8e] group-hover:text-[#b7d0e6] transition-colors shrink-0"
												/>
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
								<h2 class="text-lg font-bold text-[#fff7e8]">Your Command Center</h2>
								<p class="text-sm text-[#d9ccb7] leading-relaxed">
									This is your dashboard — broadcasts from your state, quick actions, and an overview of your journey
									all live here.
								</p>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div class="panel-muted rounded-lg p-3 text-center">
									<span class="text-lg">📰</span>
									<p class="text-xs text-[#a89e8e] mt-1">Read news &amp; posts</p>
								</div>
								<div class="panel-muted rounded-lg p-3 text-center">
									<span class="text-lg">🗺️</span>
									<p class="text-xs text-[#a89e8e] mt-1">Explore the map</p>
								</div>
								<div class="panel-muted rounded-lg p-3 text-center">
									<span class="text-lg">💬</span>
									<p class="text-xs text-[#a89e8e] mt-1">Chat with players</p>
								</div>
								<div class="panel-muted rounded-lg p-3 text-center">
									<span class="text-lg">🏛️</span>
									<p class="text-xs text-[#a89e8e] mt-1">Join a party</p>
								</div>
							</div>

							<button onclick={() => setStep(4)} disabled={submitting} class={buttonClass({ variant: "primary", block: true })}>
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
								<h2 class="text-lg font-bold text-[#fff7e8]">Production</h2>
								<p class="text-sm text-[#d9ccb7] leading-relaxed">
									This is where you earn money and produce goods. Work at a factory to collect wages, buy resources on
									the market, and manufacture weapons &amp; equipment.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">💰</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Work for Wages</p>
										<p class="text-xs text-[#a89e8e]">Find a factory job and complete shifts</p>
									</div>
								</div>
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">🏭</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Produce Goods</p>
										<p class="text-xs text-[#a89e8e]">Craft weapons from raw materials</p>
									</div>
								</div>
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">🏪</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Trade on the Market</p>
										<p class="text-xs text-[#a89e8e]">Buy and sell resources &amp; products</p>
									</div>
								</div>
							</div>

							<button onclick={() => setStep(5)} disabled={submitting} class={buttonClass({ variant: "primary", block: true })}>
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
								<h2 class="text-lg font-bold text-[#fff7e8]">Military Training</h2>
								<p class="text-sm text-[#d9ccb7] leading-relaxed">
									Build your army here. Train infantry, armor, artillery, and more. Your units are essential for
									defending your nation and conquering new territory.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">⚔️</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Train Units</p>
										<p class="text-xs text-[#a89e8e]">Select a unit type and begin training</p>
									</div>
								</div>
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">🛡️</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Manage Your Army</p>
										<p class="text-xs text-[#a89e8e]">Monitor organization, strength, and supply</p>
									</div>
								</div>
								<div class="flex items-center gap-3 panel-muted rounded-lg p-3">
									<span class="text-lg">🗡️</span>
									<div>
										<p class="text-sm font-medium text-[#fff7e8]">Join Battles</p>
										<p class="text-xs text-[#a89e8e]">Deploy units in wars to fight for your state</p>
									</div>
								</div>
							</div>

							<button onclick={() => setStep(6)} disabled={submitting} class={buttonClass({ variant: "primary", block: true })}>
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
								<div
									class="size-16 rounded-2xl bg-[#587252]/18 border border-[#8fae88]/30 flex items-center justify-center"
								>
									<FluentCheckmark20Filled class="size-8 text-[#c6dfbf]" />
								</div>
							</div>
							<div>
								<h2 class="text-2xl font-bold text-[#fff7e8]">You're Ready, Commander</h2>
								<p class="text-[#d9ccb7] text-sm mt-2 max-w-sm mx-auto leading-relaxed">
									You've got the basics. Go explore, build your economy, raise an army, and make your mark on the world.
								</p>
							</div>

							<button
								onclick={() => setStep(null)}
								disabled={submitting}
								class={buttonClass({ variant: "success", block: true })}
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
