<script lang="ts">
	import { enhance } from "$app/forms";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDismissCircle20Filled from "~icons/fluent/dismiss-circle-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDate, formatDateTime } from "#lib/utils/formatting.js";
	import { VIOLATION_LABELS } from "#lib/utils/moderation.js";

	let { data, form } = $props();

	const reasons = Object.entries(VIOLATION_LABELS);
	let role = $state("user");
	let warningReason = $state("spam");
	let warningNote = $state("");
	let restrictionDays = $state("7");
	let permanent = $state(false);
	let restrictionReason = $state("");

	$effect(() => {
		if (data.selected) role = data.selected.role;
	});

	const roleTone = (value: string) => (value === "admin" ? "red" : value === "moderator" ? "purple" : "neutral");
</script>

<svelte:head><title>Users & roles · Admin · PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<PageHeader
		title="Users & roles"
		subtitle="Find a player and manage their role, moderation state and flagged content."
		icon={FluentPeople20Filled}
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
			<p>{form.message || "Done."}</p>
		</div>
	{/if}

	<form method="GET" class="relative">
		<FluentSearch20Filled class="size-5 text-fg-muted absolute left-4 top-1/2 -translate-y-1/2" />
		<input
			type="search"
			name="q"
			value={data.query}
			placeholder="Search by name or email…"
			class="field-control rounded-sm pl-12 pr-32 py-3 w-full"
		/>
		<Button type="submit" variant="primary" class="absolute right-2 top-1/2 -translate-y-1/2">Search</Button>
	</form>

	<div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
		<!-- Results -->
		<div class="panel rounded-sm overflow-hidden lg:col-span-2">
			<div class="px-4 py-3 border-b border-line/15 flex items-center justify-between">
				<h2 class="section-title">Players</h2>
				<span class="text-xs text-fg-muted">{data.users.length} shown</span>
			</div>
			{#if data.users.length}
				<div class="divide-y divide-line/10 max-h-[70vh] overflow-y-auto">
					{#each data.users as user}
						<a
							href="/admin/users?q={encodeURIComponent(data.query)}&id={user.id}"
							class="flex items-center gap-3 p-4 hover:bg-surface-5/50 transition-colors {data.selected?.id === user.id
								? 'bg-primary/10 border-l-2 border-primary'
								: ''}"
						>
							{#if user.logoUrl}
								<img src={user.logoUrl} alt="" class="size-10 rounded-full shrink-0" loading="lazy" />
							{:else}
								<div class="size-10 rounded-full bg-surface-4 shrink-0"></div>
							{/if}
							<div class="flex-1 min-w-0">
								<p class="font-medium text-fg truncate">{user.name ?? "Unknown user"}</p>
								<p class="text-xs text-fg-muted truncate">{user.email}</p>
								<div class="flex gap-1.5 mt-1 flex-wrap">
									<Badge tone={roleTone(user.role) as any} size="xs">{user.role}</Badge>
									{#if user.warnings > 0}<Badge tone="amber" size="xs">{user.warnings} ⚠</Badge>{/if}
									{#if user.restricted}<Badge tone="red" size="xs">Restricted</Badge>{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<EmptyState icon={FluentSearch20Filled} title="No players found" subtitle="Try a different name or email." />
			{/if}
		</div>

		<!-- Detail -->
		<div class="lg:col-span-3 space-y-4">
			{#if data.selected}
				<div class="panel rounded-sm p-5">
					<div class="flex items-center gap-4 mb-5">
						{#if data.selected.logoUrl}
							<img src={data.selected.logoUrl} alt="" class="size-14 rounded-full" />
						{:else}
							<div class="size-14 rounded-full bg-surface-4"></div>
						{/if}
						<div class="min-w-0">
							<h2 class="text-xl font-bold text-fg truncate">{data.selected.name}</h2>
							<p class="text-sm text-fg-muted">{data.selected.email}</p>
							<p class="text-xs text-fg-muted flex items-center gap-1 mt-1">
								<FluentCalendar20Filled class="size-3" /> Joined {formatDate(data.selected.createdAt)}
							</p>
						</div>
						<Badge tone={roleTone(data.selected.role) as any} class="ml-auto">{data.selected.role}</Badge>
					</div>

					{#if data.selected.restriction?.active}
						<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4 mb-5">
							<p class="font-semibold text-red-300 flex items-center gap-2">
								<FluentDismissCircle20Filled class="size-5" /> Currently restricted
							</p>
							<p class="text-sm text-fg-soft mt-1">{data.selected.restriction.reason}</p>
							{#if data.selected.restriction.expiresAt}
								<p class="text-xs text-fg-muted mt-1">Until {formatDateTime(data.selected.restriction.expiresAt)}</p>
							{/if}
						</div>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] text-fg-muted uppercase">Warnings</p>
							<p class="text-2xl font-bold">{data.selected.warnings.length}</p>
						</div>
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] text-fg-muted uppercase">Reports filed</p>
							<p class="text-2xl font-bold">{data.selected.reportsFiled}</p>
						</div>
						<div class="panel-muted rounded-sm p-3">
							<p class="text-[10px] text-fg-muted uppercase">Open flags</p>
							<p class="text-2xl font-bold">{data.selected.flags.filter((f) => !f.isResolved).length}</p>
						</div>
					</div>

					<!-- Role -->
					<section class="border-t border-line/15 pt-5">
						<h3 class="section-title mb-3">Account role</h3>
						<form
							method="POST"
							action="?/setRole"
							use:enhance
							use:confirmSubmit={{ title: "Change this role?", body: `${data.selected.name} will become ${role}.` }}
							class="flex items-end gap-2"
						>
							<input type="hidden" name="userId" value={data.selected.id} />
							<div class="flex-1">
								<label class="field-label" for="role">Role</label>
								<select id="role" name="role" bind:value={role} class="field-control rounded-sm px-3 py-2.5 w-full">
									<option value="user">User</option>
									<option value="moderator">Moderator</option>
									<option value="admin">Administrator</option>
								</select>
							</div>
							<Button
								type="submit"
								variant="secondary"
								icon={FluentShield20Filled}
								disabled={role === data.selected.role || data.selected.id === data.currentUserId}
							>
								Apply
							</Button>
						</form>
						{#if data.selected.id === data.currentUserId}
							<p class="text-xs text-fg-muted mt-2">You cannot change your own role.</p>
						{/if}
					</section>

					<!-- Warning -->
					<section class="border-t border-line/15 pt-5 mt-5">
						<h3 class="section-title mb-3">Issue a warning</h3>
						<form method="POST" action="?/warn" use:enhance class="space-y-3">
							<input type="hidden" name="userId" value={data.selected.id} />
							<div>
								<label class="field-label" for="warnReason">Reason</label>
								<select id="warnReason" name="reason" bind:value={warningReason} class="field-control rounded-sm px-3 py-2.5 w-full">
									{#each reasons as [value, label]}
										<option {value}>{label}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="field-label" for="warnNote">Note (visible to the user)</label>
								<textarea
									id="warnNote"
									name="note"
									bind:value={warningNote}
									rows="2"
									class="field-control rounded-sm px-3 py-2.5 w-full"
									placeholder="Explain what needs to change…"
								></textarea>
							</div>
							<Button type="submit" variant="soft-amber" icon={FluentWarning20Filled}>Issue warning</Button>
						</form>
						<p class="text-xs text-fg-muted mt-2">Three warnings automatically apply a 7-day chat restriction.</p>
					</section>

					<!-- Restriction -->
					<section class="border-t border-line/15 pt-5 mt-5">
						<h3 class="section-title mb-3">Chat restriction</h3>
						<form
							method="POST"
							action="?/restrict"
							use:enhance
							use:confirmSubmit={{ title: "Apply restriction?", body: "The user will be notified.", danger: true }}
							class="space-y-3"
						>
							<input type="hidden" name="userId" value={data.selected.id} />
							<input type="hidden" name="permanent" value={String(permanent)} />
							<div>
								<label class="field-label" for="restrictReason">Reason</label>
								<input
									id="restrictReason"
									name="reason"
									bind:value={restrictionReason}
									class="field-control rounded-sm px-3 py-2.5 w-full"
									placeholder="Why is this restriction needed?"
								/>
							</div>
							<div class="flex flex-wrap items-end gap-3">
								<div class="w-32">
									<label class="field-label" for="days">Days</label>
									<input
										id="days"
										type="number"
										name="days"
										min="1"
										bind:value={restrictionDays}
										disabled={permanent}
										class="field-control rounded-sm px-3 py-2.5 w-full"
									/>
								</div>
								<label class="flex items-center gap-2 pb-2.5 cursor-pointer">
									<input type="checkbox" bind:checked={permanent} class="checkbox checkbox-error" />
									<span class="text-sm text-fg-soft">Permanent</span>
								</label>
								<Button
									type="submit"
									variant="danger"
									icon={FluentDismissCircle20Filled}
								>
									Restrict
								</Button>
							</div>
						</form>
						{#if data.selected.restriction}
							<form method="POST" action="?/liftRestriction" use:enhance class="mt-3">
								<input type="hidden" name="userId" value={data.selected.id} />
								<Button type="submit" size="sm" variant="secondary" icon={FluentCheckmark20Filled}>Lift restriction</Button>
							</form>
						{/if}
					</section>

					<!-- Content -->
					<section class="border-t border-line/15 pt-5 mt-5">
						<h3 class="section-title mb-3">Flagged content</h3>
						<div class="flex flex-wrap gap-2">
							<form
								method="POST"
								action="?/resetName"
								use:enhance
								use:confirmSubmit={{ title: "Reset this name?", body: "The user must pick a new one.", danger: true }}
							>
								<input type="hidden" name="userId" value={data.selected.id} />
								<Button
									type="submit"
									size="sm"
									variant="secondary"
									icon={FluentEdit20Filled}
								>
									Reset name
								</Button>
							</form>
							<form
								method="POST"
								action="?/resetLogo"
								use:enhance
								use:confirmSubmit={{ title: "Reset this logo?", body: "The user must upload a new one.", danger: true }}
							>
								<input type="hidden" name="userId" value={data.selected.id} />
								<Button
									type="submit"
									size="sm"
									variant="secondary"
									icon={FluentImageOff20Filled}
									disabled={!data.selected.logoUrl}
								>
									Reset logo
								</Button>
							</form>
						</div>
					</section>

					<!-- History -->
					{#if data.selected.warnings.length}
						<section class="border-t border-line/15 pt-5 mt-5">
							<h3 class="section-title mb-3">Warning history</h3>
							<div class="space-y-2">
								{#each data.selected.warnings as warning}
									<div class="panel-muted rounded-sm p-3">
										<div class="flex items-center justify-between gap-2 flex-wrap">
											<Badge tone="amber" size="xs">{VIOLATION_LABELS[warning.reason] ?? warning.reason}</Badge>
											<span class="text-xs text-fg-muted">{formatDateTime(warning.issuedAt)} · by {warning.issuerName}</span>
										</div>
										<p class="text-sm text-fg-soft mt-2">{warning.description}</p>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>
			{:else}
				<EmptyState
					icon={FluentPeople20Filled}
					title="Select a player"
					subtitle="Search above, then choose a player to see their account and moderation tools."
				/>
			{/if}
		</div>
	</div>
</PageContainer>
