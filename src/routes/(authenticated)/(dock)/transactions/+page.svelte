<script lang="ts">
	import type { PageData } from "./$types";
	import FluentArrowTrendingLines20Filled from "~icons/fluent/arrow-trending-lines-20-filled";
	import FluentWallet20Filled from "~icons/fluent/wallet-20-filled";
	import FluentArrowDownload20Filled from "~icons/fluent/arrow-download-20-filled";
	import FluentArrowUpload20Filled from "~icons/fluent/arrow-upload-20-filled";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentChevronLeft20Filled from "~icons/fluent/chevron-left-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";

	type TransactionIconType = "player" | "company" | "state" | "default";

	function getTransactionIconType(tx: {
		type: string;
		relatedEntity: { type: string; id: number | null } | null;
	}): TransactionIconType {
		if (tx.relatedEntity?.type === "factory" || tx.relatedEntity?.type === "company") return "company";
		if (tx.relatedEntity?.type === "state") return "state";
		if (tx.relatedEntity?.type === "listing") return "player";

		const companyTypes = ["factory_wage", "company_deposit", "company_withdrawal", "factory_edit", "company_edit"];
		if (companyTypes.includes(tx.type)) return "company";

		const stateTypes = [
			"tax_payment",
			"state_resource_purchase",
			"state_resource_sale",
			"state_construction",
			"visa_purchase"
		];
		if (stateTypes.includes(tx.type)) return "state";

		const playerTypes = ["market_purchase", "market_sale"];
		if (playerTypes.includes(tx.type)) return "player";

		return "default";
	}

	function getFallbackIcon(iconType: TransactionIconType) {
		switch (iconType) {
			case "company":
				return FluentBuilding20Filled;
			case "state":
				return FluentBuildingGovernment20Filled;
			case "player":
				return FluentPerson20Filled;
			default:
				return FluentWallet20Filled;
		}
	}

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
		state_construction: "State Construction"
	};

	const typeColors: Record<string, { bg: string; border: string; text: string }> = {
		market_purchase: { bg: "bg-blue-600/15", border: "border-blue-500/25", text: "text-blue-300" },
		market_sale: { bg: "bg-emerald-600/15", border: "border-emerald-500/25", text: "text-emerald-300" },
		gift_code_redemption: { bg: "bg-yellow-600/15", border: "border-yellow-500/25", text: "text-yellow-300" },
		factory_wage: { bg: "bg-purple-600/15", border: "border-purple-500/25", text: "text-purple-300" },
		company_deposit: { bg: "bg-cyan-600/15", border: "border-cyan-500/25", text: "text-cyan-300" },
		company_withdrawal: { bg: "bg-orange-600/15", border: "border-orange-500/25", text: "text-orange-300" },
		visa_purchase: { bg: "bg-indigo-600/15", border: "border-indigo-500/25", text: "text-indigo-300" },
		tax_payment: { bg: "bg-red-600/15", border: "border-red-500/25", text: "text-red-300" }
	};

	const defaultColor = { bg: "bg-slate-600/15", border: "border-slate-500/25", text: "text-slate-300" };

	function getTypeColor(type: string) {
		return typeColors[type] || defaultColor;
	}

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

