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

				<!-- Logo Container -->
				<div
					class="relative size-24 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/10"
				>
					<FluentColorGlobeShield24 class="size-16" />
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

			<!-- Divider -->
			<div class="divider text-gray-500 text-xs">SECURE AUTHENTICATION</div>

			<!-- Security Features -->
			<div class="space-y-3">
				<div class="flex items-start gap-3 text-sm">
					<FluentShieldCheckmark20Filled class="size-5 text-emerald-400 flex-shrink-0 mt-0.5" />
					<div>
						<p class="text-gray-300 font-medium">End-to-end encrypted</p>
						<p class="text-gray-500 text-xs">Your data is always protected</p>
					</div>
				</div>
				<div class="flex items-start gap-3 text-sm">
					<FluentInfo20Filled class="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
					<div>
						<p class="text-gray-300 font-medium">No password needed</p>
						<p class="text-gray-500 text-xs">Sign in securely with Google</p>
					</div>
				</div>
			</div>

			<!-- Terms & Privacy -->
			<div class="pt-4 border-t border-white/5">
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

		<!-- Features Grid -->
		<div class="w-full grid grid-cols-3 gap-3 text-center">
			<div class="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-xl p-3">
				<p class="text-2xl font-bold text-purple-400">🌍</p>
				<p class="text-xs text-gray-400 mt-1">Global</p>
			</div>
			<div class="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-xl p-3">
				<p class="text-2xl font-bold text-pink-400">🔒</p>
				<p class="text-xs text-gray-400 mt-1">Secure</p>
			</div>
			<div class="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-xl p-3">
				<p class="text-2xl font-bold text-blue-400">⚡</p>
				<p class="text-xs text-gray-400 mt-1">Fast</p>
			</div>
		</div>
	</div>

	<!-- Help Button - Bottom -->
	<div class="relative z-10 mt-auto w-full max-w-md">
		<a
			href="https://t.me/pentexnyx_bot?start=TEST"
			class="btn btn-lg w-full gap-3 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white backdrop-blur-sm transition-all"
		>
			<FluentEmojiEnvelopeWithArrow class="size-5" />
			<span>{m.needHelp()}</span>
		</a>
	</div>
</main>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
