<!-- /lib/component/ResourceRequirements.svelte -->
<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentEmojiPickaxe from "~icons/fluent-emoji/pick";
	import FluentEmojiGem from "~icons/fluent-emoji/gem-stone";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import FluentEmojiCollision from "~icons/fluent-emoji/collision";
	import FluentEmojiWood from "~icons/fluent-emoji/wood";
	import FluentEmojiRock from "~icons/fluent-emoji/rock";
	import FluentEmojiPackage from "~icons/fluent-emoji/package";

	type Props = {
		costs: Record<string, number>;
		available: Record<string, number>;
	};

	let { costs, available }: Props = $props();

	const resourceIconComponents: Record<string, any> = {
		iron: FluentEmojiPickaxe,
		copper: FluentEmojiGem,
		steel: FluentEmojiGear,
		gunpowder: FluentEmojiCollision,
		wood: FluentEmojiWood,
		coal: FluentEmojiRock,
		currency: FluentMoney20Filled
	};

	const requirements = $derived.by(() => {
		return Object.entries(costs).map(([resource, needed]) => {
			const availableAmount = available[resource] || 0;
			const hasEnough = availableAmount >= needed;

			return {
				resource,
				IconComponent: resourceIconComponents[resource] || FluentEmojiPackage,
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
	<h4 class="text-xs font-medium text-[#a89e8e] uppercase tracking-wide">
		{costs.currency ? "Cost" : "Resources Required"}
	</h4>

	<div class="panel-muted rounded-lg p-2.5 md:p-3 space-y-1.5">
		{#each requirements as req}
			<div class="flex justify-between text-xs items-center">
				<a
					href="/market/{req.resource}"
					class="text-[#a89e8e] hover:text-[#fff7e8] flex items-center gap-1.5 transition-colors"
				>
					<req.IconComponent class="size-3.5 {req.isCurrency ? 'text-emerald-400' : ''}" />
					<span class="capitalize">{req.resource}</span>
				</a>
				<span class="font-mono text-xs" class:text-[#fff7e8]={req.hasEnough} class:text-red-400={!req.hasEnough}>
					{req.needed.toLocaleString()}
					<span class="text-[#a89e8e]/70">/ {req.available.toLocaleString()}</span>
					{#if req.hasEnough}
						<span class="text-emerald-400 ml-1">✓</span>
					{:else}
						<span class="text-red-400 ml-1">✗</span>
					{/if}
				</span>
			</div>
		{/each}
	</div>
</div>
