<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	// Transaction type labels for better readability
	const transactionTypeLabels: Record<string, string> = {
		market_purchase: 'Market Purchase',
		market_sale: 'Market Sale',
		gift_code_redemption: 'Gift Code Redeemed',
		factory_wage: 'Factory Wage',
		company_deposit: 'Company Deposit',
		company_withdrawal: 'Company Withdrawal',
		visa_purchase: 'Visa Purchase',
		factory_edit: 'Factory Edit Cost',
		company_edit: 'Company Edit Cost',
		newspaper_edit: 'Newspaper Edit Cost',
		settings_name_change: 'Name Change Cost',
		settings_logo_change: 'Logo Change Cost',
		tax_payment: 'Tax Payment'
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

	// Navigate to a specific page
	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', pageNum.toString());
		goto(url.toString());
	}

	// Get icon for transaction type
	function getTransactionIcon(type: string, isIncome: boolean): string {
		if (isIncome) {
			return '↓'; // Down arrow for income
		}
		return '↑'; // Up arrow for expense
	}

	// Get color class for amount
	function getAmountColorClass(isIncome: boolean): string {
		return isIncome ? 'text-green-600' : 'text-red-600';
	}
</script>

<svelte:head>
	<title>Transaction History</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Transaction History</h1>
		<p class="text-gray-600">
			View all your money and resource transactions, including purchases, sales, and gift code
			redemptions
		</p>
	</div>

	<!-- Summary Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600 mb-1">Total Transactions</div>
			<div class="text-2xl font-bold">{data.pagination.totalCount}</div>
		</div>
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600 mb-1">Current Page</div>
			<div class="text-2xl font-bold">
				{data.pagination.currentPage} / {data.pagination.totalPages}
			</div>
		</div>
		<div class="bg-white rounded-lg shadow p-6">
			<div class="text-sm text-gray-600 mb-1">Showing</div>
			<div class="text-2xl font-bold">{data.transactions.length} transactions</div>
		</div>
	</div>

	<!-- Transactions Table -->
	<div class="bg-white rounded-lg shadow overflow-hidden">
		{#if data.transactions.length === 0}
			<div class="p-12 text-center text-gray-500">
				<p class="text-lg">No transactions yet</p>
				<p class="text-sm mt-2">Your transaction history will appear here</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Date
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Type
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Description
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Related To
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Amount
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Balance After
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each data.transactions as transaction}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(transaction.createdAt)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<span class="text-lg {getAmountColorClass(transaction.isIncome)}">
											{getTransactionIcon(transaction.type, transaction.isIncome)}
										</span>
										<span class="text-sm font-medium text-gray-900">
											{transactionTypeLabels[transaction.type] || transaction.type}
										</span>
									</div>
								</td>
								<td class="px-6 py-4 text-sm text-gray-900">
									{transaction.description}
								</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{#if transaction.relatedUser}
										<a
											href="/user/{transaction.relatedUser.id}"
											class="text-blue-600 hover:underline"
										>
											{transaction.relatedUser.name}
										</a>
									{:else if transaction.relatedEntity}
										<span class="text-gray-500">
											{transaction.relatedEntity.type} #{transaction.relatedEntity.id}
										</span>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right">
									<span class="text-sm font-semibold {getAmountColorClass(transaction.isIncome)}">
										{transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
									{formatCurrency(transaction.balanceAfter)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
				<div class="flex items-center justify-between">
					<div class="text-sm text-gray-700">
						Showing
						<span class="font-medium">{(data.pagination.currentPage - 1) * data.pagination.pageSize + 1}</span>
						to
						<span class="font-medium">
							{Math.min(data.pagination.currentPage * data.pagination.pageSize, data.pagination.totalCount)}
						</span>
						of
						<span class="font-medium">{data.pagination.totalCount}</span>
						transactions
					</div>

					<div class="flex gap-2">
						<button
							on:click={() => goToPage(1)}
							disabled={!data.pagination.hasPreviousPage}
							class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							First
						</button>
						<button
							on:click={() => goToPage(data.pagination.currentPage - 1)}
							disabled={!data.pagination.hasPreviousPage}
							class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>

						<!-- Page numbers -->
						<div class="flex gap-1">
							{#each Array(data.pagination.totalPages) as _, i}
								{#if i === 0 || i === data.pagination.totalPages - 1 || Math.abs(i + 1 - data.pagination.currentPage) <= 2}
									<button
										on:click={() => goToPage(i + 1)}
										class="px-3 py-2 text-sm font-medium rounded-md border {i + 1 === data.pagination.currentPage
											? 'bg-blue-600 text-white border-blue-600'
											: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
									>
										{i + 1}
									</button>
								{:else if Math.abs(i + 1 - data.pagination.currentPage) === 3}
									<span class="px-3 py-2 text-sm text-gray-500">...</span>
								{/if}
							{/each}
						</div>

						<button
							on:click={() => goToPage(data.pagination.currentPage + 1)}
							disabled={!data.pagination.hasNextPage}
							class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
						<button
							on:click={() => goToPage(data.pagination.totalPages)}
							disabled={!data.pagination.hasNextPage}
							class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Last
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
