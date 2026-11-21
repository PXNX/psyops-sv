<script lang="ts">
	import UserLink from "#lib/component/UserLink.svelte";
	import { goto } from "$app/navigation";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import { ACTION_LABELS, ACTION_TONES } from "#lib/utils/moderation.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	let search = $state("");

	function getActionIcon(type: string) {
		switch (type) {
			case "message_delete":
				return FluentDelete20Filled;
			case "warning":
				return FluentWarning20Filled;
			case "restriction":
				return FluentDismissCircle20Filled;
			case "report_action":
				return FluentDocument20Filled;
			case "content_flag":
				return FluentFlag20Filled;
			default:
				return FluentShield20Filled;
		}
	}

	function toggleUserFilter() {
		const target = isFilteringCurrentUser ? null : data.currentUserId;
		updateQuery({ userId: target });
	}

	function updateQuery(changes: { userId?: string | null; type?: string | null }) {
		const params = new URLSearchParams();
		const userId = "userId" in changes ? changes.userId : data.filterUserId;
		const type = "type" in changes ? changes.type : data.filterType;
		if (userId) params.set("userId", userId);
		if (type) params.set("type", type);
		const query = params.toString();
		goto(`/moderators/actions${query ? `?${query}` : ""}`);
	}

	const isFilteringCurrentUser = $derived(!!data.currentUserId && data.filterUserId === data.currentUserId);

	const types = $derived([
		{ value: null, label: "All types", count: data.total },
		{ value: "message_delete", label: "Message removals", count: data.counts.message_delete },
		{ value: "warning", label: "Warnings", count: data.counts.warning },
		{ value: "restriction", label: "Restrictions", count: data.counts.restriction },
		{ value: "report_action", label: "Report resolutions", count: data.counts.report_action },
		{ value: "content_flag", label: "Content flags", count: data.counts.content_flag }
	]);

	const filteredActions = $derived.by(() => {
		const term = search.trim().toLowerCase();
		if (!term) return data.actions;
		return data.actions.filter((action) =>
			[
				action.target?.name,
				action.moderator?.name,
				action.reason,
				action.note,
				ACTION_LABELS[action.type]
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(term)
		);
	});
</script>

<svelte:head><title>Moderation Activity - PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Moderation Activity"
		subtitle="A public, searchable record of every moderation action — who acted, who was affected and why."
		icon={FluentShield20Filled}
	>
		{#snippet actions()}
			{#if data.currentUserId}
				<Button
					size="sm"
					variant={isFilteringCurrentUser ? "primary" : "ghost"}
					icon={FluentFilter20Filled}
					onclick={toggleUserFilter}
				>
					{isFilteringCurrentUser ? "Show all users" : "Against me"}
				</Button>
			{/if}
			<Button href="/my-moderation" size="sm" variant="secondary" icon={FluentDocument20Filled}>My record</Button>
			<Button href="/moderators" size="sm" variant="ghost" icon={FluentPeople20Filled}>Moderators</Button>
		{/snippet}
	</PageHeader>

	{#if data.filterUserId}
		<div class="bg-friendly-bg/18 border border-friendly/30 text-friendly-fg rounded-sm p-4 flex flex-wrap items-center gap-3">
			<FluentFilter20Filled class="size-5 text-friendly shrink-0" />
			<div class="flex-1 min-w-0">
				<p class="font-semibold">Filtered view</p>
				<p class="text-sm">
					{isFilteringCurrentUser ? "Showing actions against your account only" : "Showing actions for one user only"}
				</p>
			</div>
			<Button size="sm" variant="ghost" icon={FluentDismissCircle20Filled} onclick={() => updateQuery({ userId: null })}>
				Clear filter
			</Button>
		</div>
	{/if}

	<!-- At-a-glance totals -->
	<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
		{#each types.slice(0, 5) as item}
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">{item.label}</p>
				<p class="text-2xl font-bold text-fg mt-1">{item.count ?? 0}</p>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-2">
		{#each types as item}
			<Button
				size="sm"
				variant={data.filterType === item.value ? "soft-amber" : "subtle"}
				onclick={() => updateQuery({ type: item.value })}
			>
				{item.label} <span class="opacity-60">({item.count ?? 0})</span>
			</Button>
		{/each}
		<div class="relative ml-auto w-full sm:w-64">
			<FluentSearch20Filled class="size-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
			<input
				type="search"
				bind:value={search}
				placeholder="Search name, reason, note…"
				class="field-control rounded-sm pl-9 pr-3 py-2 w-full text-sm"
			/>
		</div>
	</div>

	<!-- Actions list -->
	<div class="space-y-3">
		{#each filteredActions as action (action.type + action.id)}
			{@const ActionIcon = getActionIcon(action.type)}
			<a
				href="/moderators/actions/{action.id}"
				class="panel rounded-sm p-5 hover:border-primary/40 transition-all block"
			>
				<div class="flex items-start gap-4">
					<div class="shrink-0 size-12 rounded-sm flex items-center justify-center panel-muted">
						<ActionIcon class="size-6 {ACTION_TONES[action.type] === 'red' ? 'text-red-400' : ACTION_TONES[action.type] === 'green' ? 'text-positive' : 'text-primary-fg'}" />
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3 mb-3 flex-wrap">
							<Badge tone={ACTION_TONES[action.type] ?? "neutral"}>{ACTION_LABELS[action.type] ?? "Action"}</Badge>
							<div class="flex items-center gap-1 text-xs text-fg-muted">
								<FluentCalendar20Filled class="size-3" />
								<span>{formatDateTime(action.timestamp)}</span>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
							<div class="flex items-center gap-3">
								<span class="text-xs text-fg-muted font-medium min-w-[64px]">Target:</span>
								{#if action.target}
									<UserLink id={action.target.id} name={action.target.name} avatar={action.target.logoUrl} />
								{:else}
									<span class="text-sm text-fg-soft">Deleted content / unavailable account</span>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<span class="text-xs text-fg-muted font-medium min-w-[64px]">By:</span>
								{#if action.moderator}
									<UserLink id={action.moderator.id} name={action.moderator.name} avatar={action.moderator.logoUrl} />
									{#if action.moderator.role === "admin"}
										<Badge tone="red" size="xs">Admin</Badge>
									{:else if action.moderator.role === "moderator"}
										<Badge tone="purple" size="xs">Mod</Badge>
									{/if}
								{:else}
									<span class="text-sm text-fg-soft">Unknown</span>
								{/if}
							</div>
						</div>

						{#if action.reason || action.note}
							<div class="panel-muted rounded-sm p-3 space-y-2">
								{#if action.reason}
									<div><span class="text-xs text-fg-muted font-medium">Reason:</span> <span class="text-sm text-fg-soft ml-2">{action.reason}</span></div>
								{/if}
								{#if action.note}
									<div><span class="text-xs text-fg-muted font-medium">Details:</span> <p class="text-sm text-fg-soft mt-1 whitespace-pre-wrap">{action.note}</p></div>
								{/if}
							</div>
						{/if}
					</div>
					<FluentChevronRight20Filled class="size-5 text-fg-muted shrink-0 mt-4" />
				</div>
			</a>
		{/each}
	</div>

	{#if filteredActions.length === 0}
		<EmptyState
			icon={FluentShield20Filled}
			title="No actions found"
			subtitle={search || data.filterType || data.filterUserId
				? "Try a different filter or clear your search."
				: "No moderation actions have been recorded yet."}
		/>
	{/if}
</PageContainer>
