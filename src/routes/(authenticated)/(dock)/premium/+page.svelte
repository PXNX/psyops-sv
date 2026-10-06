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
	<div class="rounded-sm p-5 space-y-4 {data.status.active ? 'border border-[#f2b01e]/35 bg-[#f2b01e]/12' : 'panel'}">
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Membership status</p>
				{#if data.status.active}
					<p class="text-lg font-bold text-[#ffd35c]">Active</p>
					<p class="text-xs text-[#a8a083]">Expires {formatDate(data.status.premiumUntil)}</p>
				{:else}
					<p class="text-lg font-bold text-[#d3caa9]">Inactive</p>
				{/if}
			</div>
			<div
				class="size-12 rounded-sm flex items-center justify-center {data.status.active
					? 'bg-[#f2b01e] border border-[#ffcf47]'
					: 'bg-[#1a1f15] border border-[#c8b47a]/15'}"
			>
				<FluentStar20Filled class="size-6 {data.status.active ? 'text-[#1b1708]' : 'text-[#a8a083]'}" />
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
						<p class="text-sm font-medium text-[#e6ddbf]">Automation</p>
						<p class="text-xs text-[#a8a083]">Automatically run production, training and factory shifts</p>
					</div>
					<input
						type="checkbox"
						class="toggle border-[#c8b47a]/25 checked:border-[#f2b01e]/60 checked:bg-[#f2b01e] checked:text-[#1b1708]"
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
			<div class="flex items-center gap-3 text-sm text-[#d3caa9]">
				<FluentCheckmarkCircle20Filled class="size-5 text-[#6fd14a] shrink-0" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>

	<!-- Get premium via Telegram -->
	<div class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			<FluentBot20Filled class="size-5 text-[#5eaef5]" />
			Get premium via Telegram
		</h2>
		<p class="text-xs text-[#ffd35c]/80">Payments are mocked for now — premium via the bot is free.</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.plans as plan}
				<div class="panel-muted rounded-sm p-3">
					<p class="font-semibold text-[#f5efd8]">{plan.label}</p>
					<p class="text-xs text-[#a8a083]">
						{plan.days} days — send
						<code class="px-1 rounded-sm bg-[#242a1d] text-[#d3caa9] font-mono">/premium {plan.id}</code>
					</p>
				</div>
			{/each}
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-[#a8a083]">
				Connect your Telegram account in <a
					href="/settings"
					class="text-[#ffd35c] underline hover:text-[#ffcf47] transition-colors">Settings</a
				> first, then request premium directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-[#a8a083]">
				Open the bot and send <code class="px-1.5 py-0.5 rounded-sm bg-[#1a1f15] text-[#d3caa9] font-mono"
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

	<p class="text-center text-xs text-[#a8a083]">
		Want to gift premium to someone? Open their profile and use the "Gift Premium" action.
	</p>
</PageContainer>
