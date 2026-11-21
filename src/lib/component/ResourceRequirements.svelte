<!-- /lib/component/ResourceRequirements.svelte -->
<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";

	type Props = {
		costs: Record<string, number>;
		available: Record<string, number>;
	};

	let { costs, available }: Props = $props();

	const requirements = $derived.by(() => {
		return Object.entries(costs).map(([resource, needed]) => {
			const availableAmount = available[resource] || 0;
			const hasEnough = availableAmount >= needed;

			return {
				resource,
				needed,
				available: availableAmount,
				hasEnough,
				isCurrency: resource === "currency"
			};
		});
	});

	const allRequirementsMet = $derived(requirements.every((r) => r.hasEnough));
</script>

<div class="space-y-2 md:space-y-3">
	<h4 class="text-xs font-medium text-fg-muted uppercase tracking-wide">
		{costs.currency ? "Cost" : "Resources Required"}
	</h4>

	<div class="panel-muted rounded-sm p-2.5 md:p-3 space-y-1.5">
		{#each requirements as req}
			<div class="flex justify-between text-xs items-center">
				<a
					href="/market/{req.resource}"
					class="text-fg-muted hover:text-fg flex items-center gap-1.5 transition-colors"
				>
					{#if req.isCurrency}
						<FluentMoney20Filled class="size-3.5 text-positive" />
					{:else}
						<ResourceIcon name={req.resource} class="size-3.5 shrink-0" />
					{/if}
					<span class="capitalize">{req.resource}</span>
				</a>
				<span class="font-mono text-xs" class:text-fg={req.hasEnough} class:text-red-400={!req.hasEnough}>
					{req.needed.toLocaleString()}
					<span class="text-fg-muted/70">/ {req.available.toLocaleString()}</span>
					{#if req.hasEnough}
						<span class="text-positive ml-1">✓</span>
					{:else}
						<span class="text-red-400 ml-1">✗</span>
					{/if}
				</span>
			</div>
		{/each}
	</div>
</div>
