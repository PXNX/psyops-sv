<!-- src/routes/moderators/reports/+page.svelte -->
<script lang="ts">
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentOrganization20Filled from "~icons/fluent/organization-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	function getStatusIcon(status: string) {
		switch (status) {
			case "pending":
				return FluentClock20Filled;
			case "resolved":
				return FluentCheckmark20Filled;
			case "dismissed":
				return FluentDismiss20Filled;
			default:
				return FluentDocument20Filled;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case "pending":
				return "text-accent-fg bg-accent/15 border-accent/35";
			case "resolved":
				return "text-positive-fg bg-positive-bg/20 border-positive/30";
			case "dismissed":
				return "text-fg-soft bg-surface-6 border-line/20";
			default:
				return "text-fg-soft bg-surface-6 border-line/20";
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case "pending":
				return "Pending Review";
			case "resolved":
				return "Resolved";
			case "dismissed":
				return "Dismissed";
			default:
				return status;
		}
	}

	function getViolationLabel(violation: string | null) {
		if (!violation) return "General";

		const labels: Record<string, string> = {
			insult: "Insult",
			spam: "Spam",
			pornography: "Pornography",
			hate_speech: "Hate Speech",
			graphic_violence: "Graphic Violence",
			privacy_violation: "Privacy Violation",
			other: "Other"
		};

		return labels[violation] || violation;
	}

	function getActionLabel(action: string | null) {
		if (!action) return null;

		const labels: Record<string, string> = {
			warning: "Warning Issued",
			message_delete: "Message Deleted",
			restriction: "Chat Restricted",
			ban: "User Banned",
			name_reset: "Name Reset",
			logo_reset: "Logo Reset"
		};

		return labels[action] || action;
	}

	function getTargetIcon(targetType: string) {
		switch (targetType) {
			case "message":
				return FluentChat20Filled;
			case "account":
				return FluentPerson20Filled;
			case "party":
				return FluentOrganization20Filled;
			default:
				return FluentFlag20Filled;
		}
	}
</script>

