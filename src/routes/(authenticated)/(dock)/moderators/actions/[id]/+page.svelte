<!-- src/routes/moderators/actions/[id]/+page.svelte -->
<script lang="ts">
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import { formatDate } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

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

	function getActionColor(type: string) {
		switch (type) {
			case "message_delete":
				return "bg-red-600/10 border-red-500/30 text-red-300";
			case "warning":
				return "bg-accent/12 border-accent/35 text-accent-fg";
			case "restriction":
				return "bg-red-600/10 border-red-500/30 text-red-300";
			case "report_action":
				return "bg-friendly-bg/18 border-friendly/30 text-friendly-fg";
			case "content_flag":
				return "bg-accent/12 border-accent/35 text-accent-fg";
			default:
				return "bg-surface-4/70 border-line/15 text-fg-soft";
		}
	}

	function getActionTitle(type: string) {
		switch (type) {
			case "message_delete":
				return "Message Deletion";
			case "warning":
				return "User Warning";
			case "restriction":
				return "Chat Restriction";
			case "report_action":
				return "Report Resolution";
			case "content_flag":
				return "Content Flag";
			default:
				return "Moderation Action";
		}
	}

	const ActionIcon = $derived(getActionIcon(data.action.type));
</script>

<svelte:head>
	<title>Action #{data.action.id} - Moderator Actions</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Header -->
	<PageHeader
		documentTitle={false}
		title="Action #{data.action.id}"
		backHref="/moderators/actions"
		backLabel="Moderator Actions"
	/>

	<!-- Action Card -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-4">
			<div
				class="size-16 rounded-sm border flex items-center justify-center shrink-0 {getActionColor(data.action.type)}"
			>
				<ActionIcon class="size-8" />
			</div>
			<div class="flex-1 min-w-0">
				<h2 class="text-3xl font-bold text-fg">{getActionTitle(data.action.type)}</h2>
			</div>
		</div>
	</div>

	<!-- Participants Section -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Target User -->
		{#if data.action.target}
			<div class="panel rounded-sm p-5">
				<h3 class="text-[10px] text-fg-muted uppercase tracking-wide mb-3">Target User</h3>
				<UserLink
					id={data.action.target.id}
					name={data.action.target.name}
					avatar={data.action.target.logoUrl}
					size="md"
				/>
			</div>
		{/if}

		<!-- Moderator -->
		{#if data.action.moderator}
			<div class="panel rounded-sm p-5 border-politics/30">
				<h3 class="text-[10px] text-fg-muted uppercase tracking-wide mb-3">
					{data.action.type === "report_action" ? "Reviewed By" : "Moderator"}
				</h3>
				<div class="flex items-center gap-2 flex-wrap">
					<UserLink
						id={data.action.moderator.id}
						name={data.action.moderator.name}
						avatar={data.action.moderator.logoUrl}
						size="md"
					/>
					{#if data.action.moderator.role === "admin"}
						<Badge tone="red" size="xs">Admin</Badge>
					{:else if data.action.moderator.role === "moderator"}
						<Badge tone="purple" size="xs">Moderator</Badge>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Reporter (for report actions) -->
		{#if data.action.type === "report_action" && data.action.reporter}
			<div class="panel rounded-sm p-5">
				<h3 class="text-[10px] text-fg-muted uppercase tracking-wide mb-3">Reported By</h3>
				<UserLink
					id={data.action.reporter.id}
					name={data.action.reporter.name}
					avatar={data.action.reporter.logoUrl}
					size="md"
					subtitle="Original reporter"
				/>
			</div>
		{/if}
	</div>

	<!-- Action Details -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentInfo20Filled class="size-5 text-accent-fg" />
			Action Details
		</h2>

		<div class="space-y-4">
			<!-- Message Delete Details -->
			{#if data.action.type === "message_delete"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-fg-muted" />
						<span class="text-fg-muted">Message sent:</span>
						<span class="text-fg">{formatDate(data.action.sentAt)}</span>
					</div>
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-red-400" />
						<span class="text-fg-muted">Deleted:</span>
						<span class="text-fg">{formatDate(data.action.deletedAt)}</span>
					</div>
					<div class="border-t border-line/15"></div>
					<div>
						<p class="text-sm text-fg-muted mb-2">Message Content:</p>
						<div class="panel-muted rounded-sm p-4">
							<p class="text-fg">{data.action.messageContent}</p>
						</div>
					</div>
					{#if data.action.deletionReason}
						<div>
							<p class="text-sm text-fg-muted mb-2">Deletion Reason:</p>
							<Badge tone="red">{data.action.deletionReason}</Badge>
						</div>
					{/if}
					{#if data.action.deletionNote}
						<div>
							<p class="text-sm text-fg-muted mb-2">Moderator Note:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.deletionNote}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Warning Details -->
			{#if data.action.type === "warning"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-accent-fg" />
						<span class="text-fg-muted">Issued:</span>
						<span class="text-fg">{formatDate(data.action.issuedAt)}</span>
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-fg-muted mb-2">Violation Type:</p>
							<Badge tone="amber">{data.action.reason}</Badge>
						</div>
					{/if}
					{#if data.action.description}
						<div>
							<p class="text-sm text-fg-muted mb-2">Description:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.description}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Restriction Details -->
			{#if data.action.type === "restriction"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-red-400" />
						<span class="text-fg-muted">Restricted:</span>
						<span class="text-fg">{formatDate(data.action.restrictedAt)}</span>
					</div>
					<div>
						<p class="text-sm text-fg-muted mb-2">Duration:</p>
						{#if data.action.isPermanent}
							<Badge tone="red" icon={FluentWarning20Filled}>Permanent</Badge>
						{:else if data.action.expiresAt}
							<Badge tone="amber" icon={FluentClock20Filled}>Until {formatDate(data.action.expiresAt)}</Badge>
						{/if}
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-fg-muted mb-2">Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.reason}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Report Action Details -->
			{#if data.action.type === "report_action"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-friendly" />
						<span class="text-fg-muted">Reported:</span>
						<span class="text-fg">{formatDate(data.action.reportedAt)}</span>
					</div>
					{#if data.action.reviewedAt}
						<div class="flex items-center gap-2 text-sm">
							<FluentCalendar20Filled class="size-4 text-positive" />
							<span class="text-fg-muted">Reviewed:</span>
							<span class="text-fg">{formatDate(data.action.reviewedAt)}</span>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<p class="text-sm text-fg-muted">Status:</p>
						{#if data.action.status === "pending"}
							<Badge tone="amber">Pending</Badge>
						{:else if data.action.status === "resolved"}
							<Badge tone="green" icon={FluentCheckmark20Filled}>Resolved</Badge>
						{:else if data.action.status === "dismissed"}
							<Badge tone="neutral">Dismissed</Badge>
						{/if}
					</div>
					{#if data.action.violationType}
						<div>
							<p class="text-sm text-fg-muted mb-2">Violation Type:</p>
							<Badge tone="red">{data.action.violationType}</Badge>
						</div>
					{/if}
					{#if data.action.reportReason}
						<div>
							<p class="text-sm text-fg-muted mb-2">Report Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.reportReason}</p>
							</div>
						</div>
					{/if}
					{#if data.action.actionTaken}
						<div>
							<p class="text-sm text-fg-muted mb-2">Action Taken:</p>
							<Badge tone="green">{data.action.actionTaken}</Badge>
						</div>
					{/if}
					{#if data.action.reviewNote}
						<div>
							<p class="text-sm text-fg-muted mb-2">Review Note:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.reviewNote}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Content Flag Details -->
			{#if data.action.type === "content_flag"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-accent-fg" />
						<span class="text-fg-muted">Flagged:</span>
						<span class="text-fg">{formatDate(data.action.flaggedAt)}</span>
					</div>
					{#if data.action.resolvedAt}
						<div class="flex items-center gap-2 text-sm">
							<FluentCalendar20Filled class="size-4 text-positive" />
							<span class="text-fg-muted">Resolved:</span>
							<span class="text-fg">{formatDate(data.action.resolvedAt)}</span>
						</div>
					{/if}
					<div>
						<p class="text-sm text-fg-muted mb-2">Flag Type:</p>
						<Badge tone="amber">{data.action.flagType}</Badge>
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-fg-muted mb-2">Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-fg-soft">{data.action.reason}</p>
							</div>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<p class="text-sm text-fg-muted">Status:</p>
						{#if data.action.isResolved}
							<Badge tone="green" icon={FluentCheckmark20Filled}>Resolved</Badge>
						{:else}
							<Badge tone="amber">Active</Badge>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</PageContainer>