<div class="w-full mx-auto px-3 sm:px-4 py-6 space-y-6 sm:max-w-3xl">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-white mb-1">Transactions</h1>
		<p class="text-slate-400 text-sm">Your financial activity over the last 30 days</p>
	</div>

	<!-- Balance -->
	<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-5">
		<div class="flex items-center gap-3">
			<div class="size-11 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
				<FluentWallet20Filled class="size-6 text-purple-400" />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Current Balance</p>
				<p class="text-2xl font-bold text-white font-mono">{formatCurrency(data.analytics.currentBalance)}</p>
			</div>
		</div>
	</div>

	<!-- Income & Expenses Summaries -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		<!-- Income Summary -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
		>
			<div class="p-4">
				<div class="flex items-center gap-2 mb-1">
					<div class="size-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
						<FluentArrowDownload20Filled class="size-4 text-emerald-400" />
					</div>
					<p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Income</p>
				</div>
				<p class="text-xl font-bold text-emerald-400 font-mono">+{formatCurrency(data.analytics.totalIncome)}</p>
			</div>
			{#if incomeCategories.length > 0}
				<div class="border-t border-slate-700/50 px-4 py-2 space-y-0.5">
					{#each incomeCategories as cat}
						<button
							type="button"
							onclick={() => toggleFilter(cat.type)}
							class="flex items-center justify-between w-full py-1.5 px-1 rounded-lg transition-all cursor-pointer {activeFilter ===
							cat.type
								? 'bg-emerald-500/10'
								: 'hover:bg-slate-800/60'}"
						>
							<span class="text-xs {activeFilter === cat.type ? 'text-emerald-300 font-semibold' : 'text-slate-400'}">
								{typeLabels[cat.type] || cat.type}
							</span>
							<span
								class="text-xs font-mono {activeFilter === cat.type
									? 'text-emerald-300 font-semibold'
									: 'text-emerald-400/70'}"
							>
								+{formatCurrency(cat.income)}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Expenses Summary -->
		<div
			class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden"
		>
			<div class="p-4">
				<div class="flex items-center gap-2 mb-1">
					<div class="size-8 bg-red-600/20 rounded-lg flex items-center justify-center">
						<FluentArrowUpload20Filled class="size-4 text-red-400" />
					</div>
					<p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Expenses</p>
				</div>
				<p class="text-xl font-bold text-red-400 font-mono">-{formatCurrency(data.analytics.totalExpenses)}</p>
			</div>
			{#if expenseCategories.length > 0}
				<div class="border-t border-slate-700/50 px-4 py-2 space-y-0.5">
					{#each expenseCategories as cat}
						<button
							type="button"
							onclick={() => toggleFilter(cat.type)}
							class="flex items-center justify-between w-full py-1.5 px-1 rounded-lg transition-all cursor-pointer {activeFilter ===
							cat.type
								? 'bg-red-500/10'
								: 'hover:bg-slate-800/60'}"
						>
							<span class="text-xs {activeFilter === cat.type ? 'text-red-300 font-semibold' : 'text-slate-400'}">
								{typeLabels[cat.type] || cat.type}
							</span>
							<span
								class="text-xs font-mono {activeFilter === cat.type ? 'text-red-300 font-semibold' : 'text-red-400/70'}"
							>
								-{formatCurrency(cat.expenses)}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Transaction History -->
	<section class="space-y-3">
		<div class="flex items-center justify-between px-1">
			<h2 class="text-sm font-bold text-slate-200 font-mono uppercase tracking-wide">History</h2>
			<div class="flex items-center gap-2">
				{#if activeFilter}
					<button
						type="button"
						onclick={() => (activeFilter = null)}
						class="text-xs text-purple-400 hover:text-purple-300 font-mono transition-colors cursor-pointer"
					>
						Clear filter
					</button>
				{/if}
				<span class="text-xs text-slate-500 font-mono"
					>{filteredTransactions.length} of {data.pagination.totalCount}</span
				>
			</div>
		</div>

		{#if groupedTransactions.length === 0}
			<div
				class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-8 text-center"
			>
				<FluentArrowTrendingLines20Filled class="size-10 text-slate-600 mx-auto mb-3" />
				{#if activeFilter}
					<p class="text-slate-400 font-medium">No {typeLabels[activeFilter] || activeFilter} transactions</p>
					<button
						type="button"
						onclick={() => (activeFilter = null)}
						class="text-purple-400 hover:text-purple-300 text-sm mt-2 font-mono transition-colors cursor-pointer"
					>
						Clear filter
					</button>
				{:else}
					<p class="text-slate-400 font-medium">No transactions yet</p>
					<p class="text-slate-500 text-sm mt-1">Your financial activity will appear here</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-5">
				{#each groupedTransactions as group}
					<div class="space-y-2">
						<h3 class="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider px-1">{group.label}</h3>
						<div
							class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl divide-y divide-slate-700/30"
						>
							{#each group.transactions as tx}
								{@const color = getTypeColor(tx.type)}
								{@const iconType = getTransactionIconType(tx)}
								{@const FallbackIcon = getFallbackIcon(iconType)}
								<div class="p-4 hover:bg-slate-800/40 transition-colors first:rounded-t-xl last:rounded-b-xl">
									<div class="flex items-center justify-between gap-3">
										<!-- Left: Avatar + Details -->
										<div class="flex items-center gap-3 flex-1 min-w-0">
											{#if tx.entity.avatarUrl}
												<img
													src={tx.entity.avatarUrl}
													alt={tx.entity.name || ""}
													class="size-10 rounded-full object-cover shrink-0"
												/>
											{:else}
												<div
													class="size-10 rounded-full flex items-center justify-center shrink-0 {tx.isIncome
														? 'bg-emerald-600/20'
														: 'bg-red-600/20'}"
												>
													<FallbackIcon class="size-5 {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}" />
												</div>
											{/if}

											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<p class="text-sm font-medium text-white truncate">{typeLabels[tx.type] || tx.type}</p>
													<span class="text-[11px] text-slate-500 font-mono shrink-0">{formatTime(tx.createdAt)}</span>
												</div>

												{#if tx.entity.name}
													{#if tx.entity.href}
														<a href={tx.entity.href} class="text-xs {color.text} hover:underline truncate block mt-0.5">
															{tx.entity.name}
														</a>
													{:else}
														<p class="text-xs {color.text} truncate mt-0.5">{tx.entity.name}</p>
													{/if}
												{/if}
											</div>
										</div>

										<!-- Right: Amount + Balance -->
										<div class="text-right shrink-0">
											<p class="text-sm font-bold {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}">
												{tx.isIncome ? "+" : ""}{formatCurrency(tx.amount)}
											</p>
											<p class="text-[11px] text-slate-500 font-mono mt-0.5">
												Bal: {formatCurrency(tx.balanceAfter)}
											</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<nav class="flex items-center justify-center gap-2 pt-2 pb-4">
			{#if data.pagination.hasPreviousPage}
				<a
					href="?page={data.pagination.currentPage - 1}"
					class="btn btn-sm gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-slate-300 hover:text-white transition-all"
				>
					<FluentChevronLeft20Filled class="size-4" />
					Prev
				</a>
			{:else}
				<button class="btn btn-sm gap-1 btn-disabled bg-slate-800/30 border-slate-700/20 text-slate-600" disabled>
					<FluentChevronLeft20Filled class="size-4" />
					Prev
				</button>
			{/if}

			<div class="flex items-center gap-1">
				{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as pageNum}
					{#if pageNum === data.pagination.currentPage}
						<span class="btn btn-sm bg-purple-600/30 border-purple-500/30 text-purple-300 min-w-[2.5rem]">
							{pageNum}
						</span>
					{:else if Math.abs(pageNum - data.pagination.currentPage) <= 2 || pageNum === 1 || pageNum === data.pagination.totalPages}
						<a
							href="?page={pageNum}"
							class="btn btn-sm bg-slate-700/30 hover:bg-slate-600/50 border-slate-600/20 text-slate-400 hover:text-white min-w-[2.5rem] transition-all"
						>
							{pageNum}
						</a>
					{:else if Math.abs(pageNum - data.pagination.currentPage) === 3}
						<span class="text-slate-600 px-1">…</span>
					{/if}
				{/each}
			</div>

			{#if data.pagination.hasNextPage}
				<a
					href="?page={data.pagination.currentPage + 1}"
					class="btn btn-sm gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-slate-300 hover:text-white transition-all"
				>
					Next
					<FluentChevronRight20Filled class="size-4" />
				</a>
			{:else}
				<button class="btn btn-sm gap-1 btn-disabled bg-slate-800/30 border-slate-700/20 text-slate-600" disabled>
					Next
					<FluentChevronRight20Filled class="size-4" />
				</button>
			{/if}
		</nav>
	{/if}
</div>
