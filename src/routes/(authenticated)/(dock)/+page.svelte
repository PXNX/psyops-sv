<script lang="ts">
	import { enhance } from "$app/forms";
	import TravelProgress from "#lib/component/TravelProgress.svelte";
	import ThreeAnimation from "#lib/component/ThreeAnimation.svelte";
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
	import { formatDate, getRegionName } from "#lib/utils/formatting.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let showBirthdayAnim = $state(false);

	const regionName = $derived(data.userLocation ? getRegionName(data.userLocation.regionId) : null);

	async function handleTravelComplete() {
		try {
			const response = await fetch("/api/travel/arrive", {
				method: "POST"
			});
			const result = await response.json();
			if (result.success) {
				window.location.reload();
			} else if (result.timeRemaining && result.timeRemaining > 0) {
				setTimeout(handleTravelComplete, result.timeRemaining * 1000 + 500);
			} else {
				window.location.reload();
			}
		} catch {
			window.location.reload();
		}
	}

	function handleTravelCancel() {
		window.location.reload();
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
		<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div
					class="size-12 shrink-0 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm flex items-center justify-center text-2xl"
				>
					🎂
				</div>
				<div class="flex-1 min-w-0">
					{#if data.birthdayInfo.isBirthday}
						<h3 class="text-lg font-bold text-[#ffd35c]">
							🎉 Happy Birthday, {data.account.profile?.name || "friend"}! 🎉
						</h3>
						<p class="text-sm text-[#d3caa9] mt-1">
							Your account turns {data.birthdayInfo.totalYears} today. Here's a gift to celebrate!
						</p>
					{:else}
						<h3 class="text-lg font-bold text-[#ffd35c]">🎁 A birthday gift is waiting!</h3>
						<p class="text-sm text-[#d3caa9] mt-1">
							{#if data.birthdayInfo.uncollectedYears.length === 1}
								Your year {data.birthdayInfo.uncollectedYears[0]} anniversary reward is ready to collect.
							{:else}
								You have {data.birthdayInfo.uncollectedYears.length} uncollected anniversary rewards saved up.
							{/if}
						</p>
					{/if}
					<p class="text-xs text-[#a8a083] mt-2">
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
								if (result.type === "success") {
									showBirthdayAnim = true;
								}
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

	<!-- Location & State snapshot -->
	<SectionCard>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-[10px] font-bold text-[#a8a083] uppercase tracking-wide flex items-center gap-2">
				<FluentGlobe20Filled class="size-4 text-[#5eaef5]" /> Your Location
			</h2>
			{#if data.userLocation}
				<a
					href="/region/{data.userLocation.regionId}"
					class="text-xs text-[#e6ddbf]/70 hover:text-[#ffcf47] transition-colors flex items-center gap-1"
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
					class="size-14 rounded-sm border border-[#c8b47a]/15"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-[#2369b5] to-[#2b3322]"
				/>
				<div class="flex-1 min-w-0">
					<div class="text-xs text-[#a8a083]">{regionName}</div>
					<div class="flex items-center gap-2 flex-wrap">
						<a
							href="/state/{data.stateSnapshot.id}"
							class="text-lg font-bold text-[#f5efd8] hover:text-[#ffcf47] transition-colors truncate"
						>
							{data.stateSnapshot.name}
						</a>
						{#if data.stateSnapshot.capitulated}
							<Badge tone="red" size="xs">Capitulated</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-4 mt-1 text-xs text-[#a8a083]">
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5 text-[#5eaef5]" />
							{data.stateSnapshot.population.toLocaleString()}
						</span>
						<span class="flex items-center gap-1">
							<FluentStar20Filled class="size-3.5 text-[#ffd35c]" />
							{data.stateSnapshot.rating.toLocaleString()}
						</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 text-[#a8a083] text-sm">
				<FluentGlobe20Filled class="size-5 shrink-0" />
				<span>
					{regionName ? `${regionName} is not controlled by any state.` : "You have not settled in a region yet."}
					<a href="/map" class="text-[#ffd35c] hover:text-[#ffcf47] transition-colors">Explore the map</a>.
				</span>
			</div>
		{/if}
	</SectionCard>

	<!-- System Broadcast: shown separately, outranks everything below -->
	{#if data.systemBroadcast}
		<div class="relative overflow-hidden rounded-sm border-l-4 border-red-500 bg-[#141810] p-5">
			<div class="flex items-center justify-between gap-3 mb-2">
				<div class="flex items-center gap-2">
					<FluentMegaphone20Filled class="size-4 text-red-400" />
					<span class="text-[10px] font-bold text-red-300 uppercase tracking-[0.2em]">System Broadcast</span>
				</div>
				<span class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-red-600/20 text-red-300"
					>Order</span
				>
			</div>
			<h3 class="text-[#f5efd8] font-bold uppercase tracking-wide">{data.systemBroadcast.title}</h3>
			<p class="text-[#d3caa9] text-sm whitespace-pre-wrap mt-1">{data.systemBroadcast.content}</p>
			<p class="text-xs font-mono text-[#a8a083] mt-2">
				FROM: {data.systemBroadcast.issuer?.profile?.name || "Admin"} · {formatDate(data.systemBroadcast.createdAt)}
			</p>
		</div>
	{/if}

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
			<div class="relative overflow-hidden rounded-sm border-l-4 border-[#c08cf0] bg-[#141810] p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentBuildingGovernment20Filled class="size-4 text-[#c08cf0]" />
						<span class="text-[10px] font-bold text-[#e3cbfb] uppercase tracking-[0.2em]">
							State Broadcast — {data.stateBroadcast.state?.name || "State"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#8a4fc0]/25 text-[#e3cbfb]"
						>Order</span
					>
				</div>
				<h3 class="text-[#f5efd8] font-bold uppercase tracking-wide">{data.stateBroadcast.title}</h3>
				<p class="text-[#d3caa9] text-sm whitespace-pre-wrap mt-1">{data.stateBroadcast.content}</p>
				<p class="text-xs font-mono text-[#a8a083] mt-2">
					FROM: {data.stateBroadcast.issuer?.profile?.name || "President"} · {formatDate(
						data.stateBroadcast.createdAt
					)}
				</p>
			</div>
		{/if}

		{#if data.partyBroadcast}
			<div class="relative overflow-hidden rounded-sm border-l-4 border-[#6fd14a] bg-[#141810] p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentPeople20Filled class="size-4 text-[#6fd14a]" />
						<span class="text-[10px] font-bold text-[#b9f29a] uppercase tracking-[0.2em]">
							Party Broadcast — {data.partyBroadcast.party?.name || "Party"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#3f8a2a]/25 text-[#b9f29a]"
						>Order</span
					>
				</div>
				<h3 class="text-[#f5efd8] font-bold uppercase tracking-wide">{data.partyBroadcast.title}</h3>
				<p class="text-[#d3caa9] text-sm whitespace-pre-wrap mt-1">{data.partyBroadcast.content}</p>
				<p class="text-xs font-mono text-[#a8a083] mt-2">
					FROM: {data.partyBroadcast.issuer?.profile?.name || "Party Leader"} · {formatDate(
						data.partyBroadcast.createdAt
					)}
				</p>
			</div>
		{/if}

		{#if data.blocBroadcast}
			<div class="relative overflow-hidden rounded-sm border-l-4 border-[#5eaef5] bg-[#141810] p-5">
				<div class="flex items-center justify-between gap-3 mb-2">
					<div class="flex items-center gap-2">
						<FluentFlag20Filled class="size-4 text-[#5eaef5]" />
						<span class="text-[10px] font-bold text-[#b3dcff] uppercase tracking-[0.2em]">
							Bloc Broadcast — {data.blocBroadcast.bloc?.name || "Bloc"}
						</span>
					</div>
					<span
						class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-[#2369b5]/25 text-[#b3dcff]"
						>Order</span
					>
				</div>
				<h3 class="text-[#f5efd8] font-bold uppercase tracking-wide">{data.blocBroadcast.title}</h3>
				<p class="text-[#d3caa9] text-sm whitespace-pre-wrap mt-1">{data.blocBroadcast.content}</p>
				<p class="text-xs font-mono text-[#a8a083] mt-2">
					FROM: {data.blocBroadcast.issuer?.profile?.name || "Bloc Leader"} · {formatDate(
						data.blocBroadcast.createdAt
					)}
				</p>
			</div>
		{/if}

		{#if !data.stateBroadcast && !data.partyBroadcast && !data.blocBroadcast}
			<p class="panel-muted rounded-sm p-5 text-sm text-[#a8a083] text-center">
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
						<h2 class="text-lg font-semibold text-[#f5efd8]">Wars in Your Region</h2>
					</div>
					<Badge tone="red"><span class="font-mono">{data.activeWars.length}</span> ACTIVE</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.activeWars as war (war.id)}
					<a
						href="/war/{war.id}"
						class="block panel-muted rounded-sm p-3 sm:p-4 hover:border-red-500/40 hover:bg-[#2e3524] transition-all group"
					>
						<div class="flex items-center gap-3">
							<!-- Attacker -->
							<div class="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
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
									class="size-9 rounded-sm border border-[#c8b47a]/15"
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
									class="size-9 rounded-sm border border-[#c8b47a]/15"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-[#5eaef5] to-[#2369b5]"
								/>
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
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

						<div class="flex items-center justify-between mt-3 pt-3 border-t border-[#c8b47a]/15">
							<div class="flex items-center gap-2">
								<Badge tone={war.side === "defender" ? "blue" : "red"} size="xs" class="uppercase">
									{war.side === "defender" ? "Defending" : "Attacking"}
								</Badge>
								{#if war.ongoingBattles > 0}
									<Badge tone="amber" size="xs">⚔️ <span class="font-mono">{war.ongoingBattles}</span> LIVE</Badge>
								{/if}
							</div>
							<span class="text-[10px] text-[#a8a083]">
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
		<div class="panel rounded-sm overflow-hidden border-[#f2b01e]/35">
			<div class="bg-[#f2b01e]/12 border-b border-[#f2b01e]/35 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-[#f2b01e] rounded-full animate-pulse"></div>
						<h2 class="text-lg font-semibold text-[#f5efd8]">Active Battles</h2>
					</div>
					<Badge tone="amber"><span class="font-mono">{data.ongoingBattles.length}</span> ONGOING</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.ongoingBattles as battle (battle.id)}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 panel-muted rounded-sm p-3 sm:p-4 hover:border-[#f2b01e]/55 hover:bg-[#2e3524] transition-all group"
					>
						<Logo
							src="/coats/{battle.regionId}.svg"
							alt={getRegionName(battle.regionId)}
							class="size-10 sm:size-12 rounded-sm border border-[#c8b47a]/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#f2b01e] to-red-600"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate"
							>
								{getRegionName(battle.regionId)}
							</div>
							<div class="text-xs text-[#a8a083]">
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

{#if showBirthdayAnim}
	<ThreeAnimation variant="party" onComplete={() => (showBirthdayAnim = false)} />
{/if}
