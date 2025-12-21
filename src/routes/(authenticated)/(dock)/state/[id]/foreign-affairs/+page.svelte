<!-- src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentSettings20Filled from "~icons/fluent/settings-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";

	let { data } = $props();

	let selectedStateToSanction = $state("");
	let sanctionReason = $state("");
	let selectedRegionSettings = $state<number | null>(null);
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white flex items-center gap-3">
				<FluentGlobe20Filled class="size-8 text-blue-400" />
				Foreign Affairs Ministry
			</h1>
			<p class="text-gray-400 mt-2">Manage international relations and residency policies for {data.state.name}</p>
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
				<p class="text-sm text-gray-400">You have authority to sanction states and manage residency policies</p>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-2 gap-6">
		<!-- Sanctions Management -->
		<div class="space-y-6">
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
								<option value={state.id}>
									{state.name}
									{#if state.isSanctioned}
										(Currently Sanctioned)
									{/if}
								</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="reason" class="block text-sm font-medium text-gray-300 mb-2"> Sanction Reason </label>
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
											Sanctioned {new Date(sanction.sanctionedAt).toLocaleDateString()}
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

		<!-- Residency Policies -->
		<div class="space-y-6">
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
				<div class="flex items-center gap-2">
					<FluentHome20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Residency Policies</h2>
				</div>

				<p class="text-sm text-gray-400">Configure how residence permits are handled in each region</p>

				<!-- Region Settings -->
				<div class="space-y-3">
					{#each data.regions as region}
						<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
							<div class="flex items-center justify-between mb-3">
								<div>
									<p class="font-semibold text-white">{region.name}</p>
									<p class="text-xs text-gray-400">Population: {region.population?.toLocaleString() || 0}</p>
								</div>
								<button
									type="button"
									class="btn btn-sm bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 gap-2"
									onclick={() => {
										selectedRegionSettings = selectedRegionSettings === region.id ? null : region.id;
									}}
								>
									<FluentSettings20Filled class="size-4" />
									Settings
								</button>
							</div>

							{#if selectedRegionSettings === region.id}
								<form
									method="POST"
									action="?/updateResidencyPolicy"
									use:enhance
									class="space-y-3 pt-3 border-t border-white/5"
								>
									<input type="hidden" name="regionId" value={region.id} />

									<div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
										<div>
											<p class="text-sm font-medium text-white">Auto-Approve Residence Permits</p>
											<p class="text-xs text-gray-400">Automatically grant residence permits without approval</p>
										</div>
										<label class="swap">
											<input type="checkbox" name="autoApprove" value="1" checked={region.autoApproveResidency === 1} />
											<div class="swap-on">
												<FluentCheckmark20Filled class="size-6 text-green-400" />
											</div>
											<div class="swap-off">
												<FluentDismiss20Filled class="size-6 text-red-400" />
											</div>
										</label>
									</div>

									<button
										type="submit"
										class="btn btn-sm w-full bg-purple-600 hover:bg-purple-500 border-0 text-white gap-2"
									>
										<FluentCheckmark20Filled class="size-4" />
										Save Policy
									</button>
								</form>
							{/if}

							<div class="mt-3">
								<span
									class="px-2 py-1 rounded text-xs font-medium {region.autoApproveResidency === 1
										? 'bg-green-600/20 text-green-400 border border-green-500/30'
										: 'bg-amber-600/20 text-amber-400 border border-amber-500/30'}"
								>
									{region.autoApproveResidency === 1 ? "Auto-Approve Enabled" : "Manual Approval Required"}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pending Applications -->
			{#if data.pendingApplications.length > 0}
				<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
					<div class="flex items-center gap-2">
						<FluentHome20Filled class="size-5 text-amber-400" />
						<h2 class="text-lg font-semibold text-white">Pending Applications</h2>
						<span class="badge bg-amber-600/20 text-amber-300 border-amber-500/30">
							{data.pendingApplications.length}
						</span>
					</div>

					<div class="space-y-3">
						{#each data.pendingApplications as application}
							<div class="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
								<div class="flex items-start justify-between gap-3 mb-3">
									<div>
										<p class="font-semibold text-white">{application.user?.profile?.name || "Unknown User"}</p>
										<p class="text-sm text-gray-400">Applied to: {application.region?.name}</p>
										<p class="text-xs text-gray-500 mt-1">
											{new Date(application.appliedAt).toLocaleDateString()}
										</p>
									</div>
								</div>

								<div class="flex gap-2">
									<form method="POST" action="?/reviewApplication" use:enhance class="flex-1">
										<input type="hidden" name="applicationId" value={application.id} />
										<input type="hidden" name="decision" value="approved" />
										<button
											type="submit"
											class="btn btn-sm w-full bg-green-600/20 hover:bg-green-600/30 border-green-500/30 text-green-400 gap-2"
										>
											<FluentCheckmark20Filled class="size-4" />
											Approve
										</button>
									</form>

									<form method="POST" action="?/reviewApplication" use:enhance class="flex-1">
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
				</div>
			{/if}
		</div>
	</div>

	<!-- Info Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
			<FluentGlobe20Filled class="inline size-4 text-blue-400 mb-1" />
			<p class="text-xs text-blue-300">Sanctions affect trade and diplomatic relations with other states</p>
		</div>
		<div class="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4">
			<FluentWarning20Filled class="inline size-4 text-amber-400 mb-1" />
			<p class="text-xs text-amber-300">Manual approval allows you to control who can settle in your regions</p>
		</div>
		<div class="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4">
			<FluentSettings20Filled class="inline size-4 text-purple-400 mb-1" />
			<p class="text-xs text-purple-300">Each region can have different residency policies</p>
		</div>
	</div>
</div>
