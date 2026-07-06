<script lang="ts">
	import FluentPersonShield24Regular from "~icons/fluent/person-shield-24-regular";
	import FluentDocumentText20Filled from "~icons/fluent/document-text-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";
	import FluentBug20Filled from "~icons/fluent/bug-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentBookInformation20Filled from "~icons/fluent/book-information-20-filled";
	import FluentCertificate20Filled from "~icons/fluent/certificate-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentOpen20Filled from "~icons/fluent/open-20-filled";
	import BottomSheet from "$lib/component/BottomSheet.svelte";

	let { data } = $props();

	const contactEmail = "support@psyops.app";

	let bugSheetOpen = $state(false);
	let changelogSheetOpen = $state(false);
	let contactSheetOpen = $state(false);
	let licensesSheetOpen = $state(false);
	let iconsSheetOpen = $state(false);

	let bugForm = $state({
		title: "",
		description: "",
		severity: "Low - Minor issue"
	});

	let contactForm = $state({
		name: "",
		email: "",
		subject: "",
		message: ""
	});

	function submitContact() {
		const body = `From: ${contactForm.name} <${contactForm.email}>\n\n${contactForm.message}`;
		const subject = contactForm.subject || "Contact from PsyOps";
		window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		contactSheetOpen = false;
	}

	function submitBug() {
		const subject = `[Bug] ${bugForm.title || "Untitled"}`;
		const body = `Severity: ${bugForm.severity}\n\n${bugForm.description}`;
		window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		bugSheetOpen = false;
	}

	function parseChangelog(
		raw: string
	): { version: string; date: string; sections: { title: string; items: string[] }[] }[] {
		const entries: { version: string; date: string; sections: { title: string; items: string[] }[] }[] = [];
		let current: (typeof entries)[0] | null = null;
		let currentSection: { title: string; items: string[] } | null = null;

		for (const line of raw.split("\n")) {
			const versionMatch = line.match(/^## \[(.+?)\]\s*-\s*(.+)$/);
			if (versionMatch) {
				if (current) entries.push(current);
				current = { version: versionMatch[1], date: versionMatch[2].trim(), sections: [] };
				currentSection = null;
				continue;
			}
			const sectionMatch = line.match(/^### (.+)$/);
			if (sectionMatch && current) {
				currentSection = { title: sectionMatch[1], items: [] };
				current.sections.push(currentSection);
				continue;
			}
			const itemMatch = line.match(/^- (.+)$/);
			if (itemMatch && currentSection) {
				currentSection.items.push(itemMatch[1]);
			}
		}
		if (current) entries.push(current);
		return entries;
	}

	const changelogEntries = $derived(parseChangelog(data.changelog));
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
					class="relative size-32 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl"
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
				<button
					class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-full cursor-pointer hover:bg-slate-700/50 hover:border-purple-500/30 transition-all"
					onclick={() => (changelogSheetOpen = true)}
				>
					<FluentInfo20Filled class="size-4 text-purple-400" />
					<span class="text-sm text-gray-300">Version {data.version}</span>
					<span class="text-xs text-purple-400">View Changelog</span>
				</button>
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
					<button
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 transition-all group w-full"
						onclick={() => (contactSheetOpen = true)}
					>
						<div
							class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/30 transition-colors"
						>
							<FluentMail20Filled class="size-5 text-purple-400" />
						</div>
						<div class="flex-1 text-left">
							<p class="text-white font-medium">Contact Us</p>
							<p class="text-xs text-gray-400">Get help from our team</p>
						</div>
					</button>

					<button
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-pink-500/30 transition-all group w-full"
						onclick={() => (bugSheetOpen = true)}
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
							<FluentPersonShield24Regular class="size-5 text-pink-400" />
						</div>
						<div class="flex-1">
							<p class="text-white font-medium">Privacy Policy</p>
							<p class="text-xs text-gray-400">Your data rights</p>
						</div>
					</a>

					<button
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-blue-500/30 transition-all group w-full"
						onclick={() => (licensesSheetOpen = true)}
					>
						<div
							class="size-10 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors"
						>
							<FluentCertificate20Filled class="size-5 text-blue-400" />
						</div>
						<div class="flex-1 text-left">
							<p class="text-white font-medium">Licenses</p>
							<p class="text-xs text-gray-400">{data.licenses.length} open source packages</p>
						</div>
					</button>

					<button
						class="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-emerald-500/30 transition-all group w-full"
						onclick={() => (iconsSheetOpen = true)}
					>
						<div
							class="size-10 bg-emerald-600/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors"
						>
							<FluentImage20Filled class="size-5 text-emerald-400" />
						</div>
						<div class="flex-1 text-left">
							<p class="text-white font-medium">Icons & Assets</p>
							<p class="text-xs text-gray-400">Design credits</p>
						</div>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Changelog Sheet -->
<BottomSheet bind:open={changelogSheetOpen} title="Changelog">
	<div class="space-y-6">
		{#each changelogEntries as entry}
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<span class="px-2.5 py-1 bg-purple-600/20 text-purple-300 text-sm font-mono font-semibold rounded-lg"
						>v{entry.version}</span
					>
					<span class="text-xs text-gray-400">{entry.date}</span>
				</div>
				{#each entry.sections as section}
					<div>
						<h4 class="text-sm font-semibold text-white mb-1.5">{section.title}</h4>
						<ul class="space-y-1">
							{#each section.items as item}
								<li class="text-sm text-gray-300 flex items-start gap-2">
									<span class="text-purple-400 mt-1">•</span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-400 text-sm">No changelog entries available.</p>
		{/each}
	</div>
</BottomSheet>

<!-- Contact Sheet -->
<BottomSheet bind:open={contactSheetOpen} title="Contact Us">
	<div class="space-y-4">
		<p class="text-sm text-gray-400">Have a question or need help? Send us a message and we'll get back to you.</p>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label class="label" for="contact-name">
					<span class="label-text text-gray-300">Name</span>
				</label>
				<input
					id="contact-name"
					type="text"
					placeholder="Your name"
					class="input input-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
					bind:value={contactForm.name}
				/>
			</div>
			<div>
				<label class="label" for="contact-email">
					<span class="label-text text-gray-300">Email</span>
				</label>
				<input
					id="contact-email"
					type="email"
					placeholder="you@example.com"
					class="input input-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
					bind:value={contactForm.email}
				/>
			</div>
		</div>

		<div>
			<label class="label" for="contact-subject">
				<span class="label-text text-gray-300">Subject</span>
			</label>
			<input
				id="contact-subject"
				type="text"
				placeholder="What is this about?"
				class="input input-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
				bind:value={contactForm.subject}
			/>
		</div>

		<div>
			<label class="label" for="contact-message">
				<span class="label-text text-gray-300">Message</span>
			</label>
			<textarea
				id="contact-message"
				rows="4"
				placeholder="Write your message..."
				class="textarea textarea-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
				bind:value={contactForm.message}></textarea>
		</div>

		<div class="flex gap-3 pt-2">
			<button type="button" class="btn flex-1 btn-ghost" onclick={() => (contactSheetOpen = false)}> Cancel </button>
			<button
				type="button"
				class="btn flex-1 btn-primary gap-2"
				disabled={!contactForm.message.trim()}
				onclick={submitContact}
			>
				<FluentMail20Filled class="size-4" />
				Send Message
			</button>
		</div>
	</div>
</BottomSheet>

<!-- Bug Report Sheet -->
<BottomSheet bind:open={bugSheetOpen} title="Report a Bug">
	<div class="space-y-4">
		<div>
			<label class="label" for="bug-title">
				<span class="label-text text-gray-300">Bug Title</span>
			</label>
			<input
				id="bug-title"
				type="text"
				placeholder="Brief description of the issue"
				class="input input-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500"
				bind:value={bugForm.title}
			/>
		</div>

		<div>
			<label class="label" for="bug-description">
				<span class="label-text text-gray-300">Description</span>
			</label>
			<textarea
				id="bug-description"
				class="textarea textarea-bordered w-full bg-slate-800 border-slate-700 text-white placeholder-gray-500 h-32"
				placeholder="Describe what happened, what you expected, and steps to reproduce..."
				bind:value={bugForm.description}></textarea>
		</div>

		<div>
			<label class="label" for="bug-severity">
				<span class="label-text text-gray-300">Severity</span>
			</label>
			<select
				id="bug-severity"
				class="select select-bordered w-full bg-slate-800 border-slate-700 text-white"
				bind:value={bugForm.severity}
			>
				<option>Low - Minor issue</option>
				<option>Medium - Affects functionality</option>
				<option>High - Major issue</option>
				<option>Critical - App breaking</option>
			</select>
		</div>

		<div class="flex gap-3 pt-2">
			<button type="button" class="btn flex-1 btn-ghost" onclick={() => (bugSheetOpen = false)}> Cancel </button>
			<button type="button" class="btn flex-1 btn-primary gap-2" disabled={!bugForm.title.trim()} onclick={submitBug}>
				<FluentBug20Filled class="size-4" />
				Submit Report
			</button>
		</div>
	</div>
</BottomSheet>

<!-- Licenses Sheet -->
<BottomSheet bind:open={licensesSheetOpen} title="Open Source Licenses">
	<div class="space-y-3">
		<p class="text-sm text-gray-400">
			PsyOps is built with {data.licenses.length} open source packages. Thanks to all their maintainers.
		</p>
		<div class="space-y-2">
			{#each data.licenses as pkg}
				<div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-white/5">
					<div class="min-w-0">
						{#if pkg.url}
							<a
								href={pkg.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-white font-medium truncate flex items-center gap-1 hover:text-emerald-300 transition-colors"
							>
								<span class="truncate">{pkg.name}</span>
								<FluentOpen20Filled class="size-3.5 shrink-0 text-gray-500" />
							</a>
						{:else}
							<p class="text-white font-medium truncate">{pkg.name}</p>
						{/if}
						<p class="text-xs text-gray-500 truncate">
							v{pkg.version}{pkg.author ? ` • ${pkg.author}` : ""}
						</p>
					</div>
					<span
						class="shrink-0 px-2 py-1 text-xs font-mono rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/20"
						>{pkg.license}</span
					>
				</div>
			{/each}
		</div>
	</div>
</BottomSheet>

<!-- Icons & Assets Sheet -->
<BottomSheet bind:open={iconsSheetOpen} title="Icons & Assets">
	<div class="space-y-3">
		<p class="text-sm text-gray-400">Icons are provided by the following open source icon sets via Iconify.</p>
		<div class="space-y-2">
			{#each data.iconSets as set}
				<div class="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
					<div class="flex items-center justify-between gap-3">
						<p class="text-white font-medium">{set.name}</p>
						<span
							class="shrink-0 px-2 py-1 text-xs font-mono rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/20"
						>
							{#if set.licenseUrl}
								<a href={set.licenseUrl} target="_blank" rel="noopener noreferrer" class="hover:underline"
									>{set.license}</a
								>
							{:else}
								{set.license}
							{/if}
						</span>
					</div>
					<p class="text-xs text-gray-500">
						{#if set.author}
							{#if set.authorUrl}
								<a href={set.authorUrl} target="_blank" rel="noopener noreferrer" class="hover:text-emerald-300"
									>{set.author}</a
								>
							{:else}
								{set.author}
							{/if}
						{/if}
						{#if set.total}
							{set.author ? " • " : ""}{set.total.toLocaleString()} icons
						{/if}
					</p>
				</div>
			{:else}
				<p class="text-gray-400 text-sm">No icon sets found.</p>
			{/each}
		</div>
	</div>
</BottomSheet>
