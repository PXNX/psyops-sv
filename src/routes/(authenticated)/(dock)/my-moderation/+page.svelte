<script lang="ts">
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import { ACTION_LABELS, ACTION_TONES } from "#lib/utils/moderation.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	let activeType = $state<string>("all");

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

	const filters = [
		{ value: "all", label: "All activity", count: data.actions.length },
		{ value: "message_delete", label: "Removed messages", count: data.counts.message_delete },
		{ value: "warning", label: "Warnings", count: data.counts.warning },
		{ value: "restriction", label: "Restrictions", count: data.counts.restriction },
		{ value: "report_action", label: "Report outcomes", count: data.counts.report_action },
		{ value: "content_flag", label: "Content flags", count: data.counts.content_flag }
	];

	const visibleActions = $derived(activeType === "all" ? data.actions : data.actions.filter((a) => a.type === activeType));
</script>

<svelte:head><title>My Moderation Record - PsyOps</title></svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader
		title="My moderation record"
		subtitle="Every moderation action taken on your account, with the reason and moderator responsible."
		icon={FluentShield20Filled}
	>
		{#snippet actions()}
			<Button href="/moderators/actions?userId={data.currentUserId}" size="sm" variant="secondary" icon={FluentShield20Filled}>
				Public log
			</Button>
			<Button href="/moderators/reports" size="sm" variant="ghost" icon={FluentDocument20Filled}>My reports</Button>
		{/snippet}
	</PageHeader>

	<div class="bg-friendly-bg/18 border border-friendly/30 text-friendly-fg rounded-sm p-4 flex items-start gap-3">
		<FluentInfo20Filled class="size-5 text-friendly shrink-0 mt-0.5" />
		<p class="text-sm">
			Moderation is open by design. Each action below shows who took it, why, and any note the moderator left.
			You also receive an inbox message whenever action is taken on your account.
		</p>
	</div>

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Warnings</p>
			<p class="text-2xl font-bold text-fg mt-1">{data.warningCount}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Chat status</p>
			<p class="mt-1">
				{#if data.restriction?.active}
					<Badge tone="red" icon={FluentDismissCircle20Filled}>Restricted</Badge>
				{:else}
					<Badge tone="green" icon={FluentCheckmark20Filled}>In good standing</Badge>
				{/if}
			</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Actions on record</p>
			<p class="text-2xl font-bold text-fg mt-1">{data.actions.length}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Reports filed</p>
			<p class="text-2xl font-bold text-fg mt-1">{data.reportsFiled}</p>
		</div>
	</div>

	{#if data.restriction?.active}
		<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4 flex items-start gap-3">
			<FluentClock20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
			<div>
				<p class="font-semibold text-red-300">Active chat restriction</p>
				<p class="text-sm text-fg-soft mt-1">{data.restriction.reason}</p>
				{#if !data.restriction.isPermanent && data.restriction.expiresAt}
					<p class="text-xs text-fg-muted mt-1">Ends {formatDateTime(data.restriction.expiresAt)}</p>
				{:else if data.restriction.isPermanent}
					<p class="text-xs text-fg-muted mt-1">This restriction is permanent.</p>
				{/if}
			</div>
		</div>
	{/if}

	<div class="flex flex-wrap gap-2">
		{#each filters as filter}
			<Button size="sm" variant={activeType === filter.value ? "soft-amber" : "subtle"} onclick={() => (activeType = filter.value)}>
				{filter.label} ({filter.count})
			</Button>
		{/each}
	</div>

	<div class="space-y-3">
		{#each visibleActions as action (action.type + action.id)}
			{@const ActionIcon = getActionIcon(action.type)}
			<div class="panel rounded-sm p-5">
				<div class="flex items-start gap-4">
					<div class="size-12 rounded-sm flex items-center justify-center panel-muted shrink-0">
						<ActionIcon class="size-6 text-primary-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3 flex-wrap mb-3">
							<Badge tone={ACTION_TONES[action.type] ?? "neutral"}>{ACTION_LABELS[action.type] ?? "Action"}</Badge>
							<span class="text-xs text-fg-muted">{formatDateTime(action.timestamp)}</span>
						</div>
						{#if action.moderator}
							<div class="flex items-center gap-2 mb-3">
								<span class="text-xs text-fg-muted">Handled by</span>
								<UserLink id={action.moderator.id} name={action.moderator.name} avatar={action.moderator.logoUrl} size="xs" />
								{#if action.moderator.role === "admin"}
									<Badge tone="red" size="xs">Admin</Badge>
								{:else if action.moderator.role === "moderator"}
									<Badge tone="purple" size="xs">Mod</Badge>
								{/if}
							</div>
						{/if}
						{#if action.reason || action.note}
							<div class="panel-muted rounded-sm p-3 space-y-2">
								{#if action.reason}
									<div><span class="text-xs text-fg-muted">Reason:</span> <span class="text-sm text-fg-soft ml-2">{action.reason}</span></div>
								{/if}
								{#if action.note}
									<div><span class="text-xs text-fg-muted">Note:</span> <p class="text-sm text-fg-soft mt-1 whitespace-pre-wrap">{action.note}</p></div>
								{/if}
							</div>
						{/if}
						<a href="/moderators/actions/{action.id}" class="text-xs text-primary-fg hover:underline inline-block mt-3">
							View full details →
						</a>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if visibleActions.length === 0}
		<EmptyState
			icon={FluentCheckmark20Filled}
			title="Nothing on your record"
			subtitle="No moderation actions of this type have been taken against your account."
		/>
	{/if}
</PageContainer>
