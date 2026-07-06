<!-- src/routes/(authenticated)/(dock)/premium/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentBot20Filled from "~icons/fluent/bot-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";

	let { data, form } = $props();

	let giftPlanId = $state(data.plans[1]?.id ?? data.plans[0]?.id);
	let recipientId = $state("");
	let automation = $state(data.status.automation);

	function formatDate(value: string | Date | null): string {
		if (!value) return "";
		return new Date(value).toLocaleString();
	}
</script>

<svelte:head>
	<title>Premium Membership</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-2">
		<div
			class="size-20 bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
		>
			<FluentStar20Filled class="size-10 text-white" />
		</div>
		<h1 class="text-3xl font-bold text-white">Premium Membership</h1>
		<p class="text-gray-400">Automate production, military training and factory work</p>
	</div>

	{#if form?.error}
		<div class="alert bg-red-600/10 border-red-500/20 text-red-300">
			<span>{form.error}</span>
		</div>
	{:else if form?.success && form?.message}
		<div class="alert bg-emerald-600/10 border-emerald-500/20 text-emerald-300">
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Status -->
	<div
		class="rounded-xl border p-5 space-y-4 {data.status.active
			? 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-purple-600/10'
			: 'border-white/5 bg-slate-800/50'}"
	>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-sm text-gray-400">Membership status</p>
				{#if data.status.active}
					<p class="text-lg font-bold text-amber-300">Active</p>
					<p class="text-xs text-gray-400">Renews / expires {formatDate(data.status.premiumUntil)}</p>
				{:else}
					<p class="text-lg font-bold text-gray-300">Inactive</p>
				{/if}
			</div>
			<div
				class="size-12 rounded-xl flex items-center justify-center {data.status.active
					? 'bg-gradient-to-br from-amber-400 to-purple-600'
					: 'bg-slate-700'}"
			>
				<FluentStar20Filled class="size-6 text-white" />
			</div>
		</div>

		{#if data.status.active}
			<form
				method="POST"
				action="?/toggleAutomation"
				use:enhance={() => {
					return async ({ update }) => await update({ reset: false });
				}}
			>
				<input type="hidden" name="enabled" value={(!automation).toString()} />
				<label class="flex items-center justify-between cursor-pointer group">
					<div>
						<p class="text-sm font-medium text-gray-300">Automation</p>
						<p class="text-xs text-gray-500">Automatically run production, training and factory shifts</p>
					</div>
					<input
						type="checkbox"
						class="toggle toggle-warning"
						bind:checked={automation}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
				</label>
			</form>
		{/if}
	</div>

	<!-- What you get -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-2">
		<h2 class="text-lg font-semibold text-white mb-2">What automation does for you</h2>
		{#each ["Collects factory wages and starts new shifts", "Collects finished production and starts new affordable batches", "Completes finished military training and trains new affordable units"] as feature}
			<div class="flex items-center gap-3 text-sm text-gray-300">
				<FluentCheckmarkCircle20Filled class="size-5 text-emerald-400 shrink-0" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>

	<!-- Buy with currency -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-white">Buy with currency</h2>
			<span class="text-sm text-gray-400">Balance: {data.balance.toLocaleString()}</span>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			{#each data.plans as plan}
				<div class="bg-slate-900/50 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
					<div>
						<p class="font-semibold text-white">{plan.label}</p>
						<p class="text-xs text-gray-400">{plan.days} days</p>
					</div>
					<p class="text-lg font-bold text-amber-300">{plan.currencyPrice.toLocaleString()}</p>
					<form method="POST" action="?/buy" use:enhance>
						<input type="hidden" name="planId" value={plan.id} />
						<button
							type="submit"
							disabled={data.balance < plan.currencyPrice}
							class="btn btn-sm w-full bg-gradient-to-r from-amber-500 to-purple-600 border-none text-white disabled:opacity-40"
						>
							Buy
						</button>
					</form>
				</div>
			{/each}
		</div>
	</div>

	<!-- Gift premium -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
		<div class="flex items-center gap-2">
			<FluentGift20Filled class="size-5 text-pink-400" />
			<h2 class="text-lg font-semibold text-white">Gift premium to a user</h2>
		</div>
		<p class="text-sm text-gray-400">Pay with your currency to give another player a premium membership.</p>
		<form method="POST" action="?/gift" use:enhance class="space-y-3">
			<div>
				<label for="recipientId" class="block text-sm font-medium text-gray-300 mb-1">Recipient user ID</label>
				<input
					id="recipientId"
					name="recipientId"
					type="text"
					bind:value={recipientId}
					placeholder="Enter the recipient's user ID"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
				/>
			</div>
			<div>
				<label for="giftPlan" class="block text-sm font-medium text-gray-300 mb-1">Plan</label>
				<select
					id="giftPlan"
					name="planId"
					bind:value={giftPlanId}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white"
				>
					{#each data.plans as plan}
						<option value={plan.id}>{plan.label} — {plan.currencyPrice.toLocaleString()} ({plan.days} days)</option>
					{/each}
				</select>
			</div>
			<button
				type="submit"
				disabled={!recipientId}
				class="btn btn-sm w-full bg-pink-600 hover:bg-pink-700 border-none text-white gap-2 disabled:opacity-40"
			>
				<FluentGift20Filled class="size-4" />
				Gift Premium
			</button>
		</form>
	</div>

	<!-- Buy via Telegram -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentBot20Filled class="size-5 text-blue-400" />
			<h2 class="text-lg font-semibold text-white">Buy via Telegram (Stars)</h2>
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-gray-400">
				Connect your Telegram account in <a href="/settings" class="text-blue-400 underline">Settings</a> first, then pay
				with Telegram Stars directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-gray-400">
				Open the bot and send <code class="px-1.5 py-0.5 rounded bg-slate-900 text-gray-300">/premium</code> to pay with Telegram
				Stars ⭐️.
			</p>
		{/if}
		{#if data.botUsername}
			<a
				href={`https://t.me/${data.botUsername}?start=premium`}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-sm w-full bg-blue-600 hover:bg-blue-700 border-none text-white gap-2"
			>
				<FluentBot20Filled class="size-4" />
				Open Telegram Bot
			</a>
		{/if}
	</div>
</div>
