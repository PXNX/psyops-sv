<!-- src/routes/(authenticated)/visas/+page.svelte -->
<script lang="ts">
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	const { data } = $props();

	function getExpiryColor(visa: any) {
		if (visa.isExpired) return "red";
		if (visa.isExpiringSoon) return "yellow";
		return "green";
	}

	function getStatusBadge(visa: any) {
		if (visa.status === "revoked") {
			return { color: "red", icon: FluentDismiss20Filled, text: "Revoked" };
		}
		if (visa.isExpired) {
			return { color: "gray", icon: FluentDismiss20Filled, text: "Expired" };
		}
		if (visa.isExpiringSoon) {
			return { color: "yellow", icon: FluentWarning20Filled, text: "Expiring Soon" };
		}
		return { color: "green", icon: FluentCheckmark20Filled, text: "Active" };
	}

	// Ink colours on the paper visa cards (the cards are light, so these are
	// darker than the app's on-dark signal colours).
	const expiryInk: Record<string, string> = {
		green: "text-[#3b2a14]",
		yellow: "text-[#9a6a05]",
		red: "text-red-700"
	};
	const statusInk: Record<string, string> = {
		green: "text-[#3f7a2a]",
		yellow: "text-[#9a6a05]",
		red: "text-red-700"
	};
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="My Visas"
		icon={FluentBookCompass24Filled}
		subtitle="{data.activeVisas.length} active visa{data.activeVisas.length !== 1 ? 's' : ''}"
	/>

	<!-- Active Visas -->
	{#if data.activeVisas.length > 0}
		<section class="space-y-4">
			<h2 class="section-title">Active Visas</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each data.activeVisas as visa}
					{@const badge = getStatusBadge(visa)}
					{@const expiryColor = getExpiryColor(visa)}
					<a
						href="/state/{visa.stateId}"
						class="group press-spring relative block overflow-hidden rounded-sm hover:shadow-xl"
						style="
							background: linear-gradient(145deg, #f5f0e8 0%, #ede7d9 40%, #e8e0d0 100%);
							box-shadow: 0 2px 12px rgba(0,0,0,0.3), inset 0 0 60px rgba(0,0,0,0.03);
						"
					>
						<!-- Decorative border -->
						<div class="absolute inset-0 border-2 border-[#7a5427]/30 rounded-sm pointer-events-none"></div>
						<div class="absolute inset-[3px] border border-[#7a5427]/15 rounded-sm pointer-events-none"></div>

						<!-- Guilloche-style pattern (top & bottom strip) -->
						<div
							class="absolute top-0 left-0 right-0 h-7 opacity-[0.07] pointer-events-none"
							style="background: repeating-linear-gradient(90deg, #4a3728 0px, transparent 1px, transparent 3px, #4a3728 4px);"
						></div>
						<div
							class="absolute bottom-0 left-0 right-0 h-7 opacity-[0.07] pointer-events-none"
							style="background: repeating-linear-gradient(90deg, #4a3728 0px, transparent 1px, transparent 3px, #4a3728 4px);"
						></div>

						<!-- Content -->
						<div class="relative p-5 pt-4">
							<!-- Header line -->
							<div class="flex items-center justify-between mb-3">
								<span class="text-[10px] font-bold tracking-[0.3em] uppercase text-[#5b3d1a]/50">Travel Visa</span>
								<span class="text-[10px] font-mono text-[#7a5427]/40">No. {visa.id.slice(0, 8).toUpperCase()}</span>
							</div>

							<!-- State info row -->
							<div class="flex items-center gap-3 mb-4">
								{#if visa.stateLogo}
									<img
										loading="lazy"
										decoding="async"
										src={visa.stateLogo}
										alt={visa.stateName}
										class="size-12 rounded-sm border border-[#5b3d1a]/20 shadow-sm"
									/>
								{:else}
									<div
										class="size-12 rounded-sm bg-[#5b3d1a]/10 border border-[#5b3d1a]/20 flex items-center justify-center"
									>
										<FluentBuildingGovernment20Filled class="size-6 text-[#5b3d1a]/40" />
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<h3
										class="text-lg font-bold text-[#3b2a14] group-hover:text-[#a0611a] transition-colors leading-tight"
									>
										{visa.stateName}
									</h3>
									<p class="text-[10px] tracking-[0.15em] uppercase text-[#7a5427]/50 font-medium">Sovereign State</p>
								</div>
							</div>

							<!-- Divider -->
							<div class="border-t border-dashed border-[#5b3d1a]/20 mb-3"></div>

							<!-- Visa fields grid -->
							<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
								<div>
									<p class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/40 mb-0.5">Date of Issue</p>
									<p class="text-[#3b2a14] font-semibold text-sm">{formatDate(visa.issuedAt)}</p>
								</div>
								<div>
									<p class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/40 mb-0.5">Valid Until</p>
									<p class="font-semibold text-sm {expiryInk[expiryColor] ?? 'text-[#3b2a14]'}">
										{formatDate(visa.expiresAt)}
									</p>
								</div>
								<div>
									<p class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/40 mb-0.5">Fee Paid</p>
									<p class="text-[#3b2a14] font-semibold text-sm">${visa.cost.toLocaleString()}</p>
								</div>
								<div>
									<p class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/40 mb-0.5">Remaining</p>
									<p class="font-semibold text-sm {expiryInk[expiryColor] ?? 'text-[#3b2a14]'}">
										{#if visa.daysUntilExpiry > 0}
											{visa.daysUntilExpiry} day{visa.daysUntilExpiry !== 1 ? "s" : ""}
										{:else}
											Expired
										{/if}
									</p>
								</div>
							</div>

							<!-- Status footer -->
							<div class="border-t border-[#5b3d1a]/10 pt-2 flex items-center justify-between">
								<span class="text-[9px] tracking-[0.2em] uppercase text-[#7a5427]/40 font-bold">Status</span>
								<span class="text-xs font-bold tracking-wider uppercase {statusInk[badge.color] ?? 'text-[#3b2a14]'}"
									>{badge.text}</span
								>
							</div>
						</div>

						<!-- Stamped circle -->
						<div
							class="visa-stamp absolute top-1/2 right-5 size-24 rounded-full pointer-events-none"
							style="border: 3px solid rgba(22, 101, 52, 0.35);"
						>
							<div class="absolute inset-[3px] rounded-full border-2 border-[#2f5d23]/25"></div>
							<div class="absolute inset-0 flex flex-col items-center justify-center">
								<span class="text-[7px] font-bold tracking-[0.2em] uppercase text-[#2f5d23]/40 leading-none"
									>Approved</span
								>
								<span class="text-[10px] font-black tracking-wider uppercase text-[#2f5d23]/50 leading-tight mt-0.5"
									>{visa.stateName?.slice(0, 10)}</span
								>
								<div class="w-8 h-px bg-[#2f5d23]/25 my-0.5"></div>
								<span class="text-[6px] font-mono text-[#2f5d23]/35 leading-none"
									>{formatDate(visa.approvedAt || visa.issuedAt)}</span
								>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{:else}
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#1a1f15] mb-4">
				<FluentBookCompass24Filled class="size-8 text-[#a8a083]" />
			</div>
			<h2 class="text-xl font-bold text-[#f5efd8] mb-2">No Active Visas</h2>
			<p class="text-[#a8a083] mb-4">
				You don't have any active visas. Visit other states to purchase visas and explore new regions!
			</p>
			<Button href="/state" variant="secondary">Browse States</Button>
		</div>
	{/if}

	<!-- Expired/Revoked Visas -->
	{#if data.expiredVisas.length > 0}
		<section class="space-y-4">
			<h2 class="section-title">Expired & Revoked Visas</h2>
			<div class="space-y-3">
				{#each data.expiredVisas as visa}
					{@const badge = getStatusBadge(visa)}
					<div class="panel-muted rounded-sm p-4">
						<div class="flex items-start gap-4">
							{#if visa.stateLogo}
								<img
									loading="lazy"
									decoding="async"
									src={visa.stateLogo}
									alt={visa.stateName}
									class="size-12 rounded-sm opacity-60"
								/>
							{:else}
								<div class="size-12 rounded-sm bg-[#1a1f15] flex items-center justify-center opacity-60">
									<FluentBuildingGovernment20Filled class="size-6 text-[#a8a083]" />
								</div>
							{/if}

							<div class="flex-1">
								<div class="flex items-start justify-between mb-2">
									<div>
										<h3 class="font-semibold text-[#e6ddbf]">{visa.stateName}</h3>
										<Badge
											size="xs"
											class="mt-1"
											icon={badge.icon}
											tone={badge.color === "red"
												? "red"
												: badge.color === "yellow"
													? "amber"
													: badge.color === "green"
														? "green"
														: "neutral"}
										>
											{badge.text}
										</Badge>
									</div>
									<div class="text-right text-sm">
										<p class="text-[#a8a083]">Expired</p>
										<p class="text-[#a8a083]">{formatDate(visa.expiresAt)}</p>
									</div>
								</div>

								{#if visa.revocationReason}
									<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-3 mt-2">
										<p class="text-xs text-red-300">
											<strong>Revoked:</strong>
											{visa.revocationReason}
										</p>
									</div>
								{/if}

								<div class="flex gap-6 text-xs text-[#a8a083] mt-2">
									<span>Issued: {formatDate(visa.issuedAt)}</span>
									<span>Cost: ${visa.cost.toLocaleString()}</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</PageContainer>

<style>
	/* The approval stamp sits tilted; hovering a visa "presses" it again. */
	.visa-stamp {
		transform: translateY(-50%) rotate(-18deg);
		transition: transform 420ms cubic-bezier(0.34, 1.8, 0.5, 1);
	}

	:global(.group:hover) .visa-stamp {
		transform: translateY(-50%) rotate(-12deg) scale(1.06);
	}

	@media (prefers-reduced-motion: reduce) {
		.visa-stamp,
		:global(.group:hover) .visa-stamp {
			transition: none;
			transform: translateY(-50%) rotate(-18deg);
		}
	}
</style>
