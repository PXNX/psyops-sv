<!-- src/routes/(authenticated)/(dock)/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPaint20Filled from "~icons/fluent/paint-brush-20-filled";
	import FluentDataUsage20Filled from "~icons/fluent/data-usage-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAlert20Filled from "~icons/fluent/alert-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import { themes } from "$lib/themes";
	import { settings } from "$lib/settings.svelte";

	let { data, form } = $props();

	let showDeleteModal = $state(false);
	let deleteConfirmation = $state("");
	let isDeleting = $state(false);

	let notifyNewspaperPosts = $state(data.profile.notifyNewspaperPosts);
	let notifyDirectMessages = $state(data.profile.notifyDirectMessages);
	let notifyWarDeclarations = $state(data.profile.notifyWarDeclarations);
	let notifyBattleResults = $state(data.profile.notifyBattleResults);
	let notifyElections = $state(data.profile.notifyElections);
	let notifyTravelComplete = $state(data.profile.notifyTravelComplete);
	let notifyShiftComplete = $state(data.profile.notifyShiftComplete);
	let notifyMarketSales = $state(data.profile.notifyMarketSales);
	let notifyNewProposals = $state(data.profile.notifyNewProposals);

	async function updateSettings() {
		const formData = new FormData();
		formData.append("theme", settings.theme);
		formData.append("loadImages", settings.loadImages.toString());

		await fetch("?/updateSettings", {
			method: "POST",
			body: formData
		});
	}

	function set_theme(event: Event) {
		const select = event.target as HTMLSelectElement;
		const theme = select.value;
		if (themes.includes(theme)) {
			settings.setTheme(theme);
			updateSettings();
		}
	}

	function toggleLoadImages(event: Event) {
		const checked = (event.target as HTMLInputElement).checked;
		settings.setLoadImages(checked);
		updateSettings();
	}

	async function toggleNotification(setting: string, value: boolean) {
		const formData = new FormData();
		formData.append(setting, value.toString());

		await fetch("?/updateNotifications", {
			method: "POST",
			body: formData
		});
	}
