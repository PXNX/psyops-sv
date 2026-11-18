<!-- src/routes/(authenticated)/user/[id]/+page.svelte -->
<!-- A citizen's profile as an identity card: photo, name, citizenship,
     residence, party and medal ribbons, followed by offices and affiliations. -->
<script lang="ts">
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { enhance } from "$app/forms";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import { feedback } from "#lib/utils/feedback.js";
	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentPersonDelete20Filled from "~icons/fluent/person-delete-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPeopleTeam20Filled from "~icons/fluent/people-team-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentGlobeShield20Filled from "~icons/fluent/globe-shield-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentBriefcase20Filled from "~icons/fluent/briefcase-20-filled";
	import FluentRibbon20Filled from "~icons/fluent/ribbon-20-filled";

	import Modal from "#lib/component/Modal.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ReportModal from "#lib/component/ReportModal.svelte";
	import AddAuthorModal from "./AddAuthorModal.svelte";
	import EditProfileSheet from "./EditProfileSheet.svelte";
	import ProfileItem from "#lib/component/ProfileItem.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import FluentMoreHorizontal20Filled from "~icons/fluent/more-horizontal-20-filled";
	import { shareLink } from "#lib/util.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";
	import ActionListItem from "#lib/component/ui/ActionListItem.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { medalInfo } from "./medals.js";

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

	const partyRole = (role: string) => (role === "leader" ? "Leader" : role === "deputy" ? "Deputy" : "Member");

	// Machine-readable zone at the foot of the card, like a real ID document.
	const mrz = $derived.by(() => {
		if (data.userNotFound) return "";
		const clean = (v: string | null | undefined) =>
			(v ?? "")
				.toUpperCase()
				.normalize("NFD")
				.replace(/[^A-Z0-9]+/g, "<");
		const line1 = `ID${clean(data.citizenship?.name ?? "PSY").slice(0, 3)}${clean(data.user.name)}`;
		const line2 = `${clean(data.user.id)}<<${formatDate(data.user.createdAt).replace(/\./g, "")}`;
		return `${line1.padEnd(36, "<").slice(0, 36)}\n${line2.padEnd(36, "<").slice(0, 36)}`;
	});

	const hasOffices = $derived(
		!data.userNotFound &&
			!!(
				data.presidency ||
				data.governorship ||
				data.ministries.length > 0 ||
				data.blocLeadership ||
				data.blocDiplomacies.length > 0
			)
	);
</script>

