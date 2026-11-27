<!-- src/routes/(authenticated)/(dock)/company/[id]/DividendsPanel.svelte -->
<!-- Dividends of a public company: yield, last payout and the payout record
     for everyone; for the owner the declare form (with a live preview of what
     it costs and who gets what) and the automatic payout policy. A payout
     counts the paid amount up while a few coins rise out of the panel. -->
<script lang="ts">
	import { tick } from "svelte";
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";
	import type { SuperValidated } from "sveltekit-superforms";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import { Badge } from "#lib/component/ui/index.js";
	import DividendControls from "./DividendControls.svelte";
	import FluentCoinMultiple20Filled from "~icons/fluent/coin-multiple-20-filled";
	import FluentArrowRepeatAll20Filled from "~icons/fluent/arrow-repeat-all-20-filled";

	type History = { paidAt: string; perShare: number; automatic: boolean; total: number; recipients: number };

	let {
		dividends,
		config,
		budgetBalance,
		isOwner
	}: {
		dividends: {
			overview: {
				history: History[];
				myTotalReceived: number;
				sharePrice: number | null;
				paidPerShare30d: number;
				yieldPercent: number | null;
				lastPaidAt: string | null;
				lastPerShare: number | null;
			};
			holderCount: number;
			heldShares: number;
			myShares: number;
			cooldownEndsAt: string | null;
			payoutRatio: number;
			reserve: number;
			declareForm: SuperValidated<{ perShare: number }> | null;
			policyForm: SuperValidated<{ ratioPercent: number; reserve: number }> | null;
		};
		config: { cooldownHours: number; minPerShare: number; minTotal: number; yieldWindowDays: number };
		budgetBalance: number;
		isOwner: boolean;
	} = $props();

	const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

	let panelEl = $state<HTMLElement | null>(null);

	// ---- Payout moment: the amount counts up, coins rise. ----
	const paidOut = new Tween(0, { duration: 1100, easing: cubicOut });
	let showPayout = $state(false);
	let payoutKey = $state(0);
	let payoutTimer: ReturnType<typeof setTimeout> | undefined;

	async function playPayout(amount: number) {
		clearTimeout(payoutTimer);
		const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
		payoutKey++;
		showPayout = true;
		await paidOut.set(0, { duration: 0 });
		await tick();
		celebrate(panelEl);
		paidOut.set(amount, reduced ? { duration: 0 } : undefined);
		payoutTimer = setTimeout(() => (showPayout = false), 3200);
	}

	// ---- Payout record bars (oldest left) ----
	const bars = $derived([...dividends.overview.history].reverse());
	const barMax = $derived(Math.max(1, ...bars.map((b) => b.perShare)));

	const coins = Array.from({ length: 9 }, (_, i) => ({
		left: 8 + ((i * 37) % 84),
		delay: (i * 90) % 520,
		drift: ((i % 3) - 1) * 14,
		size: 14 + ((i * 5) % 9)
	}));
</script>

