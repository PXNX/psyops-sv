<script lang="ts">
	import * as m from "#lib/paraglide/messages.js";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentBot20Filled from "~icons/fluent/bot-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentShieldCheckmark20Filled from "~icons/fluent/shield-checkmark-20-filled";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import { PUBLIC_TELEGRAM_BOT_USERNAME } from "$app/env/public";
	import { page } from "$app/state";
	import Button from "#lib/component/ui/Button.svelte";
	import Seo from "#lib/component/Seo.svelte";
	import AuthShowcase from "#lib/component/AuthShowcase.svelte";

	const botUsername = (PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot").replace(/^@/, "");
	const botLink = `https://t.me/${botUsername}?start=login`;
	const next = $derived(page.url.searchParams.get("next") || "/");

	const errorMessages: Record<string, string> = {
		missing_params: "The bot login link expired before it was opened. Please try again.",
		invalid_signature: "Telegram couldn't verify that login. Please start again from the bot.",
		auth_expired: "That login took too long. Open the bot again and use a fresh button.",
		server_error: "Something went wrong while signing you in. Please try again."
	};
	const authError = $derived.by(() => {
		const code = page.url.searchParams.get("error");
		return code ? (errorMessages[code] ?? "Sign-in failed. Please try again.") : null;
	});

	const steps = [
		{ title: "Open the bot", text: "Tap the button and send /login if it doesn't start automatically." },
		{ title: "Tap the game button", text: "Telegram signs the request — no password, no extra app." },
		{ title: "Land on the board", text: "Your state, your newspapers and your forces are waiting." }
	];

	let awaitingBot = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let polls = 0;

	function startWaiting() {
		awaitingBot = true;
		polls = 0;
		clearInterval(pollTimer);
		pollTimer = setInterval(async () => {
			try {
				const res = await fetch("/api/auth/status");
				const data = (await res.json()) as { authenticated?: boolean };
				if (data.authenticated) {
					clearInterval(pollTimer);
					await goto(next);
					return;
				}
			} catch {
				// Keep waiting; a dropped poll is not a failed login.
			}
			if (++polls >= 40) {
				clearInterval(pollTimer);
				awaitingBot = false;
			}
		}, 3000);
	}

	onMount(() => () => clearInterval(pollTimer));
</script>

<Seo
	title="Sign in · PsyOps"
	description="Sign in to PsyOps with the Telegram bot: build a state, command your forces and shape the news."
	robots="noindex, follow"
/>

<main class="relative isolate flex min-h-dvh w-full flex-col justify-center overflow-hidden px-4 py-10 sm:px-8">
	<AuthShowcase />

	<div
		class="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
	>
		<!-- The pitch: what you are signing into. -->
		<section class="hidden max-w-xl lg:block">
			<p class="font-mono text-[11px] uppercase tracking-[0.28em] text-primary-fg">PsyOps · Field briefing</p>
			<h1 class="mt-3 font-serif text-5xl font-black leading-[1.05] text-fg">
				The world is your<br />briefing room.
			</h1>
			<p class="mt-4 max-w-md text-base leading-relaxed text-fg-soft">
				A living political simulation where states, armies, markets and newspapers all write the same story. Sign in
				with the bot and take your seat at the table.
			</p>
			<ol class="mt-8 space-y-3">
				{#each steps as step, i (step.title)}
					<li class="flex gap-3">
						<span
							class="grid size-7 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/12 font-mono text-xs font-bold text-primary-fg"
						>
							{i + 1}
						</span>
						<div>
							<p class="text-sm font-semibold text-fg">{step.title}</p>
							<p class="text-xs leading-relaxed text-fg-muted">{step.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>

		<!-- The sign-in card. -->
		<section class="panel rounded-sm p-6 shadow-2xl sm:p-8 space-y-6">
			<div class="flex flex-col items-center text-center">
				<div class="panel size-20 rounded-sm flex items-center justify-center">
					<img loading="lazy" decoding="async" alt="PsyOps logo" class="size-16" src="/logo.svg" />
				</div>
				<h2 class="mt-4 font-serif text-2xl font-bold text-fg">Welcome back</h2>
				<p class="mt-1 text-sm text-fg-muted">Sign in to continue your journey</p>
			</div>

			{#if authError}
				<p class="field-error rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-center" role="alert">
					{authError}
				</p>
			{/if}

			<div class="space-y-3">
				<Button
					href={botLink}
					target="_blank"
					rel="noopener noreferrer"
					variant="primary"
					size="lg"
					block
					icon={FluentBot20Filled}
					iconRight={FluentArrowRight20Filled}
					class="gap-3"
					onclick={startWaiting}
				>
					Continue with Telegram bot
				</Button>

				{#if awaitingBot}
					<div class="rounded-sm border border-primary/30 bg-primary/10 px-3 py-2 text-center">
						<p class="text-xs font-semibold text-primary-fg">Waiting for the bot…</p>
						<p class="mt-0.5 text-[11px] text-fg-muted">This tab will continue as soon as you're signed in.</p>
					</div>
				{/if}

				<div class="flex items-center gap-3 py-1 text-[10px] uppercase tracking-[0.2em] text-fg-faint">
					<span class="h-px flex-1 bg-line/20"></span>
					or
					<span class="h-px flex-1 bg-line/20"></span>
				</div>

				<Button href="/auth/login/google" variant="secondary" size="lg" block icon={LogosGoogleIcon} class="gap-3">
					<span class="font-semibold">{m.signUp({ provider: "Google" })}</span>
				</Button>
			</div>

			<p class="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
				<FluentShieldCheckmark20Filled class="mt-0.5 size-4 shrink-0 text-positive-fg" />
				<span>
					The bot signs you in with a one-time Telegram button — no password to share and no third-party popup.
				</span>
			</p>

			<p class="text-xs text-center leading-relaxed text-fg-muted">
				By signing up you agree to our
				<a class="font-semibold text-primary-fg hover:text-primary-hover hover:underline" href="/about/terms">
					{m.termsOfService()}
				</a>
				and
				<a class="font-semibold text-primary-fg hover:text-primary-hover hover:underline" href="/about/privacy">
					{m.privacyPolicy()}
				</a>.
			</p>
		</section>
	</div>

	<!-- Help Button - Bottom -->
	<div class="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
		<Button
			href={`https://t.me/${botUsername}`}
			variant="ghost"
			size="lg"
			block
			icon={FluentEmojiEnvelopeWithArrow}
			class="max-w-md gap-3"
		>
			<span>{m.needHelp()}</span>
		</Button>
	</div>
</main>
