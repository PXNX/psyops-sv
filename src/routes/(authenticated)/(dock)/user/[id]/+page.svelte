<!-- src/routes/(authenticated)/user/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import confetti from "canvas-confetti";
	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentPersonDelete20Filled from "~icons/fluent/person-delete-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPeopleTeam20Filled from "~icons/fluent/people-team-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentGlobeShield20Filled from "~icons/fluent/globe-shield-20-filled";

	import Modal from "#lib/component/Modal.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ReportModal from "#lib/component/ReportModal.svelte";
	import AddAuthorModal from "./AddAuthorModal.svelte";
	import EditProfileSheet from "./EditProfileSheet.svelte";
	import ProfileItem from "#lib/component/ProfileItem.svelte";
	import FluentMoreHorizontal20Filled from "~icons/fluent/more-horizontal-20-filled";
	import * as m from "#lib/paraglide/messages.js";
	import { shareLink } from "#lib/util.js";
	import { formatDate, getDaysRemaining } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import ActionListItem from "#lib/component/ui/ActionListItem.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";

	const { data, form } = $props();

	let showAppointDialog = $state(false);
	let showReportModal = $state(false);
	let showAddAuthorModal = $state(false);
	let showActionsSheet = $state(false);
	let showGiftPremiumModal = $state(false);
	let showEditProfileSheet = $state(false);
	let giftPremiumPlanId = $state(data.premiumPlans?.[0]?.id ?? "monthly");
	let isGiftingPremium = $state(false);
	let giftPremiumError = $state<string | null>(null);
	let selectedMinistry = $state("");
	let isAppointingMinister = $state(false);
	let appointmentError = $state<string | null>(null);
	let showAppointBlocDialog = $state(false);
	let selectedBlocRole = $state("");
	let isAppointingBlocRole = $state(false);
	let blocAppointmentError = $state<string | null>(null);

	const ministryNames: Record<string, string> = {
		economy: "Economy",
		defense: "Defense",
		foreign_affairs: "Foreign Affairs"
	};

	const ministryIcons: Record<string, string> = {
		economy: "💰",
		defense: "🛡️",
		foreign_affairs: "🌍"
	};

	const blocRoleNames: Record<string, string> = {
		leader: "Bloc Leader (nominate as candidate)",
		diplomat: "Diplomat"
	};
</script>

