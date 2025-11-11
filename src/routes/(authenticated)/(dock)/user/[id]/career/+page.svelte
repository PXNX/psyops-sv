<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";

	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";

	const { data } = $props();

	const getRankColor = (rank: string) => {
		switch (rank) {
			case "owner":
				return "badge-accent";
			case "editor":
				return "badge-primary";
			case "author":
				return "badge-secondary";
			default:
				return "badge-ghost";
		}
	};

	const getRankIcon = (rank: string) => {
		switch (rank) {
			case "owner":
				return "👑";
			case "editor":
				return "✏️";
			case "author":
				return "📝";
			default:
				return "•";
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};
</script>

<!-- Hero Section -->
<div class="relative overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20"></div>
	<div class="relative p-6 pb-8">
		<div class="flex items-center gap-4 mb-6">
			<CircleAvatar src={data.user.avatar} alt={data.user.name} size="lg" />
			<div class="flex-1">
				<h1 class="text-2xl font-bold">{data.user.name}</h1>
				<p class="text-sm opacity-70">Career Overview</p>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 gap-3">
			<div class="bg-base-200/50 backdrop-blur-sm rounded-lg p-4 border border-base-300">
				<div class="flex items-center gap-2 mb-1">
					<FluentDocument20Filled class="text-primary text-lg" />
					<span class="text-xs opacity-60">Articles</span>
				</div>
				<p class="text-2xl font-bold">{data.career.stats.totalArticles}</p>
			</div>

			<div class="bg-base-200/50 backdrop-blur-sm rounded-lg p-4 border border-base-300">
				<div class="flex items-center gap-2 mb-1">
					<FluentCalendar20Filled class="text-success text-lg" />
					<span class="text-xs opacity-60">Upvotes</span>
				</div>
				<p class="text-2xl font-bold">{data.career.stats.totalUpvotes}</p>
			</div>

			<div class="bg-base-200/50 backdrop-blur-sm rounded-lg p-4 border border-base-300">
				<div class="flex items-center gap-2 mb-1">
					<FluentCalendar20Filled class="text-secondary text-lg" />
					<span class="text-xs opacity-60">Newspapers</span>
				</div>
				<p class="text-2xl font-bold">{data.career.stats.newspaperCount}</p>
			</div>

			<div class="bg-base-200/50 backdrop-blur-sm rounded-lg p-4 border border-base-300">
				<div class="flex items-center gap-2 mb-1">
					<FluentStar20Filled class="text-warning text-lg" />
					<span class="text-xs opacity-60">Avg. Votes</span>
				</div>
				<p class="text-2xl font-bold">{data.career.stats.averageUpvotes}</p>
			</div>
		</div>
	</div>
</div>

<!-- Newspaper Positions -->
<div class="p-4">
	<div class="flex items-center gap-2 mb-4">
		<FluentBriefcase20Filled class="text-lg" />
		<h2 class="text-lg font-bold">Newspaper Positions</h2>
	</div>

	{#if data.career.newspaperPositions.length === 0}
		<div class="text-center py-8 opacity-60">
			<p>No newspaper positions yet</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.career.newspaperPositions as newspaper}
				<div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
					<div class="card-body p-4">
						<div class="flex items-start gap-3">
							<SquareAvatar src={newspaper.newspaperAvatar} alt={newspaper.newspaperName} size="md" />
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-base truncate mb-2">
									{newspaper.newspaperName}
								</h3>
								<div class="flex flex-wrap gap-2">
									{#each newspaper.positions as position}
										<div class="badge {getRankColor(position.rank)} badge-sm gap-1">
											<span>{getRankIcon(position.rank)}</span>
											<span class="capitalize">{position.rank}</span>
										</div>
									{/each}
								</div>
								{#if newspaper.newspaperBackground}
									<p class="text-xs opacity-60 mt-2 line-clamp-2">
										{newspaper.newspaperBackground}
									</p>
								{/if}
							</div>
							<a href="/newspaper/{newspaper.newspaperId}" class="btn btn-ghost btn-xs btn-square">
								<FluentChevronRight20Filled />
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Recent Articles -->
<div class="p-4">
	<div class="flex items-center gap-2 mb-4">
		<FluentDocument20Filled class="text-lg" />
		<h2 class="text-lg font-bold">Recent Articles</h2>
	</div>

	{#if data.career.recentArticles.length === 0}
		<div class="text-center py-8 opacity-60">
			<p>No articles published yet</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.career.recentArticles as article}
				<a href="/article/{article.id}" class="block card bg-base-200 hover:bg-base-300 transition-colors">
					<div class="card-body p-3">
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-sm mb-1 line-clamp-2">
									{article.title}
								</h3>
								<div class="flex items-center gap-2 text-xs opacity-60">
									<span class="flex items-center gap-1">
										<FluentCalendar20Filled class="text-[10px]" />
										{article.newspaperName}
									</span>
									<span>•</span>
									<span class="flex items-center gap-1">
										<FluentCalendar20Filled class="text-[10px]" />
										{formatDate(article.createdAt)}
									</span>
								</div>
							</div>
							<div class="flex items-center gap-1 text-xs">
								<FluentCalendar20Filled class="text-success" />
								<span class="font-semibold">{article.upvoteCount}</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>

		{#if data.career.stats.totalArticles > 10}
			<div class="text-center mt-4">
				<a href="/user/{data.user.id}/articles" class="btn btn-sm btn-ghost">
					View All Articles
					<FluentChevronRight20Filled />
				</a>
			</div>
		{/if}
	{/if}
</div>

<!-- Career Timeline (Optional Enhancement) -->
<div class="p-4">
	<div class="flex items-center gap-2 mb-4">
		<FluentCalendar20Filled class="text-lg" />
		<h2 class="text-lg font-bold">Career Milestones</h2>
	</div>

	<div class="space-y-3">
		<div class="flex gap-3">
			<div class="flex flex-col items-center">
				<div class="w-2 h-2 rounded-full bg-primary"></div>
				<div class="w-px flex-1 bg-base-300"></div>
			</div>
			<div class="flex-1 pb-4">
				<p class="text-sm font-semibold">Joined Platform</p>
				<p class="text-xs opacity-60">{formatDate(data.user.createdAt)}</p>
			</div>
		</div>

		{#if data.career.stats.totalArticles > 0}
			<div class="flex gap-3">
				<div class="flex flex-col items-center">
					<div class="w-2 h-2 rounded-full bg-success"></div>
					<div class="w-px flex-1 bg-base-300"></div>
				</div>
				<div class="flex-1 pb-4">
					<p class="text-sm font-semibold">Published {data.career.stats.totalArticles} Articles</p>
					<p class="text-xs opacity-60">Total reach: {data.career.stats.totalUpvotes} upvotes</p>
				</div>
			</div>
		{/if}

		{#if data.career.newspaperPositions.length > 0}
			<div class="flex gap-3">
				<div class="flex flex-col items-center">
					<div class="w-2 h-2 rounded-full bg-secondary"></div>
				</div>
				<div class="flex-1">
					<p class="text-sm font-semibold">Contributing to {data.career.stats.newspaperCount} Newspapers</p>
					<p class="text-xs opacity-60">Active journalist</p>
				</div>
			</div>
		{/if}
	</div>
</div>
