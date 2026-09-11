<!-- src/routes/(authenticated)/(dock)/premium/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentBot20Filled from "~icons/fluent/bot-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import { buttonClass } from "$lib/component/ui/styles";

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
			class="size-20 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
		>
			<FluentStar20Filled class="size-10 text-[#172a45]" />
		</div>
		<h1 class="text-3xl font-bold text-[#fff7e8]">Premium Membership</h1>
		<p class="text-[#a89e8e]">Automate production, military training and factory work</p>
	</div>

	<!-- Status -->
	<div
		class="rounded-xl border p-5 space-y-4 {data.status.active
			? 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/10'
			: 'border-[#dfceb0]/15 panel'}"
	>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-sm text-[#a89e8e]">Membership status</p>
				{#if data.status.active}
					<p class="text-lg font-bold text-amber-300">Active</p>
					<p class="text-xs text-[#a89e8e]">Expires {formatDate(data.status.premiumUntil)}</p>
				{:else}
					<p class="text-lg font-bold text-[#d9ccb7]">Inactive</p>
				{/if}
			</div>
			<div
				class="size-12 rounded-xl flex items-center justify-center {data.status.active
					? 'bg-gradient-to-br from-amber-500 to-yellow-500'
					: 'bg-[#14283f]'}"
			>
				<FluentStar20Filled class="size-6 {data.status.active ? 'text-[#172a45]' : 'text-[#fff7e8]'}" />
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
						<p class="text-sm font-medium text-[#e5d8c1]">Automation</p>
						<p class="text-xs text-[#a89e8e]">Automatically run production, training and factory shifts</p>
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
	<div class="panel rounded-xl p-5 space-y-2">
		<h2 class="text-lg font-semibold text-[#fff7e8] mb-2">What automation does for you</h2>
		{#each ["Collects factory wages and starts new shifts", "Collects finished production and starts new affordable batches", "Completes finished military training and trains new affordable units"] as feature}
			<div class="flex items-center gap-3 text-sm text-[#d9ccb7]">
				<FluentCheckmarkCircle20Filled class="size-5 text-emerald-400 shrink-0" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>

	<!-- Get premium via Telegram -->
	<div class="panel rounded-xl p-5 space-y-3">
		<div class="flex items-center gap-2">
			<FluentBot20Filled class="size-5 text-[#7ba0c8]" />
			<h2 class="text-lg font-semibold text-[#fff7e8]">Get premium via Telegram</h2>
		</div>
		<p class="text-xs text-amber-300/80">Payments are mocked for now — premium via the bot is free.</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.plans as plan}
				<div class="panel-muted rounded-lg p-3">
					<p class="font-semibold text-[#fff7e8]">{plan.label}</p>
					<p class="text-xs text-[#a89e8e]">
						{plan.days} days — send <code class="px-1 rounded bg-[#14283f] text-[#d9ccb7]">/premium {plan.id}</code>
					</p>
				</div>
			{/each}
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-[#a89e8e]">
				Connect your Telegram account in <a href="/settings" class="text-[#7ba0c8] underline">Settings</a> first, then request
				premium directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-[#a89e8e]">
				Open the bot and send <code class="px-1.5 py-0.5 rounded bg-[#102239] text-[#d9ccb7]">/premium</code> to activate premium
				for free.
			</p>
		{/if}
		{#if data.botUsername}
			<a
				href={`https://t.me/${data.botUsername}?start=premium`}
				target="_blank"
				rel="noopener noreferrer"
				class={buttonClass({ variant: "soft-blue", size: "sm", block: true })}
			>
				<FluentBot20Filled class="size-4" />
				Open Telegram Bot
			</a>
		{/if}
	</div>

	<p class="text-center text-xs text-[#a89e8e]">
		Want to gift premium to someone? Open their profile and use the "Gift Premium" action.
	</p>
</div>
