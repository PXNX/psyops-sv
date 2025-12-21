<!-- src/routes/company/edit/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentClipboardTextEdit20Regular from "~icons/fluent/clipboard-text-edit-20-regular";

	let { data } = $props();

	let companyName = $state(data.company?.name || "");
	let description = $state(data.company?.description || "");
	let logo = $state(data.company?.logo || "");

	const hasChanges = $derived(
		companyName !== data.company?.name ||
			description !== (data.company?.description || "") ||
			logo !== (data.company?.logo || "")
	);
</script>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/company" class="btn btn-circle btn-ghost hover:bg-slate-700/50">←</a>
			<div>
				<h1 class="text-3xl font-bold text-white">Edit Company</h1>
				<p class="text-gray-400">Update your company information</p>
			</div>
		</div>
	</div>

	{#if data.company}
		<div method="POST" use:enhance class="space-y-6">
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-4">
				<div class="flex items-center gap-2">
					<FluentBuilding20Filled class="size-5 text-purple-400" />
					<h2 class="text-lg font-semibold text-white">Company Details</h2>
				</div>

				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
						Company Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={companyName}
						placeholder="e.g., Acme Industries"
						maxlength="100"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50"
					/>
				</div>

				<div>
					<label for="logo" class="block text-sm font-medium text-gray-300 mb-2">
						<FluentImage20Filled class="inline size-4" /> Logo URL (optional)
					</label>
					<input
						type="url"
						id="logo"
						name="logo"
						bind:value={logo}
						placeholder="https://example.com/logo.png"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50"
					/>
					{#if logo}
						<div class="mt-3">
							<p class="text-xs text-gray-400 mb-2">Preview:</p>
							<img src={logo} alt="Logo preview" class="size-16 rounded-lg object-cover border border-slate-600/30" />
						</div>
					{/if}
				</div>

				<div>
					<label for="description" class="block text-sm font-medium text-gray-300 mb-2">
						<FluentClipboardTextEdit20Regular class="inline size-4" /> Description (optional)
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={description}
						rows="4"
						placeholder="Describe your company's mission and activities..."
						class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50"
					></textarea>
				</div>
			</div>

			<div class="flex gap-3">
				<a href="/company" class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300">
					Cancel
				</a>
				<button
					type="submit"
					disabled={!hasChanges || !companyName.trim()}
					class="btn flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 disabled:opacity-50"
				>
					<FluentCheckmark20Filled class="size-5" />
					Save Changes
				</button>
			</div>

			<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
				<p class="text-sm text-blue-300">
					💡 <strong>Note:</strong> Your company information will be visible to other users. Changes are saved immediately
					upon submission.
				</p>
			</div>
		</div>
	{:else}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-8 text-center">
			<p class="text-red-300">You don't have a company to edit. Create one first!</p>
			<a href="/company/create" class="btn mt-4 bg-purple-600/20 border-purple-500/30 text-purple-300">
				Create Company
			</a>
		</div>
	{/if}
</div>
