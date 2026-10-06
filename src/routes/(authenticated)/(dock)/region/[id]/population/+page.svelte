<!-- src/routes/(authenticated)/(dock)/region/[id]/population/+page.svelte -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowSort20Filled from "~icons/fluent/arrow-sort-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

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
	<div class="panel rounded-sm p-5">
		<div class="flex items-center gap-5">
			<a href="/region/{data.region.id}" class="shrink-0">
				<Logo
					src="/coats/{data.region.id}.svg"
					alt={data.region.name}
					class="size-20 rounded-sm transition-all"
					placeholderIcon={FluentShield20Filled}
					placeholderGradient="from-[#8a4fc0]/40 to-[#8a4fc0]/40"
				/>
			</a>
			<div class="flex-1 min-w-0">
				<a href="/region/{data.region.id}" class="text-sm text-[#a8a083] hover:text-[#ffcf47] transition-colors">
					{data.region.name}
				</a>
				<h1 class="text-3xl font-bold text-[#f5efd8]">Population</h1>
			</div>
		</div>
	</div>

	<!-- Toolbar: count + sort -->
	<div class="flex items-center justify-between gap-3">
		<p class="text-sm text-[#a8a083]">
			{data.totalResidents}
			{data.totalResidents === 1 ? "resident" : "residents"}
		</p>

		<Button variant="secondary" size="sm" icon={FluentArrowSort20Filled} onclick={toggleSort} class="shrink-0">
			<span class="hidden sm:inline">{data.sortOrder === "asc" ? "Oldest First" : "Newest First"}</span>
			<span class="sm:hidden">{data.sortOrder === "asc" ? "Oldest" : "Newest"}</span>
		</Button>
	</div>

	{#if data.residents.length === 0}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="size-16 bg-[#1a1f15] rounded-full flex items-center justify-center mx-auto mb-4">
				<FluentPeople20Filled class="size-8 text-[#a8a083]" />
			</div>
			<p class="text-[#a8a083]">No residents in this region yet</p>
		</div>
	{:else}
		<div class="space-y-1.5">
			{#each data.residents as resident}
				{@const isYou = resident.userId === data.currentUserId}
				<a
					href="/user/{resident.userId}"
					class="flex items-center gap-3 rounded-sm px-3 py-2.5 border transition-all group
						{isYou
						? 'bg-[#2369b5]/18 border-[#5eaef5]/30 hover:border-[#5eaef5]/45 hover:bg-[#2369b5]/25'
						: 'bg-[#242a1d]/85 border-[#c8b47a]/15 hover:border-[#f2b01e]/55 hover:bg-[#2e3524]'}"
				>
					<div
						class="size-10 sm:size-12 rounded-full overflow-hidden ring-2 shrink-0 transition-all
						{isYou ? 'ring-[#5eaef5]/30 group-hover:ring-[#5eaef5]/50' : 'ring-[#c8b47a]/10 group-hover:ring-[#c8b47a]/15'}"
					>
						<Logo
							src={resident.user.logo}
							alt={resident.user.name || "Resident"}
							class="size-full"
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#2369b5]/40 to-[#2369b5]/40"
						/>
					</div>

					<div class="flex-1 min-w-0">
						<p
							class="text-sm sm:text-base font-semibold truncate transition-colors
							{isYou ? 'text-[#b3dcff] group-hover:text-[#e3f2ff]' : 'text-[#f5efd8] group-hover:text-[#ffcf47]'}"
						>
							{resident.user.name || "Anonymous"}
						</p>
						<p class="text-xs text-[#a8a083]/80 mt-0.5">
							{formatDate(resident.movedInAt)}
						</p>
					</div>

					<FluentChevronRight20Filled
						class="size-4 text-[#a8a083]/70 group-hover:text-[#ffcf47] transition-colors shrink-0"
					/>
				</a>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2 pt-4 border-t border-[#c8b47a]/10">
				<IconButton
					icon={FluentChevronLeft20Filled}
					label="Previous page"
					size="sm"
					disabled={data.currentPage === 1}
					onclick={() => goToPage(data.currentPage - 1)}
				/>

				<span class="text-sm font-mono text-[#a8a083]">
					{data.currentPage} / {totalPages}
				</span>

				<IconButton
					icon={FluentChevronRight20Filled}
					label="Next page"
					size="sm"
					disabled={data.currentPage === totalPages}
					onclick={() => goToPage(data.currentPage + 1)}
				/>
			</div>
		{/if}
	{/if}
</PageContainer>
