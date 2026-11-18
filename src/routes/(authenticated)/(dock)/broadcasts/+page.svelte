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
			accent: "border-[#b9a1ff]",
			text: "text-[#e6dcff]"
		},
		party: { label: "Party Broadcast", icon: FluentPeople20Filled, accent: "border-[#4fd88a]", text: "text-[#aef3c9]" },
		bloc: { label: "Bloc Broadcast", icon: FluentFlag20Filled, accent: "border-[#6aa8ff]", text: "text-[#c3dbff]" }
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
			<FluentMegaphone20Filled class="size-12 text-[#8e9abb] mx-auto mb-3" />
			<p class="text-[#8e9abb]">No broadcasts yet</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.broadcasts as broadcast (broadcast.id)}
				{@const meta = typeMeta[broadcast.broadcastType]}
				<div
					class="relative overflow-hidden rounded-sm border-l-4 {meta.accent} bg-[#0f1628] p-5 {broadcast.isActive
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
					<h3 class="text-[#eef2ff] font-bold uppercase tracking-wide">{broadcast.title}</h3>
					<p class="text-[#c2cbe3] text-sm whitespace-pre-wrap mt-1">{broadcast.content}</p>
					<p class="text-xs font-mono text-[#8e9abb] mt-2">
						FROM: {broadcast.issuerName || "Unknown"} · {formatDateTime(broadcast.createdAt)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</PageContainer>