<svelte:head>
	{#if data.userNotFound}
		<title>User Not Found</title>
	{:else}
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
	{/if}
</svelte:head>

{#if data.userNotFound}
	<PageContainer maxWidth="5xl">
		<div class="panel-muted rounded-sm p-12 flex flex-col items-center justify-center gap-4">
			<div class="size-16 bg-[#131c33] rounded-full flex items-center justify-center">
				<FluentImageOff20Filled class="size-8 text-[#8e9abb]" />
			</div>
			<div class="text-center space-y-2">
				<h1 class="text-xl font-bold text-[#eef2ff]">User Not Found</h1>
				<p class="text-sm text-[#8e9abb]">
					No citizen <code class="px-1.5 py-0.5 rounded-sm bg-[#0b1120] text-[#c2cbe3] font-mono text-xs"
						>#{data.userId}</code
					> on record.
				</p>
			</div>
			<Button variant="secondary" size="sm" class="mt-2" onclick={() => history.back()}>Go Back</Button>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="5xl">
		<!-- Identity card -->
		<article
			class="panel rounded-sm overflow-hidden relative {data.user.isPremium ? 'border-[#f5a524]/55' : ''}"
			style={data.party?.color
				? `background-image: linear-gradient(90deg, ${data.party.color}26 0, transparent 45%), linear-gradient(180deg, rgba(28, 38, 66, 0.96) 0%, rgba(19, 27, 49, 0.96) 100%);`
				: undefined}
		>
			<!-- Issuing authority strip -->
			<header
				class="flex items-center gap-2 px-4 py-2 border-b border-[#8ea6e0]/15 bg-[#0b1120]/50 text-[10px] uppercase tracking-[0.25em] text-[#8e9abb]"
			>
				{#if data.citizenship}
					<a
						href="/state/{data.citizenship.id}"
						class="flex items-center gap-2 min-w-0 hover:text-[#ffc857] transition-colors"
					>
						<Logo
							src={data.citizenship.logo}
							alt=""
							class="size-4 shrink-0"
							placeholderIcon={FluentFlag20Filled}
							placeholderGradient="from-[#33456f] to-[#1b2641]"
						/>
						<span class="truncate">{data.citizenship.name}</span>
					</a>
				{:else}
					<span>Stateless</span>
				{/if}
			</header>

			<div class="p-4 sm:p-5 flex gap-4 sm:gap-6">
				<!-- Photo -->
				<div class="shrink-0 flex flex-col items-center gap-2">
					<div
						class="relative w-24 h-32 sm:w-32 sm:h-40 p-1 bg-[#0b1120] border border-[#8ea6e0]/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
					>
						<Logo
							src={data.user.logo}
							alt={data.user.name || "Portrait"}
							placeholderIcon={FluentPerson20Filled}
							placeholderGradient="from-[#33456f] to-[#1b2641]"
							class="size-full"
						/>
						{#if data.user.isPremium}
							<div
								class="animate-stamp absolute -bottom-3 -right-3 size-14 rounded-full border-2 border-[#f5a524]/80 bg-[#1a1305]/80 flex flex-col items-center justify-center text-[#ffcb6b] shadow-[0_0_12px_rgba(245,165,36,0.3)]"
								style="--stamp-tilt: -14deg"
								title="Premium citizen"
							>
								<FluentStar20Filled class="size-4" />
								<span class="text-[7px] font-black tracking-[0.15em] uppercase leading-none mt-0.5">Premium</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Particulars -->
				<div class="flex-1 min-w-0">
					<div class="flex items-start gap-2">
						<div class="min-w-0 flex-1">
							<p class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Name</p>
							<h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#eef2ff] break-words leading-tight">
								{data.user.name || "Anonymous"}
							</h1>
						</div>
						{#if data.isOwnProfile}
							<IconButton
								icon={FluentEdit20Filled}
								label="Edit Profile"
								variant="soft-purple"
								size="sm"
								class="shrink-0"
								onclick={() => (showEditProfileSheet = true)}
							/>
						{/if}
					</div>

					<dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 text-sm">
						<div class="min-w-0">
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Residence</dt>
							<dd class="truncate">
								{#if data.homeRegion}
									<a
										href="/region/{data.homeRegion.id}"
										class="font-semibold text-[#dbe2f4] hover:text-[#ffc857] transition-colors"
										>{data.homeRegion.name}</a
									>
									<span class="text-xs text-[#8e9abb]">since {formatDate(data.homeRegion.changedAt)}</span>
								{:else}
									<span class="text-[#8e9abb]">None</span>
								{/if}
							</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Present in</dt>
							<dd class="truncate">
								{#if data.residence}
									<a
										href="/region/{data.residence.region.id}"
										class="font-semibold text-[#dbe2f4] hover:text-[#ffc857] transition-colors"
										>{data.residence.region.name}</a
									>
									<span class="text-xs text-[#8e9abb]">
										{data.residence.region.state?.name ?? "Independent"}
									</span>
								{:else}
									<span class="text-[#8e9abb]">Unknown</span>
								{/if}
							</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Party</dt>
							<dd class="truncate">
								{#if data.party}
									<a href="/party/{data.party.id}" class="inline-flex items-center gap-1.5 min-w-0 group">
										<PartyTag abbreviation={data.party.abbreviation} color={data.party.color} />
										<span class="font-semibold text-[#dbe2f4] group-hover:text-[#ffc857] transition-colors truncate"
											>{data.party.name}</span
										>
									</a>
									<span class="text-xs text-[#8e9abb]">{partyRole(data.party.role)}</span>
								{:else}
									<span class="text-[#8e9abb]">Independent</span>
								{/if}
							</dd>
						</div>
						<div class="min-w-0">
							<dt class="text-[9px] uppercase tracking-[0.2em] text-[#8e9abb]">Date of issue</dt>
							<dd class="font-mono text-[#dbe2f4]">{formatDate(data.user.createdAt)}</dd>
						</div>
					</dl>
				</div>
			</div>

			{#if data.user.bio}
				<p
					class="mx-4 sm:mx-5 mb-4 pt-3 border-t border-dashed border-[#8ea6e0]/20 font-serif italic text-sm text-[#c2cbe3] break-words"
				>
					“{data.user.bio}”
				</p>
			{/if}

			<!-- Medal ribbons -->
			{#if data.medals.length > 0}
				<a
					href="/user/{data.user.id}/career"
					class="group mx-4 sm:mx-5 mb-4 flex items-center gap-3"
					aria-label="{data.medals.length} decorations"
				>
					<FluentRibbon20Filled class="size-4 text-[#ffcb6b] shrink-0" />
					<span class="flex flex-wrap gap-1">
						{#each data.medals as medal, i (medal.id)}
							{@const info = medalInfo(medal.medalType)}
							<span
								class="animate-pop-in block h-3.5 w-9 rounded-[1px] ring-1 ring-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.5)] transition-transform group-hover:-translate-y-px"
								style="background: {info.ribbon}; --rise-delay: {120 + i * 50}ms"
								title="{info.label} — {medal.stateName ?? ''}, {formatDate(medal.awardedAt)}"
							></span>
						{/each}
					</span>
				</a>
			{/if}

			<!-- Machine-readable zone -->
			<pre
				aria-hidden="true"
				class="px-4 sm:px-5 py-2 bg-[#0b1120]/60 border-t border-[#8ea6e0]/10 font-mono text-[10px] sm:text-[11px] leading-snug tracking-[0.18em] text-[#8e9abb]/55 overflow-hidden whitespace-pre">{mrz}</pre>

			<!-- Actions -->
			<div class="flex flex-wrap gap-2 px-4 sm:px-5 py-3 border-t border-[#8ea6e0]/10">
				{#if data.user.id !== data.account?.id}
					<Button variant="soft-purple" size="sm" href="/chat/user/{data.user.id}" icon={FluentChat20Filled}>
						Message
					</Button>
				{/if}

				{#if data.isOwnProfile}
					<Button href="/visas" variant="soft-blue" size="sm" icon={FluentBookCompass24Filled}>Passport</Button>
				{/if}

				<IconButton
					icon={FluentShareAndroid20Filled}
					label="Share"
					variant="secondary"
					size="sm"
					onclick={() => shareLink(data.user.name || "User", window.location.href)}
				/>

				{#if data.isOwnProfile}
					<IconButton
						icon={FluentSettingsCogMultiple20Filled}
						label="Settings"
						variant="secondary"
						size="sm"
						href="/settings"
					/>
				{/if}

				{#if data.user.id !== data.account?.id || data.canAppointMinister || (data.ownedNewspapers && data.ownedNewspapers.length > 0)}
					<IconButton
						icon={FluentMoreHorizontal20Filled}
						label="More"
						variant="secondary"
						size="sm"
						class="ml-auto"
						onclick={() => (showActionsSheet = true)}
					/>
				{/if}
			</div>
		</article>

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
						description="Nominate as leader or appoint as diplomat of {data.viewerBlocName}"
						onclick={() => {
							showAppointBlocDialog = true;
							showActionsSheet = false;
						}}
					/>
				{/if}

				{#if data.user.id !== data.account?.id}
					<div class="my-2 border-t border-[#8ea6e0]/10"></div>
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

		<!-- Birthday: a greeting card -->
		{#if data.isOwnProfile && data.birthdayInfo.totalYears >= 1 && (data.birthdayInfo.isBirthday || data.birthdayInfo.uncollectedYears.length > 0)}
			<section
				id="birthday-card"
				class="animate-rise-in rounded-sm border border-[#f5a524]/35 bg-[#f5a524]/12 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
			>
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<span class="text-3xl animate-pop-in" aria-hidden="true">🎂</span>
					<div class="min-w-0">
						<p class="font-serif text-lg font-bold text-[#ffcb6b] leading-tight">
							{data.birthdayInfo.isBirthday ? "Happy Birthday!" : "Belated birthday wishes"}
						</p>
						<p class="text-xs text-[#c2cbe3]">
							{data.birthdayInfo.totalYears} year{data.birthdayInfo.totalYears !== 1 ? "s" : ""} of service
							{#if data.birthdayInfo.uncollectedYears.length > 1}
								· {data.birthdayInfo.uncollectedYears.length} gifts waiting
							{/if}
						</p>
					</div>
				</div>
				{#if data.birthdayInfo.uncollectedYears.length > 0}
					<form
						method="POST"
						action="?/collectBirthday"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === "success") {
									celebrate(document.getElementById("birthday-card"));
									feedback("win");
								}
							};
						}}
					>
						<Button type="submit" variant="soft-amber" size="sm" icon={FluentGiftCardArrowRight20Filled}>
							Collect ${data.birthdayInfo.rewardTotal.toLocaleString()}
						</Button>
					</form>
				{/if}
			</section>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<!-- Offices held -->
			{#if hasOffices}
				<section class="panel rounded-sm p-5 space-y-4">
					<h2 class="section-title">Offices</h2>
					<div class="space-y-4">
						{#if data.blocLeadership}
							<div class="flex items-center gap-3">
								<div
									class="size-12 bg-[#f5a524]/12 border border-[#f5a524]/35 rounded-sm flex items-center justify-center shrink-0"
								>
									<FluentCrown20Filled class="size-6 text-[#ffcb6b]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#eef2ff] truncate">Leader of {data.blocLeadership.blocName}</p>
									<p class="text-xs text-[#8e9abb] truncate">
										Elected {formatDate(data.blocLeadership.appointedAt)}
									</p>
								</div>
							</div>
						{/if}

						{#each data.blocDiplomacies as diplomacy (diplomacy.id)}
							<div class="flex items-center gap-3" out:vanish>
								<div
									class="size-12 bg-[#2f6be0]/18 border border-[#6aa8ff]/30 rounded-sm flex items-center justify-center shrink-0"
								>
									<FluentGlobeShield20Filled class="size-6 text-[#c3dbff]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#eef2ff] truncate">Diplomat of {diplomacy.blocName}</p>
									<p class="text-xs text-[#8e9abb] truncate">Since {formatDate(diplomacy.appointedAt)}</p>
								</div>
								{#if data.viewerBlocId === diplomacy.blocId}
									<form
										method="POST"
										action="?/dismissBlocLeadership"
										use:confirmSubmit={{ title: "Dismiss this diplomat?", confirmLabel: "Dismiss", danger: true }}
										use:enhance
									>
										<input type="hidden" name="role" value="diplomat" />
										<input type="hidden" name="id" value={diplomacy.id} />
										<Button type="submit" variant="soft-red" size="xs" icon={FluentPersonDelete20Filled}>
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
								placeholderGradient="from-[#f5a524]/40 to-[#f5a524]/25"
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

						{#each data.ministries as ministry (ministry.id)}
							<div class="flex items-center gap-3" out:vanish>
								<div
									class="size-12 bg-[#7451e6]/15 border border-[#b9a1ff]/30 rounded-sm flex items-center justify-center shrink-0"
								>
									<span class="text-2xl">{ministryIcons[ministry.ministry]}</span>
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-[#eef2ff] truncate">{ministryNames[ministry.ministry]} Minister</p>
									<p class="text-xs text-[#8e9abb] truncate">
										{ministry.stateName} • Since {formatDate(ministry.appointedAt)}
									</p>
								</div>
								{#if data.currentUserPresidency?.stateId === ministry.stateId}
									<form
										method="POST"
										action="?/dismissMinister"
										use:confirmSubmit={{
											title: `Dismiss the ${ministryNames[ministry.ministry]} Minister?`,
											confirmLabel: "Dismiss",
											danger: true
										}}
										use:enhance
									>
										<input type="hidden" name="ministerId" value={ministry.id} />
										<Button type="submit" variant="soft-red" size="xs" icon={FluentPersonDelete20Filled}>
											Dismiss
										</Button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Affiliations: companies, newspapers, party -->
			<section class="panel rounded-sm p-5 space-y-4">
				<h2 class="section-title">Affiliations</h2>
				<div class="space-y-4">
					{#each data.organizations.companies as company (company.id)}
						<ProfileItem
							href="/company/{company.id}"
							logo={company.logo}
							logoAlt={company.name}
							placeholderIcon={FluentBuilding20Filled}
							placeholderGradient="from-[#1f9d62] to-[#1f4a14]"
							title={company.name}
							subtitle="Company • Owner since {formatDate(company.foundedAt)}"
							hoverColor="emerald"
						/>
					{/each}

					{#each data.organizations.newspapers as newspaper (newspaper.newspaperId)}
						<ProfileItem
							href="/newspaper/{newspaper.newspaperId}"
							logo={newspaper.logo}
							logoAlt={newspaper.name}
							placeholderIcon={FluentBriefcase20Filled}
							placeholderGradient="from-[#2f6be0] to-[#123a6b]"
							title={newspaper.name}
							subtitle="Newspaper • {newspaper.rank.charAt(0).toUpperCase() +
								newspaper.rank.slice(1)} since {formatDate(newspaper.joinedAt)}"
							hoverColor="blue"
						/>
					{/each}

					{#if data.party}
						<ProfileItem
							href="/party/{data.party.id}"
							logo={data.party.logo}
							logoAlt={data.party.name}
							placeholderIcon={FluentPeople20Filled}
							placeholderGradient="from-[#7451e6] to-[#2f6be0]"
							title={data.party.name}
							subtitle="Party • {partyRole(data.party.role)} since {formatDate(data.party.joinedAt)}"
							hoverColor={data.party.color}
						/>
					{:else if data.isOwnProfile}
						<Button
							href={data.isIndependentRegion ? "/party/create" : "/party"}
							variant="soft-purple"
							size="sm"
							block
							icon={data.isIndependentRegion ? FluentAdd20Filled : FluentSearch20Filled}
						>
							{data.isIndependentRegion ? "Create a Party" : "Find a Party"}
						</Button>
					{/if}

					{#if data.organizations.companies.length === 0 && data.organizations.newspapers.length === 0 && !data.party && !data.isOwnProfile}
						<p class="text-sm text-[#8e9abb] text-center py-2">No affiliations</p>
					{/if}
				</div>
			</section>

			<!-- Records -->
			<section class="grid grid-cols-2 gap-3 {hasOffices ? 'lg:col-span-2' : ''}">
				<a href="/user/{data.user.id}/articles" class="panel-interactive rounded-sm p-4 flex items-center gap-3 group">
					<FluentDocument20Filled class="size-5 text-[#b9a1ff] shrink-0" />
					<div class="min-w-0">
						<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Bylines</p>
						<p class="text-lg font-bold text-[#eef2ff] group-hover:text-[#ffc857] transition-colors">
							{data.articleCount}
						</p>
					</div>
				</a>
				<a href="/user/{data.user.id}/career" class="panel-interactive rounded-sm p-4 flex items-center gap-3 group">
					<FluentRibbon20Filled class="size-5 text-[#ffcb6b] shrink-0" />
					<div class="min-w-0">
						<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Service record</p>
						<p class="text-lg font-bold text-[#eef2ff] group-hover:text-[#ffc857] transition-colors">
							{data.medals.length}
							<span class="text-xs font-normal text-[#8e9abb]">medal{data.medals.length === 1 ? "" : "s"}</span>
						</p>
					</div>
				</a>
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
						class="bg-[#f5a524]/12 border border-[#f5a524]/35 text-[#ffcb6b] rounded-sm p-4 flex items-center gap-3 text-sm"
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
					<p class="field-hint">Enters the current leadership election as a candidate.</p>
				{/if}

				{#if data.availableBlocRoles.length === 0}
					<div
						class="bg-[#f5a524]/12 border border-[#f5a524]/35 text-[#ffcb6b] rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span> Nothing open: nominations run 2 days before an election, both diplomat seats are filled. </span>
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
						feedback("win");
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
