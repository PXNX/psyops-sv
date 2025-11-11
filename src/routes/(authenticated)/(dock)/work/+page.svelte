<!-- src/routes/(authenticated)/(dock)/work/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";

	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";

	let { data } = $props();

	// Resource icons
	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	// Work cooldown timer
	const workCooldown = $derived.by(() => {
		if (!data.currentJob?.lastWorked) return { canWork: true, timeLeft: "", hoursLeft: 0 };
		const lastWork = new Date(data.currentJob.lastWorked).getTime();
		const elapsed = Date.now() - lastWork;
		const cooldown = 24 * 60 * 60 * 1000; // 24 hours

		if (elapsed >= cooldown) {
			return { canWork: true, timeLeft: "", hoursLeft: 0 };
		}

		const remaining = cooldown - elapsed;
		const hours = Math.floor(remaining / (60 * 60 * 1000));
		const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

		return {
			canWork: false,
			timeLeft: `${hours}h ${minutes}m`,
			hoursLeft: hours + minutes / 60
		};
	});

	const cooldownPercentage = $derived(workCooldown.canWork ? 100 : ((24 - workCooldown.hoursLeft) / 24) * 100);
</script>

<div class="container mx-auto p-4 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold flex items-center gap-3">
					<FluentChartMultiple20Filled class="w-10 h-10" />
					Employment
				</h1>
				<p class="text-base-content/70 mt-2">Work at factories to earn money</p>
			</div>

			<!-- Quick Stats -->
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-primary">
						<FluentChartMultiple20Filled class="w-8 h-8" />
					</div>
					<div class="stat-title">Balance</div>
					<div class="stat-value text-primary text-2xl">${(data.wallet.balance / 100).toFixed(2)}</div>
				</div>

				<div class="stat">
					<div class="stat-figure {workCooldown.canWork ? 'text-success' : 'text-warning'}">
						<FluentChartMultiple20Filled class="w-8 h-8" />
					</div>
					<div class="stat-title">Work Status</div>
					<div class="stat-value text-2xl {workCooldown.canWork ? 'text-success' : 'text-warning'}">
						{workCooldown.canWork ? "Ready" : workCooldown.timeLeft}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Left Column - Current Job & Info -->
		<div class="space-y-6">
			<!-- Current Employment -->
			{#if data.currentJob}
				<div class="card bg-gradient-to-br from-success/20 to-primary/20 shadow-xl border-2 border-success/30">
					<div class="card-body">
						<h2 class="card-title text-lg mb-3">
							<FluentChartMultiple20Filled class="w-5 h-5" />
							Your Employment
						</h2>

						<div class="space-y-4">
							<!-- Company Info -->
							<div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
								{#if data.currentJob.companyLogo}
									<img src={data.currentJob.companyLogo} alt="" class="w-12 h-12 rounded-lg object-cover" />
								{:else}
									<div class="w-12 h-12 rounded-lg bg-base-content/10 flex items-center justify-center text-2xl">
										🏭
									</div>
								{/if}
								<div class="flex-1">
									<div class="font-bold">{data.currentJob.companyName}</div>
									<div class="text-sm text-base-content/70">{data.currentJob.factoryName}</div>
								</div>
							</div>

							<!-- Job Details -->
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-sm">Position:</span>
									<span class="badge badge-primary capitalize">{data.currentJob.jobType}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm">Wage per shift:</span>
									<span class="font-bold text-success">${(data.currentJob.wage / 100).toFixed(2)}</span>
								</div>
								{#if data.currentJob.lastWorked}
									<div class="flex justify-between items-center">
										<span class="text-sm">Last worked:</span>
										<span class="text-xs text-base-content/70">
											{new Date(data.currentJob.lastWorked).toLocaleDateString()}
										</span>
									</div>
								{/if}
							</div>

							<!-- Cooldown Progress -->
							<div>
								<div class="flex justify-between text-xs mb-1">
									<span>Next shift available</span>
									<span class="font-bold">{Math.floor(cooldownPercentage)}%</span>
								</div>
								<progress
									class="progress {workCooldown.canWork ? 'progress-success' : 'progress-warning'} w-full"
									value={cooldownPercentage}
									max="100"
								></progress>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- How It Works -->
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg mb-3">
						<FluentChartMultiple20Filled class="w-5 h-5" />
						How It Works
					</h2>

					<div class="space-y-3">
						<div class="flex gap-3">
							<div class="text-2xl">💰</div>
							<div class="flex-1">
								<div class="font-semibold text-sm">Earn Money</div>
								<div class="text-xs text-base-content/70">Work shifts to earn wages based on factory rates</div>
							</div>
						</div>

						<div class="flex gap-3">
							<div class="text-2xl">⏰</div>
							<div class="flex-1">
								<div class="font-semibold text-sm">24-Hour Cooldown</div>
								<div class="text-xs text-base-content/70">Only one shift per day to prevent exploitation</div>
							</div>
						</div>

						<div class="flex gap-3">
							<div class="text-2xl">🏭</div>
							<div class="flex-1">
								<div class="font-semibold text-sm">Benefit Owners</div>
								<div class="text-xs text-base-content/70">Factory owners receive resources when you work</div>
							</div>
						</div>

						<div class="flex gap-3">
							<div class="text-2xl">📈</div>
							<div class="flex-1">
								<div class="font-semibold text-sm">Different Rates</div>
								<div class="text-xs text-base-content/70">Each factory offers different wages</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column - Available Factories -->
		<div class="lg:col-span-2">
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<FluentChartMultiple20Filled class="w-6 h-6" />
						Available Factories
					</h2>

					{#if !workCooldown.canWork}
						<div class="alert alert-warning mb-4">
							<FluentChartMultiple20Filled class="w-6 h-6" />
							<div>
								<div class="font-bold">Cooldown Active</div>
								<div class="text-sm">You can work again in {workCooldown.timeLeft}</div>
							</div>
						</div>
					{/if}

					<div class="space-y-4">
						{#each data.factories as factory}
							<div
								class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow border-2 border-base-300 hover:border-primary/50"
							>
								<div class="card-body p-5">
									<div class="flex items-start justify-between gap-4">
										<!-- Factory Info -->
										<div class="flex gap-4 flex-1">
											<!-- Company Logo -->
											{#if factory.companyLogo}
												<img
													src={factory.companyLogo}
													alt={factory.companyName}
													class="w-16 h-16 rounded-lg object-cover shadow"
												/>
											{:else}
												<div
													class="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl shadow"
												>
													🏭
												</div>
											{/if}

											<!-- Details -->
											<div class="flex-1">
												<h3 class="font-bold text-lg">{factory.name}</h3>
												<div class="text-sm text-base-content/70 mb-2">{factory.companyName}</div>

												<div class="flex flex-wrap gap-2">
													<div class="badge badge-outline capitalize">
														{factory.factoryType}
													</div>

													{#if factory.resourceOutput}
														<div class="badge badge-success gap-1">
															<span>{resourceIcons[factory.resourceOutput]}</span>
															<span class="capitalize">{factory.resourceOutput}</span>
															<span class="font-bold">+{factory.productionRate}</span>
														</div>
													{/if}

													<div class="badge badge-ghost">
														Max {factory.maxWorkers} workers
													</div>
												</div>
											</div>
										</div>

										<!-- Wage & Action -->
										<div class="text-right min-w-[160px]">
											<div class="text-xs text-base-content/60 mb-1">Wage per shift</div>
											<div class="text-3xl font-bold text-success mb-3">
												${(factory.workerWage / 100).toFixed(2)}
											</div>

											<form method="POST" action="?/work" use:enhance>
												<input type="hidden" name="factoryId" value={factory.id} />
												<button type="submit" class="btn btn-primary btn-block" disabled={!workCooldown.canWork}>
													{#if workCooldown.canWork}
														<FluentChartMultiple20Filled class="w-5 h-5" />
														Work Shift
													{:else}
														<FluentChartMultiple20Filled class="w-5 h-5" />
														On Cooldown
													{/if}
												</button>
											</form>
										</div>
									</div>

									<!-- Production Info -->
									{#if factory.resourceOutput}
										<div class="mt-3 pt-3 border-t border-base-300">
											<div class="text-xs text-base-content/60">
												When you work, the owner receives <span class="font-bold text-success"
													>{factory.productionRate}</span
												>
												<span class="capitalize">{factory.resourceOutput}</span>
												{resourceIcons[factory.resourceOutput]}
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}

						{#if data.factories.length === 0}
							<div class="text-center py-12">
								<FluentChartMultiple20Filled class="w-16 h-16 mx-auto opacity-20 mb-4" />
								<p class="text-lg text-base-content/50">No factories available</p>
								<p class="text-sm text-base-content/30 mt-2">Check back later for job opportunities</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tips -->
			<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="alert alert-info">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					<span class="text-xs">Higher wages mean more valuable resources for owners</span>
				</div>
				<div class="alert alert-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					<span class="text-xs">Use your earnings to buy resources and start production</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		min-height: 100vh;
	}
</style>