</script>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<div
			class="size-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentSettings20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Settings</h1>
		<p class="text-gray-400">Manage your account preferences</p>
	</div>

	<!-- Edit Profile Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/settings/profile"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-purple-600/20 p-2 rounded-lg">
					<FluentPerson20Filled class="size-5 text-purple-400" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Edit Profile</p>
					<p class="text-xs text-gray-400">Change your name, bio and profile picture</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
		</a>
	</div>

	<!-- Telegram Connection -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<svg class="size-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
				/>
			</svg>
			<h2 class="text-lg font-semibold text-white">Telegram Account</h2>
		</div>

		{#if data.profile.telegramUsername}
			<div class="bg-slate-900/50 rounded-lg p-4 space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-400">Connected Telegram Account</p>
						<p class="text-base font-semibold text-white mt-1">@{data.profile.telegramUsername}</p>
					</div>
					<div class="badge badge-success">Connected</div>
				</div>
				<form method="POST" action="?/disconnectTelegram" use:enhance>
					<button type="submit" class="btn btn-sm btn-outline btn-error w-full"> Disconnect Telegram </button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-gray-400">
				Connect your Telegram account to receive notifications and use Telegram-based features.
			</p>
			<a href="/auth/login/telegram?next=/settings" class="btn btn-primary w-full gap-2">
				<svg class="size-5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
					/>
				</svg>
				Connect Telegram Account
			</a>
		{/if}
	</div>

	<!-- Application Settings -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentPaint20Filled class="size-5 text-purple-400" />
			<h2 class="text-lg font-semibold text-white">Appearance</h2>
		</div>

		<div>
			<label for="theme" class="block text-sm font-medium text-gray-300 mb-2"> Theme </label>
			<select
				id="theme"
				value={settings.theme}
				data-choose-theme
				class="select w-full bg-slate-700/50 border-slate-600/30 text-white capitalize focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				onchange={set_theme}
			>
				{#each themes as theme}
					<option value={theme} class="capitalize">{theme}</option>
				{/each}
			</select>
		</div>

		<div class="pt-2">
			<label class="flex items-center justify-between cursor-pointer group">
				<div class="flex items-center gap-3">
					<FluentDataUsage20Filled class="size-5 text-purple-400" />
					<div>
						<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Load Images</p>
						<p class="text-xs text-gray-500">Disable to save data and improve performance</p>
					</div>
				</div>
				<input
					type="checkbox"
					checked={settings.loadImages}
					onchange={toggleLoadImages}
					class="toggle toggle-primary"
				/>
			</label>
		</div>
	</div>

	<!-- Notification Settings -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-1">
		<div class="flex items-center gap-2 mb-3">
			<FluentAlert20Filled class="size-5 text-blue-400" />
			<h2 class="text-lg font-semibold text-white">Notifications</h2>
		</div>
		<p class="text-xs text-gray-500 mb-3">Choose which events send you push notifications</p>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">💬</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Direct Messages</p>
					<p class="text-xs text-gray-500">When someone sends you a private message</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyDirectMessages}
				onchange={() => toggleNotification("notifyDirectMessages", notifyDirectMessages)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">📰</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Newspaper Posts</p>
					<p class="text-xs text-gray-500">When a subscribed newspaper publishes an article</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyNewspaperPosts}
				onchange={() => toggleNotification("notifyNewspaperPosts", notifyNewspaperPosts)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">⚔️</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">War Declarations</p>
					<p class="text-xs text-gray-500">When war is declared on or by your state</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyWarDeclarations}
				onchange={() => toggleNotification("notifyWarDeclarations", notifyWarDeclarations)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">🏁</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Battle Results</p>
					<p class="text-xs text-gray-500">When a battle involving your state ends</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyBattleResults}
				onchange={() => toggleNotification("notifyBattleResults", notifyBattleResults)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">🗳️</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Elections</p>
					<p class="text-xs text-gray-500">When an election starts or results are announced</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyElections}
				onchange={() => toggleNotification("notifyElections", notifyElections)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">📜</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">New Proposals</p>
					<p class="text-xs text-gray-500">When a new parliamentary proposal needs your vote</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyNewProposals}
				onchange={() => toggleNotification("notifyNewProposals", notifyNewProposals)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">✈️</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Travel Arrived</p>
					<p class="text-xs text-gray-500">When you arrive at your travel destination</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyTravelComplete}
				onchange={() => toggleNotification("notifyTravelComplete", notifyTravelComplete)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-white/5">
			<div class="flex items-center gap-3">
				<span class="text-lg">🏭</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Shift Complete</p>
					<p class="text-xs text-gray-500">When your factory shift is done and wages are ready</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyShiftComplete}
				onchange={() => toggleNotification("notifyShiftComplete", notifyShiftComplete)}
				class="toggle toggle-info"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5">
			<div class="flex items-center gap-3">
				<span class="text-lg">💰</span>
				<div>
					<p class="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Market Sales</p>
					<p class="text-xs text-gray-500">When someone buys from your market listing</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyMarketSales}
				onchange={() => toggleNotification("notifyMarketSales", notifyMarketSales)}
				class="toggle toggle-info"
			/>
		</label>
	</div>

	<!-- Premium Membership Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/premium"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-2 rounded-lg">
					<FluentStar20Filled class="size-5 text-white" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Premium Membership</p>
					<p class="text-xs text-gray-400">Automate production, training & factory work</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
		</a>
	</div>

	<!-- Gift Code Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/giftcode"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
					<FluentGift20Filled class="size-5 text-white" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Gift Codes</p>
					<p class="text-xs text-gray-400">Redeem codes for exclusive rewards and bonuses</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
		</a>
	</div>

	<!-- About Link -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
		<a
			href="/about"
			class="flex items-center justify-between group hover:bg-slate-700/30 -m-5 p-5 rounded-xl transition-colors"
		>
			<div class="flex items-center gap-3">
				<div class="bg-blue-600/20 p-2 rounded-lg">
					<FluentInfo20Filled class="size-5 text-blue-400" />
				</div>
				<div>
					<p class="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
						About This Application
					</p>
					<p class="text-xs text-gray-400">Learn more about features, version, and terms</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
		</a>
	</div>

	<!-- Account Actions -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
		<h2 class="text-lg font-semibold text-white">Account</h2>

		<div class="bg-slate-700/50 rounded-xl border border-white/5 p-4 text-code">
			{data.profile.email}
		</div>

		<form method="POST" action="?/logout" use:enhance>
			<button
				type="submit"
				class="btn w-full justify-start bg-red-600/10 hover:bg-red-600/20 border-red-500/20 text-red-300 hover:text-red-200 gap-2"
			>
				<FluentArrowExit20Filled class="size-5" />
				Sign Out
			</button>
		</form>
	</div>

	<!-- Danger Zone -->
	<div class="bg-red-950/30 rounded-xl border border-red-500/20 p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentDelete20Filled class="size-5 text-red-400" />
			<h2 class="text-lg font-semibold text-red-300">Danger Zone</h2>
		</div>

		<p class="text-sm text-gray-400">
			Permanently delete your account and all associated data. This action cannot be undone.
		</p>

		<button
			type="button"
			onclick={() => {
				showDeleteModal = true;
				deleteConfirmation = "";
			}}
			class="btn w-full justify-start bg-red-600/10 hover:bg-red-600/20 border-red-500/30 text-red-300 hover:text-red-200 gap-2"
		>
			<FluentDelete20Filled class="size-5" />
			Delete Account
		</button>
	</div>
