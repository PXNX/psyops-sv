<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	const areas = [
		{
			href: "/moderation",
			icon: FluentShield20Filled,
			title: "Review queue",
			description: "Handle incoming reports: remove content or close a case.",
			badge: data.stats.pendingReports
		},
		{
			href: "/moderators/actions",
			icon: FluentEye20Filled,
			title: "Activity log",
			description: "A public, searchable record of every moderation action.",
			badge: data.stats.actions
		},
		{
			href: "/moderators/reports",
			icon: FluentDocument20Filled,
			title: "My reports",
			description: "Track the reports you filed and see their outcomes.",
			badge: 0
		},
		{
			href: "/my-moderation",
			icon: FluentHistory20Filled,
			title: "My record",
			description: "Every moderation action taken against your account.",
			badge: 0
		}
	];
</script>

<svelte:head><title>Moderators - PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<PageHeader documentTitle={false} title="Moderator area" subtitle="Review reports, inspect activity and see your own record.">
		{#snippet actions()}
			<Button href="/chat" variant="secondary" size="sm" icon={FluentShield20Filled}>Back to chat</Button>
		{/snippet}
	</PageHeader>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Team members</p>
			<p class="text-2xl font-bold text-politics-fg mt-1">{data.moderators.length}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Pending reports</p>
			<p class="text-2xl font-bold text-primary-fg mt-1">{data.stats.pendingReports}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Open flags</p>
			<p class="text-2xl font-bold text-red-300 mt-1">{data.stats.pendingFlags}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Recorded actions</p>
			<p class="text-2xl font-bold mt-1">{data.stats.actions}</p>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		{#each areas as area}
			<a href={area.href} class="panel rounded-sm p-5 hover:border-primary/40 transition-all group">
				<div class="flex items-start gap-4">
					<div class="size-11 rounded-sm panel-muted flex items-center justify-center shrink-0">
						<area.icon class="size-5 text-primary-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<h2 class="font-semibold text-fg group-hover:text-primary-fg transition-colors">{area.title}</h2>
							{#if area.badge > 0}
								<Badge tone={area.title === "Open flags" ? "red" : "neutral"} size="xs">{area.badge}</Badge>
							{/if}
						</div>
						<p class="text-sm text-fg-muted mt-1">{area.description}</p>
					</div>
					<FluentChevronRight20Filled class="size-5 text-fg-muted shrink-0 mt-2" />
				</div>
			</a>
		{/each}
	</div>

	<div>
		<h2 class="section-title mb-3">Moderation team</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.moderators as moderator}
				<div class="panel rounded-sm p-5 hover:border-politics/40 transition-all">
					<div class="flex items-start gap-4">
						<div class="flex-1 min-w-0">
							<UserLink id={moderator.id} name={moderator.name} avatar={moderator.logoUrl} size="md" />
							<div class="mt-1">
								{#if moderator.role === "admin"}
									<Badge tone="red" icon={FluentShield20Filled}>Administrator</Badge>
								{:else}
									<Badge tone="purple" icon={FluentShield20Filled}>Moderator</Badge>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-xs text-fg-muted mt-2">
								<FluentCalendar20Filled class="size-3" />
								<span>Since {formatDate(moderator.memberSince)}</span>
							</div>
							<a
								href="/moderators/actions?userId={moderator.id}"
								class="inline-flex items-center gap-1 text-xs text-primary-fg hover:underline mt-3"
							>
								<FluentFlag20Filled class="size-3" /> View their actions
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if data.moderators.length === 0}
			<EmptyState
				icon={FluentShield20Filled}
				title="No Moderators Yet"
				subtitle="There are currently no moderators assigned to the platform."
			/>
		{/if}
	</div>
</PageContainer>
