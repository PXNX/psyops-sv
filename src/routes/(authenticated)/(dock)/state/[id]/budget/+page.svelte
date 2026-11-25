<!-- src/routes/(authenticated)/(dock)/state/[id]/budget/+page.svelte -->
<!-- The treasury's bank statement: balance, 30-day summary and a ledger of
     every movement with its running balance. -->
<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentBuildingBank20Filled from "~icons/fluent/building-bank-20-filled";
	import FluentReceiptMoney20Filled from "~icons/fluent/receipt-money-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import { dtgDate, dtgTime } from "#lib/utils/dtg.js";
	import RegionalShare from "./RegionalShare.svelte";

	let { data } = $props();

	const transactionTypeLabels: Record<string, string> = {
		resource_purchase: "Resource purchase",
		resource_sale: "Resource sale",
		construction: "Construction",
		tax_collection: "Tax revenue",
		infrastructure: "Infrastructure",
		military: "Military",
		other: "Other",
		airstrike: "Airstrike",
		reparations: "Reparations"
	};
	const labelOf = (type: string) => transactionTypeLabels[type] ?? type.replace(/_/g, " ");

	const money = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
	const fmt = (amount: number) => money.format(amount);

	const dayOf = (date: Date | string) => dtgDate(date);
	const timeOf = (date: Date | string) => dtgTime(date);

	function goToPage(pageNum: number) {
		const url = new URL(page.url.href);
		url.searchParams.set("page", pageNum.toString());
		goto(url.toString());
	}

	const categories = $derived(
		data.analytics.categoryBreakdown.toSorted((a, b) => b.income + b.expenses - (a.income + a.expenses))
	);
	const today = dayOf(new Date());
</script>

