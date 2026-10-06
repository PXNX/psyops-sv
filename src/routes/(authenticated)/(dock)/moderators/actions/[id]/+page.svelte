<!-- src/routes/moderators/actions/[id]/+page.svelte -->
<script lang="ts">
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
	import Logo from "#lib/component/Logo.svelte";
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
				return "bg-[#e6a527]/12 border-[#e6a527]/35 text-[#f7c56b]";
			case "restriction":
				return "bg-red-600/10 border-red-500/30 text-red-300";
			case "report_action":
				return "bg-[#315d8d]/18 border-[#7ba0c8]/30 text-[#b7d0e6]";
			case "content_flag":
				return "bg-[#e6a527]/12 border-[#e6a527]/35 text-[#f7c56b]";
			default:
				return "bg-[#102239]/70 border-[#dfceb0]/15 text-[#d9ccb7]";
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
	<PageHeader title="Action #{data.action.id}" backHref="/moderators/actions" backLabel="Moderator Actions" />

	<!-- Action Card -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-4">
			<div
				class="size-16 rounded-sm border flex items-center justify-center shrink-0 {getActionColor(data.action.type)}"
			>
				<ActionIcon class="size-8" />
			</div>
			<div class="flex-1 min-w-0">
				<h2 class="text-3xl font-bold text-[#fff7e8]">{getActionTitle(data.action.type)}</h2>
			</div>
		</div>
	</div>

	<!-- Participants Section -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Target User -->
		{#if data.action.target}
			<div class="panel rounded-sm p-5">
				<h3 class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-3">Target User</h3>
				<a href="/user/{data.action.target.id}" class="flex items-center gap-3 group">
					<div class="size-16 rounded-sm overflow-hidden transition-all">
						<Logo
							src={data.action.target.logoUrl}
							alt={data.action.target.name}
							class="size-full"
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#14283f] to-[#102239]"
						/>
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
							{data.action.target.name}
						</p>
						<p class="text-sm text-[#a89e8e]">Click to view profile</p>
					</div>
				</a>
			</div>
		{/if}

		<!-- Moderator -->
		{#if data.action.moderator}
			<div class="panel rounded-sm p-5 border-[#b7a0c5]/30">
				<h3 class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-3">
					{data.action.type === "report_action" ? "Reviewed By" : "Moderator"}
				</h3>
				<a href="/user/{data.action.moderator.id}" class="flex items-center gap-3 group">
					<div class="size-16 rounded-sm overflow-hidden transition-all">
						<Logo
							src={data.action.moderator.logoUrl}
							alt={data.action.moderator.name}
							class="size-full"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#8c709b] to-[#b7a0c5]"
						/>
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-[#d5c4df] group-hover:text-[#f2c463] transition-colors truncate">
							{data.action.moderator.name}
						</p>
						<div class="flex items-center gap-2 mt-1">
							{#if data.action.moderator.role === "admin"}
								<Badge tone="red" size="xs">Admin</Badge>
							{:else if data.action.moderator.role === "moderator"}
								<Badge tone="purple" size="xs">Moderator</Badge>
							{/if}
						</div>
					</div>
				</a>
			</div>
		{/if}

		<!-- Reporter (for report actions) -->
		{#if data.action.type === "report_action" && data.action.reporter}
			<div class="panel rounded-sm p-5">
				<h3 class="text-[10px] text-[#a89e8e] uppercase tracking-wide mb-3">Reported By</h3>
				<a href="/user/{data.action.reporter.id}" class="flex items-center gap-3 group">
					<div class="size-16 rounded-sm overflow-hidden transition-all">
						<Logo
							src={data.action.reporter.logoUrl}
							alt={data.action.reporter.name}
							class="size-full"
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#14283f] to-[#102239]"
						/>
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
							{data.action.reporter.name}
						</p>
						<p class="text-sm text-[#a89e8e]">Original reporter</p>
					</div>
				</a>
			</div>
		{/if}
	</div>

	<!-- Action Details -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentInfo20Filled class="size-5 text-[#f7c56b]" />
			Action Details
		</h2>

		<div class="space-y-4">
			<!-- Message Delete Details -->
			{#if data.action.type === "message_delete"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-[#a89e8e]" />
						<span class="text-[#a89e8e]">Message sent:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.sentAt)}</span>
					</div>
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-red-400" />
						<span class="text-[#a89e8e]">Deleted:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.deletedAt)}</span>
					</div>
					<div class="border-t border-[#dfceb0]/15"></div>
					<div>
						<p class="text-sm text-[#a89e8e] mb-2">Message Content:</p>
						<div class="panel-muted rounded-sm p-4">
							<p class="text-[#fff7e8]">{data.action.messageContent}</p>
						</div>
					</div>
					{#if data.action.deletionReason}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Deletion Reason:</p>
							<Badge tone="red">{data.action.deletionReason}</Badge>
						</div>
					{/if}
					{#if data.action.deletionNote}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Moderator Note:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.deletionNote}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Warning Details -->
			{#if data.action.type === "warning"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-[#f7c56b]" />
						<span class="text-[#a89e8e]">Issued:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.issuedAt)}</span>
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Violation Type:</p>
							<Badge tone="amber">{data.action.reason}</Badge>
						</div>
					{/if}
					{#if data.action.description}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Description:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.description}</p>
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
						<span class="text-[#a89e8e]">Restricted:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.restrictedAt)}</span>
					</div>
					<div>
						<p class="text-sm text-[#a89e8e] mb-2">Duration:</p>
						{#if data.action.isPermanent}
							<Badge tone="red" icon={FluentWarning20Filled}>Permanent</Badge>
						{:else if data.action.expiresAt}
							<Badge tone="amber" icon={FluentClock20Filled}>Until {formatDate(data.action.expiresAt)}</Badge>
						{/if}
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.reason}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Report Action Details -->
			{#if data.action.type === "report_action"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-[#7ba0c8]" />
						<span class="text-[#a89e8e]">Reported:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.reportedAt)}</span>
					</div>
					{#if data.action.reviewedAt}
						<div class="flex items-center gap-2 text-sm">
							<FluentCalendar20Filled class="size-4 text-[#8fae88]" />
							<span class="text-[#a89e8e]">Reviewed:</span>
							<span class="text-[#fff7e8]">{formatDate(data.action.reviewedAt)}</span>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<p class="text-sm text-[#a89e8e]">Status:</p>
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
							<p class="text-sm text-[#a89e8e] mb-2">Violation Type:</p>
							<Badge tone="red">{data.action.violationType}</Badge>
						</div>
					{/if}
					{#if data.action.reportReason}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Report Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.reportReason}</p>
							</div>
						</div>
					{/if}
					{#if data.action.actionTaken}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Action Taken:</p>
							<Badge tone="green">{data.action.actionTaken}</Badge>
						</div>
					{/if}
					{#if data.action.reviewNote}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Review Note:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.reviewNote}</p>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Content Flag Details -->
			{#if data.action.type === "content_flag"}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-[#f7c56b]" />
						<span class="text-[#a89e8e]">Flagged:</span>
						<span class="text-[#fff7e8]">{formatDate(data.action.flaggedAt)}</span>
					</div>
					{#if data.action.resolvedAt}
						<div class="flex items-center gap-2 text-sm">
							<FluentCalendar20Filled class="size-4 text-[#8fae88]" />
							<span class="text-[#a89e8e]">Resolved:</span>
							<span class="text-[#fff7e8]">{formatDate(data.action.resolvedAt)}</span>
						</div>
					{/if}
					<div>
						<p class="text-sm text-[#a89e8e] mb-2">Flag Type:</p>
						<Badge tone="amber">{data.action.flagType}</Badge>
					</div>
					{#if data.action.reason}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Reason:</p>
							<div class="panel-muted rounded-sm p-4">
								<p class="text-[#d9ccb7]">{data.action.reason}</p>
							</div>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<p class="text-sm text-[#a89e8e]">Status:</p>
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
