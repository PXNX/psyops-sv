<!-- src/routes/(authenticated)/(dock)/giftcode/+page.svelte -->
<script lang="ts">
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentBox20Filled from "~icons/fluent/box-20-filled";
	import FluentEmojiPickaxe from "~icons/fluent-emoji/pick";
	import FluentEmojiGem from "~icons/fluent-emoji/gem-stone";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import FluentEmojiCollision from "~icons/fluent-emoji/collision";
	import FluentEmojiWood from "~icons/fluent-emoji/wood";
	import FluentEmojiRock from "~icons/fluent-emoji/rock";
	import FluentEmojiPackage from "~icons/fluent-emoji/package";
	import { formatDateTime } from "$lib/utils/formatting.js";
	import { enhance } from "$app/forms";

	let { data, form } = $props();

	let giftCode = $state("");
	let submitting = $state(false);

	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "🔩",
		gunpowder: "💥",
		wood: "🪵",
		coal: "⚫",
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥",
		currency: "💰"
	};

	const resourceIconComponents: Record<string, any> = {
		iron: FluentEmojiPickaxe,
		copper: FluentEmojiGem,
		steel: FluentEmojiGear,
		gunpowder: FluentEmojiCollision,
		wood: FluentEmojiWood,
		coal: FluentEmojiRock,
		currency: FluentMoney20Filled
	};

	function formatDate(date: Date | string) {
		return formatDateTime(String(date));
	}

	function formatNumber(num: number) {
		return new Intl.NumberFormat().format(num);
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<div
			class="size-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto"
		>
			<FluentGift20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Gift Codes</h1>
		<p class="text-gray-400">Redeem codes for exclusive rewards</p>
	</div>

	<!-- Redeem Section -->
	<form
		method="POST"
		action="?/redeem"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
				giftCode = "";
			};
		}}
		class="bg-slate-800/50 rounded-xl border border-white/5 p-6 space-y-4"
	>
		<div class="flex items-center gap-2 mb-4">
			<FluentGift20Filled class="size-6 text-purple-400" />
			<h2 class="text-xl font-semibold text-white">Redeem Gift Code</h2>
		</div>

		{#if form?.success}
			<div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentCheckmark20Filled class="size-5 text-green-300 flex-shrink-0" />
					<p class="text-green-300 font-medium">Gift code redeemed successfully!</p>
				</div>
				{#if form.rewards && (form.rewards.currency > 0 || form.rewards.resources.length > 0)}
					<div class="space-y-2">
						<h4 class="text-xs font-medium text-slate-400 uppercase tracking-wide">Rewards Received</h4>
						<div class="bg-slate-900/30 rounded-lg p-2.5 space-y-1.5 border border-slate-700/30">
							{#if form.rewards.currency > 0}
								<div class="flex justify-between text-xs items-center">
									<span class="text-slate-400 flex items-center gap-1.5">
										<FluentMoney20Filled class="size-3.5 text-emerald-400" />
										<span class="capitalize">currency</span>
									</span>
									<span class="font-mono text-xs text-emerald-400">
										+{formatNumber(form.rewards.currency)}
										<span class="text-emerald-400 ml-1">✓</span>
									</span>
								</div>
							{/if}
							{#each form.rewards.resources as resource}
								{@const IconComponent = resourceIconComponents[resource.type] || FluentEmojiPackage}
								<div class="flex justify-between text-xs items-center">
									<span class="text-slate-400 flex items-center gap-1.5">
										<IconComponent class="size-3.5" />
										<span class="capitalize">{resource.type}</span>
									</span>
									<span class="font-mono text-xs text-emerald-400">
										+{formatNumber(resource.quantity)}
										<span class="text-emerald-400 ml-1">✓</span>
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
				<div class="flex items-start gap-3">
					<FluentDismiss20Filled class="size-5 text-red-300 mt-0.5 flex-shrink-0" />
					<p class="text-red-300 text-sm">{form.error}</p>
				</div>
			</div>
		{/if}

		<div class="flex gap-3">
			<input
				type="text"
				name="code"
				bind:value={giftCode}
				placeholder="Enter gift code"
				disabled={submitting}
				class="input flex-1 bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 uppercase"
				class:input-error={form?.error}
			/>
			<button
				type="submit"
				disabled={submitting || !giftCode.trim()}
				class="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 text-white gap-2 min-w-[120px]"
			>
				{#if submitting}
					<span class="loading loading-spinner loading-sm"></span>
					Redeeming...
				{:else}
					<FluentGift20Filled class="size-5" />
					Redeem
				{/if}
			</button>
		</div>

		<p class="text-xs text-gray-400">💡 Gift codes are case-insensitive and can only be claimed once per account</p>
	</form>

		<!-- Redemption History -->
		{#if data.redemptions && data.redemptions.length > 0}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 space-y-4">
				<div class="flex items-center gap-2 mb-4">
					<FluentClock20Filled class="size-6 text-purple-400" />
					<h2 class="text-xl font-semibold text-white">Redemption History</h2>
				</div>

				<div class="space-y-4">
					{#each data.redemptions as redemption}
						<div class="bg-slate-700/30 rounded-lg border border-slate-600/20 overflow-hidden">
							<!-- Header -->
							<div class="bg-slate-700/50 px-4 py-3 border-b border-slate-600/20">
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<code class="text-purple-300 font-mono font-semibold">
												{redemption.code}
											</code>
											<span class="badge badge-sm bg-green-600/20 text-green-300 border-green-500/30">Redeemed</span>
										</div>
										{#if redemption.description}
											<p class="text-xs text-gray-400 mt-1">{redemption.description}</p>
										{/if}
									</div>
									<div class="text-right">
										<p class="text-xs text-gray-400">{formatDate(redemption.redeemedAt)}</p>
									</div>
								</div>
							</div>

							<!-- Rewards Grid -->
							<div class="p-4">
								<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									{#if redemption.currencyReceived > 0}
										<div class="bg-yellow-600/10 border border-yellow-500/20 rounded-lg p-3 text-center">
											<p class="text-xs text-yellow-400 font-medium mb-1">Currency</p>
											<p class="text-lg font-bold text-yellow-300">{formatNumber(redemption.currencyReceived)}</p>
										</div>
									{/if}

									{#each redemption.resources as resource}
										<div class="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 text-center">
											<p class="text-xs text-blue-400 font-medium mb-1 capitalize">{resource.type}</p>
											<p class="text-lg font-bold text-blue-300">{formatNumber(resource.quantity)}</p>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	<!-- Active Gift Codes (Optional - for admins or public codes) -->
	{#if data.publicCodes && data.publicCodes.length > 0}
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 space-y-4">
			<div class="flex items-center gap-2">
				<FluentGift20Filled class="size-6 text-pink-400" />
				<h2 class="text-xl font-semibold text-white">Available Codes</h2>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.publicCodes as code}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/20">
						<div class="flex items-start justify-between mb-2">
							<div class="flex-1">
								<code class="text-purple-300 font-mono font-semibold">
									{code.code}
								</code>
								{#if code.description}
									<p class="text-xs text-gray-400 mt-1">{code.description}</p>
								{/if}
							</div>
						</div>

						<div class="flex flex-wrap gap-2 mb-3">
							{#if code.currencyAmount > 0}
								<span class="badge badge-sm bg-yellow-600/10 text-yellow-300 border-yellow-500/20">
									💰 {formatNumber(code.currencyAmount)}
								</span>
							{/if}

							{#each code.resources as resource}
								<span class="badge badge-sm bg-blue-600/10 text-blue-300 border-blue-500/20">
									{resourceIcons[resource.type] || "📦"}
									{formatNumber(resource.quantity)}
									{resource.type}
								</span>
							{/each}
						</div>

						<div class="flex items-center justify-between text-xs">
							{#if code.expiresAt}
								<span class="text-gray-400">
									Expires: {formatDate(code.expiresAt)}
								</span>
							{:else}
								<span class="text-gray-400">No expiration</span>
							{/if}

							{#if code.maxRedemptions}
								<span class="text-gray-400">
									{code.currentRedemptions}/{code.maxRedemptions} used
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Info Box -->
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<p class="text-sm text-blue-300">
			💡 <strong>Tip:</strong> Gift codes are distributed through special events, promotions, and community activities. Follow
			our social channels to stay updated on new codes!
		</p>
	</div>
</div>
