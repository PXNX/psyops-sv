<!-- src/routes/(authenticated)/admin/broadcast/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";

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
			<p class="text-sm text-gray-400">Send announcements to all users</p>
		</div>
	</div>

	<!-- Statistics -->
	<div class="bg-blue-600/10 rounded-xl border border-blue-500/20 p-5 mb-6">
		<div class="flex items-center gap-3">
			<FluentPeople20Filled class="size-8 text-blue-400" />
			<div>
				<p class="text-xs text-gray-400">Total Recipients</p>
				<p class="text-2xl font-bold text-white">{data.totalUsers.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<!-- Warning Notice -->
	<div class="bg-amber-600/10 rounded-xl border border-amber-500/20 p-4 mb-6">
		<div class="flex items-start gap-3">
			<FluentWarning20Filled class="size-5 text-amber-400 mt-0.5" />
			<div class="flex-1">
				<h3 class="font-semibold text-amber-400 mb-1">Important Notice</h3>
				<p class="text-sm text-gray-300">
					This will send a message to <strong>all {data.totalUsers.toLocaleString()} users</strong> in the system. Please
					ensure your message is appropriate and necessary. This action cannot be undone.
				</p>
			</div>
		</div>
	</div>

	<!-- Broadcast Form -->
	<div class="bg-slate-800/50 rounded-xl border border-white/5 p-6">
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
						placeholder="Enter your broadcast message...

Examples:
- System maintenance announcements
- New feature releases
- Important policy updates
- Community events"
						rows="12"
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
								<div>
									<p class="text-xs text-gray-500 mb-1">Subject:</p>
									<p class="text-white font-semibold">{subject}</p>
								</div>
							{/if}
							{#if content}
								<div>
									<p class="text-xs text-gray-500 mb-1">Message:</p>
									<p class="text-gray-300 whitespace-pre-wrap text-sm">{content}</p>
								</div>
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

				<!-- Confirmation Checkbox -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3 bg-slate-700/30 rounded-lg p-4">
						<input type="checkbox" bind:checked={showConfirmation} class="checkbox checkbox-error" />
						<span class="label-text text-gray-300">
							I confirm this message is appropriate and necessary to send to all {data.totalUsers.toLocaleString()} users
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
						<FluentSend20Filled class="size-5" />
						{isSubmitting ? "Sending..." : `Send to ${data.totalUsers.toLocaleString()} Users`}
					</button>
				</div>
			</div>
		</form>
	</div>

	<!-- Usage Guidelines -->
	<div class="bg-slate-800/30 rounded-xl border border-white/5 p-6 mt-6">
		<h3 class="text-lg font-semibold text-white mb-3">Broadcasting Guidelines</h3>
		<ul class="space-y-2 text-sm text-gray-300">
			<li class="flex items-start gap-2">
				<span class="text-blue-400">•</span>
				<span>Use broadcasts for important system-wide announcements only</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-400">•</span>
				<span>Keep messages clear, concise, and professional</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-400">•</span>
				<span>Include relevant dates, times, and action items when applicable</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-400">•</span>
				<span>Avoid excessive use - users should not be overwhelmed with broadcasts</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-400">•</span>
				<span>All broadcasts are logged and can be audited</span>
			</li>
		</ul>
	</div>
</div>
