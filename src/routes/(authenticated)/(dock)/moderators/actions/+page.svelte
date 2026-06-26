<!-- src/routes/moderators/actions/+page.svelte -->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

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
				return "text-red-400";
			case "warning":
				return "text-orange-400";
			case "restriction":
				return "text-red-500";
			case "report_action":
				return "text-blue-400";
			case "content_flag":
				return "text-yellow-400";
			default:
				return "text-gray-400";
		}
	}

	function getActionLabel(type: string) {
		switch (type) {
			case "message_delete":
				return "Message Deleted";
			case "warning":
				return "Warning Issued";
			case "restriction":
				return "Chat Restricted";
			case "report_action":
				return "Report Resolved";
			case "content_flag":
				return "Content Flagged";
			default:
				return "Action";
		}
	}

	function toggleUserFilter() {
		if (data.filterUserId) {
			goto("/moderators/actions");
		} else if (data.currentUserId) {
			goto(`/moderators/actions?userId=${data.currentUserId}`);
		}
	}

	const isFilteringCurrentUser = $derived(data.filterUserId === data.currentUserId);
</script>

<svelte:head>
	<title>Moderator Actions - Game Name</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<div class="size-12 rounded-xl flex items-center justify-center bg-purple-600/20">
					<FluentShield20Filled class="size-6 text-purple-400" />
				</div>
				Moderator Actions
			</h1>
			<p class="text-gray-400 mt-2">Recent moderation activity on the platform</p>
		</div>
		<div class="flex items-center gap-3">
			{#if data.currentUserId}
				<button
					onclick={toggleUserFilter}
					class="btn gap-2"
					class:btn-primary={isFilteringCurrentUser}
					class:btn-ghost={!isFilteringCurrentUser}
				>
					<FluentFilter20Filled class="size-4" />
					{isFilteringCurrentUser ? "Show All Actions" : "Show My Actions"}
				</button>
			{/if}
			<a href="/moderators" class="btn btn-ghost gap-2">
				<FluentPeople20Filled class="size-4" />
				View Moderators
			</a>
		</div>
	</div>

	<!-- Filter Info -->
	{#if data.filterUserId}
		<div class="alert bg-blue-600/10 border-blue-500/30">
			<FluentFilter20Filled class="size-5 text-blue-400" />
			<div>
				<p class="font-semibold">Filtered View</p>
				<p class="text-sm">
					{#if isFilteringCurrentUser}
						Showing actions against your account only
					{:else}
						Showing actions for a specific user
					{/if}
				</p>
			</div>
			<button onclick={() => goto("/moderators/actions")} class="btn btn-sm btn-ghost">
				<FluentDismissCircle20Filled class="size-4" />
				Clear Filter
			</button>
		</div>
	{/if}

	<!-- Stats -->
	<div class="stats bg-slate-800/50 border border-white/5 shadow-xl w-full">
		<div class="stat">
			<div class="stat-figure text-purple-400">
				<FluentShield20Filled class="size-8" />
			</div>
			<div class="stat-title">Total Actions</div>
			<div class="stat-value text-purple-400">{data.actions.length}</div>
			<div class="stat-desc">Showing most recent 100</div>
		</div>
	</div>

	<!-- Actions List -->
	<div class="space-y-3">
		{#each data.actions as action}
			{@const ActionIcon = getActionIcon(action.type)}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 hover:border-white/10 transition-all">
				<div class="flex items-start gap-4">
					<!-- Action Icon -->
					<div class="shrink-0">
						<div class="size-12 rounded-xl flex items-center justify-center bg-slate-700/50">
							<ActionIcon class="size-6 {getActionColor(action.type)}" />
						</div>
					</div>

					<!-- Action Details -->
					<div class="flex-1 min-w-0">
						<!-- Header -->
						<div class="flex items-center gap-3 mb-3 flex-wrap">
							<span class="badge badge-sm border-0 {getActionColor(action.type)} bg-slate-700/50">
								{getActionLabel(action.type)}
							</span>
							<div class="flex items-center gap-1 text-xs text-gray-500">
								<FluentCalendar20Filled class="size-3" />
								<span>{formatDate(action.timestamp)}</span>
							</div>
						</div>

						<!-- Participants -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
							<!-- Target User -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-gray-500 font-medium min-w-[60px]">Target:</div>
								<a href="/user/{action.target.id}" class="flex items-center gap-2 group">
									<div class="size-8 rounded-lg overflow-hidden transition-all">
										<Logo
											src={action.target.logoUrl}
											alt={action.target.name}
											class="size-full"
											placeholderIcon={FluentPeople20Filled}
											placeholderGradient="from-slate-600 to-slate-700"
										/>
									</div>
									<span class="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
										{action.target.name}
									</span>
								</a>
							</div>

							<!-- Moderator -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-gray-500 font-medium min-w-[60px]">Moderator:</div>
								<a href="/user/{action.moderator.id}" class="flex items-center gap-2 group">
									<div class="size-8 rounded-lg overflow-hidden transition-all">
										<Logo
											src={action.moderator.logoUrl}
											alt={action.moderator.name}
											class="size-full"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-purple-600 to-purple-700"
										/>
									</div>
									<span class="text-sm text-purple-300 group-hover:text-purple-400 transition-colors truncate">
										{action.moderator.name}
									</span>
									{#if action.moderator.role === "admin"}
										<div class="badge badge-xs bg-red-600/20 text-red-400 border-red-500/30">Admin</div>
									{:else if action.moderator.role === "moderator"}
										<div class="badge badge-xs bg-purple-600/20 text-purple-400 border-purple-500/30">Mod</div>
									{/if}
								</a>
							</div>
						</div>

						<!-- Reason & Note -->
						{#if action.reason || action.note}
							<div class="bg-slate-700/30 rounded-lg p-3 space-y-2">
								{#if action.reason}
									<div>
										<span class="text-xs text-gray-500 font-medium">Reason:</span>
										<span class="text-sm text-gray-300 ml-2">{action.reason}</span>
									</div>
								{/if}
								{#if action.note}
									<div>
										<span class="text-xs text-gray-500 font-medium">Note:</span>
										<p class="text-sm text-gray-300 mt-1">{action.note}</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.actions.length === 0}
		<div class="card bg-slate-800/50 border border-white/5">
			<div class="card-body items-center text-center py-12">
				<div class="size-16 rounded-full flex items-center justify-center bg-gray-600/20 mb-4">
					<FluentShield20Filled class="size-8 text-gray-400" />
				</div>
				<h3 class="text-xl font-bold text-white">No Actions Found</h3>
				<p class="text-gray-400 max-w-md">
					{#if data.filterUserId}
						No moderation actions have been taken against this user.
					{:else}
						There are no moderation actions to display yet.
					{/if}
				</p>
			</div>
		</div>
	{/if}
</div>