</div>

<!-- Delete Account Confirmation Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => {
				showDeleteModal = false;
			}}
			tabindex="-1"
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div class="relative bg-slate-800 rounded-2xl border border-red-500/30 p-6 max-w-md w-full space-y-4 shadow-2xl">
			<div class="flex items-center gap-3">
				<div class="bg-red-600/20 p-2.5 rounded-xl">
					<FluentDelete20Filled class="size-6 text-red-400" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Delete Account</h3>
					<p class="text-sm text-gray-400">This action is irreversible</p>
				</div>
			</div>

			<div class="bg-red-950/40 border border-red-500/20 rounded-lg p-3 space-y-2">
				<p class="text-sm text-red-300 font-medium">The following will be permanently deleted:</p>
				<ul class="text-sm text-gray-400 space-y-1 list-disc list-inside">
					<li>Your profile, wallet, and inventory</li>
					<li>Companies, factories, and market listings</li>
					<li>Party memberships and political positions</li>
					<li>Military units and articles</li>
					<li>All messages, notifications, and history</li>
				</ul>
			</div>

			<form
				method="POST"
				action="?/deleteAccount"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						isDeleting = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="delete-confirmation" class="block text-sm font-medium text-gray-300 mb-2">
						Type <span class="text-red-400 font-bold">DELETE</span> to confirm
					</label>
					<input
						id="delete-confirmation"
						name="confirmation"
						type="text"
						autocomplete="off"
						bind:value={deleteConfirmation}
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
						placeholder="DELETE"
					/>
				</div>

				{#if form?.deleteError}
					<p class="text-sm text-red-400">{form.deleteError}</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => {
							showDeleteModal = false;
						}}
						class="btn flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600/30 text-gray-300"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={deleteConfirmation !== "DELETE" || isDeleting}
						class="btn flex-1 bg-red-600 hover:bg-red-700 border-red-500/30 text-white disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{#if isDeleting}
							<span class="loading loading-spinner loading-sm"></span>
							Deleting...
						{:else}
							Delete My Account
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
