<!-- src/routes/(authenticated)/(dock)/ops/OpsLedger.svelte -->
<!-- The operations ledger as a timeline: ours (→ target) and those against
     us (← origin, named only once attributed). Each entry is an icon on the
     rail, coloured by outcome, with its result chips. Shows the latest
     entries and expands on demand. -->
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

	const dot = (o: Row) =>
		!o.succeeded
			? "border-line/30 bg-surface-4 text-fg-muted"
			: o.ours
				? "border-positive/50 bg-positive/15 text-positive-fg"
				: "border-hostile/50 bg-hostile/15 text-hostile-fg";
</script>

{#if rows.length}
	<ol class="relative">
		{#each shown as o, i (`${o.ours}-${o.id}`)}
			{@const Icon = OP_ICON[o.kind]}
			<li class="relative flex gap-3 pb-3 last:pb-0">
				{#if i < shown.length - 1}
					<span class="absolute top-8 bottom-0 left-[15px] w-px bg-line/20" aria-hidden="true"></span>
				{/if}
				<span class="relative grid size-8 shrink-0 place-items-center rounded-full border {dot(o)}">
					<Icon class="size-4" />
				</span>
				<div class="min-w-0 flex-1 pt-0.5">
					<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span class="text-sm font-medium text-fg">{COVERT_OPS[o.kind].label}</span>
						{#if o.self}
							<span class="text-xs text-fg-muted">home front</span>
						{:else if o.ours}
							<span class="text-xs text-fg-soft">→ {o.other}</span>
						{:else}
							<span class="text-xs text-hostile-fg">← {o.other ?? "unknown origin"}</span>
						{/if}
						<span class="ml-auto flex flex-wrap items-center gap-1">
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
						</span>
					</div>
					<p class="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-fg-muted">
						<span class="data shrink-0">{dtg(o.launchedAt)}</span>
						<span class="data hidden shrink-0 text-fg-faint sm:inline" title="Success / attribution odds">
							{o.successChance}% · {o.attributionChance}%
						</span>
						{#if o.region}<span class="truncate">{o.region}</span>{/if}
						{#if o.amount}<span class="data shrink-0 text-fg-soft">${o.amount.toLocaleString()} taken</span>{/if}
						{#if o.message}<span class="truncate italic" title={o.message}>“{o.message}”</span>{/if}
					</p>
				</div>
			</li>
		{/each}
	</ol>
	{#if rows.length > LIMIT}
		<button
			type="button"
			class="mt-3 text-xs text-fg-muted hover:text-primary-fg"
			onclick={() => (expanded = !expanded)}
		>
			{expanded ? "Show latest only" : `Show all ${rows.length} entries`}
		</button>
	{/if}
{:else}
	<p class="py-3 text-sm text-fg-muted">No operations on record yet.</p>
{/if}
