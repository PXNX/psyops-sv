<!-- src/routes/moderators/reports/[id]/+page.svelte -->
<script lang="ts">
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
				return "bg-[#e6a527]/12 border-[#e6a527]/35 text-[#f7c56b]";
			case "resolved":
				return "bg-[#587252]/18 border-[#8fae88]/30 text-[#c6dfbf]";
			case "dismissed":
				return "bg-[#102239]/70 border-[#dfceb0]/15 text-[#d9ccb7]";
			default:
				return "bg-[#102239]/70 border-[#dfceb0]/15 text-[#d9ccb7]";
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
	<PageHeader title="Report #{data.report.id}" backHref="/moderators/reports" backLabel="My Reports" />

	<!-- Status Card -->
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-4">
			<div class="size-16 rounded-sm border flex items-center justify-center shrink-0 {getStatusColor(data.report.status)}">
				<StatusIcon class="size-8" />
			</div>
			<div class="flex-1 min-w-0">
				<h2 class="text-3xl font-bold text-[#fff7e8]">{getStatusTitle(data.report.status)}</h2>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentCalendar20Filled class="size-5 text-[#f7c56b]" />
			Timeline
		</h2>
		<ul class="timeline timeline-vertical">
			<li>
				<div class="timeline-start text-sm text-[#a89e8e]">{formatDate(data.report.reportedAt)}</div>
				<div class="timeline-middle">
					<div class="size-4 rounded-full bg-[#7ba0c8]"></div>
				</div>
				<div class="timeline-end timeline-box rounded-sm bg-[#315d8d]/18 border-[#7ba0c8]/30">
					<div class="font-semibold text-[#b7d0e6]">Report Filed</div>
					<div class="text-sm text-[#d9ccb7]">You submitted this report</div>
				</div>
				<hr class="bg-[#7ba0c8]" />
			</li>
			{#if data.report.reviewedAt}
				<li>
					<hr class="bg-[#8fae88]" />
					<div class="timeline-start text-sm text-[#a89e8e]">{formatDate(data.report.reviewedAt)}</div>
					<div class="timeline-middle">
						<div class="size-4 rounded-full bg-[#8fae88]"></div>
					</div>
					<div class="timeline-end timeline-box rounded-sm bg-[#587252]/18 border-[#8fae88]/30">
						<div class="font-semibold text-[#c6dfbf]">
							{data.report.status === "resolved" ? "Resolved" : "Reviewed"}
						</div>
						{#if data.report.reviewer}
							<div class="text-sm text-[#d9ccb7]">By {data.report.reviewer.name}</div>
						{/if}
					</div>
				</li>
			{:else}
				<li>
					<hr class="bg-[#e6a527]" />
					<div class="timeline-start"></div>
					<div class="timeline-middle">
						<div class="size-4 rounded-full bg-[#e6a527] animate-pulse"></div>
					</div>
					<div class="timeline-end timeline-box rounded-sm bg-[#e6a527]/12 border-[#e6a527]/35">
						<div class="font-semibold text-[#f7c56b]">Awaiting Review</div>
						<div class="text-sm text-[#d9ccb7]">A moderator will review this soon</div>
					</div>
				</li>
			{/if}
		</ul>
	</div>

	<!-- Reported Target -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<TargetIcon class="size-5 text-[#7ba0c8]" />
			Reported {data.report.targetType === "account"
				? "User"
				: data.report.targetType === "party"
					? "Party"
					: "Message"}
		</h2>

		{#if data.report.target}
			<div class="panel-muted rounded-sm p-4">
				{#if data.report.targetType === "account"}
					<a href="/user/{data.report.target.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-sm overflow-hidden transition-all">
							<Logo
								src={data.report.target.logoUrl}
								alt={data.report.target.name}
								class="size-full"
								placeholderIcon={FluentPeople20Filled}
								placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
								{data.report.target.name}
							</p>
							<p class="text-sm text-[#a89e8e]">Click to view profile</p>
						</div>
					</a>
				{:else if data.report.targetType === "party"}
					<a href="/party/{data.report.target.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-sm overflow-hidden transition-all">
							<Logo
								src={data.report.target.logoUrl}
								alt={data.report.target.name}
								class="size-full"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
								{data.report.target.name}
							</p>
							<p class="text-sm text-[#a89e8e]">Political Party</p>
						</div>
					</a>
				{:else if data.report.targetType === "message"}
					<div class="space-y-3">
						{#if data.report.target.sender}
							<div class="flex items-center gap-2">
								<span class="text-sm text-[#a89e8e]">From:</span>
								<a href="/user/{data.report.target.sender.id}" class="flex items-center gap-2 group">
									<div class="size-8 rounded-sm overflow-hidden transition-all">
										<Logo
											src={data.report.target.sender.logoUrl}
											alt={data.report.target.sender.name}
											class="size-full"
											placeholderIcon={FluentPeople20Filled}
											placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
										/>
									</div>
									<span class="text-sm text-[#f7c56b] group-hover:text-[#f2c463] transition-colors">
										{data.report.target.sender.name}
									</span>
								</a>
							</div>
						{/if}
						{#if data.report.target.sentAt}
							<div class="flex items-center gap-2 text-sm text-[#a89e8e]">
								<FluentCalendar20Filled class="size-4" />
								<span>Sent {formatDate(data.report.target.sentAt)}</span>
							</div>
						{/if}
						<div class="bg-[#0d1d31] rounded-sm p-4 border border-[#dfceb0]/10">
							<p class="text-[#d9ccb7]" class:italic={data.report.target.isDeleted}>
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
			<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3">
				<FluentWarning20Filled class="size-5 shrink-0" />
				<span>Target information is no longer available</span>
			</div>
		{/if}
	</div>

	<!-- Report Details -->
	<div class="panel rounded-sm p-5">
		<h2 class="section-title mb-4">
			<FluentInfo20Filled class="size-5 text-[#f7c56b]" />
			Report Details
		</h2>

		<div class="space-y-4">
			<!-- Violation Type -->
			<div>
				<p class="text-sm text-[#a89e8e] mb-2">Violation Type:</p>
				<Badge tone="red" size="md">{getViolationLabel(data.report.violationType)}</Badge>
			</div>

			<!-- Your Report -->
			<div>
				<p class="text-sm text-[#a89e8e] mb-2">Your Report:</p>
				<div class="panel-muted rounded-sm p-4">
					<p class="text-[#d9ccb7]">{data.report.reason}</p>
				</div>
			</div>

			<!-- Review Information -->
			{#if data.report.status !== "pending"}
				<div class="border-t border-[#dfceb0]/15"></div>

				<h3 class="font-semibold text-[#fff7e8] flex items-center gap-2 mt-4">
					<FluentShield20Filled class="size-5 text-[#b7a0c5]" />
					Moderator Review
				</h3>

				{#if data.report.reviewer}
					<div class="flex items-center gap-3 mt-3">
						<a href="/user/{data.report.reviewer.id}" class="flex items-center gap-3 group">
							<div class="size-12 rounded-sm overflow-hidden transition-all">
								<Logo
									src={data.report.reviewer.logoUrl}
									alt={data.report.reviewer.name}
									class="size-full"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-[#8c709b] to-[#6a5578]"
								/>
							</div>
							<div class="min-w-0">
								<p class="text-sm text-[#a89e8e]">Reviewed by</p>
								<p class="font-semibold text-[#d5c4df] group-hover:text-[#f2c463] transition-colors truncate">
									{data.report.reviewer.name}
								</p>
							</div>
						</a>
					</div>
				{/if}

				{#if data.report.actionTaken}
					<div class="mt-4">
						<p class="text-sm text-[#a89e8e] mb-2">Action Taken:</p>
						<Badge tone="green" size="md" icon={FluentCheckmark20Filled}>
							{getActionLabel(data.report.actionTaken)}
						</Badge>
					</div>
				{/if}

				{#if data.report.reviewNote}
					<div class="mt-4">
						<p class="text-sm text-[#a89e8e] mb-2">Moderator's Note:</p>
						<div class="panel-muted rounded-sm p-4">
							<p class="text-[#d9ccb7]">{data.report.reviewNote}</p>
						</div>
					</div>
				{/if}
			{:else}
				<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3">
					<FluentClock20Filled class="size-5 shrink-0" />
					<div>
						<h3 class="font-bold">Pending Review</h3>
						<p class="text-sm text-[#d9ccb7]">
							A moderator will review your report soon. You'll be able to see the outcome here.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</PageContainer>
