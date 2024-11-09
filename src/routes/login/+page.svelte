<script lang="ts">
	import Icon from "@iconify/svelte";

	import { LL } from "$lib/i18n/i18n-svelte";
</script>

<div class="h-full flex flex-col justify-center items-center text-center w-full">
	<div class="bg-base-200 flex flex-col justify-center items-center text-center m-1 w-3/4 p-1 rounded-md">
		<Icon icon="fluent-color:globe-shield-24" class="h-16 w-16" />

		<a href="/login/google" class="btn btn-primary btn-sm mt-8 btn-wide">
			<Icon icon="flat-color-icons:google" class="h-5 w-5 " />
			{$LL.LOGIN()} Google
		</a>

		<p class="text-sm mt-1">
			By signing up you agree to our <a class="link font-semibold" href="/terms">Terms of Service</a> and
			<a class="link font-semibold" href="/privacy">Privacy Notice</a>.
		</p>
	</div>
	<a class="btn btn-ghost btn-sm btn-wide mt-16" href="/about" role="button">Need help? </a>
</div>
