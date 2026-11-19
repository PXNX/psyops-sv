<!-- src/routes/(authenticated)/(dock)/user/[id]/career/+page.svelte -->
<!-- A citizen's service record: decorations (ribbon rack + citations) and a dated ledger of offices and memberships. -->
<script lang="ts">
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { enhance } from "$app/forms";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentRibbon20Filled from "~icons/fluent/ribbon-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { medalInfo } from "../medals.js";
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

	const formatDate = (date: string | Date) => {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
	};

	let showMedalModal = $state(false);
	let medalForm = $state({
		medalType: "honor" as string,
		reason: ""
	});
</script>

<svelte:head>
	<title>{`${data.user.name || "Player"} career · PsyOps`}</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Record header -->
	<header class="panel rounded-sm overflow-hidden">
		<div class="p-4 sm:p-5 flex flex-wrap items-center gap-4">
			<UserLink
				id={data.user.id}
				name={data.user.name || "Anonymous"}
				avatar={data.user.logo}
				party={{ abbreviation: data.user.partyAbbreviation, color: data.user.partyColor }}
				subtitle="Enlisted {formatDate(data.user.createdAt)}"
				size="md"
				class="flex-1"
			/>
			<dl class="flex gap-5 text-center">
				<div>
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Newspapers</dt>
					<dd class="font-mono text-xl font-semibold text-fg">{data.career.stats.newspaperCount}</dd>
				</div>
				<div>
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Medals</dt>
					<dd class="font-mono text-xl font-semibold text-primary-fg">{data.career.stats.medalCount}</dd>
				</div>
			</dl>
		</div>
	</header>

	<!-- Decorations -->
	{#if data.career.medals.length > 0 || data.canAwardMedal}
		<section id="decorations" class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="section-title">
					<FluentRibbon20Filled class="size-5 text-primary-fg" />
					Decorations
				</h2>
				{#if data.canAwardMedal}
					<Button variant="soft-amber" size="sm" icon={FluentTrophy20Filled} onclick={() => (showMedalModal = true)}>
						Award Medal
					</Button>
				{/if}
			</div>

			{#if data.career.medals.length > 0}
				<!-- Ribbon rack, three to a row like on a uniform -->
				<div class="flex justify-center">
					<div class="grid grid-cols-3 gap-1 p-2 rounded-sm bg-surface-2 border border-line/15">
						{#each data.career.medals as medal, i (medal.id)}
							<span
								class="animate-pop-in block h-4 w-11 rounded-[1px] border border-black/40"
								style="background: {medalInfo(medal.medalType).ribbon}; --rise-delay: {100 + i * 50}ms"
								title={medalInfo(medal.medalType).label}
							></span>
						{/each}
					</div>
				</div>

				<!-- Citations -->
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each data.career.medals as medal (medal.id)}
						{@const info = medalInfo(medal.medalType)}
						<li class="panel-muted rounded-sm p-3 flex gap-3">
							<div class="flex flex-col items-center shrink-0 w-11">
								<span class="block h-3 w-full rounded-[1px] border border-black/40" style="background: {info.ribbon}"
								></span>
								<span class="text-2xl leading-none -mt-0.5" aria-hidden="true">{info.emoji}</span>
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-semibold text-fg leading-tight">{info.label}</p>
								<p class="text-sm text-fg-soft mt-1 italic break-words">“{medal.reason}”</p>
								<p class="text-xs text-fg-muted mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
									<UserLink
										id={medal.awardedBy.id}
										name={medal.awardedBy.name}
										avatar={medal.awardedBy.logo}
										size="xs"
									/>
									<span>· {medal.stateName} · {formatDate(medal.awardedAt)}</span>
								</p>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-fg-muted">No decorations yet.</p>
			{/if}
		</section>
	{/if}

	<!-- Ledger -->
	<section class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="section-title">
				<FluentCalendar20Filled class="size-5 text-secondary" />
				Record
			</h2>
			{#if hasPoliticalPositions && data.career.medals.length > 0}
				<div class="flex items-center gap-2">
					<Button
						type="button"
						size="xs"
						variant={activeFilter === "political" ? "soft-amber" : "subtle"}
						icon={FluentBuildingGovernment20Filled}
						onclick={() => toggleFilter("political")}
					>
						Offices
					</Button>
					<Button
						type="button"
						size="xs"
						variant={activeFilter === "medals" ? "soft-amber" : "subtle"}
						icon={FluentTrophy20Filled}
						onclick={() => toggleFilter("medals")}
					>
						Medals
					</Button>
				</div>
			{/if}
		</div>

		<div class="panel rounded-sm divide-y divide-line/10">
			{#if timelineEntries.length === 0}
				<p class="text-sm text-fg-muted text-center p-6">Nothing on record yet.</p>
			{:else}
				{#each timelineEntries as entry, i (entry.kind + "-" + i)}
					<div class="flex gap-3 sm:gap-4 p-3 sm:p-4">
						<!-- Date column -->
						<div class="w-[4.5rem] shrink-0 pt-0.5 font-mono text-[11px] text-fg-muted">
							{#if entry.kind === "newspaper"}
								—
							{:else}
								{formatDate(new Date(entry.date))}
							{/if}
						</div>

						<!-- Mark -->
						<div class="shrink-0 pt-0.5">
							{#if entry.kind === "medal"}
								<span
									class="block h-3 w-7 mt-0.5 rounded-[1px] border border-black/40"
									style="background: {medalInfo(entry.medal.medalType).ribbon}"
								></span>
							{:else if entry.kind === "state"}
								<FluentBuildingGovernment20Filled class="size-5 text-primary-fg" />
							{:else if entry.kind === "party"}
								<FluentFlag20Filled class="size-5" style="color: {entry.membership.partyColor}" />
							{:else if entry.kind === "newspaper"}
								<FluentBriefcase20Filled class="size-5 text-secondary" />
							{:else}
								<FluentCalendar20Filled class="size-5 text-secondary" />
							{/if}
						</div>

						<!-- Entry -->
						<div class="flex-1 min-w-0 text-sm">
							{#if entry.kind === "medal"}
								<p class="font-semibold text-fg">{medalInfo(entry.medal.medalType).label}</p>
								<p class="text-xs text-fg-muted">{entry.medal.stateName}</p>
							{:else if entry.kind === "state"}
								<p class="font-semibold text-fg">
									{entry.position.title} of
									<a
										href="/state/{entry.position.stateId}"
										class="text-primary-fg hover:text-primary-fg transition-colors">{entry.position.stateName}</a
									>
								</p>
								{#if entry.position.term}
									<p class="text-xs text-fg-muted">Term {entry.position.term}</p>
								{/if}
							{:else if entry.kind === "party"}
								<p class="font-semibold text-fg">
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
									class="text-xs text-fg-muted hover:text-fg-soft transition-colors"
								>
									{entry.membership.stateName}
								</a>
							{:else if entry.kind === "newspaper"}
								<a
									href="/newspaper/{entry.newspaper.newspaperId}"
									class="font-semibold text-fg hover:text-primary-fg transition-colors"
								>
									{entry.newspaper.newspaperName}
								</a>
								<div class="flex flex-wrap gap-1.5 mt-1">
									{#each entry.newspaper.positions as position}
										<Badge tone={getRankColor(position.rank)} size="xs">
											<span>{getRankIcon(position.rank)}</span>
											<span class="capitalize">{position.rank}</span>
										</Badge>
									{/each}
								</div>
							{:else}
								<p class="font-semibold text-fg">Enlisted</p>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</PageContainer>

<!-- Medal Award Modal -->
<Modal bind:open={showMedalModal} title="Award Medal to {data.user.name}">
	<form
		method="POST"
		action="/user/{data.user.id}?/awardMedal"
		class="space-y-4"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				toastResult(result);
				if (result.type === "success") {
					showMedalModal = false;
					celebrate(document.getElementById("decorations"));
				}
			};
		}}
	>
		<div>
			<label class="field-label" for="medalType">Medal</label>
			<select
				id="medalType"
				name="medalType"
				class="field-control rounded-sm px-3 py-2.5 w-full"
				bind:value={medalForm.medalType}
			>
				<option value="honor">🏆 Honor — outstanding achievement</option>
				<option value="valor">🛡️ Valor — courage and bravery</option>
				<option value="excellence">⭐ Excellence — exceptional quality</option>
				<option value="service">🎖️ Service — dedicated service</option>
				<option value="leadership">👑 Leadership — exceptional leadership</option>
			</select>
			<span
				class="mt-2 block h-3 w-14 rounded-[1px] border border-black/40"
				style="background: {medalInfo(medalForm.medalType).ribbon}"
			></span>
		</div>

		<div>
			<label class="field-label" for="reason">Citation</label>
			<textarea
				id="reason"
				name="reason"
				class="field-control rounded-sm px-3 py-2.5 w-full h-24"
				placeholder="For…"
				bind:value={medalForm.reason}
				required></textarea>
			<p class="field-hint">One medal per month.</p>
		</div>

		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (showMedalModal = false)}>Cancel</Button>
			<Button type="submit" variant="primary">Award Medal</Button>
		</div>
	</form>
</Modal>
