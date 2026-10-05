<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button } from "#lib/component/ui/index.js";

	let { data } = $props();

	// Transaction type labels
	const transactionTypeLabels: Record<string, string> = {
		resource_purchase: "Resource Purchase",
		resource_sale: "Resource Sale",
		construction: "Construction Project",
		tax_collection: "Tax Collection",
		infrastructure: "Infrastructure",
		military: "Military Spending",
		other: "Other"
	};

	// Transaction type icons
	const transactionTypeIcons: Record<string, string> = {
		resource_purchase: "🛒",
		resource_sale: "💰",
		construction: "🏗️",
		tax_collection: "🏛️",
		infrastructure: "🛤️",
		military: "⚔️",
		other: "📋"
	};

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Format compact currency (for charts)
	function formatCompactCurrency(amount: number): string {
		if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(1)}M`;
		} else if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(1)}K`;
		}
		return `$${amount}`;
	}

	// Format date
	function formatDate(date: Date | string): string {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	// Format short date
	function formatShortDate(date: Date | string): string {
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
	}

	// Navigate to a specific page
	function goToPage(pageNum: number) {
		const url = new URL(page.url.href);
		url.searchParams.set("page", pageNum.toString());
		goto(url.toString());
	}

	// Calculate percentage for category bars
	function getPercentage(value: number, total: number): number {
		if (total === 0) return 0;
		return (value / total) * 100;
	}

	// Get color for transaction type
	function getTypeColor(type: string): string {
		const colors: Record<string, string> = {
			resource_purchase: "bg-[#315d8d]",
			resource_sale: "bg-[#587252]",
			construction: "bg-[#e6a527]",
			tax_collection: "bg-[#8c709b]",
			infrastructure: "bg-[#315d8d]",
			military: "bg-red-500",
			other: "bg-[#a89e8e]"
		};
		return colors[type] || "bg-[#a89e8e]";
	}

	// Sort categories by total activity
	const sortedCategories = $derived(
		data.analytics.categoryBreakdown
			.toSorted((a, b) => b.income + b.expenses - (a.income + a.expenses))
			.slice(0, 5) // Top 5 categories
	);

	// Calculate max for bar scaling
	const maxCategoryValue = $derived(
		Math.max(...sortedCategories.map((cat) => Math.max(cat.income, cat.expenses)), 1)
	);
</script>

<svelte:head><title>{data.state.name} - Government Budget</title></svelte:head>

<PageContainer maxWidth="6xl">
		<!-- Header -->
		<PageHeader
			title="{data.state.name} - Government Budget"
			subtitle="Track government spending and revenue"
			backHref="/state/{data.state.id}"
			backLabel={data.state.name}
		/>

		<!-- Analytics Overview -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<!-- Current Balance -->
			<div class="bg-[#315d8d]/18 border border-[#7ba0c8]/30 rounded-sm p-5">
				<div class="flex items-center justify-between mb-2">
					<div class="text-[10px] text-[#b7d0e6] uppercase tracking-wide">Treasury Balance</div>
					<div class="text-2xl">💰</div>
				</div>
				<div class="text-2xl font-bold font-mono text-[#fff7e8]">{formatCurrency(data.analytics.currentBalance)}</div>
				<div class="text-sm text-[#b7d0e6]/70 mt-1">Available funds</div>
			</div>

			<!-- Total Income -->
			<div class="panel rounded-sm p-5">
				<div class="flex items-center justify-between mb-2">
					<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Income (30d)</div>
					<div class="text-2xl">📈</div>
				</div>
				<div class="text-2xl font-bold font-mono text-[#c6dfbf]">{formatCurrency(data.analytics.totalIncome)}</div>
				<div class="text-sm text-[#a89e8e] mt-1">Revenue collected</div>
			</div>

			<!-- Total Expenses -->
			<div class="panel rounded-sm p-5">
				<div class="flex items-center justify-between mb-2">
					<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Expenses (30d)</div>
					<div class="text-2xl">📉</div>
				</div>
				<div class="text-2xl font-bold font-mono text-red-300">{formatCurrency(data.analytics.totalExpenses)}</div>
				<div class="text-sm text-[#a89e8e] mt-1">Money spent</div>
			</div>

			<!-- Net Change -->
			<div class="panel rounded-sm p-5">
				<div class="flex items-center justify-between mb-2">
					<div class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Net Change</div>
					<div class="text-2xl">{data.analytics.netChange >= 0 ? "✅" : "⚠️"}</div>
				</div>
				<div class="text-2xl font-bold font-mono {data.analytics.netChange >= 0 ? 'text-[#c6dfbf]' : 'text-red-300'}">
					{data.analytics.netChange >= 0 ? "+" : ""}{formatCurrency(data.analytics.netChange)}
				</div>
				<div class="text-sm text-[#a89e8e] mt-1">Last 30 days</div>
			</div>
		</div>

		<!-- Category Breakdown Chart -->
		{#if sortedCategories.length > 0}
			<div class="panel rounded-sm p-5">
				<h2 class="section-title mb-5">Top Categories (Last 30 Days)</h2>
				<div class="space-y-5">
					{#each sortedCategories as category}
						<div>
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									<span class="text-xl">{transactionTypeIcons[category.type] || "📋"}</span>
									<span class="font-medium text-[#e5d8c1]">
										{transactionTypeLabels[category.type] || category.type}
									</span>
								</div>
								<div class="text-sm text-[#a89e8e]">
									{formatCompactCurrency(category.income + category.expenses)} total
								</div>
							</div>

							<div class="flex gap-2">
								<!-- Income bar -->
								<div class="flex-1">
									<div class="h-8 bg-[#0d1d31] rounded-sm overflow-hidden relative">
										<div
											class="h-full bg-[#587252] rounded-sm transition-all duration-500 flex items-center justify-end pr-2"
											style="width: {getPercentage(category.income, maxCategoryValue)}%"
										>
											{#if category.income > 0}
												<span class="text-xs font-semibold text-[#fff7e8]">
													+{formatCompactCurrency(category.income)}
												</span>
											{/if}
										</div>
									</div>
									<div class="text-xs text-[#a89e8e] mt-1">Income</div>
								</div>

								<!-- Expenses bar -->
								<div class="flex-1">
									<div class="h-8 bg-[#0d1d31] rounded-sm overflow-hidden relative">
										<div
											class="h-full bg-red-500 rounded-sm transition-all duration-500 flex items-center justify-end pr-2"
											style="width: {getPercentage(category.expenses, maxCategoryValue)}%"
										>
											{#if category.expenses > 0}
												<span class="text-xs font-semibold text-[#fff7e8]">
													-{formatCompactCurrency(category.expenses)}
												</span>
											{/if}
										</div>
									</div>
									<div class="text-xs text-[#a89e8e] mt-1">Expenses</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Transactions List -->
		<div class="panel rounded-sm overflow-hidden">
			<div class="px-5 py-4 border-b border-[#dfceb0]/15 bg-[#102239]/70">
				<h2 class="section-title">Transaction History</h2>
				<p class="text-sm text-[#a89e8e] mt-1">
					{data.pagination.totalCount} total transactions
				</p>
			</div>

			{#if data.transactions.length === 0}
				<div class="p-16 text-center">
					<div class="text-6xl mb-4">📊</div>
					<p class="text-xl font-semibold text-[#e5d8c1] mb-2">No transactions yet</p>
					<p class="text-[#a89e8e]">Government financial activity will appear here</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-[#102239]/70 border-b border-[#dfceb0]/15">
							<tr>
								<th class="px-6 py-4 text-left text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">
									Transaction
								</th>
								<th class="px-6 py-4 text-left text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">
									Date
								</th>
								<th class="px-6 py-4 text-left text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">
									Authorized By
								</th>
								<th class="px-6 py-4 text-right text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">
									Amount
								</th>
								<th class="px-6 py-4 text-right text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">
									Balance After
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#dfceb0]/10">
							{#each data.transactions as transaction}
								<tr class="hover:bg-[#19304b] transition-colors group">
									<td class="px-6 py-4">
										<div class="flex items-start gap-3">
											<div
												class="flex-shrink-0 w-10 h-10 rounded-sm {getTypeColor(
													transaction.type
												)} bg-opacity-10 flex items-center justify-center text-xl"
											>
												{transactionTypeIcons[transaction.type] || "📋"}
											</div>
											<div class="flex-1 min-w-0">
												<div class="font-semibold text-[#fff7e8]">
													{transactionTypeLabels[transaction.type] || transaction.type}
												</div>
												<div class="text-sm text-[#d9ccb7] truncate">
													{transaction.description}
												</div>
												{#if transaction.itemName && transaction.quantity}
													<div class="text-xs text-[#a89e8e] mt-1">
														{transaction.quantity}x {transaction.itemName}
														{#if transaction.pricePerUnit}
															@ {formatCurrency(transaction.pricePerUnit)}
														{/if}
													</div>
												{/if}
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-[#e5d8c1]">{formatShortDate(transaction.createdAt)}</div>
										<div class="text-xs text-[#a89e8e]">
											{(() => {
												const d = new Date(transaction.createdAt);
												const pad = (n) => String(n).padStart(2, "0");
												return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
											})()}
										</div>
									</td>
									<td class="px-6 py-4">
										<a
											href="/user/{transaction.authorizedBy.id}"
											class="text-sm text-[#b7d0e6] hover:text-[#e1effa] hover:underline font-medium"
										>
											{transaction.authorizedBy.name}
										</a>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right">
										<div
											class="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border {transaction.isIncome
												? 'bg-[#587252]/18 border-[#8fae88]/30'
												: 'bg-red-600/10 border-red-500/30'}"
										>
											<span class="text-sm font-bold font-mono {transaction.isIncome ? 'text-[#c6dfbf]' : 'text-red-300'}">
												{transaction.amount > 0 ? "+" : ""}{formatCurrency(transaction.amount)}
											</span>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right">
										<div class="text-sm font-medium font-mono text-[#d9ccb7]">
											{formatCurrency(transaction.balanceAfter)}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				{#if data.pagination.totalPages > 1}
					<div class="px-5 py-4 border-t border-[#dfceb0]/15 bg-[#102239]/70">
						<div class="flex items-center justify-between gap-3 flex-wrap">
							<div class="text-sm text-[#a89e8e]">
								Showing
								<span class="font-semibold text-[#fff7e8]">
									{(data.pagination.currentPage - 1) * data.pagination.pageSize + 1}
								</span>
								to
								<span class="font-semibold text-[#fff7e8]">
									{Math.min(data.pagination.currentPage * data.pagination.pageSize, data.pagination.totalCount)}
								</span>
								of
								<span class="font-semibold text-[#fff7e8]">{data.pagination.totalCount}</span>
							</div>

							<div class="flex gap-2">
								<Button
									variant="secondary"
									size="sm"
									onclick={() => goToPage(1)}
									disabled={!data.pagination.hasPreviousPage}
								>
									First
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => goToPage(data.pagination.currentPage - 1)}
									disabled={!data.pagination.hasPreviousPage}
								>
									Previous
								</Button>

								<!-- Page numbers -->
								<div class="hidden sm:flex gap-1">
									{#each Array(data.pagination.totalPages) as _, i}
										{#if i === 0 || i === data.pagination.totalPages - 1 || Math.abs(i + 1 - data.pagination.currentPage) <= 2}
											<Button
												variant={i + 1 === data.pagination.currentPage ? "primary" : "secondary"}
												size="sm"
												onclick={() => goToPage(i + 1)}
											>
												{i + 1}
											</Button>
										{:else if Math.abs(i + 1 - data.pagination.currentPage) === 3}
											<span class="px-2 py-2 text-sm text-[#a89e8e]">...</span>
										{/if}
									{/each}
								</div>

								<Button
									variant="secondary"
									size="sm"
									onclick={() => goToPage(data.pagination.currentPage + 1)}
									disabled={!data.pagination.hasNextPage}
								>
									Next
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => goToPage(data.pagination.totalPages)}
									disabled={!data.pagination.hasNextPage}
								>
									Last
								</Button>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
</PageContainer>
