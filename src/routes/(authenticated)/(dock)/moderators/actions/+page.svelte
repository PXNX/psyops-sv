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
				return "text-red-400";
			case "warning":
				return "text-orange-400";
			case "restriction":
				return "text-red-500";
			case "report_action":
				return "text-blue-400";
			case "content_flag":
				return "text-[#f7c56b]";
			default:
				return "text-[#a89e8e]";
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
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-[#fff7e8]">Moderator Actions</h1>
		<div class="flex items-center gap-2 flex-wrap">
			{#if data.currentUserId}
				<button
					onclick={toggleUserFilter}
					class="btn btn-sm gap-2"
					class:btn-primary={isFilteringCurrentUser}
					class:btn-ghost={!isFilteringCurrentUser}
				>
					<FluentFilter20Filled class="size-4" />
					{isFilteringCurrentUser ? "Show All" : "My Actions"}
				</button>
			{/if}
			<a href="/moderators" class="btn btn-sm btn-ghost gap-2">
				<FluentPeople20Filled class="size-4" />
				Moderators
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
	<div class="flex items-center gap-4 rounded-2xl panel p-5 w-full sm:w-auto sm:inline-flex">
		<div class="size-12 rounded-xl flex items-center justify-center bg-[#8c709b]/20">
			<FluentShield20Filled class="size-6 text-[#d5c4df]" />
		</div>
		<div>
			<div class="text-3xl font-bold text-[#d5c4df] leading-none">{data.actions.length}</div>
			<div class="text-sm text-[#a89e8e] mt-1">Total Actions</div>
		</div>
	</div>

	<!-- Actions List -->
	<div class="space-y-3">
		{#each data.actions as action}
			{@const ActionIcon = getActionIcon(action.type)}
			<div class="panel rounded-xl p-6 hover:border-[#dfceb0]/25 transition-all">
				<div class="flex items-start gap-4">
					<!-- Action Icon -->
					<div class="shrink-0">
						<div class="size-12 rounded-xl flex items-center justify-center bg-[#102239]/70">
							<ActionIcon class="size-6 {getActionColor(action.type)}" />
						</div>
					</div>

					<!-- Action Details -->
					<div class="flex-1 min-w-0">
						<!-- Header -->
						<div class="flex items-center gap-3 mb-3 flex-wrap">
							<span class="badge badge-sm border-0 {getActionColor(action.type)} bg-[#102239]/70">
								{getActionLabel(action.type)}
							</span>
							<div class="flex items-center gap-1 text-xs text-[#a89e8e]">
								<FluentCalendar20Filled class="size-3" />
								<span>{formatDate(action.timestamp)}</span>
							</div>
						</div>

						<!-- Participants -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
							<!-- Target User -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-[#a89e8e] font-medium min-w-[60px]">Target:</div>
								<a href="/user/{action.target.id}" class="flex items-center gap-2 group flex-1 min-w-0">
									<div class="size-8 rounded-lg overflow-hidden transition-all">
										<Logo
											src={action.target.logoUrl}
											alt={action.target.name}
											class="size-full"
											placeholderIcon={FluentPeople20Filled}
											placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
										/>
									</div>
									<span class="text-sm text-[#fff7e8] group-hover:text-[#d5c4df] transition-colors truncate">
										{action.target.name}
									</span>
								</a>
							</div>

							<!-- Moderator -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-[#a89e8e] font-medium min-w-[60px]">Moderator:</div>
								<a href="/user/{action.moderator.id}" class="flex items-center gap-2 group flex-1 min-w-0">
									<div class="size-8 rounded-lg overflow-hidden transition-all">
										<Logo
											src={action.moderator.logoUrl}
											alt={action.moderator.name}
											class="size-full"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-[#8c709b] to-[#6a5578]"
										/>
									</div>
									<span class="text-sm text-[#d5c4df] group-hover:text-[#f0e7f5] transition-colors truncate">
										{action.moderator.name}
									</span>
									{#if action.moderator.role === "admin"}
										<div class={badgeClass({ tone: "red", size: "xs" })}>Admin</div>
									{:else if action.moderator.role === "moderator"}
										<div class={badgeClass({ tone: "purple", size: "xs" })}>Mod</div>
									{/if}
								</a>
							</div>
						</div>

						<!-- Reason & Note -->
						{#if action.reason || action.note}
							<div class="bg-[#102239]/60 rounded-lg p-3 space-y-2">
								{#if action.reason}
									<div>
										<span class="text-xs text-[#a89e8e] font-medium">Reason:</span>
										<span class="text-sm text-[#d9ccb7] ml-2">{action.reason}</span>
									</div>
								{/if}
								{#if action.note}
									<div>
										<span class="text-xs text-[#a89e8e] font-medium">Note:</span>
										<p class="text-sm text-[#d9ccb7] mt-1">{action.note}</p>
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
		<div class="card panel">
			<div class="card-body items-center text-center py-12">
				<div class="size-16 rounded-full flex items-center justify-center bg-[#14283f] mb-4">
					<FluentShield20Filled class="size-8 text-[#a89e8e]" />
				</div>
				<h3 class="text-xl font-bold text-[#fff7e8]">No Actions Found</h3>
				<p class="text-[#a89e8e] max-w-md">
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
