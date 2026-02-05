<!-- src/routes/moderators/reports/+page.svelte -->
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
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

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
				return "text-orange-400 bg-orange-600/20 border-orange-500/30";
			case "resolved":
				return "text-green-400 bg-green-600/20 border-green-500/30";
			case "dismissed":
				return "text-gray-400 bg-gray-600/20 border-gray-500/30";
			default:
				return "text-gray-400 bg-gray-600/20 border-gray-500/30";
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

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<div class="size-12 rounded-xl flex items-center justify-center bg-blue-600/20">
					<FluentDocument20Filled class="size-6 text-blue-400" />
				</div>
				My Reports
			</h1>
			<p class="text-gray-400 mt-2">Track the status of reports you've filed</p>
		</div>
		<div class="flex items-center gap-3">
			<a href="/moderators" class="btn btn-ghost gap-2">
				<FluentShield20Filled class="size-4" />
				View Moderators
			</a>
			<a href="/moderators/actions" class="btn btn-ghost gap-2">
				<FluentFlag20Filled class="size-4" />
				All Actions
			</a>
		</div>
	</div>

	<!-- Stats -->
	<div class="stats bg-slate-800/50 border border-white/5 shadow-xl w-full">
		<div class="stat">
			<div class="stat-figure text-blue-400">
				<FluentDocument20Filled class="size-8" />
			</div>
			<div class="stat-title">Total Reports</div>
			<div class="stat-value text-blue-400">{data.stats.total}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-orange-400">
				<FluentClock20Filled class="size-8" />
			</div>
			<div class="stat-title">Pending</div>
			<div class="stat-value text-orange-400">{data.stats.pending}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-green-400">
				<FluentCheckmark20Filled class="size-8" />
			</div>
			<div class="stat-title">Resolved</div>
			<div class="stat-value text-green-400">{data.stats.resolved}</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-gray-400">
				<FluentDismiss20Filled class="size-8" />
			</div>
			<div class="stat-title">Dismissed</div>
			<div class="stat-value text-gray-400">{data.stats.dismissed}</div>
		</div>
	</div>

	<!-- Reports List -->
	<div class="space-y-3">
		{#each data.reports as report}
			{@const StatusIcon = getStatusIcon(report.status)}
			{@const TargetIcon = getTargetIcon(report.targetType)}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 hover:border-white/10 transition-all">
				<div class="flex items-start gap-4">
					<!-- Report Icon -->
					<div class="shrink-0">
						<div class="size-12 rounded-xl flex items-center justify-center bg-slate-700/50">
							<TargetIcon class="size-6 text-blue-400" />
						</div>
					</div>

					<!-- Report Details -->
					<div class="flex-1 min-w-0">
						<!-- Header -->
						<div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
							<div class="flex items-center gap-2">
								<div class="badge badge-sm border {getStatusColor(report.status)}">
									<StatusIcon class="size-3 mr-1" />
									{getStatusLabel(report.status)}
								</div>
								<div class="badge badge-sm bg-slate-700/50 text-gray-300 border-white/5">
									{getViolationLabel(report.violationType)}
								</div>
							</div>
							<div class="flex items-center gap-1 text-xs text-gray-500">
								<FluentCalendar20Filled class="size-3" />
								<span>Reported {formatDate(report.reportedAt)}</span>
							</div>
						</div>

						<!-- Target -->
						<div class="bg-slate-700/30 rounded-lg p-4 mb-3">
							<div class="text-xs text-gray-500 font-medium mb-2">Reported {report.targetType}:</div>

							{#if report.targetType === "account" && report.target}
								<a href="/user/{report.target.id}" class="flex items-center gap-3 group">
									<div
										class="size-10 rounded-lg overflow-hidden ring-2 ring-white/5 group-hover:ring-white/20 transition-all"
									>
										<Logo
											src={report.target.logoUrl}
											alt={report.target.name}
											class="size-full"
											placeholderIcon={FluentPeople20Filled}
											placeholderGradient="from-slate-600 to-slate-700"
										/>
									</div>
									<span class="text-sm text-white group-hover:text-blue-400 transition-colors">
										{report.target.name}
									</span>
								</a>
							{:else if report.targetType === "party" && report.target}
								<a href="/party/{report.target.id}" class="flex items-center gap-3 group">
									<div
										class="size-10 rounded-lg overflow-hidden ring-2 ring-white/5 group-hover:ring-white/20 transition-all"
									>
										<Logo
											src={report.target.logoUrl}
											alt={report.target.name}
											class="size-full"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-slate-600 to-slate-700"
										/>
									</div>
									<div>
										<span class="text-sm text-white group-hover:text-blue-400 transition-colors block">
											{report.target.name}
										</span>
										<span class="text-xs text-gray-500">Political Party</span>
									</div>
								</a>
							{:else if report.targetType === "message" && report.target}
								<div class="space-y-2">
									{#if report.target.sender}
										<div class="flex items-center gap-2">
											<span class="text-xs text-gray-500">From:</span>
											<a href="/user/{report.target.sender.id}" class="text-sm text-blue-400 hover:text-blue-300">
												{report.target.sender.name}
											</a>
										</div>
									{/if}
									<div class="bg-slate-800/50 rounded p-3 border border-white/5">
										<p class="text-sm text-gray-300" class:italic={report.target.isDeleted}>
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
						<div class="bg-slate-700/30 rounded-lg p-3 mb-3">
							<div class="text-xs text-gray-500 font-medium mb-1">Your report:</div>
							<p class="text-sm text-gray-300">{report.reason}</p>
						</div>

						<!-- Review Info -->
						{#if report.status !== "pending"}
							<div class="border-t border-white/5 pt-3 mt-3">
								<div class="flex items-start gap-4">
									<!-- Reviewer -->
									{#if report.reviewer}
										<div class="flex items-center gap-3">
											<a href="/user/{report.reviewer.id}" class="flex items-center gap-2 group">
												<div
													class="size-8 rounded-lg overflow-hidden ring-2 ring-purple-500/30 group-hover:ring-purple-500/50 transition-all"
												>
													<Logo
														src={report.reviewer.logoUrl}
														alt={report.reviewer.name}
														class="size-full"
														placeholderIcon={FluentShield20Filled}
														placeholderGradient="from-purple-600 to-purple-700"
													/>
												</div>
												<div class="min-w-0">
													<span class="text-xs text-gray-500 block">Reviewed by</span>
													<span
														class="text-sm text-purple-300 group-hover:text-purple-400 transition-colors truncate block"
													>
														{report.reviewer.name}
													</span>
												</div>
											</a>
										</div>
									{/if}

									<!-- Review Details -->
									<div class="flex-1 min-w-0">
										{#if report.actionTaken}
											<div class="mb-2">
												<span class="text-xs text-gray-500">Action taken:</span>
												<span class="text-sm text-green-400 ml-2 font-medium">
													{getActionLabel(report.actionTaken)}
												</span>
											</div>
										{/if}
										{#if report.reviewNote}
											<div>
												<span class="text-xs text-gray-500">Moderator note:</span>
												<p class="text-sm text-gray-300 mt-1">{report.reviewNote}</p>
											</div>
										{/if}
										{#if report.reviewedAt}
											<div class="flex items-center gap-1 text-xs text-gray-500 mt-2">
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
		<div class="card bg-slate-800/50 border border-white/5">
			<div class="card-body items-center text-center py-12">
				<div class="size-16 rounded-full flex items-center justify-center bg-gray-600/20 mb-4">
					<FluentDocument20Filled class="size-8 text-gray-400" />
				</div>
				<h3 class="text-xl font-bold text-white">No Reports Filed</h3>
				<p class="text-gray-400 max-w-md">
					You haven't filed any reports yet. If you encounter rule violations, you can report them to the moderation
					team.
				</p>
			</div>
		</div>
	{/if}
</div>
