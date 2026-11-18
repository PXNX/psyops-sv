<!-- src/routes/(authenticated)/visas/+page.svelte -->
<!-- The player's passport: one visa page per state, stamped on approval. -->
<script lang="ts">
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import PassportPage from "./PassportPage.svelte";
	import VisaStamp from "./VisaStamp.svelte";

	const { data } = $props();

	// Each stamp lands at its own slight angle, like real ones.
	const tiltFor = (id: number) => ((id * 37) % 22) - 14;
</script>

<PageContainer maxWidth="5xl">
	<PageHeader
		title="Passport"
		icon={FluentBookCompass24Filled}
		subtitle="{data.activeVisas.length} valid visa{data.activeVisas.length !== 1 ? 's' : ''}"
	/>

	{#if data.activeVisas.length > 0}
		<section class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each data.activeVisas as visa, i (visa.id)}
				<a href="/state/{visa.stateId}" class="group press-spring block rounded-sm">
					<PassportPage heading="Visa · Visum" page={i + 1}>
						<div class="flex items-center gap-3">
							{#if visa.stateLogo}
								<img
									loading="lazy"
									decoding="async"
									src={visa.stateLogo}
									alt=""
									class="size-11 rounded-sm border border-[#5b3d1a]/20 object-cover"
								/>
							{:else}
								<div
									class="size-11 rounded-sm bg-[#5b3d1a]/10 border border-[#5b3d1a]/20 flex items-center justify-center"
								>
									<FluentBuildingGovernment20Filled class="size-6 text-[#5b3d1a]/40" />
								</div>
							{/if}
							<div class="min-w-0">
								<h2
									class="font-serif text-lg font-bold leading-tight truncate group-hover:text-[#a0611a] transition-colors"
								>
									{visa.stateName}
								</h2>
								<p class="text-[10px] font-mono text-[#7a5427]/60">No. {String(visa.id).padStart(8, "0")}</p>
							</div>
						</div>

						<div class="relative mt-3 pt-3 border-t border-dashed border-[#5b3d1a]/25">
							<dl class="grid grid-cols-2 gap-x-4 gap-y-2 pr-24 sm:pr-28">
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Issued</dt>
									<dd class="text-sm font-semibold font-mono">{formatDate(visa.issuedAt)}</dd>
								</div>
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Valid until</dt>
									<dd class="text-sm font-semibold font-mono {visa.isExpiringSoon ? 'text-[#a3241b]' : ''}">
										{formatDate(visa.expiresAt)}
									</dd>
								</div>
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Fee</dt>
									<dd class="text-sm font-semibold font-mono">${visa.cost.toLocaleString()}</dd>
								</div>
								<div>
									<dt class="text-[9px] font-bold tracking-[0.2em] uppercase text-[#7a5427]/55">Remaining</dt>
									<dd class="text-sm font-semibold {visa.isExpiringSoon ? 'text-[#a3241b]' : ''}">
										{visa.daysUntilExpiry} day{visa.daysUntilExpiry !== 1 ? "s" : ""}
									</dd>
								</div>
							</dl>
							<VisaStamp
								label="Approved"
								title={visa.stateName}
								date={formatDate(visa.approvedAt || visa.issuedAt)}
								tone={visa.isExpiringSoon ? "gold" : "green"}
								tilt={tiltFor(visa.id)}
								delay={160 + i * 90}
								class="absolute right-0 top-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-105"
							/>
						</div>
					</PassportPage>
				</a>
			{/each}
		</section>
	{:else}
		<PassportPage heading="Visas" class="max-w-md mx-auto w-full">
			<div class="py-8 text-center">
				<p class="font-serif text-lg italic text-[#7a5427]/70">No visas stamped.</p>
				<Button href="/state" variant="secondary" size="sm" class="mt-4">Browse States</Button>
			</div>
		</PassportPage>
	{/if}

	{#if data.expiredVisas.length > 0}
		<section class="space-y-3">
			<h2 class="section-title">Past visas</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each data.expiredVisas as visa (visa.id)}
					<PassportPage heading="Visa" page={String(visa.id).padStart(8, "0")} class="opacity-80">
						<div class="relative min-h-24 pr-24">
							<h3 class="font-serif font-bold leading-tight truncate">{visa.stateName}</h3>
							<p class="text-xs font-mono text-[#7a5427]/70 mt-1">
								{formatDate(visa.issuedAt)} – {formatDate(visa.expiresAt)}
							</p>
							<p class="text-xs font-mono text-[#7a5427]/70">${visa.cost.toLocaleString()}</p>
							{#if visa.revocationReason}
								<p class="text-xs text-[#a3241b] mt-2 italic break-words">{visa.revocationReason}</p>
							{/if}
							<VisaStamp
								label={visa.status === "revoked" ? "Void" : "Expired"}
								title={visa.status === "revoked" ? "Revoked" : "Expired"}
								date={formatDate(visa.revokedAt || visa.expiresAt)}
								tone={visa.status === "revoked" ? "red" : "blue"}
								shape="rect"
								tilt={tiltFor(visa.id) + 4}
								faded={visa.status !== "revoked"}
								class="absolute right-0 top-1"
							/>
						</div>
					</PassportPage>
				{/each}
			</div>
		</section>
	{/if}
</PageContainer>
