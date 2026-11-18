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
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import Badge from "#lib/component/ui/Badge.svelte";

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

<svelte:head>
	<title>{"About · PsyOps"}</title>
</svelte:head>

<PageContainer maxWidth="4xl" class="py-12 space-y-10">
	<!-- Header -->
	<div class="flex flex-col items-center space-y-5">
		<div class="panel size-32 rounded-sm flex items-center justify-center">
			<img loading="lazy" decoding="async" alt="app logo" class="w-24 h-24" src="/logo.svg" />
		</div>
		<div class="text-center space-y-3">
			<h1 class="text-4xl font-bold text-fg">About</h1>
			<p class="text-fg-muted max-w-md mx-auto">A global political simulation platform</p>
			<button
				class="inline-flex items-center gap-2 px-4 py-2 panel-muted rounded-sm cursor-pointer hover:bg-surface-9 hover:border-accent/40 transition-colors"
				onclick={() => (changelogSheetOpen = true)}
			>
				<FluentInfo20Filled class="size-4 text-accent-fg" />
				<span class="text-sm text-fg-soft">Version {data.version}</span>
				<span class="text-xs text-accent-fg">View Changelog</span>
			</button>
		</div>
	</div>

	<!-- Main Grid -->
	<div class="grid md:grid-cols-2 gap-6">
		<!-- Support Card -->
		<section class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentMail20Filled class="size-5 text-politics" />
				Support
			</h2>
			<div class="space-y-2">
				<button
					class="group panel-interactive rounded-sm p-4 flex items-center gap-3 w-full"
					onclick={() => (contactSheetOpen = true)}
				>
					<div
						class="size-10 bg-politics-bg/15 border-politics/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentMail20Filled class="size-5 text-politics-fg" />
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Contact Us</p>
						<p class="text-xs text-fg-muted">Get help from our team</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</button>

				<button
					class="group panel-interactive rounded-sm p-4 flex items-center gap-3 w-full"
					onclick={() => (bugSheetOpen = true)}
				>
					<div
						class="size-10 bg-politics-bg/15 border-politics/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentBug20Filled class="size-5 text-politics-fg" />
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Report Bug</p>
						<p class="text-xs text-fg-muted">Help us improve</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</button>

				<a class="group panel-interactive rounded-sm p-4 flex items-center gap-3" href="/docs">
					<div
						class="size-10 bg-friendly-bg/18 border-friendly/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentDocument20Filled class="size-5 text-friendly-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Documentation</p>
						<p class="text-xs text-fg-muted">Learn how it works</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</a>

				<a class="group panel-interactive rounded-sm p-4 flex items-center gap-3" href="/docs/intro">
					<div
						class="size-10 bg-positive-bg/18 border-positive/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentBookInformation20Filled class="size-5 text-positive-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Wiki</p>
						<p class="text-xs text-fg-muted">Community knowledge</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</a>
			</div>
		</section>

		<!-- Legal Card -->
		<section class="panel rounded-sm p-5 space-y-4">
			<h2 class="section-title">
				<FluentDocumentText20Filled class="size-5 text-friendly" />
				Legal
			</h2>
			<div class="space-y-2">
				<a class="group panel-interactive rounded-sm p-4 flex items-center gap-3" href="/about/terms">
					<div
						class="size-10 bg-politics-bg/15 border-politics/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentDocumentText20Filled class="size-5 text-politics-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Terms of Service</p>
						<p class="text-xs text-fg-muted">User agreement</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</a>

				<a class="group panel-interactive rounded-sm p-4 flex items-center gap-3" href="/about/privacy">
					<div
						class="size-10 bg-politics-bg/15 border-politics/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentPersonShield24Regular class="size-5 text-politics-fg" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Privacy Policy</p>
						<p class="text-xs text-fg-muted">Your data rights</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</a>

				<button
					class="group panel-interactive rounded-sm p-4 flex items-center gap-3 w-full"
					onclick={() => (licensesSheetOpen = true)}
				>
					<div
						class="size-10 bg-friendly-bg/18 border-friendly/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentCertificate20Filled class="size-5 text-friendly-fg" />
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Licenses</p>
						<p class="text-xs text-fg-muted">{data.licenses.length} open source packages</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</button>

				<button
					class="group panel-interactive rounded-sm p-4 flex items-center gap-3 w-full"
					onclick={() => (iconsSheetOpen = true)}
				>
					<div
						class="size-10 bg-positive-bg/18 border-positive/30 border rounded-sm flex items-center justify-center shrink-0"
					>
						<FluentImage20Filled class="size-5 text-positive-fg" />
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="font-medium text-fg group-hover:text-accent-hover transition-colors">Icons & Assets</p>
						<p class="text-xs text-fg-muted">Design credits</p>
					</div>
					<FluentChevronRight20Filled
						class="size-4 text-fg-muted group-hover:text-accent-hover transition-colors shrink-0"
					/>
				</button>
			</div>
		</section>
	</div>
</PageContainer>

