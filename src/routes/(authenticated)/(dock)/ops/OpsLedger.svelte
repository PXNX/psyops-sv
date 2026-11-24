<!-- src/routes/(authenticated)/(dock)/ops/OpsLedger.svelte -->
<!-- The operations ledger as one compact table: ours (→ target) and those
     against us (← origin, named only once attributed). Shows the latest
     rows and expands on demand. -->
<script lang="ts">
	import { Badge } from "#lib/component/ui/index.js";
	import { COVERT_OPS } from "#lib/config/index.js";
	import { dtg } from "#lib/utils/military.js";
	import { OP_ICON } from "./opIcons.js";
	import type { PageData } from "./$types";

	type Row = PageData["ledger"][number];
	const { rows }: { rows: Row[] } = $props();

	const LIMIT = 8;
	let expanded = $state(false);
	const shown = $derived(expanded ? rows : rows.slice(0, LIMIT));
</script>

{#if rows.length}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="text-left text-[11px] tracking-[0.12em] text-fg-muted uppercase">
					<th class="py-2 pr-3 font-semibold">When</th>
					<th class="py-2 pr-3 font-semibold">Operation</th>
					<th class="py-2 pr-3 font-semibold">Target / origin</th>
					<th class="hidden py-2 pr-3 text-right font-semibold sm:table-cell" title="Success / attribution odds">
						Odds
					</th>
					<th class="py-2 font-semibold">Outcome</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line/15">
				{#each shown as o (`${o.ours}-${o.id}`)}
					{@const Icon = OP_ICON[o.kind]}
					<tr class="align-top">
						<td class="data py-2 pr-3 text-xs whitespace-nowrap text-fg-muted">{dtg(o.launchedAt)}</td>
						<td class="py-2 pr-3">
							<span class="flex items-center gap-1.5 text-fg">
								<Icon class="size-4 shrink-0 {o.ours ? 'text-primary-fg' : 'text-hostile-fg'}" />
								<span class="truncate">{COVERT_OPS[o.kind].label}</span>
							</span>
							{#if o.region || o.amount || o.message}
								<p class="mt-0.5 max-w-xs truncate pl-5.5 text-xs text-fg-muted">
									{#if o.region}{o.region}{/if}
									{#if o.amount}<span class="data text-fg-soft">${o.amount.toLocaleString()} taken</span>{/if}
									{#if o.message}<span class="italic" title={o.message}>“{o.message}”</span>{/if}
								</p>
							{/if}
						</td>
						<td class="py-2 pr-3 text-xs whitespace-nowrap">
							{#if o.self}
								<span class="text-fg-muted">Home front</span>
							{:else if o.ours}
								<span class="text-fg-soft">→ {o.other}</span>
							{:else}
								<span class="text-hostile-fg">← {o.other ?? "Unknown origin"}</span>
							{/if}
						</td>
						<td class="data hidden py-2 pr-3 text-right text-xs text-fg-soft sm:table-cell">
							{o.successChance}% / {o.attributionChance}%
						</td>
						<td class="py-2">
							<div class="flex flex-wrap gap-1">
								<Badge size="xs" tone={o.succeeded ? (o.ours ? "green" : "red") : "neutral"}>
									{o.succeeded ? "Success" : o.ours ? "Failed" : "Thwarted"}
								</Badge>
								{#if o.ours && !o.self}
									{#if o.attributed}<Badge size="xs" tone="orange">Traced</Badge>
									{:else if o.detected}<Badge size="xs" tone="amber">Noticed</Badge>
									{:else}<Badge size="xs" tone="neutral">Unseen</Badge>{/if}
								{:else if !o.ours && o.attributed}
									<Badge size="xs" tone="orange">Attributed</Badge>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if rows.length > LIMIT}
		<button
			type="button"
			class="mt-2 text-xs text-fg-muted hover:text-primary-fg"
			onclick={() => (expanded = !expanded)}
		>
			{expanded ? "Show latest only" : `Show all ${rows.length} entries`}
		</button>
	{/if}
{:else}
	<p class="py-3 text-sm text-fg-muted">No operations on record yet.</p>
{/if}
