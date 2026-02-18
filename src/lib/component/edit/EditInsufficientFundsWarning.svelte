<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";

	interface Props {
		editCost: number;
		userBalance: number;
	}

	let { editCost, userBalance }: Props = $props();
</script>

<div class="bg-amber-600/20 border border-amber-500/30 rounded-xl p-5 space-y-3">
	<div class="flex items-start gap-3">
		<FluentMoney20Filled class="size-6 text-amber-400 shrink-0 mt-0.5" />
		<div class="space-y-2 flex-1">
			<h3 class="font-semibold text-amber-300 text-lg">Insufficient Funds</h3>
			<p class="text-amber-200/90 text-sm leading-relaxed">
				You need <strong>{editCost.toLocaleString()}</strong> currency to edit. You currently have
				<strong>{userBalance.toLocaleString()}</strong>.
			</p>
			<div class="bg-amber-900/30 rounded-lg p-3">
				<p class="text-amber-100 text-sm font-medium">
					Needed: {(editCost - userBalance).toLocaleString()} more currency
				</p>
			</div>
		</div>
	</div>
</div>
