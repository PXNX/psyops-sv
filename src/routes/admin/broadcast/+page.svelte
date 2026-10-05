<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, Badge } from "#lib/component/ui/index.js";

	import { formatDateTime } from "#lib/utils/formatting.js";

	const { data, form } = $props();

	let subject = $state("");
	let content = $state("");
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);

	function resetForm() {
		subject = "";
		content = "";
		showConfirmation = false;
	}
</script>

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader
		title="Global Broadcast"
		subtitle="Publish a broadcast visible on every user's dashboard"
		icon={FluentMegaphone20Filled}
		backHref="/admin"
		backLabel="Admin Panel"
	/>

	<!-- Current Active Broadcast -->
	{#if data.activeBroadcast}
		<div class="bg-[#e6a527]/12 rounded-sm border border-[#e6a527]/35 p-5">
			<div class="flex items-start justify-between gap-3">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<FluentMegaphone20Filled class="size-5 text-[#f7c56b]" />
						<h3 class="font-semibold text-[#f7c56b]">Active Broadcast</h3>
					</div>
					<h4 class="text-[#fff7e8] font-bold text-lg mb-1">{data.activeBroadcast.title}</h4>
					<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{data.activeBroadcast.content}</p>
					<p class="text-xs text-[#a89e8e] mt-2">
						By {data.activeBroadcast.issuer?.profile?.name || "Admin"} · {formatDateTime(
							data.activeBroadcast.createdAt
						)}
					</p>
				</div>
				<form method="POST" action="?/revokeBroadcast" use:enhance>
					<input type="hidden" name="broadcastId" value={data.activeBroadcast.id} />
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
			action="?/sendBroadcast"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === "success") {
						resetForm();
					}
					await update();
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<label class="field-label flex items-center justify-between">
						<span>Subject</span>
						<span class="text-xs font-normal text-[#a89e8e] font-mono">{subject.length}/200</span>
					</label>
					<input
						type="text"
						name="subject"
						bind:value={subject}
						placeholder="Enter broadcast subject..."
						maxlength="200"
						class="field-control rounded-sm px-3 py-2.5 w-full"
						required
						disabled={isSubmitting}
					/>
				</div>

				<div>
					<label class="field-label flex items-center justify-between">
						<span>Message</span>
						<span class="text-xs font-normal text-[#a89e8e] font-mono">{content.length}/2000</span>
					</label>
					<textarea
						name="content"
						bind:value={content}
						placeholder="Enter your broadcast message..."
						rows="8"
						maxlength="2000"
						class="field-control rounded-sm px-3 py-2.5 w-full text-sm"
						required
						disabled={isSubmitting}></textarea>
				</div>

				<!-- Preview -->
				{#if subject || content}
					<div class="panel-muted rounded-sm p-4">
						<div class="flex items-center gap-2 mb-3">
							<FluentInfo20Filled class="size-4 text-[#7ba0c8]" />
							<h3 class="text-sm font-semibold text-[#d9ccb7]">Preview</h3>
						</div>
						<div class="space-y-2">
							{#if subject}
								<p class="text-[#fff7e8] font-semibold">{subject}</p>
							{/if}
							{#if content}
								<p class="text-[#d9ccb7] whitespace-pre-wrap text-sm">{content}</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if form?.error}
					<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
						<FluentWarning20Filled class="size-5 shrink-0" />
						<p>{form.error}</p>
					</div>
				{/if}

				{#if form?.success}
					<div
						class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center gap-3"
					>
						<FluentSend20Filled class="size-5 shrink-0" />
						<p>{form.message}</p>
					</div>
				{/if}

				<!-- Confirmation -->
				<label class="flex cursor-pointer items-center justify-start gap-3 panel-muted rounded-sm p-4">
					<input type="checkbox" bind:checked={showConfirmation} class="checkbox checkbox-error" />
					<span class="text-sm text-[#d9ccb7]">
						I confirm this broadcast should be shown to all users
						{#if data.activeBroadcast}
							(replaces the current active broadcast)
						{/if}
					</span>
				</label>

				<!-- Actions -->
				<div class="flex gap-3">
					<Button type="button" variant="secondary" grow onclick={resetForm} disabled={isSubmitting}>Clear</Button>
					<Button
						type="submit"
						variant="danger"
						grow
						icon={FluentMegaphone20Filled}
						disabled={isSubmitting || !showConfirmation || !subject || !content}
					>
						{isSubmitting ? "Publishing..." : "Publish Broadcast"}
					</Button>
				</div>
			</div>
		</form>
	</div>

	<!-- Recent Broadcasts -->
	{#if data.recentBroadcasts.length > 0}
		<div class="panel rounded-sm p-5">
			<h3 class="section-title mb-4">Recent Broadcasts</h3>
			<div class="space-y-3">
				{#each data.recentBroadcasts as broadcast}
					<div class="panel-muted rounded-sm p-4 {broadcast.isActive ? 'border-[#e6a527]/35' : ''}">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<h4 class="text-[#fff7e8] font-semibold">{broadcast.title}</h4>
									{#if broadcast.isActive}
										<Badge tone="amber">Active</Badge>
									{:else}
										<Badge tone="neutral">Inactive</Badge>
									{/if}
								</div>
								<p class="text-[#a89e8e] text-sm mt-1 line-clamp-2">{broadcast.content}</p>
								<p class="text-xs text-[#a89e8e] mt-1">
									By {broadcast.issuer?.profile?.name || "Admin"} · {formatDateTime(broadcast.createdAt)}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</PageContainer>
