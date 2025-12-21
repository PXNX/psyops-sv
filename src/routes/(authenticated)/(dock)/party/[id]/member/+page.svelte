<!-- src/routes/party/[id]/member/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentCalendar20Filled from "~icons/fluent/calendar-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";

	const { data, form } = $props();
</script>

<!-- Party Members -->
<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
	<h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
		<FluentPeople20Filled class="size-5" style="color: {data.party.color}" />
		Party Members ({data.members.length})
	</h2>

	{#if data.members.length > 0}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each data.members.filter((m) => m.role !== "leader") as member}
				<a
					href="/user/{member.userId}"
					class="bg-slate-700/30 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-all group"
				>
					{#if member.user.profile?.avatar}
						<img
							src={member.user.profile.avatar}
							alt={member.user.profile.name || "Member"}
							class="size-16 rounded-lg mb-2 mx-auto"
						/>
					{:else}
						<div
							class="size-16 rounded-lg flex items-center justify-center mb-2 mx-auto"
							style="background-color: {data.party.color}40"
						>
							<FluentPeople20Filled class="size-8" style="color: {data.party.color}" />
						</div>
					{/if}
					<p class="text-sm font-medium text-white text-center truncate group-hover:text-purple-400 transition-colors">
						{member.user.profile?.name || member.user.email}
					</p>
					{#if member.role === "deputy"}
						<p class="text-xs text-center mt-1" style="color: {data.party.color}">Deputy</p>
					{/if}
				</a>
			{/each}
		</div>
	{:else}
		<div class="text-center py-8">
			<p class="text-gray-400">No other members yet</p>
		</div>
	{/if}
</div>

<!-- TODO: move the option to delet the party to this members page   -->
