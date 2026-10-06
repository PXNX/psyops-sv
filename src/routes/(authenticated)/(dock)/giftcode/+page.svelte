<!-- src/routes/(authenticated)/(dock)/giftcode/+page.svelte -->
<script lang="ts">
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
			<FluentGift20Filled class="size-5 text-[#c08cf0]" />
			<h2 class="section-title">Redeem Gift Code</h2>
		</div>

		{#if form?.success}
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 space-y-3">
				<div class="flex items-center gap-2">
					<FluentCheckmark20Filled class="size-5 shrink-0" />
					<p class="font-medium">Gift code redeemed successfully!</p>
				</div>
				{#if form.rewards && (form.rewards.currency > 0 || form.rewards.premiumDays > 0 || form.rewards.resources.length > 0)}
					<div class="space-y-2">
						<h4 class="text-xs font-medium text-[#a8a083] uppercase tracking-wide">Rewards Received</h4>
						<div class="panel-muted rounded-sm p-2.5 space-y-1.5">
							{#if form.rewards.currency > 0}
								<div class="flex justify-between text-xs items-center">
									<span class="text-[#a8a083] flex items-center gap-1.5">
										<FluentMoney20Filled class="size-3.5 text-[#6fd14a]" />
										<span class="capitalize">currency</span>
									</span>
									<span class="font-mono text-xs text-[#b9f29a]">
										+{formatNumber(form.rewards.currency)}
										<span class="text-[#b9f29a] ml-1">✓</span>
									</span>
								</div>
							{/if}
							{#if form.rewards.premiumDays > 0}
								<div class="flex justify-between text-xs items-center">
									<span class="text-[#a8a083] flex items-center gap-1.5">
										<span class="text-[#ffd35c]">⭐</span>
										<span>premium</span>
									</span>
									<span class="font-mono text-xs text-[#ffd35c]">
										+{formatNumber(form.rewards.premiumDays)} days
										<span class="text-[#ffd35c] ml-1">✓</span>
									</span>
								</div>
							{/if}
							{#each form.rewards.resources as resource}
								<div class="flex justify-between text-xs items-center">
									<span class="text-[#a8a083] flex items-center gap-1.5">
										{#if resource.type === "currency"}
											<FluentMoney20Filled class="size-3.5 text-[#6fd14a]" />
										{:else}
											<ResourceIcon name={resource.type} class="size-3.5" />
										{/if}
										<span class="capitalize">{resource.type}</span>
									</span>
									<span class="font-mono text-xs text-[#b9f29a]">
										+{formatNumber(resource.quantity)}
										<span class="text-[#b9f29a] ml-1">✓</span>
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

		<p class="text-xs text-[#a8a083]">💡 Gift codes are case-insensitive and can only be claimed once per account</p>
	</form>

	<!-- Redemption History -->
	{#if data.redemptions && data.redemptions.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2 mb-4">
				<FluentClock20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">Redemption History</h2>
			</div>

			<div class="space-y-4">
				{#each data.redemptions as redemption}
					<div class="panel-muted rounded-sm overflow-hidden">
						<!-- Header -->
						<div class="bg-[#242a1d]/60 px-4 py-3 border-b border-[#c8b47a]/15">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<code class="text-[#e3cbfb] font-mono font-semibold">
											{redemption.code}
										</code>
									</div>
									{#if redemption.description}
										<p class="text-xs text-[#a8a083] mt-1">{redemption.description}</p>
									{/if}
								</div>
								<div class="text-right">
									<p class="text-xs text-[#a8a083]">{formatDate(redemption.redeemedAt)}</p>
								</div>
							</div>
						</div>

						<!-- Rewards Received -->
						<div class="p-4">
							<div class="bg-[#0f120c]/60 rounded-sm p-2.5 md:p-3 space-y-1.5 border border-[#c8b47a]/10">
								{#if redemption.currencyReceived > 0}
									<div class="flex justify-between text-xs items-center">
										<span class="text-[#a8a083] flex items-center gap-1.5">
											<FluentMoney20Filled class="size-3.5 text-[#6fd14a]" />
											<span class="capitalize">currency</span>
										</span>
										<span class="font-mono text-xs text-[#b9f29a]">
											+{formatNumber(redemption.currencyReceived)}
											<span class="text-[#b9f29a] ml-1">✓</span>
										</span>
									</div>
								{/if}

								{#if redemption.premiumDaysReceived > 0}
									<div class="flex justify-between text-xs items-center">
										<span class="text-[#a8a083] flex items-center gap-1.5">
											<span class="text-[#ffd35c]">⭐</span>
											<span>premium</span>
										</span>
										<span class="font-mono text-xs text-[#ffd35c]">
											+{formatNumber(redemption.premiumDaysReceived)} days
											<span class="text-[#ffd35c] ml-1">✓</span>
										</span>
									</div>
								{/if}

								{#each redemption.resources as resource}
									<div class="flex justify-between text-xs items-center">
										<span class="text-[#a8a083] flex items-center gap-1.5">
											{#if resource.type === "currency"}
												<FluentMoney20Filled class="size-3.5 text-[#6fd14a]" />
											{:else}
												<ResourceIcon name={resource.type} class="size-3.5" />
											{/if}
											<span class="capitalize">{resource.type}</span>
										</span>
										<span class="font-mono text-xs text-[#b9f29a]">
											+{formatNumber(resource.quantity)}
											<span class="text-[#b9f29a] ml-1">✓</span>
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

	<!-- Active Gift Codes (Optional - for admins or public codes) -->
	{#if data.publicCodes && data.publicCodes.length > 0}
		<div class="panel rounded-sm p-5 space-y-4">
			<div class="flex items-center gap-2">
				<FluentGift20Filled class="size-5 text-[#c08cf0]" />
				<h2 class="section-title">Available Codes</h2>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.publicCodes as code}
					<div class="panel-muted rounded-sm p-4">
						<div class="flex items-start justify-between mb-2">
							<div class="flex-1">
								<code class="text-[#e3cbfb] font-mono font-semibold">
									{code.code}
								</code>
								{#if code.description}
									<p class="text-xs text-[#a8a083] mt-1">{code.description}</p>
								{/if}
							</div>
						</div>

						<div class="flex flex-wrap gap-2 mb-3">
							{#if code.currencyAmount > 0}
								<Badge tone="green">
									💰 {formatNumber(code.currencyAmount)}
								</Badge>
							{/if}

							{#if code.premiumDays > 0}
								<Badge tone="amber">
									⭐ {formatNumber(code.premiumDays)}d premium
								</Badge>
							{/if}

							{#each code.resources as resource}
								<Badge tone="blue">
									<ResourceIcon name={resource.type} class="size-3.5" />
									{formatNumber(resource.quantity)}
									{resource.type}
								</Badge>
							{/each}
						</div>

						<div class="flex items-center justify-between text-xs">
							{#if code.expiresAt}
								<span class="text-[#a8a083]">
									Expires: {formatDate(code.expiresAt)}
								</span>
							{:else}
								<span class="text-[#a8a083]">No expiration</span>
							{/if}

							{#if code.maxRedemptions}
								<span class="text-[#a8a083]">
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
	<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4">
		<p class="text-sm text-[#b3dcff]">
			💡 <strong>Tip:</strong> Gift codes are distributed through special events, promotions, and community activities. Follow
			our social channels to stay updated on new codes!
		</p>
	</div>

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
