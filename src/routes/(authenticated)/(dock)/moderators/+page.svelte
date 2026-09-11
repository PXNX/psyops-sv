<!-- src/routes/moderators/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";
	import { buttonClass, badgeClass } from "$lib/component/ui/styles";

	const { data } = $props();
</script>

<svelte:head>
	<title>Moderators - Game Name</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-[#fff7e8]">Moderators</h1>
		<div class="flex items-center gap-2 flex-wrap">
			<a href="/moderators/actions" class={buttonClass({ variant: "secondary", size: "sm" })}>
				<FluentEye20Filled class="size-4" />
				Actions
			</a>
			<a href="/moderators/reports" class={buttonClass({ variant: "secondary", size: "sm" })}>
				<FluentDocument20Filled class="size-4" />
				Reports
			</a>
		</div>
	</div>

	<!-- Stats -->
	<div class="flex items-center gap-4 rounded-2xl panel p-5 w-full sm:w-auto sm:inline-flex">
		<div class="size-12 rounded-xl flex items-center justify-center bg-[#8c709b]/20">
			<FluentShield20Filled class="size-6 text-[#d5c4df]" />
		</div>
		<div>
			<div class="text-3xl font-bold text-[#d5c4df] leading-none">{data.moderators.length}</div>
			<div class="text-sm text-[#a89e8e] mt-1">Total Moderators</div>
		</div>
	</div>

	<!-- Moderators Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.moderators as moderator}
			<div class="card panel hover:border-[#b7a0c5]/40 transition-all">
				<div class="card-body">
					<div class="flex items-start gap-4">
						<!-- Avatar -->
						<a href="/user/{moderator.id}" class="shrink-0">
							<div class="relative">
								<div class="size-16 rounded-xl overflow-hidden transition-all">
									<Logo
										src={moderator.logoUrl}
										alt={moderator.name}
										class="size-full"
										placeholderIcon={FluentPeople20Filled}
										placeholderGradient="from-[#8c709b] to-[#6a5578]"
									/>
								</div>
								<!-- Role Badge -->
								<div
									class="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center shadow-lg ring-2 ring-[#14283f] {moderator.role ===
									'admin'
										? 'bg-red-600'
										: 'bg-[#8c709b]'}"
								>
									<FluentShield20Filled class="size-4 text-white" />
								</div>
							</div>
						</a>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<a href="/user/{moderator.id}" class="block group">
								<h3 class="font-bold text-[#fff7e8] truncate group-hover:text-[#d5c4df] transition-colors">
									{moderator.name}
								</h3>
							</a>
							<div class="mt-1">
								{#if moderator.role === "admin"}
									<div class={badgeClass({ tone: "red", size: "sm" })}>
										<FluentShield20Filled class="size-3 mr-1" />
										Administrator
									</div>
								{:else}
									<div class={badgeClass({ tone: "purple", size: "sm" })}>
										<FluentShield20Filled class="size-3 mr-1" />
										Moderator
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-xs text-[#a89e8e] mt-2">
								<FluentCalendar20Filled class="size-3" />
								<span>Since {formatDate(moderator.memberSince)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.moderators.length === 0}
		<div class="card panel">
			<div class="card-body items-center text-center py-12">
				<div class="size-16 rounded-full flex items-center justify-center bg-[#14283f] mb-4">
					<FluentShield20Filled class="size-8 text-[#a89e8e]" />
				</div>
				<h3 class="text-xl font-bold text-[#fff7e8]">No Moderators Yet</h3>
				<p class="text-[#a89e8e] max-w-md">There are currently no moderators assigned to the platform.</p>
			</div>
		</div>
	{/if}
</div>
