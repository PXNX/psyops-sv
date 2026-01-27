<!-- src/routes/production/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentProduction20Filled from "~icons/fluent/production-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentEmojiShoppingCart from "~icons/fluent-emoji/shopping-cart";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";

	let { data } = $props();

	let selectedProduct = $state<keyof typeof data.recipes>("rifles");
	let productionQuantity = $state(1);

	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "⚙️",
		gunpowder: "💥",
		wood: "🪵",
		coal: "🪨"
	};

	const productIcons: Record<string, string> = {
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	const resourceMap = $derived(new Map(data.resources.map((r) => [r.resourceType, r.quantity])));
	const productMap = $derived(new Map(data.products.map((p) => [p.productType, p.quantity])));
	const activeProduction = $derived(data.activeProduction[0]);

	const canProduce = $derived.by(() => {
		const recipe = data.recipes[selectedProduct];
		if (!recipe) return false;

		for (const [resource, required] of Object.entries(recipe.inputs)) {
			const available = resourceMap.get(resource) || 0;
			if (available < required * productionQuantity) return false;
		}
		return true;
	});

	const productionProgress = $derived.by(() => {
		if (!activeProduction) return 0;
		const total = new Date(activeProduction.completesAt).getTime() - new Date(activeProduction.startedAt).getTime();
		const elapsed = Date.now() - new Date(activeProduction.startedAt).getTime();
		return Math.min(100, (elapsed / total) * 100);
	});

	const timeRemaining = $derived.by(() => {
		if (!activeProduction) return "";
		const remaining = new Date(activeProduction.completesAt).getTime() - Date.now();
		if (remaining <= 0) return "Complete!";
		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);

		if (hours > 0) return `${hours}h ${minutes}m`;
		if (minutes > 0) return `${minutes}m ${seconds}s`;
		return `${seconds}s`;
	});

	const jobStatus = $derived.by(() => {
		if (!data.currentJob) return null;
		if (!data.currentJob.lastWorked) return { status: "ready", text: "Ready for shift" };

		const SHIFT_DURATION = 8 * 60 * 60 * 1000;
		const timeSinceWork = Date.now() - new Date(data.currentJob.lastWorked).getTime();

		if (timeSinceWork < SHIFT_DURATION) {
			const remaining = SHIFT_DURATION - timeSinceWork;
			const hours = Math.floor(remaining / 3600000);
			const minutes = Math.floor((remaining % 3600000) / 60000);
			return {
				status: "working",
				text: `${hours}h ${minutes}m remaining`,
				progress: (timeSinceWork / SHIFT_DURATION) * 100
			};
		}

		return { status: "complete", text: "Shift complete!" };
	});

	$effect(() => {
		if (activeProduction) {
			const interval = setInterval(() => {
				if (new Date(activeProduction.completesAt) <= new Date()) {
					window.location.reload();
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	});
</script>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-8">
	<!-- Header with gradient accent -->
	<div class="relative">
		<div
			class="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-2xl blur-3xl"
		></div>
		<div class="relative flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold">Production</h1>
			</div>

			<div class="flex gap-3">
				{#if data.userCompany}
					<a
						href="/company"
						class="px-4 py-2 bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-slate-600/80 hover:to-slate-700/80
						       border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2"
					>
						<FluentBuilding20Filled class="size-4" />
						<span>My Company</span>
					</a>
				{:else}
					<a
						href="/company/create"
						class="px-4 py-2 bg-gradient-to-br from-emerald-700/80 to-emerald-800/80 hover:from-emerald-600/80 hover:to-emerald-700/80
						       border border-emerald-500/20 rounded-lg text-emerald-300 hover:text-white transition-all duration-300 flex items-center gap-2"
					>
						<FluentAdd20Filled class="size-4" />
						<span>Create Company</span>
					</a>
				{/if}

				<a
					href="/market"
					class="px-4 py-2 bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-slate-600/80 hover:to-slate-700/80
					       border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all duration-300 flex items-center gap-2"
				>
					<FluentEmojiShoppingCart class="size-4" />
					<span>Market</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Stats Overview - Combined and streamlined -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Balance -->
		<div
			class="relative group overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-500/20 p-5"
		>
			<div
				class="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
			></div>
			<div class="relative flex items-center gap-4">
				<div
					class="size-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center"
				>
					<FluentMoney20Filled class="size-6 text-emerald-400" />
				</div>
				<div>
					<p class="text-xs text-emerald-400/70 uppercase tracking-wide font-medium">Balance</p>
					<p class="text-2xl font-bold text-white">{data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Current Job Status - Enhanced with gradient -->
	{#if data.currentJob && jobStatus}
		<a
			href="/factory/{data.currentJob.factoryId}"
			class="block relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-6
			       hover:border-blue-500/30 transition-all duration-300 group"
		>
			<div
				class="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
			></div>

			<div class="relative flex items-start justify-between mb-4">
				<div>
					<h2 class="text-xl font-semibold text-white mb-1">{data.currentJob.factoryName}</h2>
					<p class="text-sm text-gray-400">{data.currentJob.companyName}</p>
				</div>
				<div class="text-right">
					<p class="text-xs text-gray-400 mb-1">Daily Wage</p>
					<p class="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
						${data.currentJob.wage.toLocaleString()}
					</p>
				</div>
			</div>

			{#if jobStatus.status === "working"}
				<div class="relative">
					<div class="flex justify-between items-center mb-2">
						<span class="text-sm font-medium text-gray-300">Shift Progress</span>
						<span class="text-sm font-bold text-amber-400">{jobStatus.text}</span>
					</div>
					<div class="h-3 bg-slate-800 rounded-full overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all duration-500 relative"
							style="width: {jobStatus.progress}%"
						>
							<div
								class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
							></div>
						</div>
					</div>
				</div>
			{:else if jobStatus.status === "complete"}
				<div class="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-xl p-4">
					<p class="text-emerald-300 font-medium flex items-center gap-2">
						<FluentCheckmark20Filled class="size-5" />
						{jobStatus.text} Click to collect payment.
					</p>
				</div>
			{:else}
				<div class="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-4">
					<p class="text-blue-300 font-medium flex items-center gap-2">
						<FluentClock20Filled class="size-5" />
						{jobStatus.text}
					</p>
				</div>
			{/if}
		</a>
	{/if}

	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Inventory Sidebar - Consolidated Resources & Products -->
		<div class="space-y-6">
			<div
				class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-6"
			>
				<div class="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>

				<div class="relative space-y-6">
					<!-- Resources Section -->
					<div>
						<div class="flex items-center gap-2 mb-4">
							<div
								class="size-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center"
							>
								<FluentBox20Filled class="size-4 text-purple-400" />
							</div>
							<h2 class="text-lg font-semibold text-white">Resources</h2>
						</div>

						<div class="space-y-2">
							{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
								{@const quantity = resourceMap.get(resource) || 0}
								<div
									class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/30 transition-colors"
								>
									<div class="flex items-center gap-2">
										<span class="text-lg">{resourceIcons[resource]}</span>
										<span class="font-medium capitalize text-gray-300">{resource}</span>
									</div>
									<span
										class="px-2.5 py-1 rounded-md text-sm font-bold {quantity > 0
											? 'bg-purple-500/20 text-purple-300'
											: 'bg-slate-700 text-gray-500'}"
									>
										{quantity}
									</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Products Section -->
					<div>
						<div class="flex items-center gap-2 mb-4">
							<div
								class="size-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center"
							>
								<FluentCube20Filled class="size-4 text-emerald-400" />
							</div>
							<h2 class="text-lg font-semibold text-white">Products</h2>
						</div>

						<div class="space-y-2">
							{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
								{@const quantity = productMap.get(product) || 0}
								<div
									class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-emerald-500/30 transition-colors"
								>
									<div class="flex items-center gap-2">
										<span class="text-lg">{productIcons[product]}</span>
										<span class="font-medium capitalize text-gray-300">{product}</span>
									</div>
									<span
										class="px-2.5 py-1 rounded-md text-sm font-bold {quantity > 0
											? 'bg-emerald-500/20 text-emerald-300'
											: 'bg-slate-700 text-gray-500'}"
									>
										{quantity}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Content Area -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Available Factories -->
			<div
				class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-6"
			>
				<div class="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>

				<div class="relative space-y-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div
								class="size-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center"
							>
								<FluentFactory20Filled class="size-5 text-blue-400" />
							</div>
							<h2 class="text-xl font-semibold text-white">Available Factories</h2>
						</div>
						<span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium">
							{data.availableFactories.length} open
						</span>
					</div>

					<div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
						{#each data.availableFactories as factory}
							<a
								href="/factory/{factory.id}"
								class="block group relative overflow-hidden bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-4 border border-slate-700/50
								       hover:border-blue-500/50 transition-all duration-300"
							>
								<div
									class="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"
								></div>

								<div class="relative">
									<div class="flex items-start justify-between mb-3">
										<div class="flex-1">
											<h3 class="font-semibold text-white group-hover:text-blue-300 transition-colors">
												{factory.name}
											</h3>
											<p class="text-xs text-gray-400 mt-0.5">{factory.companyName} • {factory.stateName}</p>
										</div>
										<FluentArrowRight20Filled
											class="size-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
										/>
									</div>

									<div class="flex items-center justify-between">
										<div class="flex items-center gap-4 text-sm">
											<div class="flex items-center gap-1.5">
												<FluentMoney20Filled class="size-4 text-emerald-400" />
												<span class="text-emerald-400 font-semibold">${factory.workerWage.toLocaleString()}</span>
											</div>
											<div class="flex items-center gap-1.5">
												<FluentPeople20Filled class="size-4 text-blue-400" />
												<span class="text-gray-300">{factory.currentWorkers}/{factory.maxWorkers}</span>
											</div>
										</div>
										<div class="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-medium capitalize">
											{factory.factoryType}
										</div>
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</div>

			<!-- Production Section -->
			{#if activeProduction}
				<div
					class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/30 p-6"
				>
					<div class="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent"></div>

					<div class="relative space-y-5">
						<div class="flex items-center gap-3">
							<div
								class="size-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center"
							>
								<FluentFactory20Filled class="size-5 text-amber-400" />
							</div>
							<h2 class="text-xl font-semibold text-white">Production In Progress</h2>
						</div>

						<div class="bg-slate-900/50 backdrop-blur-sm rounded-xl p-5 space-y-5 border border-amber-500/20">
							<div class="flex items-start gap-4">
								<span class="text-5xl">{productIcons[activeProduction.productType]}</span>
								<div class="flex-1">
									<h3 class="text-2xl font-bold text-white capitalize mb-1">{activeProduction.productType}</h3>
									<p class="text-gray-400">Manufacturing {activeProduction.quantity} units</p>
								</div>
								<div class="text-right">
									<p class="text-xs text-amber-400/70 uppercase tracking-wide font-medium mb-1">Time Left</p>
									<p
										class="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
									>
										{timeRemaining}
									</p>
								</div>
							</div>

							<div>
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-300">Production Progress</span>
									<span class="text-sm font-bold text-amber-400">{Math.floor(productionProgress)}%</span>
								</div>
								<div class="h-4 bg-slate-800 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all duration-1000 relative"
										style="width: {productionProgress}%"
									>
										<div
											class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
										></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/startProduction"
					use:enhance
					class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-white/10 p-6"
				>
					<div class="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>

					<div class="relative space-y-6">
						<div class="flex items-center gap-3">
							<div
								class="size-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center"
							>
								<FluentProduction20Filled class="size-5 text-purple-400" />
							</div>
							<h2 class="text-xl font-semibold text-white">Start Production</h2>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
							{#each Object.keys(data.recipes) as product}
								<button
									type="button"
									onclick={() => (selectedProduct = product as keyof typeof data.recipes)}
									class="relative p-3 rounded-lg border-2 transition-all duration-200 text-center group
										       {selectedProduct === product
										? 'bg-purple-500/20 border-purple-500/60 shadow-lg shadow-purple-500/20'
										: 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/70 hover:bg-slate-800/50'}"
								>
									<input
										type="radio"
										name="productType"
										value={product}
										checked={selectedProduct === product}
										class="sr-only"
									/>
									<div class="text-3xl mb-1">{productIcons[product]}</div>
									<div
										class="text-xs font-medium capitalize {selectedProduct === product
											? 'text-purple-300'
											: 'text-gray-400 group-hover:text-gray-300'}"
									>
										{product}
									</div>
								</button>
							{/each}
						</div>

						<div>
							<label for="quantity" class="block text-sm font-medium text-gray-300 mb-3">
								Batch Size: <span class="text-white font-bold">×{productionQuantity}</span>
							</label>
							<input
								type="range"
								id="quantity"
								name="quantity"
								min="1"
								max="10"
								bind:value={productionQuantity}
								class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
							/>
							<div class="flex justify-between text-xs text-gray-500 mt-1 px-1">
								<span>1</span>
								<span>5</span>
								<span>10</span>
							</div>
						</div>

						{#if data.recipes[selectedProduct]}
							<h4 class="text-xs font-medium text-slate-400 mb-2.5 uppercase tracking-wide">Resources Required</h4>
							<div class="bg-slate-900/30 rounded-lg p-3 space-y-1.5 border border-slate-700/30">
								{#each Object.entries(data.recipes[selectedProduct].inputs) as [resource, amount]}
									{@const available = resourceMap.get(resource) || 0}
									{@const needed = amount * productionQuantity}
									{@const hasEnough = available >= needed}
									<div class="flex justify-between text-xs items-center">
										<span class="text-slate-400 flex items-center gap-1.5">
											<span class="text-sm opacity-80">{resourceIcons[resource]}</span>
											<span class="capitalize">{resource}</span>
										</span>
										<span class="font-mono text-xs" class:text-white={hasEnough} class:text-red-400={!hasEnough}>
											{needed.toLocaleString()}
											<span class="text-slate-600">/ {available.toLocaleString()}</span>
											{#if hasEnough}
												<span class="text-emerald-400 ml-1">✓</span>
											{:else}
												<span class="text-red-400 ml-1">✗</span>
											{/if}
										</span>
									</div>
								{/each}
							</div>

							{#if !canProduce}
								<div class="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
									<span class="text-xs text-red-400">⚠️ Insufficient resources</span>
								</div>
							{/if}

							<div class="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
								<div class="flex items-center gap-2">
									<FluentClock20Filled class="size-5 text-gray-400" />
									<span class="text-sm text-gray-400">Production Time</span>
								</div>
								<span class="font-bold text-white text-lg">
									{Math.floor((data.recipes[selectedProduct].duration * productionQuantity) / 60)} min
								</span>
							</div>
						{/if}

						<button
							type="submit"
							disabled={!canProduce}
							class="w-full py-4 rounded-xl font-semibold text-white transition-all duration-300
							       {canProduce
								? 'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 shadow-lg shadow-purple-500/25'
								: 'bg-slate-700 text-slate-400 cursor-not-allowed'}"
						>
							{#if canProduce}
								<span class="flex items-center justify-center gap-2">
									<FluentCheckmark20Filled class="size-5" />
									Start Production
								</span>
							{:else}
								<span class="flex items-center justify-center gap-2">
									<FluentWarning20Filled class="size-5" />
									Insufficient Resources
								</span>
							{/if}
						</button>

						{#if !canProduce}
							<div
								class="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4"
							>
								<p class="text-sm text-amber-300 flex items-start gap-2">
									<FluentWarning20Filled class="size-5 flex-shrink-0 mt-0.5" />
									<span
										>You need more resources to start this production. Work at a factory to earn resources and wages.</span
									>
								</p>
							</div>
						{/if}
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
