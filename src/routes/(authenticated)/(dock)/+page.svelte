<script lang="ts">
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { toast } from "#lib/ui/toast.svelte.js";
	import { invalidateAll } from "$app/navigation";
	import { enhance } from "$app/forms";
	import { feedback } from "#lib/utils/feedback.js";
	import TravelProgress from "#lib/component/TravelProgress.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import FluentShieldLock20Filled from "~icons/fluent/shield-lock-20-filled";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import { timeAgo } from "#lib/component/press/time.js";
	import { settings } from "#lib/settings.svelte.js";
	import { formatDate, getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const regionName = $derived(data.userLocation ? getRegionName(data.userLocation.regionId) : null);

	async function handleTravelComplete() {
		try {
			const response = await fetch("/api/travel/arrive", { method: "POST" });
			const result = await response.json();
			if (!result.success && result.timeRemaining > 0) {
				// The client clock ran ahead of the server: check again when it's due.
				setTimeout(handleTravelComplete, result.timeRemaining * 1000 + 500);
				return;
			}
		} catch {
			toast.error("Couldn't confirm your arrival. Try again in a moment.");
		}
		await invalidateAll();
	}

	async function handleTravelCancel() {
		await invalidateAll();
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader title="Dashboard" subtitle="Welcome back, {data.account.profile?.name || 'User'}!" />

	<!-- Active Travel Banner -->
	{#if data.activeTravel}
		<TravelProgress
			travel={data.activeTravel}
			showCancel={true}
			onComplete={handleTravelComplete}
			onCancel={handleTravelCancel}
		/>
	{/if}

	<!-- Birthday Reward Banner -->
	{#if data.birthdayInfo.uncollectedYears.length > 0}
		<div class="bg-primary/12 border border-primary/35 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div
					class="size-12 shrink-0 bg-primary/12 border border-primary/35 rounded-sm flex items-center justify-center text-2xl"
				>
					🎂
				</div>
				<div class="flex-1 min-w-0">
					{#if data.birthdayInfo.isBirthday}
						<h3 class="text-lg font-bold text-primary-fg">
							🎉 Happy Birthday, {data.account.profile?.name || "friend"}! 🎉
						</h3>
						<p class="text-sm text-fg-soft mt-1">
							Your account turns {data.birthdayInfo.totalYears} today. Here's a gift to celebrate!
						</p>
					{:else}
						<h3 class="text-lg font-bold text-primary-fg">🎁 A birthday gift is waiting!</h3>
						<p class="text-sm text-fg-soft mt-1">
							{#if data.birthdayInfo.uncollectedYears.length === 1}
								Your year {data.birthdayInfo.uncollectedYears[0]} anniversary reward is ready to collect.
							{:else}
								You have {data.birthdayInfo.uncollectedYears.length} uncollected anniversary rewards saved up.
							{/if}
						</p>
					{/if}
					<p class="text-xs text-fg-muted mt-2">
						{data.birthdayInfo.rewardPerYear.toLocaleString()} currency × {data.birthdayInfo.uncollectedYears.length} year{data
							.birthdayInfo.uncollectedYears.length !== 1
							? "s"
							: ""}
					</p>
					<form
						method="POST"
						action="?/collectBirthday"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === "success") feedback("win");
								else toastResult(result);
							};
						}}
						class="mt-3"
					>
						<Button type="submit" variant="soft-amber" size="sm" icon={FluentGiftCardArrowRight20Filled}>
							Collect {data.birthdayInfo.rewardTotal.toLocaleString()} Currency
						</Button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Your standing at a glance: the numbers worth checking every visit -->
	<section class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Your standing">
		<div class="panel rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 text-fg-muted">
				<FluentWallet20Filled class="size-4 text-primary-fg" />
				<span class="text-[10px] font-bold uppercase tracking-wide">Wallet</span>
			</div>
			<a
				href="/transactions"
				class="mt-1 block truncate text-lg font-bold text-fg hover:text-primary-hover transition-colors"
			>
				{data.personal.balance.toLocaleString()}
			</a>
			<p class="text-[10px] text-fg-muted">currency on hand</p>
		</div>

		<div class="panel rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 text-fg-muted">
				<FluentPeople20Filled class="size-4 text-positive" />
				<span class="text-[10px] font-bold uppercase tracking-wide">Party</span>
			</div>
			{#if data.personal.party}
				<a
					href="/party/{data.personal.party.id}"
					class="mt-1 block truncate text-base font-bold text-fg hover:text-primary-hover transition-colors"
				>
					{data.personal.party.name}
				</a>
				<p class="text-[10px] text-fg-muted">your party</p>
			{:else}
				<a href="/party" class="mt-1 block text-base font-bold text-fg-muted hover:text-fg transition-colors">
					Unaligned
				</a>
				<p class="text-[10px] text-fg-muted">find a party</p>
			{/if}
		</div>

		<div class="panel rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 text-fg-muted">
				<MdiNewspaper class="size-4 text-friendly" />
				<span class="text-[10px] font-bold uppercase tracking-wide">Press</span>
			</div>
			<a
				href="/newspaper"
				class="mt-1 block truncate text-lg font-bold text-fg hover:text-primary-hover transition-colors"
			>
				{data.personal.newspaperCount}
			</a>
			<p class="text-[10px] text-fg-muted">papers you write for</p>
		</div>

		<div class="panel rounded-sm p-3 sm:p-4">
			<div class="flex items-center gap-2 text-fg-muted">
				<FluentStar20Filled class="size-4 text-primary-fg" />
				<span class="text-[10px] font-bold uppercase tracking-wide">Status</span>
			</div>
			<a
				href="/premium"
				class="mt-1 block truncate text-base font-bold text-fg hover:text-primary-hover transition-colors"
			>
				{data.personal.isPremium ? "Premium" : "Free"}
			</a>
			<p class="text-[10px] text-fg-muted">{data.personal.isPremium ? "supporter active" : "see benefits"}</p>
		</div>
	</section>

	<!-- Location & State snapshot -->
	<SectionCard>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-[10px] font-bold text-fg-muted uppercase tracking-wide flex items-center gap-2">
				<FluentGlobe20Filled class="size-4 text-friendly" /> Your Location
			</h2>
			{#if data.userLocation}
				<a
					href="/region/{data.userLocation.regionId}"
					class="text-xs text-fg-body/70 hover:text-primary-hover transition-colors flex items-center gap-1"
				>
					Region details <FluentArrowRight20Filled class="size-3" />
				</a>
			{/if}
		</div>

		{#if data.stateSnapshot}
			<div class="flex items-center gap-4">
				<Logo
					src={data.stateSnapshot.logo}
					alt={data.stateSnapshot.name}
					class="size-14 rounded-sm border border-line/15"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-friendly-bg to-surface-8"
				/>
				<div class="flex-1 min-w-0">
					<div class="text-xs text-fg-muted">{regionName}</div>
					<div class="flex items-center gap-2 flex-wrap">
						<a
							href="/state/{data.stateSnapshot.id}"
							class="text-lg font-bold text-fg hover:text-primary-hover transition-colors truncate"
						>
							{data.stateSnapshot.name}
						</a>
						{#if data.stateSnapshot.capitulated}
							<Badge tone="red" size="xs">Capitulated</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-4 mt-1 text-xs text-fg-muted">
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5 text-friendly" />
							{data.stateSnapshot.population.toLocaleString()}
						</span>
						<span class="flex items-center gap-1">
							<FluentStar20Filled class="size-3.5 text-primary-fg" />
							{data.stateSnapshot.rating.toLocaleString()}
						</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 text-fg-muted text-sm">
				<FluentGlobe20Filled class="size-5 shrink-0" />
				<span>
					{regionName ? `${regionName} is not controlled by any state.` : "You have not settled in a region yet."}
					<a href="/map" class="text-primary-fg hover:text-primary-hover transition-colors">Explore the map</a>.
				</span>
			</div>
		{/if}
	</SectionCard>

	<!-- What's been printed lately -->
	<SectionCard>
		<div class="flex items-center justify-between gap-3 mb-3">
			<h2 class="section-title">
				<MdiNewspaper class="size-4" />
				Latest dispatches
			</h2>
			<Button href="/posts" variant="ghost" size="sm" icon={FluentArrowRight20Filled}>All posts</Button>
		</div>

		{#if data.personal.recentArticles.length === 0}
			<p class="panel-muted rounded-sm p-5 text-sm text-fg-muted text-center">
				Nothing in print yet. <a href="/posts/new" class="text-primary-fg hover:underline">Write the first dispatch</a>.
			</p>
		{:else}
			<ul class="divide-y divide-white/[0.06]">
				{#each data.personal.recentArticles as article (article.id)}
					<li class="py-2.5 first:pt-0 last:pb-0">
						<a href="/posts/{article.id}" class="group flex items-center gap-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold text-fg group-hover:text-primary-hover transition-colors">
									{article.title}
								</p>
								<p class="truncate text-xs text-fg-muted">
									{article.newspaperName ?? article.authorName ?? "Unknown"} · {timeAgo(
										article.createdAt
									)}{#if article.minutes}
										· {article.minutes} min{/if}
								</p>
							</div>
							{#if settings.loadImages && article.cover}
								<img
									src={article.cover}
									alt=""
									loading="lazy"
									decoding="async"
									referrerpolicy="no-referrer"
									class="size-10 shrink-0 rounded-sm border border-line/15 object-cover"
								/>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</SectionCard>

	<!-- System Broadcast: shown separately, outranks everything below -->
	{#if data.systemBroadcast}
		<div class="relative overflow-hidden rounded-sm border-l-4 border-red-500 bg-surface-2 p-5">
			<div class="flex items-center justify-between gap-3 mb-2">
				<div class="flex items-center gap-2">
					<FluentMegaphone20Filled class="size-4 text-red-400" />
					<span class="text-[10px] font-bold text-red-300 uppercase tracking-[0.2em]">System Broadcast</span>
				</div>
				<span class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-red-600/20 text-red-300">
					Order
				</span>
			</div>
			<h3 class="text-fg font-bold uppercase tracking-wide">{data.systemBroadcast.title}</h3>
			<p class="text-fg-soft text-sm whitespace-pre-wrap mt-1">{data.systemBroadcast.content}</p>
			<p class="text-xs font-mono text-fg-muted mt-2">
				FROM: {data.systemBroadcast.issuer?.profile?.name || "Admin"} · {formatDate(data.systemBroadcast.createdAt)}
			</p>
		</div>
	{/if}

	<!-- Enemy propaganda leaflets dropped over the user's state (psyops) -->
	{#each data.leaflets as leaflet, i (leaflet.id)}
		<article
			class="paper relative rounded-sm p-5 pr-24"
			style:--stamp-tilt="{i % 2 ? 6 : -8}deg"
			aria-label="Enemy propaganda leaflet"
		>
			<span class="stamp absolute right-3 top-3">Propaganda</span>
			<p class="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
				Leaflet found in the streets · {formatDate(leaflet.droppedAt)}
			</p>
			<p class="mt-2 font-serif text-base leading-snug text-fg whitespace-pre-wrap">{leaflet.message}</p>
			<p class="mt-2 text-xs text-fg-muted">
				{leaflet.from ? `Dropped by ${leaflet.from}.` : "Sender unknown."} Enemy psychological operation.
			</p>
		</article>
	{/each}

	<!-- Broadcasts: the latest standing order from each chain of command you're under -->
	<section class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="section-title">
				<FluentMegaphone20Filled class="size-4" />
				Broadcasts
			</h2>
			<Button href="/broadcasts" variant="ghost" size="sm" icon={FluentHistory20Filled}>History</Button>
		</div>

		{#if data.stateBroadcast}
			<div class="relative overflow-hidden rounded-sm border-l-4 border-politics bg-surface-2 p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentBuildingGovernment20Filled class="size-4 text-politics" />
						<span class="text-[10px] font-bold text-politics-fg uppercase tracking-[0.2em]">
							State Broadcast — {data.stateBroadcast.state?.name || "State"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-politics-bg/25 text-politics-fg"
					>
						Order
					</span>
				</div>
				<h3 class="text-fg font-bold uppercase tracking-wide">{data.stateBroadcast.title}</h3>
				<p class="text-fg-soft text-sm whitespace-pre-wrap mt-1">{data.stateBroadcast.content}</p>
				<p class="text-xs font-mono text-fg-muted mt-2">
					FROM: {data.stateBroadcast.issuer?.profile?.name || "President"} · {formatDate(data.stateBroadcast.createdAt)}
				</p>
			</div>
		{/if}

		{#if data.partyBroadcast}
			<div class="relative overflow-hidden rounded-sm border-l-4 border-positive bg-surface-2 p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentPeople20Filled class="size-4 text-positive" />
						<span class="text-[10px] font-bold text-positive-fg uppercase tracking-[0.2em]">
							Party Broadcast — {data.partyBroadcast.party?.name || "Party"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-positive-bg/25 text-positive-fg"
					>
						Order
					</span>
				</div>
				<h3 class="text-fg font-bold uppercase tracking-wide">{data.partyBroadcast.title}</h3>
				<p class="text-fg-soft text-sm whitespace-pre-wrap mt-1">{data.partyBroadcast.content}</p>
				<p class="text-xs font-mono text-fg-muted mt-2">
					FROM: {data.partyBroadcast.issuer?.profile?.name || "Party Leader"} · {formatDate(
						data.partyBroadcast.createdAt
					)}
				</p>
			</div>
		{/if}

		{#if data.blocBroadcast}
			<div class="relative overflow-hidden rounded-sm border-l-4 border-friendly bg-surface-2 p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentFlag20Filled class="size-4 text-friendly" />
						<span class="text-[10px] font-bold text-friendly-fg uppercase tracking-[0.2em]">
							Bloc Broadcast — {data.blocBroadcast.bloc?.name || "Bloc"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-friendly-bg/25 text-friendly-fg"
					>
						Order
					</span>
				</div>
				<h3 class="text-fg font-bold uppercase tracking-wide">{data.blocBroadcast.title}</h3>
				<p class="text-fg-soft text-sm whitespace-pre-wrap mt-1">{data.blocBroadcast.content}</p>
				<p class="text-xs font-mono text-fg-muted mt-2">
					FROM: {data.blocBroadcast.issuer?.profile?.name || "Bloc Leader"} · {formatDate(data.blocBroadcast.createdAt)}
				</p>
			</div>
		{/if}

		{#if !data.stateBroadcast && !data.partyBroadcast && !data.blocBroadcast}
			<p class="panel-muted rounded-sm p-5 text-sm text-fg-muted text-center">
				No standing orders from your state, party or bloc right now.
			</p>
		{/if}
	</section>

	<!-- Current Wars in the region -->
	{#if data.activeWars.length > 0}
		<div class="panel rounded-sm overflow-hidden border-red-500/30">
			<div class="bg-red-600/10 border-b border-red-500/30 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<h2 class="text-lg font-semibold text-fg">Wars in Your Region</h2>
					</div>
					<Badge tone="red"><span class="font-mono">{data.activeWars.length}</span> ACTIVE</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.activeWars as war (war.id)}
					<a
						href="/war/{war.id}"
						class="block panel-muted rounded-sm p-3 sm:p-4 hover:border-red-500/40 hover:bg-surface-9 transition-all group"
					>
						<div class="flex items-center gap-3">
							<!-- Attacker -->
							<div class="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
								<div class="min-w-0">
									<div class="text-sm font-bold text-fg group-hover:text-primary-hover transition-colors truncate">
										{war.attacker.name}
									</div>
									{#if war.attackerBloc}
										<div class="text-[10px] truncate" style="color: {war.attackerBloc.color}">
											{war.attackerBloc.name}
										</div>
									{/if}
								</div>
								<Logo
									src={war.attacker.logo}
									alt={war.attacker.name}
									class="size-9 rounded-sm border border-line/15"
									placeholderIcon={FluentFlag20Filled}
									placeholderGradient="from-red-600 to-red-800"
								/>
							</div>

							<span class="text-red-400 text-xs font-bold shrink-0">VS</span>

							<!-- Defender -->
							<div class="flex items-center gap-2 flex-1 min-w-0">
								<Logo
									src={war.defender.logo}
									alt={war.defender.name}
									class="size-9 rounded-sm border border-line/15"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-friendly to-friendly-bg"
								/>
								<div class="min-w-0">
									<div class="text-sm font-bold text-fg group-hover:text-primary-hover transition-colors truncate">
										{war.defender.name}
									</div>
									{#if war.defenderBloc}
										<div class="text-[10px] truncate" style="color: {war.defenderBloc.color}">
											{war.defenderBloc.name}
										</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="flex items-center justify-between mt-3 pt-3 border-t border-line/15">
							<div class="flex items-center gap-2">
								<Badge tone={war.side === "defender" ? "blue" : "red"} size="xs" class="uppercase">
									{war.side === "defender" ? "Defending" : "Attacking"}
								</Badge>
								{#if war.ongoingBattles > 0}
									<Badge tone="amber" size="xs">⚔️ <span class="font-mono">{war.ongoingBattles}</span> LIVE</Badge>
								{/if}
							</div>
							<span class="text-[10px] text-fg-muted">
								Declared {formatDate(war.declaredAt)}
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Ongoing Battles in Region -->
	{#if data.ongoingBattles.length > 0}
		<div class="panel rounded-sm overflow-hidden border-primary/35">
			<div class="bg-primary/12 border-b border-primary/35 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-primary rounded-full animate-pulse"></div>
						<h2 class="text-lg font-semibold text-fg">Active Battles</h2>
					</div>
					<Badge tone="amber"><span class="font-mono">{data.ongoingBattles.length}</span> ONGOING</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.ongoingBattles as battle (battle.id)}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 panel-muted rounded-sm p-3 sm:p-4 hover:border-primary/55 hover:bg-surface-9 transition-all group"
					>
						<Logo
							src={regionCoatUrl(battle.regionId)}
							alt={getRegionName(battle.regionId)}
							class="size-10 sm:size-12 rounded-sm border border-line/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-primary to-red-600"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-fg group-hover:text-primary-hover transition-colors truncate"
							>
								{getRegionName(battle.regionId)}
							</div>
							<div class="text-xs text-fg-muted">
								{battle.attackerState.name} → {battle.defenderState.name}
							</div>
						</div>
						<div class="flex items-center gap-2 flex-shrink-0">
							<Badge tone="amber">⚔️ LIVE</Badge>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quick Actions -->
	<SectionCard>
		<h2 class="section-title mb-4">Quick Actions</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<Button href="/posts/new" variant="subtle" icon={FluentEdit20Filled} class="justify-start">Write a Post</Button>
			<Button href="/newspaper" variant="subtle" icon={MdiNewspaper} class="justify-start">Newspapers</Button>
			<Button href="/map" variant="subtle" icon={FluentHome20Filled} class="justify-start">Explore Map</Button>
			{#if data.stateSnapshot}
				<Button
					href="/state/{data.stateSnapshot.id}"
					variant="subtle"
					icon={FluentBuildingGovernment20Filled}
					class="justify-start"
				>
					My State
				</Button>
			{/if}
			<Button href="/market" variant="subtle" icon={FluentMoney20Filled} class="justify-start">Market</Button>
			<Button href="/chat" variant="subtle" icon={FluentPeople20Filled} class="justify-start">Chat</Button>
			<Button href="/my-moderation" variant="subtle" icon={FluentHistory20Filled} class="justify-start">
				My record
			</Button>
			{#if data.account.role === "admin" || data.account.role === "moderator"}
				<Button href="/moderators" variant="subtle" icon={FluentShield20Filled} class="justify-start">
					Moderator Panel
				</Button>
			{/if}
			{#if data.account.role === "admin"}
				<Button href="/admin" variant="subtle" icon={FluentShieldLock20Filled} class="justify-start">
					Admin Panel
				</Button>
			{/if}
		</div>
	</SectionCard>
</PageContainer>
