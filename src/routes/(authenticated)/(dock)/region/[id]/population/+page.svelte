<!-- src/routes/(authenticated)/(dock)/region/[id]/population/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import { formatDate } from "$lib/utils/formatting.js";

	const { data } = $props();

	function toggleSort() {
		const url = new URL(window.location.href);
		url.searchParams.set("sort", data.sortOrder === "asc" ? "desc" : "asc");
		url.searchParams.set("page", "1");
		window.location.href = url.toString();
	}

	function goToPage(pageNum: number) {
		const url = new URL(window.location.href);
		url.searchParams.set("page", pageNum.toString());
		window.location.href = url.toString();
	}

	const totalPages = $derived(Math.ceil(data.totalResidents / data.pageSize));
</script>

<div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/region/{data.region.id}" class="btn btn-ghost btn-sm gap-2"> ← Back to Region </a>
			<div class="h-6 w-px bg-white/10"></div>
			<div class="flex items-center gap-3">
				<Logo
					src="/coats/{data.region.id}.svg"
					alt={data.region.name}
					class="size-10 rounded-lg ring-2 ring-white/10"
					placeholderIcon={FluentShield20Filled}
					placeholderGradient="from-purple-500 to-blue-500"
				/>
				<div>
					<h1 class="text-2xl font-bold text-white">{data.region.name}</h1>
					<p class="text-sm text-gray-400">Population</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Population Section -->

	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-3">
			<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
				<FluentPeople20Filled class="size-6 text-blue-400" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-white">
					{data.totalResidents}
					{data.totalResidents === 1 ? "Resident" : "Residents"}
				</h2>
			</div>
		</div>

		<!-- Sort Button -->
		<button onclick={toggleSort} class="btn btn-sm bg-slate-700 hover:bg-slate-600 border-0 text-white gap-2">
			<FluentArrowSort20Filled class="size-4" />
			{data.sortOrder === "asc" ? "Oldest First" : "Newest First"}
		</button>
	</div>

	{#if data.residents.length === 0}
		<div class="text-center py-12">
			<div class="size-16 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
				<FluentPeople20Filled class="size-8 text-gray-500" />
			</div>
			<p class="text-gray-400">No residents in this region yet</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.residents as resident}
				<a
					href="/user/{resident.userId}"
					class="flex items-center gap-4 bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-white/10 hover:bg-slate-700/50 transition-all group"
				>
					<!-- User Avatar -->
					<div class="shrink-0">
						<div class="relative">
							<div
								class="size-14 rounded-lg overflow-hidden ring-2 ring-white/5 group-hover:ring-white/10 transition-all"
							>
								<Logo
									src={resident.user.logo}
									alt={resident.user.name || "Resident"}
									class="size-full"
									placeholderIcon={FluentPeople20Filled}
									placeholderGradient="from-slate-600 to-slate-700"
								/>
							</div>
							{#if resident.userId === data.currentUserId}
								<div
									class="absolute -top-1 -right-1 size-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-800"
								>
									<FluentHome20Filled class="size-3 text-white" />
								</div>
							{/if}
						</div>
					</div>

					<!-- User Info -->
					<div class="flex-1 min-w-0">
						<p
							class="text-base font-semibold text-white truncate group-hover:text-purple-400 transition-colors flex items-center gap-2"
						>
							{resident.user.name || "Anonymous"}
							{#if resident.userId === data.currentUserId}
								<span class="badge badge-sm bg-blue-600/20 border-blue-600/30 text-blue-400">You</span>
							{/if}
						</p>
						<div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
							<FluentCalendar20Filled class="size-3" />
							<span>Moved in {formatDate(resident.movedInAt)}</span>
						</div>
					</div>

					<!-- Chevron -->
					<div class="shrink-0">
						<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
					</div>
				</a>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/5">
				<button
					class="btn btn-sm btn-ghost"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
				>
					<FluentChevronLeft20Filled class="size-4" />
				</button>

				<span class="text-sm text-gray-400">
					Page {data.currentPage} of {totalPages}
				</span>

				<button
					class="btn btn-sm btn-ghost"
					disabled={data.currentPage === totalPages}
					onclick={() => goToPage(data.currentPage + 1)}
				>
					<FluentChevronRight20Filled class="size-4" />
				</button>
			</div>
		{/if}
	{/if}
</div>
