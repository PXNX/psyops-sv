<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	// Transaction type labels for better readability
	const transactionTypeLabels: Record<string, string> = {
		market_purchase: 'Market Purchase',
		market_sale: 'Market Sale',
		gift_code_redemption: 'Gift Code',
		factory_wage: 'Factory Wage',
		company_deposit: 'Company Deposit',
		company_withdrawal: 'Company Withdrawal',
		visa_purchase: 'Visa',
		factory_edit: 'Factory Edit',
		company_edit: 'Company Edit',
		newspaper_edit: 'Newspaper Edit',
		settings_name_change: 'Name Change',
		settings_logo_change: 'Logo Change',
		tax_payment: 'Tax Payment'
	};

	// Transaction type icons
	const transactionTypeIcons: Record<string, string> = {
		market_purchase: '🛒',
		market_sale: '💰',
		gift_code_redemption: '🎁',
		factory_wage: '⚙️',
		company_deposit: '🏢',
		company_withdrawal: '🏢',
		visa_purchase: '✈️',
		factory_edit: '🔧',
		company_edit: '✏️',
		newspaper_edit: '📰',
		settings_name_change: '✨',
		settings_logo_change: '🖼️',
		tax_payment: '🏛️'
	};

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
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
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(d);
	}

	// Format short date
	function formatShortDate(date: Date | string): string {
		const d = new Date(date);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(d);
	}

	// Navigate to a specific page
	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', pageNum.toString());
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
			market_purchase: 'bg-blue-500',
			market_sale: 'bg-green-500',
			gift_code_redemption: 'bg-purple-500',
			factory_wage: 'bg-amber-500',
			company_deposit: 'bg-indigo-500',
			company_withdrawal: 'bg-indigo-400',
			visa_purchase: 'bg-sky-500',
			factory_edit: 'bg-orange-500',
			company_edit: 'bg-orange-400',
			newspaper_edit: 'bg-pink-500',
			settings_name_change: 'bg-violet-500',
			settings_logo_change: 'bg-fuchsia-500',
			tax_payment: 'bg-red-500'
		};
		return colors[type] || 'bg-gray-500';
	}

	// Sort categories by total activity
	$: sortedCategories = data.analytics.categoryBreakdown
		.sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses))
		.slice(0, 5); // Top 5 categories

	// Calculate max for bar scaling
	$: maxCategoryValue = Math.max(
		...sortedCategories.map(cat => Math.max(cat.income, cat.expenses)),
		1
	);
</script>

