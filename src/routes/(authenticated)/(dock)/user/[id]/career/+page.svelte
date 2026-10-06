<!-- src/routes/(authenticated)/(dock)/user/[id]/career/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentTrophy20Filled from "~icons/fluent/trophy-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
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
				return "amber" as const;
			case "editor":
				return "purple" as const;
			case "author":
				return "blue" as const;
			default:
				return "neutral" as const;
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
				return "bg-[#e6a527]/12 border-[#e6a527]/35";
			case "valor":
				return "bg-[#315d8d]/18 border-[#7ba0c8]/30";
			case "excellence":
				return "bg-[#8c709b]/15 border-[#b7a0c5]/30";
			case "service":
				return "bg-[#587252]/18 border-[#8fae88]/30";
			case "leadership":
				return "bg-red-600/10 border-red-500/30";
			default:
				return "bg-[#102239] border-[#dfceb0]/15";
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

<PageContainer maxWidth="5xl">
	<!-- Hero Section -->
	<div class="panel rounded-sm p-5">
		<div class="flex flex-col sm:flex-row items-center gap-5">
			<div class="relative shrink-0">
				{#if data.user.logo}
					<div class="size-24 rounded-full overflow-hidden bg-[#102239]">
						<img src={data.user.logo} alt={data.user.name || "User logo"} class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="size-24 rounded-full bg-[#102239] flex items-center justify-center">
						<FluentImageOff20Filled class="size-8 text-[#a89e8e]" />
					</div>
				{/if}

				{#if data.career.stats.medalCount > 0}
					<div
						class="absolute -bottom-2 -right-2 size-10 rounded-full flex items-center justify-center ring-2 ring-[#14283f] bg-[#e6a527]"
						title="{data.career.stats.medalCount} Medals"
					>
						<FluentTrophy20Filled class="size-5 text-[#172a45]" />
					</div>
				{/if}
			</div>

			<div class="text-center sm:text-left space-y-1 min-w-0">
				<h1 class="text-3xl font-bold text-[#fff7e8]">{data.user.name || "Anonymous User"}</h1>
				<p class="text-sm text-[#a89e8e]">Career Overview</p>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-3">
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentBriefcase20Filled class="size-4 text-[#8fae88] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Newspapers</p>
				<p class="text-2xl font-bold text-[#fff7e8]">{data.career.stats.newspaperCount}</p>
			</div>
		</div>
		<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
			<FluentTrophy20Filled class="size-4 text-[#f7c56b] shrink-0" />
			<div class="min-w-0">
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Medals</p>
				<p class="text-2xl font-bold text-[#fff7e8]">{data.career.stats.medalCount}</p>
			</div>
		</div>
	</div>

	<!-- Career Timeline -->
	<section class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="section-title">
				<FluentCalendar20Filled class="size-5 text-[#7ba0c8]" />
				Career Timeline
			</h2>
			{#if data.canAwardMedal}
				<Button variant="soft-amber" size="sm" icon={FluentTrophy20Filled} onclick={() => (showMedalModal = true)}>
					Award Medal
				</Button>
			{/if}
		</div>

		<!-- Timeline Filters -->
		{#if hasPoliticalPositions || data.career.medals.length > 0}
			<div class="flex items-center gap-2 flex-wrap">
				{#if hasPoliticalPositions}
					<Button
						type="button"
						size="sm"
						variant={activeFilter === "political" ? "soft-amber" : "subtle"}
						icon={FluentBuildingGovernment20Filled}
						onclick={() => toggleFilter("political")}
					>
						Political Positions
					</Button>
				{/if}
				{#if data.career.medals.length > 0}
					<Button
						type="button"
						size="sm"
						variant={activeFilter === "medals" ? "soft-amber" : "subtle"}
						icon={FluentTrophy20Filled}
						onclick={() => toggleFilter("medals")}
					>
						Medals
					</Button>
				{/if}
				{#if activeFilter}
					<Button type="button" variant="ghost" size="xs" onclick={() => (activeFilter = null)}>Clear filter</Button>
				{/if}
			</div>
		{/if}

		<div class="panel rounded-sm p-5">
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
										class="size-10 rounded-full flex items-center justify-center border {getMedalColor(
											entry.medal.medalType
										)}"
									>
										<span class="text-xl">{getMedalEmoji(entry.medal.medalType)}</span>
									</div>
								{:else if entry.kind === "state"}
									<div
										class="size-10 rounded-full bg-[#e6a527]/12 border border-[#e6a527]/35 flex items-center justify-center"
									>
										<FluentBuildingGovernment20Filled class="size-5 text-[#f7c56b]" />
									</div>
								{:else if entry.kind === "party"}
									<div
										class="size-10 rounded-full flex items-center justify-center"
										style="background-color: {entry.membership.partyColor}20"
									>
										<FluentFlag20Filled class="size-5" style="color: {entry.membership.partyColor}" />
									</div>
								{:else if entry.kind === "newspaper"}
									<div
										class="size-10 rounded-full bg-[#8c709b]/15 border border-[#b7a0c5]/30 flex items-center justify-center overflow-hidden"
									>
										{#if entry.newspaper.newspaperLogo}
											<img
												src={entry.newspaper.newspaperLogo}
												alt={entry.newspaper.newspaperName}
												class="w-full h-full object-cover"
											/>
										{:else}
											<FluentBriefcase20Filled class="size-5 text-[#b7a0c5]" />
										{/if}
									</div>
								{:else}
									<div
										class="size-10 rounded-full bg-[#315d8d]/18 border border-[#7ba0c8]/30 flex items-center justify-center"
									>
										<FluentCalendar20Filled class="size-5 text-[#7ba0c8]" />
									</div>
								{/if}
								{#if !isLast}
									<div class="w-px flex-1 bg-[#dfceb0]/15 mt-2"></div>
								{/if}
							</div>

							<div class="flex-1 min-w-0 {isLast ? '' : 'pb-4'}">
								{#if entry.kind === "medal"}
									<p class="text-sm font-semibold text-[#fff7e8]">
										Awarded <span class="capitalize">{entry.medal.medalType}</span> Medal
									</p>
									<p class="text-xs text-[#d9ccb7] mt-1">{entry.medal.reason}</p>
									<div class="flex items-center gap-2 mt-2 flex-wrap">
										<Badge size="xs">{entry.medal.stateName}</Badge>
										<p class="text-xs text-[#a89e8e]">By {entry.medal.awardedBy.name}</p>
									</div>
									<p class="text-xs text-[#a89e8e] mt-1">{formatDate(entry.medal.awardedAt)}</p>
								{:else if entry.kind === "state"}
									<p class="text-sm font-semibold text-[#fff7e8]">{entry.position.title}</p>
									<a
										href="/state/{entry.position.stateId}"
										class="text-xs text-[#f7c56b] hover:text-[#f2c463] transition-colors"
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
										class="text-sm font-semibold text-[#fff7e8] hover:text-[#f2c463] transition-colors"
									>
										{entry.newspaper.newspaperName}
									</a>
									<div class="flex flex-wrap gap-2 mt-1">
										{#each entry.newspaper.positions as position}
											<Badge tone={getRankColor(position.rank)}>
												<span>{getRankIcon(position.rank)}</span>
												<span class="capitalize">{position.rank}</span>
											</Badge>
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
</PageContainer>

<!-- Medal Award Modal -->
<Modal bind:open={showMedalModal} title="Award Medal to {data.user.name}">
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
		<div>
			<label class="field-label" for="medalType">Medal Type</label>
			<select
				id="medalType"
				name="medalType"
				class="field-control rounded-sm px-3 py-2.5 w-full"
				bind:value={medalForm.medalType}
			>
				<option value="honor">🏆 Honor - For outstanding achievements</option>
				<option value="valor">🛡️ Valor - For courage and bravery</option>
				<option value="excellence">⭐ Excellence - For exceptional quality</option>
				<option value="service">🎖️ Service - For dedicated service</option>
				<option value="leadership">👑 Leadership - For exceptional leadership</option>
			</select>
		</div>

		<div>
			<label class="field-label" for="reason">Reason</label>
			<textarea
				id="reason"
				name="reason"
				class="field-control rounded-sm px-3 py-2.5 w-full h-24"
				placeholder="Describe why this person deserves this medal..."
				bind:value={medalForm.reason}
				required></textarea>
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (showMedalModal = false)}>Cancel</Button>
			<Button type="submit" variant="primary">Award Medal</Button>
		</div>
	</form>
</Modal>
