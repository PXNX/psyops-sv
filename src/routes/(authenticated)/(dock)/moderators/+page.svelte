<!-- src/routes/moderators/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import Logo from "#lib/component/Logo.svelte";
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
	<PageHeader title="Moderators">
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
					<!-- Avatar -->
					<a href="/user/{moderator.id}" class="shrink-0">
						<div class="relative">
							<div class="size-16 rounded-sm overflow-hidden transition-all">
								<Logo
									src={moderator.logoUrl}
									alt={moderator.name}
									class="size-full"
									placeholderIcon={FluentPeople20Filled}
									placeholderGradient="from-[#8a4fc0] to-[#6b3d96]"
								/>
							</div>
							<!-- Role Badge -->
							<div
								class="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center shadow-lg ring-2 ring-[#242a1d] {moderator.role ===
								'admin'
									? 'bg-red-600'
									: 'bg-[#8a4fc0]'}"
							>
								<FluentShield20Filled class="size-4 text-[#f5efd8]" />
							</div>
						</div>
					</a>

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<a href="/user/{moderator.id}" class="block group">
							<h3 class="font-bold text-[#f5efd8] truncate group-hover:text-[#ffcf47] transition-colors">
								{moderator.name}
							</h3>
						</a>
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
