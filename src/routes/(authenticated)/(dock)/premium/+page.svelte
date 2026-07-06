<!-- src/routes/(authenticated)/(dock)/premium/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentBot20Filled from "~icons/fluent/bot-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";

	let { data } = $props();

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
					<p class="text-xs text-gray-400">Expires {formatDate(data.status.premiumUntil)}</p>
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

	<!-- Get premium via Telegram -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentBot20Filled class="size-5 text-blue-400" />
			<h2 class="text-lg font-semibold text-white">Get premium via Telegram</h2>
		</div>
		<p class="text-xs text-amber-300/80">Payments are disabled for now — premium via the bot is free.</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.plans as plan}
				<div class="bg-slate-900/50 rounded-lg border border-white/5 p-3">
					<p class="font-semibold text-white">{plan.label}</p>
					<p class="text-xs text-gray-400">
						{plan.days} days — send <code class="px-1 rounded bg-slate-800 text-gray-300">/premium {plan.id}</code>
					</p>
				</div>
			{/each}
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-gray-400">
				Connect your Telegram account in <a href="/settings" class="text-blue-400 underline">Settings</a> first, then request
				premium directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-gray-400">
				Open the bot and send <code class="px-1.5 py-0.5 rounded bg-slate-900 text-gray-300">/premium</code> to activate premium
				for free.
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

	<p class="text-center text-xs text-gray-500">
		Want to gift premium to someone? Open their profile and use the “Gift Premium” action.
	</p>
</div>
