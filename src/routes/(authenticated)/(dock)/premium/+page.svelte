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
		documentTitle={false}
		title="Premium Membership"
		subtitle="Automate production, military training and factory work"
		icon={FluentStar20Filled}
	/>

	<!-- Status -->
	<div class="rounded-sm p-5 space-y-4 {data.status.active ? 'border border-accent/35 bg-accent/12' : 'panel'}">
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Membership status</p>
				{#if data.status.active}
					<p class="text-lg font-bold text-accent-fg">Active</p>
					<p class="text-xs text-fg-muted">Expires {formatDate(data.status.premiumUntil)}</p>
				{:else}
					<p class="text-lg font-bold text-fg-soft">Inactive</p>
				{/if}
			</div>
			<div
				class="size-12 rounded-sm flex items-center justify-center {data.status.active
					? 'bg-accent border border-accent-hover'
					: 'bg-surface-4 border border-line/15'}"
			>
				<FluentStar20Filled class="size-6 {data.status.active ? 'text-[#ffffff]' : 'text-fg-muted'}" />
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
						<p class="text-sm font-medium text-fg-body">Automation</p>
						<p class="text-xs text-fg-muted">Automatically run production, training and factory shifts</p>
					</div>
					<input
						type="checkbox"
						class="toggle border-line/25 checked:border-accent/60 checked:bg-accent checked:text-[#ffffff]"
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
			<div class="flex items-center gap-3 text-sm text-fg-soft">
				<FluentCheckmarkCircle20Filled class="size-5 text-positive shrink-0" />
				<span>{feature}</span>
			</div>
		{/each}
	</div>

	<!-- Get premium via Telegram -->
	<div class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			<FluentBot20Filled class="size-5 text-friendly" />
			Get premium via Telegram
		</h2>
		<p class="text-xs text-accent-fg/80">Payments are mocked for now — premium via the bot is free.</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each data.plans as plan}
				<div class="panel-muted rounded-sm p-3">
					<p class="font-semibold text-fg">{plan.label}</p>
					<p class="text-xs text-fg-muted">
						{plan.days} days — send
						<code class="px-1 rounded-sm bg-surface-6 text-fg-soft font-mono">/premium {plan.id}</code>
					</p>
				</div>
			{/each}
		</div>
		{#if !data.telegramLinked}
			<p class="text-sm text-fg-muted">
				Connect your Telegram account in <a
					href="/settings"
					class="text-accent-fg underline hover:text-accent-hover transition-colors">Settings</a
				> first, then request premium directly in the bot.
			</p>
		{:else}
			<p class="text-sm text-fg-muted">
				Open the bot and send <code class="px-1.5 py-0.5 rounded-sm bg-surface-4 text-fg-soft font-mono"
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

	<p class="text-center text-xs text-fg-muted">
		Want to gift premium to someone? Open their profile and use the "Gift Premium" action.
	</p>
</PageContainer>
