<script lang="ts">
	import { LL } from "$lib/i18n/i18n-svelte";
	import LogosGoogleIcon from "~icons/logos/google-icon";
	import FluentEmojiEnvelopeWithArrow from "~icons/fluent-emoji/envelope-with-arrow";
	import FluentColorGlobeShield24 from "~icons/fluent-color/globe-shield-24";
</script>

<main class="flex flex-col items-center justify-center h-full p-4 text-center">
	<div
		class="flex flex-col items-center justify-center gap-1 p-4 text-center border rounded-lg border-fuchsia-900 place-self-center"
	>
		<FluentColorGlobeShield24 class="w-12 h-12" />

		<a href="/login/google" class="mt-4 btn btn-primary btn-wide">
			<LogosGoogleIcon class="w-5 h-5 " />
			{$LL.LOGIN()} Google
		</a>

		<p class="text-sm">
			By signing up you agree to our <a class="font-semibold link" href="/terms">Terms of Service</a> and
			<a class="font-semibold link" href="/privacy">Privacy Notice</a>.
		</p>
	</div>

	<a href="https://t.me/pentexnyx_bot?start=TEST" class="mt-4 btn btn-md btn-wide btn-ghost">
		<FluentEmojiEnvelopeWithArrow />Need help?</a
	>
</main>
