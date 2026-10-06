<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentFilter20Filled from "~icons/fluent/filter-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

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
				return "text-[#ffd35c]";
			case "restriction":
				return "text-red-400";
			case "report_action":
				return "text-[#5eaef5]";
			case "content_flag":
				return "text-[#ffd35c]";
			default:
				return "text-[#a8a083]";
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

<!-- src/routes/moderators/actions/+page.svelte -->
<svelte:head><title>Moderator Actions - Game Name</title></svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader title="Moderator Actions">
		{#snippet actions()}
			{#if data.currentUserId}
				<Button
					size="sm"
					variant={isFilteringCurrentUser ? "primary" : "ghost"}
					icon={FluentFilter20Filled}
					onclick={toggleUserFilter}
				>
					{isFilteringCurrentUser ? "Show All" : "My Actions"}
				</Button>
			{/if}
			<Button href="/moderators" size="sm" variant="ghost" icon={FluentPeople20Filled}>Moderators</Button>
		{/snippet}
	</PageHeader>

	<!-- Filter Info -->
	{#if data.filterUserId}
		<div
			class="bg-[#2369b5]/18 border border-[#5eaef5]/30 text-[#b3dcff] rounded-sm p-4 flex flex-wrap items-center gap-3"
		>
			<FluentFilter20Filled class="size-5 text-[#5eaef5] shrink-0" />
			<div class="flex-1 min-w-0">
				<p class="font-semibold">Filtered View</p>
				<p class="text-sm">
					{#if isFilteringCurrentUser}
						Showing actions against your account only
					{:else}
						Showing actions for a specific user
					{/if}
				</p>
			</div>
			<Button size="sm" variant="ghost" icon={FluentDismissCircle20Filled} onclick={() => goto("/moderators/actions")}>
				Clear Filter
			</Button>
		</div>
	{/if}

	<!-- Stats -->
	<div class="flex items-center gap-4 rounded-sm panel p-5 w-full sm:w-auto sm:inline-flex">
		<div class="size-12 rounded-sm flex items-center justify-center bg-[#8a4fc0]/15 border border-[#c08cf0]/30">
			<FluentShield20Filled class="size-6 text-[#c08cf0]" />
		</div>
		<div>
			<div class="text-3xl font-bold text-[#e3cbfb] leading-none">{data.actions.length}</div>
			<div class="text-sm text-[#a8a083] mt-1">Total Actions</div>
		</div>
	</div>

	<!-- Actions List -->
	<div class="space-y-3">
		{#each data.actions as action}
			{@const ActionIcon = getActionIcon(action.type)}
			<div class="panel rounded-sm p-5 hover:border-[#c8b47a]/25 transition-all">
				<div class="flex items-start gap-4">
					<!-- Action Icon -->
					<div class="shrink-0">
						<div class="size-12 rounded-sm flex items-center justify-center panel-muted">
							<ActionIcon class="size-6 {getActionColor(action.type)}" />
						</div>
					</div>

					<!-- Action Details -->
					<div class="flex-1 min-w-0">
						<!-- Header -->
						<div class="flex items-center gap-3 mb-3 flex-wrap">
							<span
								class="badge badge-sm rounded-sm border border-[#c8b47a]/15 {getActionColor(
									action.type
								)} bg-[#1a1f15]/70"
							>
								{getActionLabel(action.type)}
							</span>
							<div class="flex items-center gap-1 text-xs text-[#a8a083]">
								<FluentCalendar20Filled class="size-3" />
								<span>{formatDate(action.timestamp)}</span>
							</div>
						</div>

						<!-- Participants -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
							<!-- Target User -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-[#a8a083] font-medium min-w-[60px]">Target:</div>
								<a href="/user/{action.target.id}" class="flex items-center gap-2 group flex-1 min-w-0">
									<div class="size-8 rounded-sm overflow-hidden transition-all">
										<Logo
											src={action.target.logoUrl}
											alt={action.target.name}
											class="size-full"
											placeholderIcon={FluentPeople20Filled}
											placeholderGradient="from-[#4a5238] to-[#252b1e]"
										/>
									</div>
									<span class="text-sm text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
										{action.target.name}
									</span>
								</a>
							</div>

							<!-- Moderator -->
							<div class="flex items-center gap-3">
								<div class="text-xs text-[#a8a083] font-medium min-w-[60px]">Moderator:</div>
								<a href="/user/{action.moderator.id}" class="flex items-center gap-2 group flex-1 min-w-0">
									<div class="size-8 rounded-sm overflow-hidden transition-all">
										<Logo
											src={action.moderator.logoUrl}
											alt={action.moderator.name}
											class="size-full"
											placeholderIcon={FluentShield20Filled}
											placeholderGradient="from-[#8a4fc0] to-[#6b3d96]"
										/>
									</div>
									<span class="text-sm text-[#e3cbfb] group-hover:text-[#ffcf47] transition-colors truncate">
										{action.moderator.name}
									</span>
									{#if action.moderator.role === "admin"}
										<Badge tone="red" size="xs">Admin</Badge>
									{:else if action.moderator.role === "moderator"}
										<Badge tone="purple" size="xs">Mod</Badge>
									{/if}
								</a>
							</div>
						</div>

						<!-- Reason & Note -->
						{#if action.reason || action.note}
							<div class="panel-muted rounded-sm p-3 space-y-2">
								{#if action.reason}
									<div>
										<span class="text-xs text-[#a8a083] font-medium">Reason:</span>
										<span class="text-sm text-[#d3caa9] ml-2">{action.reason}</span>
									</div>
								{/if}
								{#if action.note}
									<div>
										<span class="text-xs text-[#a8a083] font-medium">Note:</span>
										<p class="text-sm text-[#d3caa9] mt-1">{action.note}</p>
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
		<EmptyState
			icon={FluentShield20Filled}
			title="No Actions Found"
			subtitle={data.filterUserId
				? "No moderation actions have been taken against this user."
				: "There are no moderation actions to display yet."}
		/>
	{/if}
</PageContainer>
