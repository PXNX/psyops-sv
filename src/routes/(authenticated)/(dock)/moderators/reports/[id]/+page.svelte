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
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case "pending":
				return "from-orange-600 to-orange-700";
			case "resolved":
				return "from-green-600 to-green-700";
			case "dismissed":
				return "from-gray-600 to-gray-700";
			default:
				return "from-gray-600 to-gray-700";
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

<div class="max-w-5xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a href="/moderators/reports" class="btn btn-ghost btn-sm gap-2"> ← Back to My Reports </a>
	</div>

	<!-- Status Card -->
	<div class="card bg-gradient-to-br {getStatusColor(data.report.status)} border-0 shadow-xl">
		<div class="card-body">
			<div class="flex items-center gap-4">
				<div class="size-16 rounded-xl flex items-center justify-center bg-white/20">
					<StatusIcon class="size-8 text-white" />
				</div>
				<div class="flex-1">
					<h1 class="text-3xl font-bold text-white">{getStatusTitle(data.report.status)}</h1>
					<p class="text-white/80 mt-1">Report ID: #{data.report.id}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="card bg-slate-800/50 border border-white/5 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-white mb-4">
				<FluentCalendar20Filled class="size-5" />
				Timeline
			</h2>
			<ul class="timeline timeline-vertical">
				<li>
					<div class="timeline-start text-sm text-gray-400">{formatDate(data.report.reportedAt)}</div>
					<div class="timeline-middle">
						<div class="size-4 rounded-full bg-blue-500"></div>
					</div>
					<div class="timeline-end timeline-box bg-blue-600/10 border-blue-500/30">
						<div class="font-semibold text-blue-400">Report Filed</div>
						<div class="text-sm text-gray-300">You submitted this report</div>
					</div>
					<hr class="bg-blue-500" />
				</li>
				{#if data.report.reviewedAt}
					<li>
						<hr class="bg-green-500" />
						<div class="timeline-start text-sm text-gray-400">{formatDate(data.report.reviewedAt)}</div>
						<div class="timeline-middle">
							<div class="size-4 rounded-full bg-green-500"></div>
						</div>
						<div class="timeline-end timeline-box bg-green-600/10 border-green-500/30">
							<div class="font-semibold text-green-400">
								{data.report.status === "resolved" ? "Resolved" : "Reviewed"}
							</div>
							{#if data.report.reviewer}
								<div class="text-sm text-gray-300">By {data.report.reviewer.name}</div>
							{/if}
						</div>
					</li>
				{:else}
					<li>
						<hr class="bg-orange-500" />
						<div class="timeline-start"></div>
						<div class="timeline-middle">
							<div class="size-4 rounded-full bg-orange-500 animate-pulse"></div>
						</div>
						<div class="timeline-end timeline-box bg-orange-600/10 border-orange-500/30">
							<div class="font-semibold text-orange-400">Awaiting Review</div>
							<div class="text-sm text-gray-300">A moderator will review this soon</div>
						</div>
					</li>
				{/if}
			</ul>
		</div>
	</div>

	<!-- Reported Target -->
	<div class="card bg-slate-800/50 border border-white/5 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-white mb-4">
				<TargetIcon class="size-5" />
				Reported {data.report.targetType === "account"
					? "User"
					: data.report.targetType === "party"
						? "Party"
						: "Message"}
			</h2>

			{#if data.report.target}
				<div class="bg-slate-700/30 rounded-lg p-4">
					{#if data.report.targetType === "account"}
						<a href="/user/{data.report.target.id}" class="flex items-center gap-3 group">
							<div
								class="size-16 rounded-xl overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all"
							>
								<Logo
									src={data.report.target.logoUrl}
									alt={data.report.target.name}
									class="size-full"
									placeholderIcon={FluentPeople20Filled}
									placeholderGradient="from-slate-600 to-slate-700"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
									{data.report.target.name}
								</p>
								<p class="text-sm text-gray-400">Click to view profile</p>
							</div>
						</a>
					{:else if data.report.targetType === "party"}
						<a href="/party/{data.report.target.id}" class="flex items-center gap-3 group">
							<div
								class="size-16 rounded-xl overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all"
							>
								<Logo
									src={data.report.target.logoUrl}
									alt={data.report.target.name}
									class="size-full"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-slate-600 to-slate-700"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
									{data.report.target.name}
								</p>
								<p class="text-sm text-gray-400">Political Party</p>
							</div>
						</a>
					{:else if data.report.targetType === "message"}
						<div class="space-y-3">
							{#if data.report.target.sender}
								<div class="flex items-center gap-2">
									<span class="text-sm text-gray-400">From:</span>
									<a href="/user/{data.report.target.sender.id}" class="flex items-center gap-2 group">
										<div
											class="size-8 rounded-lg overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all"
										>
											<Logo
												src={data.report.target.sender.logoUrl}
												alt={data.report.target.sender.name}
												class="size-full"
												placeholderIcon={FluentPeople20Filled}
												placeholderGradient="from-slate-600 to-slate-700"
											/>
										</div>
										<span class="text-sm text-blue-400 group-hover:text-blue-300">
											{data.report.target.sender.name}
										</span>
									</a>
								</div>
							{/if}
							{#if data.report.target.sentAt}
								<div class="flex items-center gap-2 text-sm text-gray-400">
									<FluentCalendar20Filled class="size-4" />
									<span>Sent {formatDate(data.report.target.sentAt)}</span>
								</div>
							{/if}
							<div class="bg-slate-800/50 rounded-lg p-4 border border-white/5">
								<p class="text-gray-300" class:italic={data.report.target.isDeleted}>
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
				<div class="alert alert-warning bg-orange-600/10 border-orange-500/30">
					<FluentWarning20Filled class="size-5" />
					<span>Target information is no longer available</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Report Details -->
	<div class="card bg-slate-800/50 border border-white/5 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-white mb-4">
				<FluentInfo20Filled class="size-5" />
				Report Details
			</h2>

			<div class="space-y-4">
				<!-- Violation Type -->
				<div>
					<p class="text-sm text-gray-400 mb-2">Violation Type:</p>
					<div class="badge badge-lg bg-red-600/20 text-red-400 border-red-500/30">
						{getViolationLabel(data.report.violationType)}
					</div>
				</div>

				<!-- Your Report -->
				<div>
					<p class="text-sm text-gray-400 mb-2">Your Report:</p>
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<p class="text-gray-300">{data.report.reason}</p>
					</div>
				</div>

				<!-- Review Information -->
				{#if data.report.status !== "pending"}
					<div class="divider"></div>

					<h3 class="font-semibold text-white flex items-center gap-2 mt-4">
						<FluentShield20Filled class="size-5 text-purple-400" />
						Moderator Review
					</h3>

					{#if data.report.reviewer}
						<div class="flex items-center gap-3 mt-3">
							<a href="/user/{data.report.reviewer.id}" class="flex items-center gap-3 group">
								<div
									class="size-12 rounded-xl overflow-hidden ring-2 ring-purple-500/30 group-hover:ring-purple-500/50 transition-all"
								>
									<Logo
										src={data.report.reviewer.logoUrl}
										alt={data.report.reviewer.name}
										class="size-full"
										placeholderIcon={FluentShield20Filled}
										placeholderGradient="from-purple-600 to-purple-700"
									/>
								</div>
								<div class="min-w-0">
									<p class="text-sm text-gray-400">Reviewed by</p>
									<p class="font-semibold text-purple-300 group-hover:text-purple-400 transition-colors truncate">
										{data.report.reviewer.name}
									</p>
								</div>
							</a>
						</div>
					{/if}

					{#if data.report.actionTaken}
						<div class="mt-4">
							<p class="text-sm text-gray-400 mb-2">Action Taken:</p>
							<div class="badge badge-lg bg-green-600/20 text-green-400 border-green-500/30">
								<FluentCheckmark20Filled class="size-4 mr-1" />
								{getActionLabel(data.report.actionTaken)}
							</div>
						</div>
					{/if}

					{#if data.report.reviewNote}
						<div class="mt-4">
							<p class="text-sm text-gray-400 mb-2">Moderator's Note:</p>
							<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
								<p class="text-gray-300">{data.report.reviewNote}</p>
							</div>
						</div>
					{/if}
				{:else}
					<div class="alert bg-orange-600/10 border-orange-500/30">
						<FluentClock20Filled class="size-5 text-orange-400" />
						<div>
							<h3 class="font-bold">Pending Review</h3>
							<p class="text-sm">A moderator will review your report soon. You'll be able to see the outcome here.</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
