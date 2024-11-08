<script lang="ts">
	import Icon from "@iconify/svelte";

	import { LL } from "$lib/i18n/i18n-svelte";
</script>

<h1 class="text-3xl font-bold underline">Sign in</h1>

<a href="/login/google" class="btn">
	<Icon icon="flat-color-icons:google" />
	Sign in with Google
</a>

<h1>{$LL.APPLES({ apples: 22 })}</h1>
