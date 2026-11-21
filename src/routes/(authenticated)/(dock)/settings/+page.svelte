<!-- src/routes/(authenticated)/(dock)/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPaint20Filled from "~icons/fluent/paint-brush-20-filled";
	import FluentDataUsage20Filled from "~icons/fluent/data-usage-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAlert20Filled from "~icons/fluent/alert-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentEyeOff20Filled from "~icons/fluent/eye-off-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentWeatherMoon20Filled from "~icons/fluent/weather-moon-20-filled";
	import FluentWeatherSunny20Filled from "~icons/fluent/weather-sunny-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
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
	let emailRevealed = $state(false);

	let notifyNewspaperPosts = $state(data.profile.notifyNewspaperPosts);
	let notifyDirectMessages = $state(data.profile.notifyDirectMessages);
	let notifyWarDeclarations = $state(data.profile.notifyWarDeclarations);
	let notifyBattleResults = $state(data.profile.notifyBattleResults);
	let notifyElections = $state(data.profile.notifyElections);
	let notifyTravelComplete = $state(data.profile.notifyTravelComplete);
	let notifyShiftComplete = $state(data.profile.notifyShiftComplete);
	let notifyMarketSales = $state(data.profile.notifyMarketSales);
	let notifyNewProposals = $state(data.profile.notifyNewProposals);

	const displayName = $derived(data.profile.name?.trim() || data.profile.email.split("@")[0] || "Agent");
	const initials = $derived(
		displayName
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? "")
			.join("") || "?"
	);
	const emailClass = $derived(
		`truncate font-mono text-sm text-fg-soft transition-[filter] duration-200 ${emailRevealed ? "" : "blur-[5px] select-none"}`
	);

	function themeButtonClass(theme: "dark" | "light") {
		return `press-spring flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
			settings.theme === theme
				? "border-primary/70 bg-primary/12 text-primary-fg"
				: "border-line/15 bg-surface-1 text-fg-soft hover:border-line/30 hover:bg-surface-2"
		}`;
	}

	async function updateSettings() {
		const formData = new FormData();
		formData.append("theme", settings.theme);
		formData.append("loadImages", settings.loadImages.toString());

		await fetch("?/updateSettings", {
			method: "POST",
			body: formData
		});
	}

	function setTheme(theme: "dark" | "light") {
		if (settings.theme === theme) return;
		// Updates the <html data-theme> attribute immediately via the root layout;
		// persistence happens both client-side (cookie/storage) and on the server.
		settings.setTheme(theme);
		updateSettings();
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
	<PageHeader title="Settings" subtitle="Manage your account and preferences" icon={FluentSettings20Filled} />

	<div class="space-y-5">
		<!-- Account / switch account -->
		<section class="panel rounded-sm p-5 sm:p-6" aria-labelledby="account-heading">
			<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex min-w-0 items-center gap-4">
					<div
						class="grid size-14 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/12 font-serif text-xl font-bold text-primary-fg"
						aria-hidden="true"
					>
						{initials}
					</div>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h2 id="account-heading" class="truncate text-lg font-semibold text-fg">{displayName}</h2>
							<Badge tone="green">Signed in</Badge>
						</div>

						<button
							type="button"
							class="group mt-1.5 inline-flex max-w-full items-center gap-2 rounded-sm px-1.5 py-1 -ml-1.5 text-left transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
							aria-label={emailRevealed ? "Hide email address" : "Reveal email address"}
							aria-pressed={emailRevealed}
							title={emailRevealed ? "Tap to hide email" : "Tap to reveal email"}
							onclick={() => (emailRevealed = !emailRevealed)}
						>
							<FluentMail20Filled class="size-4 shrink-0 text-fg-muted" />
							<span aria-hidden={!emailRevealed} class={emailClass}>
								{data.profile.email}
							</span>
							{#if emailRevealed}
								<FluentEye20Filled class="size-4 shrink-0 text-primary-fg" />
							{:else}
								<FluentEyeOff20Filled class="size-4 shrink-0 text-fg-muted group-hover:text-fg-soft" />
							{/if}
						</button>
					</div>
				</div>

				<form method="POST" action="?/logout" use:enhance class="shrink-0">
					<Button type="submit" variant="secondary" icon={FluentArrowExit20Filled} class="justify-start">
						Switch account
					</Button>
				</form>
			</div>
			<p class="mt-4 border-t border-line/10 pt-3 text-xs text-fg-muted">
				Switching accounts signs you out so you can sign in with a different one.
			</p>
		</section>

		<!-- Connected accounts -->
		<section class="panel rounded-sm p-5 sm:p-6 space-y-4" aria-labelledby="telegram-heading">
			<div class="flex items-center gap-2">
				<svg class="size-5 text-friendly" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
					/>
				</svg>
				<h2 id="telegram-heading" class="section-title">Connected Accounts</h2>
			</div>

			{#if data.profile.telegramUsername}
				<div class="panel-muted rounded-sm p-4 flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="text-xs text-fg-muted">Telegram</p>
						<p class="font-semibold text-fg mt-0.5">@{data.profile.telegramUsername}</p>
					</div>
					<div class="flex items-center gap-3">
						<Badge tone="blue">Connected</Badge>
						<form method="POST" action="?/disconnectTelegram" use:enhance>
							<Button type="submit" variant="soft-red" size="sm">Disconnect</Button>
						</form>
					</div>
				</div>
			{:else}
				<p class="text-sm text-fg-muted">Connect Telegram to receive notifications and use Telegram-based features.</p>
				<TelegramLoginWidget next="/settings" label="Connect Telegram Account" />
			{/if}
		</section>

		<!-- Appearance -->
		<section class="panel rounded-sm p-5 sm:p-6 space-y-5" aria-labelledby="appearance-heading">
			<div class="flex items-center gap-2">
				<FluentPaint20Filled class="size-5 text-politics" />
				<h2 id="appearance-heading" class="section-title">Appearance</h2>
			</div>

			<div>
				<p class="field-label">Theme</p>
				<div class="grid grid-cols-2 gap-3" role="group" aria-label="Colour theme">
					<button
						type="button"
						aria-pressed={settings.theme === "dark"}
						onclick={() => setTheme("dark")}
						class={themeButtonClass("dark")}
					>
						<FluentWeatherMoon20Filled class="size-6" />
						<span class="flex items-center gap-1.5">
							Dark
							{#if settings.theme === "dark"}
								<FluentCheckmarkCircle20Filled class="size-4" />
							{/if}
						</span>
					</button>
					<button
						type="button"
						aria-pressed={settings.theme === "light"}
						onclick={() => setTheme("light")}
						class={themeButtonClass("light")}
					>
						<FluentWeatherSunny20Filled class="size-6" />
						<span class="flex items-center gap-1.5">
							Light
							{#if settings.theme === "light"}
								<FluentCheckmarkCircle20Filled class="size-4" />
							{/if}
						</span>
					</button>
				</div>
				<p class="field-hint">Applies instantly and is saved to your account.</p>
			</div>

			<div class="border-t border-line/10 pt-4">
				<label class="flex cursor-pointer items-center justify-between gap-4 group">
					<span class="flex items-center gap-3">
						<FluentDataUsage20Filled class="size-5 text-politics" />
						<span>
							<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
								Load Images
							</span>
							<span class="block text-xs text-fg-muted">Disable to save data and improve performance</span>
						</span>
					</span>
					<input
						type="checkbox"
						checked={settings.loadImages}
						onchange={toggleLoadImages}
						class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
					/>
				</label>
			</div>
		</section>

		<!-- Notifications -->
		<section class="panel rounded-sm p-5 sm:p-6 space-y-1" aria-labelledby="notifications-heading">
			<div class="flex items-center gap-2">
				<FluentAlert20Filled class="size-5 text-friendly" />
				<h2 id="notifications-heading" class="section-title">Notifications</h2>
			</div>
			<p class="field-hint mb-3">Choose which events send you push notifications</p>

			<div class="border-b border-line/10">
				<PushNotificationManager />
			</div>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">💬</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Direct Messages
						</span>
						<span class="block text-xs text-fg-muted">When someone sends you a private message</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyDirectMessages}
					onchange={() => toggleNotification("notifyDirectMessages", notifyDirectMessages)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">📰</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Newspaper Posts
						</span>
						<span class="block text-xs text-fg-muted">When a subscribed newspaper publishes an article</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyNewspaperPosts}
					onchange={() => toggleNotification("notifyNewspaperPosts", notifyNewspaperPosts)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">⚔️</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							War Declarations
						</span>
						<span class="block text-xs text-fg-muted">When war is declared on or by your state</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyWarDeclarations}
					onchange={() => toggleNotification("notifyWarDeclarations", notifyWarDeclarations)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">🏁</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Battle Results
						</span>
						<span class="block text-xs text-fg-muted">When a battle involving your state ends</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyBattleResults}
					onchange={() => toggleNotification("notifyBattleResults", notifyBattleResults)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">🗳️</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">Elections</span>
						<span class="block text-xs text-fg-muted">When an election starts or results are announced</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyElections}
					onchange={() => toggleNotification("notifyElections", notifyElections)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">📜</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							New Proposals
						</span>
						<span class="block text-xs text-fg-muted">When a new parliamentary proposal needs your vote</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyNewProposals}
					onchange={() => toggleNotification("notifyNewProposals", notifyNewProposals)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">✈️</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Travel Arrived
						</span>
						<span class="block text-xs text-fg-muted">When you arrive at your travel destination</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyTravelComplete}
					onchange={() => toggleNotification("notifyTravelComplete", notifyTravelComplete)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5 border-b border-line/10">
				<span class="flex items-center gap-3">
					<span class="text-lg">🏭</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Shift Complete
						</span>
						<span class="block text-xs text-fg-muted">When your factory shift is done and wages are ready</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyShiftComplete}
					onchange={() => toggleNotification("notifyShiftComplete", notifyShiftComplete)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>

			<label class="flex items-center justify-between gap-4 cursor-pointer group py-2.5">
				<span class="flex items-center gap-3">
					<span class="text-lg">💰</span>
					<span>
						<span class="block text-sm font-medium text-fg-soft group-hover:text-fg transition-colors">
							Market Sales
						</span>
						<span class="block text-xs text-fg-muted">When someone buys from your market listing</span>
					</span>
				</span>
				<input
					type="checkbox"
					bind:checked={notifyMarketSales}
					onchange={() => toggleNotification("notifyMarketSales", notifyMarketSales)}
					class="toggle border-line/25 bg-surface-0 text-fg-muted checked:border-primary/60 checked:bg-primary/20 checked:text-primary-fg"
				/>
			</label>
		</section>

		<!-- Shortcuts -->
		<section class="panel rounded-sm divide-y divide-line/10" aria-label="More settings">
			<a
				href="/premium"
				class="group press-spring rounded-sm border border-transparent p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-line/20 hover:bg-surface-3"
			>
				<span class="flex items-center gap-3">
					<span class="grid size-9 shrink-0 place-items-center rounded-sm border border-primary/35 bg-primary/12">
						<FluentStar20Filled class="size-5 text-primary-fg" />
					</span>
					<span>
						<span class="block text-sm font-medium text-fg group-hover:text-primary-hover transition-colors">
							Premium Membership
						</span>
						<span class="block text-xs text-fg-muted">Automate production, training & factory work</span>
					</span>
				</span>
				<FluentChevronRight20Filled
					class="size-5 shrink-0 text-fg-muted group-hover:text-primary-hover transition-colors"
				/>
			</a>

			<a
				href="/giftcode"
				class="group press-spring rounded-sm border border-transparent p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-line/20 hover:bg-surface-3"
			>
				<span class="flex items-center gap-3">
					<span class="grid size-9 shrink-0 place-items-center rounded-sm border border-politics/30 bg-politics-bg/15">
						<FluentGift20Filled class="size-5 text-politics" />
					</span>
					<span>
						<span class="block text-sm font-medium text-fg group-hover:text-primary-hover transition-colors">
							Gift Codes
						</span>
						<span class="block text-xs text-fg-muted">Redeem codes for exclusive rewards and bonuses</span>
					</span>
				</span>
				<FluentChevronRight20Filled
					class="size-5 shrink-0 text-fg-muted group-hover:text-primary-hover transition-colors"
				/>
			</a>

			<a
				href="/about"
				class="group press-spring rounded-sm border border-transparent p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-line/20 hover:bg-surface-3"
			>
				<span class="flex items-center gap-3">
					<span class="grid size-9 shrink-0 place-items-center rounded-sm border border-friendly/30 bg-friendly-bg/18">
						<FluentInfo20Filled class="size-5 text-friendly" />
					</span>
					<span>
						<span class="block text-sm font-medium text-fg group-hover:text-primary-hover transition-colors">
							About This Application
						</span>
						<span class="block text-xs text-fg-muted">Learn more about features, version, and terms</span>
					</span>
				</span>
				<FluentChevronRight20Filled
					class="size-5 shrink-0 text-fg-muted group-hover:text-primary-hover transition-colors"
				/>
			</a>
		</section>

		<!-- Danger zone -->
		<section
			class="rounded-sm border border-red-500/30 bg-red-600/10 p-5 sm:p-6 space-y-3"
			aria-labelledby="danger-heading"
		>
			<h2 id="danger-heading" class="section-title">
				<FluentDelete20Filled class="size-5 text-red-400" />
				<span class="text-red-300">Danger Zone</span>
			</h2>
			<p class="text-sm text-fg-muted">
				Permanently delete your account and all associated data. This action cannot be undone.
			</p>
			<Button
				type="button"
				variant="soft-red"
				icon={FluentDelete20Filled}
				class="justify-start"
				onclick={() => {
					showDeleteModal = true;
					deleteConfirmation = "";
				}}
			>
				Delete Account
			</Button>
		</section>
	</div>
</PageContainer>

<!-- Delete Account Confirmation Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-surface-1/80 backdrop-blur-sm"
			onclick={() => {
				showDeleteModal = false;
			}}
			tabindex="-1"
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div class="relative bg-surface-6 rounded-sm border border-red-500/30 p-6 max-w-md w-full space-y-4 shadow-2xl">
			<div class="flex items-center gap-3">
				<div class="bg-red-600/10 border border-red-500/30 p-2.5 rounded-sm">
					<FluentDelete20Filled class="size-6 text-red-400" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-fg">Delete Account</h3>
					<p class="text-sm text-fg-muted">This action is irreversible</p>
				</div>
			</div>

			<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-3 space-y-2">
				<p class="text-sm text-red-300 font-medium">The following will be permanently deleted:</p>
				<ul class="text-sm text-fg-muted space-y-1 list-disc list-inside">
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
