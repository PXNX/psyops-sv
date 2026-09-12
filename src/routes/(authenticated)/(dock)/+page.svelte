<script lang="ts">
	import { enhance } from "$app/forms";
	import TravelProgress from "$lib/component/TravelProgress.svelte";
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import Logo from "$lib/component/Logo.svelte";
	import Badge from "$lib/component/ui/Badge.svelte";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import FluentShieldLock20Filled from "~icons/fluent/shield-lock-20-filled";
	import { formatDate, getRegionName } from "$lib/utils/formatting.js";
	import { buttonClass } from "$lib/component/ui/styles";
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
		<div class="bg-[#e6a527]/10 border border-[#e6a527]/30 rounded-xl p-5">
			<div class="flex items-start gap-4">
				<div class="size-12 shrink-0 bg-[#e6a527]/20 rounded-lg flex items-center justify-center text-2xl">🎂</div>
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
						<button type="submit" class={buttonClass({ variant: "soft-amber", size: "sm" })}>
							<FluentGiftCardArrowRight20Filled class="size-4" />
							Collect {data.birthdayInfo.rewardTotal.toLocaleString()} Currency
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Location & State snapshot -->
	<SectionCard>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-sm font-bold text-[#a89e8e] uppercase tracking-wide flex items-center gap-2">
				<FluentGlobe20Filled class="size-4" /> Your Location
			</h2>
			{#if data.userLocation}
				<a
					href="/region/{data.userLocation.regionId}"
					class="text-xs text-[#7ba0c8] hover:text-[#b7d0e6] flex items-center gap-1"
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
					class="size-14 rounded-lg border border-[#dfceb0]/15"
					placeholderIcon={FluentBuildingGovernment20Filled}
					placeholderGradient="from-[#315d8d] to-[#1e3a5f]"
				/>
				<div class="flex-1 min-w-0">
					<div class="text-xs text-[#a89e8e]">{regionName}</div>
					<div class="flex items-center gap-2 flex-wrap">
						<a href="/state/{data.stateSnapshot.id}" class="text-lg font-bold text-[#fff7e8] hover:text-[#b7d0e6] truncate">
							{data.stateSnapshot.name}
						</a>
						{#if data.stateSnapshot.capitulated}
							<Badge tone="red" size="xs">Capitulated</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-4 mt-1 text-xs text-[#a89e8e]">
						<span class="flex items-center gap-1">
							<FluentPeople20Filled class="size-3.5" />
							{data.stateSnapshot.population.toLocaleString()}
						</span>
						<span class="flex items-center gap-1">
							<FluentStar20Filled class="size-3.5 text-amber-400" />
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
					<a href="/map" class="text-[#7ba0c8] hover:text-[#b7d0e6]">Explore the map</a>.
				</span>
			</div>
		{/if}
	</SectionCard>

	<!-- Active Broadcasts -->
	{#if data.systemBroadcast || data.stateBroadcast || data.partyBroadcast}
		<div class="space-y-3">
			{#if data.systemBroadcast}
				<div class="bg-red-600/10 rounded-xl border border-red-500/20 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-red-600/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentMegaphone20Filled class="size-5 text-red-400" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-red-400 uppercase tracking-wide">System Broadcast</span>
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
				<div class="bg-[#8c709b]/10 rounded-xl border border-[#8c709b]/25 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-[#8c709b]/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentBuildingGovernment20Filled class="size-5 text-[#d5c4df]" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-[#d5c4df] uppercase tracking-wide">
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
				<div class="bg-[#587252]/10 rounded-xl border border-[#587252]/25 p-5">
					<div class="flex items-start gap-3">
						<div class="size-10 bg-[#587252]/20 rounded-lg flex items-center justify-center shrink-0">
							<FluentPeople20Filled class="size-5 text-[#c6dfbf]" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-xs font-medium text-[#c6dfbf] uppercase tracking-wide">
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
		<div class="bg-[#14283f]/85 border-2 border-red-500/30 rounded-xl overflow-hidden">
			<div class="bg-red-950/30 border-b border-red-500/30 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-red-500 rounded-full animate-pulse"></div>
						<h2 class="text-base font-bold text-red-400 font-mono uppercase tracking-wide">Wars in Your Region</h2>
					</div>
					<div class="px-2 py-1 bg-red-950/50 border border-red-500/40 rounded text-red-400 font-mono text-xs">
						{data.activeWars.length} ACTIVE
					</div>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.activeWars as war (war.id)}
					<a
						href="/war/{war.id}"
						class="block bg-[#102239]/70 border border-red-500/20 rounded-lg p-3 sm:p-4 hover:border-red-400/40 transition-all group"
					>
						<div class="flex items-center gap-3">
							<!-- Attacker -->
							<div class="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#fff7e8] truncate">{war.attacker.name}</div>
									{#if war.attackerBloc}
										<div class="text-[10px] font-mono truncate" style="color: {war.attackerBloc.color}">
											{war.attackerBloc.name}
										</div>
									{/if}
								</div>
								<Logo
									src={war.attacker.logo}
									alt={war.attacker.name}
									class="size-9 rounded border border-[#dfceb0]/15"
									placeholderIcon={FluentFlag20Filled}
									placeholderGradient="from-red-500 to-orange-500"
								/>
							</div>

							<span class="text-red-400 font-mono text-xs font-bold shrink-0">VS</span>

							<!-- Defender -->
							<div class="flex items-center gap-2 flex-1 min-w-0">
								<Logo
									src={war.defender.logo}
									alt={war.defender.name}
									class="size-9 rounded border border-[#dfceb0]/15"
									placeholderIcon={FluentShield20Filled}
									placeholderGradient="from-[#7ba0c8] to-[#315d8d]"
								/>
								<div class="min-w-0">
									<div class="text-sm font-bold text-[#fff7e8] truncate">{war.defender.name}</div>
									{#if war.defenderBloc}
										<div class="text-[10px] font-mono truncate" style="color: {war.defenderBloc.color}">
											{war.defenderBloc.name}
										</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="flex items-center justify-between mt-3 pt-3 border-t border-[#dfceb0]/15">
							<div class="flex items-center gap-2">
								<span
									class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono {war.side === 'defender'
										? 'bg-[#315d8d]/15 border border-[#7ba0c8]/30 text-[#b7d0e6]'
										: 'bg-orange-500/15 border border-orange-500/30 text-orange-400'}"
								>
									{war.side === "defender" ? "Defending" : "Attacking"}
								</span>
								{#if war.ongoingBattles > 0}
									<span
										class="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded text-[10px] font-bold text-amber-400 font-mono"
									>
										⚔️ {war.ongoingBattles} LIVE
									</span>
								{/if}
							</div>
							<span class="text-[10px] text-[#a89e8e] font-mono">
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
		<div class="bg-[#14283f]/85 border-2 border-amber-500/30 rounded-xl overflow-hidden">
			<div class="bg-amber-950/30 border-b border-amber-500/30 px-4 sm:px-5 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="size-2 bg-amber-500 rounded-full animate-pulse"></div>
						<h2 class="text-base font-bold text-amber-400 font-mono uppercase tracking-wide">Active Battles</h2>
					</div>
					<div class="px-2 py-1 bg-amber-950/50 border border-amber-500/40 rounded text-amber-400 font-mono text-xs">
						{data.ongoingBattles.length} ONGOING
					</div>
				</div>
			</div>
			<div class="p-3 sm:p-4 space-y-2">
				{#each data.ongoingBattles as battle (battle.id)}
					<a
						href="/battle/{battle.id}"
						class="flex items-center gap-3 sm:gap-4 bg-[#102239]/70 border border-amber-500/20 rounded-lg p-3 sm:p-4 hover:border-amber-400/40 transition-all group"
					>
						<Logo
							src="/coats/{battle.regionId}.svg"
							alt={getRegionName(battle.regionId)}
							class="size-10 sm:size-12 rounded border border-[#dfceb0]/15"
							placeholderIcon={FluentShield20Filled}
							placeholderGradient="from-amber-500 to-red-500"
						/>
						<div class="flex-1 min-w-0">
							<div
								class="text-sm sm:text-base font-bold text-[#fff7e8] group-hover:text-amber-400 transition-colors truncate"
							>
								{getRegionName(battle.regionId)}
							</div>
							<div class="text-xs text-[#a89e8e] font-mono">
								{battle.attackerState.name} → {battle.defenderState.name}
							</div>
						</div>
						<div class="flex items-center gap-2 flex-shrink-0">
							<span
								class="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-mono font-bold"
							>
								⚔️ LIVE
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Quick Actions -->
	<SectionCard>
		<h2 class="text-xl font-bold text-[#fff7e8] mb-4">Quick Actions</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<a href="/map" class="btn btn-ghost justify-start">
				<FluentHome20Filled class="size-5" />
				Explore Map
			</a>
			{#if data.stateSnapshot}
				<a href="/state/{data.stateSnapshot.id}" class="btn btn-ghost justify-start">
					<FluentBuildingGovernment20Filled class="size-5" />
					My State
				</a>
			{/if}
			<a href="/market" class="btn btn-ghost justify-start">
				<FluentMoney20Filled class="size-5" />
				Market
			</a>
			<a href="/chat" class="btn btn-ghost justify-start">
				<FluentPeople20Filled class="size-5" />
				Chat
			</a>
			<a href="/fallen" class="btn btn-ghost justify-start">
				<FluentBuildingBank20Filled class="size-5" />
				Fallen States
			</a>
			{#if data.account.role === "admin" || data.account.role === "moderator"}
				<a href="/moderators" class="btn btn-ghost justify-start">
					<FluentShield20Filled class="size-5" />
					Moderator Panel
				</a>
			{/if}
			{#if data.account.role === "admin"}
				<a href="/admin" class="btn btn-ghost justify-start">
					<FluentShieldLock20Filled class="size-5" />
					Admin Panel
				</a>
			{/if}
		</div>
	</SectionCard>
</PageContainer>

{#if showBirthdayAnim}
	<ThreeAnimation variant="party" onComplete={() => (showBirthdayAnim = false)} />
{/if}
