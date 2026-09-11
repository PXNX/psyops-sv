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
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";
	import { badgeClass } from "$lib/component/ui/styles";

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
				return "from-red-600 to-red-700";
			case "warning":
				return "from-orange-600 to-orange-700";
			case "restriction":
				return "from-red-600 to-red-800";
			case "report_action":
				return "from-blue-600 to-blue-700";
			case "content_flag":
				return "from-amber-500 to-yellow-500";
			default:
				return "from-[#19304b] to-[#102239]";
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

<div class="max-w-5xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div>
		<a href="/moderators/actions" class="text-sm text-[#a89e8e] hover:text-[#f7c56b] transition-colors">
			Moderator Actions
		</a>
		<h1 class="text-2xl font-bold text-[#fff7e8] mt-1">Action #{data.action.id}</h1>
	</div>

	<!-- Action Card -->
	<div class="card bg-gradient-to-br {getActionColor(data.action.type)} border-0 shadow-xl">
		<div class="card-body">
			<div class="flex items-center gap-4">
				<div class="size-16 rounded-xl flex items-center justify-center bg-white/20">
					<ActionIcon class="size-8 text-white" />
				</div>
				<div class="flex-1">
					<h1 class="text-3xl font-bold text-[#fff7e8]">{getActionTitle(data.action.type)}</h1>
				</div>
			</div>
		</div>
	</div>

	<!-- Participants Section -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Target User -->
		{#if data.action.target}
			<div class="card panel">
				<div class="card-body">
					<h3 class="text-sm font-semibold text-[#a89e8e] mb-3">Target User</h3>
					<a href="/user/{data.action.target.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-xl overflow-hidden transition-all">
							<Logo
								src={data.action.target.logoUrl}
								alt={data.action.target.name}
								class="size-full"
								placeholderIcon={FluentPeople20Filled}
								placeholderGradient="from-[#14283f] to-[#102239]"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-[#fff7e8] group-hover:text-[#f7c56b] transition-colors truncate">
								{data.action.target.name}
							</p>
							<p class="text-sm text-[#a89e8e]">Click to view profile</p>
						</div>
					</a>
				</div>
			</div>
		{/if}

		<!-- Moderator -->
		{#if data.action.moderator}
			<div class="card bg-[#14283f]/85 border border-[#b7a0c5]/30">
				<div class="card-body">
					<h3 class="text-sm font-semibold text-[#a89e8e] mb-3">
						{data.action.type === "report_action" ? "Reviewed By" : "Moderator"}
					</h3>
					<a href="/user/{data.action.moderator.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-xl overflow-hidden transition-all">
							<Logo
								src={data.action.moderator.logoUrl}
								alt={data.action.moderator.name}
								class="size-full"
								placeholderIcon={FluentShield20Filled}
								placeholderGradient="from-[#8c709b] to-[#b7a0c5]"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-[#d5c4df] group-hover:text-[#f0e7f5] transition-colors truncate">
								{data.action.moderator.name}
							</p>
							<div class="flex items-center gap-2 mt-1">
								{#if data.action.moderator.role === "admin"}
									<div class="badge badge-xs bg-red-600/20 text-red-400 border-red-500/30">Admin</div>
								{:else if data.action.moderator.role === "moderator"}
									<div class="badge badge-xs bg-[#8c709b]/20 text-[#d5c4df] border-[#b7a0c5]/30">Moderator</div>
								{/if}
							</div>
						</div>
					</a>
				</div>
			</div>
		{/if}

		<!-- Reporter (for report actions) -->
		{#if data.action.type === "report_action" && data.action.reporter}
			<div class="card panel">
				<div class="card-body">
					<h3 class="text-sm font-semibold text-[#a89e8e] mb-3">Reported By</h3>
					<a href="/user/{data.action.reporter.id}" class="flex items-center gap-3 group">
						<div class="size-16 rounded-xl overflow-hidden transition-all">
							<Logo
								src={data.action.reporter.logoUrl}
								alt={data.action.reporter.name}
								class="size-full"
								placeholderIcon={FluentPeople20Filled}
								placeholderGradient="from-[#14283f] to-[#102239]"
							/>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-[#fff7e8] group-hover:text-[#7ba0c8] transition-colors truncate">
								{data.action.reporter.name}
							</p>
							<p class="text-sm text-[#a89e8e]">Original reporter</p>
						</div>
					</a>
				</div>
			</div>
		{/if}
	</div>

	<!-- Action Details -->
	<div class="card panel">
		<div class="card-body">
			<h2 class="card-title text-[#fff7e8] mb-4">
				<FluentInfo20Filled class="size-5" />
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
						<div class="divider"></div>
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Message Content:</p>
							<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
								<p class="text-[#fff7e8]">{data.action.messageContent}</p>
							</div>
						</div>
						{#if data.action.deletionReason}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Deletion Reason:</p>
								<div class="badge badge-sm bg-red-600/20 text-red-400 border-red-500/30">
									{data.action.deletionReason}
								</div>
							</div>
						{/if}
						{#if data.action.deletionNote}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Moderator Note:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
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
							<FluentCalendar20Filled class="size-4 text-orange-400" />
							<span class="text-[#a89e8e]">Issued:</span>
							<span class="text-[#fff7e8]">{formatDate(data.action.issuedAt)}</span>
						</div>
						{#if data.action.reason}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Violation Type:</p>
								<div class="badge badge-sm bg-orange-600/20 text-orange-400 border-orange-500/30">
									{data.action.reason}
								</div>
							</div>
						{/if}
						{#if data.action.description}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Description:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
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
								<div class="badge badge-sm bg-red-600/20 text-red-400 border-red-500/30">
									<FluentWarning20Filled class="size-3 mr-1" />
									Permanent
								</div>
							{:else if data.action.expiresAt}
								<div class="badge badge-sm bg-orange-600/20 text-orange-400 border-orange-500/30">
									<FluentClock20Filled class="size-3 mr-1" />
									Until {formatDate(data.action.expiresAt)}
								</div>
							{/if}
						</div>
						{#if data.action.reason}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Reason:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
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
							<FluentCalendar20Filled class="size-4 text-blue-400" />
							<span class="text-[#a89e8e]">Reported:</span>
							<span class="text-[#fff7e8]">{formatDate(data.action.reportedAt)}</span>
						</div>
						{#if data.action.reviewedAt}
							<div class="flex items-center gap-2 text-sm">
								<FluentCalendar20Filled class="size-4 text-green-400" />
								<span class="text-[#a89e8e]">Reviewed:</span>
								<span class="text-[#fff7e8]">{formatDate(data.action.reviewedAt)}</span>
							</div>
						{/if}
						<div class="flex items-center gap-2">
							<p class="text-sm text-[#a89e8e]">Status:</p>
							{#if data.action.status === "pending"}
								<div class="badge badge-sm bg-orange-600/20 text-orange-400 border-orange-500/30">Pending</div>
							{:else if data.action.status === "resolved"}
								<div class="badge badge-sm bg-green-600/20 text-green-400 border-green-500/30">
									<FluentCheckmark20Filled class="size-3 mr-1" />
									Resolved
								</div>
							{:else if data.action.status === "dismissed"}
								<div class="badge badge-sm bg-[#14283f] text-[#a89e8e] border-[#dfceb0]/20">Dismissed</div>
							{/if}
						</div>
						{#if data.action.violationType}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Violation Type:</p>
								<div class="badge badge-sm bg-red-600/20 text-red-400 border-red-500/30">
									{data.action.violationType}
								</div>
							</div>
						{/if}
						{#if data.action.reportReason}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Report Reason:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
									<p class="text-[#d9ccb7]">{data.action.reportReason}</p>
								</div>
							</div>
						{/if}
						{#if data.action.actionTaken}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Action Taken:</p>
								<div class="badge badge-sm bg-green-600/20 text-green-400 border-green-500/30">
									{data.action.actionTaken}
								</div>
							</div>
						{/if}
						{#if data.action.reviewNote}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Review Note:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
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
								<FluentCalendar20Filled class="size-4 text-green-400" />
								<span class="text-[#a89e8e]">Resolved:</span>
								<span class="text-[#fff7e8]">{formatDate(data.action.resolvedAt)}</span>
							</div>
						{/if}
						<div>
							<p class="text-sm text-[#a89e8e] mb-2">Flag Type:</p>
							<div class={badgeClass({ tone: "amber", size: "sm" })}>
								{data.action.flagType}
							</div>
						</div>
						{#if data.action.reason}
							<div>
								<p class="text-sm text-[#a89e8e] mb-2">Reason:</p>
								<div class="bg-[#102239]/70 rounded-lg p-4 border border-[#dfceb0]/15">
									<p class="text-[#d9ccb7]">{data.action.reason}</p>
								</div>
							</div>
						{/if}
						<div class="flex items-center gap-2">
							<p class="text-sm text-[#a89e8e]">Status:</p>
							{#if data.action.isResolved}
								<div class="badge badge-sm bg-green-600/20 text-green-400 border-green-500/30">
									<FluentCheckmark20Filled class="size-3 mr-1" />
									Resolved
								</div>
							{:else}
								<div class="badge badge-sm bg-orange-600/20 text-orange-400 border-orange-500/30">Active</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
