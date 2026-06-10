<script lang="ts">
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";

	interface Props {
		cooldownEndsAt: string;
		entityName?: string;
	}

	let { cooldownEndsAt, entityName = "this" }: Props = $props();

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours >= 24) {
			const days = Math.floor(hours / 24);
			const remainingHours = hours % 24;
			return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
		} else if (hours >= 1) {
			return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		const d = new Date(cooldownEnd);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
</script>

<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
	<div class="flex items-start gap-3">
		<FluentClock20Filled class="size-6 text-red-400 shrink-0 mt-0.5" />
		<div class="space-y-2 flex-1">
			<h3 class="font-semibold text-red-300 text-lg">Edit Cooldown Active</h3>
			<p class="text-red-200/90 text-sm leading-relaxed">
				{entityName.charAt(0).toUpperCase() + entityName.slice(1)} was recently edited. You must wait before making another change.
			</p>
			<div class="bg-red-900/30 rounded-lg p-3 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-red-100 text-sm font-medium">Time Remaining:</span>
					<span class="text-red-100 text-sm font-bold">{formatTimeRemaining(cooldownEndsAt)}</span>
				</div>
				<div class="flex items-center justify-between text-xs">
					<span class="text-red-200/70">Available on:</span>
					<span class="text-red-200/90">{formatCooldownDate(cooldownEndsAt)}</span>
				</div>
			</div>
		</div>
	</div>
</div>