<svelte:head><title>{data.state.name} Treasury · PsyOps</title></svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="Treasury"
		subtitle={data.state.name}
		icon={FluentBuildingBank20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<div class="mx-auto flex max-w-4xl flex-wrap gap-2">
		<Button href="/state/{data.state.id}/market" size="sm" variant="secondary">Buy resources →</Button>
		<Button href="/market" size="sm" variant="ghost">World market</Button>
	</div>

	<!-- Statement head -->
	<section class="panel rounded-sm overflow-hidden">
		<div class="px-5 pt-5 pb-4 flex items-start justify-between gap-4 border-b-2 border-double border-line/30">
			<div class="min-w-0">
				<p class="text-[10px] uppercase tracking-[0.25em] text-fg-muted">Statement of account</p>
				<p class="font-serif text-lg font-black text-fg truncate">State Treasury of {data.state.name}</p>
				<p class="text-xs font-mono text-fg-muted">
					Acct. {String(data.state.id).padStart(6, "0")} · as of {today}
				</p>
			</div>
			<div class="text-right shrink-0">
				<p class="text-[10px] uppercase tracking-wide text-fg-muted">Balance</p>
				<p
					class="font-mono text-2xl sm:text-3xl font-bold animate-tick {data.analytics.currentBalance < 0
						? 'text-red-300'
						: 'text-fg'}"
				>
					{fmt(data.analytics.currentBalance)}
				</p>
			</div>
		</div>

		<!-- 30-day summary -->
		<dl class="grid grid-cols-3 divide-x divide-line/10 text-center">
			<div class="p-3">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Credits 30d</dt>
				<dd class="font-mono text-sm sm:text-base font-bold text-positive-fg truncate">
					+{fmt(data.analytics.totalIncome)}
				</dd>
			</div>
			<div class="p-3">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Debits 30d</dt>
				<dd class="font-mono text-sm sm:text-base font-bold text-red-300 truncate">
					−{fmt(data.analytics.totalExpenses)}
				</dd>
			</div>
			<div class="p-3">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Net</dt>
				<dd
					class="font-mono text-sm sm:text-base font-bold truncate {data.analytics.netChange >= 0
						? 'text-positive-fg'
						: 'text-red-300'}"
				>
					{data.analytics.netChange >= 0 ? "+" : "−"}{fmt(Math.abs(data.analytics.netChange))}
				</dd>
			</div>
		</dl>

		{#if categories.length > 0}
			<ul class="px-5 py-3 border-t border-line/10 space-y-1.5">
				{#each categories as category (category.type)}
					<li class="flex items-center gap-2 text-sm">
						<span class="text-fg-soft capitalize">{labelOf(category.type)}</span>
						<span class="flex-1 border-b border-dotted border-line/20 translate-y-1" aria-hidden="true"></span>
						{#if category.income}
							<span class="font-mono text-xs text-positive-fg">+{fmt(category.income)}</span>
						{/if}
						{#if category.expenses}
							<span class="font-mono text-xs text-red-300">−{fmt(category.expenses)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- How local tax is split with the regions -->
	<RegionalShare split={data.regionalShare} />

	<!-- Ledger -->
	<section class="panel rounded-sm overflow-hidden">
		<div class="px-5 py-3 flex items-baseline justify-between gap-3 border-b border-line/15">
			<h2 class="section-title">Ledger</h2>
			<span class="text-xs font-mono text-fg-muted">{data.pagination.totalCount} entries</span>
		</div>

		{#if data.transactions.length === 0}
			<div class="p-4">
				<EmptyState icon={FluentReceiptMoney20Filled} title="No movements yet" />
			</div>
		{:else}
			<!-- Column heads (wide screens) -->
			<div
				class="hidden sm:grid grid-cols-[4.5rem_1fr_7rem_7rem] gap-3 px-5 py-2 text-[10px] uppercase tracking-wide text-fg-muted bg-surface-4/60 border-b border-line/10"
			>
				<span>Date</span>
				<span>Particulars</span>
				<span class="text-right">Amount</span>
				<span class="text-right">Balance</span>
			</div>
			<ol class="divide-y divide-dashed divide-line/12">
				{#each data.transactions as tx (tx.id)}
					<li
						class="grid grid-cols-[1fr_auto] sm:grid-cols-[4.5rem_1fr_7rem_7rem] gap-x-3 gap-y-0.5 px-4 sm:px-5 py-3 hover:bg-surface-9/50 transition-colors"
					>
						<span class="hidden sm:block font-mono text-xs text-fg-muted leading-5">
							{dayOf(tx.createdAt)}<br />{timeOf(tx.createdAt)}
						</span>
						<div class="min-w-0">
							<p class="text-sm font-semibold text-fg capitalize truncate">{labelOf(tx.type)}</p>
							{#if tx.description}
								<p class="text-xs text-fg-soft truncate">{tx.description}</p>
							{/if}
							{#if tx.itemName && tx.quantity}
								<p class="text-xs font-mono text-fg-muted">
									{tx.quantity}× {tx.itemName}{#if tx.pricePerUnit}&nbsp;@ {fmt(tx.pricePerUnit)}{/if}
								</p>
							{/if}
							<p class="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted min-w-0">
								<span class="sm:hidden font-mono">{dayOf(tx.createdAt)} {timeOf(tx.createdAt)} ·</span>
								<UserLink id={tx.authorizedBy.id} name={tx.authorizedBy.name} avatar={tx.authorizedBy.logo} size="xs" />
							</p>
						</div>
						<span
							class="text-right font-mono text-sm font-bold whitespace-nowrap {tx.isIncome
								? 'text-positive-fg'
								: 'text-red-300'}"
						>
							{tx.amount >= 0 ? "+" : "−"}{fmt(Math.abs(tx.amount))}
						</span>
						<span
							class="col-start-2 sm:col-start-auto text-right font-mono text-xs sm:text-sm text-fg-muted sm:text-fg-soft whitespace-nowrap"
						>
							{fmt(tx.balanceAfter)}
						</span>
					</li>
				{/each}
			</ol>

			{#if data.pagination.totalPages > 1}
				<div class="px-4 sm:px-5 py-3 border-t border-line/15 flex items-center justify-between gap-2">
					<Button
						variant="secondary"
						size="sm"
						icon={FluentChevronLeft20Filled}
						onclick={() => goToPage(data.pagination.currentPage - 1)}
						disabled={!data.pagination.hasPreviousPage}
					>
						Newer
					</Button>
					<span class="text-xs font-mono text-fg-muted">
						Sheet {data.pagination.currentPage} of {data.pagination.totalPages}
					</span>
					<Button
						variant="secondary"
						size="sm"
						iconRight={FluentChevronRight20Filled}
						onclick={() => goToPage(data.pagination.currentPage + 1)}
						disabled={!data.pagination.hasNextPage}
					>
						Older
					</Button>
				</div>
			{/if}
		{/if}
	</section>
</PageContainer>
