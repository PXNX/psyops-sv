<!-- src/routes/(authenticated)/(dock)/premium/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentStar20Filled from "~icons/fluent/star-20-filled";
	import FluentBot20Filled from "~icons/fluent/bot-20-filled";
	import FluentCheckmarkCircle20Filled from "~icons/fluent/checkmark-circle-20-filled";
	import { Button } from "#lib/component/ui/index.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

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

<PageContainer maxWidth="3xl">
	<!-- Header -->
	<PageHeader
		title="Premium Membership"
		subtitle="Automate production, military training and factory work"
		icon={FluentStar20Filled}
	/>

	<!-- Status -->
	<div class="rounded-sm p-5 space-y-4 {data.status.active ? 'border border-[#e6a527]/35 bg-[#e6a527]/12' : 'panel'}">
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Membership status</p>
				{#if data.status.active}
					<p class="text-lg font-bold text-[#f7c56b]">Active</p>
					<p class="text-xs text-[#a89e8e]">Expires {formatDate(data.status.premiumUntil)}</p>
				{:else}
					<p class="text-lg font-bold text-[#d9ccb7]">Inactive</p>
				{/if}
			</div>
			<div
				class="size-12 rounded-sm flex items-center justify-center {data.status.active
					? 'bg-[#e6a527] border border-[#f2c463]'
					: 'bg-[#102239] border border-[#dfceb0]/15'}"
			>
				<FluentStar20Filled class="size-6 {data.status.active ? 'text-[#172a45]' : 'text-[#a89e8e]'}" />
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
						class="toggle border-[#dfceb0]/25 checked:border-[#e6a527]/60 checked:bg-[#e6a527] checked:text-[#172a45]"
						bind:checked={automation}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
				</label>
			</form>
		{/if}
	</div>

	<!-- What you get -->
	<div class="panel rounded-sm p-5 space-y-2">
		<h2 class="section-title mb-2">What automation does for you</h2>
		{#each ["Collects factory wages and starts new shifts", "Collects finished production and starts new affordable batches", "Completes finished military training and trains new affordable units"] as feature}
			<div class="flex items-center gap-3 text-sm text-[#d9ccb7]">
				<FluentCheckmarkCircle20Filled class="size-5 text-[#8fae88] shrink-0" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>

	<!-- Get premium via Telegram -->
	<div class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			<FluentBot20Filled class="size-5 text-[#7ba0c8]" />
			Get premium via Telegram
		</h2>
		<p class="text-xs text-[#f7c56b]/80">Payments are mocked for now — premium via the bot is free.</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.plans as plan}
				<div class="panel-muted rounded-sm p-3">
					<p class="font-semibold text-[#fff7e8]">{plan.label}</p>
					<p class="text-xs text-[#a89e8e]">
						{plan.days} days — send
						<code class="px-1 rounded-sm bg-[#14283f] text-[#d9ccb7] font-mono">/premium {plan.id}</code>
					</p>
				</div>
			{/each}
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-[#a89e8e]">
				Connect your Telegram account in <a
					href="/settings"
					class="text-[#f7c56b] underline hover:text-[#f2c463] transition-colors">Settings</a
				> first, then request premium directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-[#a89e8e]">
				Open the bot and send <code class="px-1.5 py-0.5 rounded-sm bg-[#102239] text-[#d9ccb7] font-mono"
					>/premium</code
				> to activate premium for free.
			</p>
		{/if}
		{#if data.botUsername}
			<Button
				href={`https://t.me/${data.botUsername}?start=premium`}
				target="_blank"
				rel="noopener noreferrer"
				variant="primary"
				size="sm"
				block
				icon={FluentBot20Filled}
			>
				Open Telegram Bot
			</Button>
		{/if}
	</div>

	<p class="text-center text-xs text-[#a89e8e]">
		Want to gift premium to someone? Open their profile and use the "Gift Premium" action.
	</p>
</PageContainer>