<svelte:head>
	<title>Transaction History</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
	<div class="container mx-auto px-4 py-8 max-w-7xl">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
				Transaction History
			</h1>
			<p class="text-slate-600 text-lg">
				Track your financial activity and analyze spending patterns
			</p>
		</div>

		<!-- Analytics Overview -->
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
			<!-- Current Balance -->
			<div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
				<div class="flex items-center justify-between mb-2">
					<div class="text-sm font-medium text-blue-100">Current Balance</div>
					<div class="text-2xl">💰</div>
				</div>
				<div class="text-3xl font-bold">{formatCurrency(data.analytics.currentBalance)}</div>
				<div class="text-sm text-blue-100 mt-1">Available funds</div>
			</div>

			<!-- Total Income -->
			<div class="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
				<div class="flex items-center justify-between mb-2">
					<div class="text-sm font-medium text-slate-600">Income (30d)</div>
					<div class="text-2xl">📈</div>
				</div>
				<div class="text-3xl font-bold text-green-600">{formatCurrency(data.analytics.totalIncome)}</div>
				<div class="text-sm text-slate-500 mt-1">Money received</div>
			</div>

			<!-- Total Expenses -->
			<div class="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
				<div class="flex items-center justify-between mb-2">
					<div class="text-sm font-medium text-slate-600">Expenses (30d)</div>
					<div class="text-2xl">📉</div>
				</div>
				<div class="text-3xl font-bold text-red-600">{formatCurrency(data.analytics.totalExpenses)}</div>
				<div class="text-sm text-slate-500 mt-1">Money spent</div>
			</div>

			<!-- Net Change -->
			<div class="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
				<div class="flex items-center justify-between mb-2">
					<div class="text-sm font-medium text-slate-600">Net Change</div>
					<div class="text-2xl">{data.analytics.netChange >= 0 ? '✅' : '⚠️'}</div>
				</div>
				<div class="text-3xl font-bold {data.analytics.netChange >= 0 ? 'text-green-600' : 'text-red-600'}">
					{data.analytics.netChange >= 0 ? '+' : ''}{formatCurrency(data.analytics.netChange)}
				</div>
				<div class="text-sm text-slate-500 mt-1">Last 30 days</div>
			</div>
		</div>

		<!-- Category Breakdown Chart -->
		{#if sortedCategories.length > 0}
			<div class="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
				<h2 class="text-xl font-bold text-slate-900 mb-6">Top Categories (Last 30 Days)</h2>
				<div class="space-y-5">
					{#each sortedCategories as category}
						<div>
							<div class="flex items-center justify-between mb-2">
								<div class="flex items-center gap-2">
									<span class="text-xl">{transactionTypeIcons[category.type] || '💼'}</span>
									<span class="font-medium text-slate-700">
										{transactionTypeLabels[category.type] || category.type}
									</span>
								</div>
								<div class="text-sm text-slate-500">
									{formatCompactCurrency(category.income + category.expenses)} total
								</div>
							</div>
							
							<div class="flex gap-2">
								<!-- Income bar -->
								<div class="flex-1">
									<div class="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
										<div 
											class="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
											style="width: {getPercentage(category.income, maxCategoryValue)}%"
										>
											{#if category.income > 0}
												<span class="text-xs font-semibold text-white">
													+{formatCompactCurrency(category.income)}
												</span>
											{/if}
										</div>
									</div>
									<div class="text-xs text-slate-500 mt-1">Income</div>
								</div>

								<!-- Expenses bar -->
								<div class="flex-1">
									<div class="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
										<div 
											class="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
											style="width: {getPercentage(category.expenses, maxCategoryValue)}%"
										>
											{#if category.expenses > 0}
												<span class="text-xs font-semibold text-white">
													-{formatCompactCurrency(category.expenses)}
												</span>
											{/if}
										</div>
									</div>
									<div class="text-xs text-slate-500 mt-1">Expenses</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Transactions List -->
		<div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
			<div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
				<h2 class="text-xl font-bold text-slate-900">Recent Transactions</h2>
				<p class="text-sm text-slate-600 mt-1">
					{data.pagination.totalCount} total transactions
				</p>
			</div>

			{#if data.transactions.length === 0}
				<div class="p-16 text-center">
					<div class="text-6xl mb-4">📊</div>
					<p class="text-xl font-semibold text-slate-700 mb-2">No transactions yet</p>
					<p class="text-slate-500">Your financial activity will appear here</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-slate-50 border-b border-slate-200">
							<tr>
								<th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
									Transaction
								</th>
								<th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
									Date
								</th>
								<th class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
									Related To
								</th>
								<th class="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
									Amount
								</th>
								<th class="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
									Balance
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each data.transactions as transaction}
								<tr class="hover:bg-slate-50 transition-colors group">
									<td class="px-6 py-4">
										<div class="flex items-start gap-3">
											<div class="flex-shrink-0 w-10 h-10 rounded-xl {getTypeColor(transaction.type)} bg-opacity-10 flex items-center justify-center text-xl">
												{transactionTypeIcons[transaction.type] || '💼'}
											</div>
											<div class="flex-1 min-w-0">
												<div class="font-semibold text-slate-900">
													{transactionTypeLabels[transaction.type] || transaction.type}
												</div>
												<div class="text-sm text-slate-600 truncate">
													{transaction.description}
												</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-slate-900">{formatShortDate(transaction.createdAt)}</div>
										<div class="text-xs text-slate-500">
											{new Date(transaction.createdAt).toLocaleTimeString('en-US', { 
												hour: '2-digit', 
												minute: '2-digit' 
											})}
										</div>
									</td>
									<td class="px-6 py-4">
										{#if transaction.relatedUser}
											<a
												href="/user/{transaction.relatedUser.id}"
												class="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
											>
												{transaction.relatedUser.name}
											</a>
										{:else if transaction.relatedEntity}
											<span class="text-sm text-slate-500">
												{transaction.relatedEntity.type} #{transaction.relatedEntity.id}
											</span>
										{:else}
											<span class="text-sm text-slate-400">—</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right">
										<div class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg {transaction.isIncome ? 'bg-green-50' : 'bg-red-50'}">
											<span class="text-sm font-bold {transaction.isIncome ? 'text-green-700' : 'text-red-700'}">
												{transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
											</span>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right">
										<div class="text-sm font-medium text-slate-700">
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
					<div class="px-6 py-4 border-t border-slate-200 bg-slate-50">
						<div class="flex items-center justify-between">
							<div class="text-sm text-slate-600">
								Showing
								<span class="font-semibold text-slate-900">
									{(data.pagination.currentPage - 1) * data.pagination.pageSize + 1}
								</span>
								to
								<span class="font-semibold text-slate-900">
									{Math.min(data.pagination.currentPage * data.pagination.pageSize, data.pagination.totalCount)}
								</span>
								of
								<span class="font-semibold text-slate-900">{data.pagination.totalCount}</span>
							</div>

							<div class="flex gap-2">
								<button
									on:click={() => goToPage(1)}
									disabled={!data.pagination.hasPreviousPage}
									class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									First
								</button>
								<button
									on:click={() => goToPage(data.pagination.currentPage - 1)}
									disabled={!data.pagination.hasPreviousPage}
									class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									Previous
								</button>

								<!-- Page numbers -->
								<div class="hidden sm:flex gap-1">
									{#each Array(data.pagination.totalPages) as _, i}
										{#if i === 0 || i === data.pagination.totalPages - 1 || Math.abs(i + 1 - data.pagination.currentPage) <= 2}
											<button
												on:click={() => goToPage(i + 1)}
												class="px-4 py-2 text-sm font-medium rounded-lg border transition-colors shadow-sm {i + 1 === data.pagination.currentPage
													? 'bg-blue-600 text-white border-blue-600 shadow-md'
													: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}"
											>
												{i + 1}
											</button>
										{:else if Math.abs(i + 1 - data.pagination.currentPage) === 3}
											<span class="px-2 py-2 text-sm text-slate-400">...</span>
										{/if}
									{/each}
								</div>

								<button
									on:click={() => goToPage(data.pagination.currentPage + 1)}
									disabled={!data.pagination.hasNextPage}
									class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									Next
								</button>
								<button
									on:click={() => goToPage(data.pagination.totalPages)}
									disabled={!data.pagination.hasNextPage}
									class="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									Last
								</button>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
