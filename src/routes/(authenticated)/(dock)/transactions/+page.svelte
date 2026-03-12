<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
</script>

<div class="p-4 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Transaktionsverlauf</h1>

    <div class="bg-white shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                {#each data.transactions as tx}
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-900">
                            {tx.description}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" class:text-green-600={tx.isIncome} class:text-red-600={!tx.isIncome}>
                            {tx.isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
