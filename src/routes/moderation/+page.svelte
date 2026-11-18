<!-- src/routes/(authenticated)/moderation/+page.svelte -->
<script lang="ts">
	import { vanish } from "#lib/utils/motion.js";
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data, form } = $props();

	let selectedReport = $state<any>(null);
	let dismissNote = $state("");
	let filterStatus = $state<string>("all");
	let deletionReason = $state<string>("other");
	let deletionNote = $state("");
	let issueWarning = $state(true);

	const violationReasons = [
		{ value: "insult", label: "Insults / Harassment" },
		{ value: "spam", label: "Spam" },
		{ value: "pornography", label: "Pornographic Content" },
		{ value: "hate_speech", label: "Hate Speech / Illegal Symbols" },
		{ value: "graphic_violence", label: "Graphic Violence" },
		{ value: "privacy_violation", label: "Privacy Violation" },
		{ value: "other", label: "Other" }
	];

	function getStatusColor(status: string) {
		switch (status) {
			case "pending":
				return "yellow";
			case "resolved":
				return "green";
			case "dismissed":
				return "gray";
			default:
				return "blue";
		}
	}

	function getMessageTypeIcon(type: string) {
		switch (type) {
			case "global":
				return FluentEarth20Filled;
			case "state":
				return FluentBuildingGovernment20Filled;
			case "party":
				return FluentPeople20Filled;
			default:
				return FluentEarth20Filled;
		}
	}

	const filteredReports = $derived(() => {
		if (filterStatus === "all") return data.reports;
		return data.reports.filter((r) => r.status === filterStatus);
	});
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader title="Moderation Panel" subtitle="Review and manage reported messages" icon={FluentShield20Filled}>
		{#snippet actions()}
			<Button href="/chat" variant="secondary">Back to Chat</Button>
		{/snippet}
	</PageHeader>

	<!-- Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-primary/12 rounded-sm border border-primary/35 p-4">
			<div class="flex items-center gap-3">
				<FluentWarning20Filled class="size-6 text-primary-fg shrink-0" />
				<div>
					<p class="text-[10px] text-fg-muted uppercase tracking-wide">Pending Reports</p>
					<p class="text-2xl font-bold text-fg">{data.stats.pending}</p>
				</div>
			</div>
		</div>

		<div class="bg-positive-bg/18 rounded-sm border border-positive/30 p-4">
			<div class="flex items-center gap-3">
				<FluentCheckmark20Filled class="size-6 text-positive shrink-0" />
				<div>
					<p class="text-[10px] text-fg-muted uppercase tracking-wide">Resolved</p>
					<p class="text-2xl font-bold text-fg">{data.stats.resolved}</p>
				</div>
			</div>
		</div>

		<div class="panel-muted rounded-sm p-4">
			<div class="flex items-center gap-3">
				<FluentDismiss20Filled class="size-6 text-fg-muted shrink-0" />
				<div>
					<p class="text-[10px] text-fg-muted uppercase tracking-wide">Dismissed</p>
					<p class="text-2xl font-bold text-fg">{data.stats.dismissed}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2">
		<Button size="sm" variant={filterStatus === "all" ? "soft-amber" : "subtle"} onclick={() => (filterStatus = "all")}>
			All Reports
		</Button>
		<Button
			size="sm"
			variant={filterStatus === "pending" ? "soft-amber" : "subtle"}
			onclick={() => (filterStatus = "pending")}
		>
			Pending
		</Button>
		<Button
			size="sm"
			variant={filterStatus === "resolved" ? "soft-amber" : "subtle"}
			onclick={() => (filterStatus = "resolved")}
		>
			Resolved
		</Button>
		<Button
			size="sm"
			variant={filterStatus === "dismissed" ? "soft-amber" : "subtle"}
			onclick={() => (filterStatus = "dismissed")}
		>
			Dismissed
		</Button>
	</div>

	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 shrink-0" />
			<p>{form.error}</p>
		</div>
	{/if}

	<!-- Reports List -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Reports -->
		<div class="space-y-3">
			<h2 class="section-title mb-3">Reports ({filteredReports().length})</h2>

			{#if filteredReports().length === 0}
				<EmptyState icon={FluentCheckmark20Filled} title="No reports to show" />
			{:else}
				{#each filteredReports() as report (report.reportId)}
					{@const MessageIcon = getMessageTypeIcon(report.messageType)}
					<button
						out:vanish
						onclick={() => (selectedReport = report)}
						class="w-full panel-interactive rounded-sm p-4 text-left {selectedReport?.reportId === report.reportId
							? 'border-primary/55 ring-1 ring-primary/40'
							: ''}"
					>
						<div class="flex items-start gap-3">
							{#if report.messageSenderLogo}
								<img
									loading="lazy"
									decoding="async"
									src={report.messageSenderLogo}
									alt={report.messageSenderName}
									class="size-10 rounded-full"
								/>
							{:else}
								<div class="size-10 rounded-full bg-surface-4 flex items-center justify-center">
									<FluentImageOff20Filled class="size-5 text-fg-muted" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<MessageIcon class="size-4 text-fg-muted" />
									<p class="font-semibold text-fg text-sm">{report.messageSenderName}</p>
									<Badge
										tone={report.status === "pending"
											? "amber"
											: report.status === "resolved"
												? "green"
												: report.status === "dismissed"
													? "neutral"
													: "blue"}
										class="capitalize"
									>
										{report.status}
									</Badge>
								</div>
								<p class="text-sm text-fg-soft line-clamp-2 mb-2">{report.messageContent}</p>
								<p class="text-xs text-fg-muted">
									Reported by {report.reporterName} • {formatDateTime(report.reportedAt)}
								</p>
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Report Detail -->
		<div class="lg:sticky lg:top-6 self-start">
			{#if selectedReport}
				<div class="panel rounded-sm p-5">
					<h2 class="section-title mb-4">Report Details</h2>

					<!-- Message Info -->
					<div class="mb-6 p-4 panel-muted rounded-sm">
						<UserLink
							id={selectedReport.messageSenderId}
							name={selectedReport.messageSenderName}
							avatar={selectedReport.messageSenderLogo}
							subtitle="{selectedReport.messageType} chat"
							size="md"
							class="mb-3"
						/>
						<p class="text-fg-soft">{selectedReport.messageContent}</p>
					</div>

					<!-- Report Info -->
					<div class="mb-6">
						<h3 class="text-[10px] text-fg-muted uppercase tracking-wide mb-2">Report Reason</h3>
						<p class="text-fg-soft panel-muted rounded-sm p-3">{selectedReport.reason}</p>
						<p class="text-xs text-fg-muted mt-2">
							Reported by <UserLink id={selectedReport.reporterId} name={selectedReport.reporterName} size="xs" plain />
						</p>
					</div>

					<!-- Actions -->
					{#if selectedReport.status === "pending"}
						<div class="space-y-4">
							<div>
								<label class="field-label">Violation Reason</label>
								<select bind:value={deletionReason} class="field-control rounded-sm px-3 py-2.5 w-full">
									{#each violationReasons as reason}
										<option value={reason.value}>{reason.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="field-label">Note (visible to user)</label>
								<textarea
									bind:value={deletionNote}
									placeholder="Explain why this message was deleted..."
									rows="3"
									class="field-control rounded-sm px-3 py-2.5 w-full"></textarea>
							</div>

							<label class="flex cursor-pointer items-center justify-start gap-3">
								<input type="checkbox" bind:checked={issueWarning} class="checkbox checkbox-warning" />
								<span class="text-sm text-fg-body">Issue warning to user (3 warnings = auto-restriction)</span>
							</label>

							<form method="POST" action="?/deleteMessage" use:enhance>
								<input type="hidden" name="reportId" value={selectedReport.reportId} />
								<input type="hidden" name="messageId" value={selectedReport.messageId} />
								<input type="hidden" name="reason" value={deletionReason} />
								<input type="hidden" name="note" value={deletionNote} />
								<input type="hidden" name="issueWarning" value={issueWarning.toString()} />
								<Button type="submit" variant="danger" block icon={FluentDelete20Filled}>
									Delete Message{issueWarning ? " & Issue Warning" : ""}
								</Button>
							</form>

							<div class="flex items-center gap-3 text-xs text-fg-muted uppercase tracking-wide">
								<span class="flex-1 border-t border-line/15"></span>
								OR
								<span class="flex-1 border-t border-line/15"></span>
							</div>

							<div>
								<textarea
									bind:value={dismissNote}
									placeholder="Optional: Add a note explaining why this report is being dismissed..."
									rows="3"
									class="field-control rounded-sm px-3 py-2.5 w-full mb-2"></textarea>
								<form method="POST" action="?/dismissReport" use:enhance>
									<input type="hidden" name="reportId" value={selectedReport.reportId} />
									<input type="hidden" name="reviewNote" value={dismissNote} />
									<Button type="submit" variant="secondary" block icon={FluentDismiss20Filled}>Dismiss Report</Button>
								</form>
							</div>
						</div>
					{:else}
						<div class="panel-muted rounded-sm p-4 text-center">
							<p class="text-fg-muted capitalize">This report has been {selectedReport.status}</p>
						</div>
					{/if}
				</div>
			{:else}
				<EmptyState icon={FluentShield20Filled} title="Select a report to review" />
			{/if}
		</div>
	</div>
</PageContainer>
