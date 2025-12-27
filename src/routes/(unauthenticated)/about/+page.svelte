<script lang="ts">
	import MaterialSymbolsPrivacyTipRounded from "~icons/material-symbols/privacy-tip-rounded";
	import FluentDocumentText20Filled from "~icons/fluent/document-text-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentBug20Filled from "~icons/fluent/bug-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentBookInformation20Filled from "~icons/fluent/book-information-20-filled";
	import FluentCertificate20Filled from "~icons/fluent/certificate-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import Modal from "$lib/component/Modal.svelte";

	const version = "0.0.1";
	let bugModalOpen = $state(false);
	let bugForm = $state({
		title: "",
		description: "",
		severity: "Low - Minor issue"
	});
</script>

<div class="relative min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 overflow-hidden">
	<!-- Background Pattern -->
	<div
		class="absolute inset-0 opacity-10"
		style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px);"
	></div>
	<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"></div>

	<div class="relative z-10 max-w-4xl mx-auto px-4 py-12 space-y-12">
		<!-- Header -->
		<div class="flex flex-col items-center space-y-6">
			<div class="relative">
				<div
					class="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full blur-2xl opacity-50"
				></div>
				<div
					class="relative size-32 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/10"
				>
					<img alt="app logo" class="w-24 h-24" src="/logo.svg" />
				</div>
			</div>
			<div class="text-center space-y-3">
				<h1
					class="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent"
				>
					About
				</h1>
				<p class="text-gray-400 max-w-md mx-auto">A global political simulation platform</p>
				<div
					class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-full"
				>
					<FluentInfo20Filled class="size-4 text-purple-400" />
					<span class="text-sm text-gray-300">Version {version}</span>
				</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="grid md:grid-cols-2 gap-6">
			<!-- Support Card -->
			<div class="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
				<h2 class="text-2xl font-bold text-white flex items-center gap-3">
					<div class="size-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
						<FluentMail20Filled class="size-5 text-purple-400" />
					</div>
					Support
				</h2>
				<div class="space-y-2">
					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 transition-all group"
						href="#"
					>
						<div
							class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors"
						>
							<FluentMail20Filled class="size-5 text-purple-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Contact Us</p>
							<p class="text-xs text-gray-400">Get help from our team</p>
						</div>
					</a>

					<button
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-pink-500/30 transition-all group w-full"
						onclick={() => (bugModalOpen = true)}
					>
						<div
							class="size-10 bg-pink-600/20 rounded-lg flex items-center justify-center group-hover:bg-pink-600/30 transition-colors"
						>
							<FluentBug20Filled class="size-5 text-pink-400" />
						</div>
						<div class="flex-1 text-left">
							<p class="text-white font-medium">Report Bug</p>
							<p class="text-xs text-gray-400">Help us improve</p>
						</div>
					</button>

					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-blue-500/30 transition-all group"
						href="/docs"
					>
						<div
							class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors"
						>
							<FluentDocument20Filled class="size-5 text-blue-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Documentation</p>
							<p class="text-xs text-gray-400">Learn how it works</p>
						</div>
					</a>

					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-emerald-500/30 transition-all group"
						href="/docs/intro"
					>
						<div
							class="size-10 bg-emerald-600/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors"
						>
							<FluentBookInformation20Filled class="size-5 text-emerald-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Wiki</p>
							<p class="text-xs text-gray-400">Community knowledge</p>
						</div>
					</a>
				</div>
			</div>

			<!-- Legal Card -->
			<div class="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
				<h2 class="text-2xl font-bold text-white flex items-center gap-3">
					<div class="size-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
						<FluentDocumentText20Filled class="size-5 text-blue-400" />
					</div>
					Legal
				</h2>
				<div class="space-y-2">
					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 transition-all group"
						href="/about/terms"
					>
						<div
							class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors"
						>
							<FluentDocumentText20Filled class="size-5 text-purple-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Terms of Service</p>
							<p class="text-xs text-gray-400">User agreement</p>
						</div>
					</a>

					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-pink-500/30 transition-all group"
						href="/about/privacy"
					>
						<div
							class="size-10 bg-pink-600/20 rounded-lg flex items-center justify-center group-hover:bg-pink-600/30 transition-colors"
						>
							<MaterialSymbolsPrivacyTipRounded class="size-5 text-pink-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Privacy Policy</p>
							<p class="text-xs text-gray-400">Your data rights</p>
						</div>
					</a>

					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-blue-500/30 transition-all group"
						href="#"
					>
						<div
							class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors"
						>
							<FluentCertificate20Filled class="size-5 text-blue-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Licenses</p>
							<p class="text-xs text-gray-400">Open source info</p>
						</div>
					</a>

					<a
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-emerald-500/30 transition-all group"
						href="#"
					>
						<div
							class="size-10 bg-emerald-600/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors"
						>
							<FluentImage20Filled class="size-5 text-emerald-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Icons & Assets</p>
							<p class="text-xs text-gray-400">Design credits</p>
						</div>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Bug Report Modal -->
<Modal bind:open={bugModalOpen} title="Report a Bug" size="default">
	<div class="space-y-4">
		<div class="form-control">
			<label class="label" for="bug-title">
				<span class="label-text">Bug Title</span>
			</label>
			<input
				id="bug-title"
				type="text"
				placeholder="Brief description of the issue"
				class="input input-bordered bg-slate-700/50 border-white/10"
				bind:value={bugForm.title}
			/>
		</div>

		<div class="form-control">
			<label class="label" for="bug-description">
				<span class="label-text">Description</span>
			</label>
			<textarea
				id="bug-description"
				class="textarea textarea-bordered bg-slate-700/50 border-white/10 h-32"
				placeholder="Describe what happened, what you expected, and steps to reproduce..."
				bind:value={bugForm.description}
			></textarea>
		</div>

		<div class="form-control">
			<label class="label" for="bug-severity">
				<span class="label-text">Severity</span>
			</label>
			<select
				id="bug-severity"
				class="select select-bordered bg-slate-700/50 border-white/10"
				bind:value={bugForm.severity}
			>
				<option>Low - Minor issue</option>
				<option>Medium - Affects functionality</option>
				<option>High - Major issue</option>
				<option>Critical - App breaking</option>
			</select>
		</div>

		<div class="flex gap-2 justify-end pt-4">
			<button class="btn btn-ghost" onclick={() => (bugModalOpen = false)}> Cancel </button>
			<button class="btn btn-primary gap-2">
				<FluentBug20Filled class="size-4" />
				Submit Report
			</button>
		</div>
	</div>
</Modal>
