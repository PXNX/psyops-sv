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
	import { themes } from "#lib/themes.js";
	import { settings } from "#lib/settings.svelte.js";
	import TelegramLoginWidget from "#lib/components/TelegramLoginWidget.svelte";
	import PushNotificationManager from "#lib/components/PushNotificationManager.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";

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

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader title="Settings" subtitle="Manage your account preferences" icon={FluentSettings20Filled} />

	<!-- Edit Profile Link -->
	<a
		href="/user/{data.accountId}"
		class="group panel-interactive rounded-sm p-5 flex items-center justify-between"
	>
		<div class="flex items-center gap-3">
			<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 p-2 rounded-sm">
				<FluentPerson20Filled class="size-5 text-[#b7a0c5]" />
			</div>
			<div>
				<p class="text-sm font-medium text-[#fff7e8] group-hover:text-[#f2c463] transition-colors">Edit Profile</p>
				<p class="text-xs text-[#a89e8e]">Change your name, bio and profile picture</p>
			</div>
		</div>
		<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
	</a>

	<!-- Telegram Connection -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="flex items-center gap-2">
			<svg class="size-5 text-[#7ba0c8]" fill="currentColor" viewBox="0 0 24 24">
				<path
					d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
				/>
			</svg>
			<h2 class="section-title">Telegram Account</h2>
		</div>

		{#if data.profile.telegramUsername}
			<div class="panel-muted rounded-sm p-4 space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-[#a89e8e]">Connected Telegram Account</p>
						<p class="text-base font-semibold text-[#fff7e8] mt-1">@{data.profile.telegramUsername}</p>
					</div>
					<Badge tone="green">Connected</Badge>
				</div>
				<form method="POST" action="?/disconnectTelegram" use:enhance>
					<Button type="submit" variant="soft-red" size="sm" block>Disconnect Telegram</Button>
				</form>
			</div>
		{:else}
			<p class="text-sm text-[#a89e8e]">
				Connect your Telegram account to receive notifications and use Telegram-based features.
			</p>
			<TelegramLoginWidget next="/settings" label="Connect Telegram Account" />
		{/if}
	</div>

	<!-- Application Settings -->
	<div class="panel rounded-sm p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentPaint20Filled class="size-5 text-[#b7a0c5]" />
			<h2 class="section-title">Appearance</h2>
		</div>

		<div>
			<label for="theme" class="field-label">Theme</label>
			<select
				id="theme"
				value={settings.theme}
				data-choose-theme
				class="field-control rounded-sm px-3 py-2.5 w-full capitalize"
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
					<FluentDataUsage20Filled class="size-5 text-[#b7a0c5]" />
					<div>
						<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Load Images</p>
						<p class="text-xs text-[#a89e8e]">Disable to save data and improve performance</p>
					</div>
				</div>
				<input
					type="checkbox"
					checked={settings.loadImages}
					onchange={toggleLoadImages}
					class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
				/>
			</label>
		</div>
	</div>

	<!-- Notification Settings -->
	<div class="panel rounded-sm p-5 space-y-1">
		<div class="flex items-center gap-2 mb-3">
			<FluentAlert20Filled class="size-5 text-[#7ba0c8]" />
			<h2 class="section-title">Notifications</h2>
		</div>
		<p class="text-xs text-[#a89e8e] mb-3">Choose which events send you push notifications</p>

		<div class="border-b border-[#dfceb0]/10">
			<PushNotificationManager />
		</div>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">💬</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Direct Messages</p>
					<p class="text-xs text-[#a89e8e]">When someone sends you a private message</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyDirectMessages}
				onchange={() => toggleNotification("notifyDirectMessages", notifyDirectMessages)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">📰</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Newspaper Posts</p>
					<p class="text-xs text-[#a89e8e]">When a subscribed newspaper publishes an article</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyNewspaperPosts}
				onchange={() => toggleNotification("notifyNewspaperPosts", notifyNewspaperPosts)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">⚔️</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">
						War Declarations
					</p>
					<p class="text-xs text-[#a89e8e]">When war is declared on or by your state</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyWarDeclarations}
				onchange={() => toggleNotification("notifyWarDeclarations", notifyWarDeclarations)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">🏁</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Battle Results</p>
					<p class="text-xs text-[#a89e8e]">When a battle involving your state ends</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyBattleResults}
				onchange={() => toggleNotification("notifyBattleResults", notifyBattleResults)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">🗳️</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Elections</p>
					<p class="text-xs text-[#a89e8e]">When an election starts or results are announced</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyElections}
				onchange={() => toggleNotification("notifyElections", notifyElections)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">📜</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">New Proposals</p>
					<p class="text-xs text-[#a89e8e]">When a new parliamentary proposal needs your vote</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyNewProposals}
				onchange={() => toggleNotification("notifyNewProposals", notifyNewProposals)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">✈️</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Travel Arrived</p>
					<p class="text-xs text-[#a89e8e]">When you arrive at your travel destination</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyTravelComplete}
				onchange={() => toggleNotification("notifyTravelComplete", notifyTravelComplete)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5 border-b border-[#dfceb0]/10">
			<div class="flex items-center gap-3">
				<span class="text-lg">🏭</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Shift Complete</p>
					<p class="text-xs text-[#a89e8e]">When your factory shift is done and wages are ready</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyShiftComplete}
				onchange={() => toggleNotification("notifyShiftComplete", notifyShiftComplete)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>

		<label class="flex items-center justify-between cursor-pointer group py-2.5">
			<div class="flex items-center gap-3">
				<span class="text-lg">💰</span>
				<div>
					<p class="text-sm font-medium text-[#d9ccb7] group-hover:text-[#fff7e8] transition-colors">Market Sales</p>
					<p class="text-xs text-[#a89e8e]">When someone buys from your market listing</p>
				</div>
			</div>
			<input
				type="checkbox"
				bind:checked={notifyMarketSales}
				onchange={() => toggleNotification("notifyMarketSales", notifyMarketSales)}
				class="toggle border-[#dfceb0]/25 bg-[#0d1d31] text-[#a89e8e] checked:border-[#e6a527]/60 checked:bg-[#e6a527]/20 checked:text-[#f7c56b]"
			/>
		</label>
	</div>

	<!-- Premium Membership Link -->
	<a
		href="/premium"
		class="group panel-interactive rounded-sm p-5 flex items-center justify-between"
	>
		<div class="flex items-center gap-3">
			<div class="bg-[#e6a527]/12 border border-[#e6a527]/35 p-2 rounded-sm">
				<FluentStar20Filled class="size-5 text-[#f7c56b]" />
			</div>
			<div>
				<p class="text-sm font-medium text-[#fff7e8] group-hover:text-[#f2c463] transition-colors">
					Premium Membership
				</p>
				<p class="text-xs text-[#a89e8e]">Automate production, training & factory work</p>
			</div>
		</div>
		<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
	</a>

	<!-- Gift Code Link -->
	<a
		href="/giftcode"
		class="group panel-interactive rounded-sm p-5 flex items-center justify-between"
	>
		<div class="flex items-center gap-3">
			<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 p-2 rounded-sm">
				<FluentGift20Filled class="size-5 text-[#b7a0c5]" />
			</div>
			<div>
				<p class="text-sm font-medium text-[#fff7e8] group-hover:text-[#f2c463] transition-colors">Gift Codes</p>
				<p class="text-xs text-[#a89e8e]">Redeem codes for exclusive rewards and bonuses</p>
			</div>
		</div>
		<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
	</a>

	<!-- About Link -->
	<a
		href="/about"
		class="group panel-interactive rounded-sm p-5 flex items-center justify-between"
	>
		<div class="flex items-center gap-3">
			<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 p-2 rounded-sm">
				<FluentInfo20Filled class="size-5 text-[#7ba0c8]" />
			</div>
			<div>
				<p class="text-sm font-medium text-[#fff7e8] group-hover:text-[#f2c463] transition-colors">
					About This Application
				</p>
				<p class="text-xs text-[#a89e8e]">Learn more about features, version, and terms</p>
			</div>
		</div>
		<FluentChevronRight20Filled class="size-5 text-[#a89e8e] group-hover:text-[#f2c463] transition-colors" />
	</a>

	<!-- Account Actions -->
	<div class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">Account</h2>

		<div class="panel-muted rounded-sm p-4 text-sm text-[#d9ccb7] break-all">
			{data.profile.email}
		</div>

		<form method="POST" action="?/logout" use:enhance>
			<Button type="submit" variant="soft-red" block icon={FluentArrowExit20Filled} class="justify-start">Sign Out</Button>
		</form>
	</div>

	<!-- Danger Zone -->
	<div class="bg-red-600/10 rounded-sm border border-red-500/30 p-5 space-y-3">
		<h2 class="section-title">
			<FluentDelete20Filled class="size-5 text-red-400" />
			<span class="text-red-300">Danger Zone</span>
		</h2>

		<p class="text-sm text-[#a89e8e]">
			Permanently delete your account and all associated data. This action cannot be undone.
		</p>

		<Button
			type="button"
			variant="soft-red"
			block
			icon={FluentDelete20Filled}
			class="justify-start"
			onclick={() => {
				showDeleteModal = true;
				deleteConfirmation = "";
			}}
		>
			Delete Account
		</Button>
	</div>
</PageContainer>

<!-- Delete Account Confirmation Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-[#0c1929]/80 backdrop-blur-sm"
			onclick={() => {
				showDeleteModal = false;
			}}
			tabindex="-1"
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div class="relative bg-[#14283f] rounded-sm border border-red-500/30 p-6 max-w-md w-full space-y-4 shadow-2xl">
			<div class="flex items-center gap-3">
				<div class="bg-red-600/10 border border-red-500/30 p-2.5 rounded-sm">
					<FluentDelete20Filled class="size-6 text-red-400" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-[#fff7e8]">Delete Account</h3>
					<p class="text-sm text-[#a89e8e]">This action is irreversible</p>
				</div>
			</div>

			<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-3 space-y-2">
				<p class="text-sm text-red-300 font-medium">The following will be permanently deleted:</p>
				<ul class="text-sm text-[#a89e8e] space-y-1 list-disc list-inside">
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
					<label for="delete-confirmation" class="field-label">
						Type <span class="text-red-400 font-bold">DELETE</span> to confirm
					</label>
					<input
						id="delete-confirmation"
						name="confirmation"
						type="text"
						autocomplete="off"
						bind:value={deleteConfirmation}
						class="field-control w-full rounded-sm px-3 py-2.5 focus:border-red-500/50 focus:ring-red-500/20"
						placeholder="DELETE"
					/>
				</div>

				{#if form?.deleteError}
					<p class="field-error">{form.deleteError}</p>
				{/if}

				<div class="flex gap-3">
					<Button
						type="button"
						variant="secondary"
						grow
						onclick={() => {
							showDeleteModal = false;
						}}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="danger"
						grow
						disabled={deleteConfirmation !== "DELETE" || isDeleting}
						loading={isDeleting}
						loadingText="Deleting..."
					>
						Delete My Account
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
