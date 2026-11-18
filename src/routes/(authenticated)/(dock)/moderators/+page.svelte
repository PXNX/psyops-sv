<!-- src/routes/moderators/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { formatDate } from "#lib/utils/formatting.js";
	import { Button, Badge } from "#lib/component/ui/index.js";

	const { data } = $props();
</script>

<svelte:head>
	<title>Moderators - Game Name</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader documentTitle={false} title="Moderators">
		{#snippet actions()}
			<Button href="/moderators/actions" variant="secondary" size="sm" icon={FluentEye20Filled}>Actions</Button>
			<Button href="/moderators/reports" variant="secondary" size="sm" icon={FluentDocument20Filled}>Reports</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats -->
	<div class="flex items-center gap-4 rounded-sm panel p-5 w-full sm:w-auto sm:inline-flex">
		<div class="size-12 rounded-sm flex items-center justify-center bg-[#8a4fc0]/15 border border-[#c08cf0]/30">
			<FluentShield20Filled class="size-6 text-[#c08cf0]" />
		</div>
		<div>
			<div class="text-3xl font-bold text-[#e3cbfb] leading-none">{data.moderators.length}</div>
			<div class="text-sm text-[#a8a083] mt-1">Total Moderators</div>
		</div>
	</div>

	<!-- Moderators Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.moderators as moderator}
			<div class="panel rounded-sm p-5 hover:border-[#c08cf0]/40 transition-all">
				<div class="flex items-start gap-4">
					<div class="flex-1 min-w-0">
						<UserLink id={moderator.id} name={moderator.name} avatar={moderator.logoUrl} size="md" />
						<div class="mt-1">
							{#if moderator.role === "admin"}
								<Badge tone="red" icon={FluentShield20Filled}>Administrator</Badge>
							{:else}
								<Badge tone="purple" icon={FluentShield20Filled}>Moderator</Badge>
							{/if}
						</div>
						<div class="flex items-center gap-1 text-xs text-[#a8a083] mt-2">
							<FluentCalendar20Filled class="size-3" />
							<span>Since {formatDate(moderator.memberSince)}</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.moderators.length === 0}
		<EmptyState
			icon={FluentShield20Filled}
			title="No Moderators Yet"
			subtitle="There are currently no moderators assigned to the platform."
		/>
	{/if}
</PageContainer>
