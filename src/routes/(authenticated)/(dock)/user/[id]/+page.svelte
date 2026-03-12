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
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentShieldTask20Filled from "~icons/fluent/shield-task-20-filled";
	import FluentPersonDelete20Filled from "~icons/fluent/person-delete-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";

	import Modal from "$lib/component/Modal.svelte";
	import ReportModal from "$lib/component/ReportModal.svelte";
	import AddAuthorModal from "./AddAuthorModal.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";
	import * as m from "$lib/paraglide/messages";
	import { shareLink } from "$lib/util";
	import { formatDate, getDaysRemaining } from "$lib/utils/formatting.js";
	import Logo from "$lib/component/Logo.svelte";

	const { data, form } = $props();

	let showAppointDialog = $state(false);
	let showReportModal = $state(false);
	let showAddAuthorModal = $state(false);
	let selectedMinistry = $state("");
	let isAppointingMinister = $state(false);
	let appointmentError = $state<string | null>(null);

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
</script>

<svelte:head>
	<title>{data.user.name || 'User Profile'}</title>
	<meta name="description" content={data.user.bio || `View the profile of ${data.user.name || 'this user'} on PsyOps.`} />

	<!-- Open Graph -->
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={data.user.name || 'User Profile'} />
	<meta property="og:description" content={data.user.bio || `View the profile of ${data.user.name || 'this user'} on PsyOps.`} />
	{#if data.user.logo}
		<meta property="og:image" content={data.user.logo} />
		<meta property="og:image:width" content="96" />
		<meta property="og:image:height" content="96" />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.user.name || 'User Profile'} />
	<meta name="twitter:description" content={data.user.bio || `View the profile of ${data.user.name || 'this user'} on PsyOps.`} />
	{#if data.user.logo}
		<meta name="twitter:image" content={data.user.logo} />
	{/if}
</svelte:head>

<div class="w-full mx-auto px-3 sm:px-4 py-6 space-y-6 sm:max-w-2xl">
	<!-- Hero Section with Party Background -->
	<div class="relative">
		<div
			class="w-full rounded-2xl p-8 flex flex-col items-center relative overflow-hidden border border-white/5 shadow-2xl"
			style="background: linear-gradient(135deg, {data.party?.color || '#1e293b'}20 0%, {data.party?.color ||
				'#1e293b'}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.party?.color ||
					'#ffffff'}20 35px, {data.party?.color || '#ffffff'}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-2xl"></div>

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<Logo src={data.user.logo} alt={data.user.name} placeholderIcon={FluentImageOff20Filled} class="size-20" />

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-white tracking-tight">{data.user.name || "Anonymous User"}</h1>
					<p class="text-sm text-gray-400 font-mono">#{data.user.id}</p>
					{#if data.user.bio}
						<p class="text-sm text-gray-300 max-w-md mt-2">{data.user.bio}</p>
					{/if}

					<!-- Government Positions Badges -->
					<div class="flex gap-2 justify-center flex-wrap mt-3">
						{#if data.account.role === "moderator"}
							<div class="badge badge-lg gap-2 bg-purple-600/20 border-purple-500/30 text-purple-300">👑 Moderator</div>
						{:else if data.account.role === "admin"}
							<div class="badge badge-lg gap-2 bg-red-600/20 border-red-500/30 text-red-300">👑 Admin</div>
						{/if}

						{#if data.presidency}
							<div class="badge badge-lg gap-2 bg-yellow-600/20 border-yellow-500/30 text-yellow-300">
								👑 President of {data.presidency.stateName}
							</div>
						{/if}
						{#if data.governorship}
							<div class="badge badge-lg gap-2 bg-blue-600/20 border-blue-500/30 text-blue-300">
								🏛️ Governor of {data.governorship.regionName}
							</div>
						{/if}
						{#each data.ministries as ministry}
							<div class="badge badge-lg gap-2 bg-purple-600/20 border-purple-500/30 text-purple-300">
								{ministryIcons[ministry.ministry]}
								{ministryNames[ministry.ministry]} Minister
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<section class="flex gap-2 justify-center flex-wrap">
		{#if data.user.id !== data.account?.id}
			<a
				class="btn btn-sm gap-2 bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-300 hover:text-purple-200 transition-all"
				href="/chat/user/{data.user.id}"
			>
				<FluentChat20Filled class="size-4" />
				<span class="hidden sm:inline">Message</span>
			</a>

			<button
				class="btn btn-sm gap-2 bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-300 hover:text-blue-200 transition-all"
				onclick={() => shareLink(data.user.name || "User", window.location.href)}
			>
				<FluentGiftCardArrowRight20Filled class="size-4" />
				<span class="hidden sm:inline">Gift</span>
			</button>

			{#if data.ownedNewspapers && data.ownedNewspapers.length > 0}
				<button
					class="btn btn-sm gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all"
					onclick={() => (showAddAuthorModal = true)}
				>
					<MdiNewspaperPlus class="size-4" />
					<span class="hidden sm:inline">Add Author</span>
				</button>
			{/if}

			{#if data.canAppointMinister}
				<button
					class="btn btn-sm gap-2 bg-amber-600/10 hover:bg-amber-600/20 border-amber-500/20 text-amber-300 hover:text-amber-200 transition-all"
					onclick={() => (showAppointDialog = true)}
				>
					<FluentShieldTask20Filled class="size-4" />
					<span class="hidden sm:inline">Appoint Minister</span>
				</button>
			{/if}

			<button
				class="btn btn-sm gap-2 bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-300 hover:text-red-200 transition-all"
				onclick={() => (showReportModal = true)}
			>
				<FluentAccessibilityError20Filled class="size-4" />
				<span class="hidden sm:inline">Report</span>
			</button>
		{/if}

		<button
			class="btn btn-sm gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
			onclick={() => shareLink(data.user.name || "User", window.location.href)}
		>
			<FluentShareAndroid20Filled class="size-4" />
			<span class="hidden sm:inline">Share</span>
		</button>

			{#if data.isOwnProfile}
				<a
					href="/settings/profile"
					class="btn btn-sm gap-2 bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-300 hover:text-purple-200 transition-all"
				>
					<FluentSettingsCogMultiple20Filled class="size-4" />
					<span class="hidden sm:inline">Edit Profile</span>
				</a>

				<a
					href="/inbox"
					class="btn btn-sm gap-2 bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-300 hover:text-blue-200 transition-all"
				>
					<FluentMail20Filled class="size-4" />
					<span class="hidden sm:inline">Inbox</span>
				</a>

				<a
					href="/settings"
					class="btn btn-sm gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
				>
					<FluentSettingsCogMultiple20Filled class="size-4" />
					<span class="hidden sm:inline">Settings</span>
				</a>
			{/if}
	</section>

	<!-- Government Positions Section -->
	{#if data.presidency || data.governorship || data.ministries.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Government Positions</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
				{#if data.presidency}
					<ProfileItem
						href="/state/{data.presidency.stateId}"
						logo={data.presidency.stateLogo}
						logoAlt={data.presidency.stateName}
						placeholderIcon={FluentFlag20Filled}
						placeholderGradient="from-yellow-600 to-amber-600"
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
					<div class="flex items-center gap-3 hover:bg-slate-700/30 rounded-lg p-2 -m-2 transition-all">
						<div class="size-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
							<span class="text-2xl">{ministryIcons[ministry.ministry]}</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-white truncate">{ministryNames[ministry.ministry]} Minister</p>
							<p class="text-xs text-gray-400 truncate">
								{ministry.stateName} • Since {formatDate(ministry.appointedAt)}
							</p>
						</div>
						{#if data.currentUserPresidency?.stateId === ministry.stateId}
							<form method="POST" action="?/dismissMinister" use:enhance>
								<input type="hidden" name="ministerId" value={ministry.id} />
								<button
									type="submit"
									class="btn btn-xs gap-1 bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-400 hover:text-red-300"
									onclick={(e) => {
										if (!confirm("Are you sure you want to dismiss this minister?")) {
											e.preventDefault();
										}
									}}
								>
									<FluentPersonDelete20Filled class="size-3" />
									Dismiss
								</button>
							</form>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Location & Activity Section -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Location & Activity</h2>
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
			<!-- Residence -->
			{#if data.residence}
				<ProfileItem
					href="/region/{data.residence.region.id}"
					logo={data.residence.region.logo}
					logoAlt={data.residence.region.name}
					placeholderGradient="from-emerald-600 to-green-600"
					title={data.residence.region.name}
					subtitle="Residence{data.residence.region.state
						? ` • ${data.residence.region.state.name}`
						: ' • Independent'} • Since {formatDate(data.residence.movedInAt)}"
					hoverColor="emerald"
				/>
			{:else}
				<div class="flex items-center gap-3 p-2 text-gray-500">
					<div class="size-12 bg-slate-700/30 rounded-lg flex items-center justify-center">
						<FluentFlag20Filled class="size-6" />
					</div>
					<p class="text-sm">No permanent residence</p>
				</div>
			{/if}

			{#if data.isOwnProfile}
				<a
					href="/visas"
					class="btn btn-sm w-full gap-2 bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-400 hover:text-purple-300 transition-all mt-2"
				>
					<FluentBookCompass24Filled class="size-4" />
					Manage Visas
				</a>
			{/if}

			<!-- Articles Published -->
			<ProfileItem
				href="/user/{data.user.id}/articles"
				icon={FluentDocument20Filled}
				title="{data.articleCount} {data.articleCount === 1 ? 'Article' : 'Articles'} Published"
				subtitle="View all publications"
				hoverColor="purple"
			/>
		</div>
	</section>

	<!-- Birthday Reward Section -->
	{#if data.isOwnProfile && data.birthdayInfo.totalYears >= 1}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">🎂 Account Birthday</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4 space-y-3">
				{#if data.birthdayInfo.isBirthday}
					<div class="text-center py-2">
						<p class="text-2xl font-bold text-yellow-300">🎉 Happy Birthday! 🎉</p>
						<p class="text-sm text-gray-300 mt-1">Your account turns {data.birthdayInfo.totalYears} today!</p>
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<div class="size-12 bg-yellow-600/20 rounded-lg flex items-center justify-center text-2xl">🎂</div>
						<div>
							<p class="font-semibold text-white">Account Anniversary</p>
							<p class="text-xs text-gray-400">{data.birthdayInfo.totalYears} year{data.birthdayInfo.totalYears !== 1 ? 's' : ''} since account creation</p>
						</div>
					</div>
				{/if}
				{#if data.birthdayInfo.uncollectedYears.length > 0}
					<div class="bg-yellow-600/10 border border-yellow-500/20 rounded-lg p-3">
						<p class="text-sm text-yellow-300 font-medium">
							{#if data.birthdayInfo.uncollectedYears.length === 1}
								Year {data.birthdayInfo.uncollectedYears[0]} reward available!
							{:else}
								{data.birthdayInfo.uncollectedYears.length} uncollected birthday rewards!
							{/if}
						</p>
						<p class="text-xs text-gray-400 mt-1">
							Collect {data.birthdayInfo.rewardTotal.toLocaleString()} currency
							({data.birthdayInfo.rewardPerYear.toLocaleString()} × {data.birthdayInfo.uncollectedYears.length} year{data.birthdayInfo.uncollectedYears.length !== 1 ? 's' : ''})
						</p>
						<form
							method="POST"
							action="?/collectBirthday"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										confetti({
											particleCount: 150,
											spread: 80,
											origin: { y: 0.6 },
											colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#a78bfa', '#ec4899']
										});
									}
								};
							}}
							class="mt-2"
						>
							<button
								type="submit"
								class="btn btn-sm w-full gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-500/30 text-yellow-300 hover:text-yellow-200"
							>
								<FluentGiftCardArrowRight20Filled class="size-4" />
								Collect {data.birthdayInfo.rewardTotal.toLocaleString()} Currency
							</button>
						</form>
					</div>
				{:else}
					<p class="text-xs text-gray-500 text-center">All birthday rewards collected ✓</p>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Career & Politics Section -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Career & Politics</h2>
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-3 space-y-2">
			{#if data.party}
				<ProfileItem
					href="/party/{data.party.id}"
					logo={data.party.logo}
					logoAlt={data.party.name}
					placeholderIcon={FluentPeople20Filled}
					placeholderGradient="from-purple-600 to-blue-600"
					title={data.party.name}
					subtitle={data.party.role === "leader"
						? " Leader"
						: data.party.role === "deputy"
							? "Deputy "
							: "Member" + "Joined " + formatDate(data.party.foundedAt)}
					hoverColor={data.party.color}
				/>
			{:else if data.isOwnProfile}
				<a
					href="/party/create"
					class="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-500/30 rounded-lg hover:border-purple-500/50 hover:bg-purple-600/10 transition-all group"
				>
					<div
						class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors"
					>
						<FluentAdd20Filled class="size-5 text-purple-400" />
					</div>
					<div class="text-center">
						<p class="font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
							Create Political Party
						</p>
						<p class="text-xs text-gray-400">Start your own political movement</p>
					</div>
				</a>
			{/if}

			<a
				href="/user/{data.user.id}/career"
				role="button"
				class="btn btn-sm w-full gap-2 bg-transparent hover:bg-purple-600/10 border-purple-500/20 text-purple-400 hover:text-purple-300 transition-all mt-2"
			>
				<FluentChevronRight20Filled class="size-4" />
				View Full Career Timeline
			</a>
		</div>
	</section>
</div>

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
				<div class="alert alert-error bg-red-600/10 border-red-500/20 text-red-300">
					<span>{appointmentError}</span>
				</div>
			{/if}

			<div class="form-control">
				<label class="label">
					<span class="label-text text-gray-300">Select Ministry</span>
				</label>
				<select
					name="ministry"
					class="select select-bordered bg-slate-900 text-white border-white/10"
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
				<div class="alert alert-warning bg-yellow-600/10 border-yellow-500/20 text-yellow-300">
					<span>All ministries are currently occupied.</span>
				</div>
			{/if}

			<div class="flex gap-2 justify-end">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={isAppointingMinister}
					onclick={() => {
						showAppointDialog = false;
						selectedMinistry = "";
						appointmentError = null;
					}}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn bg-purple-600 hover:bg-purple-700 text-white border-none gap-2"
					disabled={!selectedMinistry || isAppointingMinister}
				>
					{#if isAppointingMinister}
						<span class="loading loading-spinner loading-sm"></span>
						Appointing...
					{:else}
						<FluentShieldTask20Filled class="size-4" />
						Appoint Minister
					{/if}
				</button>
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

<!-- Add Author Modal -->
{#if data.ownedNewspapers}
	<AddAuthorModal
		bind:show={showAddAuthorModal}
		userId={data.user.id}
		userName={data.user.name || "User"}
		newspapers={data.ownedNewspapers}
	/>
{/if}
