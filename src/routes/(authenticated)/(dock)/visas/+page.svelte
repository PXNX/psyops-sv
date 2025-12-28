<!-- src/routes/(authenticated)/visas/+page.svelte -->
<script lang="ts">
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import { formatDate } from "$lib/utils/formatting.js";

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
</script>

<div class="max-w-6xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-6">
		<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
			<FluentBookCompass24Filled class="size-6 text-blue-400" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-white">My Visas</h1>
			<p class="text-sm text-gray-400">
				{data.activeVisas.length} active visa{data.activeVisas.length !== 1 ? "s" : ""}
			</p>
		</div>
	</div>

	<!-- Active Visas -->
	{#if data.activeVisas.length > 0}
		<div class="mb-8">
			<h2 class="text-lg font-semibold text-white mb-4">Active Visas</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.activeVisas as visa}
					{@const badge = getStatusBadge(visa)}
					{@const expiryColor = getExpiryColor(visa)}
					<a
						href="/state/{visa.stateId}"
						class="group bg-slate-800/50 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all p-6"
					>
						<!-- Header -->
						<div class="flex items-start gap-4 mb-4">
							{#if visa.stateLogo}
								<img src={visa.stateLogo} alt={visa.stateName} class="size-14 rounded-lg" />
							{:else}
								<div class="size-14 rounded-lg bg-slate-700 flex items-center justify-center">
									<FluentBuildingGovernment20Filled class="size-7 text-gray-400" />
								</div>
							{/if}

							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
									{visa.stateName}
								</h3>
								<div class="flex items-center gap-2 mt-1">
									<span
										class="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
										style="background-color: var(--{badge.color}-600-20); color: var(--{badge.color}-400)"
									>
										<svelte:component this={badge.icon} class="size-3" />
										{badge.text}
									</span>
								</div>
							</div>
						</div>

						<!-- Expiry Info -->
						<div class="bg-slate-700/30 rounded-lg p-4 mb-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 text-gray-400">
									<FluentCalendar20Filled class="size-4" />
									<span class="text-sm">Expires</span>
								</div>
								<div class="text-right">
									<p class="font-semibold" style="color: var(--{expiryColor}-400)">
										{formatDate(visa.expiresAt)}
									</p>
									<p class="text-xs text-gray-500">
										{#if visa.daysUntilExpiry > 0}
											{visa.daysUntilExpiry} day{visa.daysUntilExpiry !== 1 ? "s" : ""} remaining
										{:else}
											Expired
										{/if}
									</p>
								</div>
							</div>
						</div>

						<!-- Additional Info -->
						<div class="grid grid-cols-2 gap-3 text-sm">
							<div>
								<p class="text-gray-500 text-xs mb-1">Issued</p>
								<p class="text-gray-300">{formatDate(visa.issuedAt)}</p>
							</div>
							<div>
								<p class="text-gray-500 text-xs mb-1">Cost</p>
								<div class="flex items-center gap-1 text-gray-300">
									<FluentMoney20Filled class="size-3" />
									<span>${visa.cost.toLocaleString()}</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-12 text-center mb-8">
			<FluentBookCompass24Filled class="size-16 text-gray-500 mx-auto mb-4" />
			<h3 class="text-xl font-bold text-white mb-2">No Active Visas</h3>
			<p class="text-gray-400 mb-4">
				You don't have any active visas. Visit other states to purchase visas and explore new regions!
			</p>
			<a href="/state" class="btn bg-blue-600 hover:bg-blue-700 border-0 text-white"> Browse States </a>
		</div>
	{/if}

	<!-- Expired/Revoked Visas -->
	{#if data.expiredVisas.length > 0}
		<div>
			<h2 class="text-lg font-semibold text-white mb-4">Expired & Revoked Visas</h2>
			<div class="space-y-3">
				{#each data.expiredVisas as visa}
					{@const badge = getStatusBadge(visa)}
					<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
						<div class="flex items-start gap-4">
							{#if visa.stateLogo}
								<img src={visa.stateLogo} alt={visa.stateName} class="size-12 rounded-lg opacity-60" />
							{:else}
								<div class="size-12 rounded-lg bg-slate-700/50 flex items-center justify-center opacity-60">
									<FluentBuildingGovernment20Filled class="size-6 text-gray-400" />
								</div>
							{/if}

							<div class="flex-1">
								<div class="flex items-start justify-between mb-2">
									<div>
										<h3 class="font-semibold text-gray-300">{visa.stateName}</h3>
										<span
											class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1"
											style="background-color: var(--{badge.color}-600-20); color: var(--{badge.color}-400)"
										>
											<svelte:component this={badge.icon} class="size-3" />
											{badge.text}
										</span>
									</div>
									<div class="text-right text-sm">
										<p class="text-gray-500">Expired</p>
										<p class="text-gray-400">{formatDate(visa.expiresAt)}</p>
									</div>
								</div>

								{#if visa.revocationReason}
									<div class="bg-red-600/10 border border-red-500/20 rounded-lg p-3 mt-2">
										<p class="text-xs text-red-400">
											<strong>Revoked:</strong>
											{visa.revocationReason}
										</p>
									</div>
								{/if}

								<div class="flex gap-6 text-xs text-gray-500 mt-2">
									<span>Issued: {formatDate(visa.issuedAt)}</span>
									<span>Cost: ${visa.cost.toLocaleString()}</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
