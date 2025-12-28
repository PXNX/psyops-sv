<script lang="ts">
	import * as m from "$lib/paraglide/messages.js";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentColorGlobeShield24 from "~icons/fluent-color/globe-shield-24";
	import FluentShieldCheckmark20Filled from "~icons/fluent/shield-checkmark-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
</script>

<main
	class="relative flex flex-col h-dvh justify-center items-center w-full p-4 overflow-hidden bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900"
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
				<div
					class="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full blur-2xl opacity-50 animate-pulse"
				></div>

				<div
					class="relative size-32 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/10"
				>
					<img alt="app logo" class="size-24" src="/logo.svg" />
				</div>
			</div>

			<div class="text-center space-y-2">
				<h1
					class="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent"
				>
					Welcome
				</h1>
				<p class="text-gray-400 text-sm">Sign in to continue your journey</p>
			</div>
		</div>

		<!-- Login Card -->
		<div class="w-full bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
			<!-- Sign In Button -->
			<a
				href="/auth/login/google"
				class="btn btn-lg w-full gap-3 bg-white hover:bg-gray-100 text-gray-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
			>
				<LogosGoogleIcon class="size-6" />
				<span class="font-semibold">{m.signUp({ provider: "Google" })}</span>
			</a>

			<!-- Terms & Privacy -->
			<div class=" border-t border-white/5">
				<p class="text-xs text-center text-gray-400 leading-relaxed">
					By signing up you agree to our
					<a class="font-semibold link link-hover text-purple-400 hover:text-purple-300" href="/about/terms">
						{m.termsOfService()}
					</a>
					and
					<a class="font-semibold link link-hover text-purple-400 hover:text-purple-300" href="/about/privacy">
						{m.privacyPolicy()}
					</a>.
				</p>
			</div>
		</div>
	</div>

	<!-- Help Button - Bottom -->
	<div class="relative z-10 mt-auto w-full max-w-md">
		<a href="https://t.me/pentexnyx_bot?start=TEST" class="btn btn-lg btn-ghost w-full gap-3">
			<FluentEmojiEnvelopeWithArrow class="size-5" />
			<span>{m.needHelp()}</span>
		</a>
	</div>
</main>
