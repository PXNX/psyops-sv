<!-- src/routes/moderators/+page.svelte -->
<script lang="ts">
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();
</script>

<svelte:head>
	<title>Moderators - Game Name</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-white">Moderators</h1>
		<div class="flex items-center gap-2 flex-wrap">
			<a
				href="/moderators/actions"
				class="btn btn-sm gap-2 bg-slate-800/60 hover:bg-slate-700/60 border border-white/5 text-gray-300"
			>
				<FluentEye20Filled class="size-4" />
				Actions
			</a>
			<a
				href="/moderators/reports"
				class="btn btn-sm gap-2 bg-slate-800/60 hover:bg-slate-700/60 border border-white/5 text-gray-300"
			>
				<FluentDocument20Filled class="size-4" />
				Reports
			</a>
		</div>
	</div>

	<!-- Stats -->
	<div
		class="flex items-center gap-4 rounded-2xl bg-slate-800/50 border border-white/5 p-5 w-full sm:w-auto sm:inline-flex"
	>
		<div class="size-12 rounded-xl flex items-center justify-center bg-purple-600/20">
			<FluentShield20Filled class="size-6 text-purple-400" />
		</div>
		<div>
			<div class="text-3xl font-bold text-purple-400 leading-none">{data.moderators.length}</div>
			<div class="text-sm text-gray-400 mt-1">Total Moderators</div>
		</div>
	</div>

	<!-- Moderators Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.moderators as moderator}
			<div class="card bg-slate-800/50 border border-white/5 shadow-xl hover:border-purple-500/30 transition-all">
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
										placeholderGradient="from-purple-600 to-purple-700"
									/>
								</div>
								<!-- Role Badge -->
								<div
									class="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-800"
									class:bg-purple-600={moderator.role === "moderator"}
									class:bg-red-600={moderator.role === "admin"}
								>
									<FluentShield20Filled class="size-4 text-white" />
								</div>
							</div>
						</a>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<a href="/user/{moderator.id}" class="block group">
								<h3 class="font-bold text-white truncate group-hover:text-purple-400 transition-colors">
									{moderator.name}
								</h3>
							</a>
							<div class="mt-1">
								{#if moderator.role === "admin"}
									<div class="badge badge-sm bg-red-600/20 text-red-400 border-red-500/30">
										<FluentShield20Filled class="size-3 mr-1" />
										Administrator
									</div>
								{:else}
									<div class="badge badge-sm bg-purple-600/20 text-purple-400 border-purple-500/30">
										<FluentShield20Filled class="size-3 mr-1" />
										Moderator
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-xs text-gray-500 mt-2">
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
		<div class="card bg-slate-800/50 border border-white/5">
			<div class="card-body items-center text-center py-12">
				<div class="size-16 rounded-full flex items-center justify-center bg-gray-600/20 mb-4">
					<FluentShield20Filled class="size-8 text-gray-400" />
				</div>
				<h3 class="text-xl font-bold text-white">No Moderators Yet</h3>
				<p class="text-gray-400 max-w-md">There are currently no moderators assigned to the platform.</p>
			</div>
		</div>
	{/if}
</div>
