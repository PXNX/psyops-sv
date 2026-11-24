<!-- src/routes/(authenticated)/(dock)/domains/CyberPanel.svelte -->
<!-- Cyber: the state AI programme, what it adds, and the next upgrade. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentBrainCircuit20Regular from "~icons/fluent/brain-circuit-20-regular";
	import { Button } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import { AI_MAX_LEVEL } from "#lib/config/index.js";
	import { pct, submitOrder, type Planner } from "./shared";

	let { p }: { p: Planner } = $props();

	const figures = $derived([
		{ label: "Cyber offence", value: `+${pct(p.ai.cyberOffence)}%` },
		{ label: "Cyber defence", value: `+${pct(p.ai.cyberDefence)}%` },
		{ label: "Recon fusion", value: `+${pct(p.ai.recon)}%` },
		{ label: "Production", value: `×${p.ai.production}` },
		{ label: "Detection", value: `+${pct(p.ai.detection)}%` },
		{ label: "Research", value: `${p.ai.researchPerDay}/day` }
	]);

	// Only the materials the next level actually needs.
	const nextCosts = $derived.by(() => {
		const c = p.aiNextCost;
		if (!c) return null;
		const out: Record<string, number> = { cost: c.cost };
		if (c.chips) out.chips = c.chips;
		if (c.rareEarth) out.rare_earth = c.rareEarth;
		if (c.hardware) out.hardware = c.hardware;
		if (c.datacenters) out.datacenter = c.datacenters;
		return out;
	});
</script>

<section id="cyber" class="panel scroll-mt-20 p-4" aria-labelledby="cyber-title">
	<h2 id="cyber-title" class="section-title mb-3">
		<FluentBrainCircuit20Regular class="size-4" />Cyber · AI programme
	</h2>

	<div class="flex items-end justify-between gap-3">
		<div>
			<p class="data text-2xl leading-none font-semibold text-fg">
				L{p.ai.level}<span class="text-sm text-fg-faint">/{AI_MAX_LEVEL}</span>
			</p>
			<p class="mt-1 text-xs text-fg-muted">{p.ai.label}</p>
		</div>
		<div class="flex gap-1" aria-hidden="true">
			{#each Array(AI_MAX_LEVEL) as _, i (i)}
				<span class="h-5 w-2 rounded-[2px] {i < p.ai.level ? 'bg-primary' : 'bg-surface-8'}"></span>
			{/each}
		</div>
	</div>

	<dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
		{#each figures as f (f.label)}
			<div class="flex justify-between gap-2">
				<dt class="text-fg-muted">{f.label}</dt>
				<dd class="data text-fg">{f.value}</dd>
			</div>
		{/each}
	</dl>
	<p
		class="mt-3 border-t border-line/15 pt-3 text-xs text-fg-muted"
		title="Datacenters are built by law from server hardware and run on electricity and cooling water."
	>
		Computing base <span class="data text-fg">{p.ai.hardware}</span> hardware ·
		<span class="data text-fg">{p.ai.datacenters}</span> datacenters
	</p>

	{#if p.roles.ai}
		{#if nextCosts}
			<form
				method="POST"
				action="?/upgradeAi"
				use:enhance={submitOrder}
				class="mt-3 flex flex-wrap items-center justify-between gap-2"
			>
				<ResourceRequirements inline costs={nextCosts} available={{}} />
				<Button type="submit" size="sm">Upgrade to L{p.ai.level + 1}</Button>
			</form>
		{:else}
			<p class="mt-3 text-xs text-positive-fg">Top level reached.</p>
		{/if}
	{/if}
</section>
