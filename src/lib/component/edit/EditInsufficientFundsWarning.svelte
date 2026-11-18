<script lang="ts">
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";

	interface Props {
		editCost: number;
		userBalance: number;
	}

	let { editCost, userBalance }: Props = $props();
</script>

<div class="bg-[#f5a524]/12 border border-[#f5a524]/35 rounded-sm p-5 space-y-3">
	<div class="flex items-start gap-3">
		<FluentMoney20Filled class="size-6 text-[#ffcb6b] shrink-0 mt-0.5" />
		<div class="space-y-2 flex-1">
			<h3 class="font-semibold text-[#ffcb6b] text-lg">Insufficient Funds</h3>
			<p class="text-[#dbe2f4] text-sm leading-relaxed">
				You need <strong>{editCost.toLocaleString()}</strong> currency to edit. You currently have
				<strong>{userBalance.toLocaleString()}</strong>.
			</p>
			<div class="panel-muted rounded-sm p-3">
				<p class="text-[#ffcb6b] text-sm font-medium">
					Needed: {(editCost - userBalance).toLocaleString()} more currency
				</p>
			</div>
		</div>
	</div>
</div>
