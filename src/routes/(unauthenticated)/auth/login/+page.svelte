<script lang="ts">
	import * as m from "$lib/paraglide/messages.js";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentColorGlobeShield24 from "~icons/fluent-color/globe-shield-24";
</script>

<main class="flex flex-col h-dvh justify-center items-center w-full p-4 bg-linear-to-b from-purple-800 to-zinc-800">
	<div class="flex flex-col items-center space-x-2">
		<FluentColorGlobeShield24 class="size-12" />

		<a href="/auth/login/google" class="mt-4 btn btn-primary btn-wide glass">
			<LogosGoogleIcon class="size-5" />
			{m.signUp({ provider: "Google" })}
		</a>

		<p class="text-sm">
			By signing up you agree to our <a class="font-semibold link" href="/about/terms"> {m.termsOfService()}</a> and
			<a class="font-semibold link" href="/about/privacy">{m.privacyPolicy()}</a>.
		</p>
	</div>

	<a href="https://t.me/pentexnyx_bot?start=TEST" class="btn btn-md btn-wide btn-ghost mt-auto">
		<FluentEmojiEnvelopeWithArrow />
		{m.needHelp()}
	</a>
</main>
