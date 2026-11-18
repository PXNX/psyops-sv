<!-- src/routes/(authenticated)/(dock)/inbox/+page.svelte -->
<!-- Broadcasts as telegrams: the ones on the wire now, and a blank to send a new one. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { tick } from "svelte";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";

	import { formatDateTime } from "#lib/utils/formatting.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { vanish } from "#lib/utils/motion.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
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

	const recipients = { state: "State residents", party: "Party members", bloc: "Bloc members" } as const;

	type ActiveBroadcast = NonNullable<typeof data.activeStateBroadcast>;

	const wire = $derived(
		[
			data.activeStateBroadcast && {
				kind: "state" as const,
				b: data.activeStateBroadcast as ActiveBroadcast,
				revoke: "revokeStateBroadcast"
			},
			data.activePartyBroadcast && {
				kind: "party" as const,
				b: data.activePartyBroadcast as ActiveBroadcast,
				revoke: "revokePartyBroadcast"
			},
			data.activeBlocBroadcast && {
				kind: "bloc" as const,
				b: data.activeBlocBroadcast as ActiveBroadcast,
				revoke: "revokeBlocBroadcast"
			}
		].filter((t) => !!t)
	);

	const kindIcon = { state: FluentBuildingGovernment20Filled, party: FluentPeople20Filled, bloc: FluentFlag20Filled };
</script>

{#if !data.canBroadcastState && !data.canBroadcastParty && !data.canBroadcastBloc}
	<PageContainer maxWidth="3xl">
		<div class="panel-muted rounded-sm p-12 text-center">
			<FluentMail20Filled class="size-10 text-[#a8a083] mx-auto mb-3 animate-idle-float" />
			<h2 class="text-xl font-bold text-[#f5efd8] mb-1">No telegraph access</h2>
			<p class="text-sm text-[#a8a083]">For presidents, party leaders and bloc leaders.</p>
		</div>
	</PageContainer>
{:else}
	<PageContainer maxWidth="3xl">
		<PageHeader title="Telegraph Office" icon={FluentMegaphone20Filled} />

		<!-- On the wire -->
		{#each wire as t (t.kind)}
			{@const Icon = kindIcon[t.kind]}
			<article
				out:vanish
				class="telegram relative rounded-sm text-[#2b2114] shadow-[0_3px_14px_rgba(0,0,0,0.45)] overflow-hidden"
			>
				<header
					class="flex items-center gap-2 px-4 py-2 border-b-2 border-[#2b2114]/70 font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
				>
					<Icon class="size-4" />
					<span>Telegram</span>
					<span class="ml-auto tracking-normal font-normal">{formatDateTime(t.b.createdAt)}</span>
				</header>
				<div class="px-4 py-3 font-mono uppercase">
					<p class="text-[10px] tracking-[0.2em] text-[#2b2114]/60">To: {recipients[t.kind]}</p>
					<h2 class="mt-1 text-base font-bold break-words">{t.b.title}</h2>
					<p class="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{t.b.content} STOP</p>
				</div>
				<footer class="flex items-center gap-3 px-4 py-2 border-t border-dashed border-[#2b2114]/30">
					{#if t.b.issuer}
						<span class="text-[10px] font-mono uppercase tracking-[0.2em] text-[#2b2114]/60">Sender</span>
						<span class="telegram-sender min-w-0">
							<UserLink id={t.b.issuer.id} name={t.b.issuer.profile?.name} size="xs" plain />
						</span>
					{/if}
					<form method="POST" action="?/{t.revoke}" use:enhance class="ml-auto">
						<input type="hidden" name="broadcastId" value={t.b.id} />
						<Button type="submit" variant="soft-red" size="xs" icon={FluentDismiss20Filled}>Revoke</Button>
					</form>
				</footer>
			</article>
		{/each}

		<!-- Telegram blank -->
		<section class="panel rounded-sm overflow-hidden">
			<div
				class="px-4 py-2 border-b border-[#c8b47a]/15 bg-[#0f120c]/50 font-mono text-[10px] uppercase tracking-[0.3em] text-[#a8a083]"
			>
				New telegram
			</div>

			<form
				method="POST"
				action="?/{actionByType[broadcastType]}"
				class="p-4 sm:p-5 space-y-4"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === "success") {
							broadcastSubject = "";
							broadcastContent = "";
						}
						await update();
						if (result.type === "success") {
							await tick();
							celebrate(document.querySelector(".telegram"));
						}
					};
				}}
			>
				{#if availableTypes.length > 1}
					<div>
						<span class="field-label">To</span>
						<div class="flex flex-wrap gap-2">
							{#if data.canBroadcastState}
								<Button
									type="button"
									grow
									size="sm"
									variant={broadcastType === "state" ? "soft-purple" : "subtle"}
									icon={FluentBuildingGovernment20Filled}
									onclick={() => (broadcastType = "state")}
								>
									State
								</Button>
							{/if}
							{#if data.canBroadcastParty}
								<Button
									type="button"
									grow
									size="sm"
									variant={broadcastType === "party" ? "soft-emerald" : "subtle"}
									icon={FluentPeople20Filled}
									onclick={() => (broadcastType = "party")}
								>
									Party
								</Button>
							{/if}
							{#if data.canBroadcastBloc}
								<Button
									type="button"
									grow
									size="sm"
									variant={broadcastType === "bloc" ? "soft-blue" : "subtle"}
									icon={FluentFlag20Filled}
									onclick={() => (broadcastType = "bloc")}
								>
									Bloc
								</Button>
							{/if}
						</div>
					</div>
				{:else}
					<p class="text-xs font-mono uppercase tracking-[0.2em] text-[#a8a083]">To: {recipients[broadcastType]}</p>
				{/if}

				<div>
					<label class="field-label" for="broadcast-subject">Subject</label>
					<input
						id="broadcast-subject"
						type="text"
						name="subject"
						bind:value={broadcastSubject}
						maxlength="200"
						class="field-control w-full rounded-sm px-3 py-2.5 font-mono"
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
						rows="7"
						maxlength="2000"
						class="field-control w-full rounded-sm px-3 py-2.5 font-mono"
						required
						disabled={isSubmitting}></textarea>
					<p class="field-hint font-mono text-right">{broadcastContent.length}/2000</p>
				</div>

				{#if form?.error}
					<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
						<FluentWarning20Filled class="size-5 shrink-0" />
						<p class="text-sm">{form.error}</p>
					</div>
				{/if}

				<Button
					type="submit"
					variant="primary"
					block
					icon={FluentSend20Filled}
					loading={isSubmitting}
					disabled={isSubmitting || !broadcastSubject || !broadcastContent}
				>
					Send telegram
				</Button>
			</form>
		</section>
	</PageContainer>
{/if}

<style>
	/* Telegram form paper: pale yellow with faint ruled lines. */
	.telegram {
		background:
			repeating-linear-gradient(180deg, transparent 0 23px, rgba(43, 33, 20, 0.06) 23px 24px),
			linear-gradient(160deg, #f3e7bf 0%, #e9dba9 100%);
	}

	/* The sender link sits on paper, so it takes ink colours. */
	.telegram-sender :global(span) {
		color: #2b2114;
	}
	.telegram-sender :global(a:hover span) {
		color: #8a5a00;
	}
</style>
