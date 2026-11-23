<!-- A dated timeline shared by state, bloc and party history pages. -->
<script lang="ts">
	import type { HistoryEntry } from "#lib/server/services/military/history.js";
	import { Badge } from "#lib/component/ui/index.js";
	import UserLink from "#lib/component/UserLink.svelte";

	let { entries }: { entries: HistoryEntry[] } = $props();

	const tone: Record<HistoryEntry["tone"], string> = {
		neutral: "neutral",
		blue: "blue",
		green: "green",
		red: "red",
		amber: "amber"
	};
	const dot: Record<HistoryEntry["tone"], string> = {
		neutral: "bg-surface-9",
		blue: "bg-primary",
		green: "bg-positive",
		red: "bg-error",
		amber: "bg-warning"
	};
	const format = (d: Date) => new Date(d).toLocaleDateString();
</script>

{#if entries.length === 0}
	<p class="py-6 text-center text-sm text-fg-muted">Nothing in the record yet.</p>
{:else}
	<ol class="relative ml-2 border-l border-line/20">
		{#each entries as entry, i (entry.id)}
			<li class="soft-lift animate-soft-in relative mb-3 ml-5 rounded-sm border border-line/15 bg-surface-1 p-3" style="--rise-delay: {Math.min(i, 8) * 30}ms">
				<span class="absolute -left-[27px] top-4 size-3 rounded-full ring-4 ring-surface-0 {dot[entry.tone]}"></span>
				<div class="flex flex-wrap items-center gap-2">
					<time class="font-mono text-[11px] text-fg-faint" datetime={new Date(entry.at).toISOString()}>{format(entry.at)}</time>
					<Badge tone={tone[entry.tone]} size="xs">{entry.kind}</Badge>
				</div>
				<div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
					{#if entry.person}
						<UserLink id={entry.person.id} name={entry.person.name} size="xs" plain />
					{/if}
					<span class="font-medium text-heading">{entry.title}</span>
				</div>
				{#if entry.detail}
					<p class="mt-1 text-xs text-fg-muted">{entry.detail}</p>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
