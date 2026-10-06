<!-- src/routes/(authenticated)/(dock)/state/[id]/ElectionBanner.svelte -->

<script lang="ts">
	import FluentVote20Filled from "~icons/fluent/vote-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import { Button } from "#lib/component/ui/index.js";

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
	<div class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm p-5 space-y-3">
		<div class="flex items-start gap-3">
			<div class="size-12 bg-[#f2b01e]/20 rounded-sm flex items-center justify-center shrink-0">
				<FluentVote20Filled class="size-6 text-[#ffd35c]" />
			</div>
			<div class="flex-1 space-y-2">
				<h3 class="font-bold text-[#f5efd8] text-lg">Inaugural Election Scheduled! 🎉</h3>
				<p class="text-[#ffe58f]/90 text-sm">
					This state is brand new! The first democratic election will establish the founding parliament of
					<strong>{election.totalSeats} seats</strong>.
				</p>

				<div class="panel-muted rounded-sm p-3 space-y-2">
					<div class="flex items-center gap-2 text-sm">
						<FluentCalendar20Filled class="size-4 text-[#ffd35c]" />
						<span class="text-[#ffe58f]">
							<strong>Voting starts in:</strong>
							{timeUntil || "Starting soon!"}
						</span>
					</div>
					<div class="text-xs text-[#ffe58f]/70">
						<strong>Start:</strong>
						{new Date(election.startDate).toLocaleString()}<br />
						<strong>End:</strong>
						{new Date(election.endDate).toLocaleString()}
					</div>
				</div>

				<div class="flex gap-2 pt-2">
					<Button href="/state/{stateId}/election/{election.id}" variant="primary" size="sm" icon={FluentVote20Filled}>
						View Election Details
					</Button>
					<Button href="/party/create" variant="secondary" size="sm">Create a Party</Button>
				</div>
			</div>
		</div>
	</div>
{:else if election?.isInaugural && election.status === "active"}
	<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm p-4">
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<FluentVote20Filled class="size-6 text-[#6fd14a] animate-pulse" />
				<div>
					<p class="font-semibold text-[#f5efd8]">Inaugural Election Now Active!</p>
					<p class="text-sm text-[#b9f29a]">Help establish the founding parliament - vote now!</p>
				</div>
			</div>
			<Button
				href="/state/{stateId}/election/{election.id}"
				variant="primary"
				size="sm"
				icon={FluentVote20Filled}
				class="animate-pulse"
			>
				Vote Now
			</Button>
		</div>
	</div>
{/if}