<svelte:head>
	<title>My Reports - Game Name</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader documentTitle={false} title="My Reports">
		{#snippet actions()}
			<Button href="/moderators" size="sm" variant="ghost" icon={FluentShield20Filled}>Moderators</Button>
			<Button href="/moderators/actions" size="sm" variant="ghost" icon={FluentFlag20Filled}>All Actions</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<FluentDocument20Filled class="size-5 text-friendly shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Total Reports</p>
				<p class="text-2xl font-bold text-fg leading-none mt-1">{data.stats.total}</p>
			</div>
		</div>

		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<FluentClock20Filled class="size-5 text-accent-fg shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Pending</p>
				<p class="text-2xl font-bold text-fg leading-none mt-1">{data.stats.pending}</p>
			</div>
		</div>

		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 text-positive shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Resolved</p>
				<p class="text-2xl font-bold text-fg leading-none mt-1">{data.stats.resolved}</p>
			</div>
		</div>

		<div class="panel-muted rounded-sm p-3 flex items-center gap-3">
			<FluentDismiss20Filled class="size-5 text-fg-muted shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Dismissed</p>
				<p class="text-2xl font-bold text-fg leading-none mt-1">{data.stats.dismissed}</p>
			</div>
		</div>
	</div>

	<!-- Reports List -->
	<div class="space-y-3">
		{#each data.reports as report}
			{@const StatusIcon = getStatusIcon(report.status)}
			{@const TargetIcon = getTargetIcon(report.targetType)}
			<div class="panel rounded-sm p-5">
				<div class="flex items-start gap-4">
					<!-- Report Icon -->
					<div class="shrink-0">
						<div class="size-12 rounded-sm flex items-center justify-center panel-muted">
							<TargetIcon class="size-6 text-friendly" />
						</div>
					</div>

					<!-- Report Details -->
					<div class="flex-1 min-w-0">
						<!-- Header -->
						<div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
							<div class="flex items-center gap-2">
								<div class="badge badge-sm rounded-sm border gap-1 {getStatusColor(report.status)}">
									<StatusIcon class="size-3" />
									{getStatusLabel(report.status)}
								</div>
								<Badge tone="neutral">{getViolationLabel(report.violationType)}</Badge>
							</div>
							<div class="flex items-center gap-1 text-xs text-fg-muted">
								<FluentCalendar20Filled class="size-3" />
								<span>Reported {formatDate(report.reportedAt)}</span>
							</div>
						</div>

						<!-- Target -->
						<div class="panel-muted rounded-sm p-4 mb-3">
							<div class="text-xs text-fg-muted font-medium mb-2">Reported {report.targetType}:</div>

							{#if report.targetType === "account" && report.target}
								<UserLink id={report.target.id} name={report.target.name} avatar={report.target.logoUrl} />
							{:else if report.targetType === "party" && report.target}
								<a href="/party/{report.target.id}" class="flex items-center gap-3 group">
									<div class="size-10 rounded-sm overflow-hidden transition-all">
										<Logo
											src={report.target.logoUrl}
											alt={report.target.name}
											class="size-full"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-surface-13 to-surface-6"
										/>
									</div>
									<div>
										<span class="text-sm text-fg group-hover:text-accent-hover transition-colors block">
											{report.target.name}
										</span>
										<span class="text-xs text-fg-muted">Political Party</span>
									</div>
								</a>
							{:else if report.targetType === "message" && report.target}
								<div class="space-y-2">
									{#if report.target.sender}
										<div class="flex items-center gap-2">
											<span class="text-xs text-fg-muted">From:</span>
											<UserLink id={report.target.sender.id} name={report.target.sender.name} size="xs" plain />
										</div>
									{/if}
									<div class="bg-surface-0 rounded-sm p-3 border border-line/10">
										<p class="text-sm text-fg-soft" class:italic={report.target.isDeleted}>
											{report.target.content}
										</p>
										{#if report.target.isDeleted}
											<span class="text-xs text-red-400 mt-1 block">This message has been deleted</span>
										{/if}
									</div>
								</div>
							{/if}
						</div>

						<!-- Report Reason -->
						<div class="panel-muted rounded-sm p-3 mb-3">
							<div class="text-xs text-fg-muted font-medium mb-1">Your report:</div>
							<p class="text-sm text-fg-soft">{report.reason}</p>
						</div>

						<!-- Review Info -->
						{#if report.status !== "pending"}
							<div class="border-t border-line/15 pt-3 mt-3">
								<div class="flex items-start gap-4">
									<!-- Reviewer -->
									{#if report.reviewer}
										<div class="flex items-center gap-3">
											<UserLink
												id={report.reviewer.id}
												name={report.reviewer.name}
												avatar={report.reviewer.logoUrl}
												subtitle="Reviewed by"
											/>
										</div>
									{/if}

									<!-- Review Details -->
									<div class="flex-1 min-w-0">
										{#if report.actionTaken}
											<div class="mb-2">
												<span class="text-xs text-fg-muted">Action taken:</span>
												<span class="text-sm text-positive-fg ml-2 font-medium">
													{getActionLabel(report.actionTaken)}
												</span>
											</div>
										{/if}
										{#if report.reviewNote}
											<div>
												<span class="text-xs text-fg-muted">Moderator note:</span>
												<p class="text-sm text-fg-soft mt-1">{report.reviewNote}</p>
											</div>
										{/if}
										{#if report.reviewedAt}
											<div class="flex items-center gap-1 text-xs text-fg-muted mt-2">
												<FluentCalendar20Filled class="size-3" />
												<span>Reviewed {formatDate(report.reviewedAt)}</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.reports.length === 0}
		<EmptyState
			icon={FluentDocument20Filled}
			title="No Reports Filed"
			subtitle="You haven't filed any reports yet. If you encounter rule violations, you can report them to the moderation team."
		/>
	{/if}
</PageContainer>
