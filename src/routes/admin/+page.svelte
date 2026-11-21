<script lang="ts">
	import FluentShieldLock20Filled from "~icons/fluent/shield-lock-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import { ACTION_LABELS, ACTION_TONES } from "#lib/utils/moderation.js";

	const { data } = $props();

	const sections = [
		{
			href: "/admin/users",
			icon: FluentPeople20Filled,
			title: "Users & roles",
			description: "Find a player, change their role, issue warnings or restrictions, reset flagged content."
		},
		{
			href: "/admin/flags",
			icon: FluentFlag20Filled,
			title: "Content flags",
			description: "Review and resolve pending name and logo reports from the moderation team.",
			badge: data.stats.pendingFlags
		},
		{
			href: "/moderation",
			icon: FluentShield20Filled,
			title: "Report queue",
			description: "Review incoming reports, remove content and close cases."
		},
		{
			href: "/admin/broadcast",
			icon: FluentMegaphone20Filled,
			title: "Broadcasts",
			description: "Publish or revoke a message shown across the platform."
		},
		{
			href: "/admin/giftcode",
			icon: FluentGift20Filled,
			title: "Gift codes",
			description: "Create and manage promotional codes and their rewards."
		}
	];

	const cronJobs = [
		{ href: "/api/cron/battles", label: "Battles", icon: FluentBuildingGovernment20Filled },
		{ href: "/api/cron/travels", label: "Travels", icon: FluentSend20Filled },
		{ href: "/api/cron/proposals", label: "Proposals", icon: FluentPeople20Filled },
		{ href: "/api/cron/elections", label: "Elections", icon: FluentShield20Filled }
	];

	const stats = [
		{ label: "Players", value: data.stats.users, tone: "text-fg" },
		{ label: "Moderators", value: data.stats.moderators, tone: "text-purple-300" },
		{ label: "Open reports", value: data.stats.pendingReports, tone: "text-primary-fg" },
		{ label: "Open flags", value: data.stats.pendingFlags, tone: "text-red-300" },
		{ label: "Gift codes", value: data.stats.giftCodes, tone: "text-fg" },
		{ label: "Moderation actions", value: data.stats.moderationActions, tone: "text-fg" }
	];
</script>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Admin Panel"
		subtitle="Overview, moderation tools and platform controls."
		icon={FluentShieldLock20Filled}
	>
		{#snippet actions()}
			<Badge tone="red" icon={FluentShieldLock20Filled}>Administrator</Badge>
			<Button href="/moderators" size="sm" variant="secondary" icon={FluentShield20Filled}>Moderator area</Button>
		{/snippet}
	</PageHeader>

	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
		{#each stats as stat}
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">{stat.label}</p>
				<p class="text-2xl font-bold mt-1 {stat.tone}">{stat.value}</p>
			</div>
		{/each}
	</div>

	<div>
		<h2 class="section-title mb-3">Manage</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each sections as section}
				<a href={section.href} class="panel rounded-sm p-5 hover:border-primary/40 transition-all group">
					<div class="flex items-start gap-4">
						<div class="size-11 rounded-sm panel-muted flex items-center justify-center shrink-0">
							<section.icon class="size-5 text-primary-fg" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="font-semibold text-fg group-hover:text-primary-fg transition-colors">{section.title}</h3>
								{#if section.badge}
									<Badge tone="red" size="xs">{section.badge} pending</Badge>
								{/if}
							</div>
							<p class="text-sm text-fg-muted mt-1">{section.description}</p>
						</div>
						<FluentChevronRight20Filled class="size-5 text-fg-muted shrink-0 mt-2" />
					</div>
				</a>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="panel rounded-sm p-5">
			<h2 class="section-title mb-4">Recent moderation activity</h2>
			{#if data.recentActions.length}
				<div class="space-y-3">
					{#each data.recentActions as action (action.type + action.id)}
						<a href="/moderators/actions/{action.id}" class="flex items-start gap-3 group">
							<Badge tone={ACTION_TONES[action.type] ?? "neutral"} size="xs">{ACTION_LABELS[action.type] ?? "Action"}</Badge>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-fg-soft truncate">
									{action.target?.name ?? "Deleted content"}
									<span class="text-fg-muted"> · {action.reason ?? "No reason recorded"}</span>
								</p>
								<p class="text-xs text-fg-muted">{formatDateTime(action.timestamp)}</p>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-fg-muted">No moderation actions recorded yet.</p>
			{/if}
			<Button href="/moderators/actions" size="sm" variant="ghost" class="mt-4">View full activity log →</Button>
		</div>

		<div class="panel rounded-sm p-5">
			<h2 class="section-title mb-4">Scheduled jobs</h2>
			<p class="text-sm text-fg-muted mb-4">Manually trigger a game tick when needed. Jobs also run on their normal schedule.</p>
			<div class="grid grid-cols-2 gap-2">
				{#each cronJobs as job}
					<Button href={job.href} variant="secondary" size="sm" icon={job.icon} class="justify-start">{job.label}</Button>
				{/each}
			</div>
			<div class="border-t border-line/15 my-5"></div>
			<h3 class="text-sm font-semibold text-fg-soft mb-2">Broadcast status</h3>
			{#if data.stats.activeBroadcasts > 0}
				<p class="text-sm text-primary-fg">A system broadcast is currently active.</p>
			{:else}
				<p class="text-sm text-fg-muted">No active system broadcast.</p>
			{/if}
			<Button href="/admin/broadcast" size="sm" variant="ghost" class="mt-3">Manage broadcasts →</Button>
		</div>
	</div>
</PageContainer>
