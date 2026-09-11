<!-- src/routes/(authenticated)/moderation/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentEarth20Filled from "~icons/fluent/earth-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import { formatDateTime } from "$lib/utils/formatting.js";
	import Button from "$lib/component/ui/Button.svelte";

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

<div class="max-w-7xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-3">
			<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center">
				<FluentShield20Filled class="size-6 text-red-400" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-[#fff7e8]">Moderation Panel</h1>
				<p class="text-sm text-[#c7bda9]">Review and manage reported messages</p>
			</div>
		</div>

		<Button href="/chat" variant="secondary">Back to Chat</Button>
	</div>

	<!-- Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="bg-[#e6a527]/10 rounded-xl border border-[#e6a527]/20 p-5">
			<div class="flex items-center gap-3">
				<FluentWarning20Filled class="size-8 text-[#e6a527]" />
				<div>
					<p class="text-xs text-[#c7bda9]">Pending Reports</p>
					<p class="text-2xl font-bold text-[#fff7e8]">{data.stats.pending}</p>
				</div>
			</div>
		</div>

		<div class="bg-emerald-600/10 rounded-xl border border-emerald-500/20 p-5">
			<div class="flex items-center gap-3">
				<FluentCheckmark20Filled class="size-8 text-emerald-400" />
				<div>
					<p class="text-xs text-[#c7bda9]">Resolved</p>
					<p class="text-2xl font-bold text-[#fff7e8]">{data.stats.resolved}</p>
				</div>
			</div>
		</div>

		<div class="panel-muted rounded-xl p-5">
			<div class="flex items-center gap-3">
				<FluentDismiss20Filled class="size-8 text-[#a89e8e]" />
				<div>
					<p class="text-xs text-[#c7bda9]">Dismissed</p>
					<p class="text-2xl font-bold text-[#fff7e8]">{data.stats.dismissed}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="panel rounded-xl p-4 mb-6">
		<div class="flex gap-2">
			<button
				onclick={() => (filterStatus = "all")}
				class="btn btn-sm {filterStatus === 'all'
					? 'bg-[#315d8d] text-[#fff7e8]'
					: 'bg-[#102239]/70 text-[#d9ccb7]'}"
			>
				All Reports
			</button>
			<button
				onclick={() => (filterStatus = "pending")}
				class="btn btn-sm {filterStatus === 'pending'
					? 'bg-[#e6a527] text-[#172a45]'
					: 'bg-[#102239]/70 text-[#d9ccb7]'}"
			>
				Pending
			</button>
			<button
				onclick={() => (filterStatus = "resolved")}
				class="btn btn-sm {filterStatus === 'resolved'
					? 'bg-emerald-600 text-[#fff7e8]'
					: 'bg-[#102239]/70 text-[#d9ccb7]'}"
			>
				Resolved
			</button>
			<button
				onclick={() => (filterStatus = "dismissed")}
				class="btn btn-sm {filterStatus === 'dismissed'
					? 'bg-[#14283f] text-[#fff7e8]'
					: 'bg-[#102239]/70 text-[#d9ccb7]'}"
			>
				Dismissed
			</button>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error mb-4">
			<p>{form.error}</p>
		</div>
	{/if}

	<!-- Reports List -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Reports -->
		<div class="space-y-3">
			<h2 class="text-lg font-semibold text-[#fff7e8] mb-3">Reports ({filteredReports().length})</h2>

			{#if filteredReports().length === 0}
				<div class="panel-muted rounded-xl p-8 text-center">
					<FluentCheckmark20Filled class="size-12 text-[#a89e8e] mx-auto mb-3" />
					<p class="text-[#c7bda9]">No reports to show</p>
				</div>
			{:else}
				{#each filteredReports() as report}
					{@const statusColor = getStatusColor(report.status)}
					{@const MessageIcon = getMessageTypeIcon(report.messageType)}
					<button
						onclick={() => (selectedReport = report)}
						class="w-full panel-interactive rounded-xl p-4 text-left transition-all {selectedReport?.reportId ===
						report.reportId
							? 'ring-2 ring-[#e6a527]/60'
							: ''}"
					>
						<div class="flex items-start gap-3 mb-3">
							{#if report.messageSenderLogo}
								<img src={report.messageSenderLogo} alt={report.messageSenderName} class="size-10 rounded-full" />
							{:else}
								<div class="size-10 rounded-full bg-[#102239] flex items-center justify-center">
									<FluentImageOff20Filled class="size-5 text-[#c7bda9]" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<MessageIcon class="size-4 text-[#c7bda9]" />
									<p class="font-semibold text-[#fff7e8] text-sm">{report.messageSenderName}</p>
									<span
										class="px-2 py-0.5 rounded text-xs font-medium capitalize"
										style="background-color: var(--{statusColor}-600-20); color: var(--{statusColor}-400)"
									>
										{report.status}
									</span>
								</div>
								<p class="text-sm text-[#d9ccb7] line-clamp-2 mb-2">{report.messageContent}</p>
								<p class="text-xs text-[#a89e8e]">
									Reported by {report.reporterName} • {formatDateTime(report.reportedAt)}
								</p>
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Report Detail -->
		<div class="lg:sticky lg:top-6">
			{#if selectedReport}
				<div class="panel rounded-xl p-6">
					<h2 class="text-xl font-bold text-[#fff7e8] mb-4">Report Details</h2>

					<!-- Message Info -->
					<div class="mb-6 p-4 panel-muted rounded-lg">
						<div class="flex items-start gap-3 mb-3">
							{#if selectedReport.messageSenderLogo}
								<img
									src={selectedReport.messageSenderLogo}
									alt={selectedReport.messageSenderName}
									class="size-12 rounded-full"
								/>
							{:else}
								<div class="size-12 rounded-full bg-[#102239] flex items-center justify-center">
									<FluentImageOff20Filled class="size-6 text-[#c7bda9]" />
								</div>
							{/if}

							<div class="flex-1">
								<a href="/user/{selectedReport.messageSenderId}" class="font-semibold text-[#fff7e8] hover:text-[#f7c56b]">
									{selectedReport.messageSenderName}
								</a>
								<p class="text-xs text-[#c7bda9] capitalize">{selectedReport.messageType} chat</p>
							</div>
						</div>
						<p class="text-[#d9ccb7]">{selectedReport.messageContent}</p>
					</div>

					<!-- Report Info -->
					<div class="mb-6">
						<h3 class="text-sm font-semibold text-[#c7bda9] mb-2">Report Reason</h3>
						<p class="text-[#d9ccb7] panel-muted rounded-lg p-3">{selectedReport.reason}</p>
						<p class="text-xs text-[#a89e8e] mt-2">
							Reported by <a href="/user/{selectedReport.reporterId}" class="text-[#f7c56b] hover:underline"
								>{selectedReport.reporterName}</a
							>
						</p>
					</div>

					<!-- Actions -->
					{#if selectedReport.status === "pending"}
						<div class="space-y-4">
							<div>
								<label class="label">
									<span class="label-text text-[#e5d8c1]">Violation Reason</span>
								</label>
								<select
									bind:value={deletionReason}
									class="select select-bordered w-full field-control"
								>
									{#each violationReasons as reason}
										<option value={reason.value}>{reason.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="label">
									<span class="label-text text-[#e5d8c1]">Note (visible to user)</span>
								</label>
								<textarea
									bind:value={deletionNote}
									placeholder="Explain why this message was deleted..."
									rows="3"
									class="textarea textarea-bordered w-full field-control"
								></textarea>
							</div>

							<div class="form-control">
								<label class="label cursor-pointer justify-start gap-3">
									<input type="checkbox" bind:checked={issueWarning} class="checkbox checkbox-warning" />
									<span class="label-text text-[#e5d8c1]">Issue warning to user (3 warnings = auto-restriction)</span>
								</label>
							</div>

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

							<div class="divider text-[#a89e8e]">OR</div>

							<div>
								<textarea
									bind:value={dismissNote}
									placeholder="Optional: Add a note explaining why this report is being dismissed..."
									rows="3"
									class="textarea textarea-bordered w-full field-control mb-2"
								></textarea>
								<form method="POST" action="?/dismissReport" use:enhance>
									<input type="hidden" name="reportId" value={selectedReport.reportId} />
									<input type="hidden" name="reviewNote" value={dismissNote} />
									<Button type="submit" variant="secondary" block icon={FluentDismiss20Filled}>
										Dismiss Report
									</Button>
								</form>
							</div>
						</div>
					{:else}
						<div class="panel-muted rounded-lg p-4 text-center">
							<p class="text-[#c7bda9] capitalize">This report has been {selectedReport.status}</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="panel-muted rounded-xl p-12 text-center">
					<FluentShield20Filled class="size-16 text-[#a89e8e] mx-auto mb-4" />
					<p class="text-[#c7bda9]">Select a report to review</p>
				</div>
			{/if}
		</div>
	</div>
</div>
