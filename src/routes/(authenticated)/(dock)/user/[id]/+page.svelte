<!-- src/routes/(authenticated)/(dock)/user/[id]/+page.svelte -->
<!-- A citizen's personnel file: photo, name and roles, key/value fields,
     then the companies and newspapers they hold. -->
<script lang="ts">
	import { tick } from "svelte";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import { enhance } from "$app/forms";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import { feedback } from "#lib/utils/feedback.js";
	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import MdiNewspaperVariant from "~icons/mdi/newspaper-variant";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentPersonDelete20Filled from "~icons/fluent/person-delete-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPeopleTeam20Filled from "~icons/fluent/people-team-20-filled";
	import FluentGlobeShield20Filled from "~icons/fluent/globe-shield-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentMoreHorizontal20Filled from "~icons/fluent/more-horizontal-20-filled";
	import FluentChevronDown20Filled from "~icons/fluent/chevron-down-20-filled";

	import Modal from "#lib/component/Modal.svelte";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ReportModal from "#lib/component/ReportModal.svelte";
	import AddAuthorModal from "./AddAuthorModal.svelte";
	import EditProfileSheet from "./EditProfileSheet.svelte";
	import ProfileItem from "#lib/component/ProfileItem.svelte";
	import PartyTag from "#lib/component/PartyTag.svelte";
	import { shareLink } from "#lib/util.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import Logo from "#lib/component/Logo.svelte";
	import { Button, IconButton, ActionListItem } from "#lib/component/ui/index.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { medalInfo } from "./medals.js";

	const { data } = $props();

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
	let showAllCompanies = $state(false);
	let showAllNewspapers = $state(false);

	/** Lists longer than this collapse behind a "Show all" toggle. */
	const LIST_PREVIEW = 6;

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

	const rankNames: Record<string, string> = { owner: "Owner", editor: "Editor", author: "Author" };

	const partyRole = (role: string) => (role === "leader" ? "Leader" : role === "deputy" ? "Deputy" : "Member");

	const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
	const money = (n: number) => `$${compact.format(n)}`;

	/** The `error` string of a failed form action, or a fallback. */
	function actionError(data: unknown, fallback: string): string {
		const error = (data as { error?: unknown } | undefined)?.error;
		return typeof error === "string" ? error : fallback;
	}

	async function glow(id: string) {
		await tick();
		celebrate(document.getElementById(id));
		feedback("win");
	}

	const companies = $derived(data.userNotFound ? [] : data.organizations.companies);
	const newspapers = $derived(data.userNotFound ? [] : data.organizations.newspapers);
	const visibleCompanies = $derived(showAllCompanies ? companies : companies.slice(0, LIST_PREVIEW));
	const visibleNewspapers = $derived(showAllNewspapers ? newspapers : newspapers.slice(0, LIST_PREVIEW));
</script>

