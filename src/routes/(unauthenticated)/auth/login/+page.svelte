<script lang="ts">
	import * as m from "#lib/paraglide/messages.js";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import LogosGoogleIcon from "~icons/logos/google-icon";
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
		missing_params: "The bot login link expired. Please try again.",
		invalid_signature: "Telegram couldn't verify that login. Please start again from the bot.",
		auth_expired: "That login took too long. Open the bot again and use a fresh button.",
		server_error: "Something went wrong while signing you in. Please try again."
	};
	const authError = $derived.by(() => {
		const code = page.url.searchParams.get("error");
		return code ? (errorMessages[code] ?? "Sign-in failed. Please try again.") : null;
	});

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

<Seo title="Sign in · PsyOps" description="Sign in to PsyOps with the Telegram bot." robots="noindex, follow" />

<main class="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-10">
	<AuthShowcase />

	<div class="relative z-10 w-full max-w-md">
		<div class="panel rounded-sm p-6 shadow-2xl sm:p-8 space-y-6">
			<div class="flex flex-col items-center text-center">
				<div class="panel size-20 rounded-sm flex items-center justify-center">
					<img loading="lazy" decoding="async" alt="PsyOps logo" class="size-16" src="/logo.svg" />
				</div>
				<h1 class="mt-4 font-serif text-2xl font-bold text-fg">Welcome</h1>
				<p class="mt-1 text-sm text-fg-muted">Sign in to continue</p>
			</div>

			{#if authError}
				<p class="field-error rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-center" role="alert">
					{authError}
				</p>
			{/if}

			<div class="space-y-3">
				<a
					href={botLink}
					target="_blank"
					rel="noopener noreferrer"
					onclick={startWaiting}
					class="btn btn-lg w-full gap-3 border-0 bg-[#24A1DE] text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2094cc] hover:shadow-xl"
				>
					<svg class="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
						></path>
					</svg>
					<span class="font-semibold">Sign up with Telegram</span>
				</a>

				{#if awaitingBot}
					<p class="text-center text-xs text-fg-muted">Waiting for Telegram…</p>
				{/if}

				<Button href="/auth/login/google" variant="secondary" size="lg" block icon={LogosGoogleIcon} class="gap-3">
					<span class="font-semibold">{m.signUp({ provider: "Google" })}</span>
				</Button>
			</div>

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
		</div>
	</div>

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
