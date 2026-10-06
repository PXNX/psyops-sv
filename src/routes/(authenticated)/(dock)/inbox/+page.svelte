<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	import { formatDateTime } from "#lib/utils/formatting.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";

	const { data, form } = $props();

	let broadcastType = $state<"state" | "party" | "bloc">("state");
	let broadcastSubject = $state("");
	let broadcastContent = $state("");
	let isSubmitting = $state(false);

	const availableTypes = $derived(
		[
			data.canBroadcastState && ("state" as const),
			data.canBroadcastParty && ("party" as const),
			data.canBroadcastBloc && ("bloc" as const)
		].filter((t) => t !== false)
	);

	$effect(() => {
		if (!availableTypes.includes(broadcastType) && availableTypes.length > 0) {
			broadcastType = availableTypes[0];
		}
	});

	const actionByType = { state: "broadcastState", party: "broadcastParty", bloc: "broadcastBloc" } as const;
</script>

{#if !data.canBroadcastState && !data.canBroadcastParty && !data.canBroadcastBloc}
	<PageContainer maxWidth="4xl">
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-[#1a1f15] mb-4">
				<FluentMail20Filled class="size-8 text-[#a8a083]" />
			</div>
			<h2 class="text-xl font-bold text-[#f5efd8] mb-2">No Broadcast Access</h2>
			<p class="text-[#a8a083]">Only presidents, party leaders and bloc leaders can send broadcast messages.</p>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="3xl">
		<PageHeader
			title="Broadcast"
			icon={FluentMegaphone20Filled}
			subtitle="Publish a broadcast shown on the dashboard of {[
				data.canBroadcastState && 'state residents',
				data.canBroadcastParty && 'party members',
				data.canBroadcastBloc && 'bloc members'
			]
				.filter(Boolean)
				.join(' or ')}"
		/>

		<!-- Active Broadcasts -->
		{#if data.activeStateBroadcast}
			<div class="bg-[#8a4fc0]/15 rounded-sm border border-[#c08cf0]/30 p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2">
							<FluentBuildingGovernment20Filled class="size-5 text-[#c08cf0]" />
							<h3 class="font-semibold text-[#e3cbfb]">Active State Broadcast</h3>
						</div>
						<h4 class="text-[#f5efd8] font-bold mb-1">{data.activeStateBroadcast.title}</h4>
						<p class="text-[#d3caa9] whitespace-pre-wrap text-sm">{data.activeStateBroadcast.content}</p>
						<p class="text-xs text-[#a8a083] mt-2">
							{formatDateTime(data.activeStateBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokeStateBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activeStateBroadcast.id} />
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</div>
			</div>
		{/if}

		{#if data.activePartyBroadcast}
			<div class="bg-[#3f8a2a]/18 rounded-sm border border-[#6fd14a]/30 p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2">
							<FluentPeople20Filled class="size-5 text-[#6fd14a]" />
							<h3 class="font-semibold text-[#b9f29a]">Active Party Broadcast</h3>
						</div>
						<h4 class="text-[#f5efd8] font-bold mb-1">{data.activePartyBroadcast.title}</h4>
						<p class="text-[#d3caa9] whitespace-pre-wrap text-sm">{data.activePartyBroadcast.content}</p>
						<p class="text-xs text-[#a8a083] mt-2">
							{formatDateTime(data.activePartyBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokePartyBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activePartyBroadcast.id} />
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</div>
			</div>
		{/if}

		{#if data.activeBlocBroadcast}
			<div class="bg-[#2369b5]/18 rounded-sm border border-[#5eaef5]/30 p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2">
							<FluentFlag20Filled class="size-5 text-[#5eaef5]" />
							<h3 class="font-semibold text-[#b3dcff]">Active Bloc Broadcast</h3>
						</div>
						<h4 class="text-[#f5efd8] font-bold mb-1">{data.activeBlocBroadcast.title}</h4>
						<p class="text-[#d3caa9] whitespace-pre-wrap text-sm">{data.activeBlocBroadcast.content}</p>
						<p class="text-xs text-[#a8a083] mt-2">
							{formatDateTime(data.activeBlocBroadcast.createdAt)}
						</p>
					</div>
					<form method="POST" action="?/revokeBlocBroadcast" use:enhance>
						<input type="hidden" name="broadcastId" value={data.activeBlocBroadcast.id} />
						<Button type="submit" variant="soft-red" size="sm" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</div>
			</div>
		{/if}

		<!-- Broadcast Form -->
		<div class="panel rounded-sm p-5">
			<h2 class="section-title mb-4">New Broadcast</h2>

			<form
				method="POST"
				action="?/{actionByType[broadcastType]}"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === "success") {
							broadcastSubject = "";
							broadcastContent = "";
						}
						await update();
					};
				}}
			>
				<div class="space-y-4">
					{#if availableTypes.length > 1}
						<div>
							<span class="field-label">Broadcast To</span>
							<div class="flex gap-2">
								{#if data.canBroadcastState}
									<Button
										type="button"
										grow
										variant={broadcastType === "state" ? "soft-purple" : "subtle"}
										icon={FluentBuildingGovernment20Filled}
										onclick={() => (broadcastType = "state")}
									>
										State Residents
									</Button>
								{/if}
								{#if data.canBroadcastParty}
									<Button
										type="button"
										grow
										variant={broadcastType === "party" ? "soft-emerald" : "subtle"}
										icon={FluentPeople20Filled}
										onclick={() => (broadcastType = "party")}
									>
										Party Members
									</Button>
								{/if}
								{#if data.canBroadcastBloc}
									<Button
										type="button"
										grow
										variant={broadcastType === "bloc" ? "soft-blue" : "subtle"}
										icon={FluentFlag20Filled}
										onclick={() => (broadcastType = "bloc")}
									>
										Bloc Members
									</Button>
								{/if}
							</div>
						</div>
					{/if}

					<div>
						<label class="field-label" for="broadcast-subject">Subject</label>
						<input
							id="broadcast-subject"
							type="text"
							name="subject"
							bind:value={broadcastSubject}
							placeholder="Enter broadcast subject..."
							maxlength="200"
							class="field-control w-full rounded-sm px-3 py-2.5"
							required
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label class="field-label" for="broadcast-content">Message</label>
						<textarea
							id="broadcast-content"
							name="content"
							bind:value={broadcastContent}
							placeholder="Enter your broadcast message..."
							rows="8"
							maxlength="2000"
							class="field-control w-full rounded-sm px-3 py-2.5"
							required
							disabled={isSubmitting}></textarea>
						<p class="field-hint">{broadcastContent.length}/2000 characters</p>
					</div>

					{#if form?.error}
						<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
							<FluentWarning20Filled class="size-5 shrink-0" />
							<p class="text-sm">{form.error}</p>
						</div>
					{/if}

					{#if form?.success}
						<div
							class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3"
						>
							<FluentSend20Filled class="size-5 shrink-0" />
							<p class="text-sm">Broadcast published!</p>
						</div>
					{/if}

					<Button
						type="submit"
						variant="primary"
						block
						icon={FluentSend20Filled}
						disabled={isSubmitting || !broadcastSubject || !broadcastContent}
					>
						{isSubmitting ? "Publishing..." : "Publish Broadcast"}
					</Button>
				</div>
			</form>
		</div>
	</PageContainer>
{/if}
