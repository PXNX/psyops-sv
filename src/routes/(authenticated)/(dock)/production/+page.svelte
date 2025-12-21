<!-- src/routes/production/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentProduction20Filled from "~icons/fluent/production-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentCube20Filled from "~icons/fluent/cube-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentEmojiShoppingCart from "~icons/fluent-emoji/shopping-cart";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	let { data } = $props();

	let selectedProduct = $state("rifles");
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

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Production Facility</h1>
			<p class="text-gray-400">Manufacture weapons and equipment for your military</p>
		</div>

		<!-- Quick Actions -->
		<div class="flex gap-3">
			<a
				href="/market"
				class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
			>
				<FluentEmojiShoppingCart class="size-5" />
				Market
			</a>

			<a
				href="/factory/create"
				class="btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2"
			>
				<FluentAdd20Filled class="size-5" />
				Create Factory
			</a>
		</div>
	</div>

	<!-- Balance & Status -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div class="size-10 bg-green-600/20 rounded-lg flex items-center justify-center">
					<FluentMoney20Filled class="size-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Balance</p>
					<p class="text-lg font-bold text-white">{data.wallet.balance.toLocaleString()}</p>
				</div>
			</div>
		</div>

		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<div
					class="size-10 rounded-lg flex items-center justify-center {activeProduction
						? 'bg-amber-600/20'
						: 'bg-emerald-600/20'}"
				>
					<FluentFactory20Filled class="size-5 {activeProduction ? 'text-amber-400' : 'text-emerald-400'}" />
				</div>
				<div>
					<p class="text-xs text-gray-400">Production Status</p>
					<p class="text-lg font-bold {activeProduction ? 'text-amber-400' : 'text-emerald-400'}">
						{activeProduction ? "Active" : "Ready"}
					</p>
				</div>
			</div>
		</div>

		{#if data.currentJob}
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<div class="flex items-center gap-3">
					<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
						<FluentBriefcase20Filled class="size-5 text-blue-400" />
					</div>
					<div>
						<p class="text-xs text-gray-400">Current Job</p>
						<p class="text-sm font-bold text-white truncate">{data.currentJob.factoryName}</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="bg-slate-800/50 border border-white/5 rounded-xl p-4">
				<div class="flex items-center gap-3">
					<div class="size-10 bg-gray-600/20 rounded-lg flex items-center justify-center">
						<FluentBriefcase20Filled class="size-5 text-gray-400" />
					</div>
					<div>
						<p class="text-xs text-gray-400">Employment</p>
						<p class="text-sm font-bold text-gray-300">Unemployed</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Content -->
	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Inventory Sidebar -->
		<div class="space-y-6">
			<!-- Resources -->
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
				<div class="flex items-center gap-2">
					<FluentBox20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Resources</h2>
				</div>

				<div class="space-y-2">
					{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
						{@const quantity = resourceMap.get(resource) || 0}
						<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
							<div class="flex items-center gap-2">
								<span class="text-xl">{resourceIcons[resource]}</span>
								<span class="font-medium capitalize text-gray-300">{resource}</span>
							</div>
							<span
								class="badge {quantity > 0
									? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
									: 'bg-slate-700 text-gray-400 border-slate-600'} font-bold"
							>
								{quantity}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Products -->
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
				<div class="flex items-center gap-2">
					<FluentCube20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Products</h2>
				</div>

				<div class="space-y-2">
					{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
						{@const quantity = productMap.get(product) || 0}
						<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
							<div class="flex items-center gap-2">
								<span class="text-xl">{productIcons[product]}</span>
								<span class="font-medium capitalize text-gray-300">{product}</span>
							</div>
							<span
								class="badge {quantity > 0
									? 'bg-green-600/20 text-green-300 border-green-500/30'
									: 'bg-slate-700 text-gray-400 border-slate-600'} font-bold"
							>
								{quantity}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Production Area -->
		<div class="lg:col-span-2">
			{#if activeProduction}
				<!-- Active Production Display -->
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentFactory20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Production In Progress</h2>
					</div>

					<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-5 space-y-4">
						<div class="flex items-start gap-4">
							<span class="text-4xl">{productIcons[activeProduction.productType]}</span>
							<div class="flex-1">
								<h3 class="text-xl font-bold text-white capitalize mb-1">{activeProduction.productType}</h3>
								<p class="text-gray-400">Producing {activeProduction.quantity} units</p>
							</div>
							<div class="text-right">
								<p class="text-xs text-gray-400">Remaining</p>
								<p class="text-2xl font-bold text-amber-400">{timeRemaining}</p>
							</div>
						</div>

						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="text-sm font-medium text-gray-300">Progress</span>
								<span class="text-sm font-bold text-white">{Math.floor(productionProgress)}%</span>
							</div>
							<div class="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
									style="width: {productionProgress}%"
								></div>
							</div>
						</div>
					</div>

					<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
						<p class="text-sm text-blue-300">
							<FluentFlash20Filled class="inline size-4" />
							Production will complete automatically. Items will be added to your inventory.
						</p>
					</div>
				</div>
			{:else}
				<!-- Production Form -->
				<form
					method="POST"
					action="?/startProduction"
					use:enhance
					class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-5"
				>
					<div class="flex items-center gap-2">
						<FluentProduction20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Start Production</h2>
					</div>

					<!-- Product Selection -->
					<div>
						<label for="productType" class="block text-sm font-medium text-gray-300 mb-2">
							Product Type <span class="text-red-400">*</span>
						</label>
						<select
							id="productType"
							name="productType"
							bind:value={selectedProduct}
							class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						>
							{#each Object.keys(data.recipes) as product}
								<option value={product}>
									{productIcons[product]}
									{product.charAt(0).toUpperCase() + product.slice(1)}
								</option>
							{/each}
						</select>
					</div>

					<!-- Batch Multiplier -->
					<div>
						<label for="quantity" class="block text-sm font-medium text-gray-300 mb-2">
							Batch Size: <span class="text-white font-bold">×{productionQuantity}</span>
						</label>
						<input
							type="range"
							id="quantity"
							name="quantity"
							min="1"
							max="10"
							bind:value={productionQuantity}
							class="range range-primary"
						/>
						<div class="flex justify-between text-xs text-gray-400 px-2 mt-1">
							<span>1</span>
							<span>5</span>
							<span>10</span>
						</div>
					</div>

					<!-- Recipe Display -->
					{#if data.recipes[selectedProduct]}
						<div class="bg-slate-700/30 rounded-xl p-5 space-y-4 border border-slate-600/30">
							<div class="flex items-center justify-between">
								<h3 class="font-semibold text-white">Production Recipe</h3>
								<div class="badge bg-purple-600/20 text-purple-300 border-purple-500/30">
									×{productionQuantity} batch{productionQuantity > 1 ? "es" : ""}
								</div>
							</div>

							<!-- Output -->
							<div class="bg-green-600/10 border-2 border-green-500/30 rounded-lg p-4">
								<p class="text-xs font-semibold text-green-400 mb-2">OUTPUT</p>
								<div class="flex items-center gap-3">
									<span class="text-3xl">{productIcons[selectedProduct]}</span>
									<div>
										<p class="text-2xl font-bold text-green-400">
											{data.recipes[selectedProduct].output * productionQuantity}
										</p>
										<p class="text-sm text-gray-300 capitalize">{selectedProduct}</p>
									</div>
								</div>
							</div>

							<!-- Required Resources -->
							<div class="space-y-2">
								<p class="text-xs font-semibold text-gray-400">REQUIRED RESOURCES</p>
								{#each Object.entries(data.recipes[selectedProduct].inputs) as [resource, amount]}
									{@const available = resourceMap.get(resource) || 0}
									{@const needed = amount * productionQuantity}
									{@const hasEnough = available >= needed}
									<div
										class="flex items-center justify-between p-3 rounded-lg border-2 {hasEnough
											? 'bg-green-600/5 border-green-500/20'
											: 'bg-red-600/5 border-red-500/20'}"
									>
										<div class="flex items-center gap-2">
											<span class="text-lg">{resourceIcons[resource]}</span>
											<span class="font-medium capitalize text-gray-300">{resource}</span>
										</div>
										<div class="text-right">
											<p class="font-bold {hasEnough ? 'text-green-400' : 'text-red-400'}">
												{needed} needed
											</p>
											<p class="text-xs text-gray-400">{available} available</p>
										</div>
									</div>
								{/each}
							</div>

							<!-- Production Time -->
							<div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
								<div class="flex items-center gap-2">
									<FluentClock20Filled class="size-4 text-gray-400" />
									<span class="text-sm text-gray-400">Production Time</span>
								</div>
								<span class="font-bold text-white">
									{Math.floor((data.recipes[selectedProduct].duration * productionQuantity) / 60)} minutes
								</span>
							</div>
						</div>
					{/if}

					<!-- Submit -->
					<button
						type="submit"
						disabled={!canProduce}
						class="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
					>
						{#if canProduce}
							<FluentCheckmark20Filled class="size-5" />
							Start Production
						{:else}
							<FluentWarning20Filled class="size-5" />
							Insufficient Resources
						{/if}
					</button>

					<!-- Info -->
					{#if !canProduce}
						<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
							<p class="text-sm text-amber-300">
								<FluentWarning20Filled class="inline size-4" />
								You need more resources to start this production. Visit the market or work at a factory to earn resources.
							</p>
						</div>
					{/if}
				</form>
			{/if}
		</div>
	</div>
</div>
