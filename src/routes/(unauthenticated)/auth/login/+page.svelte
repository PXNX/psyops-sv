<script lang="ts">
	import * as m from "#lib/paraglide/messages.js";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentColorGlobeShield24 from "~icons/fluent-color/globe-shield-24";
	import FluentShieldCheckmark20Filled from "~icons/fluent/shield-checkmark-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import { PUBLIC_TELEGRAM_BOT_USERNAME } from "$app/env/public";
	import { page } from "$app/state";
	import TelegramLoginWidget from "#lib/components/TelegramLoginWidget.svelte";
	import Button from "#lib/component/ui/Button.svelte";

	const botUsername = PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot";
	const next = $derived(page.url.searchParams.get("next") || "/");
</script>

<main class="relative flex flex-col min-h-dvh justify-center items-center w-full p-4 pb-20">
	<!-- Main Content -->
	<div class="relative z-10 flex flex-col items-center max-w-md w-full space-y-8">
		<!-- Logo & Title Section -->
		<div class="flex flex-col items-center space-y-4">
			<div class="relative">
				<div class="panel size-32 rounded-sm flex items-center justify-center">
					<img alt="app logo" class="size-24" src="/logo.svg" />
				</div>
			</div>

			<div class="text-center space-y-2">
				<h1 class="text-4xl font-bold text-[#f5efd8]">Welcome</h1>
				<p class="text-[#a8a083] text-sm">Sign in to continue your journey</p>
			</div>
		</div>

		<!-- Login Card -->
		<div class="w-full panel rounded-sm p-6 sm:p-8 space-y-6">
			<!-- Sign In Buttons -->
			<div class="space-y-3">
				<Button href="/auth/login/google" variant="secondary" size="lg" block icon={LogosGoogleIcon} class="gap-3">
					<span class="font-semibold">{m.signUp({ provider: "Google" })}</span>
				</Button>

				<TelegramLoginWidget {next} label={m.signUp({ provider: "Telegram" })} />
			</div>

			<!-- Terms & Privacy -->
			<div>
				<p class="text-xs text-center text-[#a8a083] leading-relaxed">
					By signing up you agree to our
					<a class="font-semibold text-[#ffd35c] hover:text-[#ffcf47] hover:underline" href="/about/terms">
						{m.termsOfService()}
					</a>
					and
					<a class="font-semibold text-[#ffd35c] hover:text-[#ffcf47] hover:underline" href="/about/privacy">
						{m.privacyPolicy()}
					</a>.
				</p>
			</div>
		</div>
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
