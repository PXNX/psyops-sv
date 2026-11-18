<!-- src/routes/moderators/reports/[id]/+page.svelte -->
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
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge } from "#lib/component/ui/index.js";

	const { data } = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case "pending":
				return "bg-primary/12 border-primary/35 text-primary-fg";
			case "resolved":
				return "bg-positive-bg/18 border-positive/30 text-positive-fg";
			case "dismissed":
				return "bg-surface-4/70 border-line/15 text-fg-soft";
			default:
				return "bg-surface-4/70 border-line/15 text-fg-soft";
		}
	}

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

	function getStatusTitle(status: string) {
		switch (status) {
			case "pending":
				return "Report Pending Review";
			case "resolved":
				return "Report Resolved";
			case "dismissed":
				return "Report Dismissed";
			default:
				return "Report";
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

	const StatusIcon = $derived(getStatusIcon(data.report.status));
	const TargetIcon = $derived(getTargetIcon(data.report.targetType));
</script>

<svelte:head>
	<title>Report #{data.report.id} - My Reports</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Header -->
	<PageHeader
		documentTitle={false}
		title="Report #{data.report.id}"
		backHref="/moderators/reports"
		backLabel="My Reports"
	/>

	<!-- Status Card -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-4">
			<div
				class="size-16 rounded-sm border flex items-center justify-center shrink-0 {getStatusColor(data.report.status)}"
			>
				<StatusIcon class="size-8" />
			</div>
			<div class="flex-1 min-w-0">
				<h2 class="text-3xl font-bold text-fg">{getStatusTitle(data.report.status)}</h2>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentCalendar20Filled class="size-5 text-primary-fg" />
			Timeline
		</h2>
		<ul class="timeline timeline-vertical">
			<li>
				<div class="timeline-start text-sm text-fg-muted">{formatDate(data.report.reportedAt)}</div>
				<div class="timeline-middle">
					<div class="size-4 rounded-full bg-friendly"></div>
				</div>
				<div class="timeline-end timeline-box rounded-sm bg-friendly-bg/18 border-friendly/30">
					<div class="font-semibold text-friendly-fg">Report Filed</div>
					<div class="text-sm text-fg-soft">You submitted this report</div>
				</div>
				<hr class="bg-friendly" />
			</li>
			{#if data.report.reviewedAt}
				<li>
					<hr class="bg-positive" />
					<div class="timeline-start text-sm text-fg-muted">{formatDate(data.report.reviewedAt)}</div>
					<div class="timeline-middle">
						<div class="size-4 rounded-full bg-positive"></div>
					</div>
					<div class="timeline-end timeline-box rounded-sm bg-positive-bg/18 border-positive/30">
						<div class="font-semibold text-positive-fg">
							{data.report.status === "resolved" ? "Resolved" : "Reviewed"}
						</div>
						{#if data.report.reviewer}
							<div class="text-sm text-fg-soft">By {data.report.reviewer.name}</div>
						{/if}
					</div>
				</li>
			{:else}
				<li>
					<hr class="bg-primary" />
					<div class="timeline-start"></div>
					<div class="timeline-middle">
						<div class="size-4 rounded-full bg-primary animate-pulse"></div>
					</div>
					<div class="timeline-end timeline-box rounded-sm bg-primary/12 border-primary/35">
						<div class="font-semibold text-primary-fg">Awaiting Review</div>
						<div class="text-sm text-fg-soft">A moderator will review this soon</div>
					</div>
				</li>
			{/if}
		</ul>
	</div>

	<!-- Reported Target -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<TargetIcon class="size-5 text-friendly" />
			Reported {data.report.targetType === "account"
				? "User"
				: data.report.targetType === "party"
					? "Party"
					: "Message"}
		</h2>

		{#if data.report.target}
			<div class="panel-muted rounded-sm p-4">
				{#if data.report.targetType === "account"}
					<UserLink
						id={data.report.target.id}
						name={data.report.target.name}
						avatar={data.report.target.logoUrl}
						size="md"
					/>
				{:else if data.report.targetType === "party"}
					<a href="/party/{data.report.target.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-sm overflow-hidden transition-all">
							<Logo
								src={data.report.target.logoUrl}
								alt={data.report.target.name}
								class="size-full"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-surface-13 to-surface-6"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-fg group-hover:text-primary-hover transition-colors truncate">
								{data.report.target.name}
							</p>
							<p class="text-sm text-fg-muted">Political Party</p>
						</div>
					</a>
				{:else if data.report.targetType === "message"}
					<div class="space-y-3">
						{#if data.report.target.sender}
							<div class="flex items-center gap-2">
								<span class="text-sm text-fg-muted">From:</span>
								<UserLink
									id={data.report.target.sender.id}
									name={data.report.target.sender.name}
									avatar={data.report.target.sender.logoUrl}
								/>
							</div>
						{/if}
						{#if data.report.target.sentAt}
							<div class="flex items-center gap-2 text-sm text-fg-muted">
								<FluentCalendar20Filled class="size-4" />
								<span>Sent {formatDate(data.report.target.sentAt)}</span>
							</div>
						{/if}
						<div class="bg-surface-0 rounded-sm p-4 border border-line/10">
							<p class="text-fg-soft" class:italic={data.report.target.isDeleted}>
								{data.report.target.content}
							</p>
							{#if data.report.target.isDeleted}
								<div class="flex items-center gap-2 mt-2">
									<FluentWarning20Filled class="size-4 text-red-400" />
									<span class="text-sm text-red-400">This message has been deleted</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="bg-primary/12 border border-primary/35 text-primary-fg rounded-sm p-4 flex items-center gap-3">
				<FluentWarning20Filled class="size-5 shrink-0" />
				<span>Target information is no longer available</span>
			</div>
		{/if}
	</div>

	<!-- Report Details -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentInfo20Filled class="size-5 text-primary-fg" />
			Report Details
		</h2>

		<div class="space-y-4">
			<!-- Violation Type -->
			<div>
				<p class="text-sm text-fg-muted mb-2">Violation Type:</p>
				<Badge tone="red" size="md">{getViolationLabel(data.report.violationType)}</Badge>
			</div>

			<!-- Your Report -->
			<div>
				<p class="text-sm text-fg-muted mb-2">Your Report:</p>
				<div class="panel-muted rounded-sm p-4">
					<p class="text-fg-soft">{data.report.reason}</p>
				</div>
			</div>

			<!-- Review Information -->
			{#if data.report.status !== "pending"}
				<div class="border-t border-line/15"></div>

				<h3 class="font-semibold text-fg flex items-center gap-2 mt-4">
					<FluentShield20Filled class="size-5 text-politics" />
					Moderator Review
				</h3>

				{#if data.report.reviewer}
					<div class="flex items-center gap-3 mt-3">
						<UserLink
							id={data.report.reviewer.id}
							name={data.report.reviewer.name}
							avatar={data.report.reviewer.logoUrl}
							size="md"
							subtitle="Reviewed by"
						/>
					</div>
				{/if}

				{#if data.report.actionTaken}
					<div class="mt-4">
						<p class="text-sm text-fg-muted mb-2">Action Taken:</p>
						<Badge tone="green" size="md" icon={FluentCheckmark20Filled}>
							{getActionLabel(data.report.actionTaken)}
						</Badge>
					</div>
				{/if}

				{#if data.report.reviewNote}
					<div class="mt-4">
						<p class="text-sm text-fg-muted mb-2">Moderator's Note:</p>
						<div class="panel-muted rounded-sm p-4">
							<p class="text-fg-soft">{data.report.reviewNote}</p>
						</div>
					</div>
				{/if}
			{:else}
				<div class="bg-primary/12 border border-primary/35 text-primary-fg rounded-sm p-4 flex items-center gap-3">
					<FluentClock20Filled class="size-5 shrink-0" />
					<div>
						<h3 class="font-bold">Pending Review</h3>
						<p class="text-sm text-fg-soft">
							A moderator will review your report soon. You'll be able to see the outcome here.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</PageContainer>
