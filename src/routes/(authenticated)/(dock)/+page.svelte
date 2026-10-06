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
		<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-5">
			<div class="flex items-start gap-4">
				<div
					class="size-12 shrink-0 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm flex items-center justify-center text-2xl"
				>
					🎂
				</div>
				<div class="flex-1 min-w-0">
					{#if data.birthdayInfo.isBirthday}
						<h3 class="text-lg font-bold text-[#f7c56b]">
							🎉 Happy Birthday, {data.account.profile?.name || "friend"}! 🎉
						</h3>
						<p class="text-sm text-[#d9ccb7] mt-1">
							Your account turns {data.birthdayInfo.totalYears} today. Here's a gift to celebrate!
						</p>
					{:else}
						<h3 class="text-lg font-bold text-[#f7c56b]">🎁 A birthday gift is waiting!</h3>
						<p class="text-sm text-[#d9ccb7] mt-1">
							{#if data.birthdayInfo.uncollectedYears.length === 1}
								Your year {data.birthdayInfo.uncollectedYears[0]} anniversary reward is ready to collect.
							{:else}
								You have {data.birthdayInfo.uncollectedYears.length} uncollected anniversary rewards saved up.
							{/if}
						</p>
					{/if}
					<p class="text-xs text-[#a89e8e] mt-2">
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
			<h2 class="text-[10px] font-bold text-[#a89e8e] uppercase tracking-wide flex items-center gap-2">
				<FluentGlobe20Filled class="size-4 text-[#7ba0c8]" /> Your Location
			</h2>
			{#if data.userLocation}
				<a
					href="/region/{data.userLocation.regionId}"
					class="text-xs text-[#e5d8c1]/70 hover:text-[#f2c463] transition-colors flex items-center gap-1"
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
					class="size-14 rounded-sm border border-[#dfceb0]/15"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-[#315d8d] to-[#1e3a5f]"
				/>
				<div class="flex-1 min-w-0">
					<div class="text-xs text-[#a89e8e]">{regionName}</div>
					<div class="flex items-center gap-2 flex-wrap">
						<a
							href="/state/{data.stateSnapshot.id}"
							class="text-lg font-bold text-[#fff7e8] hover:text-[#f2c463] transition-colors truncate"
						>
							{data.stateSnapshot.name}
						</a>
						{#if data.stateSnapshot.capitulated}
							<Badge tone="red" size="xs">Capitulated</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-4 mt-1 text-xs text-[#a89e8e]">
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5 text-[#7ba0c8]" />
							{data.stateSnapshot.population.toLocaleString()}
						</span>
						<span class="flex items-center gap-1">
							<FluentStar20Filled class="size-3.5 text-[#f7c56b]" />
							{data.stateSnapshot.rating.toLocaleString()}
						</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 text-[#a89e8e] text-sm">
				<FluentGlobe20Filled class="size-5 shrink-0" />
				<span>
					{regionName ? `${regionName} is not controlled by any state.` : "You have not settled in a region yet."}
					<a href="/map" class="text-[#f7c56b] hover:text-[#f2c463] transition-colors">Explore the map</a>.
				</span>
			</div>
		{/if}
	</SectionCard>

	<!-- Active Broadcasts -->
	{#if data.systemBroadcast || data.stateBroadcast || data.partyBroadcast}
		<div class="space-y-3">
			{#if data.systemBroadcast}
				<div class="bg-red-600/10 rounded-sm border border-red-500/30 p-5">
					<div class="flex items-start gap-3">
						<div
							class="size-10 bg-red-600/10 border border-red-500/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentMegaphone20Filled class="size-5 text-red-400" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-[10px] font-medium text-red-300 uppercase tracking-wide">System Broadcast</span>
							</div>
							<h3 class="text-[#fff7e8] font-bold">{data.systemBroadcast.title}</h3>
							<p class="text-[#d9ccb7] text-sm whitespace-pre-wrap mt-1">{data.systemBroadcast.content}</p>
							<p class="text-xs text-[#a89e8e] mt-2">
								{data.systemBroadcast.issuer?.profile?.name || "Admin"} · {formatDate(data.systemBroadcast.createdAt)}
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.stateBroadcast}
				<div class="bg-[#8c709b]/15 rounded-sm border border-[#b7a0c5]/30 p-5">
					<div class="flex items-start gap-3">
						<div
							class="size-10 bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentBuildingGovernment20Filled class="size-5 text-[#b7a0c5]" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-[10px] font-medium text-[#d5c4df] uppercase tracking-wide">
									{data.stateBroadcast.state?.name || "State"} Broadcast
								</span>
							</div>
							<h3 class="text-[#fff7e8] font-bold">{data.stateBroadcast.title}</h3>
							<p class="text-[#d9ccb7] text-sm whitespace-pre-wrap mt-1">{data.stateBroadcast.content}</p>
							<p class="text-xs text-[#a89e8e] mt-2">
								{data.stateBroadcast.issuer?.profile?.name || "President"} · {formatDate(data.stateBroadcast.createdAt)}
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.partyBroadcast}
				<div class="bg-[#587252]/18 rounded-sm border border-[#8fae88]/30 p-5">
					<div class="flex items-start gap-3">
						<div
							class="size-10 bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentPeople20Filled class="size-5 text-[#8fae88]" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-[10px] font-medium text-[#c6dfbf] uppercase tracking-wide">
									{data.partyBroadcast.party?.name || "Party"} Broadcast
								</span>
							</div>
							<h3 class="text-[#fff7e8] font-bold">{data.partyBroadcast.title}</h3>
							<p class="text-[#d9ccb7] text-sm whitespace-pre-wrap mt-1">{data.partyBroadcast.content}</p>
							<p class="text-xs text-[#a89e8e] mt-2">
								{data.partyBroadcast.issuer?.profile?.name || "Party Leader"} · {formatDate(
									data.partyBroadcast.createdAt
								)}
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Current Wars in the region -->
	{#if data.activeWars.length > 0}
		<div class="panel rounded-sm overflow-hidden border-red-500/30">
			<div class="bg-red-600/10 border-b border-red-500/30 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<h2 class="text-lg font-semibold text-[#fff7e8]">Wars in Your Region</h2>
					</div>
					<Badge tone="red"><span class="font-mono">{data.activeWars.length}</span> ACTIVE</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.activeWars as war (war.id)}
					<a
						href="/war/{war.id}"
						class="block panel-muted rounded-sm p-3 sm:p-4 hover:border-red-500/40 hover:bg-[#19304b] transition-all group"
					>
						<div class="flex items-center gap-3">
							<!-- Attacker -->
							<div class="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
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
									class="size-9 rounded-sm border border-[#dfceb0]/15"
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
									class="size-9 rounded-sm border border-[#dfceb0]/15"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-[#7ba0c8] to-[#315d8d]"
								/>
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate">
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

						<div class="flex items-center justify-between mt-3 pt-3 border-t border-[#dfceb0]/15">
							<div class="flex items-center gap-2">
								<Badge tone={war.side === "defender" ? "blue" : "red"} size="xs" class="uppercase">
									{war.side === "defender" ? "Defending" : "Attacking"}
								</Badge>
								{#if war.ongoingBattles > 0}
									<Badge tone="amber" size="xs">⚔️ <span class="font-mono">{war.ongoingBattles}</span> LIVE</Badge>
								{/if}
							</div>
							<span class="text-[10px] text-[#a89e8e]">
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
		<div class="panel rounded-sm overflow-hidden border-[#e6a527]/35">
			<div class="bg-[#e6a527]/12 border-b border-[#e6a527]/35 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-[#e6a527] rounded-full animate-pulse"></div>
						<h2 class="text-lg font-semibold text-[#fff7e8]">Active Battles</h2>
					</div>
					<Badge tone="amber"><span class="font-mono">{data.ongoingBattles.length}</span> ONGOING</Badge>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.ongoingBattles as battle (battle.id)}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 panel-muted rounded-sm p-3 sm:p-4 hover:border-[#e6a527]/55 hover:bg-[#19304b] transition-all group"
					>
						<Logo
							src="/coats/{battle.regionId}.svg"
							alt={getRegionName(battle.regionId)}
							class="size-10 sm:size-12 rounded-sm border border-[#dfceb0]/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-[#e6a527] to-red-600"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-[#fff7e8] group-hover:text-[#f2c463] transition-colors truncate"
							>
								{getRegionName(battle.regionId)}
							</div>
							<div class="text-xs text-[#a89e8e]">
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
