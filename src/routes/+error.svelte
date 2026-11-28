<!-- src/routes/+error.svelte -->
<!-- A field report for anything that went wrong: same visual language as the
     sign-in screen, with the status treated like a case number and the request
     ID kept prominent for support. -->
<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import FluentEmojiEyes from "~icons/fluent-emoji/eyes";
	import FluentEmojiKnockedOutFace from "~icons/fluent-emoji/knocked-out-face";
	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import { PUBLIC_TELEGRAM_BOT_USERNAME } from "$app/env/public";
	import Button from "#lib/component/ui/Button.svelte";
	import Seo from "#lib/component/Seo.svelte";
	import AuthShowcase from "#lib/component/AuthShowcase.svelte";

	const botUsername = (PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot").replace(/^@/, "");

	let canGoBack = $state(false);
	onMount(() => {
		canGoBack = history.length > 1;
	});

	const status = $derived(page.status || 500);
	const report = $derived.by(() => {
		switch (status) {
			case 404:
				return {
					icon: FluentEmojiEyes,
					label: "Nothing at this coordinate",
					title: "Page not found",
					text: "The route you followed doesn't lead anywhere. It may have moved, or the link may be out of date.",
					tone: "amber"
				};
			case 401:
				return {
					icon: FluentEmojiEyes,
					label: "Identification required",
					title: "Please sign in",
					text: "This briefing is for signed-in personnel. Sign in with the Telegram bot to continue.",
					tone: "blue"
				};
			case 403:
				return {
					icon: FluentEmojiEyes,
					label: "Clearance denied",
					title: "Access denied",
					text: page.error?.message || "You don't have permission to open this file.",
					tone: "red"
				};
			case 500:
				return {
					icon: FluentEmojiKnockedOutFace,
					label: "Systems offline",
					title: "Internal error",
					text: "Something unexpected happened while opening this page. The incident has been logged.",
					tone: "red"
				};
			default:
				return {
					icon: FluentEmojiKnockedOutFace,
					label: "Unexpected result",
					title: `Error ${status}`,
					text: page.error?.message || "Something went wrong while loading this page.",
					tone: "amber"
				};
		}
	});

	const ReportIcon = $derived(report.icon);
	const toneClass = $derived(
		report.tone === "red" ? "text-error" : report.tone === "blue" ? "text-primary-fg" : "text-warning"
	);
</script>

<Seo title="Incident report · PsyOps" description="Something went wrong on PsyOps." robots="noindex, nofollow" />

<main class="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-10">
	<AuthShowcase />

	<div class="relative z-10 w-full max-w-lg">
		<div class="panel animate-pop-in relative overflow-hidden rounded-sm">
			<!-- Report header -->
			<div
				class="flex items-center justify-between border-b border-line/20 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-fg-muted"
			>
				<span>Incident report</span>
				<span class="text-fg-faint">PsyOps · Operations</span>
			</div>

			<div class="px-6 py-8 text-center sm:px-9">
				<div class="relative mx-auto w-fit">
					<span class="absolute -inset-4 rounded-full bg-surface-4/40 blur-xl" aria-hidden="true"></span>
					<ReportIcon class="relative size-16" />
				</div>

				<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] {toneClass}">{report.label}</p>
				<p class="font-mono text-6xl font-black leading-none tracking-tight text-fg/12">{status}</p>
				<h1 class="-mt-5 font-serif text-3xl font-bold text-fg">{report.title}</h1>
				<p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fg-soft">{report.text}</p>

				{#if status !== 404}
					<p class="mt-3 break-all font-mono text-[11px] text-fg-muted">
						Route <span class="text-fg-body">{page.url.pathname}</span>
					</p>
				{/if}

				{#if page.error?.requestId}
					<div class="mt-5 rounded-sm border border-line/20 bg-surface-2/60 px-3 py-2.5 text-left">
						<p class="font-mono text-[10px] uppercase tracking-wide text-fg-muted">Request ID</p>
						<p class="mt-0.5 select-all font-mono text-xs font-semibold text-fg-body">{page.error.requestId}</p>
						<p class="mt-1 text-[11px] text-fg-muted">Please include this when reporting the issue.</p>
					</div>
				{/if}

				<div class="mt-6 flex flex-col gap-2">
					{#if status === 401}
						<Button href="/auth/login" variant="primary" size="lg" block icon={FluentArrowRight20Filled}>
							Sign in with the bot
						</Button>
					{:else if canGoBack}
						<Button variant="primary" size="lg" block icon={FluentEmojiLeftArrow} onclick={() => history.back()}>
							Go back
						</Button>
					{:else}
						<Button href="/" variant="primary" size="lg" block icon={FluentArrowRight20Filled}>Go to dashboard</Button>
					{/if}

					<Button
						href={`https://t.me/${botUsername}`}
						variant="ghost"
						size="sm"
						block
						icon={FluentEmojiEnvelopeWithArrow}
					>
						Report this incident
					</Button>
				</div>
			</div>
		</div>
	</div>
</main>