<section class="panel rounded-sm p-5 sm:p-6 space-y-5 relative overflow-hidden" bind:this={panelEl}>
	<div class="flex items-center justify-between gap-3">
		<h2 class="section-title"><FluentCoinMultiple20Filled class="size-3.5" /> Dividends</h2>
		{#if dividends.payoutRatio > 0}
			<Badge tone="green" size="xs" class="flex items-center gap-1">
				<FluentArrowRepeatAll20Filled class="size-3" /> Auto {dividends.payoutRatio}%
			</Badge>
		{/if}
	</div>

	{#if showPayout}
		{#key payoutKey}
			<div class="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
				{#each coins as coin, i (i)}
					<span
						class="dividend-coin absolute bottom-0 flex items-center justify-center rounded-full bg-warning text-warning-content font-mono font-bold"
						style="left: {coin.left}%; width: {coin.size}px; height: {coin.size}px; font-size: {coin.size *
							0.6}px; --coin-delay: {coin.delay}ms; --coin-drift: {coin.drift}px"
					>
						$
					</span>
				{/each}
			</div>
			<div
				class="animate-pop-in absolute inset-x-0 top-12 z-20 mx-auto w-fit rounded-sm border border-positive/40 bg-surface-2 px-4 py-2 text-center shadow-lg"
				role="status"
			>
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Paid to shareholders</p>
				<p class="data text-2xl font-bold text-positive-fg">{money(paidOut.current)}</p>
			</div>
		{/key}
	{/if}

	<dl class="grid grid-cols-2 sm:grid-cols-4 gap-2">
		<div class="panel-muted rounded-sm p-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Yield {config.yieldWindowDays}d</dt>
			<dd class="data text-base font-bold text-positive-fg">
				{dividends.overview.yieldPercent !== null ? `${dividends.overview.yieldPercent}%` : "—"}
			</dd>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Last payout</dt>
			<dd class="data text-base font-bold text-fg">
				{dividends.overview.lastPerShare !== null ? `${money(dividends.overview.lastPerShare)}/sh` : "None yet"}
			</dd>
			{#if dividends.overview.lastPaidAt}
				<dd class="text-[11px] text-fg-muted">{formatDate(dividends.overview.lastPaidAt)}</dd>
			{/if}
		</div>
		<div class="panel-muted rounded-sm p-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Per share {config.yieldWindowDays}d</dt>
			<dd class="data text-base font-bold text-fg">{money(dividends.overview.paidPerShare30d)}</dd>
		</div>
		<div class="panel-muted rounded-sm p-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">You received</dt>
			{#key dividends.overview.myTotalReceived}
				<dd class="data text-base font-bold text-fg animate-tick">{money(dividends.overview.myTotalReceived)}</dd>
			{/key}
		</div>
	</dl>

	{#if dividends.cooldownEndsAt}
		<div class="panel-muted rounded-sm p-3 mt-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Next automatic payout</dt>
			<dd class="data text-base font-bold text-fg">{formatDate(dividends.cooldownEndsAt)}</dd>
		</div>
	{:else}
		<div class="panel-muted rounded-sm p-3 mt-3">
			<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Next automatic payout</dt>
			<dd class="data text-base font-bold text-fg">Allowed now</dd>
		</div>
	{/if}

	<!-- Payout record -->
	{#if bars.length > 0}
		<div>
			<h3 class="text-[10px] uppercase tracking-wide text-fg-muted mb-2">Payout record · per share</h3>
			<div
				class="flex items-end gap-1 h-16 border-b border-line/20"
				role="img"
				aria-label="Dividend per share by payout"
			>
				{#each bars as bar (bar.paidAt)}
					<div
						class="flex-1 max-w-6 rounded-t-sm {bar.automatic ? 'bg-positive/50' : 'bg-primary/70'}"
						style="height: {Math.max(6, (bar.perShare / barMax) * 100)}%"
						title="{formatDate(bar.paidAt)} · {money(bar.perShare)}/share · {money(bar.total)} to {bar.recipients}"
					></div>
				{/each}
			</div>
			<ol class="mt-2 divide-y divide-line/10 border-b border-line/15 text-sm">
				{#each dividends.overview.history.slice(0, 5) as row (row.paidAt)}
					<li class="py-1.5 flex items-center justify-between gap-3">
						<span class="text-fg-soft">
							{formatDate(row.paidAt)}
							{#if row.automatic}<Badge tone="green" size="xs" class="ml-1">auto</Badge>{/if}
						</span>
						<span class="data text-fg-body">
							{money(row.perShare)}/sh · {money(row.total)}
							<span class="text-fg-muted">to {row.recipients}</span>
						</span>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<p class="text-sm text-fg-muted">No dividends paid yet.</p>
	{/if}

	{#if isOwner && dividends.declareForm && dividends.policyForm}
		<DividendControls
			declareForm={dividends.declareForm}
			policyForm={dividends.policyForm}
			heldShares={dividends.heldShares}
			holderCount={dividends.holderCount}
			myShares={dividends.myShares}
			sharePrice={dividends.overview.sharePrice}
			cooldownEndsAt={dividends.cooldownEndsAt}
			{budgetBalance}
			{config}
			onPaid={(fallback) => playPayout(dividends.overview.history[0]?.total ?? fallback)}
		/>
	{/if}
</section>

<style>
	.dividend-coin {
		opacity: 0;
		animation: coin-rise 1500ms cubic-bezier(0.22, 1, 0.36, 1) var(--coin-delay) forwards;
		box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-warning) 60%, var(--color-warning-content)) inset;
	}

	@keyframes coin-rise {
		0% {
			opacity: 0;
			transform: translate(0, 0) rotate(0deg) scale(0.6);
		}
		15% {
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--coin-drift), -180px) rotate(200deg) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dividend-coin {
			display: none;
		}
	}
</style>
