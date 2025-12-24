<!-- src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentPassport20Filled from "~icons/fluent/passport-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import { formatDate, getDaysRemaining } from "$lib/utils/formatting.js";

	let { data } = $props();

	let selectedStateToSanction = $state("");
	let sanctionReason = $state("");
	let visaSettingsExpanded = $state(true);
	let pendingVisasExpanded = $state(true);
	let activeVisasExpanded = $state(false);
</script>

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentGlobe20Filled class="size-8 text-blue-400" />
				Foreign Affairs Ministry
			</h1>
			<p class="text-gray-400 mt-2">Manage international relations, visa policy, and residency for {data.state.name}</p>
		</div>

		<a
			href="/state/{data.state.id}"
			class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
		>
			Back to State
		</a>
	</div>

	<!-- Minister Info -->
	<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
		<div class="flex items-center gap-3">
			<div class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
				<FluentShield20Filled class="size-5 text-blue-400" />
			</div>
			<div>
				<p class="font-semibold text-white">Minister of Foreign Affairs</p>
				<p class="text-sm text-gray-400">Manage sanctions, visa policies, and entry requirements</p>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-2 gap-6">
		<!-- Left Column: Sanctions -->
		<div class="space-y-6">
			<!-- Sanctions Management -->
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
				<div class="flex items-center gap-2">
					<FluentWarning20Filled class="size-5 text-red-400" />
					<h2 class="text-lg font-semibold text-white">State Sanctions</h2>
				</div>

				<!-- Sanction Form -->
				<form method="POST" action="?/sanctionState" use:enhance class="space-y-4">
					<div>
						<label for="targetState" class="block text-sm font-medium text-gray-300 mb-2">
							Select State to Sanction
						</label>
						<select
							id="targetState"
							name="targetStateId"
							bind:value={selectedStateToSanction}
							class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-red-500/50"
							required
						>
							<option value="" disabled>Choose a state...</option>
							{#each data.otherStates as state}
								<option value={state.id}>{state.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="reason" class="block text-sm font-medium text-gray-300 mb-2">Sanction Reason</label>
						<textarea
							id="reason"
							name="reason"
							bind:value={sanctionReason}
							rows="3"
							placeholder="Provide a reason for the sanction..."
							class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-red-500/50"
							required
						></textarea>
					</div>

					<button
						type="submit"
						disabled={!selectedStateToSanction || !sanctionReason}
						class="btn w-full bg-red-600 hover:bg-red-500 border-0 text-white gap-2 disabled:opacity-50"
					>
						<FluentWarning20Filled class="size-5" />
						Impose Sanction
					</button>
				</form>

				<!-- Currently Sanctioned States -->
				{#if data.sanctionedStates.length > 0}
					<div class="border-t border-white/5 pt-4 space-y-2">
						<h3 class="text-sm font-semibold text-gray-400 uppercase">Currently Sanctioned</h3>
						{#each data.sanctionedStates as sanction}
							<div class="bg-red-600/10 border border-red-500/20 rounded-lg p-3">
								<div class="flex items-start justify-between gap-3">
									<div class="flex-1">
										<p class="font-semibold text-white">{sanction.targetState?.name}</p>
										<p class="text-xs text-gray-400 mt-1">
											Sanctioned {formatDate(sanction.sanctionedAt)}
										</p>
										<p class="text-sm text-gray-300 mt-2">{sanction.reason}</p>
									</div>
									<form method="POST" action="?/liftSanction" use:enhance>
										<input type="hidden" name="sanctionId" value={sanction.id} />
										<button
											type="submit"
											class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 gap-2"
										>
											<FluentCheckmark20Filled class="size-4" />
											Lift
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Column: Visa Management -->
		<div class="space-y-6">
			<!-- Visa Policy Settings -->
			<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
				<button
					onclick={() => (visaSettingsExpanded = !visaSettingsExpanded)}
					class="w-full flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors"
				>
					<div class="flex items-center gap-2">
						<FluentPassport20Filled class="size-5 text-purple-400" />
						<h2 class="text-lg font-semibold text-white">Visa Policy</h2>
					</div>
					<FluentSettings20Filled class="size-5 text-gray-400" />
				</button>

				{#if visaSettingsExpanded}
					<form
						method="POST"
						action="?/updateVisaSettings"
						use:enhance
						class="p-5 pt-0 space-y-4 border-t border-white/5"
					>
						<!-- Visa Required Toggle -->
						<div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
							<div>
								<p class="text-sm font-medium text-white">Require Visa for Entry</p>
								<p class="text-xs text-gray-400">Enable visa requirements for foreign visitors</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									name="visaRequired"
									value="true"
									checked={data.visaSettings.visaRequired}
									class="sr-only peer"
								/>
								<div
									class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"
								></div>
							</label>
						</div>

						<!-- Visa Cost -->
						<div>
							<label class="block text-sm font-medium text-gray-300 mb-2">Visa Cost</label>
							<input
								type="number"
								name="visaCost"
								value={data.visaSettings.visaCost}
								min="0"
								max="1000000"
								step="1000"
								class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
								required
							/>
							<p class="text-xs text-gray-500 mt-1">Price users pay for 2-week visa</p>
						</div>

						<!-- Tax Rate -->
						<div>
							<label class="block text-sm font-medium text-gray-300 mb-2">Tax Rate (%)</label>
							<input
								type="number"
								name="visaTaxRate"
								value={data.visaSettings.visaTaxRate}
								min="0"
								max="100"
								class="input w-full bg-slate-700/50 border-slate-600/30 text-white"
								required
							/>
							<p class="text-xs text-gray-500 mt-1">Percentage going to state treasury</p>
						</div>

						<!-- Auto Approve Toggle -->
						<div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
							<div>
								<p class="text-sm font-medium text-white">Auto-Approve Visas</p>
								<p class="text-xs text-gray-400">Instant approval or manual review</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									name="autoApprove"
									value="true"
									checked={data.visaSettings.autoApprove}
									class="sr-only peer"
								/>
								<div
									class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"
								></div>
							</label>
						</div>

						<button type="submit" class="btn w-full bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2">
							<FluentCheckmark20Filled class="size-5" />
							Save Visa Policy
						</button>
					</form>
				{/if}
			</div>

			<!-- Pending Visa Applications -->
			{#if data.pendingVisaApplications.length > 0}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
					<button
						onclick={() => (pendingVisasExpanded = !pendingVisasExpanded)}
						class="w-full flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors"
					>
						<div class="flex items-center gap-2">
							<FluentClock20Filled class="size-5 text-amber-400" />
							<h2 class="text-lg font-semibold text-white">Pending Visa Applications</h2>
							<span class="badge bg-amber-600/20 text-amber-300 border-amber-500/30">
								{data.pendingVisaApplications.length}
							</span>
						</div>
					</button>

					{#if pendingVisasExpanded}
						<div class="p-5 pt-0 space-y-3 border-t border-white/5">
							{#each data.pendingVisaApplications as application}
								<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
									<div class="flex items-start justify-between gap-3 mb-3">
										<div class="flex-1">
											<p class="font-semibold text-white">{application.user?.profile?.name || "Unknown User"}</p>
											<p class="text-xs text-gray-400 mt-1">
												Applied {formatDate(application.appliedAt)}
											</p>
											{#if application.purpose}
												<p class="text-sm text-gray-300 mt-2">{application.purpose}</p>
											{/if}
										</div>
									</div>

									<div class="flex gap-2">
										<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
											<input type="hidden" name="applicationId" value={application.id} />
											<input type="hidden" name="decision" value="approved" />
											<button
												type="submit"
												class="btn btn-sm w-full bg-green-600/20 hover:bg-green-600/30 border-green-500/30 text-green-400 gap-2"
											>
												<FluentCheckmark20Filled class="size-4" />
												Approve & Charge ${Number(data.visaSettings.visaCost).toLocaleString()}
											</button>
										</form>

										<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
											<input type="hidden" name="applicationId" value={application.id} />
											<input type="hidden" name="decision" value="rejected" />
											<button
												type="submit"
												class="btn btn-sm w-full bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400 gap-2"
											>
												<FluentDismiss20Filled class="size-4" />
												Reject
											</button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Active Visas -->
			<div class="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
				<button
					onclick={() => (activeVisasExpanded = !activeVisasExpanded)}
					class="w-full flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors"
				>
					<div class="flex items-center gap-2">
						<FluentPeople20Filled class="size-5 text-green-400" />
						<h2 class="text-lg font-semibold text-white">Active Visas</h2>
						<span class="badge bg-green-600/20 text-green-300 border-green-500/30">
							{data.activeVisas.length}
						</span>
					</div>
				</button>

				{#if activeVisasExpanded}
					<div class="p-5 pt-0 space-y-2 border-t border-white/5 max-h-96 overflow-y-auto">
						{#each data.activeVisas as visa}
							{@const daysLeft = getDaysRemaining(visa.expiresAt)}
							<div class="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 flex items-center justify-between">
								<div class="flex-1">
									<p class="font-medium text-white text-sm">{visa.user?.profile?.name || "Unknown User"}</p>
									<p class="text-xs text-gray-400">
										Expires {formatDate(visa.expiresAt)} ({daysLeft}d remaining)
									</p>
								</div>
								<form method="POST" action="?/revokeVisa" use:enhance>
									<input type="hidden" name="visaId" value={visa.id} />
									<input type="hidden" name="reason" value="Revoked by foreign minister" />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm("Revoke this visa?")) e.preventDefault();
										}}
										class="btn btn-sm bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-400"
									>
										<FluentDismiss20Filled class="size-4" />
										Revoke
									</button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Info Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<FluentGlobe20Filled class="inline size-4 text-blue-400 mb-1" />
			<p class="text-xs text-blue-300">Sanctions affect trade and diplomatic relations with other states</p>
		</div>
		<div class="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4">
			<FluentPassport20Filled class="inline size-4 text-purple-400 mb-1" />
			<p class="text-xs text-purple-300">Visas are valid for 2 weeks and generate tax revenue for the state</p>
		</div>
		<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
			<FluentWarning20Filled class="inline size-4 text-amber-400 mb-1" />
			<p class="text-xs text-amber-300">Manual approval allows you to control who can enter your state</p>
		</div>
	</div>
</div>
