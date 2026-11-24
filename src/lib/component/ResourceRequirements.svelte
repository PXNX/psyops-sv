<!-- /lib/component/ResourceRequirements.svelte -->
<!-- The single cost overview used by creation forms, fleet orders, production
     and operations. It shows every currency an action spends in one block:
     credits, materials, fuel, energy, manpower and time. Values come from the
     same config the server charges with, so new required materials (extra
     recipe inputs, tools, …) appear automatically. -->
<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-24-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import { goodLabel } from "#lib/config/index.js";

	type Props = {
		costs: Record<string, number>;
		available: Record<string, number>;
		/** Override the header (defaults to "Cost" / "Resources Required"). */
		title?: string;
		/** Tighter padding for small cards and inline forms. */
		compact?: boolean;
		/** One quiet row of icon + amount chips (no header, no box) for cards and lists. */
		inline?: boolean;
		/** Override the label of individual keys, e.g. { hours: "Effect" }. */
		labels?: Record<string, string>;
	};

	let { costs, available, title, compact = false, inline = false, labels = {} }: Props = $props();

	// Money is called different things in different configs; normalise it here
	// so every cost overview spells it the same way.
	const MONEY_KEYS = new Set(["currency", "money", "credits", "cost"]);
	const TIME_KEYS = new Set([
		"hours",
		"hour",
		"time",
		"duration",
		"durationHours",
		"cooldown",
		"cooldownHours",
		"days"
	]);
	const PEOPLE_KEYS = new Set(["manpower", "civilians"]);
	// These never have a market page, so they must not become /market/… links.
	const NON_MARKET_KEYS = new Set([...MONEY_KEYS, ...TIME_KEYS, ...PEOPLE_KEYS, "energy", "heat"]);

	const kindOf = (key: string): "money" | "time" | "manpower" | "resource" =>
		MONEY_KEYS.has(key) ? "money" : TIME_KEYS.has(key) ? "time" : PEOPLE_KEYS.has(key) ? "manpower" : "resource";
	const labelOf = (key: string) => {
		const known: Record<string, string> = {
			hours: "Build time",
			duration: "Duration",
			durationHours: "Duration",
			cooldown: "Cooldown",
			cooldownHours: "Cooldown",
			days: "Days",
			manpower: "Manpower",
			civilians: "Civilians",
			energy: "Energy",
			heat: "Heat"
		};
		return labels[key] ?? known[key] ?? goodLabel(key);
	};
	const unitOf = (key: string) =>
		TIME_KEYS.has(key)
			? key === "days"
				? "days"
				: "h"
			: PEOPLE_KEYS.has(key)
				? "civilians"
				: key === "heat"
					? "heat"
					: "";

	const requirements = $derived.by(() =>
		Object.entries(costs).map(([resource, needed]) => {
			// A balance is optional: fleet orders, for example, draw on a state
			// treasury this page does not load. Only show ✓/✗ when it is known.
			const tracked = Object.prototype.hasOwnProperty.call(available, resource);
			const availableAmount = available[resource] || 0;
			return {
				resource,
				kind: kindOf(resource),
				label: labelOf(resource),
				unit: unitOf(resource),
				tradeable: !NON_MARKET_KEYS.has(resource),
				needed,
				available: availableAmount,
				tracked,
				hasEnough: !tracked || availableAmount >= needed
			};
		})
	);

	const hasMoney = $derived(requirements.some((r) => r.kind === "money"));
</script>

{#snippet kindIcon(req: (typeof requirements)[number], cls: string)}
	{#if req.kind === "money"}
		<FluentMoney20Filled class="{cls} text-positive" />
	{:else if req.kind === "time"}
		<FluentClock20Filled class="{cls} text-fg-muted" />
	{:else if req.kind === "manpower"}
		<FluentPeople20Filled class="{cls} text-warning" />
	{:else}
		<ResourceIcon name={req.resource} class="{cls} shrink-0" />
	{/if}
{/snippet}

{#if inline}
	<ul class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label={title ?? "Cost"}>
		{#each requirements as req (req.resource)}
			<li
				class="flex items-center gap-1 font-mono tabular-nums {req.hasEnough ? 'text-fg-soft' : 'text-error'}"
				title="{req.label}{req.tracked ? ` · you have ${req.available.toLocaleString()}` : ''}"
			>
				{@render kindIcon(req, "size-3.5")}
				<span class="sr-only">{req.label}</span>
				{req.kind === "money" ? "$" : ""}{req.needed.toLocaleString()}{req.unit && req.unit !== "civilians"
					? ` ${req.unit}`
					: ""}
				{#if req.kind === "time"}<span class="font-sans text-fg-faint">{req.label.toLowerCase()}</span>{/if}
			</li>
		{/each}
	</ul>
{:else}
	<div class="space-y-2 md:space-y-3 {compact ? '!space-y-1' : ''}">
		<h4 class="text-xs font-medium text-fg-muted uppercase tracking-wide">
			{title ?? (hasMoney ? "Cost" : "Resources Required")}
		</h4>

		<div class="panel-muted rounded-sm p-2.5 space-y-1.5 {compact ? '!p-2' : ''}">
			{#each requirements as req (req.resource)}
				<div class="flex justify-between text-xs items-center">
					{#if req.tradeable}
						<a
							href="/market/{req.resource}"
							class="text-fg-muted hover:text-fg flex items-center gap-1.5 transition-colors"
						>
							{#if req.kind === "money"}
								<FluentMoney20Filled class="size-3.5 text-positive" />
							{:else if req.kind === "time"}
								<FluentClock20Filled class="size-3.5 text-fg-muted" />
							{:else if req.kind === "manpower"}
								<FluentPeople20Filled class="size-3.5 text-warning" />
							{:else}
								<ResourceIcon name={req.resource} class="size-3.5 shrink-0" />
							{/if}
							<span class="capitalize">{req.label}</span>
						</a>
					{:else}
						<span class="text-fg-muted flex items-center gap-1.5">
							{#if req.kind === "money"}
								<FluentMoney20Filled class="size-3.5 text-positive" />
							{:else if req.kind === "time"}
								<FluentClock20Filled class="size-3.5 text-fg-muted" />
							{:else if req.kind === "manpower"}
								<FluentPeople20Filled class="size-3.5 text-warning" />
							{:else}
								<ResourceIcon name={req.resource} class="size-3.5 shrink-0" />
							{/if}
							<span class="capitalize">{req.label}</span>
						</span>
					{/if}
					<span class="font-mono text-xs" class:text-fg={req.hasEnough} class:text-red-400={!req.hasEnough}>
						{req.kind === "money" ? "$" : ""}{req.needed.toLocaleString()}{req.unit ? ` ${req.unit}` : ""}
						{#if req.tracked}
							<span class="text-fg-muted/70">/ {req.available.toLocaleString()}</span>
							{#if req.hasEnough}
								<span class="text-positive ml-1">✓</span>
							{:else}
								<span class="text-red-400 ml-1">✗</span>
							{/if}
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
