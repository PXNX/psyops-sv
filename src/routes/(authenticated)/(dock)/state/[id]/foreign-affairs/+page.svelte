<!-- src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentBookCompass24Filled from "~icons/fluent/book-compass-24-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import { formatDate, getDaysRemaining } from "$lib/utils/formatting.js";

	let { data } = $props();

	let selectedStateToSanction = $state("");
	let sanctionReason = $state("");
	let pendingVisasExpanded = $state(true);
	let activeVisasExpanded = $state(false);
</script>

<div class="container mx-auto px-4 py-6 max-w-7xl">
	<!-- Header with State Info -->
	<div class="mb-6">
		<div class="flex items-center justify-between mb-4">
			<a href="/state/{data.state.id}" class="btn btn-ghost btn-sm gap-2 hover:bg-base-200">
				<FluentArrowLeft20Filled class="size-4" />
				Back to State
			</a>

			{#if data.isPresident}
				<div class="badge badge-warning gap-1">👑 President Access</div>
			{/if}
		</div>

		<!-- State Banner -->
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body p-6">
				<div class="flex items-center gap-4">
					{#if data.state.logoUrl}
						<div class="avatar">
							<div class="w-16 h-16 rounded-xl">
								<img src={data.state.logoUrl} alt="{data.state.name} logo" />
							</div>
						</div>
					{/if}
					<div class="flex-1">
						<a href="/state/{data.state.id}" class="link link-hover">
							<h1 class="text-3xl font-bold flex items-center gap-2">
								{data.state.name}
							</h1>
						</a>
						<div class="flex items-center gap-2 mt-1 text-base-content/70">
							<FluentGlobe20Filled class="size-5 text-primary" />
							<span class="text-lg font-medium">Ministry of Foreign Affairs</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-2 gap-6">
		<!-- Left Column: Sanctions -->
		<div class="space-y-6">
			<!-- Sanctions Management -->
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-error gap-2">
						<FluentWarning20Filled class="size-5" />
						State Sanctions
					</h2>

					<!-- Sanction Form -->
					<form method="POST" action="?/sanctionState" use:enhance class="space-y-4 mt-4">
						<div class="form-control">
							<label class="label" for="targetState">
								<span class="label-text font-medium">Select State to Sanction</span>
							</label>
							<select
								id="targetState"
								name="targetStateId"
								bind:value={selectedStateToSanction}
								class="select select-bordered w-full"
								required
							>
								<option value="" disabled>Choose a state...</option>
								{#each data.otherStates as state}
									<option value={state.id}>{state.name}</option>
								{/each}
							</select>
						</div>

						<div class="form-control">
							<label class="label" for="reason">
								<span class="label-text font-medium">Sanction Reason</span>
							</label>
							<textarea
								id="reason"
								name="reason"
								bind:value={sanctionReason}
								rows="3"
								placeholder="Provide a reason for the sanction..."
								class="textarea textarea-bordered"
								required
							></textarea>
						</div>

						<button
							type="submit"
							disabled={!selectedStateToSanction || !sanctionReason}
							class="btn btn-error w-full gap-2"
						>
							<FluentWarning20Filled class="size-5" />
							Impose Sanction
						</button>
					</form>

					<!-- Currently Sanctioned States -->
					{#if data.sanctionedStates.length > 0}
						<div class="divider"></div>
						<h3 class="font-semibold text-sm opacity-70 uppercase">Currently Sanctioned</h3>
						<div class="space-y-3 mt-2">
							{#each data.sanctionedStates as sanction}
								<div class="alert alert-error">
									<div class="flex-1">
										<p class="font-semibold">{sanction.targetState?.name}</p>
										<p class="text-xs opacity-70 mt-1">
											Sanctioned {formatDate(sanction.sanctionedAt)}
										</p>
										<p class="text-sm mt-2">{sanction.reason}</p>
									</div>
									<form method="POST" action="?/liftSanction" use:enhance>
										<input type="hidden" name="sanctionId" value={sanction.id} />
										<button type="submit" class="btn btn-sm btn-ghost gap-2">
											<FluentCheckmark20Filled class="size-4" />
											Lift
										</button>
									</form>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right Column: Visa Management -->
		<div class="space-y-6">
			<!-- Visa Policy Settings -->
			<div class="card bg-base-200 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-secondary gap-2">
						<FluentBookCompass24Filled class="size-5" />
						Visa Policy
					</h2>
					<p class="text-sm opacity-70 mt-1">
						Enable visa requirements for foreign visitors. Visas are valid for 2 weeks. Users without regional residency
						need this to work.
					</p>

					<form method="POST" action="?/updateVisaSettings" use:enhance class="space-y-4 mt-4">
						<!-- Visa Required Toggle -->
						<div class="form-control">
							<label class="label cursor-pointer justify-start gap-4">
								<input
									type="checkbox"
									name="visaRequired"
									value="true"
									checked={data.visaSettings.visaRequired}
									class="toggle toggle-secondary"
								/>
								<div>
									<span class="label-text font-medium">Require Visa for Entry</span>
								</div>
							</label>
						</div>

						<!-- Visa Cost -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-medium">Visa Application Cost</span>
							</label>
							<label class="input-group">
								<span>$</span>
								<input
									type="number"
									name="visaCost"
									value={data.visaSettings.visaCost}
									min="0"
									max="1000000"
									step="1000"
									class="input input-bordered w-full"
									required
								/>
							</label>
						</div>

						<!-- Auto Approve Toggle -->
						<div class="form-control">
							<label class="label cursor-pointer justify-start gap-4">
								<input
									type="checkbox"
									name="autoApprove"
									value="true"
									checked={data.visaSettings.autoApprove}
									class="toggle toggle-secondary"
								/>
								<div>
									<span class="label-text font-medium">Auto-Approve Visas</span>
								</div>
							</label>
						</div>

						<button type="submit" class="btn btn-secondary w-full gap-2">
							<FluentCheckmark20Filled class="size-5" />
							Save Visa Policy
						</button>
					</form>
				</div>
			</div>

			<!-- Pending Visa Applications -->
			{#if data.pendingVisaApplications.length > 0}
				<div class="collapse collapse-arrow bg-base-200 shadow-xl" class:collapse-open={pendingVisasExpanded}>
					<input type="checkbox" bind:checked={pendingVisasExpanded} />
					<div class="collapse-title font-semibold flex items-center gap-2">
						<FluentClock20Filled class="size-5 text-warning" />
						<span>Pending Visa Applications</span>
						<div class="badge badge-warning">{data.pendingVisaApplications.length}</div>
					</div>
					<div class="collapse-content">
						<div class="space-y-3 pt-2">
							{#each data.pendingVisaApplications as application}
								<div class="card bg-base-300">
									<div class="card-body p-4">
										<div class="mb-3">
											<p class="font-semibold">{application.user?.profile?.name || "Unknown User"}</p>
											<p class="text-xs opacity-70">
												Applied {formatDate(application.appliedAt)}
											</p>
											{#if application.purpose}
												<p class="text-sm mt-2">{application.purpose}</p>
											{/if}
										</div>

										<div class="flex gap-2">
											<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
												<input type="hidden" name="applicationId" value={application.id} />
												<input type="hidden" name="decision" value="approved" />
												<button type="submit" class="btn btn-success btn-sm w-full gap-2">
													<FluentCheckmark20Filled class="size-4" />
													Approve ${Number(data.visaSettings.visaCost).toLocaleString()}
												</button>
											</form>

											<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
												<input type="hidden" name="applicationId" value={application.id} />
												<input type="hidden" name="decision" value="rejected" />
												<button type="submit" class="btn btn-error btn-sm w-full gap-2">
													<FluentDismiss20Filled class="size-4" />
													Reject
												</button>
											</form>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Active Visas -->
			<div class="collapse collapse-arrow bg-base-200 shadow-xl" class:collapse-open={activeVisasExpanded}>
				<input type="checkbox" bind:checked={activeVisasExpanded} />
				<div class="collapse-title font-semibold flex items-center gap-2">
					<FluentPeople20Filled class="size-5 text-success" />
					<span>Active Visas</span>
					<div class="badge badge-success">{data.activeVisas.length}</div>
				</div>
				<div class="collapse-content">
					<div class="space-y-2 pt-2 max-h-96 overflow-y-auto">
						{#each data.activeVisas as visa}
							{@const daysLeft = getDaysRemaining(visa.expiresAt)}
							<div class="card bg-base-300">
								<div class="card-body p-3 flex-row items-center justify-between">
									<div>
										<p class="font-medium text-sm">{visa.user?.profile?.name || "Unknown User"}</p>
										<p class="text-xs opacity-70">
											Expires {formatDate(visa.expiresAt)} ({daysLeft}d left)
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
											class="btn btn-error btn-sm btn-outline gap-2"
										>
											<FluentDismiss20Filled class="size-4" />
											Revoke
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
