<!-- src/routes/(authenticated)/(dock)/transactions/+page.svelte -->
<!-- The wallet as a bank statement: summary, then dated entries with debit/credit and running balance. -->
<script lang="ts">
	import type { PageData } from "./$types";
	import FluentArrowTrendingLines20Filled from "~icons/fluent/arrow-trending-lines-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentFilterDismiss20Filled from "~icons/fluent/filter-dismiss-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, buttonClass } from "#lib/component/ui/index.js";

	let { data }: { data: PageData } = $props();

	let activeFilter = $state<string | null>(null);

	let incomeCategories = $derived(
		data.analytics.categoryBreakdown.filter((cat) => cat.income > 0).sort((a, b) => b.income - a.income)
	);

	let expenseCategories = $derived(
		data.analytics.categoryBreakdown.filter((cat) => cat.expenses > 0).sort((a, b) => b.expenses - a.expenses)
	);

	function toggleFilter(type: string) {
		activeFilter = activeFilter === type ? null : type;
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2
		}).format(amount);
	}

	function formatTime(date: Date | string): string {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const typeLabels: Record<string, string> = {
		market_purchase: "Market Purchase",
		market_sale: "Market Sale",
		gift_code_redemption: "Gift Code",
		factory_wage: "Factory Wage",
		company_deposit: "Company Deposit",
		company_withdrawal: "Company Withdrawal",
		visa_purchase: "Visa Purchase",
		factory_edit: "Factory Edit",
		company_edit: "Company Edit",
		newspaper_edit: "Newspaper Edit",
		settings_name_change: "Name Change",
		settings_logo_change: "Logo Change",
		tax_payment: "Tax Payment",
		state_resource_purchase: "State Purchase",
		state_resource_sale: "State Sale",
		state_construction: "State Construction",
		premium_purchase: "Premium",
		share_purchase: "Share Purchase",
		share_sale: "Share Sale",
		dividend_payout: "Dividend",
		recon_mission: "Recon Mission"
	};

	function getDayKey(date: Date | string): string {
		const d = new Date(date);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}

	function formatDayHeader(dayKey: string): string {
		const today = getDayKey(new Date());
		const yesterday = getDayKey(new Date(Date.now() - 86400000));
		if (dayKey === today) return "Today";
		if (dayKey === yesterday) return "Yesterday";
		const d = new Date(dayKey + "T12:00:00");
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
	}

	let filteredTransactions = $derived(
		activeFilter ? data.transactions.filter((tx) => tx.type === activeFilter) : data.transactions
	);

	let groupedTransactions = $derived.by(() => {
		const groups: { day: string; label: string; transactions: typeof data.transactions }[] = [];
		let currentDay = "";
		for (const tx of filteredTransactions) {
			const day = getDayKey(tx.createdAt);
			if (day !== currentDay) {
				currentDay = day;
				groups.push({ day, label: formatDayHeader(day), transactions: [] });
			}
			groups[groups.length - 1].transactions.push(tx);
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Transactions</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader documentTitle={false} title="Statement of Account" icon={FluentArrowTrendingLines20Filled} />

	<!-- Statement summary -->
	<section class="panel rounded-sm overflow-hidden">
		<div
			class="flex items-center gap-2 px-4 py-2 border-b border-line/15 bg-surface-0/50 text-[10px] uppercase tracking-[0.25em] text-fg-muted"
		>
			<span>Current account</span>
			<span class="ml-auto font-mono normal-case tracking-normal">Last 30 days</span>
		</div>
		<div class="p-4 sm:p-5 flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-[10px] text-fg-muted uppercase tracking-wide">Closing balance</p>
				<p class="text-3xl font-bold font-mono text-fg animate-tick">
					{formatCurrency(data.analytics.currentBalance)}
				</p>
			</div>
			<dl class="flex gap-5 font-mono text-sm">
				<div>
					<dt class="text-[10px] font-sans text-fg-muted uppercase tracking-wide">Credits</dt>
					<dd class="font-bold text-positive-fg">+{formatCurrency(data.analytics.totalIncome)}</dd>
				</div>
				<div>
					<dt class="text-[10px] font-sans text-fg-muted uppercase tracking-wide">Debits</dt>
					<dd class="font-bold text-red-300">-{formatCurrency(data.analytics.totalExpenses)}</dd>
				</div>
			</dl>
		</div>

		<!-- Breakdown by category: tap to filter -->
		{#if incomeCategories.length > 0 || expenseCategories.length > 0}
			<div class="grid sm:grid-cols-2 border-t border-line/10 sm:divide-x divide-line/10">
				{#each [{ cats: incomeCategories, income: true }, { cats: expenseCategories, income: false }] as col}
					{#if col.cats.length > 0}
						<ul class="px-3 py-2 space-y-0.5">
							{#each col.cats as cat (cat.type)}
								<li>
									<button
										type="button"
										onclick={() => toggleFilter(cat.type)}
										aria-pressed={activeFilter === cat.type}
										class="tap-target flex items-center justify-between gap-3 w-full py-1.5 px-2 rounded-sm text-xs transition-colors {activeFilter ===
										cat.type
											? col.income
												? 'bg-positive-bg/18'
												: 'bg-red-600/10'
											: 'hover:bg-surface-9'}"
									>
										<span class={activeFilter === cat.type ? "text-fg font-semibold" : "text-fg-muted"}>
											{typeLabels[cat.type] || cat.type}
										</span>
										<span class="font-mono {col.income ? 'text-positive-fg' : 'text-red-300'}">
											{col.income ? "+" : "-"}{formatCurrency(col.income ? cat.income : cat.expenses)}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	<!-- Entries -->
	<section class="space-y-2">
		<div class="flex items-center justify-between gap-2 px-1">
			<h2 class="section-title">Entries</h2>
			<div class="flex items-center gap-2">
				{#if activeFilter}
					<Button
						type="button"
						variant="ghost"
						size="xs"
						icon={FluentFilterDismiss20Filled}
						onclick={() => (activeFilter = null)}
					>
						{typeLabels[activeFilter] || activeFilter}
					</Button>
				{/if}
				<span class="text-xs font-mono text-fg-muted">{filteredTransactions.length}/{data.pagination.totalCount}</span>
			</div>
		</div>

		{#if groupedTransactions.length === 0}
			<div class="panel-muted rounded-sm p-10 text-center">
				<p class="font-mono text-sm text-fg-muted">— no entries —</p>
				{#if activeFilter}
					<Button type="button" variant="secondary" size="sm" class="mt-3" onclick={() => (activeFilter = null)}>
						Clear filter
					</Button>
				{/if}
			</div>
		{:else}
			<div class="panel rounded-sm overflow-hidden">
				<!-- Column heads (wider screens) -->
				<div
					class="hidden sm:grid grid-cols-[3.5rem_1fr_7.5rem_7.5rem] gap-3 px-4 py-2 bg-surface-0/60 text-[10px] uppercase tracking-wide text-fg-muted"
				>
					<span>Time</span>
					<span>Particulars</span>
					<span class="text-right">Amount</span>
					<span class="text-right">Balance</span>
				</div>
				{#each groupedTransactions as group (group.day)}
					<div
						class="px-4 py-1.5 border-t border-line/15 bg-surface-4/80 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-fg/80"
					>
						{group.label}
					</div>
					{#each group.transactions as tx (tx.id)}
						<div
							class="grid grid-cols-[1fr_auto] sm:grid-cols-[3.5rem_1fr_7.5rem_7.5rem] gap-x-3 gap-y-0.5 px-4 py-2.5 border-t border-line/8 hover:bg-surface-9/60 transition-colors items-center"
						>
							<span class="hidden sm:block font-mono text-[11px] text-fg-muted">{formatTime(tx.createdAt)}</span>
							<div class="min-w-0">
								<p class="text-sm text-fg-body truncate">{typeLabels[tx.type] || tx.type}</p>
								<div class="text-xs text-fg-muted flex items-center gap-1.5 min-w-0">
									<span class="sm:hidden font-mono shrink-0">{formatTime(tx.createdAt)}</span>
									{#if tx.relatedUser && tx.entity.href?.startsWith("/user/")}
										<UserLink
											id={tx.relatedUser.id}
											name={tx.relatedUser.name}
											avatar={tx.entity.avatarUrl}
											size="xs"
										/>
									{:else if tx.entity.name}
										{#if tx.entity.href}
											<a href={tx.entity.href} class="truncate hover:text-primary-hover transition-colors">
												{tx.entity.name}
											</a>
										{:else}
											<span class="truncate">{tx.entity.name}</span>
										{/if}
									{/if}
								</div>
							</div>
							<p
								class="text-right font-mono text-sm font-bold whitespace-nowrap {tx.isIncome
									? 'text-positive-fg'
									: 'text-red-300'}"
							>
								{tx.isIncome ? "+" : ""}{formatCurrency(tx.amount)}
							</p>
							<p
								class="col-span-2 sm:col-span-1 text-right font-mono text-[11px] text-fg-muted whitespace-nowrap -mt-0.5 sm:mt-0"
							>
								{formatCurrency(tx.balanceAfter)}
							</p>
						</div>
					{/each}
				{/each}
			</div>
		{/if}
	</section>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<nav class="flex items-center justify-center gap-2 pt-2 pb-4">
			{#if data.pagination.hasPreviousPage}
				<Button
					href="?page={data.pagination.currentPage - 1}"
					variant="secondary"
					size="sm"
					icon={FluentChevronLeft20Filled}
				>
					Prev
				</Button>
			{:else}
				<Button variant="subtle" size="sm" icon={FluentChevronLeft20Filled} disabled>Prev</Button>
			{/if}

			<div class="flex items-center gap-1">
				{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as pageNum}
					{#if pageNum === data.pagination.currentPage}
						<span class={buttonClass({ variant: "soft-amber", size: "sm", class: "min-w-[2.5rem] font-mono" })}>
							{pageNum}
						</span>
					{:else if Math.abs(pageNum - data.pagination.currentPage) <= 2 || pageNum === 1 || pageNum === data.pagination.totalPages}
						<Button href="?page={pageNum}" variant="subtle" size="sm" class="min-w-[2.5rem] font-mono">
							{pageNum}
						</Button>
					{:else if Math.abs(pageNum - data.pagination.currentPage) === 3}
						<span class="text-fg-muted/60 px-1">…</span>
					{/if}
				{/each}
			</div>

			{#if data.pagination.hasNextPage}
				<Button
					href="?page={data.pagination.currentPage + 1}"
					variant="secondary"
					size="sm"
					iconRight={FluentChevronRight20Filled}
				>
					Next
				</Button>
			{:else}
				<Button variant="subtle" size="sm" iconRight={FluentChevronRight20Filled} disabled>Next</Button>
			{/if}
		</nav>
	{/if}
</PageContainer>
