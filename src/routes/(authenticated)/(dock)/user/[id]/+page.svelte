<!-- src/routes/(authenticated)/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";

	import * as m from "$lib/paraglide/messages";
	import { shareLink } from "$lib/util";
	import { formatDate, getDaysRemaining } from "$lib/utils/formatting.js";

	const { data } = $props();

	const regionName = $derived(() => {
		if (!data.residence) return "";
		const key = `region_${data.residence.region.id}` as keyof typeof m;
		return m[key]();
	});
</script>

<div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Section with Party Background -->
	<div class="relative">
		<div
			class="w-full rounded-2xl p-8 flex flex-col items-center relative overflow-hidden border border-white/5 shadow-2xl"
			style="background: linear-gradient(135deg, {data.party?.color || '#1e293b'}20 0%, {data.party?.color ||
				'#1e293b'}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.party?.color ||
					'#ffffff'}20 35px, {data.party?.color || '#ffffff'}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-2xl"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<!-- Profile Picture -->
				<div class="ring-4 ring-white/10 rounded-full relative group">
					{#if data.user.avatar}
						<div class="size-24 rounded-full overflow-hidden bg-base-200">
							<img src={data.user.avatar} alt={data.user.name || "User avatar"} class="w-full h-full object-cover" />
						</div>
					{:else}
						<div class="size-24 rounded-full bg-base-200 flex items-center justify-center">
							<FluentImageOff20Filled class="size-8 text-base-content/20" />
						</div>
					{/if}

					{#if data.party}
						<div
							class="absolute -bottom-2 -right-2 size-10 rounded-full flex items-center justify-center ring-2 ring-base-100"
							style="background-color: {data.party.color};"
							title={data.party.name}
						>
							{#if data.party.logo}
								<img src={data.party.logo} alt={data.party.name} class="size-6 object-contain" />
							{:else}
								<FluentPeople20Filled class="size-5 text-white" />
							{/if}
						</div>
					{/if}
				</div>

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-white tracking-tight">{data.user.name || "Anonymous User"}</h1>
					<p class="text-sm text-gray-400 font-mono">#{data.user.id}</p>
					{#if data.user.bio}
						<p class="text-sm text-gray-300 max-w-md mt-2">{data.user.bio}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<section class="flex gap-2 justify-center flex-wrap">
		{#if data.user.id !== data.account?.id}
			<a
				class="btn btn-sm gap-2 bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-300 hover:text-purple-200 transition-all"
				href="/chat/u/{data.user.id}"
			>
				<FluentChat20Filled class="size-4" />
				<span class="hidden sm:inline">Message</span>
			</a>

			<button
				class="btn btn-sm gap-2 bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-300 hover:text-blue-200 transition-all"
				onclick={() => shareLink(data.user.name || "User", window.location.href)}
			>
				<FluentGiftCardArrowRight20Filled class="size-4" />
				<span class="hidden sm:inline">Gift</span>
			</button>

			<button
				class="btn btn-sm gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all"
				onclick={() => shareLink(data.user.name || "User", window.location.href)}
			>
				<MdiNewspaperPlus class="size-4" />
				<span class="hidden sm:inline">Add Author</span>
			</button>

			<button
				class="btn btn-sm gap-2 bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-300 hover:text-red-200 transition-all"
				onclick={() => shareLink(data.user.name || "User", window.location.href)}
			>
				<FluentAccessibilityError20Filled class="size-4" />
				<span class="hidden sm:inline">Report</span>
			</button>
		{/if}

		<button
			class="btn btn-sm gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
			onclick={() => shareLink(data.user.name || "User", window.location.href)}
		>
			<FluentShareAndroid20Filled class="size-4" />
			<span class="hidden sm:inline">Share</span>
		</button>

		{#if data.isOwnProfile}
			<a
				href="/settings"
				class="btn btn-sm gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
			>
				<FluentSettingsCogMultiple20Filled class="size-4" />
				<span class="hidden sm:inline">Settings</span>
			</a>
		{/if}
	</section>

	<!-- Location & Activity Section -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Location & Activity</h2>
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
			<!-- Residence -->
			{#if data.residence}
				<a
					href="/region/{data.residence.region.id}"
					class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all"
				>
					<div class="size-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
						<img src={"/coats/" + data.residence.region.id + ".svg"} alt={regionName()} class="size-6 object-contain" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
							{regionName()}
						</p>
						<p class="text-xs text-gray-400 truncate">
							Residence
							{#if data.residence.region.stateName}
								• {data.residence.region.stateName}
							{/if}
							• Since {formatDate(data.residence.movedInAt)}
						</p>
					</div>
					<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
				</a>
			{:else}
				<div class="flex items-center gap-3 p-2 text-gray-500">
					<div class="size-12 bg-slate-700/30 rounded-lg flex items-center justify-center">
						<FluentHome20Filled class="size-6" />
					</div>
					<p class="text-sm">No permanent residence</p>
				</div>
			{/if}

			{#if data.isOwnProfile}
				<a
					href="/visas"
					class="btn btn-sm w-full gap-2 bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-400 hover:text-purple-300 transition-all mt-2"
				>
					<FluentBookCompass24Filled class="size-4" />
					Manage Visas
				</a>
			{/if}

			<!-- Articles Published -->
			<a
				href="/user/{data.user.id}/articles"
				class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all"
			>
				<div class="size-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
					<FluentDocument20Filled class="size-6 text-purple-400" />
				</div>
				<div class="flex-1 min-w-0">
					<p class="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
						{data.articleCount}
						{data.articleCount === 1 ? "Article" : "Articles"} Published
					</p>
					<p class="text-xs text-gray-400 truncate">View all publications</p>
				</div>
				<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
			</a>
		</div>
	</section>

	<!-- Career & Politics Section -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Career & Politics</h2>
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
			{#if data.party}
				<a
					href="/party/{data.party.id}"
					class="flex items-center gap-3 group hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all"
				>
					<div
						class="size-12 rounded-lg flex items-center justify-center"
						style="background-color: {data.party.color}20;"
					>
						{#if data.party.logo}
							<img src={data.party.logo} alt={data.party.name} class="size-8 object-contain" />
						{:else}
							<FluentPeople20Filled class="size-6" style="color: {data.party.color}" />
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
							{data.party.name}
							{#if data.party.abbreviation}
								<span class="text-gray-400">({data.party.abbreviation})</span>
							{/if}
						</p>
						<p class="text-xs text-gray-400 truncate">
							{#if data.party.ideology}{data.party.ideology} •{/if}
							{data.party.role === "leader"
								? "Party Leader"
								: data.party.role === "deputy"
									? "Deputy Leader"
									: "Member"}
							• Joined {formatDate(data.party.joinedAt)}
						</p>
					</div>
					<FluentChevronRight20Filled class="size-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
				</a>
			{:else if data.isOwnProfile}
				<a
					href="/party/create"
					class="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-500/30 rounded-lg hover:border-purple-500/50 hover:bg-purple-600/10 transition-all group"
				>
					<div
						class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors"
					>
						<FluentAdd20Filled class="size-5 text-purple-400" />
					</div>
					<div class="text-center">
						<p class="font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
							Create Political Party
						</p>
						<p class="text-xs text-gray-400">Start your own political movement</p>
					</div>
				</a>
			{/if}

			<a
				href="/user/{data.user.id}/career"
				role="button"
				class="btn btn-sm w-full gap-2 bg-transparent hover:bg-purple-600/10 border-purple-500/20 text-purple-400 hover:text-purple-300 transition-all mt-2"
			>
				<FluentChevronRight20Filled class="size-4" />
				View Full Career Timeline
			</a>
		</div>
	</section>
</div>
