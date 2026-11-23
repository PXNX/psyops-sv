<!-- src/routes/(authenticated)/(dock)/giftcode/+page.svelte -->
<script lang="ts">
	import { goodLabel } from "#lib/config/index.js";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import { formatDateTime } from "#lib/utils/formatting.js";
	import { enhance } from "$app/forms";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

	let { data, form } = $props();

	let giftCode = $state("");
	let submitting = $state(false);

	function formatDate(date: Date | string) {
		return formatDateTime(String(date));
	}

	function formatNumber(num: number) {
		return new Intl.NumberFormat().format(num);
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader title="Gift Codes" subtitle="Redeem codes for exclusive rewards" icon={FluentGift20Filled} />

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
		class="panel rounded-sm p-5 space-y-4"
	>
		<div class="flex items-center gap-2 mb-4">
			<FluentGift20Filled class="size-5 text-politics" />
			<h2 class="section-title">Redeem Gift Code</h2>
		</div>

		{#if form?.success}
			<div class="bg-positive-bg/18 border border-positive/30 text-positive-fg rounded-sm p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentCheckmark20Filled class="size-5 shrink-0" />
					<p class="font-medium">Gift code redeemed successfully!</p>
				</div>
				{#if form.rewards && (form.rewards.currency > 0 || form.rewards.premiumDays > 0 || form.rewards.resources.length > 0)}
					<div class="space-y-2">
						<h4 class="text-xs font-medium text-fg-muted uppercase tracking-wide">Rewards Received</h4>
						<div class="panel-muted rounded-sm p-2.5 space-y-1.5">
							{#if form.rewards.currency > 0}
								<div class="flex justify-between text-xs items-center">
									<span class="text-fg-muted flex items-center gap-1.5">
										<FluentMoney20Filled class="size-3.5 text-positive" />
										<span class="capitalize">currency</span>
									</span>
									<span class="font-mono text-xs text-positive-fg">
										+{formatNumber(form.rewards.currency)}
										<span class="text-positive-fg ml-1">✓</span>
									</span>
								</div>
							{/if}
							{#if form.rewards.premiumDays > 0}
								<div class="flex justify-between text-xs items-center">
									<span class="text-fg-muted flex items-center gap-1.5">
										<span class="text-primary-fg">⭐</span>
										<span>premium</span>
									</span>
									<span class="font-mono text-xs text-primary-fg">
										+{formatNumber(form.rewards.premiumDays)} days
										<span class="text-primary-fg ml-1">✓</span>
									</span>
								</div>
							{/if}
							{#each form.rewards.resources as resource}
								<div class="flex justify-between text-xs items-center">
									<span class="text-fg-muted flex items-center gap-1.5">
										{#if resource.type === "currency"}
											<FluentMoney20Filled class="size-3.5 text-positive" />
										{:else}
											<ResourceIcon name={resource.type} class="size-3.5" />
										{/if}
										<span>{goodLabel(resource.type)}</span>
									</span>
									<span class="font-mono text-xs text-positive-fg">
										+{formatNumber(resource.quantity)}
										<span class="text-positive-fg ml-1">✓</span>
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if form?.error}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4">
				<div class="flex items-start gap-3">
					<FluentDismiss20Filled class="size-5 mt-0.5 shrink-0" />
					<p class="text-sm">{form.error}</p>
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
				class="field-control rounded-sm px-3 py-2.5 flex-1 uppercase font-mono"
				class:border-red-500={form?.error}
			/>
			<Button
				type="submit"
				variant="soft-purple"
				disabled={!giftCode.trim()}
				loading={submitting}
				loadingText="Redeeming..."
				icon={FluentGift20Filled}
				class="min-w-[120px]"
			>
				Redeem
			</Button>
		</div>
	</form>

	<!-- Redemption History -->
	{#if data.redemptions && data.redemptions.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2 mb-4">
				<FluentClock20Filled class="size-5 text-politics" />
				<h2 class="section-title">Redemption History</h2>
			</div>

			<div class="space-y-4">
				{#each data.redemptions as redemption}
					<div class="panel-muted rounded-sm overflow-hidden">
						<!-- Header -->
						<div class="bg-surface-6/60 px-4 py-3 border-b border-line/15">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<code class="text-politics-fg font-mono font-semibold">
											{redemption.code}
										</code>
									</div>
									{#if redemption.description}
										<p class="text-xs text-fg-muted mt-1">{redemption.description}</p>
									{/if}
								</div>
								<div class="text-right">
									<p class="text-xs text-fg-muted">{formatDate(redemption.redeemedAt)}</p>
								</div>
							</div>
						</div>

						<!-- Rewards Received -->
						<div class="p-4">
							<div class="bg-surface-0/60 rounded-sm p-2.5 md:p-3 space-y-1.5 border border-line/10">
								{#if redemption.currencyReceived > 0}
									<div class="flex justify-between text-xs items-center">
										<span class="text-fg-muted flex items-center gap-1.5">
											<FluentMoney20Filled class="size-3.5 text-positive" />
											<span class="capitalize">currency</span>
										</span>
										<span class="font-mono text-xs text-positive-fg">
											+{formatNumber(redemption.currencyReceived)}
											<span class="text-positive-fg ml-1">✓</span>
										</span>
									</div>
								{/if}

								{#if redemption.premiumDaysReceived > 0}
									<div class="flex justify-between text-xs items-center">
										<span class="text-fg-muted flex items-center gap-1.5">
											<span class="text-primary-fg">⭐</span>
											<span>premium</span>
										</span>
										<span class="font-mono text-xs text-primary-fg">
											+{formatNumber(redemption.premiumDaysReceived)} days
											<span class="text-primary-fg ml-1">✓</span>
										</span>
									</div>
								{/if}

								{#each redemption.resources as resource}
									<div class="flex justify-between text-xs items-center">
										<span class="text-fg-muted flex items-center gap-1.5">
											{#if resource.type === "currency"}
												<FluentMoney20Filled class="size-3.5 text-positive" />
											{:else}
												<ResourceIcon name={resource.type} class="size-3.5" />
											{/if}
											<span>{goodLabel(resource.type)}</span>
										</span>
										<span class="font-mono text-xs text-positive-fg">
											+{formatNumber(resource.quantity)}
											<span class="text-positive-fg ml-1">✓</span>
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Telegram Channel Button -->
	<Button
		href="https://t.me/pentexnyx"
		target="_blank"
		rel="noopener noreferrer"
		variant="soft-blue"
		size="lg"
		block
		class="gap-3"
	>
		<svg class="size-6" fill="currentColor" viewBox="0 0 24 24">
			<path
				d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
			/>
		</svg>
		<span class="font-semibold">Get Gift Codes on Telegram</span>
	</Button>
</PageContainer>