<svelte:head>
	<title>{data.user.name || "User Profile"}</title>
	<meta
		name="description"
		content={data.user.bio || `View the profile of ${data.user.name || "this user"} on PsyOps.`}
	/>

	<!-- Open Graph -->
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={data.user.name || "User Profile"} />
	<meta
		property="og:description"
		content={data.user.bio || `View the profile of ${data.user.name || "this user"} on PsyOps.`}
	/>
	{#if data.user.logo}
		<meta property="og:image" content={data.user.logo} />
		<meta property="og:image:width" content="96" />
		<meta property="og:image:height" content="96" />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.user.name || "User Profile"} />
	<meta
		name="twitter:description"
		content={data.user.bio || `View the profile of ${data.user.name || "this user"} on PsyOps.`}
	/>
	{#if data.user.logo}
		<meta name="twitter:image" content={data.user.logo} />
	{/if}
</svelte:head>

{#if data.userNotFound}
	<PageContainer maxWidth="5xl">
		<div class="panel-muted rounded-sm p-12 flex flex-col items-center justify-center gap-4">
			<div class="size-16 bg-[#102239] rounded-full flex items-center justify-center">
				<FluentImageOff20Filled class="size-8 text-[#a89e8e]" />
			</div>
			<div class="text-center space-y-2">
				<h1 class="text-xl font-bold text-[#fff7e8]">User Not Found</h1>
				<p class="text-sm text-[#a89e8e]">
					The user <code class="px-1.5 py-0.5 rounded-sm bg-[#0d1d31] text-[#d9ccb7] font-mono text-xs"
						>#{data.userId}</code
					> doesn't exist or has been removed.
				</p>
			</div>
			<Button variant="secondary" size="sm" class="mt-2" onclick={() => history.back()}>Go Back</Button>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="5xl">
		<!-- Hero -->
		<div class="panel rounded-sm p-5 relative overflow-hidden {data.user.isPremium ? 'border-[#e6a527]/55' : ''}">
			{#if data.party?.color}
				<!-- Party colour rule -->
				<div
					class="absolute inset-x-0 top-0 h-1"
					style="background-color: {data.party.color};"
					aria-hidden="true"
				></div>
			{/if}

			{#if data.isOwnProfile}
				<IconButton
					icon={FluentEdit20Filled}
					label="Edit Profile"
					variant="soft-purple"
					size="sm"
					class="absolute top-4 right-4 z-20"
					onclick={() => (showEditProfileSheet = true)}
				/>
			{/if}

			<div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
				<Logo
					src={data.user.logo}
					alt={data.user.name}
					placeholderIcon={FluentImageOff20Filled}
					class="size-20 shrink-0"
				/>

				<div class="text-center sm:text-left space-y-1 min-w-0 sm:pr-12">
					<h1 class="text-3xl font-bold text-[#fff7e8] break-words">{data.user.name || "Anonymous User"}</h1>
					<p class="text-sm text-[#a89e8e] font-mono">#{data.user.id}</p>
					{#if data.user.bio}
						<p class="text-sm text-[#d9ccb7] max-w-xl mt-2">{data.user.bio}</p>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex flex-wrap justify-center sm:justify-start gap-2 mt-5 pt-4 border-t border-[#dfceb0]/10">
				{#if data.user.id !== data.account?.id}
					<Button variant="soft-purple" size="sm" href="/chat/user/{data.user.id}" icon={FluentChat20Filled}>
						<span class="hidden sm:inline">Message</span>
					</Button>
				{/if}

				<Button
					variant="secondary"
					size="sm"
					icon={FluentShareAndroid20Filled}
					onclick={() => shareLink(data.user.name || "User", window.location.href)}
				>
					<span class="hidden sm:inline">Share</span>
				</Button>

				{#if data.isOwnProfile}
					<Button variant="soft-blue" size="sm" href="/inbox" icon={FluentMail20Filled}>
						<span class="hidden sm:inline">Inbox</span>
					</Button>

					<Button variant="secondary" size="sm" href="/settings" icon={FluentSettingsCogMultiple20Filled}>
						<span class="hidden sm:inline">Settings</span>
					</Button>
				{/if}

				{#if data.user.id !== data.account?.id || data.canAppointMinister || (data.ownedNewspapers && data.ownedNewspapers.length > 0)}
					<Button
						variant="secondary"
						size="sm"
						icon={FluentMoreHorizontal20Filled}
						onclick={() => (showActionsSheet = true)}
					>
						<span class="hidden sm:inline">More</span>
					</Button>
				{/if}
			</div>
		</div>

		<!-- More Actions Bottom Sheet -->
		<BottomSheet bind:open={showActionsSheet} title="Actions">
			<div class="space-y-1">
				{#if data.user.id !== data.account?.id}
					<ActionListItem
						icon={FluentGiftCardArrowRight20Filled}
						tone="blue"
						title="Send Gift"
						description="Send currency to this user"
						onclick={() => {
							shareLink(data.user.name || "User", window.location.href);
							showActionsSheet = false;
						}}
					/>

					<ActionListItem
						icon={FluentStar20Filled}
						tone="amber"
						title="Gift Premium"
						description="Give this user a premium membership"
						onclick={() => {
							showGiftPremiumModal = true;
							showActionsSheet = false;
						}}
					/>
				{/if}

				{#if data.ownedNewspapers && data.ownedNewspapers.length > 0}
					<ActionListItem
						icon={MdiNewspaperPlus}
						tone="emerald"
						title="Add as Author"
						description="Add to one of your newspapers"
						onclick={() => {
							showAddAuthorModal = true;
							showActionsSheet = false;
						}}
					/>
				{/if}

				{#if data.canAppointMinister}
					<ActionListItem
						icon={FluentShieldTask20Filled}
						tone="amber"
						title="Appoint Minister"
						description="Assign a government ministry"
						onclick={() => {
							showAppointDialog = true;
							showActionsSheet = false;
						}}
					/>
				{/if}

				{#if data.canAppointBlocLeadership}
					<ActionListItem
						icon={FluentPeopleTeam20Filled}
						tone="amber"
						title="Bloc Leadership"
						description="Nominate as bloc leader candidate or appoint as diplomat of {data.viewerBlocName}"
						onclick={() => {
							showAppointBlocDialog = true;
							showActionsSheet = false;
						}}
					/>
				{/if}

				{#if data.user.id !== data.account?.id}
					<div class="my-2 border-t border-[#dfceb0]/10"></div>
					<ActionListItem
						icon={FluentAccessibilityError20Filled}
						tone="red"
						danger
						title="Report User"
						description="Flag for moderation review"
						onclick={() => {
							showReportModal = true;
							showActionsSheet = false;
						}}
					/>
				{/if}
			</div>
		</BottomSheet>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<!-- Government Positions Section -->
			{#if data.presidency || data.governorship || data.ministries.length > 0 || data.blocLeadership || data.blocDiplomacies.length > 0}
				<section class="panel rounded-sm p-5 space-y-4">
					<h2 class="section-title">Government Positions</h2>
					<div class="space-y-4">
						{#if data.blocLeadership}
							<div class="flex items-center gap-3 hover:bg-[#19304b] rounded-sm p-2 -m-2 transition-all">
								<div
									class="size-12 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm flex items-center justify-center shrink-0"
								>
									<FluentCrown20Filled class="size-6 text-[#f7c56b]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#fff7e8] truncate">Leader of {data.blocLeadership.blocName}</p>
									<p class="text-xs text-[#a89e8e] truncate">
										Elected {formatDate(data.blocLeadership.appointedAt)}
									</p>
								</div>
							</div>
						{/if}

						{#each data.blocDiplomacies as diplomacy}
							<div class="flex items-center gap-3 hover:bg-[#19304b] rounded-sm p-2 -m-2 transition-all">
								<div
									class="size-12 bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm flex items-center justify-center shrink-0"
								>
									<FluentGlobeShield20Filled class="size-6 text-[#b7d0e6]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#fff7e8] truncate">Diplomat of {diplomacy.blocName}</p>
									<p class="text-xs text-[#a89e8e] truncate">Since {formatDate(diplomacy.appointedAt)}</p>
								</div>
								{#if data.viewerBlocId === diplomacy.blocId}
									<form method="POST" action="?/dismissBlocLeadership" use:enhance>
										<input type="hidden" name="role" value="diplomat" />
										<input type="hidden" name="id" value={diplomacy.id} />
										<Button
											type="submit"
											variant="soft-red"
											size="xs"
											icon={FluentPersonDelete20Filled}
											onclick={(e) => {
												if (!confirm("Are you sure you want to dismiss this diplomat?")) {
													e.preventDefault();
												}
											}}
										>
											Dismiss
										</Button>
									</form>
								{/if}
							</div>
						{/each}

						{#if data.presidency}
							<ProfileItem
								href="/state/{data.presidency.stateId}"
								logo={data.presidency.stateLogo}
								logoAlt={data.presidency.stateName}
								placeholderIcon={FluentFlag20Filled}
								placeholderGradient="from-[#e6a527]/40 to-[#e6a527]/25"
								title="President of {data.presidency.stateName}"
								subtitle="Term {data.presidency.term} • Since {formatDate(data.presidency.electedAt)}"
								hoverColor="yellow"
							/>
						{/if}

						{#if data.governorship}
							<ProfileItem
								href="/region/{data.governorship.regionId}"
								icon="🏛️"
								title="Governor of {data.governorship.regionName}"
								subtitle="{data.governorship.stateName} • Since {formatDate(data.governorship.appointedAt)}"
								hoverColor="blue"
							/>
						{/if}

						{#each data.ministries as ministry}
							<div class="flex items-center gap-3 hover:bg-[#19304b] rounded-sm p-2 -m-2 transition-all">
								<div
									class="size-12 bg-[#8c709b]/15 border border-[#b7a0c5]/30 rounded-sm flex items-center justify-center shrink-0"
								>
									<span class="text-2xl">{ministryIcons[ministry.ministry]}</span>
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#fff7e8] truncate">{ministryNames[ministry.ministry]} Minister</p>
									<p class="text-xs text-[#a89e8e] truncate">
										{ministry.stateName} • Since {formatDate(ministry.appointedAt)}
									</p>
								</div>
								{#if data.currentUserPresidency?.stateId === ministry.stateId}
									<form method="POST" action="?/dismissMinister" use:enhance>
										<input type="hidden" name="ministerId" value={ministry.id} />
										<Button
											type="submit"
											variant="soft-red"
											size="xs"
											icon={FluentPersonDelete20Filled}
											onclick={(e) => {
												if (!confirm("Are you sure you want to dismiss this minister?")) {
													e.preventDefault();
												}
											}}
										>
											Dismiss
										</Button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Location Section -->
			<section class="panel rounded-sm p-5 space-y-4">
				<h2 class="section-title">Location</h2>
				<div class="space-y-4">
					<!-- Residence (permanent home / citizenship) -->
					{#if data.homeRegion}
						<ProfileItem
							href="/region/{data.homeRegion.id}"
							logo={data.homeRegion.logo}
							logoAlt={data.homeRegion.name}
							placeholderGradient="from-[#315d8d] to-[#1e3a5f]"
							title={data.homeRegion.name}
							subtitle="Residence{data.homeRegion.state?.name
								? ` • ${data.homeRegion.state.name}`
								: ' • Independent'} • Since {formatDate(data.homeRegion.changedAt)}"
							hoverColor="blue"
						/>
					{:else}
						<div class="flex items-center gap-3 text-[#a89e8e]">
							<div class="size-12 panel-muted rounded-sm flex items-center justify-center shrink-0">
								<FluentFlag20Filled class="size-6" />
							</div>
							<p class="text-sm">No residence set</p>
						</div>
					{/if}

					<!-- Current Region -->
					{#if data.residence}
						<ProfileItem
							href="/region/{data.residence.region.id}"
							logo={data.residence.region.logo}
							logoAlt={data.residence.region.name}
							placeholderGradient="from-[#587252] to-[#3f5a3b]"
							title={data.residence.region.name}
							subtitle="Current Region{data.residence.region.state?.name
								? ` • ${data.residence.region.state.name}`
								: ' • Independent'} • Since {formatDate(data.residence.regionChangedAt)}"
							hoverColor="emerald"
						/>
					{:else}
						<div class="flex items-center gap-3 text-[#a89e8e]">
							<div class="size-12 panel-muted rounded-sm flex items-center justify-center shrink-0">
								<FluentFlag20Filled class="size-6" />
							</div>
							<p class="text-sm">No current region</p>
						</div>
					{/if}

					{#if data.isOwnProfile}
						<Button href="/visas" variant="soft-purple" size="sm" block icon={FluentBookCompass24Filled}>
							Manage Visas
						</Button>
					{/if}
				</div>
			</section>

			<!-- Birthday Reward Section -->
			{#if data.isOwnProfile && data.birthdayInfo.totalYears >= 1}
				<section class="panel rounded-sm p-5 space-y-4">
					<h2 class="section-title">🎂 Account Birthday</h2>
					<div class="space-y-3">
						{#if data.birthdayInfo.isBirthday}
							<div class="text-center py-2">
								<p class="text-2xl font-bold text-[#f7c56b]">🎉 Happy Birthday! 🎉</p>
								<p class="text-sm text-[#d9ccb7] mt-1">Your account turns {data.birthdayInfo.totalYears} today!</p>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<div
									class="size-12 bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm flex items-center justify-center text-2xl shrink-0"
								>
									🎂
								</div>
								<div>
									<p class="font-semibold text-[#fff7e8]">Account Anniversary</p>
									<p class="text-xs text-[#a89e8e]">
										{data.birthdayInfo.totalYears} year{data.birthdayInfo.totalYears !== 1 ? "s" : ""} since account creation
									</p>
								</div>
							</div>
						{/if}
						{#if data.birthdayInfo.uncollectedYears.length > 0}
							<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 rounded-sm p-3">
								<p class="text-sm text-[#f7c56b] font-medium">
									{#if data.birthdayInfo.uncollectedYears.length === 1}
										Year {data.birthdayInfo.uncollectedYears[0]} reward available!
									{:else}
										{data.birthdayInfo.uncollectedYears.length} uncollected birthday rewards!
									{/if}
								</p>
								<p class="text-xs text-[#a89e8e] mt-1">
									Collect {data.birthdayInfo.rewardTotal.toLocaleString()} currency ({data.birthdayInfo.rewardPerYear.toLocaleString()}
									× {data.birthdayInfo.uncollectedYears.length} year{data.birthdayInfo.uncollectedYears.length !== 1
										? "s"
										: ""})
								</p>
								<form
									method="POST"
									action="?/collectBirthday"
									use:enhance={() => {
										return async ({ result, update }) => {
											await update();
											if (result.type === "success") {
												confetti({
													particleCount: 150,
													spread: 80,
													origin: { y: 0.6 },
													colors: ["#f59e0b", "#fbbf24", "#fcd34d", "#a78bfa", "#ec4899"]
												});
											}
										};
									}}
									class="mt-2"
								>
									<Button type="submit" variant="soft-amber" size="sm" block icon={FluentGiftCardArrowRight20Filled}>
										Collect {data.birthdayInfo.rewardTotal.toLocaleString()} Currency
									</Button>
								</form>
							</div>
						{:else}
							<p class="text-xs text-[#a89e8e] text-center">All birthday rewards collected ✓</p>
						{/if}
					</div>
				</section>
			{/if}

			<!-- Career & Politics Section -->
			<section class="panel rounded-sm p-5 space-y-4">
				<h2 class="section-title">Career & Politics</h2>
				<div class="space-y-4">
					<ProfileItem
						href="/user/{data.user.id}/articles"
						icon={FluentDocument20Filled}
						title="{data.articleCount} {data.articleCount === 1 ? 'Article' : 'Articles'} Published"
						subtitle="{data.upvoteCount} total upvote{data.upvoteCount === 1
							? ''
							: 's'} received • View all publications"
						hoverColor="purple"
					/>

					{#if data.party}
						<ProfileItem
							href="/party/{data.party.id}"
							logo={data.party.logo}
							logoAlt={data.party.name}
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#8c709b] to-[#315d8d]"
							title={data.party.name}
							subtitle={data.party.role === "leader"
								? " Leader"
								: data.party.role === "deputy"
									? "Deputy "
									: "Member" + "Joined " + formatDate(data.party.foundedAt)}
							hoverColor={data.party.color}
						/>
					{:else if data.isOwnProfile && !data.isIndependentRegion}
						<a
							href="/party"
							class="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#b7a0c5]/30 rounded-sm hover:border-[#b7a0c5]/50 hover:bg-[#8c709b]/10 transition-colors group"
						>
							<div
								class="size-10 bg-[#8c709b]/15 rounded-sm flex items-center justify-center group-hover:bg-[#8c709b]/25 transition-colors"
							>
								<FluentSearch20Filled class="size-5 text-[#b7a0c5]" />
							</div>
							<div class="text-center">
								<p class="font-semibold text-[#d5c4df] group-hover:text-[#f0e7f5] transition-colors">
									Find a Political Party
								</p>
								<p class="text-xs text-[#a89e8e]">Browse and join a party in your state</p>
							</div>
						</a>
					{:else if data.isOwnProfile}
						<a
							href="/party/create"
							class="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#b7a0c5]/30 rounded-sm hover:border-[#b7a0c5]/50 hover:bg-[#8c709b]/10 transition-colors group"
						>
							<div
								class="size-10 bg-[#8c709b]/15 rounded-sm flex items-center justify-center group-hover:bg-[#8c709b]/25 transition-colors"
							>
								<FluentAdd20Filled class="size-5 text-[#b7a0c5]" />
							</div>
							<div class="text-center">
								<p class="font-semibold text-[#d5c4df] group-hover:text-[#f0e7f5] transition-colors">
									Create Political Party
								</p>
								<p class="text-xs text-[#a89e8e]">Start your own political movement</p>
							</div>
						</a>
					{/if}

					<Button
						href="/user/{data.user.id}/career"
						variant="soft-purple"
						size="sm"
						block
						icon={FluentChevronRight20Filled}
					>
						View Full Career Timeline
					</Button>
				</div>
			</section>
		</div>
	</PageContainer>

	<!-- Appoint Minister Modal -->
	<Modal bind:open={showAppointDialog} title="Appoint {data.user.name} as Minister">
		<form
			method="POST"
			action="?/appointMinister"
			use:enhance={() => {
				isAppointingMinister = true;
				appointmentError = null;
				return async ({ result, update }) => {
					isAppointingMinister = false;

					if (result.type === "success") {
						await update();
						showAppointDialog = false;
						selectedMinistry = "";
					} else if (result.type === "failure") {
						appointmentError = result.data?.error || "Failed to appoint minister";
						await update();
					} else {
						await update();
					}
				};
			}}
		>
			<div class="space-y-4">
				{#if appointmentError}
					<div
						class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>{appointmentError}</span>
					</div>
				{/if}

				<div>
					<label class="field-label">Select Ministry</label>
					<select
						name="ministry"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						bind:value={selectedMinistry}
						disabled={isAppointingMinister}
						required
					>
						<option value="" disabled>Choose a ministry...</option>
						{#each data.availableMinistries as ministry}
							<option value={ministry}>
								{ministryIcons[ministry]}
								{ministryNames[ministry]}
							</option>
						{/each}
					</select>
				</div>

				{#if data.availableMinistries.length === 0}
					<div
						class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>All ministries are currently occupied.</span>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isAppointingMinister}
						onclick={() => {
							showAppointDialog = false;
							selectedMinistry = "";
							appointmentError = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						icon={FluentShieldTask20Filled}
						disabled={!selectedMinistry}
						loading={isAppointingMinister}
						loadingText="Appointing..."
					>
						Appoint Minister
					</Button>
				</div>
			</div>
		</form>
	</Modal>

	<!-- Appoint Bloc Leadership Modal -->
	<Modal bind:open={showAppointBlocDialog} title="Appoint {data.user.name} — {data.viewerBlocName}">
		<form
			method="POST"
			action="?/appointBlocLeadership"
			use:enhance={() => {
				isAppointingBlocRole = true;
				blocAppointmentError = null;
				return async ({ result, update }) => {
					isAppointingBlocRole = false;

					if (result.type === "success") {
						await update();
						showAppointBlocDialog = false;
						selectedBlocRole = "";
					} else if (result.type === "failure") {
						blocAppointmentError = result.data?.error || "Failed to appoint bloc leadership";
						await update();
					} else {
						await update();
					}
				};
			}}
		>
			<div class="space-y-4">
				{#if blocAppointmentError}
					<div
						class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>{blocAppointmentError}</span>
					</div>
				{/if}

				<div>
					<label class="field-label">Select Role</label>
					<select
						name="role"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						bind:value={selectedBlocRole}
						disabled={isAppointingBlocRole}
						required
					>
						<option value="" disabled>Choose a role...</option>
						{#each data.availableBlocRoles as role}
							<option value={role}>{blocRoleNames[role]}</option>
						{/each}
					</select>
				</div>

				{#if selectedBlocRole === "leader"}
					<div
						class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 text-[#b7d0e6] rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>
							This nominates {data.user.name} as a candidate in the bloc's current leadership election. Member-state presidents
							vote before the window closes.
						</span>
					</div>
				{/if}

				{#if data.availableBlocRoles.length === 0}
					<div
						class="bg-[#e6a527]/12 border border-[#e6a527]/35 text-[#f7c56b] rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>
							Nothing available right now — leader nominations only open during the 2-day voting window before an
							election, and this bloc's diplomat slots are both filled.
						</span>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isAppointingBlocRole}
						onclick={() => {
							showAppointBlocDialog = false;
							selectedBlocRole = "";
							blocAppointmentError = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						icon={FluentPeopleTeam20Filled}
						disabled={!selectedBlocRole}
						loading={isAppointingBlocRole}
						loadingText={selectedBlocRole === "leader" ? "Nominating..." : "Appointing..."}
					>
						{selectedBlocRole === "leader" ? "Nominate" : "Appoint"}
					</Button>
				</div>
			</div>
		</form>
	</Modal>

	<!-- Report Modal -->
	<ReportModal
		bind:show={showReportModal}
		targetType="account"
		targetId={data.user.id}
		targetName={data.user.name || "User"}
	/>

	<!-- Gift Premium Modal -->
	<Modal bind:open={showGiftPremiumModal} title="Gift Premium to {data.user.name || 'User'}">
		<form
			method="POST"
			action="?/giftPremium"
			use:enhance={() => {
				isGiftingPremium = true;
				giftPremiumError = null;
				return async ({ result, update }) => {
					isGiftingPremium = false;
					if (result.type === "success") {
						await update();
						showGiftPremiumModal = false;
						confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
					} else if (result.type === "failure") {
						giftPremiumError = result.data?.error || "Failed to gift premium";
						await update();
					} else {
						await update();
					}
				};
			}}
		>
			<div class="space-y-4">
				<p class="text-sm text-[#a89e8e]">
					Premium automatically runs production, military training and factory work for the recipient.
				</p>

				{#if giftPremiumError}
					<div
						class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>{giftPremiumError}</span>
					</div>
				{/if}

				<div>
					<label class="field-label">Duration</label>
					<select
						name="planId"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						bind:value={giftPremiumPlanId}
						disabled={isGiftingPremium}
					>
						{#each data.premiumPlans as plan}
							<option value={plan.id}>{plan.label} ({plan.days} days)</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={isGiftingPremium}
						onclick={() => {
							showGiftPremiumModal = false;
							giftPremiumError = null;
						}}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="primary"
						icon={FluentStar20Filled}
						loading={isGiftingPremium}
						loadingText="Gifting..."
					>
						Gift Premium
					</Button>
				</div>
			</div>
		</form>
	</Modal>

	<!-- Add Author Modal -->
	{#if data.ownedNewspapers}
		<AddAuthorModal
			bind:show={showAddAuthorModal}
			userId={data.user.id}
			userName={data.user.name || "User"}
			newspapers={data.ownedNewspapers}
		/>
	{/if}

	<!-- Edit Profile Bottom Sheet -->
	{#if data.isOwnProfile && data.editForm}
		<EditProfileSheet
			bind:open={showEditProfileSheet}
			editForm={data.editForm}
			currentLogo={data.user.logo}
			editCost={data.profileEditCost}
			userBalance={data.userBalance}
			canAfford={data.canAffordProfileEdit}
			isOnCooldown={data.isProfileEditOnCooldown}
			cooldownEndsAt={data.profileEditCooldownEndsAt}
		/>
	{/if}
{/if}
