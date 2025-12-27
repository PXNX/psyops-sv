<!-- src/routes/(authenticated)/(dock)/user/[id]/career/+page.svelte -->
<script lang="ts">
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";

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

	const getMedalEmoji = (medalType: string) => {
		switch (medalType) {
			case "honor":
				return "🏆"; // Trophy
			case "valor":
				return "🛡️"; // Shield
			case "excellence":
				return "⭐"; // Star
			case "service":
				return "🎖️"; // Military Medal
			case "leadership":
				return "👑"; // Crown
			default:
				return "🏅"; // Medal
		}
	};

	const getMedalColor = (medalType: string) => {
		switch (medalType) {
			case "honor":
				return "from-yellow-500 via-amber-400 to-yellow-600";
			case "valor":
				return "from-blue-500 via-indigo-400 to-blue-600";
			case "excellence":
				return "from-purple-500 via-pink-400 to-purple-600";
			case "service":
				return "from-emerald-500 via-teal-400 to-emerald-600";
			case "leadership":
				return "from-red-500 via-rose-400 to-red-600";
			default:
				return "from-gray-500 to-slate-600";
		}
	};

	const getMedalBorderColor = (medalType: string) => {
		switch (medalType) {
			case "honor":
				return "border-yellow-500/50";
			case "valor":
				return "border-blue-500/50";
			case "excellence":
				return "border-purple-500/50";
			case "service":
				return "border-emerald-500/50";
			case "leadership":
				return "border-red-500/50";
			default:
				return "border-gray-500/50";
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};

	let showMedalModal = $state(false);
	let medalForm = $state({
		medalType: "honor" as const,
		reason: ""
	});
</script>

<div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
	<!-- Hero Section -->
	<div class="relative">
		<div
			class="w-full rounded-2xl p-8 flex flex-col items-center relative overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-purple-900/30 via-slate-800/50 to-blue-900/30"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-2xl"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
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

					{#if data.career.stats.medalCount > 0}
						<div
							class="absolute -bottom-2 -right-2 size-10 rounded-full flex items-center justify-center ring-2 ring-base-100 bg-gradient-to-br from-yellow-500 to-amber-600"
							title="{data.career.stats.medalCount} Medals"
						>
							<FluentTrophy20Filled class="size-5 text-white" />
						</div>
					{/if}
				</div>

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-white tracking-tight">{data.user.name || "Anonymous User"}</h1>
					<p class="text-sm text-gray-400">Career Overview</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<div class="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-purple-300">{data.career.stats.totalArticles}</div>
			<div class="text-xs text-gray-400 mt-1">Articles</div>
		</div>
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-blue-300">{data.career.stats.totalUpvotes}</div>
			<div class="text-xs text-gray-400 mt-1">Upvotes</div>
		</div>
		<div class="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-emerald-300">{data.career.stats.newspaperCount}</div>
			<div class="text-xs text-gray-400 mt-1">Newspapers</div>
		</div>
		<div class="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-yellow-300">{data.career.stats.medalCount}</div>
			<div class="text-xs text-gray-400 mt-1">Medals</div>
		</div>
	</div>

	<!-- Medals Section -->
	{#if data.career.medals.length > 0}
		<section class="space-y-3">
			<div class="flex items-center gap-2">
				<FluentTrophy20Filled class="text-lg text-yellow-400" />
				<h2 class="text-lg font-bold">Medals & Honors</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.career.medals as medal}
					<div
						class="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 border-2 {getMedalBorderColor(
							medal.medalType
						)}"
						style="transform-style: preserve-3d;"
					>
						<div class="card-body p-6">
							<!-- Medal Header -->
							<div class="flex items-start gap-4 mb-3">
								<div
									class="size-16 rounded-full flex items-center justify-center bg-gradient-to-br {getMedalColor(
										medal.medalType
									)} shadow-lg flex-shrink-0"
								>
									<span class="text-4xl">{getMedalEmoji(medal.medalType)}</span>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-lg capitalize text-white">
										{medal.medalType} Medal
									</h3>
									<p class="text-xs text-gray-400 mt-1">
										Awarded by {medal.awardedBy.name}
									</p>
									<div class="badge badge-sm badge-outline mt-2">
										{medal.stateName}
									</div>
								</div>
							</div>

							<!-- Medal Reason -->
							<div class="bg-base-300/50 rounded-lg p-3 min-h-[60px]">
								<p class="text-sm text-gray-300 italic">"{medal.reason}"</p>
							</div>

							<!-- Medal Date -->
							<div class="flex items-center justify-between mt-3 pt-3 border-t border-base-300">
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<FluentCalendar20Filled class="size-3" />
									<span>{formatDate(medal.awardedAt)}</span>
								</div>
								<div class="text-xs text-gray-500">
									from {medal.stateName}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FluentBriefcase20Filled class="text-lg text-purple-400" />
				<h2 class="text-lg font-bold">Newspaper Positions</h2>
			</div>
		</div>

		{#if data.career.newspaperPositions.length === 0}
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-8 text-center">
				<p class="text-gray-400">No newspaper positions yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.career.newspaperPositions as newspaper}
					<a
						href="/newspaper/{newspaper.newspaperId}"
						class="block bg-slate-800/30 rounded-xl border border-white/5 hover:bg-slate-700/30 hover:border-purple-500/30 transition-all"
					>
						<div class="p-4">
							<div class="flex items-start gap-3">
								{#if newspaper.newspaperAvatar}
									<div class="size-14 rounded-lg overflow-hidden bg-slate-700/30">
										<img
											src={newspaper.newspaperAvatar}
											alt={newspaper.newspaperName}
											class="w-full h-full object-cover"
										/>
									</div>
								{:else}
									<div class="size-14 rounded-lg bg-slate-700/30 flex items-center justify-center">
										<FluentImageOff20Filled class="size-6 text-gray-500" />
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<h3
										class="font-semibold text-base truncate mb-2 text-white group-hover:text-purple-400 transition-colors"
									>
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
										<p class="text-xs text-gray-400 mt-2 line-clamp-2">
											{newspaper.newspaperBackground}
										</p>
									{/if}
								</div>
								<FluentChevronRight20Filled class="size-5 text-gray-500 flex-shrink-0" />
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Career Timeline -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FluentCalendar20Filled class="text-lg text-blue-400" />
				<h2 class="text-lg font-bold">Career Timeline</h2>
			</div>
			{#if data.canAwardMedal}
				<button
					class="btn btn-sm gap-2 bg-yellow-600/10 hover:bg-yellow-600/20 border-yellow-500/20 text-yellow-300"
					onclick={() => (showMedalModal = true)}
				>
					<FluentTrophy20Filled class="size-4" />
					Award Medal
				</button>
			{/if}
		</div>

		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
			<div class="space-y-4">
				<!-- Latest Medals in Timeline -->
				{#each data.career.medals.slice(0, 3) as medal}
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div
								class="size-10 rounded-full flex items-center justify-center bg-gradient-to-br {getMedalColor(
									medal.medalType
								)} shadow-lg"
							>
								<span class="text-xl">{getMedalEmoji(medal.medalType)}</span>
							</div>
							<div class="w-px flex-1 bg-base-300 mt-2"></div>
						</div>
						<div class="flex-1 pb-4">
							<p class="text-sm font-semibold text-white">
								Awarded <span class="capitalize">{medal.medalType}</span> Medal
							</p>
							<p class="text-xs text-gray-300 mt-1 line-clamp-2">{medal.reason}</p>
							<div class="flex items-center gap-2 mt-2 flex-wrap">
								<span class="badge badge-xs badge-outline">{medal.stateName}</span>
								<p class="text-xs text-gray-400">
									By {medal.awardedBy.name}
								</p>
							</div>
							<p class="text-xs text-gray-500 mt-1">{formatDate(medal.awardedAt)}</p>
						</div>
					</div>
				{/each}

				<!-- First Article -->
				{#if data.career.stats.totalArticles > 0}
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="size-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
								<FluentStar20Filled class="size-5 text-emerald-400" />
							</div>
							<div class="w-px flex-1 bg-base-300 mt-2"></div>
						</div>
						<div class="flex-1 pb-4">
							<p class="text-sm font-semibold text-white">Published {data.career.stats.totalArticles} Articles</p>
							<p class="text-xs text-gray-400 mt-1">Total reach: {data.career.stats.totalUpvotes} upvotes</p>
							<p class="text-xs text-gray-400">Average: {data.career.stats.averageUpvotes} upvotes per article</p>
						</div>
					</div>
				{/if}

				<!-- Newspaper Positions -->
				{#if data.career.newspaperPositions.length > 0}
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="size-10 rounded-full bg-purple-600/20 flex items-center justify-center">
								<FluentBriefcase20Filled class="size-5 text-purple-400" />
							</div>
							<div class="w-px flex-1 bg-base-300 mt-2"></div>
						</div>
						<div class="flex-1 pb-4">
							<p class="text-sm font-semibold text-white">
								Contributing to {data.career.stats.newspaperCount} Newspapers
							</p>
							<p class="text-xs text-gray-400 mt-1">Active journalist</p>
						</div>
					</div>
				{/if}

				<!-- Joined Platform (Oldest - at bottom) -->
				<div class="flex gap-3">
					<div class="flex flex-col items-center">
						<div class="size-10 rounded-full bg-blue-600/20 flex items-center justify-center">
							<FluentCalendar20Filled class="size-5 text-blue-400" />
						</div>
					</div>
					<div class="flex-1">
						<p class="text-sm font-semibold text-white">Joined Platform</p>
						<p class="text-xs text-gray-400 mt-1">{formatDate(data.user.createdAt)}</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

<!-- Medal Award Modal -->
{#if showMedalModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Award Medal to {data.user.name}</h3>
			<form method="POST" action="?/awardMedal" class="space-y-4">
				<div class="form-control">
					<label class="label" for="medalType">
						<span class="label-text">Medal Type</span>
					</label>
					<select id="medalType" name="medalType" class="select select-bordered" bind:value={medalForm.medalType}>
						<option value="honor">🏆 Honor - For outstanding achievements</option>
						<option value="valor">🛡️ Valor - For courage and bravery</option>
						<option value="excellence">⭐ Excellence - For exceptional quality</option>
						<option value="service">🎖️ Service - For dedicated service</option>
						<option value="leadership">👑 Leadership - For exceptional leadership</option>
					</select>
				</div>

				<div class="form-control">
					<label class="label" for="reason">
						<span class="label-text">Reason</span>
					</label>
					<textarea
						id="reason"
						name="reason"
						class="textarea textarea-bordered h-24"
						placeholder="Describe why this person deserves this medal..."
						bind:value={medalForm.reason}
						required
					></textarea>
				</div>

				<div class="modal-action">
					<button type="button" class="btn" onclick={() => (showMedalModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-primary">Award Medal</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" onclick={() => (showMedalModal = false)}></div>
	</div>
{/if}
