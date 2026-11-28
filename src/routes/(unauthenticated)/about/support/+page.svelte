<script lang="ts">
	import Seo from "#lib/component/Seo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentBug20Filled from "~icons/fluent/bug-20-filled";
	import FluentMail20Filled from "~icons/fluent/mail-20-filled";

	const contactEmail = "support@psyops.app";
	let contact = $state({ name: "", email: "", subject: "", message: "" });
	let bug = $state({ title: "", description: "", severity: "Low - Minor issue" });

	function mail(subject: string, body: string) {
		window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}
</script>

<Seo
	title="Support · PsyOps"
	description="Contact the PsyOps team, ask a question or report a bug. We are here to help with the game and your account."
/>

<PageContainer maxWidth="4xl" class="py-12">
	<div class="animate-soft-in space-y-8">
		<header class="flex items-start gap-3 border-b border-line/20 pb-5">
			<span
				class="flex size-12 items-center justify-center rounded-sm border border-friendly/30 bg-friendly-bg/18 text-friendly-fg"
			>
				<FluentChat20Filled class="size-6" />
			</span>
			<div>
				<h1 class="font-serif text-3xl text-heading">Support</h1>
				<p class="mt-1 text-sm text-fg-soft">Questions, feedback or something broken? We want to hear about it.</p>
			</div>
		</header>

		<div class="grid gap-4 md:grid-cols-2">
			<section class="panel rounded-sm p-5">
				<h2 class="section-title flex items-center gap-2 text-base">
					<FluentMail20Filled class="size-4" /> Contact us
				</h2>
				<div class="mt-4 space-y-3">
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="block">
							<span class="field-label">Name</span><input
								class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
								bind:value={contact.name}
							/>
						</label>
						<label class="block">
							<span class="field-label">Email</span><input
								type="email"
								class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
								bind:value={contact.email}
							/>
						</label>
					</div>
					<label class="block">
						<span class="field-label">Subject</span><input
							class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
							bind:value={contact.subject}
						/>
					</label>
					<label class="block">
						<span class="field-label">Message</span><textarea
							rows="5"
							class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
							bind:value={contact.message}></textarea>
					</label>
					<Button
						variant="primary"
						disabled={!contact.message.trim()}
						onclick={() =>
							mail(
								contact.subject || "Contact from PsyOps",
								`From: ${contact.name} <${contact.email}>\n\n${contact.message}`
							)}
					>
						Open email
					</Button>
				</div>
			</section>

			<section class="panel rounded-sm p-5">
				<h2 class="section-title flex items-center gap-2 text-base">
					<FluentBug20Filled class="size-4" /> Report a bug
				</h2>
				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="field-label">Title</span><input
							class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
							bind:value={bug.title}
						/>
					</label>
					<label class="block">
						<span class="field-label">What happened?</span><textarea
							rows="5"
							class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"
							bind:value={bug.description}></textarea>
					</label>
					<label class="block">
						<span class="field-label">Severity</span>
						<select class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm" bind:value={bug.severity}>
							<option>Low - Minor issue</option><option>Medium - Affects functionality</option>
							<option>High - Major issue</option><option>Critical - App breaking</option>
						</select>
					</label>
					<Button
						variant="secondary"
						disabled={!bug.title.trim()}
						onclick={() => mail(`[Bug] ${bug.title}`, `Severity: ${bug.severity}\n\n${bug.description}`)}
					>
						Open report
					</Button>
				</div>
			</section>
		</div>
	</div>
</PageContainer>

<style>
	h1,
	h2 {
		font-family: var(--font-serif);
		color: var(--color-heading);
	}
</style>
