<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";

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

<div class="max-w-4xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-6">
		<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center">
			<FluentMegaphone20Filled class="size-6 text-red-400" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-white">Global Broadcast</h1>
			<p class="text-sm text-gray-400">Publish a broadcast visible on every user's dashboard</p>
		</div>
	</div>

	<!-- Current Active Broadcast -->
	{#if data.activeBroadcast}
		<div class="bg-amber-600/10 rounded-xl border border-amber-500/20 p-5 mb-6">
			<div class="flex items-start justify-between gap-3">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<FluentMegaphone20Filled class="size-5 text-amber-400" />
						<h3 class="font-semibold text-amber-400">Active Broadcast</h3>
					</div>
					<h4 class="text-white font-bold text-lg mb-1">{data.activeBroadcast.title}</h4>
					<p class="text-gray-300 whitespace-pre-wrap text-sm">{data.activeBroadcast.content}</p>
					<p class="text-xs text-gray-500 mt-2">
						By {data.activeBroadcast.issuer?.profile?.name || "Admin"} · {new Date(data.activeBroadcast.createdAt).toLocaleString()}
					</p>
				</div>
				<form method="POST" action="?/revokeBroadcast" use:enhance>
					<input type="hidden" name="broadcastId" value={data.activeBroadcast.id} />
					<button type="submit" class="btn btn-sm bg-red-600/20 hover:bg-red-600/40 border-red-500/30 text-red-400">
						<FluentDismiss20Filled class="size-4" />
						Revoke
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Broadcast Form -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6 mb-6">
		<h2 class="text-lg font-bold text-white mb-4">New Broadcast</h2>
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
					<label class="label">
						<span class="label-text text-gray-300">Subject</span>
						<span class="label-text-alt text-gray-500">{subject.length}/200</span>
					</label>
					<input
						type="text"
						name="subject"
						bind:value={subject}
						placeholder="Enter broadcast subject..."
						maxlength="200"
						class="input input-bordered w-full bg-slate-700/50 border-slate-600/30 text-white"
						required
						disabled={isSubmitting}
					/>
				</div>

				<div>
					<label class="label">
						<span class="label-text text-gray-300">Message</span>
						<span class="label-text-alt text-gray-500">{content.length}/2000</span>
					</label>
					<textarea
						name="content"
						bind:value={content}
						placeholder="Enter your broadcast message..."
						rows="8"
						maxlength="2000"
						class="textarea textarea-bordered w-full bg-slate-700/50 border-slate-600/30 text-white font-mono text-sm"
						required
						disabled={isSubmitting}
					></textarea>
				</div>

				<!-- Preview -->
				{#if subject || content}
					<div class="bg-slate-700/30 rounded-lg p-4 border border-white/5">
						<div class="flex items-center gap-2 mb-3">
							<FluentInfo20Filled class="size-4 text-blue-400" />
							<h3 class="text-sm font-semibold text-gray-300">Preview</h3>
						</div>
						<div class="space-y-2">
							{#if subject}
								<p class="text-white font-semibold">{subject}</p>
							{/if}
							{#if content}
								<p class="text-gray-300 whitespace-pre-wrap text-sm">{content}</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if form?.error}
					<div class="alert alert-error">
						<FluentWarning20Filled class="size-5" />
						<p>{form.error}</p>
					</div>
				{/if}

				{#if form?.success}
					<div class="alert alert-success">
						<FluentSend20Filled class="size-5" />
						<p>{form.message}</p>
					</div>
				{/if}

				<!-- Confirmation -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3 bg-slate-700/30 rounded-lg p-4">
						<input type="checkbox" bind:checked={showConfirmation} class="checkbox checkbox-error" />
						<span class="label-text text-gray-300">
							I confirm this broadcast should be shown to all users
							{#if data.activeBroadcast}
								(replaces the current active broadcast)
							{/if}
						</span>
					</label>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						type="button"
						onclick={resetForm}
						class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300"
						disabled={isSubmitting}
					>
						Clear
					</button>
					<button
						type="submit"
						class="btn flex-1 bg-red-600 hover:bg-red-700 border-0 text-white gap-2"
						disabled={isSubmitting || !showConfirmation || !subject || !content}
					>
						<FluentMegaphone20Filled class="size-5" />
						{isSubmitting ? "Publishing..." : "Publish Broadcast"}
					</button>
				</div>
			</div>
		</form>
	</div>

	<!-- Recent Broadcasts -->
	{#if data.recentBroadcasts.length > 0}
		<div class="bg-slate-800/30 rounded-xl border border-white/5 p-6">
			<h3 class="text-lg font-semibold text-white mb-4">Recent Broadcasts</h3>
			<div class="space-y-3">
				{#each data.recentBroadcasts as broadcast}
					<div class="bg-slate-700/30 rounded-lg p-4 border {broadcast.isActive ? 'border-amber-500/30' : 'border-white/5'}">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<h4 class="text-white font-semibold">{broadcast.title}</h4>
									{#if broadcast.isActive}
										<span class="badge badge-sm bg-amber-600/30 text-amber-400 border-amber-500/30">Active</span>
									{:else}
										<span class="badge badge-sm bg-slate-600/30 text-gray-400 border-slate-500/30">Inactive</span>
									{/if}
								</div>
								<p class="text-gray-400 text-sm mt-1 line-clamp-2">{broadcast.content}</p>
								<p class="text-xs text-gray-500 mt-1">
									By {broadcast.issuer?.profile?.name || "Admin"} · {new Date(broadcast.createdAt).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