<svelte:head>
	{#if data.userNotFound}
		<title>User Not Found · PsyOps</title>
	{:else}
		<title>{data.user.name || "User Profile"} · PsyOps</title>
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

{#snippet showAllToggle(expanded: boolean, total: number, toggle: () => void)}
	<button
		type="button"
		onclick={toggle}
		class="tap-target flex w-full items-center justify-center gap-1.5 border-t border-line/15 py-2 text-xs text-fg-muted hover:text-fg hover:bg-surface-5 transition-colors"
	>
		{expanded ? "Show fewer" : `Show all ${total}`}
		<FluentChevronDown20Filled class="size-4 transition-transform {expanded ? 'rotate-180' : ''}" />
	</button>
{/snippet}

{#snippet roleLine(
	label: string,
	href: string | null,
	logo: string | null | undefined,
	name: string,
	detail: string,
	placeholder: typeof FluentFlag20Filled = FluentFlag20Filled
)}
	<li class="flex min-w-0 items-center gap-2.5 text-[15px]">
		<span class="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">{label}</span>
		{#if href}
			<a {href} class="group flex min-w-0 items-center gap-2">
				{#if logo !== undefined}
					<Logo
						src={logo}
						alt=""
						class="size-7! rounded-[3px]! shrink-0 ring-1 ring-black/15 transition-transform group-hover:scale-110 group-hover:-rotate-3"
						placeholderIcon={placeholder}
					/>
				{/if}
				<span class="truncate font-medium text-fg-body group-hover:text-fg group-hover:underline">{name}</span>
			</a>
		{:else}
			<span class="truncate font-medium text-fg-body">{name}</span>
		{/if}
		{#if detail}
			<span class="hidden shrink-0 font-mono text-xs text-fg-muted sm:inline">{detail}</span>
		{/if}
	</li>
{/snippet}

{#if data.userNotFound}
	<PageContainer maxWidth="5xl">
		<div class="panel rounded-sm p-10 flex flex-col items-center justify-center gap-3">
			<FluentImageOff20Filled class="size-8 text-fg-muted" />
			<h1 class="text-lg font-semibold text-fg">User not found</h1>
			<p class="text-sm text-fg-muted">No citizen with this ID.</p>
			<Button variant="secondary" size="sm" class="mt-1" onclick={() => history.back()}>Go Back</Button>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="5xl">
		<!-- Personnel file: a paper case file in a folder -->
		<div class="relative pt-5">
			<!-- Folder tab -->
			<div
				class="absolute left-6 top-0 h-6 rounded-t-md border border-b-0 border-line/20 bg-surface-6 px-3 pt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-fg-muted"
				aria-hidden="true"
			>
				Personnel file
			</div>
			<article id="profile-card" class="paper relative rounded-[3px] pl-5 sm:pl-7">
				<!-- Punch holes -->
				<span class="absolute left-2 top-16 size-2.5 rounded-full bg-surface-1 shadow-inner" aria-hidden="true"></span>
				<span class="absolute left-2 bottom-16 size-2.5 rounded-full bg-surface-1 shadow-inner" aria-hidden="true"
				></span>

				<!-- File heading -->
				<div
					class="flex items-center gap-3 border-b-2 border-double border-line/40 px-4 pt-3 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted"
				>
					<span class="truncate">{data.citizenship?.name ?? "Stateless"}</span>
					<span class="hidden sm:inline text-fg-faint">File {data.user.id.slice(0, 8).toUpperCase()}</span>
					<span class="stamp ml-auto text-[10px]! py-0! px-1.5! shrink-0" style="--stamp-tilt: 0deg">Restricted</span>
				</div>

				<!-- Header: photo, name, roles -->
				<div class="relative flex flex-wrap gap-x-5 gap-y-3 px-4 pt-4 pb-3">
					{#if data.presidency}
						<span
							class="stamp animate-stamp pointer-events-none absolute right-4 top-6 sm:top-auto sm:bottom-3 rounded-full! px-3! py-2! text-center leading-tight"
							style="--stamp-tilt: -12deg"
							aria-hidden="true"
						>
							Head<br />of state
						</span>
					{:else if data.user.isPremium}
						<span
							class="stamp animate-stamp pointer-events-none absolute right-4 top-6 sm:top-auto sm:bottom-3"
							style="--stamp-tilt: -10deg"
							aria-hidden="true"
						>
							Premium
						</span>
					{/if}
					<!-- Photo, clipped to the sheet -->
					<div class="relative shrink-0 -rotate-2 bg-white p-1.5 pb-4 shadow-md">
						<span
							class="absolute -top-2 left-1/2 z-10 h-5 w-2.5 -translate-x-1/2 rounded-full border-2 border-[#8b8f98]"
							aria-hidden="true"
						></span>
						<div class="size-24 sm:size-28 overflow-hidden">
							<Logo
								src={data.user.logo}
								alt={data.user.name || "Portrait"}
								placeholderIcon={FluentPerson20Filled}
								placeholderGradient="from-surface-4 to-surface-2"
								class="size-full! rounded-none! grayscale-[35%] contrast-110"
							/>
						</div>
					</div>

					<div class="min-w-0 flex-1 basis-[13rem] space-y-2">
						<div class="flex items-start gap-2">
							<div class="min-w-0 flex-1">
								<p class="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">Surname, given name</p>
								<h1
									class="break-words font-mono text-2xl sm:text-3xl font-bold uppercase leading-tight tracking-wide text-fg"
								>
									{data.user.name || "Anonymous"}
								</h1>
							</div>
							{#if data.isOwnProfile}
								<IconButton
									icon={FluentEdit20Filled}
									label="Edit Profile"
									variant="secondary"
									size="xs"
									class="shrink-0"
									onclick={() => (showEditProfileSheet = true)}
								/>
							{/if}
						</div>

						<!-- Roles -->
						<ul class="space-y-1.5">
							{#if data.presidency}
								{@render roleLine(
									"President",
									`/state/${data.presidency.stateId}`,
									data.presidency.stateLogo,
									data.presidency.stateName,
									`T${data.presidency.term} · ${formatDate(data.presidency.electedAt)}`
								)}
								{#if data.presidency.bloc}
									{@render roleLine(
										"Bloc",
										`/bloc/${data.presidency.bloc.id}`,
										data.presidency.bloc.logo,
										data.presidency.bloc.name,
										"",
										FluentPeopleTeam20Filled
									)}
								{/if}
							{/if}
							{#if data.blocLeadership}
								{@render roleLine(
									"Bloc leader",
									`/bloc/${data.blocLeadership.blocId}`,
									data.blocLeadership.blocLogo,
									data.blocLeadership.blocName,
									formatDate(data.blocLeadership.appointedAt),
									FluentPeopleTeam20Filled
								)}
							{/if}
							{#if data.governorship}
								{@render roleLine(
									"Governor",
									`/region/${data.governorship.regionId}`,
									undefined,
									data.governorship.regionName,
									formatDate(data.governorship.appointedAt)
								)}
							{/if}
							{#if data.party}
								<li class="flex min-w-0 items-center gap-2.5 text-[15px]">
									<span class="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">
										Party
									</span>
									<a href="/party/{data.party.id}" class="group flex min-w-0 items-center gap-1.5">
										<PartyTag abbreviation={data.party.abbreviation} color={data.party.color} />
										<span class="truncate font-medium text-fg-body group-hover:text-fg group-hover:underline">
											{data.party.name}
										</span>
									</a>
									<span class="shrink-0 font-mono text-xs text-fg-muted">{partyRole(data.party.role)}</span>
								</li>
							{:else if data.isOwnProfile}
								<li class="flex items-center gap-2.5 text-[15px]">
									<span class="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">
										Party
									</span>
									<Button
										href={data.isIndependentRegion ? "/party/create" : "/party"}
										variant="secondary"
										size="xs"
										icon={data.isIndependentRegion ? FluentAdd20Filled : FluentSearch20Filled}
									>
										{data.isIndependentRegion ? "Create a Party" : "Find a Party"}
									</Button>
								</li>
							{/if}
						</ul>
					</div>
				</div>

				<!-- Ministries and diplomatic posts: each with its dismiss control -->
				{#if data.ministries.length > 0 || data.blocDiplomacies.length > 0}
					<ul id="offices" class="divide-y divide-line/15 border-t border-line/15">
						{#each data.ministries as ministry (ministry.id)}
							<li class="flex items-center gap-3 px-4 py-1.5" out:vanish>
								<FluentShieldTask20Filled class="size-5 shrink-0 text-fg-muted" />
								<a href="/state/{ministry.stateId}" class="group min-w-0 flex-1 text-[15px]">
									<span class="font-medium text-fg-body group-hover:text-fg group-hover:underline">
										Minister of {ministryNames[ministry.ministry] ?? ministry.ministry}
									</span>
									<span class="text-fg-muted">· {ministry.stateName}</span>
								</a>
								<span class="hidden shrink-0 font-mono text-xs text-fg-muted sm:inline">
									{formatDate(ministry.appointedAt)}
								</span>
								{#if data.currentUserPresidency?.stateId === ministry.stateId}
									<form
										method="POST"
										action="?/dismissMinister"
										use:confirmSubmit={{
											title: `Dismiss the ${ministryNames[ministry.ministry]} Minister?`,
											confirmLabel: "Dismiss",
											danger: true
										}}
										use:enhance={() =>
											async ({ result, update }) => {
												toastResult(result);
												await update();
											}}
									>
										<input type="hidden" name="ministerId" value={ministry.id} />
										<Button type="submit" variant="soft-red" size="xs" icon={FluentPersonDelete20Filled}>
											Dismiss
										</Button>
									</form>
								{/if}
							</li>
						{/each}
						{#each data.blocDiplomacies as diplomacy (diplomacy.id)}
							<li class="flex items-center gap-3 px-4 py-1.5" out:vanish>
								<Logo
									src={diplomacy.blocLogo}
									alt=""
									class="size-7! rounded-[3px]! shrink-0 ring-1 ring-black/15"
									placeholderIcon={FluentGlobeShield20Filled}
								/>
								<a href="/bloc/{diplomacy.blocId}" class="group min-w-0 flex-1 text-[15px]">
									<span class="font-medium text-fg-body group-hover:text-fg group-hover:underline">Diplomat</span>
									<span class="text-fg-muted">· {diplomacy.blocName}</span>
								</a>
								<span class="hidden shrink-0 font-mono text-xs text-fg-muted sm:inline">
									{formatDate(diplomacy.appointedAt)}
								</span>
								{#if data.viewerBlocId === diplomacy.blocId}
									<form
										method="POST"
										action="?/dismissBlocLeadership"
										use:confirmSubmit={{ title: "Dismiss this diplomat?", confirmLabel: "Dismiss", danger: true }}
										use:enhance={() =>
											async ({ result, update }) => {
												toastResult(result);
												await update();
											}}
									>
										<input type="hidden" name="role" value="diplomat" />
										<input type="hidden" name="id" value={diplomacy.id} />
										<Button type="submit" variant="soft-red" size="xs" icon={FluentPersonDelete20Filled}>
											Dismiss
										</Button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				<!-- Key/value fields -->
				<dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2.5 border-t border-line/15 px-4 py-3 text-[15px]">
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Citizenship</dt>
						<dd class="truncate border-b border-dotted border-line/40 pb-0.5 font-mono">
							{#if data.citizenship}
								<a href="/state/{data.citizenship.id}" class="group inline-flex max-w-full items-center gap-1.5">
									<Logo
										src={data.citizenship.logo}
										alt=""
										class="size-5! rounded-[2px]! shrink-0 ring-1 ring-black/15"
										placeholderIcon={FluentFlag20Filled}
									/>
									<span class="truncate text-fg-body group-hover:text-fg group-hover:underline">
										{data.citizenship.name}
									</span>
								</a>
							{:else}
								<span class="text-fg-muted">Stateless</span>
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Residence</dt>
						<dd class="truncate border-b border-dotted border-line/40 pb-0.5 font-mono">
							{#if data.homeRegion}
								<a href="/region/{data.homeRegion.id}" class="text-fg-body hover:text-fg hover:underline">
									{data.homeRegion.name}
								</a>
							{:else}
								<span class="text-fg-muted">None</span>
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Location</dt>
						<dd class="truncate border-b border-dotted border-line/40 pb-0.5 font-mono">
							{#if data.residence}
								<a href="/region/{data.residence.region.id}" class="text-fg-body hover:text-fg hover:underline">
									{data.residence.region.name}
								</a>
							{:else}
								<span class="text-fg-muted">Unknown</span>
							{/if}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Joined</dt>
						<dd class="text-fg-body border-b border-dotted border-line/40 pb-0.5 font-mono">
							{formatDate(data.user.createdAt)}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Articles</dt>
						<dd class="text-fg-body border-b border-dotted border-line/40 pb-0.5 font-mono">
							{data.articleCount}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Upvotes</dt>
						<dd class="text-fg-body border-b border-dotted border-line/40 pb-0.5 font-mono">
							{data.upvoteCount}
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted" title="Earned from community upvotes on posts and comments">Karma</dt>
						<dd class="border-b border-dotted border-line/40 pb-0.5 font-mono">
							<a
								href="/user/{data.user.id}/karma"
								class="font-mono text-fg-body hover:text-fg hover:underline"
								title="See how this was earned"
							>
								{data.karma}
							</a>
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted" title="How much civilians in the home region like you">Reputation</dt>
						<dd class="border-b border-dotted border-line/40 pb-0.5 font-mono">
							<a
								href="/user/{data.user.id}/reputation"
								class="font-mono text-fg-body hover:text-fg hover:underline"
								title="See how this is calculated"
							>
								{data.reputation ?? "—"}
							</a>
						</dd>
					</div>
					<div class="col-span-2 min-w-0">
						<dt class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Medals</dt>
						<dd class="border-b border-dotted border-line/40 pb-0.5 font-mono">
							<a href="/user/{data.user.id}/career" class="group inline-flex items-center gap-2">
								<span class="font-mono text-fg-body group-hover:text-fg group-hover:underline">
									{data.medals.length}
								</span>
								{#if data.medals.length > 0}
									<span class="flex flex-wrap gap-0.5">
										{#each data.medals as medal, i (medal.id)}
											{@const info = medalInfo(medal.medalType)}
											<span
												class="medal-ribbon block h-3 w-7 rounded-[1px] border border-black/40"
												style="background: {info.ribbon}; animation-delay: {i * 60}ms"
												title="{info.label}{medal.stateName ? ` — ${medal.stateName}` : ''}, {formatDate(
													medal.awardedAt
												)}"
											></span>
										{/each}
									</span>
								{/if}
							</a>
						</dd>
					</div>
				</dl>

				{#if data.user.bio}
					<div class="border-t border-line/15 px-4 py-2.5">
						<p class="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-muted">Remarks</p>
						<p class="mt-0.5 font-mono text-[15px] leading-relaxed text-fg-body break-words">{data.user.bio}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex flex-wrap items-center gap-2 border-t border-line/15 px-4 py-2.5">
					{#if !data.isOwnProfile}
						<Button variant="primary" size="sm" href="/chat/user/{data.user.id}" icon={FluentChat20Filled}>
							Message
						</Button>
					{/if}

					{#if data.isOwnProfile}
						<Button href="/visas" variant="secondary" size="sm" icon={FluentBookCompass24Filled}>Passport</Button>
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

					{#if !data.isOwnProfile || data.canAppointMinister || data.ownedNewspapers.length > 0}
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
		</div>

		<!-- More Actions Bottom Sheet -->
		<BottomSheet bind:open={showActionsSheet} title="Actions">
			<div class="space-y-1">
				{#if !data.isOwnProfile}
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

				{#if data.ownedNewspapers.length > 0}
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

				{#if !data.isOwnProfile}
					<div class="my-2 border-t border-line/15"></div>
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

		<!-- Birthday reward -->
		{#if data.isOwnProfile && data.birthdayInfo.totalYears >= 1 && (data.birthdayInfo.isBirthday || data.birthdayInfo.uncollectedYears.length > 0)}
			<section
				id="birthday-card"
				class="rounded-sm border border-primary/35 bg-primary/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
			>
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<span class="text-2xl" aria-hidden="true">🎂</span>
					<div class="min-w-0">
						<p class="text-sm font-semibold text-primary-fg">
							{data.birthdayInfo.isBirthday ? "Happy Birthday!" : "Belated birthday wishes"}
						</p>
						<p class="text-xs text-fg-soft">
							<span class="font-mono">{data.birthdayInfo.totalYears}</span>
							year{data.birthdayInfo.totalYears !== 1 ? "s" : ""} in service
							{#if data.birthdayInfo.uncollectedYears.length > 1}
								· <span class="font-mono">{data.birthdayInfo.uncollectedYears.length}</span> rewards waiting
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
								if (result.type === "success") {
									celebrate(document.getElementById("birthday-card"));
									feedback("win");
								} else {
									toastResult(result);
								}
								await update();
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

		<!-- Holdings: companies and newspapers -->
		{#if companies.length > 0 || newspapers.length > 0 || data.isOwnProfile}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
				{#if companies.length > 0 || data.isOwnProfile}
					<section class="panel rounded-sm overflow-hidden">
						<header class="flex items-center justify-between border-b border-line/15 px-4 py-2.5">
							<h2 class="section-title">Companies</h2>
							<span class="font-mono text-xs text-fg-muted">{companies.length}</span>
						</header>
						{#if data.organizations.returns.length > 0}
							<div class="grid grid-cols-2 divide-x divide-line/15 border-b border-line/15">
								<div class="px-4 py-2.5">
									<p class="text-[10px] uppercase tracking-wide text-fg-muted">Total return</p>
									<p
										class="font-mono text-sm font-bold {data.organizations.returns.reduce((s, r) => s + r.gain, 0) >= 0
											? 'text-positive-fg'
											: 'text-hostile-fg'}"
									>
										${data.organizations.returns.reduce((s, r) => s + r.gain, 0).toLocaleString()}
									</p>
								</div>
								<div class="px-4 py-2.5">
									<p class="text-[10px] uppercase tracking-wide text-fg-muted">Dividends received</p>
									<p class="font-mono text-sm font-bold text-fg">
										${data.organizations.returns.reduce((s, r) => s + r.dividends, 0).toLocaleString()}
									</p>
								</div>
							</div>
						{/if}
						{#if companies.length > 0}
							<ul class="divide-y divide-line/15">
								{#each visibleCompanies as company (company.id)}
									<li>
										<ProfileItem
											href="/company/{company.id}"
											logo={company.logo}
											logoAlt={company.name}
											placeholderIcon={FluentBuilding20Filled}
											title={company.name}
											subtitle={company.marketValue !== null
												? `Listed · value ${money(company.marketValue)}${company.roiPercent !== null ? ` · ROI ${company.roiPercent >= 0 ? "+" : ""}${company.roiPercent}%` : ""}`
												: `Private · founded ${formatDate(company.foundedAt)}`}
										>
											{#snippet aside()}
												{#if company.sharePrice !== null}
													<p class="font-mono text-sm text-fg">{money(company.sharePrice)}</p>
													<p class="text-[10px] uppercase tracking-wide text-fg-muted">per share</p>
												{:else}
													<p class="font-mono text-sm text-fg">{company.factoryCount}</p>
													<p class="text-[10px] uppercase tracking-wide text-fg-muted">
														{company.factoryCount === 1 ? "factory" : "factories"}
													</p>
												{/if}
											{/snippet}
										</ProfileItem>
									</li>
								{/each}
							</ul>
							{#if companies.length > LIST_PREVIEW}
								{@render showAllToggle(
									showAllCompanies,
									companies.length,
									() => (showAllCompanies = !showAllCompanies)
								)}
							{/if}
						{:else}
							<div class="p-4">
								<Button href="/company/create" variant="secondary" size="sm" block icon={FluentAdd20Filled}>
									Found a Company
								</Button>
							</div>
						{/if}
					</section>
				{/if}

				{#if newspapers.length > 0 || data.isOwnProfile}
					<section class="panel rounded-sm overflow-hidden">
						<header class="flex items-center justify-between border-b border-line/15 px-4 py-2.5">
							<h2 class="section-title">Newspapers</h2>
							<span class="font-mono text-xs text-fg-muted">{newspapers.length}</span>
						</header>
						{#if newspapers.length > 0}
							<ul class="divide-y divide-line/15">
								{#each visibleNewspapers as newspaper (newspaper.newspaperId)}
									<li>
										<ProfileItem
											href="/newspaper/{newspaper.newspaperId}"
											logo={newspaper.logo}
											logoAlt={newspaper.name}
											placeholderIcon={MdiNewspaperVariant}
											title={newspaper.name}
											subtitle="{rankNames[newspaper.rank] ?? newspaper.rank} · since {formatDate(newspaper.joinedAt)}"
										>
											{#snippet aside()}
												<p class="font-mono text-sm text-fg">{compact.format(newspaper.subscribers)}</p>
												<p class="text-[10px] uppercase tracking-wide text-fg-muted">
													subscriber{newspaper.subscribers === 1 ? "" : "s"}
												</p>
											{/snippet}
										</ProfileItem>
									</li>
								{/each}
							</ul>
							{#if newspapers.length > LIST_PREVIEW}
								{@render showAllToggle(
									showAllNewspapers,
									newspapers.length,
									() => (showAllNewspapers = !showAllNewspapers)
								)}
							{/if}
						{:else}
							<div class="p-4">
								<Button href="/newspaper/create" variant="secondary" size="sm" block icon={FluentAdd20Filled}>
									Start a Newspaper
								</Button>
							</div>
						{/if}
					</section>
				{/if}
			</div>
		{/if}

		<!-- Tutorials are presented here, so no floating help button is needed -->
		<section class="panel mt-5 rounded-sm p-4">
			<h2 class="section-title flex items-center gap-2 text-base">
				<FluentBookCompass24Filled class="size-5 text-primary" />
				Tutorials &amp; guides
			</h2>
			<p class="mt-1 text-xs text-fg-muted">
				Relaunch an interactive tour or read the full explanation in the documentation.
			</p>
			<div class="mt-3 grid gap-2 sm:grid-cols-3">
				<a href="/training?view=navy&tutorial=navy" class="panel-interactive block rounded-sm p-3 no-underline">
					<h3 class="text-sm font-semibold text-heading">Fleet tour</h3>
					<p class="mt-1 text-xs text-fg-muted">Ports, docks, ships, mines and sea intel.</p>
				</a>
				<a href="/training?view=aviation&tutorial=air" class="panel-interactive block rounded-sm p-3 no-underline">
					<h3 class="text-sm font-semibold text-heading">Air force tour</h3>
					<p class="mt-1 text-xs text-fg-muted">Squadrons and directed missions.</p>
				</a>
				<a href="/map?tutorial=map" class="panel-interactive block rounded-sm p-3 no-underline">
					<h3 class="text-sm font-semibold text-heading">Map tour</h3>
					<p class="mt-1 text-xs text-fg-muted">Naval, land and airspace modes.</p>
				</a>
			</div>
			<a href="/docs" class="mt-3 inline-block text-xs text-primary-fg hover:underline">All documentation →</a>
		</section>
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
						await glow("profile-card");
					} else if (result.type === "failure") {
						appointmentError = actionError(result.data, "Failed to appoint minister");
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
						class="bg-primary/12 border border-primary/35 text-primary-fg rounded-sm p-4 flex items-center gap-3 text-sm"
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
						await glow("profile-card");
					} else if (result.type === "failure") {
						blocAppointmentError = actionError(result.data, "Failed to appoint bloc leadership");
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

				{#if data.availableBlocRoles.length === 0}
					<div
						class="bg-primary/12 border border-primary/35 text-primary-fg rounded-sm p-4 flex items-center gap-3 text-sm"
					>
						<span>Nothing open: nominations run 2 days before an election, both diplomat seats are filled.</span>
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
						await glow("profile-card");
					} else if (result.type === "failure") {
						giftPremiumError = actionError(result.data, "Failed to gift premium");
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
	{#if data.ownedNewspapers.length > 0}
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

<style>
	/* Ribbons are pinned onto the sheet one after another. */
	.medal-ribbon {
		animation: ribbon-pin 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	@keyframes ribbon-pin {
		from {
			opacity: 0;
			transform: translateY(-6px) scale(0.6) rotate(-8deg);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.medal-ribbon {
			animation: none;
		}
	}
</style>
