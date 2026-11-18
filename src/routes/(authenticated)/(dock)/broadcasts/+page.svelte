<!-- src/routes/(authenticated)/(dock)/broadcasts/+page.svelte -->
<script lang="ts">
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import { formatDateTime } from "#lib/utils/formatting.js";

	const { data } = $props();

	const typeMeta = {
		system: {
			label: "System Broadcast",
			icon: FluentMegaphone20Filled,
			accent: "border-red-500",
			text: "text-red-300"
		},
		state: {
			label: "State Broadcast",
			icon: FluentBuildingGovernment20Filled,
			accent: "border-politics",
			text: "text-politics-fg"
		},
		party: { label: "Party Broadcast", icon: FluentPeople20Filled, accent: "border-positive", text: "text-positive-fg" },
		bloc: { label: "Bloc Broadcast", icon: FluentFlag20Filled, accent: "border-friendly", text: "text-friendly-fg" }
	} as const;
</script>

<PageContainer maxWidth="3xl">
	<PageHeader
		title="Broadcast History"
		icon={FluentMegaphone20Filled}
		subtitle="Past orders from your chain of command"
	/>

	{#if data.broadcasts.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<FluentMegaphone20Filled class="size-12 text-fg-muted mx-auto mb-3" />
			<p class="text-fg-muted">No broadcasts yet</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.broadcasts as broadcast (broadcast.id)}
				{@const meta = typeMeta[broadcast.broadcastType]}
				<div
					class="relative overflow-hidden rounded-sm border-l-4 {meta.accent} bg-surface-2 p-5 {broadcast.isActive
						? ''
						: 'opacity-70'}"
				>
					<div class="flex items-center justify-between gap-3 mb-2">
						<div class="flex items-center gap-2">
							<meta.icon class="size-4 {meta.text}" />
							<span class="text-[10px] font-bold {meta.text} uppercase tracking-[0.2em]">
								{meta.label}{broadcast.scopeName ? ` — ${broadcast.scopeName}` : ""}
							</span>
						</div>
						{#if broadcast.isActive}
							<Badge tone="amber">Active</Badge>
						{:else}
							<Badge tone="neutral">Revoked</Badge>
						{/if}
					</div>
					<h3 class="text-fg font-bold uppercase tracking-wide">{broadcast.title}</h3>
					<p class="text-fg-soft text-sm whitespace-pre-wrap mt-1">{broadcast.content}</p>
					<p class="text-xs font-mono text-fg-muted mt-2">
						FROM: {broadcast.issuerName || "Unknown"} · {formatDateTime(broadcast.createdAt)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</PageContainer>
