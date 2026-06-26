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

	let { data }: { data: PageData } = $props();

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2
		}).format(amount);
	}

	function formatDate(date: Date | string): string {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
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

	let groupedTransactions = $derived.by(() => {
		const groups: { day: string; label: string; transactions: typeof data.transactions }[] = [];
		let currentDay = "";
		for (const tx of data.transactions) {
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
		<p class="text-gray-400 text-sm">Your financial activity over the last 30 days</p>
	</div>

	<!-- Analytics Summary Cards -->
	<div class="grid grid-cols-2 gap-3">
		<!-- Current Balance -->
		<div class="col-span-2 bg-slate-800/30 rounded-xl border border-white/5 p-5">
			<div class="flex items-center gap-3">
				<div class="size-11 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
					<FluentWallet20Filled class="size-6 text-purple-400" />
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Current Balance</p>
					<p class="text-2xl font-bold text-white">{formatCurrency(data.analytics.currentBalance)}</p>
				</div>
			</div>
		</div>

		<!-- Income -->
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<div class="size-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
					<FluentArrowDownload20Filled class="size-4 text-emerald-400" />
				</div>
				<p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Income</p>
			</div>
			<p class="text-lg font-bold text-emerald-400">+{formatCurrency(data.analytics.totalIncome)}</p>
		</div>

		<!-- Expenses -->
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
			<div class="flex items-center gap-2 mb-2">
				<div class="size-8 bg-red-600/20 rounded-lg flex items-center justify-center">
					<FluentArrowUpload20Filled class="size-4 text-red-400" />
				</div>
				<p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Expenses</p>
			</div>
			<p class="text-lg font-bold text-red-400">-{formatCurrency(data.analytics.totalExpenses)}</p>
		</div>
	</div>

	<!-- Category Breakdown -->
	{#if data.analytics.categoryBreakdown.length > 0}
		<section class="space-y-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Breakdown by Type</h2>
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-4">
				<div class="space-y-2">
					{#each data.analytics.categoryBreakdown.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)) as cat}
						{@const color = getTypeColor(cat.type)}
						<div class="flex items-center justify-between py-1.5">
							<div class="flex items-center gap-2">
								<span
									class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {color.bg} {color.border} border {color.text}"
								>
									{typeLabels[cat.type] || cat.type}
								</span>
							</div>
							<div class="text-right text-sm">
								{#if cat.income > 0}
									<span class="text-emerald-400">+{formatCurrency(cat.income)}</span>
								{/if}
								{#if cat.income > 0 && cat.expenses > 0}
									<span class="text-gray-600 mx-1">/</span>
								{/if}
								{#if cat.expenses > 0}
									<span class="text-red-400">-{formatCurrency(cat.expenses)}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Transaction History -->
	<section class="space-y-3">
		<div class="flex items-center justify-between px-1">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">History</h2>
			<span class="text-xs text-gray-500">{data.pagination.totalCount} transactions</span>
		</div>

		{#if groupedTransactions.length === 0}
			<div class="bg-slate-800/30 rounded-xl border border-white/5 p-8 text-center">
				<FluentArrowTrendingLines20Filled class="size-10 text-gray-600 mx-auto mb-3" />
				<p class="text-gray-400 font-medium">No transactions yet</p>
				<p class="text-gray-500 text-sm mt-1">Your financial activity will appear here</p>
			</div>
		{:else}
			<div class="space-y-5">
				{#each groupedTransactions as group}
					<div class="space-y-2">
						<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">{group.label}</h3>
						<div class="bg-slate-800/30 rounded-xl border border-white/5 divide-y divide-white/5">
							{#each group.transactions as tx}
								{@const color = getTypeColor(tx.type)}
								{@const iconType = getTransactionIconType(tx)}
								<div class="p-4 hover:bg-slate-700/20 transition-colors first:rounded-t-xl last:rounded-b-xl">
									<div class="flex items-start justify-between gap-3">
										<!-- Left: Icon + Details -->
										<div class="flex items-start gap-3 flex-1 min-w-0">
											<div
												class="size-10 rounded-lg flex items-center justify-center shrink-0 {tx.isIncome
													? 'bg-emerald-600/20'
													: 'bg-red-600/20'}"
											>
												{#if iconType === "company"}
													<FluentBuilding20Filled class="size-5 {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}" />
												{:else if iconType === "state"}
													<FluentBuildingGovernment20Filled
														class="size-5 {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}"
													/>
												{:else if iconType === "player"}
													<FluentPerson20Filled class="size-5 {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}" />
												{:else}
													<FluentWallet20Filled class="size-5 {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}" />
												{/if}
											</div>

											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-white truncate">{tx.description}</p>

												{#if tx.relatedUser}
													<a
														href="/user/{tx.relatedUser.id}"
														class="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-0.5 group"
													>
														<FluentPerson20Filled class="size-3 opacity-70 group-hover:opacity-100" />
														<span class="group-hover:underline">{tx.relatedUser.name}</span>
													</a>
												{/if}

												<div class="flex items-center gap-2 mt-1.5 flex-wrap">
													<span
														class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium {color.bg} {color.border} border {color.text}"
													>
														{typeLabels[tx.type] || tx.type}
													</span>
													<span class="text-[11px] text-gray-500">
														{formatTime(tx.createdAt)}
													</span>
												</div>
											</div>
										</div>

										<!-- Right: Amount + Balance -->
										<div class="text-right shrink-0">
											<p class="text-sm font-bold {tx.isIncome ? 'text-emerald-400' : 'text-red-400'}">
												{tx.isIncome ? "+" : ""}{formatCurrency(tx.amount)}
											</p>
											<p class="text-[11px] text-gray-500 mt-0.5">
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
					class="btn btn-sm gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
				>
					<FluentChevronLeft20Filled class="size-4" />
					Prev
				</a>
			{:else}
				<button class="btn btn-sm gap-1 btn-disabled bg-slate-800/30 border-slate-700/20 text-gray-600" disabled>
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
							class="btn btn-sm bg-slate-700/30 hover:bg-slate-600/50 border-slate-600/20 text-gray-400 hover:text-white min-w-[2.5rem] transition-all"
						>
							{pageNum}
						</a>
					{:else if Math.abs(pageNum - data.pagination.currentPage) === 3}
						<span class="text-gray-600 px-1">…</span>
					{/if}
				{/each}
			</div>

			{#if data.pagination.hasNextPage}
				<a
					href="?page={data.pagination.currentPage + 1}"
					class="btn btn-sm gap-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all"
				>
					Next
					<FluentChevronRight20Filled class="size-4" />
				</a>
			{:else}
				<button class="btn btn-sm gap-1 btn-disabled bg-slate-800/30 border-slate-700/20 text-gray-600" disabled>
					Next
					<FluentChevronRight20Filled class="size-4" />
				</button>
			{/if}
		</nav>
	{/if}
</div>