<!-- Changelog Sheet -->
<BottomSheet bind:open={changelogSheetOpen} title="Changelog">
	<div class="space-y-6">
		{#each changelogEntries as entry}
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<Badge tone="amber" size="md" class="font-mono font-semibold rounded-sm">v{entry.version}</Badge>
					<span class="text-xs text-fg-muted">{entry.date}</span>
				</div>
				{#each entry.sections as section}
					<div>
						<h4 class="text-sm font-semibold text-fg mb-1.5">{section.title}</h4>
						<ul class="space-y-1">
							{#each section.items as item}
								<li class="text-sm text-fg-soft flex items-start gap-2">
									<span class="text-accent-fg mt-1">•</span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-fg-muted text-sm">No changelog entries available.</p>
		{/each}
	</div>
</BottomSheet>

<!-- Contact Sheet -->
<BottomSheet bind:open={contactSheetOpen} title="Contact Us">
	<div class="space-y-4">
		<p class="text-sm text-fg-muted">Have a question or need help? Send us a message and we'll get back to you.</p>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label class="field-label" for="contact-name">Name</label>
				<input
					id="contact-name"
					type="text"
					placeholder="Your name"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					bind:value={contactForm.name}
				/>
			</div>
			<div>
				<label class="field-label" for="contact-email">Email</label>
				<input
					id="contact-email"
					type="email"
					placeholder="you@example.com"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					bind:value={contactForm.email}
				/>
			</div>
		</div>

		<div>
			<label class="field-label" for="contact-subject">Subject</label>
			<input
				id="contact-subject"
				type="text"
				placeholder="What is this about?"
				class="field-control rounded-sm px-3 py-2.5 w-full"
				bind:value={contactForm.subject}
			/>
		</div>

		<div>
			<label class="field-label" for="contact-message">Message</label>
			<textarea
				id="contact-message"
				rows="4"
				placeholder="Write your message..."
				class="field-control rounded-sm px-3 py-2.5 w-full"
				bind:value={contactForm.message}></textarea>
		</div>

		<div class="flex gap-3 pt-2">
			<Button type="button" variant="secondary" grow onclick={() => (contactSheetOpen = false)}>Cancel</Button>
			<Button
				type="button"
				variant="primary"
				grow
				icon={FluentMail20Filled}
				disabled={!contactForm.message.trim()}
				onclick={submitContact}
			>
				Send Message
			</Button>
		</div>
	</div>
</BottomSheet>

<!-- Bug Report Sheet -->
<BottomSheet bind:open={bugSheetOpen} title="Report a Bug">
	<div class="space-y-4">
		<div>
			<label class="field-label" for="bug-title">Bug Title</label>
			<input
				id="bug-title"
				type="text"
				placeholder="Brief description of the issue"
				class="field-control rounded-sm px-3 py-2.5 w-full"
				bind:value={bugForm.title}
			/>
		</div>

		<div>
			<label class="field-label" for="bug-description">Description</label>
			<textarea
				id="bug-description"
				class="field-control rounded-sm px-3 py-2.5 w-full h-32"
				placeholder="Describe what happened, what you expected, and steps to reproduce..."
				bind:value={bugForm.description}></textarea>
		</div>

		<div>
			<label class="field-label" for="bug-severity">Severity</label>
			<select id="bug-severity" class="field-control rounded-sm px-3 py-2.5 w-full" bind:value={bugForm.severity}>
				<option>Low - Minor issue</option>
				<option>Medium - Affects functionality</option>
				<option>High - Major issue</option>
				<option>Critical - App breaking</option>
			</select>
		</div>

		<div class="flex gap-3 pt-2">
			<Button type="button" variant="secondary" grow onclick={() => (bugSheetOpen = false)}>Cancel</Button>
			<Button
				type="button"
				variant="primary"
				grow
				icon={FluentBug20Filled}
				disabled={!bugForm.title.trim()}
				onclick={submitBug}
			>
				Submit Report
			</Button>
		</div>
	</div>
</BottomSheet>

<!-- Licenses Sheet -->
<BottomSheet bind:open={licensesSheetOpen} title="Open Source Licenses">
	<div class="space-y-3">
		<p class="text-sm text-fg-muted">
			PsyOps is built with {data.licenses.length} open source packages. Thanks to all their maintainers.
		</p>
		<div class="space-y-2">
			{#each data.licenses as pkg}
				<div class="flex items-center justify-between gap-3 p-3 rounded-sm panel-muted">
					<div class="min-w-0">
						{#if pkg.url}
							<a
								href={pkg.url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-fg font-medium truncate flex items-center gap-1 hover:text-accent-hover transition-colors"
							>
								<span class="truncate">{pkg.name}</span>
								<FluentOpen20Filled class="size-3.5 shrink-0 text-fg-muted" />
							</a>
						{:else}
							<p class="text-fg font-medium truncate">{pkg.name}</p>
						{/if}
						<p class="text-xs text-fg-muted truncate">
							v{pkg.version}{pkg.author ? ` • ${pkg.author}` : ""}
						</p>
					</div>
					<span
						class="shrink-0 px-2 py-1 text-xs font-mono rounded-sm bg-positive-bg/18 text-positive-fg border border-positive/30"
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
		<p class="text-sm text-fg-muted">Icons are provided by the following open source icon sets via Iconify.</p>
		<div class="space-y-2">
			{#each data.iconSets as set}
				<div class="p-4 rounded-sm panel-muted space-y-1">
					<div class="flex items-center justify-between gap-3">
						<p class="text-fg font-medium">{set.name}</p>
						<span
							class="shrink-0 px-2 py-1 text-xs font-mono rounded-sm bg-positive-bg/18 text-positive-fg border border-positive/30"
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
					<p class="text-xs text-fg-muted">
						{#if set.author}
							{#if set.authorUrl}
								<a href={set.authorUrl} target="_blank" rel="noopener noreferrer" class="hover:text-accent-hover"
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
				<p class="text-fg-muted text-sm">No icon sets found.</p>
			{/each}
		</div>
	</div>
</BottomSheet>
