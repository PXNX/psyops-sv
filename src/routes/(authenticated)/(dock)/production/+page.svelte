<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";

	let { data } = $props();

	let selectedProduct = $state("rifles");
	let productionQuantity = $state(1);

	// Resource icons/logos (using emoji as placeholders)
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
		const minutes = Math.floor(remaining / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);
		return `${minutes}m ${seconds}s`;
	});

	// Auto-refresh for production progress
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

<div class="container mx-auto p-4 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold flex items-center gap-3">
					<FluentChartMultiple20Filled class="w-10 h-10" />
					Arms Production
				</h1>
				<p class="text-base-content/70 mt-2">Manufacture weapons and equipment</p>
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
					<div class="stat-figure text-secondary">
						<FluentChartMultiple20Filled class="w-8 h-8" />
					</div>
					<div class="stat-title">Production Slot</div>
					<div class="stat-value text-secondary text-2xl">
						{#if activeProduction}
							<span class="loading loading-spinner loading-md"></span>
						{:else}
							<span class="text-success">Ready</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Left Column - Inventory -->
		<div class="space-y-6">
			<!-- Resources -->
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<FluentChartMultiple20Filled class="w-5 h-5" />
						Resources
					</h2>

					<div class="space-y-2">
						{#each ["iron", "copper", "steel", "gunpowder", "wood", "coal"] as resource}
							{@const quantity = resourceMap.get(resource) || 0}
							<div
								class="flex items-center justify-between p-2 bg-base-300 rounded-lg hover:bg-base-300/70 transition-colors"
							>
								<div class="flex items-center gap-2">
									<span class="text-2xl">{resourceIcons[resource]}</span>
									<span class="font-medium capitalize">{resource}</span>
								</div>
								<span class="badge badge-lg {quantity > 0 ? 'badge-primary' : 'badge-ghost'} font-bold">
									{quantity}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Products -->
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<FluentChartMultiple20Filled class="w-5 h-5" />
						Products
					</h2>

					<div class="space-y-2">
						{#each ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as product}
							{@const quantity = productMap.get(product) || 0}
							<div
								class="flex items-center justify-between p-2 bg-base-300 rounded-lg hover:bg-base-300/70 transition-colors"
							>
								<div class="flex items-center gap-2">
									<span class="text-2xl">{productIcons[product]}</span>
									<span class="font-medium capitalize">{product}</span>
								</div>
								<span class="badge badge-lg {quantity > 0 ? 'badge-success' : 'badge-ghost'} font-bold">
									{quantity}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Middle Column - Production Slot -->
		<div class="lg:col-span-2">
			<div class="card bg-gradient-to-br from-base-200 to-base-300 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<FluentChartMultiple20Filled class="w-6 h-6" />
						Production Facility
					</h2>

					{#if activeProduction}
						<!-- Active Production -->
						<div class="space-y-4">
							<div class="alert alert-info shadow-lg">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-2">
										<span class="text-3xl">{productIcons[activeProduction.productType]}</span>
										<div>
											<h3 class="font-bold text-lg">
												Producing {activeProduction.productType}
											</h3>
											<p class="text-sm opacity-70">
												Quantity: {activeProduction.quantity} units
											</p>
										</div>
									</div>
								</div>
							</div>

							<div class="bg-base-100 rounded-lg p-4">
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium">Production Progress</span>
									<span class="text-sm font-bold">{Math.floor(productionProgress)}%</span>
								</div>
								<progress class="progress progress-primary w-full h-4" value={productionProgress} max="100"></progress>

								<div class="mt-3 text-center">
									<div class="text-xs text-base-content/60">Time Remaining</div>
									<div class="text-2xl font-bold text-primary">{timeRemaining}</div>
								</div>
							</div>

							<div class="alert">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									class="stroke-info shrink-0 w-6 h-6"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									></path></svg
								>
								<span class="text-sm"
									>Your production will complete automatically. Items will be added to your inventory.</span
								>
							</div>
						</div>
					{:else}
						<!-- Production Form -->
						<form method="POST" action="?/startProduction" use:enhance class="space-y-6">
							<!-- Product Selection -->
							<div class="form-control">
								<label class="label">
									<span class="label-text font-semibold">Select Product to Manufacture</span>
								</label>
								<select name="productType" class="select select-bordered select-lg" bind:value={selectedProduct}>
									{#each Object.keys(data.recipes) as product}
										<option value={product}>
											{productIcons[product]}
											{product.charAt(0).toUpperCase() + product.slice(1)}
										</option>
									{/each}
								</select>
							</div>

							<!-- Quantity Multiplier -->
							<div class="form-control">
								<label class="label">
									<span class="label-text font-semibold">Batch Multiplier</span>
									<span class="label-text-alt">1-10 batches</span>
								</label>
								<input
									type="range"
									name="quantity"
									min="1"
									max="10"
									class="range range-primary"
									bind:value={productionQuantity}
								/>
								<div class="w-full flex justify-between text-xs px-2 mt-1">
									<span>1×</span>
									<span>2×</span>
									<span>3×</span>
									<span>4×</span>
									<span>5×</span>
									<span>6×</span>
									<span>7×</span>
									<span>8×</span>
									<span>9×</span>
									<span>10×</span>
								</div>
							</div>

							<!-- Recipe Display -->
							{#if data.recipes[selectedProduct]}
								<div class="bg-base-100 rounded-xl p-6 border-2 border-base-300">
									<div class="flex items-center justify-between mb-4">
										<h3 class="text-lg font-bold">Production Recipe</h3>
										<div class="badge badge-lg badge-outline">×{productionQuantity}</div>
									</div>

									<!-- Output -->
									<div class="bg-success/10 border-2 border-success/30 rounded-lg p-4 mb-4">
										<div class="text-xs text-success font-semibold mb-1">OUTPUT</div>
										<div class="flex items-center gap-3">
											<span class="text-4xl">{productIcons[selectedProduct]}</span>
											<div>
												<div class="text-2xl font-bold text-success">
													{data.recipes[selectedProduct].output * productionQuantity}
												</div>
												<div class="text-sm capitalize">{selectedProduct}</div>
											</div>
										</div>
									</div>

									<!-- Inputs -->
									<div class="space-y-2 mb-4">
										<div class="text-xs font-semibold text-base-content/60">REQUIRED RESOURCES</div>
										{#each Object.entries(data.recipes[selectedProduct].inputs) as [resource, amount]}
											{@const available = resourceMap.get(resource) || 0}
											{@const needed = amount * productionQuantity}
											{@const hasEnough = available >= needed}
											<div
												class="flex items-center justify-between p-3 bg-base-200 rounded-lg border-2 {hasEnough
													? 'border-success/30'
													: 'border-error/30'}"
											>
												<div class="flex items-center gap-2">
													<span class="text-xl">{resourceIcons[resource]}</span>
													<span class="font-medium capitalize">{resource}</span>
												</div>
												<div class="text-right">
													<div class="font-bold {hasEnough ? 'text-success' : 'text-error'}">
														{needed} required
													</div>
													<div class="text-xs text-base-content/60">
														{available} available
													</div>
												</div>
											</div>
										{/each}
									</div>

									<!-- Production Time -->
									<div class="flex items-center justify-between text-sm">
										<span class="text-base-content/60">Production Time:</span>
										<span class="font-bold"
											>{Math.floor((data.recipes[selectedProduct].duration * productionQuantity) / 60)} minutes</span
										>
									</div>
								</div>
							{/if}

							<!-- Submit Button -->
							<button type="submit" class="btn btn-primary btn-lg w-full" disabled={!canProduce}>
								{#if canProduce}
									<FluentChartMultiple20Filled class="w-5 h-5" />
									Start Production
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 stroke-current"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										></path></svg
									>
									Insufficient Resources
								{/if}
							</button>
						</form>
					{/if}
				</div>
			</div>

			<!-- Production Tips -->
			{#if !activeProduction}
				<div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
						<span class="text-xs">Only 1 production slot available at a time</span>
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
						<span class="text-xs">Resources are consumed when production starts</span>
					</div>
					<div class="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="stroke-current shrink-0 w-6 h-6"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"
							></path></svg
						>
						<span class="text-xs">Batch production multiplies time and resources</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body) {
		min-height: 100vh;
	}
</style>
