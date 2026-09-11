<!-- src/routes/(authenticated)/(dock)/user/[id]/career/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	const { data } = $props();

	type Medal = (typeof data.career.medals)[number];
	type StatePosition = (typeof data.career.statePositions)[number];
	type PartyMembership = (typeof data.career.partyMemberships)[number];
	type NewspaperPosition = (typeof data.career.newspaperPositions)[number];

	type TimelineEntry =
		| { kind: "medal"; category: "medals"; date: number; medal: Medal }
		| { kind: "state"; category: "political"; date: number; position: StatePosition }
		| { kind: "party"; category: "political"; date: number; membership: PartyMembership }
		| { kind: "newspaper"; category: "other"; date: number; newspaper: NewspaperPosition }
		| { kind: "joined"; category: "other"; date: number };

	type CareerFilter = "political" | "medals";
	let activeFilter = $state<CareerFilter | null>(null);

	const toggleFilter = (type: CareerFilter) => {
		activeFilter = activeFilter === type ? null : type;
	};

	const hasPoliticalPositions = $derived(
		data.career.statePositions.length > 0 || data.career.partyMemberships.length > 0
	);

	// Dated career events (medals + political positions), newest first
	const datedEntries = $derived.by(() => {
		const entries: TimelineEntry[] = [];
		for (const medal of data.career.medals) {
			entries.push({ kind: "medal", category: "medals", date: new Date(medal.awardedAt).getTime(), medal });
		}
		for (const position of data.career.statePositions) {
			entries.push({
				kind: "state",
				category: "political",
				date: new Date(position.appointedAt).getTime(),
				position
			});
		}
		for (const membership of data.career.partyMemberships) {
			entries.push({
				kind: "party",
				category: "political",
				date: new Date(membership.joinedAt).getTime(),
				membership
			});
		}
		entries.sort((a, b) => b.date - a.date);
		return entries;
	});

	// The full timeline, respecting the active filter. Newspaper positions and the
	// "joined platform" milestone only appear when no filter is active.
	const timelineEntries = $derived.by(() => {
		if (activeFilter) {
			return datedEntries.filter((entry) => entry.category === activeFilter);
		}

		const entries = [...datedEntries];
		for (const newspaper of data.career.newspaperPositions) {
			entries.push({ kind: "newspaper", category: "other", date: 0, newspaper });
		}
		entries.push({ kind: "joined", category: "other", date: new Date(data.user.createdAt).getTime() });
		return entries;
	});

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
				return "from-[#7ba0c8] to-[#315d8d]";
			case "excellence":
				return "from-[#b7a0c5] to-[#8c709b]";
			case "service":
				return "from-[#8fae88] to-[#587252]";
			case "leadership":
				return "from-red-500 via-rose-400 to-red-600";
			default:
				return "from-[#7d8a9e] to-[#4f5b6b]";
		}
	};

	const formatDate = (date: string) => {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
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
			class="w-full rounded-2xl p-8 flex flex-col items-center relative overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-[#8c709b]/20 via-[#14283f]/60 to-[#315d8d]/20"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-2xl"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<div class="rounded-full relative group">
					{#if data.user.logo}
						<div class="size-24 rounded-full overflow-hidden bg-base-200">
							<img src={data.user.logo} alt={data.user.name || "User logo"} class="w-full h-full object-cover" />
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
					<h1 class="text-3xl font-bold text-[#fff7e8] tracking-tight">{data.user.name || "Anonymous User"}</h1>
					<p class="text-sm text-[#a89e8e]">Career Overview</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-3">
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-[#c6dfbf]">{data.career.stats.newspaperCount}</div>
			<div class="text-xs text-[#a89e8e] mt-1">Newspapers</div>
		</div>
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-[#f7c56b]">{data.career.stats.medalCount}</div>
			<div class="text-xs text-[#a89e8e] mt-1">Medals</div>
		</div>
	</div>

	<!-- Career Timeline -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FluentCalendar20Filled class="text-lg text-blue-400" />
				<h2 class="text-lg font-bold">Career Timeline</h2>
			</div>
			{#if data.canAwardMedal}
				<button
					class="btn btn-sm gap-2 bg-[#e6a527]/12 hover:bg-[#e6a527]/20 border-[#e6a527]/35 text-[#f7c56b]"
					onclick={() => (showMedalModal = true)}
				>
					<FluentTrophy20Filled class="size-4" />
					Award Medal
				</button>
			{/if}
		</div>

		<!-- Timeline Filters -->
		{#if hasPoliticalPositions || data.career.medals.length > 0}
			<div class="flex items-center gap-2 flex-wrap">
				{#if hasPoliticalPositions}
					<button
						type="button"
						onclick={() => toggleFilter("political")}
						class="btn btn-sm gap-2 {activeFilter === 'political'
							? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
							: 'bg-[#102239]/70 border-[#dfceb0]/10 text-[#a89e8e] hover:bg-[#19304b]'}"
					>
						<FluentBuildingGovernment20Filled class="size-4" />
						Political Positions
					</button>
				{/if}
				{#if data.career.medals.length > 0}
					<button
						type="button"
						onclick={() => toggleFilter("medals")}
						class="btn btn-sm gap-2 {activeFilter === 'medals'
							? 'bg-yellow-600/20 border-yellow-500/40 text-yellow-300'
							: 'bg-[#102239]/70 border-[#dfceb0]/10 text-[#a89e8e] hover:bg-[#19304b]'}"
					>
						<FluentTrophy20Filled class="size-4" />
						Medals
					</button>
				{/if}
				{#if activeFilter}
					<button
						type="button"
						onclick={() => (activeFilter = null)}
						class="text-xs text-[#d5c4df] hover:text-[#f0e7f5] transition-colors cursor-pointer ml-1"
					>
						Clear filter
					</button>
				{/if}
			</div>
		{/if}

		<div class="panel-muted rounded-xl p-4">
			{#if timelineEntries.length === 0}
				<p class="text-sm text-[#a89e8e] text-center py-4">
					{#if activeFilter === "medals"}
						No medals awarded yet
					{:else if activeFilter === "political"}
						No political positions yet
					{:else}
						No career activity yet
					{/if}
				</p>
			{:else}
				<div class="space-y-4">
					{#each timelineEntries as entry, i (entry.kind + "-" + i)}
						{@const isLast = i === timelineEntries.length - 1}
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								{#if entry.kind === "medal"}
									<div
										class="size-10 rounded-full flex items-center justify-center bg-gradient-to-br {getMedalColor(
											entry.medal.medalType
										)} shadow-lg"
									>
										<span class="text-xl">{getMedalEmoji(entry.medal.medalType)}</span>
									</div>
								{:else if entry.kind === "state"}
									<div class="size-10 rounded-full bg-amber-600/20 flex items-center justify-center">
										<FluentBuildingGovernment20Filled class="size-5 text-amber-400" />
									</div>
								{:else if entry.kind === "party"}
									<div
										class="size-10 rounded-full flex items-center justify-center"
										style="background-color: {entry.membership.partyColor}20"
									>
										<FluentFlag20Filled class="size-5" style="color: {entry.membership.partyColor}" />
									</div>
								{:else if entry.kind === "newspaper"}
									<div class="size-10 rounded-full bg-[#8c709b]/15 flex items-center justify-center overflow-hidden">
										{#if entry.newspaper.newspaperLogo}
											<img
												src={entry.newspaper.newspaperLogo}
												alt={entry.newspaper.newspaperName}
												class="w-full h-full object-cover"
											/>
										{:else}
											<FluentBriefcase20Filled class="size-5 text-[#d5c4df]" />
										{/if}
									</div>
								{:else}
									<div class="size-10 rounded-full bg-[#315d8d]/18 flex items-center justify-center">
										<FluentCalendar20Filled class="size-5 text-[#b7d0e6]" />
									</div>
								{/if}
								{#if !isLast}
									<div class="w-px flex-1 bg-base-300 mt-2"></div>
								{/if}
							</div>

							<div class="flex-1 {isLast ? '' : 'pb-4'}">
								{#if entry.kind === "medal"}
									<p class="text-sm font-semibold text-[#fff7e8]">
										Awarded <span class="capitalize">{entry.medal.medalType}</span> Medal
									</p>
									<p class="text-xs text-[#d9ccb7] mt-1">{entry.medal.reason}</p>
									<div class="flex items-center gap-2 mt-2 flex-wrap">
										<span class="badge badge-xs badge-outline">{entry.medal.stateName}</span>
										<p class="text-xs text-[#a89e8e]">By {entry.medal.awardedBy.name}</p>
									</div>
									<p class="text-xs text-[#a89e8e] mt-1">{formatDate(entry.medal.awardedAt)}</p>
								{:else if entry.kind === "state"}
									<p class="text-sm font-semibold text-[#fff7e8]">{entry.position.title}</p>
									<a
										href="/state/{entry.position.stateId}"
										class="text-xs text-amber-400 hover:text-amber-300 transition-colors"
									>
										{entry.position.stateName}
									</a>
									{#if entry.position.term}
										<span class="text-xs text-[#a89e8e] ml-2">Term {entry.position.term}</span>
									{/if}
									<p class="text-xs text-[#a89e8e] mt-1">{formatDate(entry.position.appointedAt)}</p>
								{:else if entry.kind === "party"}
									<p class="text-sm font-semibold text-[#fff7e8]">
										<span class="capitalize">{entry.membership.role}</span> of
										<a
											href="/party/{entry.membership.partyId}"
											class="hover:underline"
											style="color: {entry.membership.partyColor}"
										>
											{entry.membership.partyName}{entry.membership.partyAbbreviation
												? ` (${entry.membership.partyAbbreviation})`
												: ""}
										</a>
									</p>
									<a
										href="/state/{entry.membership.stateId}"
										class="text-xs text-[#a89e8e] hover:text-[#d9ccb7] transition-colors"
									>
										{entry.membership.stateName}
									</a>
									<p class="text-xs text-[#a89e8e] mt-1">Joined {formatDate(entry.membership.joinedAt)}</p>
								{:else if entry.kind === "newspaper"}
									<a
										href="/newspaper/{entry.newspaper.newspaperId}"
										class="text-sm font-semibold text-[#fff7e8] hover:text-[#f7c56b] transition-colors"
									>
										{entry.newspaper.newspaperName}
									</a>
									<div class="flex flex-wrap gap-2 mt-1">
										{#each entry.newspaper.positions as position}
											<div class="badge {getRankColor(position.rank)} badge-sm gap-1">
												<span>{getRankIcon(position.rank)}</span>
												<span class="capitalize">{position.rank}</span>
											</div>
										{/each}
									</div>
									{#if entry.newspaper.newspaperBackground}
										<p class="text-xs text-[#a89e8e] mt-2 line-clamp-2">{entry.newspaper.newspaperBackground}</p>
									{/if}
								{:else}
									<p class="text-sm font-semibold text-[#fff7e8]">Joined Platform</p>
									<p class="text-xs text-[#a89e8e] mt-1">{formatDate(data.user.createdAt)}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>
</div>

<!-- Medal Award Modal -->
{#if showMedalModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Award Medal to {data.user.name}</h3>
			<form
				method="POST"
				action="?/awardMedal"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === "success") {
							showMedalModal = false;
						}
					};
				}}
			>
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
						required></textarea>
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
