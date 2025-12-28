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

	function formatTime(dateString: string) {
		const date = new Date(dateString);
		return (
			date.toLocaleDateString() +
			" " +
			date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			})
		);
	}

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
				<h1 class="text-2xl font-bold text-white">Moderation Panel</h1>
				<p class="text-sm text-gray-400">Review and manage reported messages</p>
			</div>
		</div>

		<a href="/chat" class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300">
			Back to Chat
		</a>
	</div>

	<!-- Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="bg-yellow-600/10 rounded-xl border border-yellow-500/20 p-5">
			<div class="flex items-center gap-3">
				<FluentWarning20Filled class="size-8 text-yellow-400" />
				<div>
					<p class="text-xs text-gray-400">Pending Reports</p>
					<p class="text-2xl font-bold text-white">{data.stats.pending}</p>
				</div>
			</div>
		</div>

		<div class="bg-green-600/10 rounded-xl border border-green-500/20 p-5">
			<div class="flex items-center gap-3">
				<FluentCheckmark20Filled class="size-8 text-green-400" />
				<div>
					<p class="text-xs text-gray-400">Resolved</p>
					<p class="text-2xl font-bold text-white">{data.stats.resolved}</p>
				</div>
			</div>
		</div>

		<div class="bg-gray-600/10 rounded-xl border border-gray-500/20 p-5">
			<div class="flex items-center gap-3">
				<FluentDismiss20Filled class="size-8 text-gray-400" />
				<div>
					<p class="text-xs text-gray-400">Dismissed</p>
					<p class="text-2xl font-bold text-white">{data.stats.dismissed}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-4 mb-6">
		<div class="flex gap-2">
			<button
				onclick={() => (filterStatus = "all")}
				class="btn btn-sm {filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-gray-300'}"
			>
				All Reports
			</button>
			<button
				onclick={() => (filterStatus = "pending")}
				class="btn btn-sm {filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-slate-700/50 text-gray-300'}"
			>
				Pending
			</button>
			<button
				onclick={() => (filterStatus = "resolved")}
				class="btn btn-sm {filterStatus === 'resolved' ? 'bg-green-600 text-white' : 'bg-slate-700/50 text-gray-300'}"
			>
				Resolved
			</button>
			<button
				onclick={() => (filterStatus = "dismissed")}
				class="btn btn-sm {filterStatus === 'dismissed' ? 'bg-gray-600 text-white' : 'bg-slate-700/50 text-gray-300'}"
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
			<h2 class="text-lg font-semibold text-white mb-3">Reports ({filteredReports().length})</h2>

			{#if filteredReports().length === 0}
				<div class="bg-slate-800/30 rounded-xl border border-white/5 p-8 text-center">
					<FluentCheckmark20Filled class="size-12 text-gray-500 mx-auto mb-3" />
					<p class="text-gray-400">No reports to show</p>
				</div>
			{:else}
				{#each filteredReports() as report}
					{@const statusColor = getStatusColor(report.status)}
					{@const MessageIcon = getMessageTypeIcon(report.messageType)}
					<button
						onclick={() => (selectedReport = report)}
						class="w-full bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-white/5 p-4 text-left transition-all {selectedReport?.reportId ===
						report.reportId
							? 'ring-2 ring-blue-500'
							: ''}"
					>
						<div class="flex items-start gap-3 mb-3">
							{#if report.messageSenderLogo}
								<img src={report.messageSenderLogo} alt={report.messageSenderName} class="size-10 rounded-full" />
							{:else}
								<div class="size-10 rounded-full bg-slate-700 flex items-center justify-center">
									<FluentImageOff20Filled class="size-5 text-gray-400" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<MessageIcon class="size-4 text-gray-400" />
									<p class="font-semibold text-white text-sm">{report.messageSenderName}</p>
									<span
										class="px-2 py-0.5 rounded text-xs font-medium capitalize"
										style="background-color: var(--{statusColor}-600-20); color: var(--{statusColor}-400)"
									>
										{report.status}
									</span>
								</div>
								<p class="text-sm text-gray-300 line-clamp-2 mb-2">{report.messageContent}</p>
								<p class="text-xs text-gray-500">
									Reported by {report.reporterName} • {formatTime(report.reportedAt)}
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
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
					<h2 class="text-xl font-bold text-white mb-4">Report Details</h2>

					<!-- Message Info -->
					<div class="mb-6 p-4 bg-slate-700/30 rounded-lg">
						<div class="flex items-start gap-3 mb-3">
							{#if selectedReport.messageSenderLogo}
								<img
									src={selectedReport.messageSenderLogo}
									alt={selectedReport.messageSenderName}
									class="size-12 rounded-full"
								/>
							{:else}
								<div class="size-12 rounded-full bg-slate-700 flex items-center justify-center">
									<FluentImageOff20Filled class="size-6 text-gray-400" />
								</div>
							{/if}

							<div class="flex-1">
								<a href="/user/{selectedReport.messageSenderId}" class="font-semibold text-white hover:text-blue-400">
									{selectedReport.messageSenderName}
								</a>
								<p class="text-xs text-gray-400 capitalize">{selectedReport.messageType} chat</p>
							</div>
						</div>
						<p class="text-gray-300">{selectedReport.messageContent}</p>
					</div>

					<!-- Report Info -->
					<div class="mb-6">
						<h3 class="text-sm font-semibold text-gray-400 mb-2">Report Reason</h3>
						<p class="text-gray-300 bg-slate-700/30 rounded-lg p-3">{selectedReport.reason}</p>
						<p class="text-xs text-gray-500 mt-2">
							Reported by <a href="/user/{selectedReport.reporterId}" class="text-blue-400 hover:underline"
								>{selectedReport.reporterName}</a
							>
						</p>
					</div>

					<!-- Actions -->
					{#if selectedReport.status === "pending"}
						<div class="space-y-4">
							<div>
								<label class="label">
									<span class="label-text text-gray-300">Violation Reason</span>
								</label>
								<select
									bind:value={deletionReason}
									class="select select-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
								>
									{#each violationReasons as reason}
										<option value={reason.value}>{reason.label}</option>
									{/each}
								</select>
							</div>

							<div>
								<label class="label">
									<span class="label-text text-gray-300">Note (visible to user)</span>
								</label>
								<textarea
									bind:value={deletionNote}
									placeholder="Explain why this message was deleted..."
									rows="3"
									class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
								></textarea>
							</div>

							<div class="form-control">
								<label class="label cursor-pointer justify-start gap-3">
									<input type="checkbox" bind:checked={issueWarning} class="checkbox checkbox-warning" />
									<span class="label-text text-gray-300">Issue warning to user (3 warnings = auto-restriction)</span>
								</label>
							</div>

							<form method="POST" action="?/deleteMessage" use:enhance>
								<input type="hidden" name="reportId" value={selectedReport.reportId} />
								<input type="hidden" name="messageId" value={selectedReport.messageId} />
								<input type="hidden" name="reason" value={deletionReason} />
								<input type="hidden" name="note" value={deletionNote} />
								<input type="hidden" name="issueWarning" value={issueWarning.toString()} />
								<button type="submit" class="btn w-full bg-red-600 hover:bg-red-700 border-0 text-white gap-2">
									<FluentDelete20Filled class="size-5" />
									Delete Message{issueWarning ? " & Issue Warning" : ""}
								</button>
							</form>

							<div class="divider text-gray-500">OR</div>

							<div>
								<textarea
									bind:value={dismissNote}
									placeholder="Optional: Add a note explaining why this report is being dismissed..."
									rows="3"
									class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600/30 text-white mb-2"
								></textarea>
								<form method="POST" action="?/dismissReport" use:enhance>
									<input type="hidden" name="reportId" value={selectedReport.reportId} />
									<input type="hidden" name="reviewNote" value={dismissNote} />
									<button type="submit" class="btn w-full bg-gray-600 hover:bg-gray-700 border-0 text-white gap-2">
										<FluentDismiss20Filled class="size-5" />
										Dismiss Report
									</button>
								</form>
							</div>
						</div>
					{:else}
						<div class="bg-slate-700/30 rounded-lg p-4 text-center">
							<p class="text-gray-400 capitalize">This report has been {selectedReport.status}</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="bg-slate-800/30 rounded-xl border border-white/5 p-12 text-center">
					<FluentShield20Filled class="size-16 text-gray-500 mx-auto mb-4" />
					<p class="text-gray-400">Select a report to review</p>
				</div>
			{/if}
		</div>
	</div>
</div>
