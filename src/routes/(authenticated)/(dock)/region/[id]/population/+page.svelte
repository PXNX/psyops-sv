<!-- src/routes/(authenticated)/(dock)/region/[id]/population/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "$lib/component/Logo.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
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

<PageContainer maxWidth="6xl">
	<!-- Same hero header as region page for visual continuity -->
	<div
		class="relative -mx-4 -mt-6 px-4 pt-8 pb-6 mb-2 bg-[#14283f]/70 border-b border-[#dfceb0]/10"
	>
		<div class="max-w-6xl mx-auto flex items-center gap-5">
			<a href="/region/{data.region.id}" class="shrink-0">
				<Logo
					src="/coats/{data.region.id}.svg"
					alt={data.region.name}
					class="size-24 rounded-2xl shadow-2xl transition-all"
					placeholderIcon={FluentShield20Filled}
					placeholderGradient="from-[#8c709b] to-[#315d8d]"
				/>
			</a>
			<div class="flex-1 min-w-0">
				<a href="/region/{data.region.id}" class="text-[#a89e8e] hover:text-[#d5c4df] transition-colors text-lg">
					{data.region.name}
				</a>
				<h1 class="text-2xl sm:text-3xl font-bold text-[#fff7e8]">Population</h1>
			</div>
		</div>
	</div>

	<!-- Toolbar: count + sort -->
	<div class="flex items-center justify-between gap-3">
		<p class="text-sm text-[#a89e8e]">
			{data.totalResidents}
			{data.totalResidents === 1 ? "resident" : "residents"}
		</p>

		<button
			onclick={toggleSort}
			class="btn btn-sm bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8] gap-1.5 shrink-0"
		>
			<FluentArrowSort20Filled class="size-4" />
			<span class="hidden sm:inline">{data.sortOrder === "asc" ? "Oldest First" : "Newest First"}</span>
			<span class="sm:hidden">{data.sortOrder === "asc" ? "Oldest" : "Newest"}</span>
		</button>
	</div>

	{#if data.residents.length === 0}
		<div class="text-center py-12">
			<div class="size-16 bg-[#102239]/70 rounded-full flex items-center justify-center mx-auto mb-4">
				<FluentPeople20Filled class="size-8 text-[#a89e8e]" />
			</div>
			<p class="text-[#a89e8e]">No residents in this region yet</p>
		</div>
	{:else}
		<div class="space-y-1.5">
			{#each data.residents as resident}
				{@const isYou = resident.userId === data.currentUserId}
				<a
					href="/user/{resident.userId}"
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all group
						{isYou
						? 'bg-[#315d8d]/10 border-[#7ba0c8]/20 hover:border-[#7ba0c8]/30 hover:bg-[#315d8d]/15'
						: 'bg-[#102239]/70 border-[#dfceb0]/10 hover:border-[#dfceb0]/15 hover:bg-[#14283f]'}"
				>
					<div
						class="size-10 sm:size-12 rounded-lg overflow-hidden ring-2 shrink-0 transition-all
						{isYou ? 'ring-[#7ba0c8]/30 group-hover:ring-[#7ba0c8]/50' : 'ring-[#dfceb0]/10 group-hover:ring-[#dfceb0]/15'}"
					>
						<Logo
							src={resident.user.logo}
							alt={resident.user.name || "Resident"}
							class="size-full"
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
						/>
					</div>

					<div class="flex-1 min-w-0">
						<p
							class="text-sm sm:text-base font-semibold truncate transition-colors
							{isYou ? 'text-[#b7d0e6] group-hover:text-[#e1effa]' : 'text-[#fff7e8] group-hover:text-[#d5c4df]'}"
						>
							{resident.user.name || "Anonymous"}
						</p>
						<p class="text-xs text-[#a89e8e]/80 mt-0.5">
							{formatDate(resident.movedInAt)}
						</p>
					</div>

					<FluentChevronRight20Filled
						class="size-4 text-[#a89e8e]/70 group-hover:text-[#d5c4df] transition-colors shrink-0"
					/>
				</a>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 pt-4 border-t border-[#dfceb0]/10">
				<button
					class="btn btn-sm btn-ghost"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
				>
					<FluentChevronLeft20Filled class="size-4" />
				</button>

				<span class="text-sm text-[#a89e8e]">
					{data.currentPage} / {totalPages}
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
</PageContainer>
