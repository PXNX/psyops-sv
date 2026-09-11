<script lang="ts">
	import * as m from "$lib/paraglide/messages.js";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentColorGlobeShield24 from "~icons/fluent-color/globe-shield-24";
	import FluentShieldCheckmark20Filled from "~icons/fluent/shield-checkmark-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import { env } from "$env/dynamic/public";
	import { page } from "$app/state";
	import TelegramLoginWidget from "$lib/components/TelegramLoginWidget.svelte";

	const botUsername = env.PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot";
	const next = $derived(page.url.searchParams.get("next") || "/");
</script>

<main
	class="relative flex flex-col min-h-dvh justify-center items-center w-full p-4 pb-20 overflow-hidden"
>
	<!-- Animated Background Pattern -->
	<div
		class="absolute inset-0 opacity-10"
		style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px);"
	></div>

	<!-- Gradient Overlay -->
	<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"></div>

	<!-- Main Content -->
	<div class="relative z-10 flex flex-col items-center max-w-md w-full space-y-8">
		<!-- Logo & Title Section -->
		<div class="flex flex-col items-center space-y-4">
			<div class="relative">
				<!-- Glowing Effect -->
				<div class="absolute inset-0 bg-[#e6a527]/25 rounded-full blur-2xl opacity-50 animate-pulse"></div>

				<div
					class="relative size-32 bg-[#14283f] border border-[#dfceb0]/20 rounded-3xl flex items-center justify-center shadow-2xl"
				>
					<img alt="app logo" class="size-24" src="/logo.svg" />
				</div>
			</div>

			<div class="text-center space-y-2">
				<h1 class="text-4xl font-bold tracking-tight text-[#fff7e8]">Welcome</h1>
				<p class="text-[#d9ccb7] text-sm">Sign in to continue your journey</p>
			</div>
		</div>

		<!-- Login Card -->
		<div class="w-full panel backdrop-blur-xl rounded-2xl p-8 space-y-6">
			<!-- Sign In Buttons -->
			<div class="space-y-3">
				<a
					href="/auth/login/google"
					class="btn btn-lg w-full gap-3 bg-white hover:bg-gray-100 text-gray-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
				>
					<LogosGoogleIcon class="size-6" />
					<span class="font-semibold">{m.signUp({ provider: "Google" })}</span>
				</a>

				<TelegramLoginWidget {next} label={m.signUp({ provider: "Telegram" })} />
			</div>

			<!-- Terms & Privacy -->
			<div>
				<p class="text-xs text-center text-[#a89e8e] leading-relaxed">
					By signing up you agree to our
					<a class="font-semibold link link-hover text-[#f7c56b] hover:text-[#ffe2a4]" href="/about/terms">
						{m.termsOfService()}
					</a>
					and
					<a class="font-semibold link link-hover text-[#f7c56b] hover:text-[#ffe2a4]" href="/about/privacy">
						{m.privacyPolicy()}
					</a>.
				</p>
			</div>
		</div>
	</div>

	<!-- Help Button - Bottom -->
	<div class="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
		<a href={`https://t.me/${botUsername}`} class="btn btn-lg btn-ghost w-full max-w-md gap-3">
			<FluentEmojiEnvelopeWithArrow class="size-5" />
			<span>{m.needHelp()}</span>
		</a>
	</div>
</main>
