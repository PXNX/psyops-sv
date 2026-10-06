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
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import { formatDate, getDaysRemaining } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	let { data } = $props();

	let selectedStateToSanction = $state("");
	let sanctionReason = $state("");
	let pendingVisasExpanded = $state(true);
	let activeVisasExpanded = $state(false);
	let pendingResidenceExpanded = $state(true);
</script>

<PageContainer maxWidth="6xl">
	<!-- Header with State Info -->
	<PageHeader
		title="Ministry of Foreign Affairs"
		subtitle={data.isPresident ? "👑 Accessing as President" : undefined}
		icon={FluentGlobe20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	<div class="grid lg:grid-cols-2 gap-6">
		<!-- Left Column: Sanctions -->
		<div class="space-y-6">
			<!-- Sanctions Management -->
			<div class="panel rounded-sm p-5">
				<h2 class="section-title">
					<FluentWarning20Filled class="size-5 text-red-400" />
					State Sanctions
				</h2>

				<!-- Sanction Form -->
				<form method="POST" action="?/sanctionState" use:enhance class="space-y-4 mt-4">
					<div>
						<label class="field-label" for="targetState">Select State to Sanction</label>
						<select
							id="targetState"
							name="targetStateId"
							bind:value={selectedStateToSanction}
							class="field-control rounded-sm px-3 py-2.5 w-full"
							required
						>
							<option value="" disabled>Choose a state...</option>
							{#each data.otherStates as state}
								<option value={state.id}>{state.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="field-label" for="reason">Sanction Reason</label>
						<textarea
							id="reason"
							name="reason"
							bind:value={sanctionReason}
							rows="3"
							placeholder="Provide a reason for the sanction..."
							class="field-control rounded-sm px-3 py-2.5 w-full"
							required></textarea>
					</div>

					<Button
						type="submit"
						variant="danger"
						block
						icon={FluentWarning20Filled}
						disabled={!selectedStateToSanction || !sanctionReason}
					>
						Impose Sanction
					</Button>
				</form>

				<!-- Currently Sanctioned States -->
				{#if data.sanctionedStates.length > 0}
					<div class="border-t border-[#dfceb0]/10 my-5"></div>
					<h3 class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Currently Sanctioned</h3>
					<div class="space-y-3 mt-2">
						{#each data.sanctionedStates as sanction}
							<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4 flex items-start gap-3">
								<div class="flex-1 min-w-0">
									<p class="font-semibold text-red-300">{sanction.targetState?.name}</p>
									<p class="text-xs text-[#a89e8e] mt-1">
										Sanctioned {formatDate(sanction.sanctionedAt)}
									</p>
									<p class="text-sm text-[#d9ccb7] mt-2">{sanction.reason}</p>
								</div>
								<form method="POST" action="?/liftSanction" use:enhance>
									<input type="hidden" name="sanctionId" value={sanction.id} />
									<Button type="submit" variant="ghost" size="sm" icon={FluentCheckmark20Filled}>Lift</Button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Pending Residence Applications -->
		{#if data.pendingApplications.length > 0}
			<div class="collapse collapse-arrow panel rounded-sm" class:collapse-open={pendingResidenceExpanded}>
				<input type="checkbox" bind:checked={pendingResidenceExpanded} />
				<div class="collapse-title font-semibold text-[#fff7e8] flex items-center gap-2">
					<FluentPeople20Filled class="size-5 text-[#7ba0c8]" />
					<span>Pending Residence Applications</span>
					<Badge tone="blue">{data.pendingApplications.length}</Badge>
				</div>
				<div class="collapse-content">
					<p class="text-sm text-[#a89e8e] mb-3">
						These users have applied for residence permits (citizenship) in your state.
					</p>
					<div class="space-y-3 pt-2">
						{#each data.pendingApplications as application}
							<div class="panel-muted rounded-sm p-4">
								<div class="mb-3">
									<p class="font-semibold text-[#fff7e8]">{application.user?.profile?.name || "Unknown User"}</p>
									<p class="text-xs text-[#a89e8e]">
										Applied {formatDate(application.appliedAt)}
									</p>
								</div>

								<div class="flex gap-2">
									<form method="POST" action="?/approveResidence" use:enhance class="flex-1">
										<input type="hidden" name="applicationId" value={application.id} />
										<Button type="submit" variant="soft-emerald" size="sm" block icon={FluentCheckmark20Filled}>
											Approve
										</Button>
									</form>

									<form method="POST" action="?/rejectResidence" use:enhance class="flex-1">
										<input type="hidden" name="applicationId" value={application.id} />
										<Button type="submit" variant="soft-red" size="sm" block icon={FluentDismiss20Filled}>
											Reject
										</Button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Right Column: Visa Management -->
		<div class="space-y-6">
			<!-- Visa Policy Settings -->
			<div class="panel rounded-sm p-5">
				<h2 class="section-title">
					<FluentBookCompass24Filled class="size-5 text-[#b7a0c5]" />
					Visa Policy
				</h2>
				<p class="text-sm text-[#a89e8e] mt-1">
					Enable visa requirements for foreign visitors. Visas are valid for 2 weeks. Users without regional residency
					need this to work.
				</p>

				{#if data.blocVisaOverride && data.blocInfo}
					<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-sm p-4 mt-4">
						<div class="flex items-start gap-3">
							<FluentFlag20Filled class="size-5 text-[#8fae88] mt-0.5 flex-shrink-0" />
							<div>
								<p class="font-semibold text-[#c6dfbf]">Bloc Visa-Free Override Active</p>
								<p class="text-sm text-[#c6dfbf]/70 mt-1">
									<a href="/bloc/{data.blocInfo.id}" class="underline hover:text-[#edfae7]">{data.blocInfo.name}</a>
									has visa-free travel enabled for member states. Residents of other member states can travel here without
									a visa, regardless of the visa policy below.
								</p>
							</div>
						</div>
					</div>
				{/if}

				<form method="POST" action="?/updateVisaSettings" use:enhance class="space-y-4 mt-4">
					<!-- Visa Required Toggle -->
					<label class="flex items-center gap-4 cursor-pointer">
						<input
							type="checkbox"
							name="visaRequired"
							value="true"
							checked={data.visaSettings.visaRequired}
							class="toggle border-[#dfceb0]/25 checked:border-[#e6a527] checked:bg-[#e6a527] checked:text-[#172a45]"
						/>
						<div>
							<span class="text-sm font-medium text-[#e5d8c1]">Require Visa for Entry</span>
							{#if data.blocVisaOverride}
								<span class="text-xs text-[#8fae88] ml-2">(overridden for bloc members)</span>
							{/if}
						</div>
					</label>

					<!-- Visa Cost -->
					<div>
						<label class="field-label" for="visaCost">Visa Application Cost</label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a89e8e]">$</span>
							<input
								id="visaCost"
								type="number"
								name="visaCost"
								value={data.visaSettings.visaCost}
								min="0"
								max="1000000"
								step="1000"
								class="field-control rounded-sm pl-7 pr-3 py-2.5 w-full font-mono"
								required
							/>
						</div>
					</div>

					<!-- Auto Approve Toggle -->
					<label class="flex items-center gap-4 cursor-pointer">
						<input
							type="checkbox"
							name="autoApprove"
							value="true"
							checked={data.visaSettings.autoApprove}
							class="toggle border-[#dfceb0]/25 checked:border-[#e6a527] checked:bg-[#e6a527] checked:text-[#172a45]"
						/>
						<div>
							<span class="text-sm font-medium text-[#e5d8c1]">Auto-Approve Visas</span>
						</div>
					</label>

					<Button type="submit" variant="primary" block icon={FluentCheckmark20Filled}>Save Visa Policy</Button>
				</form>
			</div>

			<!-- Pending Visa Applications -->
			{#if data.pendingVisaApplications.length > 0}
				<div class="collapse collapse-arrow panel rounded-sm" class:collapse-open={pendingVisasExpanded}>
					<input type="checkbox" bind:checked={pendingVisasExpanded} />
					<div class="collapse-title font-semibold text-[#fff7e8] flex items-center gap-2">
						<FluentClock20Filled class="size-5 text-[#f7c56b]" />
						<span>Pending Visa Applications</span>
						<Badge tone="amber">{data.pendingVisaApplications.length}</Badge>
					</div>
					<div class="collapse-content">
						<div class="space-y-3 pt-2">
							{#each data.pendingVisaApplications as application}
								<div class="panel-muted rounded-sm p-4">
									<div class="mb-3">
										<p class="font-semibold text-[#fff7e8]">{application.user?.profile?.name || "Unknown User"}</p>
										<p class="text-xs text-[#a89e8e]">
											Applied {formatDate(application.appliedAt)}
										</p>
										{#if application.purpose}
											<p class="text-sm text-[#d9ccb7] mt-2">{application.purpose}</p>
										{/if}
									</div>

									<div class="flex gap-2">
										<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
											<input type="hidden" name="applicationId" value={application.id} />
											<input type="hidden" name="decision" value="approved" />
											<Button type="submit" variant="soft-emerald" size="sm" block icon={FluentCheckmark20Filled}>
												Approve ${Number(data.visaSettings.visaCost).toLocaleString()}
											</Button>
										</form>

										<form method="POST" action="?/reviewVisaApplication" use:enhance class="flex-1">
											<input type="hidden" name="applicationId" value={application.id} />
											<input type="hidden" name="decision" value="rejected" />
											<Button type="submit" variant="soft-red" size="sm" block icon={FluentDismiss20Filled}>
												Reject
											</Button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Active Visas -->
			<div class="collapse collapse-arrow panel rounded-sm" class:collapse-open={activeVisasExpanded}>
				<input type="checkbox" bind:checked={activeVisasExpanded} />
				<div class="collapse-title font-semibold text-[#fff7e8] flex items-center gap-2">
					<FluentPeople20Filled class="size-5 text-[#8fae88]" />
					<span>Active Visas</span>
					<Badge tone="green">{data.activeVisas.length}</Badge>
				</div>
				<div class="collapse-content">
					<div class="space-y-2 pt-2 max-h-96 overflow-y-auto">
						{#each data.activeVisas as visa}
							{@const daysLeft = getDaysRemaining(visa.expiresAt)}
							<div class="panel-muted rounded-sm p-3 flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="font-medium text-sm text-[#fff7e8]">{visa.user?.profile?.name || "Unknown User"}</p>
									<p class="text-xs text-[#a89e8e]">
										Expires {formatDate(visa.expiresAt)} ({daysLeft}d left)
									</p>
								</div>
								<form method="POST" action="?/revokeVisa" use:enhance>
									<input type="hidden" name="visaId" value={visa.id} />
									<input type="hidden" name="reason" value="Revoked by foreign minister" />
									<Button
										type="submit"
										variant="soft-red"
										size="sm"
										icon={FluentDismiss20Filled}
										onclick={(e) => {
											if (!confirm("Revoke this visa?")) e.preventDefault();
										}}
									>
										Revoke
									</Button>
								</form>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</PageContainer>
