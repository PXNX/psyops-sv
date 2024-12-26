<script lang="ts">
	import PsyopsLogo from "$lib/assets/logo.svg";
	import { fade } from "svelte/transition";
</script>

<div class="max-w-md flex-col space-y-4 flex justify-center items-center text-center">
	<PsyopsLogo class="size-12" />
	<h3 class="text-2xl font-bold">Welcome to PsyOps!</h3>
	<p>
		Newspapers allow you to share events and your views with the community in a more uniform way. You can also ask other
		users to become a journalist for a newspaper they own.
	</p>
	<a class="btn btn-primary" href="/welcome/region" role="button"> Get started </a>
</div>
