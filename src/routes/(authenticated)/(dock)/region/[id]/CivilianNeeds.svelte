<!-- src/routes/(authenticated)/(dock)/region/[id]/CivilianNeeds.svelte -->
<!-- The four things a region's civilians cannot live without. Shortages are
     shown as a share of demand met; hardship is what the government answers
     for in opinion, stability and, in the worst case, its population. -->
<script lang="ts">
	import SectionCard from "#lib/component/SectionCard.svelte";
	import { Badge } from "#lib/component/ui/index.js";

	interface Supply {
		key: string;
		label: string;
		icon: string;
		demand: number;
		capacity: number;
		sufficiency: number;
	}

	interface Props {
		needs: {
			hardship: number;
			shortages: string[];
			reasons: string[];
			supplies: Supply[];
		} | null;
	}

	let { needs }: Props = $props();

	const tone = (s: number) => (s >= 0.85 ? "text-positive" : s >= 0.5 ? "text-amber-300" : "text-red-300");
	const bar = (s: number) => (s >= 0.85 ? "bg-positive" : s >= 0.5 ? "bg-amber-400" : "bg-red-400");
</script>

{#if needs}
	<SectionCard>
		<div class="mb-3 flex items-center justify-between gap-2">
			<h2 class="section-title">Civilian supply</h2>
			<Badge tone={needs.hardship > 0.4 ? "red" : needs.hardship > 0.15 ? "amber" : "green"} size="xs">
				{Math.round(needs.hardship * 100)}% hardship
			</Badge>
		</div>

		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each needs.supplies as supply (supply.key)}
				{@const pct = Math.round(supply.sufficiency * 100)}
				<div class="panel-muted rounded-sm p-2.5">
					<div class="flex items-center gap-1.5">
						<span class="text-sm" aria-hidden="true">{supply.icon}</span>
						<span class="text-[10px] uppercase tracking-wide text-fg-muted">{supply.label}</span>
					</div>
					<p class="mt-1 font-mono text-sm font-bold {tone(supply.sufficiency)}">{pct}%</p>
					<div class="mt-1 h-1 overflow-hidden rounded-full bg-line/20">
						<div class="h-full rounded-full {bar(supply.sufficiency)}" style="width: {pct}%"></div>
					</div>
				</div>
			{/each}
		</div>

		{#if needs.reasons.length}
			<ul class="mt-3 space-y-1">
				{#each needs.reasons as reason}
					<li class="text-xs text-amber-300/90">— {reason}</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-3 text-xs text-fg-muted">Households here have enough of all four basics.</p>
		{/if}
	</SectionCard>
{/if}
