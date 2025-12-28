<!-- src/routes/(authenticated)/(dock)/state/[id]/ElectionBanner.svelte -->

<script lang="ts">
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";

	// Props passed from page data
	let { election, stateId } = $props<{
		election: {
			id: number;
			startDate: Date;
			endDate: Date;
			status: string;
			isInaugural: number;
			totalSeats: number;
		} | null;
		stateId: number;
	}>();

	function getTimeUntilStart(startDate: Date) {
		const now = new Date();
		const start = new Date(startDate);
		const diff = start.getTime() - now.getTime();

		if (diff <= 0) return null;

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) return `${days} day${days !== 1 ? "s" : ""} and ${hours} hour${hours !== 1 ? "s" : ""}`;
		if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
		return "less than an hour";
	}

	const timeUntil = $derived(election?.status === "scheduled" ? getTimeUntilStart(election.startDate) : null);
</script>

{#if election?.isInaugural && election.status === "scheduled"}
	<div class="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-5 space-y-3">
		<div class="flex items-start gap-3">
			<div class="size-12 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
				<FluentVote20Filled class="size-6 text-purple-400" />
			</div>
			<div class="flex-1 space-y-2">
				<h3 class="font-bold text-white text-lg">Inaugural Election Scheduled! 🎉</h3>
				<p class="text-purple-200 text-sm">
					This state is brand new! The first democratic election will establish the founding parliament of
					<strong>{election.totalSeats} seats</strong>.
				</p>

				<div class="bg-purple-900/30 rounded-lg p-3 space-y-2">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-purple-400" />
						<span class="text-purple-100">
							<strong>Voting starts in:</strong>
							{timeUntil || "Starting soon!"}
						</span>
					</div>
					<div class="text-xs text-purple-200/80">
						<strong>Start:</strong>
						{new Date(election.startDate).toLocaleString()}<br />
						<strong>End:</strong>
						{new Date(election.endDate).toLocaleString()}
					</div>
				</div>

				<div class="flex gap-2 pt-2">
					<a
						href="/state/{stateId}/election/{election.id}"
						class="btn btn-sm bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
					>
						<FluentVote20Filled class="size-4" />
						View Election Details
					</a>
					<a href="/party/create" class="btn btn-sm bg-blue-600 hover:bg-blue-500 border-0 text-white">
						Create a Party
					</a>
				</div>
			</div>
		</div>
	</div>
{:else if election?.isInaugural && election.status === "active"}
	<div class="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<FluentVote20Filled class="size-6 text-green-400 animate-pulse" />
				<div>
					<p class="font-semibold text-white">Inaugural Election Now Active!</p>
					<p class="text-sm text-green-200">Help establish the founding parliament - vote now!</p>
				</div>
			</div>
			<a
				href="/state/{stateId}/election/{election.id}"
				class="btn btn-sm bg-green-600 hover:bg-green-500 border-0 text-white gap-2 animate-pulse"
			>
				<FluentVote20Filled class="size-4" />
				Vote Now
			</a>
		</div>
	</div>
{/if}
