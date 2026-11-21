<script lang="ts">
	import { enhance } from "$app/forms";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentOrganization20Filled from "~icons/fluent/organization-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDateTime } from "#lib/utils/formatting.js";

	let { data, form } = $props();

	const tabs = [
		{ value: "pending", label: "Pending", count: data.pendingCount },
		{ value: "resolved", label: "Resolved", count: data.resolvedCount },
		{ value: "all", label: "All", count: data.pendingCount + data.resolvedCount }
	];
</script>

<svelte:head><title>Content flags · Admin · PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Content flags"
		subtitle="Resolve name and logo reports submitted by the moderation team."
		icon={FluentFlag20Filled}
		backHref="/admin"
		backLabel="Admin overview"
	/>

	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 shrink-0" />
			<p>{form.error}</p>
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 shrink-0" />
			<p>{form.message || "Flag updated."}</p>
		</div>
	{/if}

	<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Pending</p>
			<p class="text-2xl font-bold text-primary-fg mt-1">{data.pendingCount}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Resolved</p>
			<p class="text-2xl font-bold text-positive mt-1">{data.resolvedCount}</p>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<p class="text-[10px] text-fg-muted uppercase tracking-wide">Shown here</p>
			<p class="text-2xl font-bold mt-1">{data.flags.length}</p>
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each tabs as tab}
			<Button href={`/admin/flags?status=${tab.value}`} size="sm" variant={data.status === tab.value ? "soft-amber" : "subtle"}>
				{tab.label} ({tab.count})
			</Button>
		{/each}
	</div>

	<div class="space-y-3">
		{#each data.flags as flag (flag.id)}
			<div class="panel rounded-sm p-5">
				<div class="flex items-start gap-4">
					<div class="size-11 rounded-sm panel-muted flex items-center justify-center shrink-0">
						{#if flag.targetType === "party"}
							<FluentOrganization20Filled class="size-5 text-primary-fg" />
						{:else}
							<FluentPerson20Filled class="size-5 text-primary-fg" />
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap mb-2">
							<Badge tone="red">{flag.flagType === "logo" ? "Logo" : "Name"} flagged</Badge>
							{#if flag.isResolved}
								<Badge tone="green" icon={FluentCheckmark20Filled}>Resolved</Badge>
							{:else}
								<Badge tone="amber">Pending</Badge>
							{/if}
							<span class="text-xs text-fg-muted flex items-center gap-1">
								<FluentCalendar20Filled class="size-3" /> {formatDateTime(flag.flaggedAt)}
							</span>
						</div>

						<p class="text-sm text-fg-soft mb-2">
							Target:
							{#if flag.target}
								<span class="font-semibold">{flag.target.name}</span>
								{#if flag.targetType === "account"}
									<a class="text-primary-fg hover:underline ml-1" href="/admin/users?id={flag.targetId}">Manage →</a>
								{/if}
							{:else}
								<span class="text-fg-muted">Unavailable</span>
							{/if}
						</p>

						<div class="panel-muted rounded-sm p-3">
							<p class="text-sm text-fg-soft whitespace-pre-wrap">{flag.reason}</p>
						</div>
						<p class="text-xs text-fg-muted mt-2">Flagged by {flag.flaggerName}</p>

						<div class="flex gap-2 mt-4">
							{#if !flag.isResolved}
								<form
									method="POST"
									action="?/resolve"
									use:enhance
									use:confirmSubmit={{ title: "Resolve this flag?", body: "The user will be notified that their content was reviewed." }}
								>
									<input type="hidden" name="flagId" value={flag.id} />
									<Button type="submit" size="sm" variant="primary" icon={FluentCheckmark20Filled}>Resolve flag</Button>
								</form>
							{:else}
								<form method="POST" action="?/reopen" use:enhance>
									<input type="hidden" name="flagId" value={flag.id} />
									<Button type="submit" size="sm" variant="secondary" icon={FluentDismiss20Filled}>Reopen</Button>
								</form>
							{/if}
							{#if flag.targetType === "account"}
								<Button
									href="/admin/users?id={flag.targetId}"
									size="sm"
									variant="ghost"
									icon={FluentEdit20Filled}
								>
									Open user tools
								</Button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<EmptyState
				icon={FluentCheckmark20Filled}
				title={data.status === "pending" ? "No pending flags" : "No flags to show"}
				subtitle={data.status === "pending"
					? "All reported names and logos have been reviewed."
					: "Try a different status filter."}
			/>
		{/each}
	</div>
</PageContainer>
